/**
 * Fleet status: Moving (green), Idle (yellow), Offline (red), Maintenance (orange)
 */

export const MOVING_SPEED_KMH = 5;
export const LIVE_STALE_MS = 10_000;
export const FLEET_STALE_MS = 5 * 60 * 1000;

export function resolveVehicleStatus(vehicle, options = {}) {
  const { live = false } = options;
  if (!vehicle) return "offline";

  const raw = vehicle.status;
  if (raw === "maintenance") return "maintenance";

  const staleMs = live ? LIVE_STALE_MS : FLEET_STALE_MS;
  const movingThreshold = live ? MOVING_SPEED_KMH : 3;

  const lastUpdate = vehicle.last_location_update || vehicle.updated_date;
  if (lastUpdate) {
    const age = Date.now() - new Date(lastUpdate).getTime();
    if (age > staleMs) return "offline";
  } else if (raw === "offline") {
    return "offline";
  }

  if (raw === "offline") return "offline";

  const speed = vehicle.current_speed ?? vehicle.speed ?? 0;
  if (raw === "on_trip" || raw === "moving") {
    return speed > movingThreshold ? "moving" : "idle";
  }

  if (raw === "available") return speed > movingThreshold ? "moving" : "idle";

  return "offline";
}

/** Driver live trip: speed + last GPS fix */
export function resolveDriverMotionStatus(speed, lastFixAt, tracking) {
  if (!tracking) return "ready";
  if (lastFixAt) {
    const age = Date.now() - new Date(lastFixAt).getTime();
    if (age > LIVE_STALE_MS) return "offline";
  } else {
    return "offline";
  }
  const s = Number(speed) || 0;
  if (s > MOVING_SPEED_KMH) return "moving";
  if (s === 0) return "idle";
  return "idle";
}

export const statusColors = {
  moving: { marker: "#22c55e", bg: "bg-emerald-500/10", text: "text-emerald-700", border: "border-emerald-500/25", label: "Moving" },
  idle: { marker: "#eab308", bg: "bg-yellow-500/10", text: "text-yellow-800", border: "border-yellow-500/25", label: "Idle" },
  offline: { marker: "#ef4444", bg: "bg-red-500/10", text: "text-red-700", border: "border-red-500/25", label: "Offline" },
  maintenance: { marker: "#f97316", bg: "bg-orange-500/10", text: "text-orange-700", border: "border-orange-500/25", label: "Maintenance" },
  ready: { marker: "#94a3b8", bg: "bg-muted", text: "text-muted-foreground", border: "border-border", label: "Ready" },
};
