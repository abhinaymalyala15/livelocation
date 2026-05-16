/**
 * Moves demo vehicles along real trip GPS paths (not random drift).
 */

function haversineMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Bearing in degrees (0 = north) for marker rotation */
export function computeBearing(from, to) {
  const lat1 = (from.lat * Math.PI) / 180;
  const lat2 = (to.lat * Math.PI) / 180;
  const dLng = ((to.lng - from.lng) * Math.PI) / 180;
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

function lerpPoint(a, b, t) {
  return {
    lat: a.lat + (b.lat - a.lat) * t,
    lng: a.lng + (b.lng - a.lng) * t,
  };
}

/** Sort logs and build dense path for a trip */
export function buildPathFromTrip(tripId, locationLogs, trip) {
  const logs = (locationLogs || [])
    .filter((l) => l.trip_id === tripId && l.latitude != null && l.longitude != null)
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  let points = logs.map((l) => ({
    lat: l.latitude,
    lng: l.longitude,
    speed: l.speed ?? 40,
  }));

  if (points.length < 2 && trip) {
    if (trip.start_lat != null && trip.start_lng != null) {
      points.push({ lat: trip.start_lat, lng: trip.start_lng, speed: 0 });
    }
    if (trip.end_lat != null && trip.end_lng != null) {
      points.push({ lat: trip.end_lat, lng: trip.end_lng, speed: 40 });
    }
  }

  return densifyPath(points, 8);
}

/** Insert intermediate points so movement follows the corridor smoothly */
function densifyPath(points, segmentsBetween = 6) {
  if (points.length < 2) return points;
  const dense = [];
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    for (let s = 0; s < segmentsBetween; s++) {
      const t = s / segmentsBetween;
      dense.push({
        ...lerpPoint(a, b, t),
        speed: a.speed + (b.speed - a.speed) * t,
      });
    }
  }
  dense.push({ ...points[points.length - 1] });
  return dense;
}

const simState = new Map();

/**
 * @param {Array} vehicles
 * @param {Array} locationLogs
 * @param {Array} trips
 */
export function syncVehicleRoutes(vehicles, locationLogs, trips) {
  const tripById = Object.fromEntries((trips || []).map((t) => [t.id, t]));

  for (const v of vehicles) {
    if (v.status !== "on_trip" || !v.current_trip_id) {
      simState.delete(v.id);
      continue;
    }

    const existing = simState.get(v.id);
    if (existing?.tripId === v.current_trip_id && existing.path?.length >= 2) {
      continue;
    }

    const path = buildPathFromTrip(v.current_trip_id, locationLogs, tripById[v.current_trip_id]);
    if (path.length < 2) {
      simState.delete(v.id);
      continue;
    }

    const startIdx = existing?.progress ?? 0;
    simState.set(v.id, {
      tripId: v.current_trip_id,
      path,
      progress: Math.min(startIdx, path.length - 1),
      direction: 1,
    });
  }
}

/**
 * Advance one step along the route; returns position update or null.
 * @param {object} vehicle
 * @param {{ metersPerTick?: number }} options
 */
export function tickVehicleAlongRoute(vehicle, options = {}) {
  const state = simState.get(vehicle.id);
  if (!state?.path || state.path.length < 2) return null;

  const { path } = state;
  const metersPerTick = options.metersPerTick ?? 180;

  const idx = Math.min(Math.floor(state.progress), path.length - 2);
  const frac = state.progress - idx;
  const from = path[idx];
  const to = path[idx + 1];

  const segmentMeters = Math.max(haversineMeters(from.lat, from.lng, to.lat, to.lng), 1);
  const progressDelta = metersPerTick / segmentMeters;

  state.progress += progressDelta * state.direction;

  if (state.progress >= path.length - 1) {
    state.progress = path.length - 1;
    state.direction = -1;
  } else if (state.progress <= 0) {
    state.progress = 0;
    state.direction = 1;
  }

  const i = Math.min(Math.floor(state.progress), path.length - 2);
  const f = state.progress - i;
  const a = path[i];
  const b = path[i + 1];
  const pos = lerpPoint(a, b, f);

  const speedKmh = Math.round((a.speed ?? 35) + ((b.speed ?? 35) - (a.speed ?? 35)) * f);
  const heading = computeBearing(a, b);

  return {
    latitude: pos.lat,
    longitude: pos.lng,
    current_latitude: pos.lat,
    current_longitude: pos.lng,
    current_speed: speedKmh,
    speed: speedKmh,
    heading,
    last_location_update: new Date().toISOString(),
    updated_date: new Date().toISOString(),
  };
}

export function resetRouteSimulation() {
  simState.clear();
}
