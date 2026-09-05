import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Loader2,
  Send,
  CheckCircle2,
  AlertCircle,
  QrCode,
  Keyboard,
  Camera,
  CameraOff,
} from 'lucide-react';
import { BottomSheet } from '@/components/BottomSheet';
import { Button } from '@/components/Button';
import { useAuth } from '@/context/AuthContext';
import {
  lookupUserByCode,
  checkExistingRequest,
  createPairingRequest,
} from '@/lib/firestore';
import { cn } from '@/lib/utils';

interface TrackSomeoneSheetProps {
  open: boolean;
  onClose: () => void;
  currentSecretCode: string;
}

type SendState = 'idle' | 'sending' | 'sent' | 'error';
type Tab = 'code' | 'scan';

function formatCodeInput(raw: string): string {
  const cleaned = raw
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 8);
  if (cleaned.length <= 4) return cleaned;
  return `${cleaned.slice(0, 4)}-${cleaned.slice(4)}`;
}

function normalizeCode(raw: string): string {
  const cleaned = raw.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (cleaned.length <= 4) return cleaned;
  return `${cleaned.slice(0, 4)}-${cleaned.slice(4, 8)}`;
}

export function TrackSomeoneSheet({
  open,
  onClose,
  currentSecretCode,
}: TrackSomeoneSheetProps) {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('code');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sendState, setSendState] = useState<SendState>('idle');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setCode('');
      setError(null);
      setSendState('idle');
      setTab('code');
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [open]);

  const submitCode = useCallback(
    async (rawCode: string) => {
      if (!user) return;

      const formattedCode = normalizeCode(rawCode);
      setError(null);

      if (formattedCode.replace('-', '').length < 8) {
        setError('Please enter a full 8-character code');
        setSendState('error');
        return;
      }

      if (formattedCode === currentSecretCode) {
        setError("You can't track your own account");
        setSendState('error');
        return;
      }

      setSendState('sending');

      try {
        const targetUser = await lookupUserByCode(formattedCode);
        if (!targetUser) {
          setError('No account found with this code');
          setSendState('error');
          return;
        }

        const existing = await checkExistingRequest(user.uid, targetUser.uid);
        if (existing) {
          if (existing.status === 'pending') {
            setError('Request already sent, waiting for approval');
            setSendState('error');
            return;
          }
          if (existing.status === 'approved') {
            setError('Already tracking this account');
            setSendState('error');
            return;
          }
        }

        const fromProfile = {
          uid: user.uid,
          displayName: user.displayName ?? '',
          email: user.email ?? '',
          photoURL: user.photoURL ?? '',
          secretCode: currentSecretCode,
          trackedByUids: [],
          trackingUids: [],
          subscriptionStatus: 'trial' as const,
          createdAt: 0,
        };
        await createPairingRequest(fromProfile, targetUser.uid);
        setSendState('sent');
      } catch (err) {
        console.error('Pairing request failed:', err);
        setError('Something went wrong. Please try again.');
        setSendState('error');
      }
    },
    [user, currentSecretCode]
  );

  const handleSend = () => {
    submitCode(code);
  };

  const showForm = sendState !== 'sent';

  return (
    <BottomSheet open={open} onClose={onClose} title="Track someone">
      {showForm ? (
        <div className="flex flex-col gap-4">
          {/* Tab switcher */}
          <div className="flex p-1 rounded-lg bg-gray-100 dark:bg-[#0f1115] border border-gray-200 dark:border-gray-700/50">
            <button
              onClick={() => setTab('code')}
              className={cn(
                'flex-1 h-9 flex items-center justify-center gap-2 rounded-md text-[13px] font-medium transition-colors',
                tab === 'code'
                  ? 'bg-white dark:bg-[#252a31] text-gray-900 dark:text-gray-100 shadow-sm'
                  : 'text-gray-500 dark:text-gray-400'
              )}
            >
              <Keyboard className="w-4 h-4" />
              Enter code
            </button>
            <button
              onClick={() => setTab('scan')}
              className={cn(
                'flex-1 h-9 flex items-center justify-center gap-2 rounded-md text-[13px] font-medium transition-colors',
                tab === 'scan'
                  ? 'bg-white dark:bg-[#252a31] text-gray-900 dark:text-gray-100 shadow-sm'
                  : 'text-gray-500 dark:text-gray-400'
              )}
            >
              <QrCode className="w-4 h-4" />
              Scan QR
            </button>
          </div>

          {tab === 'code' ? (
            <>
              <div>
                <label className="block text-[13px] text-gray-500 dark:text-gray-400 mb-2">
                  Enter their secret code
                </label>
                <input
                  ref={inputRef}
                  type="text"
                  value={code}
                  onChange={(e) => {
                    setCode(formatCodeInput(e.target.value));
                    setError(null);
                    setSendState('idle');
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && sendState !== 'sending') handleSend();
                  }}
                  placeholder="XXXX-XXXX"
                  className="w-full h-11 px-4 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent text-gray-900 dark:text-gray-100 font-mono text-base tracking-wider focus:outline-none focus:border-accent"
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 text-sm text-red-500">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              <Button
                fullWidth
                onClick={handleSend}
                disabled={sendState === 'sending' || code.replace('-', '').length < 8}
              >
                {sendState === 'sending' ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Send request
                  </>
                )}
              </Button>
            </>
          ) : (
            <QRScannerTab
              onScan={submitCode}
              sendState={sendState}
              error={error}
              onSwitchToCode={() => setTab('code')}
            />
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 py-4">
          <CheckCircle2 className="w-12 h-12 text-success" />
          <p className="text-sm text-gray-900 dark:text-gray-100 text-center">
            Request sent — waiting for approval
          </p>
          <Button variant="outlined" fullWidth onClick={onClose} className="mt-2">
            Done
          </Button>
        </div>
      )}
    </BottomSheet>
  );
}

