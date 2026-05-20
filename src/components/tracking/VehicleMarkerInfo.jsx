import { User, Truck, Gauge, Route, Clock } from "lucide-react";
import { resolveVehicleStatus } from "@/lib/vehicleStatus";
import { formatLastUpdated } from "@/hooks/useLiveClock";
import useLiveClock from "@/hooks/useLiveClock";
import StatusBadge from "./StatusBadge";

const ROWS = [
  { key: "driver", label: "Driver", icon: User },
  { key: "vehicle", label: "Vehicle", icon: Truck },
  { key: "speed", label: "Speed", icon: Gauge },
  { key: "distance", label: "Distance", icon: Route },
  { key: "lastUpdate", label: "Last update", icon: Clock },
];

export default function VehicleMarkerInfo({ vehicle, tripDistanceKm }) {
  const now = useLiveClock(1000);
  const lastIso = vehicle?.last_location_update || vehicle?.updated_date;
  const speed = vehicle?.current_speed ?? vehicle?.speed ?? 0;
  const plate = vehicle?.vehicle_unique_id || vehicle?.plate || "—";
  const driver = vehicle?.driver_name || vehicle?.driver_email || "—";
  const distance =
    tripDistanceKm != null && tripDistanceKm > 0
      ? `${tripDistanceKm.toFixed(1)} km`
      : vehicle?.status === "on_trip"
        ? "0.0 km"
        : "—";
  const lastUpdate = lastIso ? formatLastUpdated(lastIso, now) : "Never";
  const displayStatus = resolveVehicleStatus(vehicle, { live: true });

  const values = {
    driver,
    vehicle: plate,
    speed: `${speed.toFixed(0)} km/h`,
    distance,
    lastUpdate,
  };

  return (
    <div className="min-w-[220px] max-w-[280px] p-1 font-inter">
      <div className="flex items-center justify-between gap-2 mb-3 pb-2 border-b border-border">
        <p className="font-semibold text-sm text-foreground truncate">
          {vehicle?.vehicle_name || vehicle?.name || "Vehicle"}
        </p>
        <StatusBadge status={displayStatus} />
      </div>
      <dl className="space-y-2.5">
        {ROWS.map(({ key, label, icon: Icon }) => (
          <div key={key} className="flex items-center justify-between gap-3 text-xs">
            <dt className="flex items-center gap-1.5 text-muted-foreground shrink-0">
              <Icon className="h-3.5 w-3.5 text-primary" />
              {label}
            </dt>
            <dd className="font-semibold text-foreground tabular-nums text-right">{values[key]}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
