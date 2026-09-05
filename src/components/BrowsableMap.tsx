import { useRef, useEffect } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Plus, Minus } from 'lucide-react';

const VOYAGER_URL =
  'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
const VOYAGER_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';

const DEFAULT_CENTER: [number, number] = [23.8103, 90.4125];
const DEFAULT_ZOOM = 12;

interface MapControllerProps {
  mapRef: (map: L.Map) => void;
}

function MapController({ mapRef }: MapControllerProps) {
  const map = useMap();
  const sent = useRef(false);

  useEffect(() => {
    if (!sent.current) {
      mapRef(map);
      sent.current = true;
    }
  }, [map, mapRef]);

  return null;
}

interface BrowsableMapProps {
  mapRef: (map: L.Map) => void;
}

export function BrowsableMap({ mapRef }: BrowsableMapProps) {
  return (
    <div className="absolute inset-0 z-0">
      <MapContainer
        center={DEFAULT_CENTER}
        zoom={DEFAULT_ZOOM}
        zoomControl={false}
        attributionControl={false}
        className="w-full h-full"
      >
        <MapController mapRef={mapRef} />
        <TileLayer url={VOYAGER_URL} attribution={VOYAGER_ATTRIBUTION} maxZoom={20} />
      </MapContainer>

      {/* Custom zoom controls — bottom right, styled to match app dark theme */}
      <div className="absolute right-3 z-[500] flex flex-col gap-2" style={{ bottom: '88px' }}>
        <button
          onClick={() => {
            const map = (window as any).__homeMap as L.Map | undefined;
            map?.zoomIn();
          }}
          className="w-10 h-10 flex items-center justify-center rounded-lg bg-[#1a1d23]/90 backdrop-blur-sm border border-gray-700/50 text-gray-100 hover:bg-[#252a31] transition-colors shadow-lg"
          aria-label="Zoom in"
        >
          <Plus className="w-5 h-5" />
        </button>
        <button
          onClick={() => {
            const map = (window as any).__homeMap as L.Map | undefined;
            map?.zoomOut();
          }}
          className="w-10 h-10 flex items-center justify-center rounded-lg bg-[#1a1d23]/90 backdrop-blur-sm border border-gray-700/50 text-gray-100 hover:bg-[#252a31] transition-colors shadow-lg"
          aria-label="Zoom out"
        >
          <Minus className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
