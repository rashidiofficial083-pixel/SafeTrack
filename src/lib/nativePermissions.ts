import { Capacitor } from '@capacitor/core';
import { Camera } from '@capacitor/camera';
import { Geolocation } from '@capacitor/geolocation';

export async function requestNativePermissions(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  try {
    await Geolocation.requestPermissions();
  } catch {
    // Location services may be off — the location hook handles this separately
  }

  try {
    await Camera.requestPermissions({ permissions: ['camera'] });
  } catch {
    // Camera permission not critical on launch
  }
}
