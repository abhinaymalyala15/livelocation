import { useRef, useMemo, useState } from "react";
import { GoogleMap, Marker, Polyline, Circle } from "@react-google-maps/api";
import moment from "moment";
import { useGoogleMaps } from "@/components/GoogleMapsProvider";
import { defaultMapCenter, defaultMapOptions, mapContainerStyle } from "@/lib/mapConfig";
import MapsUnavailable from "./MapsUnavailable";
import Loader from "./Loader";

function getVehicleMarkerIcon(status) {
  const colors = {
    on_trip: "#10b981",
    available: "#0ea5e9",
    offline: "#94a3b8",
    maintenance: "#f59e0b",
  };
  const color = colors[status] || colors.offline;

  return {
    path: "M12.5,0C7,0 2.86,4.19 2.86,9.42C2.86,15.8 12.5,27.5 12.5,27.5C12.5,27.5 22.14,15.8 22.14,9.42C22.14,4.19 18,0 12.5,0ZM12.5,11.7C10.3,11.7 8.5,9.9 8.5,7.7C8.5,5.5 10.3,3.7 12.5,3.7C14.7,3.7 16.5,5.5 16.5,7.7C16.5,9.9 14.7,11.7 12.5,11.7Z",
    fillColor: color,
    fillOpacity: 1,
    strokeColor: "white",
    strokeWeight: 2,
    scale: 1.2,
    anchor: { x: 12, y: 24 },
  };
}

export default function MapView({
  vehicles,
  selectedVehicle,
  onSelectVehicle,
  tripPath = [],
  geofences = [],
  geofenceAlerts = [],
}) {
  const mapRef = useRef(null);
  const { isLoaded, isConfigured } = useGoogleMaps();

  const centerPos = useMemo(() => {
    if (selectedVehicle?.latitude && selectedVehicle?.longitude) {
      return { lat: selectedVehicle.latitude, lng: selectedVehicle.longitude };
    }
    return defaultMapCenter;
  }, [selectedVehicle?.id, selectedVehicle?.latitude, selectedVehicle?.longitude]);

  const polylinePath = useMemo(
    () =>
      tripPath.map((point) => ({
        lat: typeof point[0] === "number" ? point[0] : point.lat,
        lng: typeof point[1] === "number" ? point[1] : point.lng,
      })),
    [tripPath]
  );

  const activeVehicles = vehicles.filter((v) => v.latitude && v.longitude);

  const handleMapLoad = (map) => {
    mapRef.current = map;
  };

  const handleMarkerClick = (vehicle) => {
    onSelectVehicle?.(vehicle);
    if (mapRef.current) {
      mapRef.current.panTo({ lat: vehicle.latitude, lng: vehicle.longitude });
      mapRef.current.setZoom(15);
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
      options={defaultMapOptions}
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
        <Polyline
          path={polylinePath}
          options={{
            strokeColor: "#10b981",
            strokeOpacity: 0.8,
            strokeWeight: 3,
            geodesic: true,
          }}
        />
      )}

      {activeVehicles.map((vehicle) => {
        const isStale =
          vehicle.updated_date && moment().diff(moment(vehicle.updated_date), "minutes") > 2;
        const effectiveStatus = isStale ? "offline" : vehicle.status;

        return (
          <Marker
            key={vehicle.id}
            position={{ lat: vehicle.latitude, lng: vehicle.longitude }}
            title={vehicle.name}
            icon={getVehicleMarkerIcon(effectiveStatus)}
            onClick={() => handleMarkerClick(vehicle)}
            options={{ optimized: false }}
          />
        );
      })}
    </GoogleMap>
  );
}
