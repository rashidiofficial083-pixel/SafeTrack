import { useEffect, useRef } from 'react';
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Marker,
  Polyline,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import {
  tileUrl,
  tileAttribution,
  STREET_LAYER,
  SATELLITE_LAYER,
  HYBRID_ROADS_LAYER,
  HYBRID_LABELS_LAYER,
  type MapLayerType,
} from '@/lib/mapTiles';

const ACCENT_COLOR = '#2DD4BF';
const OFFLINE_COLOR = '#6b7280';

interface LiveMapMarkerProps {
  lat: number;
  lng: number;
  accuracy: number;
  heading: number | null;
  isMoving: boolean;
  photoURL: string | null;
  initials: string;
  isOffline: boolean;
}

function createPhotoMarker(
  photoURL: string,
  heading: number | null,
  isMoving: boolean,
  isOffline: boolean
): L.DivIcon {
  const ringColor = isOffline ? OFFLINE_COLOR : ACCENT_COLOR;
  const filter = isOffline ? 'grayscale(0.6) opacity(0.7)' : 'none';
  const size = 40;
  const half = size / 2;

  let headingArrow = '';
  if (heading !== null && isMoving && !isOffline) {
    headingArrow = `
      <div style="
        position: absolute;
        left: ${half - 8}px;
        top: -14px;
        width: 0;
        height: 0;
        border-left: 8px solid transparent;
        border-right: 8px solid transparent;
        border-bottom: 14px solid ${ringColor};
        transform-origin: 50% 90%;
        transform: rotate(${heading}deg);
        opacity: 0.85;
      "></div>
    `;
  }

  const html = `
    <div style="position: relative; width: ${size}px; height: ${size}px;">
      ${headingArrow}
      <div style="
        width: ${size}px;
        height: ${size}px;
        border-radius: 50%;
        border: 3px solid ${ringColor};
        overflow: hidden;
        box-shadow: 0 2px 8px rgba(0,0,0,0.35);
        filter: ${filter};
        background: ${ringColor};
      ">
        <img src="${photoURL}" referrerpolicy="no-referrer"
          style="width: 100%; height: 100%; object-fit: cover;"
          onerror="this.style.display='none'" />
      </div>
    </div>
  `;

  return L.divIcon({
    html,
    className: 'live-map-photo-marker',
    iconSize: [size, size],
    iconAnchor: [half, half],
  });
}

function createInitialsMarker(
  initials: string,
  heading: number | null,
  isMoving: boolean,
  isOffline: boolean
): L.DivIcon {
  const ringColor = isOffline ? OFFLINE_COLOR : ACCENT_COLOR;
  const size = 40;
  const half = size / 2;

  let headingArrow = '';
  if (heading !== null && isMoving && !isOffline) {
    headingArrow = `
      <div style="
        position: absolute;
        left: ${half - 8}px;
        top: -14px;
        width: 0;
        height: 0;
        border-left: 8px solid transparent;
        border-right: 8px solid transparent;
        border-bottom: 14px solid ${ringColor};
        transform-origin: 50% 90%;
        transform: rotate(${heading}deg);
        opacity: 0.85;
      "></div>
    `;
  }

  const html = `
    <div style="position: relative; width: ${size}px; height: ${size}px;">
      ${headingArrow}
      <div style="
        width: ${size}px;
        height: ${size}px;
        border-radius: 50%;
        border: 3px solid ${ringColor};
        background: ${ringColor};
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 15px;
        font-weight: 600;
        color: #000;
        font-family: system-ui, sans-serif;
        box-shadow: 0 2px 8px rgba(0,0,0,0.35);
        ${isOffline ? 'filter: grayscale(0.6) opacity(0.7);' : ''}
      ">${initials}</div>
    </div>
  `;

  return L.divIcon({
    html,
    className: 'live-map-initials-marker',
    iconSize: [size, size],
    iconAnchor: [half, half],
  });
}

function AutoRecenter({
  lat,
  lng,
  autoRecenter,
}: {
  lat: number;
  lng: number;
  autoRecenter: boolean;
}) {
  const map = useMap();

  useEffect(() => {
    if (autoRecenter) {
      map.setView([lat, lng], map.getZoom() < 15 ? 16 : map.getZoom(), {
        animate: true,
      });
    }
  }, [lat, lng, autoRecenter, map]);

  return null;
}

export function LiveMapMarker({
  lat,
  lng,
  accuracy,
  heading,
  isMoving,
  photoURL,
  initials,
  isOffline,
}: LiveMapMarkerProps) {
  const markerRef = useRef<L.Marker | null>(null);

  const icon = photoURL
    ? createPhotoMarker(photoURL, heading, isMoving, isOffline)
    : createInitialsMarker(initials, heading, isMoving, isOffline);

  useEffect(() => {
    if (markerRef.current) {
      markerRef.current.setIcon(icon);
    }
  }, [icon]);

  const circleColor = isOffline ? OFFLINE_COLOR : ACCENT_COLOR;

  return (
    <>
      <AutoRecenter lat={lat} lng={lng} autoRecenter={true} />
      <CircleMarker
        center={[lat, lng]}
        radius={Math.max(8, Math.min(80, accuracy / 2))}
        pathOptions={{
          color: circleColor,
          fillColor: circleColor,
          fillOpacity: isOffline ? 0.06 : 0.12,
          opacity: isOffline ? 0.2 : 0.3,
          weight: 1,
        }}
        className="live-accuracy-circle"
      />
      <Marker
        position={[lat, lng]}
        icon={icon}
        ref={(ref) => {
          markerRef.current = ref;
        }}
      />
    </>
  );
}

