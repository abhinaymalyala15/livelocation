import { Play, Square, AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/** Minimal trip + vehicle + SOS bar */
export default function DriverSimpleControls({
  tripStatus,
  vehicles,
  selectedVehicleId,
  onVehicleChange,
  canStart,
  loading,
  onStart,
  onEnd,
  onSOS,
  vehicleLocked,
}) {
  const selected = vehicles.find((v) => v.id === selectedVehicleId);
  const plate = selected?.vehicle_unique_id || selected?.plate;

  return (
    <div className="shrink-0 border-t border-border bg-card/95 backdrop-blur-md safe-bottom">
      <div className="p-3 space-y-3 max-w-lg mx-auto w-full">
        {tripStatus === "idle" && vehicles.length > 1 && (
          <Select value={selectedVehicleId} onValueChange={onVehicleChange}>
            <SelectTrigger className="h-11">
              <SelectValue placeholder="Select vehicle" />
            </SelectTrigger>
            <SelectContent>
              {vehicles.map((v) => (
                <SelectItem key={v.id} value={v.id}>
                  {v.vehicle_name || v.name} · {v.vehicle_unique_id || v.plate}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {vehicleLocked && plate && (
          <p className="text-center text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">{plate}</span>
            {selected?.vehicle_name ? ` · ${selected.vehicle_name}` : ""}
          </p>
        )}

        <div className="flex gap-2">
          {tripStatus === "idle" ? (
            <Button
              className="flex-1 h-12 text-base font-semibold gap-2"
              onClick={onStart}
              disabled={!canStart || loading}
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Play className="h-5 w-5" />
              )}
              Start trip
            </Button>
          ) : (
            <Button
              variant="destructive"
              className="flex-1 h-12 text-base font-semibold gap-2"
              onClick={onEnd}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Square className="h-5 w-5" />
              )}
              End trip
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            className="h-12 px-4 border-destructive/40 text-destructive hover:bg-destructive/10"
            onClick={onSOS}
          >
            <AlertTriangle className="h-5 w-5" />
            <span className="sr-only">SOS</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
