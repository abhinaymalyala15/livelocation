import { useState, useEffect, useRef, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import StatsCards from "../components/tracking/StatsCards";
import MobileAdminStats from "../components/tracking/MobileAdminStats";
import DashboardHero from "../components/tracking/DashboardHero";
import VehicleList from "../components/tracking/VehicleList";
import MapView from "../components/tracking/MapContainer";
import Loader from "../components/tracking/Loader";
import { LastUpdatedText, LiveBadge } from "../components/tracking/LiveIndicator";
import ConnectionIndicator from "../components/tracking/ConnectionIndicator";
import VehiclePopup from "../components/tracking/VehiclePopup";
import useAdminFleetLive from "@/hooks/useAdminFleetLive";
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
  const { connected: socketConnected, lastLiveAt } = useAdminFleetLive();

  const { data: vehicles = [], isLoading } = useQuery({
    queryKey: ["admin-vehicles"],
    queryFn: () => base44.entities.Vehicle.list("-updated_date"),
    staleTime: 60_000,
  });

  const { data: todayTrips = [] } = useQuery({
    queryKey: ["today-trips"],
    queryFn: async () => {
      const all = await base44.entities.Trip.list("-created_date", 100);
      const today = moment().startOf("day");
      return all.filter((t) => moment(t.start_time).isAfter(today));
    },
    staleTime: 120_000,
  });

  const { data: geofences = [] } = useQuery({
    queryKey: ["geofences"],
    queryFn: () => base44.entities.Geofence.list(),
    staleTime: 300_000,
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
    <div className="w-full max-w-[100vw] overflow-x-hidden flex flex-col lg:flex-row lg:h-full lg:min-h-0">
      {/* Map + stats (first on phone) */}
      <section className="flex flex-col min-w-0 lg:flex-1 lg:order-2 lg:min-h-0 lg:overflow-hidden">
        <MobileAdminStats vehicles={vehicles} tripsToday={todayTrips.length} />

        <div className="hidden lg:block shrink-0 p-5 space-y-4">
          <DashboardHero
            activeCount={activeCount}
            totalCount={vehicles.length}
            lastUpdated={lastLiveAt}
          />
          <StatsCards vehicles={vehicles} tripsToday={todayTrips.length} />
        </div>

        <div className="shrink-0 flex flex-wrap items-center gap-2 px-3 py-2 lg:px-5 lg:pb-2 border-b lg:border-b-0 border-border/60">
          <ConnectionIndicator connected={socketConnected} />
          <span className="text-xs text-muted-foreground">
            {socketConnected ? "Live sync" : "Reconnecting…"}
          </span>
          <LastUpdatedText timestamp={lastLiveAt} prefix="Updated" className="text-xs font-medium" />
          {socketConnected && <LiveBadge label="LIVE" />}
        </div>

        <div className="relative w-full h-[50dvh] min-h-[300px] max-h-[65vh] shrink-0 lg:flex-1 lg:min-h-[360px] lg:max-h-none lg:h-auto px-3 py-3 lg:px-5 lg:pb-5">
          <div className="absolute inset-3 lg:inset-0 lg:relative lg:h-full rounded-2xl overflow-hidden border border-border shadow-lg surface-card ring-1 ring-black/5 map-container-fill">
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
      </section>

      {/* Fleet list (below map on phone) */}
      <aside className="w-full lg:w-80 xl:w-96 flex flex-col border-t lg:border-t-0 lg:border-r border-border bg-card lg:order-1 lg:shrink-0 lg:min-h-0 lg:max-h-full min-h-[min(42dvh,480px)] lg:h-full">
        <div className="flex-1 min-h-[200px] lg:min-h-0 overflow-hidden">
          <VehicleList
            vehicles={vehicles}
            selectedVehicleId={selectedVehicle?.id}
            onSelectVehicle={handleSelectVehicle}
            alertedVehicleIds={alertedVehicleIds}
          />
        </div>
        {selectedVehicle ? (
          <div className="shrink-0 border-t border-border bg-muted/20 max-h-[40dvh] lg:max-h-[42%] overflow-y-auto">
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
          <div className="shrink-0 border-t border-border px-3 py-4 text-sm text-muted-foreground text-center">
            Tap a vehicle to see driver & trip details
          </div>
        )}
      </aside>
    </div>
  );
}
