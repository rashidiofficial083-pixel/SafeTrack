import { MapPinOff, RefreshCw } from 'lucide-react';

interface SharingStatusBarProps {
  status: 'idle' | 'sharing' | 'denied' | 'error' | 'unsupported';
  accuracy: number | null;
  onRetry: () => void;
}

export function SharingStatusBar({
  status,
  accuracy,
  onRetry,
}: SharingStatusBarProps) {
  if (status === 'idle') return null;

  if (status === 'sharing') {
    return (
      <div className="flex items-center gap-2.5 h-11 px-4 rounded-xl bg-[#0f1115]/70 backdrop-blur-md border border-white/10 shadow-lg">
        <span className="relative flex w-2.5 h-2.5">
          <span className="absolute inline-flex h-full w-full rounded-full bg-success opacity-60 animate-ping" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-success" />
        </span>
        <span className="text-[13px] text-gray-100 font-medium">
          Sharing location
        </span>
        {accuracy !== null && (
          <span className="text-[12px] text-gray-400 tabular-nums">
            ±{Math.round(accuracy)}m
          </span>
        )}
      </div>
    );
  }

  const messages: Record<string, string> = {
    denied: 'Location access denied',
    error: 'Could not access location',
    unsupported: 'Location sharing not supported',
  };

  return (
    <div className="flex items-center gap-2.5 h-11 px-4 rounded-xl bg-red-500/15 backdrop-blur-md border border-red-500/30 shadow-lg">
      <MapPinOff className="w-4 h-4 text-red-400 flex-shrink-0" />
      <span className="text-[13px] text-red-300 font-medium flex-1 truncate">
        {messages[status]}
      </span>
      {status !== 'unsupported' && (
        <button
          onClick={onRetry}
          className="flex items-center gap-1 text-[12px] text-accent font-medium hover:text-accent-muted transition-colors flex-shrink-0"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Retry
        </button>
      )}
    </div>
  );
}
