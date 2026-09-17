import { useEffect, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { updateLocation, addLocationHistoryEntry } from '@/lib/firestore';
import {
  createLocationWriter,
  startBackgroundWatcher,
  type LocationWriter,
  type BackgroundWatcherHandle,
} from '@/lib/backgroundGeolocation';
import { isLocationServicesEnabled } from '@/lib/locationServices';
import type { UserLocation } from '@/types';

type LocationStatus =
  | 'idle'
  | 'sharing'
  | 'denied'
  | 'blocked'
  | 'error'
  | 'unsupported'
  | 'gps_off';

interface UseLocationSharingResult {
  status: LocationStatus;
  retry: () => void;
  accuracy: number | null;
}

const THROTTLE_MS = 8000;
const HISTORY_MIN_INTERVAL_MS = 3 * 60 * 1000;
const HISTORY_MIN_DISTANCE_M = 50;

function haversineMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const BG_TRACKING_KEY = 'safetrack_bg_tracking_enabled';

export function getBgTrackingPref(): boolean {
  try {
    return localStorage.getItem(BG_TRACKING_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setBgTrackingPref(enabled: boolean) {
  try {
    localStorage.setItem(BG_TRACKING_KEY, enabled ? 'true' : 'false');
  } catch {
    // ignore
  }
}

export function useLocationSharing(
  uid: string | null
): UseLocationSharingResult {
  const [status, setStatus] = useState<LocationStatus>('idle');
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const bgWatcherRef = useRef<BackgroundWatcherHandle | null>(null);
  const writerRef = useRef<LocationWriter | null>(null);
  const lastWriteRef = useRef<number>(0);
  const lastHistoryTimeRef = useRef<number>(0);
  const lastHistoryLatRef = useRef<number | null>(null);
  const lastHistoryLngRef = useRef<number | null>(null);
  const batteryLevelRef = useRef<number | null>(null);
  const uidRef = useRef<string | null>(uid);

  uidRef.current = uid;

  useEffect(() => {
    let batteryManager: any = null;

    if ('getBattery' in navigator) {
      (navigator as any)
        .getBattery()
        .then((bm: any) => {
          batteryManager = bm;
          batteryLevelRef.current = bm.level;
          bm.addEventListener('levelchange', () => {
            batteryLevelRef.current = bm.level;
          });
        })
        .catch(() => {});
    }

    return () => {
      if (batteryManager) {
        batteryManager.removeEventListener('levelchange', () => {});
      }
    };
  }, []);

  const writeLocation = (
    latitude: number,
    longitude: number,
    accuracyVal: number,
    heading: number | null,
    speed: number | null,
    isLastKnown = false
  ) => {
    const currentUid = uidRef.current;
    if (!currentUid) return;

    const location: UserLocation = {
      lat: latitude,
      lng: longitude,
      accuracy: accuracyVal,
      heading,
      speed,
      updatedAt: Date.now() / 1000,
      isLastKnown,
      batteryLevel: batteryLevelRef.current,
    };

    updateLocation(currentUid, location).catch((e) =>
      console.error('Failed to update location:', e)
    );

    const now = Date.now();
    const timeSinceLastHistory = now - lastHistoryTimeRef.current;
    let shouldWriteHistory = false;

    if (lastHistoryLatRef.current === null) {
      shouldWriteHistory = true;
    } else {
      const distance = haversineMeters(
        lastHistoryLatRef.current,
        lastHistoryLngRef.current!,
        latitude,
        longitude
      );
      if (timeSinceLastHistory >= HISTORY_MIN_INTERVAL_MS) {
        shouldWriteHistory = true;
      } else if (distance >= HISTORY_MIN_DISTANCE_M) {
        shouldWriteHistory = true;
      }
    }

    if (shouldWriteHistory) {
      lastHistoryTimeRef.current = now;
      lastHistoryLatRef.current = latitude;
      lastHistoryLngRef.current = longitude;
      addLocationHistoryEntry(
        currentUid,
        latitude,
        longitude,
        accuracyVal
      ).catch((e) => console.error('Failed to write history:', e));
    }
  };

  const startWatch = () => {
    if (!('geolocation' in navigator)) {
      setStatus('unsupported');
      return;
    }

    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }

    setStatus('sharing');

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, accuracy: acc, heading, speed } =
          position.coords;
        const now = Date.now();

        if (now - lastWriteRef.current < THROTTLE_MS) return;
        lastWriteRef.current = now;

        writeLocation(
          latitude,
          longitude,
          acc,
          heading ?? null,
          speed ?? null
        );
        setAccuracy(acc);
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setStatus('denied');
        } else {
          setStatus('error');
        }
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 15000,
      }
    );
  };

  const startBackgroundWatch = async () => {
    if (!uidRef.current) return;
    const writer = createLocationWriter(uidRef.current);
    writerRef.current = writer;

    writer.setBatteryLevel(batteryLevelRef.current);

    try {
      const handle = await startBackgroundWatcher(
        uidRef.current,
        writer,
        (s) => {
          setStatus(s as LocationStatus);
        }
      );
      bgWatcherRef.current = handle;
      setStatus('sharing');
    } catch (e) {
      console.error('Failed to start background watcher, falling back to web geolocation:', e);
      startWatch();
    }
  };

  const beginTracking = async () => {
    if (!uid) {
      setStatus('idle');
      return;
    }

    const isNative = Capacitor.isNativePlatform();

    if (isNative) {
      const gpsState = await isLocationServicesEnabled();
      if (gpsState === 'disabled') {
        setStatus('gps_off');
        return;
      }
    }

    lastWriteRef.current = 0;
    lastHistoryTimeRef.current = 0;
    lastHistoryLatRef.current = null;
    lastHistoryLngRef.current = null;

    const bgEnabled = getBgTrackingPref();

    if (isNative && bgEnabled) {
      startBackgroundWatch();
    } else {
      startWatch();
    }
  };

  const stopBackgroundWatch = () => {
    if (bgWatcherRef.current) {
      bgWatcherRef.current.stop().catch(() => {});
      bgWatcherRef.current = null;
    }
    writerRef.current = null;
  };

  const handleBgTrackingChange = () => {
    if (!uid) return;
    const bgEnabled = getBgTrackingPref();
    const isNative = Capacitor.isNativePlatform();

    if (bgEnabled && isNative) {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      isLocationServicesEnabled().then((state) => {
        if (state === 'disabled') {
          setStatus('gps_off');
        } else {
          startBackgroundWatch();
        }
      });
    } else {
      stopBackgroundWatch();
      if (watchIdRef.current === null) {
        startWatch();
      }
    }
  };

  useEffect(() => {
    beginTracking();

    window.addEventListener('safetrack-bg-tracking-changed', handleBgTrackingChange);

    let visibilityTimeout: ReturnType<typeof setTimeout> | null = null;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        visibilityTimeout = setTimeout(() => {
          if (lastHistoryLatRef.current !== null) {
            writeLocation(
              lastHistoryLatRef.current,
              lastHistoryLngRef.current!,
              0,
              null,
              null,
              true
            );
          }
        }, 30000);
      } else {
        if (visibilityTimeout) {
          clearTimeout(visibilityTimeout);
          visibilityTimeout = null;
        }
        if (Capacitor.isNativePlatform() && uid) {
          isLocationServicesEnabled().then((state) => {
            if (state === 'disabled' && status === 'sharing') {
              setStatus('gps_off');
            } else if (state === 'enabled' && status === 'gps_off') {
              beginTracking();
            }
          });
        }
      }
    };

    const handleBeforeUnload = () => {
      if (lastHistoryLatRef.current !== null && lastHistoryLngRef.current !== null) {
        writeLocation(
          lastHistoryLatRef.current,
          lastHistoryLngRef.current!,
          0,
          null,
          null,
          true
        );
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      if (bgWatcherRef.current) {
        bgWatcherRef.current.stop().catch(() => {});
        bgWatcherRef.current = null;
      }
      writerRef.current = null;
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('safetrack-bg-tracking-changed', handleBgTrackingChange);
      if (visibilityTimeout) clearTimeout(visibilityTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid]);

  const retry = async () => {
    if (Capacitor.isNativePlatform()) {
      const gpsState = await isLocationServicesEnabled();
      if (gpsState === 'disabled') {
        setStatus('gps_off');
        return;
      }
    }

    if ('permissions' in navigator) {
      try {
        const result = await navigator.permissions.query({
          name: 'geolocation' as PermissionName,
        });
        if (result.state === 'denied') {
          setStatus('blocked');
          return;
        }
      } catch {
        // Permissions API not supported — fall through to retry
      }
    }
    lastWriteRef.current = 0;
    startWatch();
  };

  return { status, retry, accuracy };
}
