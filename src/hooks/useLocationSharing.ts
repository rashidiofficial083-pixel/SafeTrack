import { useEffect, useRef, useState } from 'react';
import {
  updateLocation,
  addLocationHistoryEntry,
} from '@/lib/firestore';
import type { UserLocation } from '@/types';

type LocationStatus = 'idle' | 'sharing' | 'denied' | 'error' | 'unsupported';

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

export function useLocationSharing(
  uid: string | null
): UseLocationSharingResult {
  const [status, setStatus] = useState<LocationStatus>('idle');
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const watchIdRef = useRef<number | null>(null);
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
    accuracy: number,
    heading: number | null,
    speed: number | null,
    isLastKnown = false
  ) => {
    const currentUid = uidRef.current;
    if (!currentUid) return;

    const location: UserLocation = {
      lat: latitude,
      lng: longitude,
      accuracy,
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
        accuracy
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
        const { latitude, longitude, accuracy, heading, speed } =
          position.coords;
        const now = Date.now();

        if (now - lastWriteRef.current < THROTTLE_MS) return;
        lastWriteRef.current = now;

        writeLocation(
          latitude,
          longitude,
          accuracy,
          heading ?? null,
          speed ?? null
        );
        setAccuracy(accuracy);
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

  useEffect(() => {
    if (!uid) {
      setStatus('idle');
      return;
    }
    lastWriteRef.current = 0;
    lastHistoryTimeRef.current = 0;
    lastHistoryLatRef.current = null;
    lastHistoryLngRef.current = null;
    startWatch();

    const handleBeforeUnload = () => {
      if (lastHistoryLatRef.current !== null && lastHistoryLngRef.current !== null) {
        writeLocation(
          lastHistoryLatRef.current,
          lastHistoryLngRef.current,
          0,
          null,
          null,
          true
        );
      }
    };

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
      } else if (visibilityTimeout) {
        clearTimeout(visibilityTimeout);
        visibilityTimeout = null;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (visibilityTimeout) clearTimeout(visibilityTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid]);

  const retry = () => {
    lastWriteRef.current = 0;
    startWatch();
  };

  return { status, retry, accuracy };
}
