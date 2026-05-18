import { Wifi, Navigation, Radio } from "lucide-react";
import { cn } from "@/lib/utils";
import useLiveClock, { formatLastUpdated } from "@/hooks/useLiveClock";
import { LiveBadge } from "@/components/tracking/LiveIndicator";
import moment from "moment";

export default function DriverHeader({
  tripStatus,
  gpsActive,
  socketConnected,
  lastFixAt,
  userName,
}) {
  const now = useLiveClock();
  const clock = moment(now).format("ddd, MMM D · HH:mm:ss");
  const lastGps = lastFixAt ? formatLastUpdated(lastFixAt, now) : "—";
  const tripActive = tripStatus === "active" || tripStatus === "paused";

  const statusLabel =
    tripStatus === "active"
      ? "Live tracking"
      : tripStatus === "paused"
        ? "Trip paused"
        : tripStatus === "completed"
          ? "Trip ended"
          : "Ready";

  return (
    <header className="sticky top-0 z-10 bg-card/95 backdrop-blur border-b border-border px-4 md:px-6 py-3 hidden md:block">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-semibold text-base">Active Trip</h1>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {tripActive && <LiveBadge label="LIVE" />}
            <span
              className={cn(
                "inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full",
                tripStatus === "active"
                  ? "bg-emerald-500/15 text-emerald-700"
                  : "bg-muted text-muted-foreground"
              )}
            >
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  tripStatus === "active" ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground"
                )}
              />
              {statusLabel}
            </span>
          </div>
        </div>

        <p className="text-sm text-muted-foreground tabular-nums">{clock}</p>

        <div className="flex items-center gap-4 text-sm">
          <span className="flex items-center gap-1.5 text-muted-foreground" title="GPS">
            <Navigation className={cn("h-4 w-4", gpsActive && "text-emerald-600")} />
            <span className={gpsActive ? "text-emerald-700" : "text-amber-600"}>
              {gpsActive ? "GPS active" : "GPS off"}
            </span>
            {gpsActive && (
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            )}
          </span>
          {tripActive && (
            <span className="flex items-center gap-1.5 text-muted-foreground tabular-nums">
              <Radio className="h-4 w-4 text-primary" />
              {lastGps}
            </span>
          )}
          <span className="flex items-center gap-1.5 text-muted-foreground" title="Connection">
            <Wifi className={cn("h-4 w-4", socketConnected && "text-emerald-600")} />
            <span className={socketConnected ? "text-emerald-700" : "text-red-600"}>
              {socketConnected ? "Online" : "Offline"}
            </span>
          </span>
          <span className="font-medium truncate max-w-[120px]">{userName}</span>
        </div>
      </div>
    </header>
  );
}
