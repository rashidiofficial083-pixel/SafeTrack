import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, CircleMarker, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import { tileUrl, tileAttribution } from '@/lib/mapTiles';

interface LiveMapMarkerProps {
  lat: number;
  lng: number;
  accuracy: number;
  heading: number | null;
  isMoving: boolean;
}

function createHeadingIcon(heading: number, color: string): L.DivIcon {
  const html = `
    <div style="position: relative; width: 0; height: 0;">
      <div style="
        position: absolute;
        left: -10px;
        top: -10px;
        width: 20px;
        height: 20px;
        background: ${color};
        border-radius: 50%;
        border: 2.5px solid white;
        box-shadow: 0 0 6px rgba(0,0,0,0.3);
      "></div>
      <div style="
        position: absolute;
        left: -8px;
        top: -28px;
        width: 0;
        height: 0;
        border-left: 8px solid transparent;
        border-right: 8px solid transparent;
        border-bottom: 14px solid ${color};
        transform-origin: 50% 90%;
        transform: rotate(${heading}deg);
        opacity: 0.85;
      "></div>
    </div>
  `;
  return L.divIcon({
    html,
    className: 'live-map-heading-marker',
    iconSize: [0, 0],
  });
}

function createDotIcon(color: string): L.DivIcon {
  const html = `
    <div style="
      width: 20px;
      height: 20px;
      background: ${color};
      border-radius: 50%;
      border: 2.5px solid white;
      box-shadow: 0 0 6px rgba(0,0,0,0.3);
    "></div>
  `;
  return L.divIcon({
    html,
    className: 'live-map-dot-marker',
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
}

const ACCENT_COLOR = '#2DD4BF';

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
}: LiveMapMarkerProps) {
  const markerRef = useRef<L.Marker | null>(null);

  const icon =
    heading !== null && isMoving
      ? createHeadingIcon(heading, ACCENT_COLOR)
      : createDotIcon(ACCENT_COLOR);

  useEffect(() => {
    if (markerRef.current) {
      markerRef.current.setIcon(icon);
    }
  }, [icon]);

  return (
    <>
      <AutoRecenter lat={lat} lng={lng} autoRecenter={true} />
      <CircleMarker
        center={[lat, lng]}
        radius={Math.max(8, Math.min(80, accuracy / 2))}
        pathOptions={{
          color: ACCENT_COLOR,
          fillColor: ACCENT_COLOR,
          fillOpacity: 0.12,
          opacity: 0.3,
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
  autoRecenter: boolean;
  onMapMove: () => void;
  mapRef: (map: L.Map) => void;
}

function MapEventSetup({ onMove, mapRef }: { onMove: () => void; mapRef: (m: L.Map) => void }) {
  const map = useMap();
  const mapRefSent = useRef(false);

  if (!mapRefSent.current) {
    map.on('dragstart', onMove);
    mapRef(map);
    mapRefSent.current = true;
  }

  return null;
}

export function LiveMap({
  lat,
  lng,
  accuracy,
  heading,
  isMoving,
  autoRecenter,
  onMapMove,
  mapRef,
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
      <TileLayer url={tileUrl} attribution={tileAttribution} />
      <LiveMapMarker
        lat={lat}
        lng={lng}
        accuracy={accuracy}
        heading={heading}
        isMoving={isMoving}
      />
      <AutoRecenter lat={lat} lng={lng} autoRecenter={autoRecenter} />
    </MapContainer>
  );
}
