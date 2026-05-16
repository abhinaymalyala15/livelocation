import { Play, Pause, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import moment from "moment";

export default function RoutePlaybackControls({
  playing,
  onPlay,
  onPause,
  onReset,
  playbackPercent,
  onSeek,
  speed,
  onSpeedChange,
  currentPointIndex,
  pointCount,
  currentTimestamp,
}) {
  if (pointCount < 2) return null;

  return (
    <div className="rounded-xl border border-border bg-card/95 backdrop-blur-sm p-3 shadow-sm">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1">
          {playing ? (
            <Button type="button" size="icon" variant="secondary" className="h-9 w-9" onClick={onPause}>
              <Pause className="h-4 w-4" />
            </Button>
          ) : (
            <Button type="button" size="icon" className="h-9 w-9" onClick={onPlay}>
              <Play className="h-4 w-4 ml-0.5" />
            </Button>
          )}
          <Button type="button" size="icon" variant="ghost" className="h-9 w-9" onClick={onReset}>
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
        </div>

        <div className="flex-1 min-w-[120px] space-y-1">
          <Slider
            value={[playbackPercent]}
            max={100}
            step={0.5}
            onValueChange={([v]) => onSeek(v)}
            className="cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-muted-foreground tabular-nums">
            <span>
              Point {currentPointIndex + 1} / {pointCount}
            </span>
            {currentTimestamp && (
              <span>{moment(currentTimestamp).format("HH:mm:ss")}</span>
            )}
          </div>
        </div>

        <Select value={String(speed)} onValueChange={(v) => onSpeedChange(Number(v))}>
          <SelectTrigger className="h-9 w-[88px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="0.5">0.5×</SelectItem>
            <SelectItem value="1">1×</SelectItem>
            <SelectItem value="2">2×</SelectItem>
            <SelectItem value="4">4×</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
