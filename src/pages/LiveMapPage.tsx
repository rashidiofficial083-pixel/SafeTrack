import { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Plus,
  Minus,
  Locate,
  MapPinOff,
  History as HistoryIcon,
  RefreshCw,
  Clock,
  Navigation,
  BatteryLow,
  BatteryMedium,
  BatteryFull,
  Crosshair,
  MapPinCheck,
} from 'lucide-react';
import type L from 'leaflet';
import { Avatar } from '@/components/Avatar';
import { LiveMap } from '@/components/LiveMapMarker';
import { LayerSwitcher } from '@/components/LayerSwitcher';
import { subscribeToUser } from '@/lib/firestore';
import { getInitials, timeAgo, isLive } from '@/lib/utils';
import type { MapLayerType } from '@/lib/mapTiles';
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
  const [activeLayer, setActiveLayer] = useState<MapLayerType>('hybrid');
  const [refreshKey, setRefreshKey] = useState(0);
  const mapRef = useRef<L.Map | null>(null);
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!uid) return;
    const unsub = subscribeToUser(uid, (p) => {
      setProfile(p);
      setLoading(false);
    });
    return unsub;
  }, [uid, refreshKey]);

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

  const handleRefresh = () => {
    setLoading(true);
    setRefreshKey((k) => k + 1);
  };

  const handleZoomIn = () => mapRef.current?.zoomIn();
  const handleZoomOut = () => mapRef.current?.zoomOut();

  const handleDirections = () => {
    if (!profile?.location) return;
    const { lat, lng } = profile.location;
    window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
      '_blank',
      'noopener,noreferrer'
    );
  };

  const hasLocation = !!profile?.location;
  const location = profile?.location;
  const live = hasLocation && isLive(location!.updatedAt);
  const isOffline =
    hasLocation && !live && Date.now() / 1000 - location!.updatedAt > OFFLINE_THRESHOLD_SECONDS;

  const hasBattery =
    location!.batteryLevel !== null &&
    location!.batteryLevel !== undefined;

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
            activeLayer={activeLayer}
          />

          {/* Top overlay */}
          <div className="absolute top-0 left-0 right-0 z-[1000] p-4 pt-5 flex items-center gap-3">
            <button
              onClick={() => navigate('/track')}
              className="w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-lg bg-[#1a1d23]/90 backdrop-blur-sm text-gray-100"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          </div>

          {/* Right-side controls: layer switcher + zoom */}
          <div className="absolute right-4 z-[1000] flex flex-col gap-3" style={{ bottom: '280px' }}>
            <LayerSwitcher activeLayer={activeLayer} onLayerChange={setActiveLayer} />
            <div className="flex flex-col gap-2">
              <button
                onClick={handleZoomIn}
                className="w-10 h-10 flex items-center justify-center rounded-lg bg-[#1a1d23]/90 backdrop-blur-sm text-gray-100 hover:bg-[#252a31] border border-gray-700/50"
              >
                <Plus className="w-5 h-5" />
              </button>
              <button
                onClick={handleZoomOut}
                className="w-10 h-10 flex items-center justify-center rounded-lg bg-[#1a1d23]/90 backdrop-blur-sm text-gray-100 hover:bg-[#252a31] border border-gray-700/50"
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
          </div>

          {/* Bottom info bar */}
          <div className="absolute bottom-0 left-0 right-0 z-[1000] bg-gradient-to-t from-[#0f1115] via-[#0f1115]/95 to-transparent pb-5 pt-8 px-4">
            <div className="rounded-t-2xl bg-[#1a1d23] border border-gray-700/50 p-4">
              {/* Row 1: avatar + name + status + refresh */}
              <div className="flex items-center gap-3">
                <div className="relative flex-shrink-0">
                  <div className="rounded-full" style={{ border: '2px solid #2DD4BF' }}>
                    <Avatar
                      photoURL={profile?.photoURL || null}
                      initials={getInitials(profile?.displayName ?? null)}
                      size="md"
                    />
                  </div>
                  <span
                    className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[#1a1d23] ${
                      live ? 'bg-success' : 'bg-amber-400'
                    }`}
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-bold text-gray-100 truncate">
                    {profile?.displayName ?? 'Unknown'}
                  </p>
                  {live ? (
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="relative flex w-2 h-2">
                        <span className="absolute inline-flex h-full w-full rounded-full bg-success opacity-60 animate-ping" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-success" />
                      </span>
                      <span className="text-[12px] text-success font-medium">
                        Live · updated {timeAgo(location!.updatedAt)}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Clock className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                      <span className="text-[12px] text-amber-400">
                        Last seen {timeAgo(location!.updatedAt)} at this location
                      </span>
                    </div>
                  )}
                </div>

                <button
                  onClick={handleRefresh}
                  className="w-9 h-9 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-800 hover:text-gray-200 flex-shrink-0 transition-colors"
                  aria-label="Refresh location"
                >
                  <RefreshCw className="w-4.5 h-4.5" />
                </button>
              </div>

              {/* Row 2: stat grid */}
              <div className={`grid gap-2 mt-3 ${hasBattery ? 'grid-cols-3' : 'grid-cols-2'}`}>
                {hasBattery && (
                  <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-[#0f1115] border border-gray-700/30">
                    <BatteryIcon level={location!.batteryLevel} />
                    <span className="text-[13px] text-gray-200 font-medium tabular-nums">
                      {Math.round((location!.batteryLevel as number) * 100)}%
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-[#0f1115] border border-gray-700/30">
                  <MapPinCheck className="w-4 h-4 text-accent flex-shrink-0" />
                  <span className="text-[13px] text-gray-200 font-medium truncate">
                    {formatSpeed(location!.speed)}
                  </span>
                </div>
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-[#0f1115] border border-gray-700/30">
                  <Crosshair className="w-4 h-4 text-accent flex-shrink-0" />
                  <span className="text-[13px] text-gray-200 font-medium tabular-nums">
                    ±{Math.round(location!.accuracy)}m
                  </span>
                </div>
              </div>

              {/* Row 3: action buttons */}
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => navigate(`/track/${uid}/history`)}
                  className="flex-1 h-10 flex items-center justify-center gap-2 rounded-lg border border-gray-600 bg-transparent text-sm font-medium text-gray-200 hover:bg-gray-800 transition-colors"
                >
                  <HistoryIcon className="w-4 h-4" />
                  History
                </button>
                <button
                  onClick={handleDirections}
                  className="flex-1 h-10 flex items-center justify-center gap-2 rounded-lg border border-accent bg-transparent text-sm font-medium text-accent hover:bg-accent/10 transition-colors"
                >
                  <Navigation className="w-4 h-4" />
                  Directions
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
