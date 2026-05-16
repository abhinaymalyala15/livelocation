import { motion } from "framer-motion";
import { Route, Gauge, Clock, MapPin } from "lucide-react";

function Stat({ icon: Icon, label, value, unit }) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className="rounded-lg border border-border bg-card p-3"
    >
      <Icon className="h-4 w-4 text-primary mb-2" />
      <p className="text-[11px] text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="text-lg font-semibold tabular-nums mt-0.5">
        {value}
        {unit && <span className="text-sm font-normal text-muted-foreground ml-0.5">{unit}</span>}
      </p>
    </motion.div>
  );
}

export default function TripStats({ distanceKm, speed, durationMin, points }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 }}
      className="grid grid-cols-2 lg:grid-cols-4 gap-3"
    >
      <Stat icon={Route} label="Distance" value={distanceKm.toFixed(2)} unit="km" />
      <Stat icon={Gauge} label="Speed" value={(speed ?? 0).toFixed(1)} unit="km/h" />
      <Stat icon={Clock} label="Duration" value={durationMin} unit="min" />
      <Stat icon={MapPin} label="GPS points" value={points} />
    </motion.section>
  );
}
