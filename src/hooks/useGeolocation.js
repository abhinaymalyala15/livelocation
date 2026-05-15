import { useState, useEffect, useRef, useCallback } from "react";

export default function useGeolocation(enabled = false, intervalMs = 3000) {
  const [position, setPosition] = useState(null);
  const [error, setError] = useState(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const watchIdRef = useRef(null);

  const startWatching = useCallback(() => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by this browser.");
      return;
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setPosition({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          speed: pos.coords.speed ? (pos.coords.speed * 3.6) : 0, // m/s to km/h
          heading: pos.coords.heading || 0,
          accuracy: pos.coords.accuracy,
          timestamp: new Date().toISOString(),
        });
        setError(null);
        setPermissionDenied(false);
      },
      (err) => {
        if (err.code === 1) {
          setPermissionDenied(true);
          setError("Location permission denied. Please enable GPS access.");
        } else if (err.code === 2) {
          setError("Location unavailable. Please check your GPS.");
        } else {
          setError("Location request timed out.");
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  }, []);

  const stopWatching = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (enabled) {
      startWatching();
    } else {
      stopWatching();
    }
    return stopWatching;
  }, [enabled, startWatching, stopWatching]);

  return { position, error, permissionDenied };
}