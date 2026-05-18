import StatusBadge from "./StatusBadge";
import { MapPin, Clock, Gauge, User, Target, ShieldCheck, Route } from "lucide-react";
import { resolveVehicleStatus } from "@/lib/vehicleStatus";
import { formatLastUpdated } from "@/hooks/useLiveClock";
import useLiveClock from "@/hooks/useLiveClock";

export default function VehiclePopup({ vehicle, nearestZone, tripDistanceKm, compact = false }) {
  const now = useLiveClock(1000);
  const lastIso = vehicle.last_location_update || vehicle.updated_date;
  const lastUpdate = lastIso ? formatLastUpdated(lastIso, now) : "Never";
  const displayStatus = resolveVehicleStatus(vehicle, { live: true });
  const speed = vehicle.current_speed ?? vehicle.speed ?? 0;
  const plate = vehicle.vehicle_unique_id || vehicle.plate;

  return (
    <div className={compact ? "p-3 w-full font-inter" : "p-4 w-full max-w-[320px] font-inter"}>
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <h3 className="font-bold text-sm text-foreground">{vehicle.vehicle_name || vehicle.name}</h3>
          {plate && <p className="text-[11px] text-muted-foreground mt-0.5">{plate}</p>}
        </div>
        <StatusBadge status={displayStatus} />
      </div>

      <div className="space-y-2.5 text-xs">
        {vehicle.driver_name && (
          <div className="flex items-center gap-2 text-foreground">
            <User className="h-3.5 w-3.5 text-primary shrink-0" />
            <span className="font-medium">{vehicle.driver_name}</span>
          </div>
        )}
        <div className="flex items-center gap-2">
          <Gauge className="h-3.5 w-3.5 text-primary shrink-0" />
          <span className="font-semibold tabular-nums">{speed.toFixed(1)} km/h</span>
        </div>
        {tripDistanceKm != null && tripDistanceKm > 0 && (
          <div className="flex items-center gap-2 rounded-lg bg-primary/5 border border-primary/15 px-2.5 py-2">
            <Route className="h-4 w-4 text-primary shrink-0" />
            <div>
              <p className="text-[10px] uppercase text-muted-foreground">Trip distance</p>
              <p className="text-base font-bold tabular-nums text-foreground">{tripDistanceKm.toFixed(2)} km</p>
            </div>
          </div>
        )}
        {vehicle.current_destination && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Target className="h-3.5 w-3.5 text-primary shrink-0" />
            <span className="truncate">{vehicle.current_destination}</span>
          </div>
        )}
        <div className="flex items-center gap-2 text-muted-foreground">
          <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
          <span className="tabular-nums">
            {(vehicle.current_latitude ?? vehicle.latitude ?? 0).toFixed(5)},{" "}
            {(vehicle.current_longitude ?? vehicle.longitude ?? 0).toFixed(5)}
          </span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Clock className="h-3.5 w-3.5 text-primary shrink-0" />
          <span>
            Last update · <strong className="text-foreground">{lastUpdate}</strong>
          </span>
        </div>
        {nearestZone && (
          <div
            className={`flex items-center gap-2 rounded px-2 py-1.5 ${
              nearestZone.inside ? "bg-emerald-500/10 text-emerald-700" : "bg-muted/60 text-muted-foreground"
            }`}
          >
            <ShieldCheck className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="font-medium text-[11px]">
              {nearestZone.inside
                ? `Inside: ${nearestZone.name}`
                : `${nearestZone.dist}m from ${nearestZone.name}`}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
