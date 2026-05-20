import { useEffect, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { checkDatabaseHealth } from "@/api/persist";
import Loader from "@/components/tracking/Loader";

/** Verifies backend is reachable before authenticated routes (data loads via /api/fleet per page). */
export default function FleetDataLoader({ children }) {
  const { isLoadingAuth } = useAuth();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (isLoadingAuth) return undefined;

    let cancelled = false;
    checkDatabaseHealth()
      .then((ok) => {
        if (!cancelled) {
          if (import.meta.env.DEV) {
            document.body.dataset.fleetBackend = ok ? "online" : "offline";
          }
          setReady(true);
        }
      })
      .catch(() => {
        if (!cancelled) setReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, [isLoadingAuth]);

  if (isLoadingAuth || !ready) {
    return <Loader text="Connecting to fleet server..." />;
  }

  return children;
}
