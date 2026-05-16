import { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import useLiveTracking from "@/hooks/useLiveTracking";
import useSocketTracking from "@/hooks/useSocketTracking";
import useLiveClock from "@/hooks/useLiveClock";
import Loader from "@/components/tracking/Loader";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import DriverShell from "@/components/driver/DriverShell";
import DriverHeader from "@/components/driver/DriverHeader";
import DriverInfoCard from "@/components/driver/DriverInfoCard";
import DriverLiveMap from "@/components/driver/DriverLiveMap";
import TripControls from "@/components/driver/TripControls";
import TripStats from "@/components/driver/TripStats";
import DeviceStatus from "@/components/driver/DeviceStatus";
import EventTimeline from "@/components/driver/EventTimeline";
import SOSPanel from "@/components/driver/SOSPanel";
import DriverStorageStatus from "@/components/driver/DriverStorageStatus";
import DriverOnboarding from "@/components/driver/DriverOnboarding";
import { reloadFleetData } from "@/api/persist";

export default function DriverDashboard() {
  const navigate = useNavigate();
  const { user, logout, checkAppState } = useAuth();
  const queryClient = useQueryClient();
  const [section, setSection] = useState("dashboard");
  const [selectedVehicleId, setSelectedVehicleId] = useState("");
  const [tripStatus, setTripStatus] = useState("idle");
  const [activeTripId, setActiveTripId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [events, setEvents] = useState([]);
  const tripStartRef = useRef(null);

  const socketConnected = useSocketTracking();
  const trackingEnabled = tripStatus === "active" && !!selectedVehicleId;

  const pushEvent = useCallback((message) => {
    setEvents((prev) => [
      { id: `${Date.now()}-${Math.random()}`, message, at: new Date().toISOString() },
      ...prev,
    ]);
  }, []);

  const onTrackingEvent = useCallback(
    (ev) => {
      if (ev.type === "tracking_started") pushEvent("GPS tracking started");
      if (ev.type === "location_sent") pushEvent("Location shared with fleet");
      if (ev.type === "gps_error") pushEvent("GPS error");
    },
    [pushEvent]
  );

  const {
    position,
    tripPath,
    distanceKm,
    error: geoError,
    permissionDenied,
    lastSentAt,
  } = useLiveTracking({
    enabled: trackingEnabled,
    driverId: user?.email,
    vehicleId: selectedVehicleId,
    tripId: activeTripId,
    onEvent: onTrackingEvent,
  });

  const { data: vehicles = [], isLoading: loadingVehicles } = useQuery({
    queryKey: ["driver-vehicles", user?.email],
    queryFn: () => base44.entities.Vehicle.filter({ driver_email: user.email }),
    enabled: !!user?.email,
  });

  useEffect(() => {
    if (!selectedVehicleId && vehicles.length > 0) {
      setSelectedVehicleId(vehicles[0].id);
    }
  }, [vehicles, selectedVehicleId]);

  useEffect(() => {
    if (!selectedVehicleId || !vehicles.length) return;
    const vehicle = vehicles.find((v) => v.id === selectedVehicleId);
    if (vehicle?.status === "on_trip" && vehicle?.current_trip_id) {
      setActiveTripId(vehicle.current_trip_id);
      setTripStatus("active");
      tripStartRef.current = Date.now();
    }
  }, [selectedVehicleId, vehicles]);

  useLiveClock(5000);

  useEffect(() => {
    if (section === "sos") {
      document.getElementById("sos")?.scrollIntoView({ behavior: "smooth" });
    }
  }, [section]);

  const selectedVehicle = vehicles.find((v) => v.id === selectedVehicleId);

  const durationMin =
    tripStartRef.current && tripStatus !== "idle"
      ? Math.floor((Date.now() - tripStartRef.current) / 60000)
      : 0;

  const handleStartTrip = async () => {
    if (!selectedVehicleId) {
      toast.error("Select a vehicle");
      return;
    }
    setLoading(true);
    try {
      const vehicle = vehicles.find((v) => v.id === selectedVehicleId);
      const trip = await base44.entities.Trip.create({
        vehicle_id: selectedVehicleId,
        vehicle_name: vehicle?.vehicle_name || vehicle?.name,
        driver_email: user.email,
        driver_name: user.display_name || user.name,
        start_time: new Date().toISOString(),
        status: "active",
        start_latitude: position?.latitude,
        start_longitude: position?.longitude,
      });
      await base44.entities.Vehicle.update(selectedVehicleId, {
        status: "on_trip",
        current_trip_id: trip.id,
        current_destination: "",
      });
      setActiveTripId(trip.id);
      setTripStatus("active");
      tripStartRef.current = Date.now();
      pushEvent("Trip started");
      toast.success("Trip started — sharing live location");
      queryClient.invalidateQueries({ queryKey: ["driver-vehicles"] });
    } finally {
      setLoading(false);
    }
  };

  const handlePause = () => {
    setTripStatus("paused");
    pushEvent("Trip paused");
    toast.message("Trip paused");
  };

  const handleResume = () => {
    setTripStatus("active");
    pushEvent("Trip resumed");
    toast.success("Trip resumed");
  };

  const handleEndTrip = async () => {
    setLoading(true);
    try {
      if (activeTripId) {
        await base44.entities.Trip.update(activeTripId, {
          end_time: new Date().toISOString(),
          status: "completed",
          end_latitude: position?.latitude,
          end_longitude: position?.longitude,
        });
      }
      await base44.entities.Vehicle.update(selectedVehicleId, {
        status: "available",
        current_trip_id: "",
        current_destination: "",
        current_speed: 0,
      });
      setTripStatus("idle");
      setActiveTripId(null);
      tripStartRef.current = null;
      pushEvent("Trip ended");
      toast.success("Trip completed");
      queryClient.invalidateQueries({ queryKey: ["driver-vehicles"] });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  if (!user) return <Loader text="Loading..." />;

  const needsSetup = !loadingVehicles && vehicles.length === 0;

  if (needsSetup) {
    return (
      <DriverShell user={user} onLogout={handleLogout}>
        <main className="flex-1 p-6 flex items-center justify-center">
          <DriverOnboarding
            user={user}
            onComplete={async () => {
              await reloadFleetData();
              await checkAppState();
              queryClient.invalidateQueries({ queryKey: ["driver-vehicles"] });
              queryClient.invalidateQueries({ queryKey: ["admin-vehicles"] });
            }}
          />
        </main>
      </DriverShell>
    );
  }

  const gpsOk = trackingEnabled && !!position && !geoError;
  const offline = !socketConnected || (trackingEnabled && !lastSentAt && !position);

  return (
    <DriverShell
      user={user}
      activeSection={section}
      onNav={setSection}
      onLogout={handleLogout}
    >
      <DriverHeader
        tripStatus={tripStatus}
        gpsActive={gpsOk}
        socketConnected={socketConnected && !offline}
        userName={user.display_name || user.name}
      />

      <motion.main
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex-1 p-4 md:p-6 space-y-4 max-w-6xl mx-auto w-full"
      >
        {offline && tripStatus === "active" && (
          <motion.div className="rounded-lg border border-amber-300 bg-amber-50 text-amber-900 px-4 py-2 text-sm">
            Connection or GPS weak — trying to reconnect…
          </motion.div>
        )}

        {(permissionDenied || geoError) && (
          <motion.div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {permissionDenied
              ? "Enable location permission in your browser to track trips."
              : geoError}
          </motion.div>
        )}

        <DriverInfoCard
          user={user}
          vehicle={selectedVehicle}
          tripStatus={tripStatus}
        />

        <motion.div className="grid lg:grid-cols-3 gap-4">
          <motion.div className="lg:col-span-2 space-y-4">
            <DriverLiveMap
              position={position}
              tripPath={tripPath}
              tracking={trackingEnabled}
            />

            <motion.div className="grid sm:grid-cols-2 gap-4">
              <motion.div className="surface-card rounded-xl border border-border p-4 space-y-3">
                <h3 className="text-sm font-medium">Vehicle</h3>
                {loadingVehicles ? (
                  <Loader text="Loading…" />
                ) : vehicles.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No vehicle assigned.</p>
                ) : (
                  <Select
                    value={selectedVehicleId}
                    onValueChange={setSelectedVehicleId}
                    disabled={tripStatus === "active" || tripStatus === "paused"}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select vehicle" />
                    </SelectTrigger>
                    <SelectContent>
                      {vehicles.map((v) => (
                        <SelectItem key={v.id} value={v.id}>
                          {v.vehicle_name || v.name} ({v.vehicle_unique_id || v.plate})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </motion.div>

              <TripControls
                tripStatus={tripStatus}
                canStart={!!selectedVehicleId}
                loading={loading}
                onStart={handleStartTrip}
                onPause={handlePause}
                onResume={handleResume}
                onEnd={handleEndTrip}
                onShare={() => toast.message("Live location is shared while trip is active")}
              />
            </motion.div>
          </motion.div>

          <motion.div className="space-y-4">
            <TripStats
              distanceKm={distanceKm}
              speed={position?.speed}
              durationMin={durationMin}
              points={tripPath.length}
            />
            <DeviceStatus gpsOk={gpsOk} online={socketConnected} battery={null} />
            <DriverStorageStatus
              driverEmail={user?.email}
              tripActive={tripStatus === "active" || tripStatus === "paused"}
            />
            <EventTimeline events={events} />
            <SOSPanel
              position={position}
              driverId={user.email}
              vehicleId={selectedVehicleId}
              tripId={activeTripId}
            />
          </motion.div>
        </motion.div>
      </motion.main>
    </DriverShell>
  );
}
