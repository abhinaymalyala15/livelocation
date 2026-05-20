import { haversineMeters } from "@/lib/geo";

const MAX_DIRECTIONS_WAYPOINTS = 23;
const MAX_DIRECTIONS_LOCATIONS = 25;
const MIN_POINT_GAP_METERS = 4;

/** Normalize [lat,lng] tuples or {lat,lng} / {latitude,longitude} objects */
export function normalizePathPoints(tripPath) {
  if (!Array.isArray(tripPath) || tripPath.length === 0) return [];

  return tripPath
    .map((point) => {
      if (Array.isArray(point)) {
        return { lat: point[0], lng: point[1] };
      }
      return {
        lat: point.lat ?? point.latitude,
        lng: point.lng ?? point.longitude,
      };
    })
    .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));
}

/** Drop points closer than minGapMeters to reduce noisy GPS and API payload */
export function dedupePathPoints(points, minGapMeters = MIN_POINT_GAP_METERS) {
  if (points.length < 2) return points;
  const out = [points[0]];
  for (let i = 1; i < points.length; i++) {
    const prev = out[out.length - 1];
    const cur = points[i];
    if (haversineMeters(prev.lat, prev.lng, cur.lat, cur.lng) >= minGapMeters) {
      out.push(cur);
    }
  }
  const last = points[points.length - 1];
  const tail = out[out.length - 1];
  if (tail.lat !== last.lat || tail.lng !== last.lng) out.push(last);
  return out;
}

/** Evenly sample long GPS trails so Directions stays within waypoint limits */
export function samplePathForDirections(points, maxLocations = MAX_DIRECTIONS_LOCATIONS) {
  if (points.length <= maxLocations) return points;
  const sampled = [];
  for (let i = 0; i < maxLocations; i++) {
    const idx = Math.round((i / (maxLocations - 1)) * (points.length - 1));
    sampled.push(points[idx]);
  }
  return dedupePathPoints(sampled, MIN_POINT_GAP_METERS);
}

function latLngToPoint(ll) {
  return {
    lat: typeof ll.lat === "function" ? ll.lat() : ll.lat,
    lng: typeof ll.lng === "function" ? ll.lng() : ll.lng,
  };
}

function requestDrivingRoute(points) {
  return new Promise((resolve) => {
    if (!window.google?.maps?.DirectionsService) {
      resolve(null);
      return;
    }

    const prepared = samplePathForDirections(dedupePathPoints(points));
    if (prepared.length < 2) {
      resolve(null);
      return;
    }

    const origin = prepared[0];
    const destination = prepared[prepared.length - 1];
    const middle = prepared.slice(1, -1).slice(0, MAX_DIRECTIONS_WAYPOINTS);
    const waypoints = middle.map((p) => ({
      location: { lat: p.lat, lng: p.lng },
      stopover: false,
    }));

    const service = new window.google.maps.DirectionsService();
    service.route(
      {
        origin,
        destination,
        waypoints,
        travelMode: window.google.maps.TravelMode.DRIVING,
        optimizeWaypoints: false,
        provideRouteAlternatives: false,
      },
      (result, status) => {
        if (status !== window.google.maps.DirectionsStatus.OK) {
          resolve(null);
          return;
        }
        const overview = result.routes?.[0]?.overview_path;
        if (!overview?.length) {
          resolve(null);
          return;
        }
        resolve(overview.map(latLngToPoint));
      }
    );
  });
}

function appendSegment(merged, segment) {
  if (!segment?.length) return;
  if (!merged.length) {
    merged.push(...segment);
    return;
  }
  const start = segment[0];
  const prev = merged[merged.length - 1];
  const skipFirst =
    Math.abs(prev.lat - start.lat) < 1e-7 && Math.abs(prev.lng - start.lng) < 1e-7;
  merged.push(...(skipFirst ? segment.slice(1) : segment));
}

/**
 * Snap a GPS breadcrumb trail to drivable roads using Google Directions overview_path.
 * Falls back to the original points if Directions is unavailable or fails.
 */
export async function fetchRoadRoutePath(tripPath) {
  const normalized = dedupePathPoints(normalizePathPoints(tripPath));
  if (normalized.length < 2) return normalized;
  if (!window.google?.maps?.DirectionsService) return normalized;

  if (normalized.length <= MAX_DIRECTIONS_LOCATIONS) {
    const road = await requestDrivingRoute(normalized);
    return road?.length >= 2 ? road : normalized;
  }

  const merged = [];
  const step = MAX_DIRECTIONS_LOCATIONS - 1;

  for (let i = 0; i < normalized.length - 1; i += step) {
    const chunk = normalized.slice(i, i + MAX_DIRECTIONS_LOCATIONS);
    if (chunk.length < 2) break;
    const road = await requestDrivingRoute(chunk);
    appendSegment(merged, road?.length >= 2 ? road : chunk);
  }

  return merged.length >= 2 ? merged : normalized;
}
