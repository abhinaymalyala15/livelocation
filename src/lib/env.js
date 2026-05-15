/**
 * Centralized environment config for Vite.
 * Values come from .env.local (see .env.example).
 */
const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim() ?? '';

export const env = {
  googleMapsApiKey,
  mapDefaultLat: parseFloat(import.meta.env.VITE_MAP_DEFAULT_LAT) || 40.7128,
  mapDefaultLng: parseFloat(import.meta.env.VITE_MAP_DEFAULT_LNG) || -74.006,
  mapDefaultZoom: parseInt(import.meta.env.VITE_MAP_DEFAULT_ZOOM, 10) || 12,
  isDev: import.meta.env.DEV,
};

export function isGoogleMapsConfigured() {
  return Boolean(
    googleMapsApiKey &&
      googleMapsApiKey !== 'your_google_maps_api_key' &&
      googleMapsApiKey !== 'YOUR_GOOGLE_MAPS_API_KEY_HERE'
  );
}

export function getGoogleMapsConfigStatus() {
  if (!googleMapsApiKey) {
    return { ok: false, message: 'VITE_GOOGLE_MAPS_API_KEY is missing from .env.local' };
  }
  if (!isGoogleMapsConfigured()) {
    return { ok: false, message: 'Replace the placeholder with your real Google Maps API key' };
  }
  return { ok: true, message: 'Google Maps API key is configured' };
}
