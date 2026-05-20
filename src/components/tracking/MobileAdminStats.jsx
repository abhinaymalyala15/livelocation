import { Truck, Navigation, PauseCircle, WifiOff, Route } from "lucide-react";
import { resolveVehicleStatus } from "@/lib/vehicleStatus";
import { cn } from "@/lib/utils";

const chips = [
  { key: "total", label: "Total", icon: Truck, iconClass: "text-sky-600", bgClass: "bg-sky-500/10" },
  { key: "moving", label: "Moving", icon: Navigation, iconClass: "text-emerald-600", bgClass: "bg-emerald-500/10" },
  { key: "idle", label: "Idle", icon: PauseCircle, iconClass: "text-amber-700", bgClass: "bg-amber-500/10" },
  { key: "offline", label: "Off", icon: WifiOff, iconClass: "text-red-600", bgClass: "bg-red-500/10" },
  { key: "trips", label: "Trips", icon: Route, iconClass: "text-violet-600", bgClass: "bg-violet-500/10" },
];

export default function MobileAdminStats({ vehicles, tripsToday }) {
  const counts = {
    total: vehicles.length,
    moving: vehicles.filter((v) => resolveVehicleStatus(v, { live: true }) === "moving").length,
    idle: vehicles.filter((v) => resolveVehicleStatus(v, { live: true }) === "idle").length,
    offline: vehicles.filter((v) => {
      const s = resolveVehicleStatus(v, { live: true });
      return s === "offline" || s === "maintenance";
    }).length,
    trips: tripsToday || 0,
  };

  return (
    <div className="lg:hidden shrink-0 border-b border-border bg-card/95 px-3 py-2.5 safe-top">
      <p className="text-xs font-medium text-muted-foreground mb-2">Fleet overview</p>
      <div className="flex gap-2 overflow-x-auto pb-0.5 -mx-1 px-1 snap-x snap-mandatory">
        {chips.map(({ key, label, icon: Icon, iconClass, bgClass }) => (
          <div
            key={key}
            className={cn(
              "snap-start shrink-0 flex items-center gap-2 rounded-xl border border-border/80 px-3 py-2.5 min-w-[5.25rem]",
              bgClass
            )}
          >
            <Icon className={cn("h-4 w-4 shrink-0", iconClass)} />
            <div>
              <p className="text-lg font-bold tabular-nums leading-none">{counts[key]}</p>
              <p className="text-[10px] text-muted-foreground font-medium mt-0.5">{label}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
