/// <reference types="vite/client" />

/** Injected from .env.local via vite.config.js define */
declare const __APP_GOOGLE_MAPS_API_KEY__: string;

interface ImportMetaEnv {
  readonly VITE_GOOGLE_MAPS_API_KEY: string;
  readonly VITE_MAP_DEFAULT_LAT?: string;
  readonly VITE_MAP_DEFAULT_LNG?: string;
  readonly VITE_MAP_DEFAULT_ZOOM?: string;
  readonly VITE_BASE44_APP_ID?: string;
  readonly VITE_BASE44_APP_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
