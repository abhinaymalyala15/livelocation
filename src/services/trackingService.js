import { base44 } from "@/api/base44Client";
import { mockSocket } from "./mockSocketService";

/** Persist driver GPS to mock API + emit realtime event */
export async function sendLocationUpdate({
  driverId,
  vehicleId,
  tripId,
  latitude,
  longitude,
  speed,
  heading,
  accuracy,
  battery,
  timestamp,
}) {
  const payload = {
    driverId,
    vehicleId,
    tripId,
    latitude,
    longitude,
    speed,
    heading,
    accuracy,
    battery: battery ?? null,
    timestamp: timestamp || new Date().toISOString(),
  };

  mockSocket.emit("locationUpdate", payload);

  if (vehicleId) {
    await base44.entities.Vehicle.update(vehicleId, {
      current_latitude: latitude,
      current_longitude: longitude,
      latitude,
      longitude,
      current_speed: speed,
      speed,
      heading,
      accuracy,
      last_location_update: payload.timestamp,
      status: tripId ? "on_trip" : "available",
    });
  }

  if (tripId) {
    await base44.entities.LocationLog.create({
      vehicle_id: vehicleId,
      trip_id: tripId,
      driver_email: driverId,
      latitude,
      longitude,
      speed,
      heading,
      accuracy,
      timestamp: payload.timestamp,
    });
  }

  return payload;
}

export function connectTrackingSocket() {
  return mockSocket.connect();
}

export function disconnectTrackingSocket() {
  mockSocket.disconnect();
}

export { mockSocket };