function QRScannerTab({
  onScan,
  sendState,
  error,
  onSwitchToCode,
}: {
  onScan: (code: string) => void;
  sendState: SendState;
  error: string | null;
  onSwitchToCode: () => void;
}) {
  const scannerRef = useRef<HTMLDivElement>(null);
  const html5ScannerRef = useRef<any>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    let mounted = true;

    const startScanner = async () => {
      if (!scannerRef.current) return;

      try {
        const { Html5Qrcode } = await import('html5-qrcode');
        if (!mounted || !scannerRef.current) return;

        const scanner = new Html5Qrcode('qr-scanner-viewfinder');
        html5ScannerRef.current = scanner;

        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 220, height: 220 } },
          (decodedText: string) => {
            if (sendState === 'sending') return;
            onScan(decodedText);
          },
          () => {}
        );

        if (mounted) setScanning(true);
      } catch (err) {
        if (mounted) {
          setCameraError('Camera access denied or unavailable');
          console.error('QR scanner error:', err);
        }
      }
    };

    startScanner();

    return () => {
      mounted = false;
      if (html5ScannerRef.current) {
        html5ScannerRef.current
          .stop()
          .then(() => html5ScannerRef.current?.clear())
          .catch(() => {});
        html5ScannerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col gap-3">
      {cameraError ? (
        <div className="flex flex-col items-center gap-3 py-6">
          <div className="w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center">
            <CameraOff className="w-7 h-7 text-red-500" />
          </div>
          <p className="text-[13px] text-red-500 text-center max-w-[240px]">
            {cameraError}
          </p>
          <button
            onClick={onSwitchToCode}
            className="flex items-center gap-2 text-[13px] font-medium text-accent hover:text-accent-muted transition-colors"
          >
            <Keyboard className="w-4 h-4" />
            Switch to Enter code
          </button>
        </div>
      ) : (
        <>
          <div className="relative w-full aspect-square max-w-[260px] mx-auto rounded-xl overflow-hidden bg-black">
            <div id="qr-scanner-viewfinder" ref={scannerRef} className="w-full h-full" />

            {/* Scanning frame overlay */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="relative w-[220px] h-[220px]">
                {/* Corner brackets */}
                <div className="absolute top-0 left-0 w-8 h-8 border-t-[3px] border-l-[3px] border-accent rounded-tl-lg" />
                <div className="absolute top-0 right-0 w-8 h-8 border-t-[3px] border-r-[3px] border-accent rounded-tr-lg" />
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-[3px] border-l-[3px] border-accent rounded-bl-lg" />
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-[3px] border-r-[3px] border-accent rounded-br-lg" />
              </div>
            </div>

            {!scanning && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <Loader2 className="w-6 h-6 text-accent animate-spin" />
              </div>
            )}
          </div>

          <p className="text-[13px] text-gray-500 dark:text-gray-400 text-center flex items-center justify-center gap-1.5">
            <Camera className="w-3.5 h-3.5" />
            Point camera at their QR code
          </p>

          {error && (
            <div className="flex items-center gap-2 text-sm text-red-500">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}
        </>
      )}
    </div>
  );
}
