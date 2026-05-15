import { createContext, useContext } from 'react';
import { useJsApiLoader } from '@react-google-maps/api';
import { env, isGoogleMapsConfigured } from '@/lib/env';
import Loader from '@/components/tracking/Loader';

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

  if (!isConfigured) {
    return (
      <GoogleMapsContext.Provider value={{ isLoaded: false, loadError: null, isConfigured: false }}>
        {children}
      </GoogleMapsContext.Provider>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
        <div className="max-w-md text-center space-y-2">
          <p className="font-semibold text-destructive">Google Maps failed to load</p>
          <p className="text-sm text-muted-foreground">{loadError.message}</p>
          <p className="text-xs text-muted-foreground">
            Enable Maps JavaScript API and check API key restrictions in Google Cloud Console.
          </p>
        </div>
      </div>
    );
  }

  return (
    <GoogleMapsContext.Provider value={{ isLoaded, loadError: null, isConfigured: true }}>
      {!isLoaded ? (
        <div className="min-h-screen flex items-center justify-center">
          <Loader text="Loading maps..." />
        </div>
      ) : (
        children
      )}
    </GoogleMapsContext.Provider>
  );
}
