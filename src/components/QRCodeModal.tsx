import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Share2, Copy, Check, X } from 'lucide-react';

interface QRCodeModalProps {
  open: boolean;
  onClose: () => void;
  code: string;
}

export function QRCodeModal({ open, onClose, code }: QRCodeModalProps) {
  const [copied, setCopied] = useState(false);

  if (!open) return null;

  const handleShare = async () => {
    const shareData = { text: `Track me on SafeTrack with code: ${code}` };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        // User cancelled — no action needed
      }
    } else {
      await navigator.clipboard.writeText(shareData.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-xs p-6 rounded-2xl bg-white dark:bg-[#1a1d23] border border-gray-200 dark:border-gray-700/50 flex flex-col items-center gap-4">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-[15px] font-medium text-gray-900 dark:text-gray-100 text-center mt-2">
          Scan this code to track me
        </h3>

        <div className="p-4 rounded-xl bg-white">
          <QRCodeSVG value={code} size={180} level="M" />
        </div>

        <p className="text-sm font-mono font-medium tracking-wider text-gray-700 dark:text-gray-300">
          {code}
        </p>

        <div className="flex gap-2 w-full mt-1">
          <button
            onClick={handleCopy}
            className="flex-1 h-10 flex items-center justify-center gap-2 rounded-lg border border-gray-300 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-success" />
                Copied
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                Copy
              </>
            )}
          </button>
          <button
            onClick={handleShare}
            className="flex-1 h-10 flex items-center justify-center gap-2 rounded-lg bg-accent text-black text-sm font-medium hover:bg-accent-muted transition-colors"
          >
            <Share2 className="w-4 h-4" />
            Share
          </button>
        </div>
      </div>
    </div>
  );
}
