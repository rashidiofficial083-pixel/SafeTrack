import { useRef } from 'react';
import type L from 'leaflet';
import { BottomNav } from '@/components/BottomNav';
import { BrowsableMap } from '@/components/BrowsableMap';
import { SearchBar as MapSearchBar } from '@/components/MapSearchBar';
import { ClockWidget } from '@/components/ClockWidget';
import { WeatherWidget } from '@/components/WeatherWidget';
import { SharingStatusBar } from '@/components/SharingStatusBar';
import { useLocationSharing } from '@/hooks/useLocationSharing';
import { useAuth } from '@/context/AuthContext';

export function HomePage() {
  const { user } = useAuth();
  const { status: locationStatus, retry: retryLocation, accuracy } = useLocationSharing(
    user?.uid ?? null
  );
  const mapRef = useRef<L.Map | null>(null);

  const handleMapRef = (map: L.Map) => {
    mapRef.current = map;
    (window as any).__homeMap = map;
  };

  return (
    <div className="fixed inset-0 bg-[#0f1115] overflow-hidden">
      {/* Full-bleed browsable map */}
      <BrowsableMap mapRef={handleMapRef} />

      {/* Floating widgets overlay */}
      <div className="absolute inset-0 z-[400] pointer-events-none flex flex-col">
        {/* Top: search bar */}
        <div className="px-4 pt-5 pointer-events-auto">
          <MapSearchBar mapRef={mapRef} />
        </div>

        {/* Below search: clock + weather widgets side by side */}
        <div className="px-4 pt-3 pointer-events-auto">
          <div className="flex gap-3">
            <ClockWidget />
            <WeatherWidget />
          </div>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Bottom: sharing status bar (above bottom nav) */}
        <div className="px-4 pb-2 pointer-events-auto">
          <SharingStatusBar
            status={locationStatus}
            accuracy={accuracy}
            onRetry={retryLocation}
          />
        </div>
      </div>

      {/* Bottom navigation */}
      <BottomNav active="home" />
    </div>
  );
}
