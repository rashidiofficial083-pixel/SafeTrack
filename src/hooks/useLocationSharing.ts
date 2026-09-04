import { useEffect, useRef, useState } from 'react';
import { updateLocation } from '@/lib/firestore';
import type { UserLocation } from '@/types';

type LocationStatus = 'idle' | 'sharing' | 'denied' | 'error' | 'unsupported';

interface UseLocationSharingResult {
  status: LocationStatus;
  retry: () => void;
}

const THROTTLE_MS = 8000;

export function useLocationSharing(
  uid: string | null
): UseLocationSharingResult {
  const [status, setStatus] = useState<LocationStatus>('idle');
  const watchIdRef = useRef<number | null>(null);
  const lastWriteRef = useRef<number>(0);

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
        const { latitude, longitude, accuracy, heading, speed } = position.coords;
        const now = Date.now();

        if (now - lastWriteRef.current < THROTTLE_MS) return;
        lastWriteRef.current = now;

        const location: UserLocation = {
          lat: latitude,
          lng: longitude,
          accuracy,
          heading: heading ?? null,
          speed: speed ?? null,
          updatedAt: now / 1000,
        };

        if (uid) {
          updateLocation(uid, location).catch((e) =>
            console.error('Failed to update location:', e)
          );
        }
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
    startWatch();

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid]);

  const retry = () => {
    lastWriteRef.current = 0;
    startWatch();
  };

  return { status, retry };
}
