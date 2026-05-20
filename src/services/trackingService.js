import { fleetApi } from "@/api/fleetApi";

/** Persist driver GPS on server (SQLite) + realtime broadcast to admins */
export async function sendLocationUpdate({
  driverId,
  vehicleId,
  tripId,
  latitude,
  longitude,
  speed,
  heading,
  accuracy,
  timestamp,
  saveLog = true,
}) {
  const payload = {
    driverId,
    vehicleId,
    tripId,
    lat: latitude,
    lng: longitude,
    speed,
    heading,
    accuracy,
    timestamp: timestamp || new Date().toISOString(),
    saveLog,
  };

  const result = await fleetApi.tracking.sendLocation(payload);
  return result?.live ?? payload;
}

export { acquireTrackingSocket, releaseTrackingSocket, getTrackingSocket } from "./socketService";
