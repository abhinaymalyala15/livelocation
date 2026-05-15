import StatusBadge from "./StatusBadge";
import { MapPin, Navigation, Clock, Gauge, User, Target, ShieldCheck } from "lucide-react";
import moment from "moment";

export default function VehiclePopup({ vehicle, nearestZone }) {
  const lastUpdate = vehicle.last_location_update
    ? moment(vehicle.last_location_update).fromNow()
    : "N/A";

  const isStale = vehicle.last_location_update &&
    moment().diff(moment(vehicle.last_location_update), "minutes") > 2;

  const effectiveStatus = isStale ? "offline" : vehicle.status;

  return (
    <div className="p-4 min-w-[260px] font-inter">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-sm text-foreground">{vehicle.vehicle_name}</h3>
        <StatusBadge status={effectiveStatus} />
      </div>
      
      <div className="space-y-2 text-xs text-muted-foreground">
        {vehicle.driver_name && (
          <div className="flex items-center gap-2">
            <User className="h-3.5 w-3.5 text-primary" />
            <span>{vehicle.driver_name}</span>
          </div>
        )}
        {vehicle.current_destination && (
          <div className="flex items-center gap-2">
            <Target className="h-3.5 w-3.5 text-primary" />
            <span className="truncate">{vehicle.current_destination}</span>
          </div>
        )}
        <div className="flex items-center gap-2">
          <Gauge className="h-3.5 w-3.5 text-primary" />
          <span>{(vehicle.current_speed || 0).toFixed(1)} km/h</span>
        </div>
        <div className="flex items-center gap-2">
          <MapPin className="h-3.5 w-3.5 text-primary" />
          <span>{(vehicle.current_latitude || 0).toFixed(5)}, {(vehicle.current_longitude || 0).toFixed(5)}</span>
        </div>
        <div className="flex items-center gap-2">
          <Navigation className="h-3.5 w-3.5 text-primary" />
          <span>Heading: {(vehicle.heading || 0).toFixed(0)}°</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="h-3.5 w-3.5 text-primary" />
          <span>{lastUpdate}</span>
        </div>
        {nearestZone && (
          <div className={`flex items-center gap-2 mt-1 rounded px-2 py-1 ${nearestZone.inside ? "bg-emerald-500/10 text-emerald-700" : "bg-muted/60"}`}>
            <ShieldCheck className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="font-medium">
              {nearestZone.inside
                ? `Inside: ${nearestZone.name}`
                : `${nearestZone.dist}m from ${nearestZone.name}`}
            </span>
          </div>
        )}
      </div>

      <div className="mt-3 pt-3 border-t border-border">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
          ID: {vehicle.vehicle_unique_id}
        </p>
      </div>
    </div>
  );
}