import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { X, BatteryCharging, Loader2 } from 'lucide-react';
import {
  requestBatteryOptimizationExemption,
  wasBatteryOptSkipped,
  markBatteryOptSkipped,
} from '@/lib/batteryOptimization';
import { getBgTrackingPref } from '@/hooks/useLocationSharing';

interface BatteryOptimizationPromptProps {
  onDismiss: () => void;
}

export function BatteryOptimizationPrompt({ onDismiss }: BatteryOptimizationPromptProps) {
  const [requesting, setRequesting] = useState(false);
  const [skipped, setSkipped] = useState(wasBatteryOptSkipped());

  // Only show on native platform when background tracking is enabled
  const shouldShow = Capacitor.isNativePlatform() && getBgTrackingPref() && !skipped;

  useEffect(() => {
    if (!shouldShow) {
      onDismiss();
    }
  }, [shouldShow, onDismiss]);

  if (!shouldShow) return null;

  const handleEnable = async () => {
    setRequesting(true);
    await requestBatteryOptimizationExemption();
    setRequesting(false);
    markBatteryOptSkipped();
    setSkipped(true);
    onDismiss();
  };

  const handleSkip = () => {
    markBatteryOptSkipped();
    setSkipped(true);
    onDismiss();
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-black/50" onClick={handleSkip} />
      <div className="relative w-full max-w-sm p-5 rounded-2xl bg-white dark:bg-[#1a1d23] border border-gray-200 dark:border-gray-700/50 shadow-xl">
        <button
          onClick={handleSkip}
          className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex flex-col items-center text-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-accent/15 flex items-center justify-center">
            <BatteryCharging className="w-6 h-6 text-accent" />
          </div>
          <h2 className="text-[15px] font-semibold text-gray-900 dark:text-gray-100">
            Keep tracking in background
          </h2>
          <p className="text-[13px] text-gray-500 dark:text-gray-400 leading-relaxed">
            SafeTrack needs permission to run in the background so your location can be shared even when your screen is locked or the app is minimized. Exempting it from battery optimization ensures background tracking works reliably.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <button
            onClick={handleEnable}
            disabled={requesting}
            className="w-full h-11 flex items-center justify-center gap-2 rounded-xl bg-accent text-black text-[14px] font-semibold hover:bg-accent-muted transition-colors disabled:opacity-60"
          >
            {requesting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              'Open settings'
            )}
          </button>
          <button
            onClick={handleSkip}
            className="w-full h-10 text-[13px] text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
          >
            Skip for now
          </button>
        </div>
      </div>
    </div>
  );
}
