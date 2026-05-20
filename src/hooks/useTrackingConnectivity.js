import { useEffect, useState, useMemo } from "react";
import { LIVE_STALE_MS } from "@/lib/vehicleStatus";

/**
 * Production-style connectivity: browser network + socket + GPS health.
 */
export default function useTrackingConnectivity({
  trackingEnabled = false,
  gpsError = null,
  permissionDenied = false,
  lastFixAt = null,
  hasPosition = false,
  socketConnected = false,
  socketReconnecting = false,
}) {
  const [online, setOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );

  useEffect(() => {
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  return useMemo(() => {
    const gpsStale =
      trackingEnabled &&
      lastFixAt &&
      Date.now() - new Date(lastFixAt).getTime() > LIVE_STALE_MS;

    const gpsUnavailable = !!gpsError || permissionDenied;
    const gpsOk =
      !trackingEnabled ||
      (hasPosition && !gpsUnavailable && !gpsStale);

    const networkOk = online && socketConnected;

    let status = "online";
    let message = "Tracking active";

    if (!trackingEnabled) {
      status = "idle";
      message = "Start a trip to begin tracking";
    } else if (socketReconnecting) {
      status = "reconnecting";
      message = "Reconnecting to fleet server…";
    } else if (!online) {
      status = "no_network";
      message = "No internet connection — updates will resume when online";
    } else if (!socketConnected) {
      status = "socket_offline";
      message = "Disconnected from server — retrying connection…";
    } else if (gpsUnavailable) {
      status = "gps_error";
      message = gpsError || "GPS unavailable — enable location access";
    } else if (gpsStale) {
      status = "gps_stale";
      message = "GPS signal weak — waiting for location fix…";
    } else if (!hasPosition) {
      status = "gps_waiting";
      message = "Acquiring GPS fix…";
    }

    const isOffline =
      trackingEnabled &&
      (status === "no_network" ||
        status === "socket_offline" ||
        status === "gps_error" ||
        status === "gps_stale" ||
        status === "gps_waiting" ||
        status === "reconnecting");

    return {
      online,
      gpsOk,
      networkOk,
      isOffline,
      status,
      message,
      canRetry: trackingEnabled && (gpsUnavailable || gpsStale || status === "gps_waiting"),
    };
  }, [
    trackingEnabled,
    gpsError,
    permissionDenied,
    lastFixAt,
    hasPosition,
    socketConnected,
    socketReconnecting,
    online,
  ]);
}
