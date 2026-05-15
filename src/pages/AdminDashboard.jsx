import { useState, useEffect, useRef, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import StatsCards from "../components/tracking/StatsCards";
import VehicleList from "../components/tracking/VehicleList";
import MapView from "../components/tracking/MapContainer";
import Loader from "../components/tracking/Loader";
import { toast } from "sonner";
import moment from "moment";

// Haversine formula — returns distance in meters between two lat/lng points
function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = d => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function AdminDashboard() {
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [tripPath, setTripPath] = useState([]);
  const [geofenceAlerts, setGeofenceAlerts] = useState([]);
  const geofenceStateRef = useRef({}); // tracks inside/outside per vehicle+zone to avoid repeat alerts
  const queryClient = useQueryClient();

  const { data: vehicles = [], isLoading, dataUpdatedAt } = useQuery({
    queryKey: ["admin-vehicles"],
    queryFn: () => base44.entities.Vehicle.list("-updated_date"),
    refetchInterval: 10000,
  });

  const { data: todayTrips = [] } = useQuery({
    queryKey: ["today-trips"],
    queryFn: async () => {
      const all = await base44.entities.Trip.list("-created_date", 100);
      const today = moment().startOf("day");
      return all.filter(t => moment(t.start_time).isAfter(today));
    },
    refetchInterval: 15000,
  });

  const { data: geofences = [] } = useQuery({
    queryKey: ["geofences"],
    queryFn: () => base44.entities.Geofence.list(),
    refetchInterval: 30000,
  });

  // Fetch trip path (LocationLog) for selected vehicle's active trip
  useEffect(() => {
    if (!selectedVehicle?.current_trip_id || selectedVehicle?.status !== "on_trip") {
      setTripPath([]);
      return;
    }
    base44.entities.LocationLog
      .filter({ trip_id: selectedVehicle.current_trip_id }, "created_date", 500)
      .then(logs => {
        const path = logs
          .filter(l => l.latitude && l.longitude)
          .map(l => [l.latitude, l.longitude]);
        setTripPath(path);
      });
  }, [selectedVehicle?.id, selectedVehicle?.current_trip_id, selectedVehicle?.status]);

  // Real-time subscription for vehicle updates
  useEffect(() => {
    const unsubscribe = base44.entities.Vehicle.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ["admin-vehicles"] });
    });
    return unsubscribe;
  }, [queryClient]);

  // Geofence checking — runs whenever vehicles or geofences update
  useEffect(() => {
    if (!geofences.length || !vehicles.length) return;
    const activeGeofences = geofences.filter(g => g.is_active);

    const newAlerts = [];

    vehicles.forEach(vehicle => {
      if (!vehicle.current_latitude || !vehicle.current_longitude) return;

      activeGeofences.forEach(zone => {
        const key = `${vehicle.id}_${zone.id}`;
        const dist = haversineDistance(
          vehicle.current_latitude,
          vehicle.current_longitude,
          zone.center_latitude,
          zone.center_longitude
        );
        const isInside = dist <= zone.radius_meters;
        const wasInside = geofenceStateRef.current[key];

        // First time seeing this pair — just record state, no alert
        if (wasInside === undefined) {
          geofenceStateRef.current[key] = isInside;
          return;
        }

        // Exited zone
        if (wasInside && !isInside && zone.alert_on_exit) {
          const msg = `⚠️ ${vehicle.vehicle_name} exited zone: ${zone.name}`;
          toast.error(msg, { duration: 8000 });
          newAlerts.push({ zoneId: zone.id, vehicleId: vehicle.id, type: "exit" });
        }

        // Entered zone
        if (!wasInside && isInside && zone.alert_on_enter) {
          const msg = `✅ ${vehicle.vehicle_name} arrived at zone: ${zone.name}`;
          toast.success(msg, { duration: 8000 });
          newAlerts.push({ zoneId: zone.id, vehicleId: vehicle.id, type: "enter" });
        }

        geofenceStateRef.current[key] = isInside;
      });
    });

    if (newAlerts.length > 0) {
      setGeofenceAlerts(prev => {
        const merged = [...prev, ...newAlerts];
        // Keep only alerts from the last 60s to avoid stale highlights
        return merged.slice(-20);
      });
    }
  }, [vehicles, geofences]);

  // Update trip path when selectedVehicle data refreshes (new location logs)
  const handleSelectVehicle = useCallback((vehicle) => {
    setSelectedVehicle(vehicle);
  }, []);

  // Keep selectedVehicle in sync with live vehicle data
  useEffect(() => {
    if (!selectedVehicle) return;
    const updated = vehicles.find(v => v.id === selectedVehicle.id);
    if (updated) setSelectedVehicle(updated);
  }, [vehicles]);

  if (isLoading) return <Loader text="Loading fleet data..." className="h-full" />;

  // Highlighted vehicles that triggered geofence alerts
  const alertedVehicleIds = new Set(geofenceAlerts.map(a => a.vehicleId));

  return (
    <div className="h-full flex flex-col lg:flex-row">
      <div className="w-full lg:w-80 xl:w-96 border-b lg:border-b-0 lg:border-r border-border bg-card overflow-auto max-h-[40vh] lg:max-h-none">
        <VehicleList
          vehicles={vehicles}
          selectedVehicleId={selectedVehicle?.id}
          onSelectVehicle={handleSelectVehicle}
          alertedVehicleIds={alertedVehicleIds}
        />
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="p-4">
          <StatsCards vehicles={vehicles} tripsToday={todayTrips.length} />
        </div>

        <div className="flex-1 px-4 pb-4 relative">
          <div className="h-full rounded-xl overflow-hidden border border-border shadow-md surface-card">
            <MapView
              vehicles={vehicles}
              selectedVehicle={selectedVehicle}
              onSelectVehicle={handleSelectVehicle}
              tripPath={tripPath}
              geofences={geofences}
              geofenceAlerts={geofenceAlerts}
            />
          </div>
          {/* Live feed indicator */}
          <div className="absolute top-3 right-7 z-[500] flex items-center gap-2 bg-card/90 backdrop-blur-sm border border-border rounded-full px-3 py-1.5 shadow-sm text-xs">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-muted-foreground font-medium">
              Live · updated {dataUpdatedAt ? moment(dataUpdatedAt).fromNow() : "—"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}