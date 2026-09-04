import { useEffect, useState } from 'react';
import { ChevronDown, Eye, EyeOff } from 'lucide-react';
import { Avatar } from '@/components/Avatar';
import { fetchUserProfiles } from '@/lib/firestore';
import { getInitials } from '@/lib/utils';
import type { UserProfile } from '@/types';

interface TrackedByListProps {
  trackedByUids: string[];
}

export function TrackedByList({ trackedByUids }: TrackedByListProps) {
  const [expanded, setExpanded] = useState(false);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (expanded && trackedByUids.length > 0 && profiles.length === 0) {
      setLoading(true);
      fetchUserProfiles(trackedByUids)
        .then(setProfiles)
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [expanded, trackedByUids, profiles.length]);

  if (trackedByUids.length === 0) {
    return null;
  }

  return (
    <div className="mb-6">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center gap-2 text-[13px] text-gray-500 dark:text-gray-400 hover:text-accent transition-colors"
      >
        {expanded ? (
          <EyeOff className="w-4 h-4" />
        ) : (
          <Eye className="w-4 h-4" />
        )}
        {expanded ? 'Hide who is tracking you' : 'See who is tracking you'}
        <ChevronDown
          className={`w-4 h-4 transition-transform ${
            expanded ? 'rotate-180' : ''
          }`}
        />
      </button>

      {expanded && (
        <div className="mt-3 flex flex-col gap-2">
          {loading ? (
            <p className="text-[13px] text-gray-400">Loading...</p>
          ) : (
            profiles.map((p) => (
              <div
                key={p.uid}
                className="flex items-center gap-3 p-2.5 rounded-lg bg-gray-100 dark:bg-[#1a1d23]"
              >
                <Avatar
                  photoURL={p.photoURL || null}
                  initials={getInitials(p.displayName)}
                  size="sm"
                />
                <span className="text-sm text-gray-900 dark:text-gray-100 truncate">
                  {p.displayName}
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
