import StatusBadge from "./StatusBadge";
import { Truck, Gauge, Route } from "lucide-react";
import { cn } from "@/lib/utils";
import { resolveVehicleStatus, statusColors } from "@/lib/vehicleStatus";
import { LastUpdatedText } from "./LiveIndicator";

export default function VehicleListItem({ vehicle, isSelected, isAlerted, onClick }) {
  const displayStatus = resolveVehicleStatus(vehicle, { live: true });
  const colors = statusColors[displayStatus] || statusColors.offline;
  const plate = vehicle.vehicle_unique_id || vehicle.plate;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full text-left p-3 rounded-xl border transition-all duration-200 hover:shadow-md",
        isAlerted
          ? "bg-red-500/5 border-red-500/40 shadow-sm"
          : isSelected
          ? "bg-primary/5 border-primary/30 shadow-sm ring-1 ring-primary/20"
          : "bg-card border-border hover:border-primary/20"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={cn(
              "flex-shrink-0 h-9 w-9 rounded-lg flex items-center justify-center border",
              colors.bg,
              colors.border
            )}
          >
            <Truck className={cn("h-4 w-4", colors.text)} />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-sm text-foreground truncate">
              {vehicle.vehicle_name || vehicle.name || "Vehicle"}
            </p>
            <p className="text-[11px] text-muted-foreground truncate font-mono">{plate}</p>
            <p className="text-xs text-muted-foreground truncate">{vehicle.driver_name || "Unassigned"}</p>
          </div>
        </div>
        <StatusBadge vehicle={vehicle} />
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2.5 pl-11">
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Gauge className="h-3 w-3" />
          <span>{(vehicle.current_speed ?? vehicle.speed ?? 0).toFixed(0)} km/h</span>
        </div>
        {vehicle.lifetime_distance_km != null && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Route className="h-3 w-3" />
            {Number(vehicle.lifetime_distance_km).toLocaleString()} km total
          </span>
        )}
      </div>

      <div className="mt-1.5 pl-11">
        <LastUpdatedText timestamp={vehicle.last_location_update || vehicle.updated_date} prefix="Updated" />
      </div>

      {vehicle.current_destination && (
        <div className="mt-1 pl-11">
          <p className="text-xs text-primary font-medium truncate">→ {vehicle.current_destination}</p>
        </div>
      )}
    </button>
  );
}
