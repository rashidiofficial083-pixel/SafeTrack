import { registerPlugin, Capacitor } from '@capacitor/core';
import type { BackgroundGeolocationPlugin, Location, CallbackError } from '@capacitor-community/background-geolocation';
import type { UserLocation } from '@/types';
import { updateLocation, addLocationHistoryEntry } from '@/lib/firestore';

const BackgroundGeolocation = registerPlugin<BackgroundGeolocationPlugin>('BackgroundGeolocation');

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

interface WriteState {
  lastWrite: number;
  lastHistoryTime: number;
  lastHistoryLat: number | null;
  lastHistoryLng: number | null;
  batteryLevel: number | null;
}

export function createLocationWriter(uid: string) {
  const state: WriteState = {
    lastWrite: 0,
    lastHistoryTime: 0,
    lastHistoryLat: null,
    lastHistoryLng: null,
    batteryLevel: null,
  };

  const write = (
    latitude: number,
    longitude: number,
    accuracy: number,
    heading: number | null,
    speed: number | null,
    isLastKnown = false
  ) => {
    const location: UserLocation = {
      lat: latitude,
      lng: longitude,
      accuracy,
      heading,
      speed,
      updatedAt: Date.now() / 1000,
      isLastKnown,
      batteryLevel: state.batteryLevel,
    };

    updateLocation(uid, location).catch((e) =>
      console.error('Failed to update location:', e)
    );

    const now = Date.now();
    const timeSinceLastHistory = now - state.lastHistoryTime;
    let shouldWriteHistory = false;

    if (state.lastHistoryLat === null) {
      shouldWriteHistory = true;
    } else {
      const distance = haversineMeters(
        state.lastHistoryLat,
        state.lastHistoryLng!,
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
      state.lastHistoryTime = now;
      state.lastHistoryLat = latitude;
      state.lastHistoryLng = longitude;
      addLocationHistoryEntry(uid, latitude, longitude, accuracy).catch((e) =>
        console.error('Failed to write history:', e)
      );
    }
  };

  const shouldThrottle = () => {
    const now = Date.now();
    if (now - state.lastWrite < THROTTLE_MS) return true;
    state.lastWrite = now;
    return false;
  };

  const setBatteryLevel = (level: number | null) => {
    state.batteryLevel = level;
  };

  const writeLastKnown = () => {
    if (state.lastHistoryLat !== null && state.lastHistoryLng !== null) {
      write(state.lastHistoryLat, state.lastHistoryLng, 0, null, null, true);
    }
  };

  return { write, shouldThrottle, setBatteryLevel, writeLastKnown };
}

export type LocationWriter = ReturnType<typeof createLocationWriter>;

export interface BackgroundWatcherHandle {
  id: string;
  stop: () => Promise<void>;
}

export async function startBackgroundWatcher(
  uid: string,
  writer: LocationWriter,
  onStatus: (status: 'sharing' | 'denied' | 'error') => void
): Promise<BackgroundWatcherHandle> {
  if (!Capacitor.isNativePlatform()) {
    throw new Error('Background geolocation only available on native platform');
  }

  const watcherId = await BackgroundGeolocation.addWatcher(
    {
      backgroundMessage: 'SafeTrack is sharing your location',
      backgroundTitle: 'SafeTrack',
      requestPermissions: true,
      stale: false,
      distanceFilter: 0,
    },
    (position: Location | undefined, error: CallbackError | undefined) => {
      if (error) {
        const code = (error as any).code ?? '';
        if (code === 'permissions' || code === 'PERMISSION_DENIED') {
          onStatus('denied');
        } else {
          onStatus('error');
        }
        return;
      }
      if (!position) return;
      if (writer.shouldThrottle()) return;
      writer.write(
        position.latitude,
        position.longitude,
        position.accuracy,
        position.bearing ?? null,
        position.speed ?? null
      );
      onStatus('sharing');
    }
  );

  return {
    id: watcherId,
    stop: async () => {
      await BackgroundGeolocation.removeWatcher({ id: watcherId });
    },
  };
}
