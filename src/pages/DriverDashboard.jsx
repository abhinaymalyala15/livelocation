import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import useLiveTracking from "@/hooks/useLiveTracking";
import useDriverDayDistance from "@/hooks/useDriverDayDistance";
import useSocketTracking from "@/hooks/useSocketTracking";
import useTrackingConnectivity from "@/hooks/useTrackingConnectivity";
import { formatLastUpdated } from "@/hooks/useLiveClock";
import useLiveClock from "@/hooks/useLiveClock";
import Loader from "@/components/tracking/Loader";
import DriverShell from "@/components/driver/DriverShell";
import DriverGpsStrip from "@/components/driver/DriverGpsStrip";
import LiveDistanceHero from "@/components/driver/LiveDistanceHero";
import DriverLiveMap from "@/components/driver/DriverLiveMap";
import DriverSimpleControls from "@/components/driver/DriverSimpleControls";
import TrackingStatusBanner from "@/components/driver/TrackingStatusBanner";
import DriverOnboarding from "@/components/driver/DriverOnboarding";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { getTrackingSocket } from "@/services/socketService";

export default function DriverDashboard() {
  const navigate = useNavigate();
  const { user, logout, checkAppState } = useAuth();
  const queryClient = useQueryClient();
  const [selectedVehicleId, setSelectedVehicleId] = useState("");
  const [tripStatus, setTripStatus] = useState("idle");
  const [activeTripId, setActiveTripId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sosOpen, setSosOpen] = useState(false);
  const tripStartRef = useRef(null);
  const now = useLiveClock(1000);

  const { connected: socketConnected, reconnecting: socketReconnecting } = useSocketTracking({
    role: "driver",
    vehicleId: selectedVehicleId,
    driverId: user?.email,
    enabled: !!user?.email,
  });

  const trackingEnabled = tripStatus === "active" && !!selectedVehicleId;

  const {
    position,
    tripPath,
    tripDistanceKm,
    error: geoError,
    permissionDenied,
    lastSentAt,
    lastFixAt,
    syncTripDistance,
    retryGps,
  } = useLiveTracking({
    enabled: trackingEnabled,
    driverId: user?.email,
    vehicleId: selectedVehicleId,
    tripId: activeTripId,
  });

  const tripActive = tripStatus === "active";
  const { todayTotalKm } = useDriverDayDistance(user?.email, tripDistanceKm, tripActive);

  const connectivity = useTrackingConnectivity({
    trackingEnabled,
    gpsError: geoError,
    permissionDenied,
    lastFixAt,
    hasPosition: !!position,
    socketConnected,
    socketReconnecting,
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
      });
      setActiveTripId(trip.id);
      setTripStatus("active");
      tripStartRef.current = Date.now();
      toast.success("Trip started");
      queryClient.invalidateQueries({ queryKey: ["driver-vehicles"] });
    } finally {
      setLoading(false);
    }
  };

  const handleEndTrip = async () => {
    setLoading(true);
    try {
      if (activeTripId) {
        await syncTripDistance(tripDistanceKm);
        await base44.entities.Trip.update(activeTripId, {
          end_time: new Date().toISOString(),
          status: "completed",
          end_latitude: position?.latitude,
          end_longitude: position?.longitude,
          distance_km: Number(tripDistanceKm.toFixed(3)),
        });
      }
      await base44.entities.Vehicle.update(selectedVehicleId, {
        status: "available",
        current_trip_id: "",
        current_speed: 0,
      });
      setTripStatus("idle");
      setActiveTripId(null);
      tripStartRef.current = null;
      toast.success("Trip completed");
      queryClient.invalidateQueries({ queryKey: ["driver-vehicles"] });
      queryClient.invalidateQueries({ queryKey: ["driver-trips-day"] });
    } finally {
      setLoading(false);
    }
  };

  const sendSOS = useCallback(() => {
    getTrackingSocket()?.emit("emergencyAlert", {
      driverId: user.email,
      vehicleId: selectedVehicleId,
      tripId: activeTripId,
      latitude: position?.latitude,
      longitude: position?.longitude,
      timestamp: new Date().toISOString(),
    });
    toast.error("Emergency alert sent");
    setSosOpen(false);
  }, [user?.email, selectedVehicleId, activeTripId, position]);

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  if (!user) return <Loader text="Loading..." />;

  if (!loadingVehicles && vehicles.length === 0) {
    return (
      <DriverShell user={user} onLogout={handleLogout} minimal>
        <main className="flex-1 p-4 sm:p-6 flex items-center justify-center overflow-y-auto safe-bottom">
          <DriverOnboarding
            user={user}
            onComplete={async () => {
              await checkAppState();
              queryClient.invalidateQueries({ queryKey: ["driver-vehicles"] });
            }}
          />
        </main>
      </DriverShell>
    );
  }

  const lastFixLabel = lastFixAt
    ? formatLastUpdated(lastFixAt, now)
    : trackingEnabled
      ? "Acquiring…"
      : "—";

  return (
    <DriverShell user={user} onLogout={handleLogout} minimal>
      <div className="grid w-full max-w-[100vw] overflow-hidden h-[100dvh] max-h-[100dvh] grid-rows-[auto_auto_minmax(0,1fr)_auto]">
        <DriverGpsStrip
          tripActive={tripActive}
          gpsOk={connectivity.gpsOk}
          online={connectivity.online}
          socketConnected={socketConnected}
          reconnecting={socketReconnecting}
          lastFixLabel={lastFixLabel}
        />

        <div className="px-3 pt-2 shrink-0 space-y-2">
          <TrackingStatusBanner
            status={connectivity.status}
            message={connectivity.message}
            isOffline={connectivity.isOffline}
            onRetry={connectivity.canRetry ? retryGps : undefined}
          />
          {(permissionDenied || geoError) && (
            <p className="text-xs text-destructive px-1">
              {permissionDenied ? "Enable location in browser settings." : geoError}
            </p>
          )}
        </div>

        <div className="flex-1 relative min-h-0 mx-0">
          <DriverLiveMap
            position={position}
            tripPath={tripPath}
            tracking={trackingEnabled}
            className="absolute inset-0"
          />
          <div className="absolute bottom-2 left-2 right-2 sm:bottom-3 sm:left-3 sm:right-3 z-10 pointer-events-none">
            <div className="pointer-events-auto w-full max-w-md mx-auto">
              <LiveDistanceHero
                todayDistanceKm={todayTotalKm}
                tripDistanceKm={tripDistanceKm}
                speed={position?.speed}
                lastFixAt={lastFixAt || lastSentAt}
                tracking={trackingEnabled}
                tripActive={tripActive}
              />
            </div>
          </div>
        </div>

        <DriverSimpleControls
          tripStatus={tripStatus}
          vehicles={vehicles}
          selectedVehicleId={selectedVehicleId}
          onVehicleChange={setSelectedVehicleId}
          canStart={!!selectedVehicleId}
          loading={loading || loadingVehicles}
          onStart={handleStartTrip}
          onEnd={handleEndTrip}
          onSOS={() => setSosOpen(true)}
          vehicleLocked={tripActive}
        />
      </div>

      <AlertDialog open={sosOpen} onOpenChange={setSosOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Send emergency alert?</AlertDialogTitle>
            <AlertDialogDescription>
              Dispatch will be notified with your live location immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={sendSOS}
            >
              Send SOS
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DriverShell>
  );
}
