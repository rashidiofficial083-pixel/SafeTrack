import { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { Send } from 'lucide-react';
import { db } from '@/lib/firebase';
import { Avatar } from '@/components/Avatar';
import { fetchPublicUserProfiles } from '@/lib/firestore';
import { getInitials } from '@/lib/utils';
import type { PublicUser } from '@/types';

interface SentRequestEntry {
  id: string;
  toUid: string;
  targetProfile?: PublicUser;
}

interface SentRequestsProps {
  currentUid: string;
}

export function SentRequests({ currentUid }: SentRequestsProps) {
  const [requests, setRequests] = useState<SentRequestEntry[]>([]);
  const [profiles, setProfiles] = useState<PublicUser[]>([]);

  useEffect(() => {
    if (!currentUid) return;
    const q = query(
      collection(db, 'pairingRequests'),
      where('fromUid', '==', currentUid),
      where('status', '==', 'pending')
    );
    return onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => ({
        id: d.id,
        toUid: d.data().toUid as string,
      }));
      setRequests(list);
    });
  }, [currentUid]);

  useEffect(() => {
    if (requests.length === 0) {
      setProfiles([]);
      return;
    }
    fetchPublicUserProfiles(requests.map((r) => r.toUid)).then(setProfiles);
  }, [requests]);

  if (requests.length === 0) return null;

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <Send className="w-4 h-4 text-accent" />
        <h3 className="text-[13px] font-medium text-gray-500 dark:text-gray-400">
          Sent requests ({requests.length})
        </h3>
      </div>
      <div className="flex flex-col gap-2">
        {requests.map((req) => {
          const profile = profiles.find((p) => p.uid === req.toUid);
          return (
            <div
              key={req.id}
              className="flex items-center gap-3 p-3 rounded-card border border-gray-200 dark:border-gray-700/50 bg-white dark:bg-[#1a1d23]"
            >
              <Avatar
                photoURL={profile?.photoURL || null}
                initials={getInitials(profile?.displayName ?? null)}
                size="sm"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                  {profile?.displayName ?? 'Unknown'}
                </p>
                <p className="text-[12px] text-gray-500 dark:text-gray-400">
                  Waiting for approval
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-amber-400/15 text-amber-500">
                Pending
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
