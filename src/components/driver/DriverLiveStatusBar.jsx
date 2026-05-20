import { Navigation, Wifi, Radio, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { LiveBadge } from "@/components/tracking/LiveIndicator";
import { formatLastUpdated } from "@/hooks/useLiveClock";
import useLiveClock from "@/hooks/useLiveClock";

export default function DriverLiveStatusBar({
  tripActive,
  gpsActive,
  socketConnected,
  online = true,
  reconnecting = false,
  trackingStatus = "online",
  lastFixAt,
  className,
}) {
  const now = useLiveClock(1000);
  const lastText = lastFixAt ? formatLastUpdated(lastFixAt, now) : "—";

  const fleetOnline = online && socketConnected && !reconnecting;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 border-b border-border bg-card/95 backdrop-blur-md text-xs safe-top",
        className
      )}
    >
      <div className="flex items-center gap-2 flex-wrap">
        {tripActive && fleetOnline && gpsActive ? (
          <LiveBadge label="LIVE" className="text-[10px] py-0" />
        ) : tripActive && reconnecting ? (
          <span className="inline-flex items-center gap-1 text-amber-700 font-medium">
            <RefreshCw className="h-3 w-3 animate-spin" />
            Reconnecting
          </span>
        ) : tripActive ? (
          <span className="text-amber-800 font-medium">Offline</span>
        ) : (
          <span className="text-muted-foreground font-medium">Trip inactive</span>
        )}
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium border min-h-[28px]",
            gpsActive
              ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/25"
              : trackingStatus === "gps_waiting"
                ? "bg-sky-500/10 text-sky-800 border-sky-500/25"
                : "bg-amber-500/10 text-amber-800 border-amber-500/25"
          )}
        >
          <Navigation className={cn("h-3 w-3", gpsActive && "text-emerald-600")} />
          {gpsActive
            ? "GPS active"
            : trackingStatus === "gps_waiting"
              ? "Acquiring GPS"
              : "GPS issue"}
          {gpsActive && (
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse ml-0.5" />
          )}
        </span>
      </div>

      <div className="flex items-center gap-3 text-muted-foreground tabular-nums">
        <span className="inline-flex items-center gap-1 min-h-[28px]">
          <Wifi
            className={cn(
              "h-3 w-3",
              !online ? "text-red-500" : fleetOnline ? "text-emerald-600" : "text-amber-600"
            )}
          />
          {!online ? "No network" : fleetOnline ? "Connected" : "Server offline"}
        </span>
        {tripActive && (
          <span className="inline-flex items-center gap-1">
            <Radio className="h-3 w-3 text-primary" />
            {lastText}
          </span>
        )}
      </div>
    </div>
  );
}
