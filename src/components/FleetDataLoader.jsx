import { useEffect, useState } from "react";
import { loadFleetData } from "@/api/persist";
import Loader from "@/components/tracking/Loader";

export default function FleetDataLoader({ children }) {
  const [ready, setReady] = useState(false);
  const [source, setSource] = useState("");

  useEffect(() => {
    loadFleetData().then((result) => {
      setSource(result.source);
      setReady(true);
    });
  }, []);

  if (!ready) {
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
