import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';

export type LocationServicesState = 'enabled' | 'disabled' | 'unknown';

export async function isLocationServicesEnabled(): Promise<LocationServicesState> {
  if (!Capacitor.isNativePlatform()) return 'enabled';

  try {
    await Geolocation.checkPermissions();
    return 'enabled';
  } catch {
    return 'disabled';
  }
}

export async function openLocationSettings(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;

  try {
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src =
      'intent://#Intent;action=android.settings.LOCATION_SOURCE_SETTINGS;end';
    document.body.appendChild(iframe);
    setTimeout(() => {
      if (iframe.parentNode) document.body.removeChild(iframe);
    }, 1000);
    return true;
  } catch {
    return false;
  }
}
