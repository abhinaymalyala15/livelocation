import { Wifi, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ConnectionIndicator({ connected }) {
  return (
    <div
      className={cn(
        "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors",
        connected
          ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/25"
          : "bg-muted text-muted-foreground border-border"
      )}
    >
      {connected ? (
        <>
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <Wifi className="h-3 w-3" />
          <span className="hidden sm:inline">Live</span>
        </>
      ) : (
        <>
          <WifiOff className="h-3 w-3" />
          <span className="hidden sm:inline">Offline</span>
        </>
      )}
    </div>
  );
}
