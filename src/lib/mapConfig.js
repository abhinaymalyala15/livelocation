import { env } from '@/lib/env';

export const mapContainerStyle = {
  width: '100%',
  height: '100%',
  borderRadius: '12px',
};

export const defaultMapCenter = {
  lat: env.mapDefaultLat,
  lng: env.mapDefaultLng,
};

export const defaultMapOptions = {
  zoom: env.mapDefaultZoom,
  mapTypeControl: true,
  streetViewControl: false,
  fullscreenControl: true,
  zoomControl: true,
  styles: [
    { featureType: 'water', stylers: [{ color: '#c9c9c9' }] },
    { featureType: 'land', stylers: [{ color: '#f3f3f3' }] },
  ],
};
