import { useState, useEffect, useRef, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import StatsCards from "../components/tracking/StatsCards";
import DashboardHero from "../components/tracking/DashboardHero";
import VehicleList from "../components/tracking/VehicleList";
import MapView from "../components/tracking/MapContainer";
import Loader from "../components/tracking/Loader";
import { LastUpdatedText, LiveBadge } from "../components/tracking/LiveIndicator";
import ConnectionIndicator from "../components/tracking/ConnectionIndicator";
import VehiclePopup from "../components/tracking/VehiclePopup";
import useSocketTracking from "@/hooks/useSocketTracking";
import { computePathDistanceKm, haversineMeters } from "@/lib/geo";
import { toast } from "sonner";
import moment from "moment";

function haversineDistance(lat1, lng1, lat2, lng2) {
  return haversineMeters(lat1, lng1, lat2, lng2);
}

export default function AdminDashboard() {
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [tripPath, setTripPath] = useState([]);
  const [geofenceAlerts, setGeofenceAlerts] = useState([]);
  const geofenceStateRef = useRef({});
  const queryClient = useQueryClient();
  const socketConnected = useSocketTracking();

  const { data: vehicles = [], isLoading, dataUpdatedAt } = useQuery({
    queryKey: ["admin-vehicles"],
    queryFn: () => base44.entities.Vehicle.list("-updated_date"),
    refetchInterval: 5000,
  });

  const { data: todayTrips = [] } = useQuery({
    queryKey: ["today-trips"],
    queryFn: async () => {
      const all = await base44.entities.Trip.list("-created_date", 100);
      const today = moment().startOf("day");
      return all.filter((t) => moment(t.start_time).isAfter(today));
    },
    refetchInterval: 15000,
  });

  const { data: geofences = [] } = useQuery({
    queryKey: ["geofences"],
    queryFn: () => base44.entities.Geofence.list(),
    refetchInterval: 30000,
  });

  useEffect(() => {
    if (!selectedVehicle?.current_trip_id || selectedVehicle?.status !== "on_trip") {
      setTripPath([]);
      return;
    }
    let cancelled = false;
    base44.entities.LocationLog.filter(
      { trip_id: selectedVehicle.current_trip_id },
      "timestamp",
      500
    ).then((logs) => {
      if (cancelled) return;
      const path = [...logs]
        .filter((l) => l.latitude != null && l.longitude != null)
        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
        .map((l) => [l.latitude, l.longitude]);
      setTripPath(path);
    });
    return () => {
      cancelled = true;
    };
  }, [selectedVehicle?.id, selectedVehicle?.current_trip_id, selectedVehicle?.status]);

  useEffect(() => {
    if (!selectedVehicle || selectedVehicle.status !== "on_trip") return;
    const lat = selectedVehicle.latitude ?? selectedVehicle.current_latitude;
    const lng = selectedVehicle.longitude ?? selectedVehicle.current_longitude;
    if (lat == null || lng == null) return;

    setTripPath((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      if (Math.abs(last[0] - lat) < 1e-6 && Math.abs(last[1] - lng) < 1e-6) return prev;
      return [...prev, [lat, lng]];
    });
  }, [
    selectedVehicle?.latitude,
    selectedVehicle?.longitude,
    selectedVehicle?.last_location_update,
  ]);

  useEffect(() => {
    const unsubscribe = base44.entities.Vehicle.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ["admin-vehicles"] });
    });
    return unsubscribe;
  }, [queryClient]);

  useEffect(() => {
    if (!geofences.length || !vehicles.length) return;
    const activeGeofences = geofences.filter((g) => g.is_active);
    const newAlerts = [];

    vehicles.forEach((vehicle) => {
      const lat = vehicle.current_latitude ?? vehicle.latitude;
      const lng = vehicle.current_longitude ?? vehicle.longitude;
      if (!lat || !lng) return;

      activeGeofences.forEach((zone) => {
        const key = `${vehicle.id}_${zone.id}`;
        const dist = haversineDistance(lat, lng, zone.center_latitude, zone.center_longitude);
        const isInside = dist <= zone.radius_meters;
        const wasInside = geofenceStateRef.current[key];

        if (wasInside === undefined) {
          geofenceStateRef.current[key] = isInside;
          return;
        }

        if (wasInside && !isInside && zone.alert_on_exit) {
          toast.error(`⚠️ ${vehicle.vehicle_name || vehicle.name} exited zone: ${zone.name}`, {
            duration: 8000,
          });
          newAlerts.push({ zoneId: zone.id, vehicleId: vehicle.id, type: "exit" });
        }

        if (!wasInside && isInside && zone.alert_on_enter) {
          toast.success(`✅ ${vehicle.vehicle_name || vehicle.name} arrived at zone: ${zone.name}`, {
            duration: 8000,
          });
          newAlerts.push({ zoneId: zone.id, vehicleId: vehicle.id, type: "enter" });
        }

        geofenceStateRef.current[key] = isInside;
      });
    });

    if (newAlerts.length > 0) {
      setGeofenceAlerts((prev) => [...prev, ...newAlerts].slice(-20));
    }
  }, [vehicles, geofences]);

  const handleSelectVehicle = useCallback((vehicle) => {
    setSelectedVehicle(vehicle);
  }, []);

  useEffect(() => {
    if (!selectedVehicle) return;
    const updated = vehicles.find((v) => v.id === selectedVehicle.id);
    if (updated) setSelectedVehicle(updated);
  }, [vehicles, selectedVehicle?.id]);

  if (isLoading) return <Loader text="Loading fleet data..." className="h-full" />;

  const alertedVehicleIds = new Set(geofenceAlerts.map((a) => a.vehicleId));
  const activeCount = vehicles.filter((v) => v.status === "on_trip").length;
  const selectedTripDistanceKm =
    tripPath.length >= 2 ? computePathDistanceKm(tripPath) : null;

  return (
    <div className="h-full flex flex-col lg:flex-row min-h-0">
      {/* Left: fleet list + vehicle details (not on the map) */}
      <aside className="order-2 lg:order-1 w-full lg:w-80 xl:w-96 flex flex-col border-t lg:border-t-0 lg:border-r border-border bg-card shrink-0 shadow-sm min-h-0 max-h-[42vh] lg:max-h-full">
        <div className="flex-1 min-h-0 overflow-hidden">
          <VehicleList
            vehicles={vehicles}
            selectedVehicleId={selectedVehicle?.id}
            onSelectVehicle={handleSelectVehicle}
            alertedVehicleIds={alertedVehicleIds}
          />
        </div>
        {selectedVehicle ? (
          <div className="shrink-0 border-t border-border bg-muted/20 max-h-[38vh] lg:max-h-[45%] overflow-y-auto">
            <p className="px-3 pt-2.5 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Selected vehicle
            </p>
            <VehiclePopup
              vehicle={selectedVehicle}
              tripDistanceKm={selectedTripDistanceKm}
              compact
            />
          </div>
        ) : (
          <div className="shrink-0 border-t border-border px-3 py-3 text-xs text-muted-foreground text-center">
            Select a vehicle to view driver, speed, and trip details
          </div>
        )}
      </aside>

      {/* Right: stats + full map (no overlays) */}
      <div className="order-1 lg:order-2 flex-1 flex flex-col overflow-hidden min-w-0 min-h-[min(52dvh,560px)] lg:min-h-0">
        <div className="p-4 lg:p-5 space-y-4 shrink-0">
          <DashboardHero
            activeCount={activeCount}
            totalCount={vehicles.length}
            lastUpdated={dataUpdatedAt}
          />
          <StatsCards vehicles={vehicles} tripsToday={todayTrips.length} />
        </div>

        <div className="flex flex-wrap items-center gap-2 px-4 lg:px-5 pb-2 shrink-0">
          <ConnectionIndicator connected={socketConnected} />
          <span className="text-[11px] text-muted-foreground">
            {socketConnected ? "Realtime sync active" : "Reconnecting..."}
          </span>
          <LastUpdatedText
            timestamp={dataUpdatedAt ? new Date(dataUpdatedAt).toISOString() : null}
            prefix="Fleet"
            className="font-medium"
          />
          {socketConnected && <LiveBadge label="LIVE" />}
        </div>

        <div className="flex-1 px-4 lg:px-5 pb-4 lg:pb-5 min-h-[min(45dvh,480px)]">
          <div className="h-full min-h-[min(45dvh,480px)] rounded-2xl overflow-hidden border border-border shadow-lg surface-card ring-1 ring-black/5 map-container-fill">
            <MapView
              vehicles={vehicles}
              selectedVehicle={selectedVehicle}
              onSelectVehicle={handleSelectVehicle}
              tripPath={tripPath}
              tripDistanceKm={selectedTripDistanceKm}
              geofences={geofences}
              geofenceAlerts={geofenceAlerts}
              socketConnected={socketConnected}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
