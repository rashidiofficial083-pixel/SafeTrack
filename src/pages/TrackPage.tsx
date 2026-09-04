import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Users, MapPinOff } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Avatar } from '@/components/Avatar';
import { BottomNav } from '@/components/BottomNav';
import { subscribeToUserProfile, subscribeToTrackedUsers } from '@/lib/firestore';
import { getInitials, timeAgo, isLive } from '@/lib/utils';
import type { UserProfile } from '@/types';

export function TrackPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [trackingUids, setTrackingUids] = useState<string[]>([]);
  const [trackedUsers, setTrackedUsers] = useState<UserProfile[]>([]);

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeToUserProfile(user.uid, (profile) => {
      setTrackingUids(profile?.trackingUids ?? []);
    });
    return unsub;
  }, [user]);

  useEffect(() => {
    if (trackingUids.length === 0) {
      setTrackedUsers([]);
      return;
    }
    const unsub = subscribeToTrackedUsers(trackingUids, setTrackedUsers);
    return unsub;
  }, [trackingUids]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0f1115] pb-20">
      <div className="px-5 pt-6 max-w-sm mx-auto">
        <h1 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-1">
          Tracking
        </h1>
        <p className="text-[13px] text-gray-500 dark:text-gray-400 mb-5">
          {trackedUsers.length} {trackedUsers.length === 1 ? 'person' : 'people'}
        </p>

        {trackedUsers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-14 h-14 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <Users className="w-7 h-7 text-gray-400" />
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center max-w-[200px]">
              You're not tracking anyone yet. Use "Track someone" on the home page to get started.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {trackedUsers.map((p) => {
              const hasLocation = !!p.location;
              const live = hasLocation && isLive(p.location!.updatedAt);
              const location = p.location;
              return (
                <button
                  key={p.uid}
                  onClick={() => navigate(`/track/${p.uid}`)}
                  className="flex items-center gap-3 p-3 rounded-card border border-gray-200 dark:border-gray-700/50 bg-white dark:bg-[#1a1d23] hover:border-accent/40 transition-colors text-left"
                >
                  <Avatar
                    photoURL={p.photoURL || null}
                    initials={getInitials(p.displayName)}
                    size="md"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                      {p.displayName}
                    </p>
                    {hasLocation ? (
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {live && (
                          <span className="relative flex w-2 h-2">
                            <span className="absolute inline-flex h-full w-full rounded-full bg-success opacity-60 animate-ping" />
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-success" />
                          </span>
                        )}
                        <span
                          className={`text-[12px] ${
                            live
                              ? 'text-success font-medium'
                              : 'text-gray-500 dark:text-gray-400'
                          }`}
                        >
                          {live ? 'Live now' : `Last seen ${timeAgo(location!.updatedAt)}`}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <MapPinOff className="w-3.5 h-3.5 text-gray-400" />
                        <span className="text-[12px] text-gray-500 dark:text-gray-400">
                          No location shared yet
                        </span>
                      </div>
                    )}
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-300 dark:text-gray-600 flex-shrink-0" />
                </button>
              );
            })}
          </div>
        )}
      </div>

      <BottomNav active="track" />
    </div>
  );
}
