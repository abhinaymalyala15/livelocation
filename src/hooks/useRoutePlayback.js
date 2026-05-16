import { useState, useEffect, useRef, useCallback, useMemo } from "react";

const POINTS_PER_SECOND = 1.2;

function lerpPoint(a, b, t) {
  if (!a) return b;
  if (!b) return a;
  return {
    lat: a.lat + (b.lat - a.lat) * t,
    lng: a.lng + (b.lng - a.lng) * t,
    timestamp: a.timestamp,
    speed: a.speed,
  };
}

/** Animate along a GPS path with play/pause and scrubbing */
export default function useRoutePlayback(path) {
  const [progress, setProgress] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const rafRef = useRef(null);
  const lastTickRef = useRef(0);

  const maxProgress = Math.max(0, path.length - 1);

  useEffect(() => {
    setProgress(0);
    setPlaying(false);
  }, [path]);

  useEffect(() => {
    if (!playing || path.length < 2) return;

    lastTickRef.current = performance.now();

    const tick = (now) => {
      const dt = (now - lastTickRef.current) / 1000;
      lastTickRef.current = now;

      setProgress((p) => {
        const next = p + dt * POINTS_PER_SECOND * speed;
        if (next >= maxProgress) {
          setPlaying(false);
          return maxProgress;
        }
        return next;
      });

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [playing, speed, path.length, maxProgress]);

  const currentPosition = useMemo(() => {
    if (path.length === 0) return null;
    if (path.length === 1) return path[0];
    const idx = Math.min(Math.floor(progress), path.length - 2);
    const frac = Math.min(1, progress - idx);
    return lerpPoint(path[idx], path[idx + 1], frac);
  }, [path, progress]);

  const visiblePath = useMemo(() => {
    if (path.length === 0) return [];
    const end = Math.min(path.length, Math.ceil(progress) + 1);
    return path.slice(0, end);
  }, [path, progress]);

  const playbackPercent = maxProgress > 0 ? (progress / maxProgress) * 100 : 0;

  const play = useCallback(() => {
    if (path.length < 2) return;
    if (progress >= maxProgress) setProgress(0);
    setPlaying(true);
  }, [path.length, progress, maxProgress]);

  const pause = useCallback(() => setPlaying(false), []);

  const reset = useCallback(() => {
    setPlaying(false);
    setProgress(0);
  }, []);

  const seek = useCallback(
    (percent) => {
      const p = (Math.max(0, Math.min(100, percent)) / 100) * maxProgress;
      setProgress(p);
    },
    [maxProgress]
  );

  const currentPointIndex = Math.min(Math.floor(progress), path.length - 1);

  return {
    progress,
    playing,
    speed,
    setSpeed,
    play,
    pause,
    reset,
    seek,
    currentPosition,
    visiblePath,
    playbackPercent,
    currentPointIndex,
    pointCount: path.length,
    maxProgress,
  };
}
