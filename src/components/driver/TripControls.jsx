import { motion } from "framer-motion";
import { Play, Pause, Square, Share2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function TripControls({
  tripStatus,
  canStart,
  loading,
  onStart,
  onPause,
  onResume,
  onEnd,
  onShare,
}) {
  const busy = loading;

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="surface-card rounded-xl border border-border p-4"
    >
      <h3 className="text-sm font-medium mb-3">Trip controls</h3>
      <motion.div className="flex flex-wrap gap-2">
        {tripStatus === "idle" && (
          <Button
            className="flex-1 min-w-[140px] gap-2"
            onClick={onStart}
            disabled={!canStart || busy}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            Start trip
          </Button>
        )}
        {tripStatus === "active" && (
          <>
            <Button variant="outline" className="flex-1 gap-2" onClick={onPause} disabled={busy}>
              <Pause className="h-4 w-4" />
              Pause
            </Button>
            <Button variant="destructive" className="flex-1 gap-2" onClick={onEnd} disabled={busy}>
              <Square className="h-4 w-4" />
              End trip
            </Button>
          </>
        )}
        {tripStatus === "paused" && (
          <>
            <Button className="flex-1 gap-2" onClick={onResume} disabled={busy}>
              <Play className="h-4 w-4" />
              Resume
            </Button>
            <Button variant="destructive" className="flex-1 gap-2" onClick={onEnd} disabled={busy}>
              <Square className="h-4 w-4" />
              End trip
            </Button>
          </>
        )}
        {(tripStatus === "active" || tripStatus === "paused") && (
          <Button
            variant="secondary"
            className={cn("w-full sm:w-auto gap-2", tripStatus === "paused" && "sm:flex-1")}
            onClick={onShare}
            disabled={busy}
          >
            <Share2 className="h-4 w-4" />
            Sharing live location
          </Button>
        )}
      </motion.div>
    </motion.section>
  );
}
