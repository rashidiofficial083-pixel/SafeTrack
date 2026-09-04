import L from 'leaflet';
import { useEffect } from 'react';

const tileUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const tileAttribution =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

export const tileLayer = L.tileLayer(tileUrl, {
  attribution: tileAttribution,
  maxZoom: 19,
});

export { tileUrl, tileAttribution };
