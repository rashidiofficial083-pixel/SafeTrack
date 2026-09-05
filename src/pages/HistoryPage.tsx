import { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Lock,
  MapPin,
  Clock,
  Loader2,
} from 'lucide-react';
import L from 'leaflet';
import { HistoryMap } from '@/components/LiveMapMarker';
import { fetchLocationHistory, subscribeToUser } from '@/lib/firestore';
import { formatDateKey, parseDateKey, isToday } from '@/lib/utils';
import type { LocationHistoryEntry, UserProfile } from '@/types';

function formatTime(seconds: number): string {
  const d = new Date(seconds * 1000);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function HistoryPage() {
  const { uid } = useParams<{ uid: string }>();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [selectedDate, setSelectedDate] = useState(formatDateKey(new Date()));
  const [entries, setEntries] = useState<LocationHistoryEntry[]>([]);
  const [loadingEntries, setLoadingEntries] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!uid) return;
    const unsub = subscribeToUser(uid, (p) => {
      setProfile(p);
      setLoadingProfile(false);
    });
    return unsub;
  }, [uid]);

  useEffect(() => {
    if (!uid || !profile) return;

    const sub = profile.subscriptionStatus;
    if (sub !== 'trial' && sub !== 'premium') {
      setLoadingEntries(false);
      return;
    }

    setLoadingEntries(true);
    setError(null);
    const date = parseDateKey(selectedDate);
    fetchLocationHistory(uid, date)
      .then((data) => {
        setEntries(data);
        setLoadingEntries(false);
      })
      .catch(() => {
        setError('Could not load location history. Please try again.');
        setLoadingEntries(false);
      });
  }, [uid, profile, selectedDate]);

  useEffect(() => {
    if (mapRef.current && entries.length > 0) {
      const bounds = L.latLngBounds(
        entries.map((e) => [e.lat, e.lng] as [number, number])
      );
      mapRef.current.fitBounds(bounds, { padding: [40, 40] });
    }
  }, [entries]);

  const subscription = profile?.subscriptionStatus ?? 'trial';
  const hasHistoryAccess = subscription === 'trial' || subscription === 'premium';

  const changeDate = (delta: number) => {
    const d = parseDateKey(selectedDate);
    d.setDate(d.getDate() + delta);
    setSelectedDate(formatDateKey(d));
  };

  const canGoForward = !isToday(parseDateKey(selectedDate));

  return (
    <div className="fixed inset-0 bg-[#0f1115] z-40 flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 pt-5 bg-[#0f1115] z-10 flex-shrink-0">
        <button
          onClick={() => navigate(`/track/${uid}`)}
          className="w-9 h-9 flex items-center justify-center rounded-lg bg-[#1a1d23] text-gray-100"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-100 truncate">
            {profile?.displayName ?? 'History'}
          </p>
          <p className="text-[12px] text-gray-500">Location history</p>
        </div>
      </div>

      {/* Date picker */}
      <div className="flex items-center justify-between px-4 py-2 flex-shrink-0">
        <button
          onClick={() => changeDate(-1)}
          className="w-9 h-9 flex items-center justify-center rounded-lg bg-[#1a1d23] text-gray-300 hover:bg-[#252a31]"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <span className="text-sm text-gray-100 font-medium">
          {parseDateKey(selectedDate).toLocaleDateString([], {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
          })}
        </span>
        <button
          onClick={() => canGoForward && changeDate(1)}
          disabled={!canGoForward}
          className="w-9 h-9 flex items-center justify-center rounded-lg bg-[#1a1d23] text-gray-300 hover:bg-[#252a31] disabled:opacity-30 disabled:pointer-events-none"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {loadingProfile ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="h-8 w-8 rounded-full border-2 border-accent border-t-transparent animate-spin" />
        </div>
      ) : !hasHistoryAccess ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-8">
          <div className="w-16 h-16 rounded-full bg-[#1a1d23] flex items-center justify-center">
            <Lock className="w-8 h-8 text-gray-500" />
          </div>
          <p className="text-sm text-gray-400 text-center">
            History is a premium feature — ask {profile?.displayName ?? 'them'} to upgrade
          </p>
        </div>
      ) : (
        <>
          {/* Map */}
          <div className="flex-shrink-0 h-[40%] min-h-[200px] relative">
            {loadingEntries ? (
              <div className="flex items-center justify-center h-full bg-[#1a1d23]">
                <Loader2 className="w-6 h-6 text-accent animate-spin" />
              </div>
            ) : entries.length === 0 ? (
              <div className="flex items-center justify-center h-full bg-[#1a1d23]">
                <p className="text-[13px] text-gray-500">No movement recorded</p>
              </div>
            ) : (
              <HistoryMap
                points={entries.map((e) => ({ lat: e.lat, lng: e.lng }))}
                mapRef={(m) => {
                  mapRef.current = m;
                }}
              />
            )}
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto no-scrollbar px-4 py-3">
            {error ? (
              <div className="flex items-center justify-center py-8">
                <p className="text-sm text-red-500 text-center">{error}</p>
              </div>
            ) : loadingEntries ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 text-accent animate-spin" />
              </div>
            ) : entries.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <div className="w-12 h-12 rounded-full bg-[#1a1d23] flex items-center justify-center">
                  <MapPin className="w-6 h-6 text-gray-500" />
                </div>
                <p className="text-[13px] text-gray-500 text-center max-w-[220px]">
                  No location history for this day. Pick a different date or check back later.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                <p className="text-[12px] text-gray-500 mb-2">
                  {entries.length} {entries.length === 1 ? 'point' : 'points'}
                </p>
                {entries.map((entry, i) => (
                  <div
                    key={entry.id}
                    className="flex items-center gap-3 p-2.5 rounded-lg bg-[#1a1d23]"
                  >
                    <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
                      {i === 0 ? (
                        <MapPin className="w-4 h-4 text-success" />
                      ) : i === entries.length - 1 ? (
                        <MapPin className="w-4 h-4 text-accent" />
                      ) : (
                        <Clock className="w-4 h-4 text-accent" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] text-gray-100 font-medium">
                        {formatTime(entry.recordedAt)}
                      </p>
                      <p className="text-[11px] text-gray-500 font-mono">
                        {entry.lat.toFixed(4)}, {entry.lng.toFixed(4)}
                      </p>
                    </div>
                    <span className="text-[11px] text-gray-500 flex-shrink-0">
                      ±{Math.round(entry.accuracy)}m
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
