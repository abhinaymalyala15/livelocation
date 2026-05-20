import { useEffect, useRef } from "react";
import { useGoogleMap } from "@react-google-maps/api";
import { haversineMeters } from "@/lib/geo";

const MIN_MS = 450;
const MAX_MS = 2400;
const MS_PER_METER = 55;

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function durationForMoveMeters(meters) {
  if (!Number.isFinite(meters) || meters <= 0) return MIN_MS;
  return Math.min(MAX_MS, Math.max(MIN_MS, meters * MS_PER_METER));
}

/** Smoothly interpolates marker between GPS fixes (premium realtime feel) */
export default function AnimatedVehicleMarker({
  position,
  icon,
  title,
  onClick,
  zIndex = 1,
}) {
  const map = useGoogleMap();
  const markerRef = useRef(null);
  const currentRef = useRef(position);
  const rafRef = useRef(null);
  const clickRef = useRef(onClick);
  clickRef.current = onClick;

  useEffect(() => {
    if (!map || !window.google?.maps || !position) return;

    if (!markerRef.current) {
      currentRef.current = { lat: position.lat, lng: position.lng };
      markerRef.current = new window.google.maps.Marker({
        map,
        position: currentRef.current,
        icon,
        title,
        optimized: false,
        zIndex,
      });
      markerRef.current.addListener("click", () => clickRef.current?.());
      return () => {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        markerRef.current?.setMap(null);
        markerRef.current = null;
      };
    }

    markerRef.current.setMap(map);
    return undefined;
  }, [map, position?.lat, position?.lng]);

  useEffect(() => {
    markerRef.current?.setIcon(icon);
    markerRef.current?.setTitle(title ?? "");
    markerRef.current?.setZIndex(zIndex);
  }, [icon, title, zIndex]);

  useEffect(() => {
    if (!markerRef.current || !position) return;

    const target = { lat: position.lat, lng: position.lng };
    const start = { ...currentRef.current };

    const dist = haversineMeters(start.lat, start.lng, target.lat, target.lng);
    if (dist < 0.5) {
      currentRef.current = target;
      markerRef.current.setPosition(target);
      return;
    }

    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    const duration = durationForMoveMeters(dist);
    const t0 = performance.now();

    const step = (now) => {
      const t = Math.min(1, (now - t0) / duration);
      const eased = easeInOutCubic(t);
      currentRef.current = {
        lat: start.lat + (target.lat - start.lat) * eased,
        lng: start.lng + (target.lng - start.lng) * eased,
      };
      markerRef.current?.setPosition(currentRef.current);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        currentRef.current = target;
        rafRef.current = null;
      }
    };

    rafRef.current = requestAnimationFrame(step);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [position?.lat, position?.lng]);

  return null;
}
