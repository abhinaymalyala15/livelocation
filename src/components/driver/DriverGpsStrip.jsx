import { Navigation, Wifi, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { LiveBadge } from "@/components/tracking/LiveIndicator";

export default function DriverGpsStrip({
  tripActive,
  gpsOk,
  online,
  socketConnected,
  reconnecting,
  lastFixLabel,
}) {
  const live = tripActive && gpsOk && online && socketConnected && !reconnecting;

  return (
    <div className="shrink-0 flex items-center justify-between gap-2 px-3 py-2 border-b border-border bg-card/90 backdrop-blur text-xs">
      <div className="flex items-center gap-2 min-w-0">
        {live ? (
          <LiveBadge label="LIVE" className="text-[10px] py-0" />
        ) : reconnecting ? (
          <span className="flex items-center gap-1 text-amber-700 font-medium">
            <RefreshCw className="h-3 w-3 animate-spin" />
            Reconnecting
          </span>
        ) : (
          <span className="text-muted-foreground font-medium">Offline</span>
        )}
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 border",
            gpsOk
              ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/20"
              : "bg-amber-500/10 text-amber-800 border-amber-500/20"
          )}
        >
          <Navigation className="h-3 w-3" />
          {gpsOk ? "GPS OK" : "GPS waiting"}
        </span>
      </div>
      <div className="flex items-center gap-2 text-muted-foreground shrink-0">
        <Wifi className={cn("h-3 w-3", online && socketConnected ? "text-emerald-600" : "text-red-500")} />
        <span className="tabular-nums">{lastFixLabel}</span>
      </div>
    </div>
  );
}
