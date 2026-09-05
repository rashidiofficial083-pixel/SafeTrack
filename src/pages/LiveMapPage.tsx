import { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Search,
  Plus,
  Minus,
  Locate,
  MapPinOff,
  History as HistoryIcon,
  BatteryLow,
  BatteryMedium,
  BatteryFull,
  BatteryWarning,
} from 'lucide-react';
import type L from 'leaflet';
import { Avatar } from '@/components/Avatar';
import { LiveMap } from '@/components/LiveMapMarker';
import { subscribeToUser } from '@/lib/firestore';
import { getInitials, timeAgo, isLive } from '@/lib/utils';
import type { UserProfile } from '@/types';

const OFFLINE_THRESHOLD_SECONDS = 120;

function BatteryIcon({ level }: { level: number | null | undefined }) {
  if (level === null || level === undefined) return null;
  const pct = Math.round(level * 100);
  if (pct <= 15) return <BatteryLow className="w-4 h-4" />;
  if (pct <= 50) return <BatteryMedium className="w-4 h-4" />;
  return <BatteryFull className="w-4 h-4" />;
}

function formatSpeed(speed: number | null | undefined): string {
  if (speed === null || speed === undefined || speed < 0.5) return 'Stationary';
  const kmh = speed * 3.6;
  if (kmh < 1) return 'Stationary';
  return `${Math.round(kmh)} km/h`;
}

