import L from 'leaflet';

export type MapLayerType = 'street' | 'satellite' | 'hybrid';

export interface TileLayerConfig {
  url: string;
  attribution: string;
  maxZoom?: number;
}

export const STREET_LAYER: TileLayerConfig = {
  url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
  maxZoom: 20,
};

export const SATELLITE_LAYER: TileLayerConfig = {
  url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  attribution: 'Tiles &copy; Esri — Source: Esri, Maxar, Earthstar Geographics',
  maxZoom: 19,
};

export const HYBRID_ROADS_LAYER: TileLayerConfig = {
  url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}',
  attribution: 'Tiles &copy; Esri',
  maxZoom: 19,
};

export const HYBRID_LABELS_LAYER: TileLayerConfig = {
  url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
  attribution: 'Tiles &copy; Esri',
  maxZoom: 19,
};

// Legacy exports (used by HistoryMap)
const tileUrl = STREET_LAYER.url;
const tileAttribution = STREET_LAYER.attribution;

export const tileLayer = L.tileLayer(tileUrl, {
  attribution: tileAttribution,
  maxZoom: 20,
});

export { tileUrl, tileAttribution };
