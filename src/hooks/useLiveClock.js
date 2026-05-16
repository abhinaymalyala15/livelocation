import { useState, useEffect } from "react";
import moment from "moment";

/** Re-renders every second so relative timestamps stay fresh */
export default function useLiveClock(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  return now;
}

export function formatLastUpdated(isoString, now = Date.now()) {
  if (!isoString) return "Never";
  const diffSec = Math.max(0, Math.floor((now - new Date(isoString).getTime()) / 1000));
  if (diffSec < 5) return "Just now";
  if (diffSec < 60) return `${diffSec} sec ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} min ago`;
  return moment(isoString).fromNow();
}
