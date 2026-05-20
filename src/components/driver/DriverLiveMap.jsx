import { useRef, useEffect, useMemo, useCallback } from "react";
import { GoogleMap, Circle } from "@react-google-maps/api";
import useRoadSnappedPath from "@/hooks/useRoadSnappedPath";
import RoutePathPolylines from "@/components/tracking/RoutePathPolylines";
import AnimatedVehicleMarker from "@/components/tracking/AnimatedVehicleMarker";
import { useGoogleMaps } from "@/components/GoogleMapsProvider";
import {
  defaultMapCenter,
  defaultMapOptions,
  mapContainerStyle,
  triggerMapResize,
} from "@/lib/mapConfig";
import { getVehicleMapMarkerIcon } from "@/lib/vehicleMapMarker";
import MapsUnavailable from "@/components/tracking/MapsUnavailable";
import Loader from "@/components/tracking/Loader";

const mapOptions = { ...defaultMapOptions, gestureHandling: "greedy" };

export default function DriverLiveMap({ position, tripPath = [], tracking, className = "" }) {
  const mapRef = useRef(null);
  const panRafRef = useRef(null);
  const { isLoaded, isConfigured, loadError } = useGoogleMaps();

  const center = useMemo(() => {
    if (position) return { lat: position.latitude, lng: position.longitude };
    return defaultMapCenter;
  }, [position?.latitude, position?.longitude]);

  const markerPosition = useMemo(() => {
    if (!position) return null;
    return { lat: position.latitude, lng: position.longitude };
  }, [position?.latitude, position?.longitude]);

  const { displayPath: routePath, rawPath, isSnapped } = useRoadSnappedPath(tripPath, {
    enabled: tripPath.length > 1,
    debounceMs: 800,
  });

  const smoothPanTo = useCallback((lat, lng) => {
    const map = mapRef.current;
    if (!map || !window.google?.maps) return;
    const start = map.getCenter()?.toJSON();
    if (!start) {
      map.panTo({ lat, lng });
      return;
    }
    if (panRafRef.current) cancelAnimationFrame(panRafRef.current);
    const t0 = performance.now();
    const duration = 500;
    const step = (now) => {
      const t = Math.min(1, (now - t0) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      map.panTo({
        lat: start.lat + (lat - start.lat) * eased,
        lng: start.lng + (lng - start.lng) * eased,
      });
      if (t < 1) panRafRef.current = requestAnimationFrame(step);
    };
    panRafRef.current = requestAnimationFrame(step);
  }, []);

  const onLoad = useCallback((map) => {
    mapRef.current = map;
    triggerMapResize(map);
  }, []);

  useEffect(() => {
    if (!mapRef.current || !position) return;
    smoothPanTo(position.latitude, position.longitude);
  }, [position?.latitude, position?.longitude, smoothPanTo]);

  const markerIcon = useMemo(() => {
    if (!position || !isLoaded) return undefined;
    return getVehicleMapMarkerIcon(
      {
        heading: position.heading ?? 0,
        status: tracking ? "on_trip" : "available",
        current_speed: position.speed ?? 0,
      },
      { selected: true, driver: true }
    );
  }, [position?.heading, position?.speed, tracking, isLoaded]);

  if (!isConfigured) return <MapsUnavailable className={className} />;
  if (loadError) {
    return (
      <section className="flex items-center justify-center min-h-[200px] p-6 text-center text-destructive text-sm">
        Map failed to load.
      </section>
    );
  }
  if (!isLoaded) return <Loader text="Loading map..." className="h-full" />;

  return (
    <div className={`relative w-full h-full min-h-0 bg-muted/20 ${className}`}>
      <GoogleMap
        mapContainerStyle={{ ...mapContainerStyle, minHeight: "100%", height: "100%" }}
        center={center}
        zoom={15}
        options={mapOptions}
        onLoad={onLoad}
      >
        <RoutePathPolylines
          path={routePath}
          rawPath={rawPath}
          showRawGhost={isSnapped && rawPath.length > 1}
          color="#0d9488"
        />
        {markerPosition && (
          <>
            <Circle
              center={markerPosition}
              radius={Math.max(position.accuracy || 25, 15)}
              options={{
                fillColor: "#0d9488",
                fillOpacity: 0.1,
                strokeColor: "#0d9488",
                strokeOpacity: 0.3,
                strokeWeight: 1,
                clickable: false,
              }}
            />
            <AnimatedVehicleMarker
              position={markerPosition}
              icon={markerIcon}
              title="Your vehicle"
              zIndex={100}
            />
          </>
        )}
      </GoogleMap>
    </div>
  );
}
