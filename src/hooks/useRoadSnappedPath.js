import { useEffect, useMemo, useRef, useState } from "react";
import { useGoogleMaps } from "@/components/GoogleMapsProvider";
import { fetchRoadRoutePath, normalizePathPoints } from "@/lib/roadRoutePath";

/**
 * Debounced road snapping for trip polylines (Google Directions API).
 * Shows raw GPS path immediately, then replaces with road-aligned path when ready.
 */
export default function useRoadSnappedPath(tripPath, { enabled = true, debounceMs = 600 } = {}) {
  const { isLoaded } = useGoogleMaps();
  const rawPath = useMemo(() => normalizePathPoints(tripPath), [tripPath]);

  const pathSignature = useMemo(() => {
    if (rawPath.length < 2) return "";
    const first = rawPath[0];
    const last = rawPath[rawPath.length - 1];
    return `${rawPath.length}|${first.lat.toFixed(5)},${first.lng.toFixed(5)}|${last.lat.toFixed(5)},${last.lng.toFixed(5)}`;
  }, [rawPath]);

  const [displayPath, setDisplayPath] = useState([]);
  const [isSnapped, setIsSnapped] = useState(false);
  const [snapping, setSnapping] = useState(false);
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (!enabled || rawPath.length < 2) {
      setDisplayPath(rawPath);
      setIsSnapped(false);
      setSnapping(false);
      return;
    }

    setDisplayPath(rawPath);
    setIsSnapped(false);

    if (!isLoaded) return;

    const requestId = ++requestIdRef.current;
    const timer = setTimeout(async () => {
      setSnapping(true);
      try {
        const road = await fetchRoadRoutePath(rawPath);
        if (requestIdRef.current !== requestId) return;
        if (road.length >= 2) {
          setDisplayPath(road);
          setIsSnapped(road.length >= 3);
        }
      } catch {
        if (requestIdRef.current === requestId) {
          setDisplayPath(rawPath);
          setIsSnapped(false);
        }
      } finally {
        if (requestIdRef.current === requestId) setSnapping(false);
      }
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [pathSignature, enabled, isLoaded, debounceMs, rawPath]);

  return {
    rawPath,
    displayPath: displayPath.length >= 2 ? displayPath : rawPath,
    isSnapped,
    snapping,
  };
}
