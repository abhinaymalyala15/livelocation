import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';

/** Build route from trip start/end when GPS logs are missing */
export function buildFallbackPath(trip) {
  if (!trip) return [];
  const points = [];
  if (trip.start_lat != null && trip.start_lng != null) {
    points.push({ lat: trip.start_lat, lng: trip.start_lng });
  }
  if (trip.end_lat != null && trip.end_lng != null) {
    points.push({ lat: trip.end_lat, lng: trip.end_lng });
  }
  return points;
}

export default function useTripRoutePath(trip) {
  const [path, setPath] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!trip?.id) {
      setPath([]);
      return;
    }

    let cancelled = false;
    setLoading(true);

    base44.entities.LocationLog
      .filter({ trip_id: trip.id }, 'timestamp', 1000)
      .then((logs) => {
        if (cancelled) return;
        const sorted = [...logs]
          .filter((l) => l.latitude != null && l.longitude != null)
          .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

        const fromLogs = sorted.map((l) => ({
          lat: l.latitude,
          lng: l.longitude,
          timestamp: l.timestamp,
          speed: l.speed,
        }));

        if (fromLogs.length > 0) {
          setPath(fromLogs);
        } else {
          setPath(buildFallbackPath(trip));
        }
      })
      .catch(() => {
        if (!cancelled) setPath(buildFallbackPath(trip));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [trip?.id, trip?.status, trip?.updated_date]);

  return { path, loading, pointCount: path.length };
}
