import { Capacitor } from '@capacitor/core';
import { Camera } from '@capacitor/camera';
import { Geolocation } from '@capacitor/geolocation';

export async function requestNativePermissions(): Promise<void> {
  console.log('[SafeTrack permissions] requestNativePermissions started', {
    isNative: Capacitor.isNativePlatform(),
    platform: Capacitor.getPlatform(),
  });

  if (!Capacitor.isNativePlatform()) {
    console.log('[SafeTrack permissions] skipped: not a native platform');
    return;
  }

  console.log('[SafeTrack permissions] right before Geolocation.requestPermissions()');
  try {
    const locationStatus = await Geolocation.requestPermissions();
    console.log('[SafeTrack permissions] Geolocation.requestPermissions() resolved', locationStatus);
  } catch (error) {
    console.error('[SafeTrack permissions] Geolocation.requestPermissions() threw', error);
  }

  console.log('[SafeTrack permissions] right before Camera.requestPermissions()');
  try {
    const cameraStatus = await Camera.requestPermissions({ permissions: ['camera'] });
    console.log('[SafeTrack permissions] Camera.requestPermissions() resolved', cameraStatus);
  } catch (error) {
    console.error('[SafeTrack permissions] Camera.requestPermissions() threw', error);
  }

  console.log('[SafeTrack permissions] requestNativePermissions finished');
}
