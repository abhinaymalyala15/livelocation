import { useRef, useEffect, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import { GoogleMap, Marker, Polyline, Circle } from "@react-google-maps/api";
import { useGoogleMaps } from "@/components/GoogleMapsProvider";
import {
  defaultMapCenter,
  defaultMapOptions,
  mapContainerStyle,
  triggerMapResize,
} from "@/lib/mapConfig";
import MapsUnavailable from "@/components/tracking/MapsUnavailable";
import Loader from "@/components/tracking/Loader";
import { Gauge } from "lucide-react";
import moment from "moment";

const mapOptions = { ...defaultMapOptions, gestureHandling: "greedy" };

export default function DriverLiveMap({ position, tripPath = [], tracking }) {
  const mapRef = useRef(null);
  const { isLoaded, isConfigured } = useGoogleMaps();

  const center = useMemo(() => {
    if (position) return { lat: position.latitude, lng: position.longitude };
    return defaultMapCenter;
  }, [position?.latitude, position?.longitude]);

  const path = useMemo(
    () => tripPath.map((p) => ({ lat: p.lat, lng: p.lng })),
    [tripPath]
  );

  const onLoad = useCallback((map) => {
    mapRef.current = map;
    triggerMapResize(map);
  }, []);

  useEffect(() => {
    if (!mapRef.current || !position) return;
    mapRef.current.panTo({ lat: position.latitude, lng: position.longitude });
  }, [position?.latitude, position?.longitude]);

  const markerIcon = useMemo(() => {
    if (!window.google?.maps) return undefined;
    return {
      path: window.google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
      scale: 5,
      fillColor: "#0d9488",
      fillOpacity: 1,
      strokeColor: "#fff",
      strokeWeight: 2,
      rotation: position?.heading ?? 0,
    };
  }, [position?.heading, isLoaded]);

  if (!isConfigured) return <MapsUnavailable />;
  if (!isLoaded) return <Loader text="Loading map..." />;

  return (
    <motion.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="relative rounded-xl border border-border overflow-hidden bg-muted/30"
      style={{ height: "min(420px, 55vh)" }}
    >
      <GoogleMap
        mapContainerStyle={{ ...mapContainerStyle, minHeight: "100%", height: "100%" }}
        center={center}
        zoom={15}
        options={mapOptions}
        onLoad={onLoad}
      >
        {path.length > 1 && (
          <Polyline
            path={path}
            options={{ strokeColor: "#0d9488", strokeWeight: 4, strokeOpacity: 0.85 }}
          />
        )}
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
