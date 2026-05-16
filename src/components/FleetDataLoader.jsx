import { useEffect, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { loadFleetData, reloadFleetData } from "@/api/persist";
import Loader from "@/components/tracking/Loader";

export default function FleetDataLoader({ children }) {
  const { isAuthenticated, user, isLoadingAuth } = useAuth();
  const [ready, setReady] = useState(false);
  const [source, setSource] = useState("");

  useEffect(() => {
    let cancelled = false;
    setReady(false);

    const load = async () => {
      const result = isAuthenticated && user?.email
        ? await reloadFleetData()
        : await loadFleetData();
      if (!cancelled) {
        setSource(result.source);
        setReady(true);
      }
    };

    if (!isLoadingAuth) {
      load();
    }

    return () => {
      cancelled = true;
    };
  }, [isLoadingAuth, isAuthenticated, user?.email]);

  if (!ready || isLoadingAuth) {
    return <Loader text="Loading fleet database..." />;
  }

  return (
    <>
      {import.meta.env.DEV && source && (
        <div className="sr-only" data-fleet-data-source={source} />
      )}
      {children}
    </>
  );
}
