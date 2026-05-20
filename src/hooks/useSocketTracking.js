import { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { acquireTrackingSocket, releaseTrackingSocket, getTrackingSocket } from "@/services/socketService";

/**
 * Realtime Socket.IO connection (reconnect + live/offline state).
 */
export default function useSocketTracking({ role, vehicleId, driverId, enabled = true } = {}) {
  const { user } = useAuth();
  const [connected, setConnected] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);

  const resolvedRole = role || user?.role;
  const resolvedDriverId = driverId || user?.email;

  useEffect(() => {
    if (!enabled || !resolvedRole) return undefined;

    let cancelled = false;

    acquireTrackingSocket({
      role: resolvedRole,
      vehicleId: resolvedRole === "driver" ? vehicleId : undefined,
      driverId: resolvedDriverId,
    })
      .then(() => {
        if (!cancelled) setConnected(getTrackingSocket()?.connected ?? false);
      })
      .catch(() => {
        if (!cancelled) setConnected(false);
      });

    const socket = getTrackingSocket();
    if (!socket) return () => releaseTrackingSocket();

    const onConnect = () => {
      setConnected(true);
      setReconnecting(false);
    };
    const onDisconnect = () => setConnected(false);
    const onReconnect = () => setReconnecting(true);

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.io?.on("reconnect_attempt", onReconnect);

    return () => {
      cancelled = true;
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.io?.off("reconnect_attempt", onReconnect);
      releaseTrackingSocket();
    };
  }, [enabled, resolvedRole, vehicleId, resolvedDriverId]);

  return { connected, reconnecting };
}
