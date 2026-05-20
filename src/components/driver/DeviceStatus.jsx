import { motion } from "framer-motion";
import { Navigation, Wifi, Globe, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

function Row({ icon: Icon, label, ok, warn, detail, spin }) {
  const tone = ok ? "text-emerald-600" : warn ? "text-amber-600" : "text-red-600";
  return (
    <motion.div className="flex items-center justify-between py-2 border-b border-border last:border-0">
      <div className="flex items-center gap-2 text-sm">
        <Icon className={cn("h-4 w-4", tone, spin && "animate-spin")} />
        {label}
      </div>
      <span className={cn("text-sm font-medium", tone)}>{detail}</span>
    </motion.div>
  );
}

export default function DeviceStatus({
  gpsOk,
  online,
  socketConnected,
  reconnecting,
  trackingStatus,
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="surface-card rounded-xl border border-border p-4"
    >
      <h3 className="text-sm font-medium mb-2">Device status</h3>
      <Row
        icon={Globe}
        label="Internet"
        ok={online}
        detail={online ? "Online" : "Offline"}
      />
      <Row
        icon={RefreshCw}
        label="Fleet server"
        ok={socketConnected && !reconnecting}
        warn={reconnecting}
        spin={reconnecting}
        detail={
          reconnecting ? "Reconnecting" : socketConnected ? "Connected" : "Disconnected"
        }
      />
      <Row
        icon={Navigation}
        label="GPS"
        ok={gpsOk}
        warn={trackingStatus === "gps_waiting"}
        detail={
          gpsOk
            ? "Active"
            : trackingStatus === "gps_waiting"
              ? "Acquiring fix"
              : "Unavailable"
        }
      />
      <Row
        icon={Wifi}
        label="Tracking"
        ok={gpsOk && online && socketConnected}
        detail={
          gpsOk && online && socketConnected ? "Optimized (20m filter)" : "Interrupted"
        }
      />
    </motion.section>
  );
}
