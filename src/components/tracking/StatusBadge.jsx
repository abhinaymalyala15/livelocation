import { cn } from "@/lib/utils";

const statusConfig = {
  on_trip: { label: "On Trip", dotClass: "bg-emerald-500", bgClass: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20" },
  available: { label: "Available", dotClass: "bg-sky-500", bgClass: "bg-sky-500/10 text-sky-700 border-sky-500/20" },
  offline: { label: "Offline", dotClass: "bg-slate-400", bgClass: "bg-slate-400/10 text-slate-500 border-slate-400/20" },
  maintenance: { label: "Maintenance", dotClass: "bg-amber-500", bgClass: "bg-amber-500/10 text-amber-700 border-amber-500/20" },
  moving: { label: "Moving", dotClass: "bg-emerald-500", bgClass: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20" },
  stopped: { label: "Stopped", dotClass: "bg-amber-500", bgClass: "bg-amber-500/10 text-amber-700 border-amber-500/20" },
};

export default function StatusBadge({ status, size = "sm" }) {
  const config = statusConfig[status] || statusConfig.offline;
  const isLive = status === "on_trip" || status === "moving";
  
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 rounded-full border font-medium",
      config.bgClass,
      size === "sm" ? "px-2.5 py-0.5 text-xs" : "px-3 py-1 text-sm"
    )}>
      <span className={cn("h-1.5 w-1.5 rounded-full", config.dotClass, isLive && "animate-pulse")} />
      {config.label}
    </span>
  );
}