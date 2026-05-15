import { Truck, Navigation, WifiOff, Route } from "lucide-react";
import { cn } from "@/lib/utils";

const stats = [
  { key: "total", label: "Total vehicles", icon: Truck, color: "text-sky-600", bg: "bg-sky-500/10" },
  { key: "active", label: "Active now", icon: Navigation, color: "text-emerald-600", bg: "bg-emerald-500/10" },
  { key: "offline", label: "Idle / offline", icon: WifiOff, color: "text-slate-500", bg: "bg-slate-400/10" },
  { key: "trips", label: "Today's trips", icon: Route, color: "text-violet-600", bg: "bg-violet-500/10" },
];

export default function StatsCards({ vehicles, tripsToday }) {
  const counts = {
    total: vehicles.length,
    active: vehicles.filter((v) => v.status === "on_trip").length,
    offline: vehicles.filter((v) => v.status === "offline" || v.status === "available").length,
    trips: tripsToday || 0,
  };

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {stats.map((stat) => (
        <div key={stat.key} className="surface-card p-4 transition-shadow hover:shadow-md">
          <div className="flex items-center justify-between gap-2">
            <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center shrink-0", stat.bg)}>
              <stat.icon className={cn("h-[1.125rem] w-[1.125rem]", stat.color)} />
            </div>
            <span className="text-2xl font-semibold tabular-nums text-foreground">{counts[stat.key]}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-2.5 font-medium">{stat.label}</p>
        </div>
      ))}
    </div>
  );
}
