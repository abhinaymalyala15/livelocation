/** Align mock/API vehicle fields for map + admin views */
export function normalizeVehicle(vehicle) {
  if (!vehicle) return vehicle;
  const lat = vehicle.current_latitude ?? vehicle.latitude;
  const lng = vehicle.current_longitude ?? vehicle.longitude;
  return {
    ...vehicle,
    vehicle_name: vehicle.vehicle_name ?? vehicle.name,
    vehicle_unique_id: vehicle.vehicle_unique_id ?? vehicle.plate,
    name: vehicle.name ?? vehicle.vehicle_name,
    plate: vehicle.plate ?? vehicle.vehicle_unique_id,
    latitude: lat,
    longitude: lng,
    current_latitude: lat,
    current_longitude: lng,
    heading: vehicle.heading ?? 0,
  };
}

export function normalizeVehicles(vehicles) {
  return (vehicles ?? []).map(normalizeVehicle);
}
