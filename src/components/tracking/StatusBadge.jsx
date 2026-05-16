import { cn } from "@/lib/utils";
import { resolveVehicleStatus } from "@/lib/vehicleStatus";

const statusConfig = {
  moving: {
    label: "Moving",
    dotClass: "bg-emerald-500",
    bgClass: "bg-emerald-500/10 text-emerald-700 border-emerald-500/25",
    pulse: true,
  },
  idle: {
    label: "Idle",
    dotClass: "bg-yellow-500",
    bgClass: "bg-yellow-500/10 text-yellow-800 border-yellow-500/25",
    pulse: false,
  },
  offline: {
    label: "Offline",
    dotClass: "bg-red-500",
    bgClass: "bg-red-500/10 text-red-700 border-red-500/25",
    pulse: false,
  },
  maintenance: {
    label: "Maintenance",
    dotClass: "bg-orange-500",
    bgClass: "bg-orange-500/10 text-orange-700 border-orange-500/25",
    pulse: false,
  },
  // Legacy aliases
  on_trip: null,
  available: null,
};

export function getStatusConfig(statusOrVehicle) {
  const status =
    typeof statusOrVehicle === "object"
      ? resolveVehicleStatus(statusOrVehicle)
      : statusConfig[statusOrVehicle]
        ? statusOrVehicle
        : resolveVehicleStatus({ status: statusOrVehicle });
  return statusConfig[status] || statusConfig.offline;
}

export default function StatusBadge({ status, vehicle, size = "sm" }) {
  const resolved =
    vehicle != null ? resolveVehicleStatus(vehicle) : statusConfig[status] ? status : resolveVehicleStatus({ status });
  const config = statusConfig[resolved] || statusConfig.offline;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-medium",
        config.bgClass,
        size === "sm" ? "px-2.5 py-0.5 text-xs" : "px-3 py-1 text-sm"
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          config.dotClass,
          config.pulse && "animate-pulse shadow-[0_0_6px_currentColor]"
        )}
      />
      {config.label}
    </span>
  );
}