interface FullMapProps {
  lat: number;
  lng: number;
  accuracy: number;
  heading: number | null;
  isMoving: boolean;
  photoURL: string | null;
  initials: string;
  isOffline: boolean;
  autoRecenter: boolean;
  onMapMove: () => void;
  mapRef: (map: L.Map) => void;
  activeLayer: MapLayerType;
}

function MapEventSetup({
  onMove,
  mapRef,
}: {
  onMove: () => void;
  mapRef: (m: L.Map) => void;
}) {
  const map = useMap();
  const mapRefSent = useRef(false);

  if (!mapRefSent.current) {
    map.on('dragstart', onMove);
    mapRef(map);
    mapRefSent.current = true;
  }

  return null;
}

function TileLayerSwitcher({ activeLayer }: { activeLayer: MapLayerType }) {
  const map = useMap();
  const currentLayerRef = useRef<MapLayerType | null>(null);
  const tileLayersRef = useRef<L.TileLayer[]>([]);

  useEffect(() => {
    if (currentLayerRef.current === activeLayer) return;
    currentLayerRef.current = activeLayer;

    tileLayersRef.current.forEach((layer) => map.removeLayer(layer));
    tileLayersRef.current = [];

    if (activeLayer === 'street') {
      const layer = L.tileLayer(STREET_LAYER.url, {
        attribution: STREET_LAYER.attribution,
        maxZoom: STREET_LAYER.maxZoom,
      }).addTo(map);
      tileLayersRef.current.push(layer);
    } else if (activeLayer === 'satellite') {
      const layer = L.tileLayer(SATELLITE_LAYER.url, {
        attribution: SATELLITE_LAYER.attribution,
        maxZoom: SATELLITE_LAYER.maxZoom,
      }).addTo(map);
      tileLayersRef.current.push(layer);
    } else if (activeLayer === 'hybrid') {
      const base = L.tileLayer(SATELLITE_LAYER.url, {
        attribution: SATELLITE_LAYER.attribution,
        maxZoom: SATELLITE_LAYER.maxZoom,
      }).addTo(map);
      const roads = L.tileLayer(HYBRID_ROADS_LAYER.url, {
        maxZoom: HYBRID_ROADS_LAYER.maxZoom,
      }).addTo(map);
      const labels = L.tileLayer(HYBRID_LABELS_LAYER.url, {
        maxZoom: HYBRID_LABELS_LAYER.maxZoom,
      }).addTo(map);
      tileLayersRef.current.push(base, roads, labels);
    }
  }, [activeLayer, map]);

  return null;
}

export function LiveMap({
  lat,
  lng,
  accuracy,
  heading,
  isMoving,
  photoURL,
  initials,
  isOffline,
  autoRecenter,
  onMapMove,
  mapRef,
  activeLayer,
}: FullMapProps) {
  return (
    <MapContainer
      center={[lat, lng]}
      zoom={16}
      zoomControl={false}
      attributionControl={false}
      className="w-full h-full"
    >
      <MapEventSetup onMove={onMapMove} mapRef={mapRef} />
      <TileLayerSwitcher activeLayer={activeLayer} />
      <LiveMapMarker
        lat={lat}
        lng={lng}
        accuracy={accuracy}
        heading={heading}
        isMoving={isMoving}
        photoURL={photoURL}
        initials={initials}
        isOffline={isOffline}
      />
      <AutoRecenter lat={lat} lng={lng} autoRecenter={autoRecenter} />
    </MapContainer>
  );
}

interface HistoryMapProps {
  points: { lat: number; lng: number }[];
  mapRef: (map: L.Map) => void;
}

export function HistoryMap({ points, mapRef }: HistoryMapProps) {
  const latlngs = points.map((p) => [p.lat, p.lng]) as [number, number][];
  const center: [number, number] =
    latlngs.length > 0
      ? latlngs[Math.floor(latlngs.length / 2)]
      : [0, 0];

  return (
    <MapContainer
      center={center}
      zoom={14}
      zoomControl={false}
      attributionControl={false}
      className="w-full h-full"
    >
      <MapEventSetup onMove={() => {}} mapRef={mapRef} />
      <TileLayer url={tileUrl} attribution={tileAttribution} />
      {latlngs.length >= 2 && (
        <Polyline
          positions={latlngs}
          pathOptions={{
            color: ACCENT_COLOR,
            weight: 3,
            opacity: 0.7,
          }}
        />
      )}
      {latlngs.map((pos, i) => (
        <CircleMarker
          key={i}
          center={pos}
          radius={i === 0 || i === latlngs.length - 1 ? 6 : 4}
          pathOptions={{
            color: ACCENT_COLOR,
            fillColor:
              i === 0
                ? '#22C55E'
                : i === latlngs.length - 1
                ? ACCENT_COLOR
                : ACCENT_COLOR,
            fillOpacity: 0.8,
            weight: 2,
          }}
        />
      ))}
    </MapContainer>
  );
}
