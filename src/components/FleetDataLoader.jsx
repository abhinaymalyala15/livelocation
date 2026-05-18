import { useEffect, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { loadFleetData, reloadFleetData } from "@/api/persist";
import Loader from "@/components/tracking/Loader";

/**
 * Loads fleet data for authenticated routes only.
 * Initial load shows a spinner; reloads after login run in the background.
 */
export default function FleetDataLoader({ children }) {
  const { isAuthenticated, user, isLoadingAuth } = useAuth();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (isLoadingAuth) return undefined;

    let cancelled = false;

    const load = async () => {
      try {
        const result =
          isAuthenticated && user?.email
            ? await reloadFleetData()
            : await loadFleetData();
        if (!cancelled) {
          if (import.meta.env.DEV) {
            document.body.dataset.fleetDataSource = result.source;
          }
          setReady(true);
        }
      } catch (e) {
        console.warn("[FleetDataLoader] load failed", e);
        if (!cancelled) {
          setReady(true);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [isLoadingAuth, isAuthenticated, user?.email]);

  if (isLoadingAuth || !ready) {
    return <Loader text="Loading fleet database..." />;
  }

  return children;
}
