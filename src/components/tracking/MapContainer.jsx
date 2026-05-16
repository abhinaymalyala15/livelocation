import { useRef, useMemo, useEffect, useCallback } from "react";
import { GoogleMap, Marker, Polyline, Circle } from "@react-google-maps/api";
import moment from "moment";
import { useGoogleMaps } from "@/components/GoogleMapsProvider";
import { defaultMapCenter, defaultMapOptions, mapContainerStyle } from "@/lib/mapConfig";
import { normalizeVehicles } from "@/lib/normalizeVehicle";
import MapsUnavailable from "./MapsUnavailable";
import Loader from "./Loader";
import AnimatedVehicleMarker from "./AnimatedVehicleMarker";
import { resolveVehicleStatus, statusColors } from "@/lib/vehicleStatus";

function getVehicleMarkerIcon(vehicle, isSelected) {
  const status = resolveVehicleStatus(vehicle);
  const color = statusColors[status]?.marker || statusColors.offline.marker;
  const scale = isSelected ? 1.45 : 1.2;

  return {
    path: "M12.5,0C7,0 2.86,4.19 2.86,9.42C2.86,15.8 12.5,27.5 12.5,27.5C12.5,27.5 22.14,15.8 22.14,9.42C22.14,4.19 18,0 12.5,0ZM12.5,11.7C10.3,11.7 8.5,9.9 8.5,7.7C8.5,5.5 10.3,3.7 12.5,3.7C14.7,3.7 16.5,5.5 16.5,7.7C16.5,9.9 14.7,11.7 12.5,11.7Z",
    fillColor: color,
    fillOpacity: 1,
    strokeColor: isSelected ? "#0d9488" : "white",
    strokeWeight: isSelected ? 3 : 2,
    scale,
    anchor: { x: 12, y: 24 },
  };
}

export default function MapView({
  vehicles: rawVehicles,
  selectedVehicle,
  onSelectVehicle,
  tripPath = [],
  geofences = [],
  geofenceAlerts = [],
}) {
  const mapRef = useRef(null);
  const panRafRef = useRef(null);
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

  const polylinePath = useMemo(
    () =>
      tripPath.map((point) => ({
        lat: typeof point[0] === "number" ? point[0] : point.lat,
        lng: typeof point[1] === "number" ? point[1] : point.lng,
      })),
    [tripPath]
  );

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

  useEffect(() => {
    if (!selectedVehicle) return;
    const lat = selectedVehicle.latitude ?? selectedVehicle.current_latitude;
    const lng = selectedVehicle.longitude ?? selectedVehicle.current_longitude;
    if (lat != null && lng != null) smoothPanTo(lat, lng);
  }, [
    selectedVehicle?.id,
    selectedVehicle?.latitude,
    selectedVehicle?.longitude,
    smoothPanTo,
  ]);

  const handleMapLoad = (map) => {
    mapRef.current = map;
  };

  const handleMarkerClick = (vehicle) => {
    onSelectVehicle?.(vehicle);
    if (vehicle.latitude != null && vehicle.longitude != null) {
      smoothPanTo(vehicle.latitude, vehicle.longitude);
      mapRef.current?.setZoom(15);
    }
  };

  if (!isConfigured) return <MapsUnavailable />;
  if (!isLoaded) return <Loader text="Loading map..." className="h-full" />;

  return (
    <GoogleMap
      mapContainerStyle={mapContainerStyle}
      center={centerPos}
      zoom={defaultMapOptions.zoom}
      onLoad={handleMapLoad}
      options={{
        ...defaultMapOptions,
        gestureHandling: "greedy",
      }}
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
            label={{ text: zone.name, fontSize: "12px", fontWeight: "bold", color: "#0ea5e9" }}
            clickable={false}
          />
        ))}

      {polylinePath.length > 1 && (
        <>
          <Polyline
            path={polylinePath}
            options={{
              strokeColor: "#10b981",
              strokeOpacity: 0.25,
              strokeWeight: 6,
              geodesic: true,
            }}
          />
          <Polyline
            path={polylinePath}
            options={{
              strokeColor: "#10b981",
              strokeOpacity: 0.9,
              strokeWeight: 3,
              geodesic: true,
            }}
          />
        </>
      )}

      {activeVehicles.map((vehicle) => {
        const displayStatus = resolveVehicleStatus(vehicle);
        const isSelected = selectedVehicle?.id === vehicle.id;
        const name = vehicle.vehicle_name || vehicle.name || "Vehicle";

        return (
          <AnimatedVehicleMarker
            key={vehicle.id}
            position={{ lat: vehicle.latitude, lng: vehicle.longitude }}
            title={`${name} · ${displayStatus}`}
            icon={getVehicleMarkerIcon(vehicle, isSelected)}
            zIndex={isSelected ? 1000 : displayStatus === "moving" ? 100 : 1}
            onClick={() => handleMarkerClick(vehicle)}
          />
        );
      })}
    </GoogleMap>
  );
}
