import { Loader2 } from 'lucide-react';

export function LoadingSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0f1115]">
      <Loader2 className="w-8 h-8 animate-spin text-accent" />
    </div>
  );
}
