import { useEffect, useState, useRef } from "react";

/** Smooth count-up for live distance / stats */
export default function useAnimatedNumber(target, { duration = 600, decimals = 2 } = {}) {
  const [display, setDisplay] = useState(target);
  const fromRef = useRef(target);
  const rafRef = useRef(null);

  useEffect(() => {
    const to = Number(target) || 0;
    const from = fromRef.current;
    if (Math.abs(to - from) < 0.001) {
      setDisplay(to);
      fromRef.current = to;
      return undefined;
    }

    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    const t0 = performance.now();

    const tick = (now) => {
      const t = Math.min(1, (now - t0) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const value = from + (to - from) * eased;
      setDisplay(value);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = to;
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [target, duration]);

  return Number(display).toFixed(decimals);
}
