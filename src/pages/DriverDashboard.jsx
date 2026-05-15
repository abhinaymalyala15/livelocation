import { useState, useEffect, useCallback, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { MapPin, Play, Square, LogOut, Truck, Target, Navigation, Gauge, Clock, Map } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import useGeolocation from "../hooks/useGeolocation";
import ConnectionIndicator from "../components/tracking/ConnectionIndicator";
import StatusBadge from "../components/tracking/StatusBadge";
import Loader from "../components/tracking/Loader";
import moment from "moment";

export default function DriverDashboard() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [user, setUser] = useState(null);
  const [selectedVehicleId, setSelectedVehicleId] = useState("");
  const [destination, setDestination] = useState("");
  const [isTracking, setIsTracking] = useState(false);
  const [activeTripId, setActiveTripId] = useState(null);
  const lastUpdateRef = useRef(null);
  const queryClient = useQueryClient();

  const { position, error: geoError, permissionDenied } = useGeolocation(isTracking);

  // Load user
  useEffect(() => {
    base44.auth.me().then(setUser);
  }, []);

  // Get vehicles assigned to driver
  const { data: vehicles = [], isLoading: loadingVehicles } = useQuery({
    queryKey: ["driver-vehicles", user?.email],
    queryFn: () => base44.entities.Vehicle.filter({ driver_email: user.email }),
    enabled: !!user?.email,
  });

  // Check if vehicle already has an active trip
  useEffect(() => {
    if (selectedVehicleId) {
      const vehicle = vehicles.find(v => v.id === selectedVehicleId);
      if (vehicle?.status === "on_trip" && vehicle?.current_trip_id) {
        setActiveTripId(vehicle.current_trip_id);
        setIsTracking(true);
        setDestination(vehicle.current_destination || "");
      }
    }
  }, [selectedVehicleId, vehicles]);

  // Send location updates via interval (every 5 seconds) when tracking
  useEffect(() => {
    if (!isTracking || !selectedVehicleId) return;

    const interval = setInterval(async () => {
      if (!position) return;
      await base44.entities.Vehicle.update(selectedVehicleId, {
        current_latitude: position.latitude,
        current_longitude: position.longitude,
        current_speed: position.speed || 0,
        heading: position.heading || 0,
        accuracy: position.accuracy || 0,
        last_location_update: new Date().toISOString(),
        status: "on_trip",
      });

      if (activeTripId) {
        await base44.entities.LocationLog.create({
          vehicle_id: selectedVehicleId,
          trip_id: activeTripId,
          latitude: position.latitude,
          longitude: position.longitude,
          speed: position.speed || 0,
          heading: position.heading || 0,
          accuracy: position.accuracy || 0,
          timestamp: new Date().toISOString(),
        });
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [isTracking, position, selectedVehicleId, activeTripId]);

  const handleStartTrip = async () => {
    if (!selectedVehicleId) {
      toast.error("Please select a vehicle");
      return;
    }
    if (!destination.trim()) {
      toast.error("Please enter a destination");
      return;
    }

    const vehicle = vehicles.find(v => v.id === selectedVehicleId);
    const trip = await base44.entities.Trip.create({
      vehicle_id: selectedVehicleId,
      vehicle_name: vehicle?.vehicle_name || vehicle?.name,
      driver_email: user.email,
      driver_name: user.name,
      destination: destination.trim(),
      start_time: new Date().toISOString(),
      status: "active",
      start_latitude: position?.latitude,
      start_longitude: position?.longitude,
    });

    await base44.entities.Vehicle.update(selectedVehicleId, {
      status: "on_trip",
      current_trip_id: trip.id,
      current_destination: destination.trim(),
    });

    setActiveTripId(trip.id);
    setIsTracking(true);
    toast.success("Trip started! Sharing your location.");
    queryClient.invalidateQueries({ queryKey: ["driver-vehicles"] });
  };

  const handleStopTrip = async () => {
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

    setIsTracking(false);
    setActiveTripId(null);
    setDestination("");
    toast.success("Trip ended successfully.");
    queryClient.invalidateQueries({ queryKey: ["driver-vehicles"] });
  };

  if (!user) return <Loader text="Loading..." />;

  const selectedVehicle = vehicles.find(v => v.id === selectedVehicleId);

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,hsl(var(--background))_0%,hsl(210_20%_96%)_100%)]">
      <header className="bg-card/95 backdrop-blur-md border-b border-border px-4 py-3 sticky top-0 z-10">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center shadow-sm">
              <Map className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-semibold text-sm">FleetTrack</h1>
              <p className="text-[11px] text-muted-foreground">Driver</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ConnectionIndicator connected={isTracking && !!position} />
            <Button
              variant="ghost"
              size="icon"
              onClick={async () => {
                await logout();
                navigate("/login", { replace: true });
              }}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto p-5 space-y-4 pb-10">
        <Card className="surface-card">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Welcome back</p>
            <p className="font-semibold text-lg mt-0.5">{user.name}</p>
          </CardContent>
        </Card>

        {/* Vehicle Selection */}
        <Card className="surface-card">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Truck className="h-4 w-4 text-primary" />
              Vehicle
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            {loadingVehicles ? (
              <Loader text="Loading vehicles..." />
            ) : vehicles.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No vehicles assigned to you.</p>
            ) : (
              <Select value={selectedVehicleId} onValueChange={setSelectedVehicleId} disabled={isTracking}>
                <SelectTrigger>
                  <SelectValue placeholder="Select your vehicle" />
                </SelectTrigger>
                <SelectContent>
                  {vehicles.map(v => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.vehicle_name || v.name} ({v.vehicle_unique_id || v.plate})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </CardContent>
        </Card>

        {/* Destination */}
        <Card className="surface-card">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              Destination
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <Input
              placeholder="Enter trip destination..."
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              disabled={isTracking}
            />
          </CardContent>
        </Card>

        {/* Trip Controls */}
        <div className="flex gap-3">
          {!isTracking ? (
            <Button
              className="flex-1 h-14 text-base font-semibold rounded-xl gap-2"
              onClick={handleStartTrip}
              disabled={!selectedVehicleId || !destination.trim()}
            >
              <Play className="h-5 w-5" />
              Start Trip
            </Button>
          ) : (
            <Button
              variant="destructive"
              className="flex-1 h-14 text-base font-semibold rounded-xl gap-2"
              onClick={handleStopTrip}
            >
              <Square className="h-5 w-5" />
              Stop Trip
            </Button>
          )}
        </div>

        {/* GPS Status */}
        {permissionDenied && (
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="p-4">
              <p className="text-sm text-destructive font-medium">⚠️ Location permission denied</p>
              <p className="text-xs text-muted-foreground mt-1">Please enable GPS access in your browser settings to track your location.</p>
            </CardContent>
          </Card>
        )}

        {geoError && !permissionDenied && (
          <Card className="border-amber-500/30 bg-amber-500/5">
            <CardContent className="p-4">
              <p className="text-sm text-amber-700 font-medium">⚠️ {geoError}</p>
            </CardContent>
          </Card>
        )}

        {/* Live Position */}
        {isTracking && position && (
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm flex items-center gap-2 text-primary">
                <Navigation className="h-4 w-4 animate-pulse" />
                Live Position
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-card rounded-lg p-3 border">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Latitude</p>
                  <p className="font-mono font-semibold text-sm">{position.latitude.toFixed(6)}</p>
                </div>
                <div className="bg-card rounded-lg p-3 border">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Longitude</p>
                  <p className="font-mono font-semibold text-sm">{position.longitude.toFixed(6)}</p>
                </div>
                <div className="bg-card rounded-lg p-3 border flex items-center gap-2">
                  <Gauge className="h-4 w-4 text-primary" />
                  <div>
                    <p className="text-[10px] text-muted-foreground">Speed</p>
                    <p className="font-semibold text-sm">{(position.speed || 0).toFixed(1)} km/h</p>
                  </div>
                </div>
                <div className="bg-card rounded-lg p-3 border flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  <div>
                    <p className="text-[10px] text-muted-foreground">Updated</p>
                    <p className="font-semibold text-sm">{moment(position.timestamp).format("HH:mm:ss")}</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 justify-center">
                <StatusBadge status="on_trip" size="md" />
                <span className="text-xs text-muted-foreground">→ {destination}</span>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}