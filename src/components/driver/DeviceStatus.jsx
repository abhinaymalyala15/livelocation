import { motion } from "framer-motion";
import { Navigation, Wifi, Battery } from "lucide-react";
import { cn } from "@/lib/utils";

function Row({ icon: Icon, label, ok, warn, detail }) {
  const tone = ok ? "text-emerald-600" : warn ? "text-amber-600" : "text-red-600";
  return (
    <motion.div className="flex items-center justify-between py-2 border-b border-border last:border-0">
      <motion.div className="flex items-center gap-2 text-sm">
        <Icon className={cn("h-4 w-4", tone)} />
        {label}
      </motion.div>
      <span className={cn("text-sm font-medium", tone)}>{detail}</span>
    </motion.div>
  );
}

export default function DeviceStatus({ gpsOk, online, battery }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="surface-card rounded-xl border border-border p-4"
    >
      <h3 className="text-sm font-medium mb-2">Device status</h3>
      <Row icon={Navigation} label="GPS" ok={gpsOk} warn={!gpsOk} detail={gpsOk ? "Active" : "Waiting"} />
      <Row icon={Wifi} label="Connection" ok={online} detail={online ? "Connected" : "Offline"} />
      <Row
        icon={Battery}
        label="Battery"
        ok={battery == null || battery > 20}
        warn={battery != null && battery <= 20}
        detail={battery != null ? `${battery}%` : "N/A"}
      />
    </motion.section>
  );
}
