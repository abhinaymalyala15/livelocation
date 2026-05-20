import { motion } from "framer-motion";
import { WifiOff, RefreshCw, Navigation, Radio } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const icons = {
  no_network: WifiOff,
  socket_offline: Radio,
  reconnecting: RefreshCw,
  gps_error: Navigation,
  gps_stale: Navigation,
  gps_waiting: Navigation,
};

export default function TrackingStatusBanner({
  status,
  message,
  isOffline,
  onRetry,
  className,
}) {
  if (!isOffline || status === "idle") return null;

  const Icon = icons[status] || WifiOff;
  const spinning = status === "reconnecting";

  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "rounded-xl border px-4 py-3 flex flex-wrap items-center justify-between gap-3",
        status === "no_network" || status === "socket_offline"
          ? "border-amber-300/80 bg-amber-50 text-amber-950 dark:bg-amber-950/30 dark:text-amber-100"
          : "border-orange-300/80 bg-orange-50 text-orange-950 dark:bg-orange-950/30 dark:text-orange-100",
        className
      )}
    >
      <div className="flex items-start gap-2 text-sm min-w-0">
        <Icon className={cn("h-4 w-4 shrink-0 mt-0.5", spinning && "animate-spin")} />
        <div>
          <p className="font-semibold capitalize">
            {status === "reconnecting" ? "Reconnecting" : "Tracking interrupted"}
          </p>
          <p className="text-xs opacity-90 mt-0.5">{message}</p>
        </div>
      </div>
      {onRetry && (
        <Button type="button" variant="outline" size="sm" className="shrink-0" onClick={onRetry}>
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
          Retry GPS
        </Button>
      )}
    </motion.div>
  );
}
