import {
  Truck,
  User,
  MapPin,
  Clock,
  Gauge,
  Route,
  Navigation,
  X,
  Calendar,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import StatusBadge from "./StatusBadge";
import { LastUpdatedText } from "./LiveIndicator";
import useTripRoutePath from "@/hooks/useTripRoutePath";
import { getDriverTotalKm, getVehicleLifetimeKm } from "@/lib/fleetMetrics";
import { resolveVehicleStatus } from "@/lib/vehicleStatus";
import moment from "moment";

const tripStatusColors = {
  active: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
  completed: "bg-sky-500/10 text-sky-700 border-sky-500/20",
  cancelled: "bg-red-500/10 text-red-600 border-red-500/20",
};

function getDuration(trip) {
  if (!trip?.start_time) return "—";
  if (trip.status === "active") return "In progress";
  if (!trip.end_time) return "—";
  const diff = moment.duration(moment(trip.end_time).diff(moment(trip.start_time)));
  const h = Math.floor(diff.asHours());
  const m = diff.minutes();
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function DetailRow({ icon: Icon, label, value, sub }) {
  return (
    <div className="flex gap-3 py-2.5 border-b border-border/60 last:border-0">
      <div className="h-9 w-9 rounded-lg bg-muted/60 flex items-center justify-center shrink-0">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
        <p className="text-sm font-medium text-foreground mt-0.5 break-words">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export default function TripDetailPanel({ trip, trips = [], vehicle, onClose, className = "" }) {
  const { pointCount, loading: pathLoading } = useTripRoutePath(trip);

  if (!trip) {
    return (
      <div
        className={`surface-card flex flex-col items-center justify-center p-8 text-center min-h-[280px] ${className}`}
      >
        <Route className="h-10 w-10 text-muted-foreground/30 mb-3" />
        <p className="text-sm font-medium text-muted-foreground">Select a trip</p>
        <p className="text-xs text-muted-foreground mt-1 max-w-[200px]">
          Click any row in the table to view vehicle and trip details here
        </p>
      </div>
    );
  }

  const tripKm = Number(trip.distance_km ?? trip.distance) || 0;
  const driverTotalKm = getDriverTotalKm(trip.driver_email, trips);
  const vehicleLifetime =
    vehicle?.lifetime_distance_km ??
    (vehicle ? getVehicleLifetimeKm(vehicle.id, trips, vehicle.odometer_baseline_km) : null);
  const plate = vehicle?.vehicle_unique_id || vehicle?.plate;

  return (
    <div className={`surface-card flex flex-col overflow-hidden ${className}`}>
      <div className="p-4 border-b border-border bg-muted/30 shrink-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-primary">Trip details</p>
            <h3 className="font-semibold text-base mt-1 leading-tight">{trip.vehicle_name || "Vehicle"}</h3>
            {plate && <p className="text-xs font-mono text-muted-foreground mt-0.5">{plate}</p>}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Badge variant="outline" className={tripStatusColors[trip.status] || ""}>
              {trip.status}
            </Badge>
            {onClose && (
              <Button type="button" variant="ghost" size="icon" className="h-8 w-8 lg:hidden" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
        {trip.status === "active" && (
          <div className="mt-2">
            <StatusBadge status="moving" />
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-1">
        <DetailRow
          icon={User}
          label="Driver"
          value={trip.driver_name || "—"}
          sub={trip.driver_email}
        />
        <DetailRow
          icon={MapPin}
          label="Route"
          value={`${trip.start_location || "Start"} → ${trip.destination || trip.end_location || "End"}`}
        />
        <DetailRow icon={Calendar} label="Started" value={trip.start_time ? moment(trip.start_time).format("ddd, MMM D · HH:mm") : "—"} />
        <DetailRow
          icon={Clock}
          label="Ended"
          value={
            trip.end_time
              ? moment(trip.end_time).format("ddd, MMM D · HH:mm")
              : trip.status === "active"
              ? "Still running"
              : "—"
          }
          sub={`Duration: ${getDuration(trip)}`}
        />
        <DetailRow
          icon={Gauge}
          label="This trip distance"
          value={`${tripKm.toFixed(1)} km`}
          sub={pathLoading ? "Loading GPS logs…" : `${pointCount} GPS points on route`}
        />
        <DetailRow
          icon={Navigation}
          label="Driver total (all trips)"
          value={`${driverTotalKm.toFixed(1)} km`}
          sub="Cumulative distance till now"
        />
        {vehicleLifetime != null && (
          <DetailRow
            icon={Truck}
            label="Vehicle lifetime"
            value={`${Number(vehicleLifetime).toLocaleString()} km`}
            sub={
              vehicle
                ? `Status: ${resolveVehicleStatus(vehicle)} · ${(vehicle.current_speed ?? 0).toFixed(0)} km/h`
                : undefined
            }
          />
        )}
        {vehicle?.current_destination && trip.status === "active" && (
          <DetailRow icon={Route} label="Live destination" value={vehicle.current_destination} />
        )}
      </div>

      <div className="p-3 border-t border-border bg-muted/20 shrink-0">
        <LastUpdatedText timestamp={trip.updated_date || trip.start_time} prefix="Trip data" />
      </div>
    </div>
  );
}
