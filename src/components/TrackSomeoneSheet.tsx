import { useState, useRef, useEffect } from 'react';
import { Loader2, Send, CheckCircle2, AlertCircle } from 'lucide-react';
import { BottomSheet } from '@/components/BottomSheet';
import { Button } from '@/components/Button';
import { useAuth } from '@/context/AuthContext';
import {
  findUserByCode,
  checkExistingRequest,
  createPairingRequest,
} from '@/lib/firestore';

interface TrackSomeoneSheetProps {
  open: boolean;
  onClose: () => void;
  currentSecretCode: string;
}

type SendState = 'idle' | 'sending' | 'sent' | 'error';

function formatCodeInput(raw: string): string {
  const cleaned = raw
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 8);
  if (cleaned.length <= 4) return cleaned;
  return `${cleaned.slice(0, 4)}-${cleaned.slice(4)}`;
}

export function TrackSomeoneSheet({
  open,
  onClose,
  currentSecretCode,
}: TrackSomeoneSheetProps) {
  const { user } = useAuth();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sendState, setSendState] = useState<SendState>('idle');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setCode('');
      setError(null);
      setSendState('idle');
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [open]);

  const handleSend = async () => {
    if (!user) return;
    setError(null);

    const formattedCode = formatCodeInput(code);
    if (formattedCode.replace('-', '').length < 8) {
      setError('Please enter a full 8-character code');
      return;
    }

    if (formattedCode === currentSecretCode) {
      setError("You can't track your own account");
      return;
    }

    setSendState('sending');

    try {
      const targetUser = await findUserByCode(formattedCode);
      if (!targetUser) {
        setError('No account found with this code');
        setSendState('error');
        return;
      }

      const existing = await checkExistingRequest(user.uid, targetUser.uid);
      if (existing) {
        if (existing.status === 'pending') {
          setError('Request already sent');
        } else if (existing.status === 'approved') {
          setError('Already tracking this account');
        } else {
          setError('Request already sent');
        }
        setSendState('error');
        return;
      }

      const fromProfile = {
        uid: user.uid,
        displayName: user.displayName ?? '',
        email: user.email ?? '',
        photoURL: user.photoURL ?? '',
        secretCode: currentSecretCode,
        trackedByUids: [],
        trackingUids: [],
        createdAt: 0,
      };
      await createPairingRequest(fromProfile, targetUser.uid);
      setSendState('sent');
    } catch {
      setError('Something went wrong. Please try again.');
      setSendState('error');
    }
  };

  const showForm = sendState !== 'sent';

  return (
    <BottomSheet open={open} onClose={onClose} title="Track someone">
      {showForm ? (
        <div className="flex flex-col gap-4">
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
