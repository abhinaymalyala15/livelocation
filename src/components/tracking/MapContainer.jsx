import { useRef, useMemo, useEffect, useCallback } from "react";
import { GoogleMap, Marker, Circle } from "@react-google-maps/api";
import { useGoogleMaps } from "@/components/GoogleMapsProvider";
import useRoadSnappedPath from "@/hooks/useRoadSnappedPath";
import RoutePathPolylines from "@/components/tracking/RoutePathPolylines";
import {
  defaultMapCenter,
  defaultMapOptions,
  mapContainerStyle,
  fitMapToPositions,
  triggerMapResize,
} from "@/lib/mapConfig";
import { normalizeVehicles } from "@/lib/normalizeVehicle";
import MapsUnavailable from "./MapsUnavailable";
import Loader from "./Loader";
import AnimatedVehicleMarker from "./AnimatedVehicleMarker";
import { resolveVehicleStatus } from "@/lib/vehicleStatus";
import { getVehicleMapMarkerIcon } from "@/lib/vehicleMapMarker";

const mapOptions = {
  ...defaultMapOptions,
  gestureHandling: "greedy",
};

export default function MapView({
  vehicles: rawVehicles,
  selectedVehicle,
  onSelectVehicle,
  tripPath = [],
  tripDistanceKm = null,
  geofences = [],
  geofenceAlerts = [],
  socketConnected = true,
}) {
  const mapRef = useRef(null);
  const panRafRef = useRef(null);
  const hasFittedRef = useRef(false);
  const { isLoaded, isConfigured } = useGoogleMaps();

  const vehicles = useMemo(() => normalizeVehicles(rawVehicles), [rawVehicles]);

  const centerPos = useMemo(() => {
    const v = selectedVehicle;
    const lat = v?.latitude ?? v?.current_latitude;
    const lng = v?.longitude ?? v?.current_longitude;
    if (lat != null && lng != null) return { lat, lng };
    return defaultMapCenter;
  }, [
    selectedVehicle?.id,
    selectedVehicle?.latitude,
    selectedVehicle?.longitude,
    selectedVehicle?.current_latitude,
    selectedVehicle?.current_longitude,
  ]);

  const { displayPath: routePath, rawPath, isSnapped } = useRoadSnappedPath(tripPath, {
    enabled: tripPath.length > 1,
    debounceMs: 700,
  });

  const activeVehicles = vehicles.filter((v) => v.latitude != null && v.longitude != null);

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
    const duration = 600;

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

  const handleMapLoad = useCallback(
    (map) => {
      mapRef.current = map;
      triggerMapResize(map);

      if (!hasFittedRef.current && activeVehicles.length > 0) {
        hasFittedRef.current = true;
        const positions = activeVehicles.map((v) => ({
          lat: v.latitude,
          lng: v.longitude,
        }));
        fitMapToPositions(map, positions, { top: 48, right: 48, bottom: 48, left: 48 });
      }

      // Resize again after layout settles (fixes grey/blank tiles in flex panels)
      requestAnimationFrame(() => triggerMapResize(map));
      setTimeout(() => triggerMapResize(map), 200);
    },
    [activeVehicles]
  );

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    triggerMapResize(map);
  }, [activeVehicles.length]);

  useEffect(() => {
    if (!selectedVehicle) return;
    const lat = selectedVehicle.latitude ?? selectedVehicle.current_latitude;
    const lng = selectedVehicle.longitude ?? selectedVehicle.current_longitude;
    if (lat != null && lng != null) smoothPanTo(lat, lng);
  }, [
    selectedVehicle?.id,
    selectedVehicle?.latitude,
    selectedVehicle?.longitude,
    selectedVehicle?.last_location_update,
    smoothPanTo,
  ]);

  const handleMarkerClick = (vehicle) => {
    onSelectVehicle?.(vehicle);
    if (vehicle.latitude != null && vehicle.longitude != null) {
      smoothPanTo(vehicle.latitude, vehicle.longitude);
      mapRef.current?.setZoom(15);
    }
  };

  if (!isConfigured) return <MapsUnavailable />;
  if (!isLoaded) return <Loader text="Loading map..." className="h-full min-h-[400px]" />;

  return (
    <GoogleMap
      mapContainerStyle={mapContainerStyle}
      center={centerPos}
      zoom={defaultMapOptions.zoom}
      onLoad={handleMapLoad}
      options={mapOptions}
    >
      {geofences
        .filter((g) => g.is_active)
        .map((zone) => {
          const isAlerted = geofenceAlerts.some((a) => a.zoneId === zone.id);
          return (
            <Circle
              key={zone.id}
              center={{ lat: zone.center_latitude, lng: zone.center_longitude }}
              radius={zone.radius_meters}
              options={{
                strokeColor: isAlerted ? "#ef4444" : "#0ea5e9",
                strokeOpacity: isAlerted ? 0.8 : 0.6,
                strokeWeight: isAlerted ? 2 : 1.5,
                fillColor: isAlerted ? "#ef4444" : "#0ea5e9",
                fillOpacity: isAlerted ? 0.12 : 0.07,
              }}
            />
          );
        })}

      {geofences
        .filter((g) => g.is_active)
        .map((zone) => (
          <Marker
            key={`label-${zone.id}`}
            position={{ lat: zone.center_latitude, lng: zone.center_longitude }}
            title={zone.name}
            icon={{ path: "M0,0", fillOpacity: 0, strokeWeight: 0, scale: 1 }}
            label={{ text: zone.name, fontSize: "11px", fontWeight: "600", color: "#0369a1" }}
            clickable={false}
          />
        ))}

      <RoutePathPolylines
        path={routePath}
        rawPath={rawPath}
        showRawGhost={isSnapped && rawPath.length > 1}
        color="#10b981"
      />

      {selectedVehicle?.latitude != null && selectedVehicle?.longitude != null && (
        <Circle
          center={{
            lat: selectedVehicle.latitude ?? selectedVehicle.current_latitude,
            lng: selectedVehicle.longitude ?? selectedVehicle.current_longitude,
          }}
          radius={45}
          options={{
            strokeColor: "#0d9488",
            strokeOpacity: 0.55,
            strokeWeight: 2,
            fillColor: "#0d9488",
            fillOpacity: 0.1,
            clickable: false,
            zIndex: 0,
          }}
        />
      )}

      {activeVehicles.map((vehicle) => {
        const displayStatus = resolveVehicleStatus(vehicle, { live: true });
        const isSelected = selectedVehicle?.id === vehicle.id;
        const name = vehicle.vehicle_name || vehicle.name || "Vehicle";

        return (
          <AnimatedVehicleMarker
            key={vehicle.id}
            position={{ lat: vehicle.latitude, lng: vehicle.longitude }}
            title={`${name} · ${displayStatus}`}
            icon={getVehicleMapMarkerIcon(vehicle, { selected: isSelected })}
            zIndex={isSelected ? 1000 : displayStatus === "moving" ? 100 : 1}
            onClick={() => handleMarkerClick(vehicle)}
          />
        );
      })}
    </GoogleMap>
  );
}
