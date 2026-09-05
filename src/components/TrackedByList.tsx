import { useEffect, useState } from 'react';
import { ChevronDown, Eye, EyeOff, Users } from 'lucide-react';
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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (expanded && trackedByUids.length > 0 && profiles.length === 0) {
      setLoading(true);
      setError(null);
      fetchUserProfiles(trackedByUids)
        .then(setProfiles)
        .catch(() => setError('Could not load list. Please try again.'))
        .finally(() => setLoading(false));
    }
  }, [expanded, trackedByUids, profiles.length]);

  if (trackedByUids.length === 0) {
    return (
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Eye className="w-4 h-4 text-gray-400" />
          <h3 className="text-[13px] font-medium text-gray-500 dark:text-gray-400">
            Who is tracking you
          </h3>
        </div>
        <div className="flex flex-col items-center gap-2 py-5 px-3 rounded-card bg-gray-100 dark:bg-[#1a1d23]">
          <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-800 flex items-center justify-center">
            <Users className="w-5 h-5 text-gray-400" />
          </div>
          <p className="text-[13px] text-gray-500 dark:text-gray-400 text-center max-w-[200px]">
            No one is tracking you yet. Share your code to get started.
          </p>
        </div>
      </div>
    );
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
            <div className="flex flex-col gap-2">
              {[0, 1].map((i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 p-2.5 rounded-lg bg-gray-100 dark:bg-[#1a1d23]"
                >
                  <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse" />
                  <div className="h-3.5 w-24 rounded animate-pulse bg-gray-200 dark:bg-gray-700" />
                </div>
              ))}
            </div>
          ) : error ? (
            <p className="text-[13px] text-red-500 px-1">{error}</p>
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
