import { motion } from "framer-motion";
import { CalendarDays, Route, Gauge } from "lucide-react";
import useAnimatedNumber from "@/hooks/useAnimatedNumber";
import { resolveDriverMotionStatus, statusColors } from "@/lib/vehicleStatus";
import { cn } from "@/lib/utils";
import { formatLastUpdated } from "@/hooks/useLiveClock";
import useLiveClock from "@/hooks/useLiveClock";

export default function LiveDistanceHero({
  todayDistanceKm = 0,
  tripDistanceKm = 0,
  speed = 0,
  lastFixAt,
  tracking = false,
  tripActive = false,
}) {
  const now = useLiveClock(1000);
  const animatedToday = useAnimatedNumber(todayDistanceKm, { duration: 550, decimals: 2 });
  const animatedTrip = useAnimatedNumber(tripDistanceKm, { duration: 450, decimals: 2 });
  const motionState = resolveDriverMotionStatus(speed, lastFixAt, tracking);
  const style = statusColors[motionState] || statusColors.ready;
  const lastText = lastFixAt ? formatLastUpdated(lastFixAt, now) : "Waiting for GPS…";

  return (
    <motion.div
      layout
      className="rounded-2xl border border-border/80 bg-card/95 backdrop-blur-md shadow-xl ring-1 ring-black/5 overflow-hidden"
    >
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white px-5 py-5 sm:py-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/70 flex items-center gap-2">
          <CalendarDays className="h-3.5 w-3.5" />
          Today&apos;s Distance
        </p>
        <p className="mt-2 text-4xl sm:text-5xl md:text-6xl font-bold tabular-nums tracking-tight leading-none">
          {animatedToday}
          <span className="text-xl sm:text-3xl font-semibold text-white/80 ml-1.5 sm:ml-2">KM</span>
        </p>
        {tripActive && (
          <motion.p
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-3 text-sm text-white/75 flex items-center gap-2"
          >
            <Route className="h-3.5 w-3.5 text-emerald-400" />
            This trip ·{" "}
            <span className="font-semibold text-white tabular-nums">{animatedTrip} km</span>
          </motion.p>
        )}
      </div>

      <div className="grid grid-cols-2 divide-x divide-border border-t border-border text-sm bg-card">
        <div className="px-4 py-3 flex items-center gap-2">
          <Gauge className="h-4 w-4 text-primary shrink-0" />
          <div>
            <p className="text-[10px] uppercase text-muted-foreground">Speed</p>
            <p className="font-semibold tabular-nums">{(speed ?? 0).toFixed(1)} km/h</p>
          </div>
        </div>
        <div className="px-4 py-3 flex items-center justify-between gap-2">
          <div>
            <p className="text-[10px] uppercase text-muted-foreground">Status</p>
            <p className={cn("font-semibold", style.text)}>{style.label}</p>
          </div>
          <span
            className={cn(
              "h-2.5 w-2.5 rounded-full shrink-0",
              motionState === "moving" && "bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.7)]",
              motionState === "idle" && "bg-yellow-500",
              motionState === "offline" && "bg-red-500",
              motionState === "ready" && "bg-muted-foreground"
            )}
          />
        </div>
      </div>

      <p className="px-4 py-2 text-[11px] text-muted-foreground border-t border-border bg-muted/30 tabular-nums">
        Live GPS · {lastText}
        {tracking && (
          <span className="text-muted-foreground/80"> · updates when moving 20m+</span>
        )}
      </p>
    </motion.div>
  );
}
