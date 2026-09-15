import { Capacitor } from '@capacitor/core';

const BATTERY_OPT_SKIP_KEY = 'safetrack_battery_opt_skipped';

export function wasBatteryOptSkipped(): boolean {
  try {
    return localStorage.getItem(BATTERY_OPT_SKIP_KEY) === 'true';
  } catch {
    return false;
  }
}

export function markBatteryOptSkipped() {
  try {
    localStorage.setItem(BATTERY_OPT_SKIP_KEY, 'true');
  } catch {
    // ignore
  }
}

export function resetBatteryOptSkip() {
  try {
    localStorage.removeItem(BATTERY_OPT_SKIP_KEY);
  } catch {
    // ignore
  }
}

/**
 * Opens the Android battery optimization settings screen.
 * On non-native platforms this is a no-op.
 */
export async function requestBatteryOptimizationExemption(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;

  // Use Android intent via a hidden iframe to open the battery optimization settings
  // The @capacitor-community/background-geolocation plugin doesn't expose this directly,
  // so we open the system settings page
  try {
    // Try to open the ignore battery optimization settings directly
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = 'intent://#Intent;action=android.settings.IGNORE_BATTERY_OPTIMIZATION_SETTINGS;end';
    document.body.appendChild(iframe);
    setTimeout(() => {
      document.body.removeChild(iframe);
    }, 1000);
    return true;
  } catch {
    return false;
  }
}
