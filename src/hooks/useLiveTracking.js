import { useState, useEffect, useRef, useCallback } from "react";
import { haversineMeters, shouldSendLocationUpdate } from "@/lib/geo";
import { sendLocationUpdate } from "@/services/trackingService";

/**
 * GPS via watchPosition (not setInterval).
 * UI updates every fix; server/mock updates only after 20m move or speed change.
 */
export default function useLiveTracking({
  enabled,
  driverId,
  vehicleId,
  tripId,
  onEvent,
}) {
  const [position, setPosition] = useState(null);
  const [tripPath, setTripPath] = useState([]);
  const [distanceKm, setDistanceKm] = useState(0);
  const [error, setError] = useState(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [lastSentAt, setLastSentAt] = useState(null);

  const lastSentRef = useRef(null);
  const lastUiRef = useRef(null);
  const watchIdRef = useRef(null);
  const [lastFixAt, setLastFixAt] = useState(null);
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  const resetPath = useCallback(() => {
    lastSentRef.current = null;
    lastUiRef.current = null;
    setTripPath([]);
    setDistanceKm(0);
    setLastFixAt(null);
  }, []);

  const processFix = useCallback(
    async (pos) => {
      const coords = {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        speed: pos.coords.speed != null ? Math.max(0, pos.coords.speed * 3.6) : 0,
        heading: pos.coords.heading ?? 0,
        accuracy: pos.coords.accuracy ?? 0,
        timestamp: new Date().toISOString(),
      };

      setPosition(coords);
      setLastFixAt(coords.timestamp);

      if (enabled && vehicleId) {
        const uiPrev = lastUiRef.current;
        if (uiPrev) {
          const uiMeters = haversineMeters(
            uiPrev.latitude,
            uiPrev.longitude,
            coords.latitude,
            coords.longitude
          );
          if (uiMeters >= 2) {
            setDistanceKm((d) => d + uiMeters / 1000);
          }
        }
        lastUiRef.current = coords;
      }

      if (!enabled || !vehicleId) return;
      if (!shouldSendLocationUpdate(lastSentRef.current, coords)) return;

      setTripPath((path) => [
        ...path,
        { lat: coords.latitude, lng: coords.longitude, timestamp: coords.timestamp },
      ]);

      try {
        await sendLocationUpdate({
          driverId,
          vehicleId,
          tripId,
          ...coords,
          battery: null,
        });
        lastSentRef.current = coords;
        setLastSentAt(coords.timestamp);
        onEventRef.current?.({ type: "location_sent", payload: coords });
      } catch (e) {
        onEventRef.current?.({ type: "location_error", error: e });
      }
    },
    [enabled, driverId, vehicleId, tripId]
  );

  useEffect(() => {
    if (!enabled) {
      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      return;
    }

    if (!navigator.geolocation) {
      setError("Geolocation is not supported.");
      return;
    }

    resetPath();
    onEventRef.current?.({ type: "tracking_started" });

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => processFix(pos),
      (err) => {
        if (err.code === 1) {
          setPermissionDenied(true);
          setError("Location permission denied.");
        } else if (err.code === 2) {
          setError("GPS unavailable.");
        } else {
          setError("GPS request timed out.");
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );

    return () => {
      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [enabled, processFix, resetPath]);

  return {
    position,
    tripPath,
    distanceKm,
    error,
    permissionDenied,
    lastSentAt,
    lastFixAt,
    resetPath,
  };
}
