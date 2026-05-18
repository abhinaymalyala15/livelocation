import { createContext, useContext } from 'react';
import { useJsApiLoader } from '@react-google-maps/api';
import { env, isGoogleMapsConfigured } from '@/lib/env';

const libraries = ['places'];

const GoogleMapsContext = createContext({
  isLoaded: false,
  loadError: null,
  isConfigured: false,
});

export function useGoogleMaps() {
  return useContext(GoogleMapsContext);
}

export function GoogleMapsProvider({ children }) {
  const isConfigured = isGoogleMapsConfigured();

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: isConfigured ? env.googleMapsApiKey : '',
    libraries,
    id: 'fleettrack-maps',
  });

  const value = {
    isLoaded: isConfigured && isLoaded,
    loadError: isConfigured ? loadError : null,
    isConfigured,
  };

  return (
    <GoogleMapsContext.Provider value={value}>
      {children}
    </GoogleMapsContext.Provider>
  );
}
