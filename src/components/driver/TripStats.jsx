import { motion } from "framer-motion";
import { Route, Gauge, Clock, MapPin, CalendarDays } from "lucide-react";
import useAnimatedNumber from "@/hooks/useAnimatedNumber";

function Stat({ icon: Icon, label, value, unit, highlight }) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className={`rounded-lg border p-3 ${
        highlight ? "border-primary/30 bg-primary/5" : "border-border bg-card"
      }`}
    >
      <Icon className={`h-4 w-4 mb-2 ${highlight ? "text-primary" : "text-primary"}`} />
      <p className="text-[11px] text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="text-lg font-semibold tabular-nums mt-0.5">
        {value}
        {unit && <span className="text-sm font-normal text-muted-foreground ml-0.5">{unit}</span>}
      </p>
    </motion.div>
  );
}

export default function TripStats({
  todayDistanceKm = 0,
  tripDistanceKm = 0,
  speed,
  durationMin,
  points,
  tripActive = false,
}) {
  const animatedToday = useAnimatedNumber(todayDistanceKm, { duration: 400, decimals: 2 });
  const animatedTrip = useAnimatedNumber(tripDistanceKm, { duration: 400, decimals: 2 });

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 }}
      className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3"
    >
      <Stat
        icon={CalendarDays}
        label="Today total"
        value={animatedToday}
        unit="km"
        highlight
      />
      <Stat
        icon={Route}
        label="This trip"
        value={tripActive ? animatedTrip : "—"}
        unit={tripActive ? "km" : ""}
      />
      <Stat icon={Gauge} label="Speed" value={(speed ?? 0).toFixed(1)} unit="km/h" />
      <Stat icon={Clock} label="Duration" value={durationMin} unit="min" />
      <Stat icon={MapPin} label="GPS points" value={points} />
    </motion.section>
  );
}
