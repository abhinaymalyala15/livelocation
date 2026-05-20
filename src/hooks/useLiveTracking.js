import { useState, useEffect, useRef, useCallback } from "react";
import {
  metersToAccumulate,
  shouldSendLocationUpdate,
  isValidGpsCoordinate,
  GPS_WATCH_OPTIONS,
} from "@/lib/geo";
import { sendLocationUpdate } from "@/services/trackingService";
import { fleetApi } from "@/api/fleetApi";

/**
 * Real GPS via watchPosition (not setInterval).
 * Server/socket updates only when moved ≥20m, speed, or heading changes significantly.
 */
export default function useLiveTracking({
  enabled,
  driverId,
  vehicleId,
  tripId,
  onEvent,
  onDistanceChange,
}) {
  const [position, setPosition] = useState(null);
  const [tripPath, setTripPath] = useState([]);
  const [tripDistanceKm, setTripDistanceKm] = useState(0);
  const [error, setError] = useState(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [lastSentAt, setLastSentAt] = useState(null);
  const [gpsAcquiring, setGpsAcquiring] = useState(false);
  const [watchSession, setWatchSession] = useState(0);

  const lastSentRef = useRef(null);
  const lastDistanceAnchorRef = useRef(null);
  const lastSyncKmRef = useRef(0);
  const watchIdRef = useRef(null);
  const [lastFixAt, setLastFixAt] = useState(null);
  const onEventRef = useRef(onEvent);
  const onDistanceChangeRef = useRef(onDistanceChange);
  onEventRef.current = onEvent;
  onDistanceChangeRef.current = onDistanceChange;

  const resetPath = useCallback(() => {
    lastSentRef.current = null;
    lastDistanceAnchorRef.current = null;
    lastSyncKmRef.current = 0;
    setTripPath([]);
    setTripDistanceKm(0);
    setLastFixAt(null);
    setGpsAcquiring(true);
  }, []);

  const retryGps = useCallback(() => {
    setError(null);
    setPermissionDenied(false);
    setGpsAcquiring(true);
    setWatchSession((n) => n + 1);
  }, []);

  const syncTripDistance = useCallback(
    async (km) => {
      if (!tripId || km <= 0) return;
      try {
        await fleetApi.trips.update(tripId, { distance_km: Number(km.toFixed(3)) });
      } catch {
        /* retry when distance changes again */
      }
    },
    [tripId]
  );

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

      if (!isValidGpsCoordinate(coords.latitude, coords.longitude)) return;

      setPosition(coords);
      setLastFixAt(coords.timestamp);
      setGpsAcquiring(false);
      setError(null);

      if (enabled && vehicleId) {
        const anchor = lastDistanceAnchorRef.current;
        const meters = metersToAccumulate(anchor, coords);

        if (!anchor) {
          lastDistanceAnchorRef.current = coords;
        } else if (meters > 0) {
          lastDistanceAnchorRef.current = coords;
          setTripDistanceKm((d) => {
            const next = d + meters / 1000;
            onDistanceChangeRef.current?.({
              tripDistanceKm: next,
              addedMeters: meters,
              timestamp: coords.timestamp,
            });
            return next;
          });
        }
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
          saveLog: true,
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
    if (!enabled || !tripId || tripDistanceKm <= 0) return undefined;
    if (Math.abs(tripDistanceKm - lastSyncKmRef.current) < 0.05) return undefined;

    const timer = setTimeout(() => {
      lastSyncKmRef.current = tripDistanceKm;
      syncTripDistance(tripDistanceKm);
    }, 5000);

    return () => clearTimeout(timer);
  }, [tripDistanceKm, tripId, enabled, syncTripDistance]);

  useEffect(() => {
    if (!enabled) {
      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      setGpsAcquiring(false);
      return;
    }

    if (!navigator.geolocation) {
      setError("Geolocation is not supported.");
      setGpsAcquiring(false);
      return;
    }

    resetPath();
    onEventRef.current?.({ type: "tracking_started" });

    watchIdRef.current = navigator.geolocation.watchPosition(
      (fix) => processFix(fix),
      (err) => {
        setGpsAcquiring(false);
        if (err.code === 1) {
          setPermissionDenied(true);
          setError("Location permission denied.");
        } else if (err.code === 2) {
          setError("GPS unavailable.");
        } else {
          setError("GPS request timed out.");
        }
      },
      GPS_WATCH_OPTIONS
    );

    return () => {
      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [enabled, processFix, resetPath, watchSession]);

  return {
    position,
    tripPath,
    tripDistanceKm,
    distanceKm: tripDistanceKm,
    error,
    permissionDenied,
    lastSentAt,
    lastFixAt,
    gpsAcquiring,
    resetPath,
    syncTripDistance,
    retryGps,
  };
}
