import { useEffect, useState } from 'react';
import { Check, X, BellRing } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Avatar } from '@/components/Avatar';
import {
  subscribeToIncomingRequests,
  approvePairingRequest,
  denyPairingRequest,
} from '@/lib/firestore';
import { getInitials } from '@/lib/utils';
import type { PairingRequest } from '@/types';

export function IncomingRequests() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<PairingRequest[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeToIncomingRequests(user.uid, setRequests);
    return unsub;
  }, [user]);

  if (!user || requests.length === 0) return null;

  const handleApprove = async (req: PairingRequest) => {
    setBusy(req.id);
    try {
      await approvePairingRequest(req.id, req.fromUid, user!.uid);
    } catch (e) {
      console.error('Failed to approve:', e);
    } finally {
      setBusy(null);
    }
  };

  const handleDeny = async (req: PairingRequest) => {
    setBusy(req.id);
    try {
      await denyPairingRequest(req.id);
    } catch (e) {
      console.error('Failed to deny:', e);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <BellRing className="w-4 h-4 text-accent" />
        <h3 className="text-[13px] font-medium text-gray-500 dark:text-gray-400">
          Pending requests ({requests.length})
        </h3>
      </div>
      <div className="flex flex-col gap-2">
        {requests.map((req) => (
          <div
            key={req.id}
            className="flex items-center gap-3 p-3 rounded-card border border-gray-200 dark:border-gray-700/50 bg-white dark:bg-[#1a1d23]"
          >
            <Avatar
              photoURL={req.fromPhotoURL || null}
              initials={getInitials(req.fromDisplayName)}
              size="sm"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                {req.fromDisplayName}
              </p>
              <p className="text-[12px] text-gray-500 dark:text-gray-400">
                wants to track your location
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleApprove(req)}
                disabled={busy === req.id}
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-success/10 text-success hover:bg-success/20 disabled:opacity-50"
                aria-label="Allow"
              >
                <Check className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleDeny(req)}
                disabled={busy === req.id}
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 disabled:opacity-50"
                aria-label="Deny"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
