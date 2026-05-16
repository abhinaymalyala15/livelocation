import { motion } from "framer-motion";
import { Truck, User } from "lucide-react";
import { cn } from "@/lib/utils";

const STATUS = {
  idle: { label: "Ready", className: "bg-muted text-muted-foreground" },
  active: { label: "On trip", className: "bg-emerald-500/15 text-emerald-700" },
  paused: { label: "Paused", className: "bg-amber-500/15 text-amber-700" },
  completed: { label: "Completed", className: "bg-blue-500/15 text-blue-700" },
};

export default function DriverInfoCard({ user, vehicle, tripStatus }) {
  const badge = STATUS[tripStatus] || STATUS.idle;

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="surface-card rounded-xl border border-border p-4 md:p-5"
    >
      <motion.div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <motion.div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <User className="h-7 w-7 text-primary" />
        </motion.div>
        <motion.div className="flex-1 min-w-0">
          <motion.div className="flex flex-wrap items-center gap-2">
            <h2 className="font-semibold text-lg">{user?.name}</h2>
            <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", badge.className)}>
              {badge.label}
            </span>
          </motion.div>
          <p className="text-sm text-muted-foreground mt-0.5">{user?.email}</p>
          {vehicle && (
            <motion.div className="flex items-center gap-2 mt-2 text-sm">
              <Truck className="h-4 w-4 text-primary shrink-0" />
              <span>
                {vehicle.vehicle_name || vehicle.name} · {vehicle.vehicle_unique_id || vehicle.plate}
              </span>
            </motion.div>
          )}
        </motion.div>
      </motion.div>
    </motion.section>
  );
}
