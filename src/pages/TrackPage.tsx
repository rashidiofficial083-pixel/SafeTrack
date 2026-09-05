import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Users, MapPinOff, MoreVertical, UserMinus, Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Avatar } from '@/components/Avatar';
import { BottomNav } from '@/components/BottomNav';
import { subscribeToUserProfile, subscribeToTrackedUsers, stopTracking } from '@/lib/firestore';
import { getInitials, timeAgo, isLive } from '@/lib/utils';
import type { UserProfile } from '@/types';

export function TrackPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [trackingUids, setTrackingUids] = useState<string[]>([]);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [trackedUsers, setTrackedUsers] = useState<UserProfile[]>([]);
  const [menuOpenUid, setMenuOpenUid] = useState<string | null>(null);
  const [confirmStop, setConfirmStop] = useState<UserProfile | null>(null);
  const [stopping, setStopping] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeToUserProfile(user.uid, (profile) => {
      setTrackingUids(profile?.trackingUids ?? []);
      setProfileLoaded(true);
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

  useEffect(() => {
    if (!menuOpenUid) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpenUid(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpenUid]);

  const handleStopTracking = async () => {
    if (!user || !confirmStop) return;
    setStopping(true);
    try {
      await stopTracking(user.uid, confirmStop.uid);
    } catch (e) {
      console.error('Failed to stop tracking:', e);
    } finally {
      setStopping(false);
      setConfirmStop(null);
      setMenuOpenUid(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0f1115] pb-20">
      <div className="px-5 pt-6 max-w-sm mx-auto">
        <h1 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-1">
          Tracking
        </h1>
        <p className="text-[13px] text-gray-500 dark:text-gray-400 mb-5">
          {trackedUsers.length} {trackedUsers.length === 1 ? 'person' : 'people'}
        </p>

        {!profileLoaded ? (
          <div className="flex flex-col gap-2">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="flex items-center gap-3 p-3 rounded-card border border-gray-200 dark:border-gray-700/50 bg-white dark:bg-[#1a1d23]"
              >
                <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse" />
                <div className="flex-1">
                  <div className="h-3.5 w-28 rounded animate-pulse bg-gray-200 dark:bg-gray-700" />
                  <div className="h-2.5 w-20 rounded animate-pulse bg-gray-200 dark:bg-gray-700 mt-2" />
                </div>
              </div>
            ))}
          </div>
        ) : trackedUsers.length === 0 ? (
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
              const menuOpen = menuOpenUid === p.uid;
              return (
                <div
                  key={p.uid}
                  className="relative flex items-center gap-3 p-3 rounded-card border border-gray-200 dark:border-gray-700/50 bg-white dark:bg-[#1a1d23] hover:border-accent/40 transition-colors"
                >
                  <button
                    onClick={() => navigate(`/track/${p.uid}`)}
                    className="flex items-center gap-3 flex-1 min-w-0 text-left"
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

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuOpenUid(menuOpen ? null : p.uid);
                    }}
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 flex-shrink-0"
                    aria-label="Options"
                  >
                    <MoreVertical className="w-5 h-5" />
                  </button>

                  {menuOpen && (
                    <div
                      ref={menuRef}
                      className="absolute right-2 top-12 z-50 w-44 py-1 rounded-lg border border-gray-200 dark:border-gray-700/50 bg-white dark:bg-[#252a31] shadow-lg"
                    >
                      <button
                        onClick={() => {
                          setConfirmStop(p);
                          setMenuOpenUid(null);
                        }}
                        className="flex items-center gap-2.5 w-full px-3 py-2.5 text-sm text-red-500 hover:bg-gray-100 dark:hover:bg-gray-800"
                      >
                        <UserMinus className="w-4 h-4" />
                        Stop tracking
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Confirmation dialog */}
      {confirmStop && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-6">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => !stopping && setConfirmStop(null)}
          />
          <div className="relative w-full max-w-sm p-5 rounded-card bg-white dark:bg-[#1a1d23] border border-gray-200 dark:border-gray-700/50">
            <div className="flex items-center gap-3 mb-3">
              <Avatar
                photoURL={confirmStop.photoURL || null}
                initials={getInitials(confirmStop.displayName)}
                size="md"
              />
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  Stop tracking {confirmStop.displayName}?
                </p>
                <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-0.5">
                  You'll need to send a new request to track them again.
                </p>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setConfirmStop(null)}
                disabled={stopping}
                className="flex-1 h-11 rounded-lg border border-gray-300 dark:border-gray-700 text-sm font-medium text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleStopTracking}
                disabled={stopping}
                className="flex-1 h-11 rounded-lg bg-red-500 text-white text-sm font-medium hover:bg-red-600 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {stopping ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Stop tracking'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav active="track" />
    </div>
  );
}
