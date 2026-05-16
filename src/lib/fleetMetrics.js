/** Total km across all trips (completed + active logged distance) */
export function getFleetTotalKm(trips = []) {
  return trips.reduce((sum, t) => sum + (Number(t.distance_km ?? t.distance) || 0), 0);
}

/** Per-vehicle lifetime km from trips + vehicle baseline */
export function getVehicleLifetimeKm(vehicleId, trips = [], vehicleBaseline = 0) {
  const fromTrips = trips
    .filter((t) => t.vehicle_id === vehicleId)
    .reduce((sum, t) => sum + (Number(t.distance_km ?? t.distance) || 0), 0);
  return (Number(vehicleBaseline) || 0) + fromTrips;
}

export function getDriverTotalKm(driverEmail, trips = []) {
  return trips
    .filter((t) => t.driver_email === driverEmail)
    .reduce((sum, t) => sum + (Number(t.distance_km ?? t.distance) || 0), 0);
}
