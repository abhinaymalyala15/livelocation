/**
 * Centralized environment config for Vite.
 * Values come from .env.local (see .env.example).
 */

function cleanEnvValue(value) {
  if (value == null || value === 'undefined') return '';
  let s = String(value).trim();
  if (
    (s.startsWith('"') && s.endsWith('"')) ||
    (s.startsWith("'") && s.endsWith("'"))
  ) {
    s = s.slice(1, -1).trim();
  }
  return s;
}

function readGoogleMapsApiKey() {
  const fromDefine =
    typeof __APP_GOOGLE_MAPS_API_KEY__ !== 'undefined'
      ? __APP_GOOGLE_MAPS_API_KEY__
      : '';
  const fromMeta = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  return cleanEnvValue(fromDefine || fromMeta);
}

const googleMapsApiKey = readGoogleMapsApiKey();

export const env = {
  get googleMapsApiKey() {
    return readGoogleMapsApiKey();
  },
  mapDefaultLat: parseFloat(import.meta.env.VITE_MAP_DEFAULT_LAT) || 40.7128,
  mapDefaultLng: parseFloat(import.meta.env.VITE_MAP_DEFAULT_LNG) || -74.006,
  mapDefaultZoom: parseInt(import.meta.env.VITE_MAP_DEFAULT_ZOOM, 10) || 12,
  isDev: import.meta.env.DEV,
};

export function isGoogleMapsConfigured() {
  const key = readGoogleMapsApiKey();
  return Boolean(
    key &&
      key !== 'your_google_maps_api_key' &&
      key !== 'YOUR_GOOGLE_MAPS_API_KEY_HERE'
  );
}

export function getGoogleMapsConfigStatus() {
  const key = readGoogleMapsApiKey();
  if (!key) {
    return {
      ok: false,
      message:
        'VITE_GOOGLE_MAPS_API_KEY is missing. Add it to .env.local in the project root, then restart the dev server (npm run dev).',
    };
  }
  if (!isGoogleMapsConfigured()) {
    return { ok: false, message: 'Replace the placeholder with your real Google Maps API key' };
  }
  return { ok: true, message: 'Google Maps API key is configured' };
}

// Legacy export for modules that read env.googleMapsApiKey at import time
export { googleMapsApiKey };
