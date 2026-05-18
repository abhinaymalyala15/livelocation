import { Truck, Navigation, PauseCircle, WifiOff, Route } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { resolveVehicleStatus } from "@/lib/vehicleStatus";

const stats = [
  { key: "total", label: "Total vehicles", icon: Truck, color: "text-sky-600", bg: "bg-sky-500/10", ring: "ring-sky-500/20" },
  { key: "moving", label: "Moving", icon: Navigation, color: "text-emerald-600", bg: "bg-emerald-500/10", ring: "ring-emerald-500/20" },
  { key: "idle", label: "Idle", icon: PauseCircle, color: "text-yellow-700", bg: "bg-yellow-500/10", ring: "ring-yellow-500/20" },
  { key: "offline", label: "Offline / maint.", icon: WifiOff, color: "text-red-600", bg: "bg-red-500/10", ring: "ring-red-500/20" },
];

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } },
};

export default function StatsCards({ vehicles, tripsToday }) {
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

  const displayStats = [...stats, { key: "trips", label: "Today's trips", icon: Route, color: "text-violet-600", bg: "bg-violet-500/10", ring: "ring-violet-500/20" }];

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="grid grid-cols-2 lg:grid-cols-5 gap-3"
    >
      {displayStats.map((stat) => (
        <motion.div
          key={stat.key}
          variants={item}
          className={cn(
            "surface-card p-4 transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 ring-1",
            stat.ring
          )}
        >
          <div className="flex items-center justify-between gap-2">
            <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center shrink-0", stat.bg)}>
              <stat.icon className={cn("h-[1.125rem] w-[1.125rem]", stat.color)} />
            </div>
            <span className="text-2xl font-semibold tabular-nums text-foreground">{counts[stat.key]}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-2.5 font-medium">{stat.label}</p>
        </motion.div>
      ))}
    </motion.div>
  );
}
