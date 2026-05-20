import { useRef, useEffect, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import { GoogleMap, Marker, Circle } from "@react-google-maps/api";
import useRoadSnappedPath from "@/hooks/useRoadSnappedPath";
import RoutePathPolylines from "@/components/tracking/RoutePathPolylines";
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
import { Gauge } from "lucide-react";
import moment from "moment";

const mapOptions = { ...defaultMapOptions, gestureHandling: "greedy" };

export default function DriverLiveMap({ position, tripPath = [], tracking, className = "" }) {
  const mapRef = useRef(null);
  const { isLoaded, isConfigured, loadError } = useGoogleMaps();

  const center = useMemo(() => {
    if (position) return { lat: position.latitude, lng: position.longitude };
    return defaultMapCenter;
  }, [position?.latitude, position?.longitude]);

  const { displayPath: routePath, rawPath, isSnapped } = useRoadSnappedPath(tripPath, {
    enabled: tripPath.length > 1,
    debounceMs: 800,
  });

  const onLoad = useCallback((map) => {
    mapRef.current = map;
    triggerMapResize(map);
  }, []);

  useEffect(() => {
    if (!mapRef.current || !position) return;
    mapRef.current.panTo({ lat: position.latitude, lng: position.longitude });
  }, [position?.latitude, position?.longitude]);

  const markerIcon = useMemo(() => {
    if (!position || !isLoaded) return undefined;
    return getVehicleMapMarkerIcon(
      { heading: position.heading ?? 0, status: "on_trip", current_speed: position.speed ?? 0 },
      { selected: true, driver: true }
    );
  }, [position?.heading, position?.speed, isLoaded]);

  if (!isConfigured) return <MapsUnavailable />;
  if (loadError) {
    return (
      <section
        className="rounded-xl border border-destructive/30 bg-destructive/5 flex items-center justify-center min-h-[280px] p-6 text-center"
        style={{ height: "min(420px, 55vh)" }}
      >
        <motion.div className="space-y-2 max-w-md">
          <p className="font-semibold text-destructive">Map failed to load</p>
          <p className="text-sm text-muted-foreground">{loadError.message}</p>
          <p className="text-xs text-muted-foreground">
            Enable Maps JavaScript API and check API key restrictions in Google Cloud Console.
          </p>
        </motion.div>
      </section>
    );
  }
  if (!isLoaded) return <Loader text="Loading map..." />;

  return (
    <motion.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`relative border border-border overflow-hidden bg-muted/30 h-full min-h-[280px] ${className}`}
    >
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
        {position && (
          <>
            <Circle
              center={{ lat: position.latitude, lng: position.longitude }}
              radius={Math.max(position.accuracy || 25, 15)}
              options={{
                fillColor: "#0d9488",
                fillOpacity: 0.12,
                strokeColor: "#0d9488",
                strokeOpacity: 0.35,
                strokeWeight: 1,
              }}
            />
            <Marker
              position={{ lat: position.latitude, lng: position.longitude }}
              icon={markerIcon}
            />
          </>
        )}
      </GoogleMap>

      {position && tracking && (
        <div className="absolute bottom-3 left-3 right-3 sm:right-auto sm:max-w-xs bg-card/95 backdrop-blur border border-border rounded-lg p-3 shadow-sm text-sm">
          <div className="flex items-center gap-2 text-primary font-medium mb-1">
            <Gauge className="h-4 w-4" />
            Live
          </div>
          <p className="font-semibold">{(position.speed ?? 0).toFixed(1)} km/h</p>
          <p className="text-xs text-muted-foreground mt-1">
            {position.latitude.toFixed(5)}, {position.longitude.toFixed(5)}
          </p>
          <p className="text-xs text-muted-foreground">
            ±{Math.round(position.accuracy || 0)}m · {moment(position.timestamp).format("HH:mm:ss")}
          </p>
        </div>
      )}
    </motion.section>
  );
}