export function LiveMapPage() {
  const { uid } = useParams<{ uid: string }>();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoRecenter, setAutoRecenter] = useState(true);
  const mapRef = useRef<L.Map | null>(null);
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!uid) return;
    const unsub = subscribeToUser(uid, (p) => {
      setProfile(p);
      setLoading(false);
    });
    return unsub;
  }, [uid]);

  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 5000);
    return () => clearInterval(interval);
  }, []);

  const handleMapMove = () => {
    setAutoRecenter(false);
  };

  const handleRecenter = () => {
    setAutoRecenter(true);
    if (mapRef.current && profile?.location) {
      mapRef.current.setView(
        [profile.location.lat, profile.location.lng],
        mapRef.current.getZoom() < 15 ? 16 : mapRef.current.getZoom(),
        { animate: true }
      );
    }
  };

  const handleZoomIn = () => mapRef.current?.zoomIn();
  const handleZoomOut = () => mapRef.current?.zoomOut();

  const hasLocation = !!profile?.location;
  const location = profile?.location;
  const live = hasLocation && isLive(location!.updatedAt);
  const isOffline =
    hasLocation && !live && Date.now() / 1000 - location!.updatedAt > OFFLINE_THRESHOLD_SECONDS;

  return (
    <div className="fixed inset-0 bg-[#0f1115] z-40">
      {loading ? (
        <div className="flex items-center justify-center h-full">
          <div className="h-8 w-8 rounded-full border-2 border-accent border-t-transparent animate-spin" />
        </div>
      ) : !hasLocation ? (
        <div className="flex flex-col h-full">
          <div className="flex items-center gap-3 p-4 pt-5 bg-[#0f1115] z-10">
            <button
              onClick={() => navigate('/track')}
              className="w-9 h-9 flex items-center justify-center rounded-lg bg-[#1a1d23] text-gray-100"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center gap-4 px-8">
            <div className="w-16 h-16 rounded-full bg-[#1a1d23] flex items-center justify-center">
              <MapPinOff className="w-8 h-8 text-gray-500" />
            </div>
            <p className="text-sm text-gray-400 text-center">
              Waiting for {profile?.displayName ?? 'this person'} to share their location
            </p>
          </div>
        </div>
      ) : (
        <>
          <LiveMap
            lat={location!.lat}
            lng={location!.lng}
            accuracy={location!.accuracy}
            heading={location!.heading}
            isMoving={(location!.speed ?? 0) > 0.5}
            photoURL={profile?.photoURL || null}
            initials={getInitials(profile?.displayName ?? null)}
            isOffline={isOffline}
            autoRecenter={autoRecenter}
            onMapMove={handleMapMove}
            mapRef={(m) => {
              mapRef.current = m;
            }}
          />

          {/* Top overlay */}
          <div className="absolute top-0 left-0 right-0 z-[1000] p-4 pt-5 flex items-center gap-3">
            <button
              onClick={() => navigate('/track')}
              className="w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-lg bg-[#1a1d23]/90 backdrop-blur-sm text-gray-100"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex-1 h-9 flex items-center gap-2 px-3 rounded-lg bg-[#1a1d23]/90 backdrop-blur-sm">
              <Search className="w-4 h-4 text-gray-500" />
              <span className="text-[13px] text-gray-500">Search places...</span>
            </div>
          </div>

          {/* Zoom controls */}
          <div className="absolute right-4 z-[1000] flex flex-col gap-2" style={{ bottom: '200px' }}>
            <button
              onClick={handleZoomIn}
              className="w-10 h-10 flex items-center justify-center rounded-lg bg-[#1a1d23]/90 backdrop-blur-sm text-gray-100 hover:bg-[#252a31]"
            >
              <Plus className="w-5 h-5" />
            </button>
            <button
              onClick={handleZoomOut}
              className="w-10 h-10 flex items-center justify-center rounded-lg bg-[#1a1d23]/90 backdrop-blur-sm text-gray-100 hover:bg-[#252a31]"
            >
              <Minus className="w-5 h-5" />
            </button>
            <button
              onClick={handleRecenter}
              className="w-10 h-10 flex items-center justify-center rounded-lg bg-accent text-black hover:bg-accent-muted"
            >
              <Locate className="w-5 h-5" />
            </button>
          </div>

          {/* Bottom info bar */}
          <div className="absolute bottom-0 left-0 right-0 z-[1000] p-4 pb-5 bg-gradient-to-t from-[#0f1115] via-[#0f1115]/95 to-transparent">
            <div className="flex items-center gap-3 p-3 rounded-card bg-[#1a1d23] border border-gray-700/50">
              <Avatar
                photoURL={profile?.photoURL || null}
                initials={getInitials(profile?.displayName ?? null)}
                size="md"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-100 truncate">
                  {profile?.displayName ?? 'Unknown'}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  {live ? (
                    <>
                      <span className="relative flex w-2 h-2">
                        <span className="absolute inline-flex h-full w-full rounded-full bg-success opacity-60 animate-ping" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-success" />
                      </span>
                      <span className="text-[12px] text-success font-medium">
                        Live · updated {timeAgo(location!.updatedAt)}
                      </span>
                    </>
                  ) : isOffline ? (
                    <span className="text-[12px] text-gray-400">
                      Last seen {timeAgo(location!.updatedAt)} at this location
                    </span>
                  ) : (
                    <span className="text-[12px] text-gray-400">
                      Updated {timeAgo(location!.updatedAt)}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3 flex-shrink-0">
                {location!.batteryLevel !== null && location!.batteryLevel !== undefined && (
                  <div className="flex items-center gap-1">
                    <BatteryIcon level={location!.batteryLevel} />
                    <span className="text-[12px] text-gray-300 font-medium">
                      {Math.round(location!.batteryLevel * 100)}%
                    </span>
                  </div>
                )}
                <div className="text-right">
                  <p className="text-[11px] text-gray-500">{formatSpeed(location!.speed)}</p>
                  <p className="text-[13px] text-gray-300 font-medium">
                    ±{Math.round(location!.accuracy)}m
                  </p>
                </div>
                <button
                  onClick={() => navigate(`/track/${uid}/history`)}
                  className="w-9 h-9 flex items-center justify-center rounded-lg bg-accent/10 text-accent hover:bg-accent/20"
                  aria-label="History"
                >
                  <HistoryIcon className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
