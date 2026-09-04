import { MapPinOff, RefreshCw } from 'lucide-react';
import { Button } from '@/components/Button';

interface LocationStatusIndicatorProps {
  status: 'idle' | 'sharing' | 'denied' | 'error' | 'unsupported';
  onRetry: () => void;
}

export function LocationStatusIndicator({
  status,
  onRetry,
}: LocationStatusIndicatorProps) {
  if (status === 'sharing') {
    return (
      <div className="flex items-center gap-2 mb-4 text-[13px] text-gray-500 dark:text-gray-400">
        <span className="relative flex w-2.5 h-2.5">
          <span className="absolute inline-flex h-full w-full rounded-full bg-success opacity-60 animate-ping" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-success" />
        </span>
        Sharing location
      </div>
    );
  }

  if (status === 'idle') return null;

  const messages: Record<string, string> = {
    denied: 'Location access denied. Tracking needs your location to work.',
    error: 'Could not access your location. Please try again.',
    unsupported: 'Your browser does not support location sharing.',
  };

  return (
    <div className="mb-4 p-3 rounded-card border border-red-500/30 bg-red-500/5">
      <div className="flex items-start gap-3">
        <MapPinOff className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-[13px] text-gray-700 dark:text-gray-300">
            {messages[status]}
          </p>
          {status !== 'unsupported' && (
            <Button
              variant="ghost"
              className="mt-2 h-9 px-3 text-accent"
              onClick={onRetry}
            >
              <RefreshCw className="w-4 h-4" />
              Retry
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
