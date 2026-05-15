import StatusBadge from "./StatusBadge";
import { Truck, Clock, Gauge } from "lucide-react";
import moment from "moment";
import { cn } from "@/lib/utils";

export default function VehicleListItem({ vehicle, isSelected, isAlerted, onClick }) {
  const lastUpdate = vehicle.last_location_update
    ? moment(vehicle.last_location_update).fromNow()
    : "Never";

  const isStale = vehicle.last_location_update &&
    moment().diff(moment(vehicle.last_location_update), "minutes") > 2;

  const effectiveStatus = isStale ? "offline" : vehicle.status;

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left p-3 rounded-xl border transition-all duration-200 hover:shadow-md",
        isAlerted
          ? "bg-red-500/5 border-red-500/40 shadow-sm"
          : isSelected
          ? "bg-primary/5 border-primary/30 shadow-sm"
          : "bg-card border-border hover:border-primary/20"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={cn(
            "flex-shrink-0 h-9 w-9 rounded-lg flex items-center justify-center",
            effectiveStatus === "on_trip" ? "bg-emerald-500/10" : 
            effectiveStatus === "available" ? "bg-sky-500/10" : "bg-slate-500/10"
          )}>
            <Truck className={cn(
              "h-4 w-4",
              effectiveStatus === "on_trip" ? "text-emerald-600" : 
              effectiveStatus === "available" ? "text-sky-600" : "text-slate-400"
            )} />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-sm text-foreground truncate">
              {vehicle.vehicle_name || vehicle.name || "Vehicle"}
            </p>
            <p className="text-xs text-muted-foreground truncate">{vehicle.driver_name || "Unassigned"}</p>
          </div>
        </div>
        <StatusBadge status={effectiveStatus} />
      </div>

      <div className="flex items-center gap-4 mt-2.5 pl-11">
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Gauge className="h-3 w-3" />
          <span>{(vehicle.current_speed || 0).toFixed(0)} km/h</span>
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>{lastUpdate}</span>
        </div>
      </div>

      {vehicle.current_destination && (
        <div className="mt-1.5 pl-11">
          <p className="text-xs text-primary font-medium truncate">→ {vehicle.current_destination}</p>
        </div>
      )}
    </button>
  );
}