import { env } from '@/lib/env';

/** Hyderabad fleet default — override via .env.local */
export const HYDERABAD_CENTER = { lat: 17.385, lng: 78.4867 };

export const mapContainerStyle = {
  width: '100%',
  height: '100%',
  minHeight: '400px',
};

export const defaultMapCenter = {
  lat: env.mapDefaultLat,
  lng: env.mapDefaultLng,
};

/**
 * Standard roadmap — no custom styles (partial styles caused flat grey map with no roads).
 */
export const defaultMapOptions = {
  zoom: env.mapDefaultZoom,
  mapTypeId: 'roadmap',
  mapTypeControl: true,
  streetViewControl: true,
  fullscreenControl: true,
  zoomControl: true,
  clickableIcons: true,
  disableDefaultUI: false,
};

/** Call after map mount inside flex layouts so tiles render at full size */
export function triggerMapResize(map) {
  if (!map || !window.google?.maps?.event) return;
  window.google.maps.event.trigger(map, 'resize');
}

/** Fit map to vehicle positions */
export function fitMapToPositions(map, positions, padding = 64) {
  if (!map || !positions?.length || !window.google?.maps) return;
  const bounds = new window.google.maps.LatLngBounds();
  positions.forEach((p) => bounds.extend(p));
  map.fitBounds(bounds, padding);
}
