/**
 * Fleet status display: Moving (green), Idle (yellow), Offline (red), Maintenance (orange)
 */
export function resolveVehicleStatus(vehicle) {
  if (!vehicle) return "offline";

  const raw = vehicle.status;
  if (raw === "maintenance") return "maintenance";

  const lastUpdate = vehicle.last_location_update || vehicle.updated_date;
  if (lastUpdate) {
    const staleMs = Date.now() - new Date(lastUpdate).getTime();
    if (staleMs > 5 * 60 * 1000) return "offline";
  } else if (raw === "offline") {
    return "offline";
  }

  if (raw === "offline") return "offline";

  const speed = vehicle.current_speed ?? vehicle.speed ?? 0;
  if (raw === "on_trip" || raw === "moving") {
    return speed > 3 ? "moving" : "idle";
  }

  if (raw === "available") return "idle";

  return "offline";
}

export const statusColors = {
  moving: { marker: "#22c55e", bg: "bg-emerald-500/10", text: "text-emerald-700", border: "border-emerald-500/25" },
  idle: { marker: "#eab308", bg: "bg-yellow-500/10", text: "text-yellow-800", border: "border-yellow-500/25" },
  offline: { marker: "#ef4444", bg: "bg-red-500/10", text: "text-red-700", border: "border-red-500/25" },
  maintenance: { marker: "#f97316", bg: "bg-orange-500/10", text: "text-orange-700", border: "border-orange-500/25" },
};
