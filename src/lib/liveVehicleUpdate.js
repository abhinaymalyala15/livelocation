import { normalizeVehicle } from "@/lib/normalizeVehicle";

/** Apply Socket.IO locationUpdate payload to admin vehicle list */
export function patchVehicleFromLiveUpdate(vehicles, payload) {
  const lat = payload.lat ?? payload.latitude;
  const lng = payload.lng ?? payload.longitude;
  if (!payload.vehicleId || lat == null || lng == null) return vehicles;

  return vehicles.map((v) => {
    if (v.id !== payload.vehicleId) return v;
    return normalizeVehicle({
      ...v,
      latitude: lat,
      longitude: lng,
      current_latitude: lat,
      current_longitude: lng,
      current_speed: payload.speed ?? 0,
      speed: payload.speed ?? 0,
      heading: payload.heading ?? v.heading,
      accuracy: payload.accuracy,
      last_location_update: payload.timestamp,
      status: payload.tripId ? "on_trip" : v.status,
      current_trip_id: payload.tripId ?? v.current_trip_id,
      _socketOnline: payload.online !== false,
    });
  });
}
