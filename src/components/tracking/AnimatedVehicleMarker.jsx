import { useEffect, useRef } from "react";
import { useGoogleMap } from "@react-google-maps/api";

const ANIMATION_MS = 750;

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

/** Smoothly interpolates marker position when GPS updates */
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
      if (onClick) {
        markerRef.current.addListener("click", onClick);
      }
      return () => {
        markerRef.current?.setMap(null);
        markerRef.current = null;
      };
    }

    markerRef.current.setMap(map);
    return undefined;
  }, [map]);

  useEffect(() => {
    markerRef.current?.setIcon(icon);
    markerRef.current?.setTitle(title ?? "");
    markerRef.current?.setZIndex(zIndex);
  }, [icon, title, zIndex]);

  useEffect(() => {
    if (!markerRef.current || !position) return;

    const target = { lat: position.lat, lng: position.lng };
    const start = { ...currentRef.current };

    if (
      Math.abs(start.lat - target.lat) < 1e-7 &&
      Math.abs(start.lng - target.lng) < 1e-7
    ) {
      return;
    }

    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    const t0 = performance.now();

    const step = (now) => {
      const t = Math.min(1, (now - t0) / ANIMATION_MS);
      const eased = easeOutCubic(t);
      currentRef.current = {
        lat: start.lat + (target.lat - start.lat) * eased,
        lng: start.lng + (target.lng - start.lng) * eased,
      };
      markerRef.current?.setPosition(currentRef.current);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(step);
      }
    };

    rafRef.current = requestAnimationFrame(step);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [position?.lat, position?.lng]);

  return null;
}
