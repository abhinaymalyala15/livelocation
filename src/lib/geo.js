/** Minimum GPS movement before adding to trip / today distance */
export const MIN_TRIP_DISTANCE_METERS = 10;
/** Ignore fixes worse than this (reduces parking-lot jitter) */
export const MAX_GPS_ACCURACY_METERS = 75;
/** Ignore single-fix teleports (bad GPS spikes) */
export const MAX_GPS_JUMP_METERS = 400;

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

/** Fleet transmit thresholds (server + socket) */
export const GPS_TRANSMIT_MIN_METERS = 20;
export const GPS_TRANSMIT_MIN_SPEED_DELTA_KMH = 8;
export const GPS_TRANSMIT_MIN_HEADING_DELTA_DEG = 25;

/** watchPosition options — balance accuracy vs battery */
export const GPS_WATCH_OPTIONS = {
  enableHighAccuracy: true,
  timeout: 15000,
  maximumAge: 10000,
};

export function isValidGpsCoordinate(latitude, longitude) {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return false;
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return false;
  if (latitude === 0 && longitude === 0) return false;
  return true;
}

export function isAcceptableGpsAccuracy(accuracyMeters) {
  if (accuracyMeters == null || !Number.isFinite(accuracyMeters)) return true;
  return accuracyMeters > 0 && accuracyMeters <= MAX_GPS_ACCURACY_METERS;
}

function headingDeltaDegrees(prevHeading, nextHeading) {
  const a = Number(prevHeading) || 0;
  const b = Number(nextHeading) || 0;
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

/**
 * Send location to server/socket only when movement or telemetry meaningfully changed.
 */
export function shouldSendLocationUpdate(prev, next) {
  if (!next || !isValidGpsCoordinate(next.latitude, next.longitude)) return false;
  if (!isAcceptableGpsAccuracy(next.accuracy)) return false;
  if (!prev) return true;

  const moved = haversineMeters(prev.latitude, prev.longitude, next.latitude, next.longitude);
  if (moved >= GPS_TRANSMIT_MIN_METERS) return true;

  const speedDelta = Math.abs((next.speed ?? 0) - (prev.speed ?? 0));
  if (speedDelta >= GPS_TRANSMIT_MIN_SPEED_DELTA_KMH) return true;

  if (headingDeltaDegrees(prev.heading, next.heading) >= GPS_TRANSMIT_MIN_HEADING_DELTA_DEG) {
    return true;
  }

  return false;
}

/** Sum path distance in km */
export function computePathDistanceKm(points) {
  if (!Array.isArray(points) || points.length < 2) return 0;
  let meters = 0;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    const lat1 = typeof a[0] === "number" ? a[0] : a.lat;
    const lng1 = typeof a[0] === "number" ? a[1] : a.lng;
    const lat2 = typeof b[0] === "number" ? b[0] : b.lat;
    const lng2 = typeof b[0] === "number" ? b[1] : b.lng;
    if (lat1 == null || lng1 == null || lat2 == null || lng2 == null) continue;
    meters += haversineMeters(lat1, lng1, lat2, lng2);
  }
  return meters / 1000;
}

/**
 * Meters to add to trip/today totals (0 if fix is noisy, invalid, or < MIN_TRIP_DISTANCE_METERS).
 */
export function metersToAccumulate(prev, next) {
  if (!next || !isValidGpsCoordinate(next.latitude, next.longitude)) return 0;
  if (!isAcceptableGpsAccuracy(next.accuracy)) return 0;
  if (!prev) return 0;

  const meters = haversineMeters(
    prev.latitude,
    prev.longitude,
    next.latitude,
    next.longitude
  );
  if (!Number.isFinite(meters) || meters >= MAX_GPS_JUMP_METERS) return 0;
  if (meters < MIN_TRIP_DISTANCE_METERS) return 0;
  return meters;
}
