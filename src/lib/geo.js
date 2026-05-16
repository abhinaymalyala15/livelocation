/** Distance in meters between two lat/lng points */
export function haversineMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function computeBearing(from, to) {
  const lat1 = (from.lat * Math.PI) / 180;
  const lat2 = (to.lat * Math.PI) / 180;
  const dLng = ((to.lng - from.lng) * Math.PI) / 180;
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

const MIN_MOVE_METERS = 20;
const MIN_SPEED_DELTA_KMH = 8;

/**
 * Send GPS update only if moved enough or speed changed significantly (saves bandwidth).
 */
export function shouldSendLocationUpdate(prev, next) {
  if (!prev) return true;
  const moved = haversineMeters(prev.latitude, prev.longitude, next.latitude, next.longitude);
  if (moved >= MIN_MOVE_METERS) return true;
  const speedDelta = Math.abs((next.speed ?? 0) - (prev.speed ?? 0));
  if (speedDelta >= MIN_SPEED_DELTA_KMH) return true;
  return false;
}
