import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/AuthContext";
import { acquireTrackingSocket, releaseTrackingSocket, getTrackingSocket } from "@/services/socketService";
import { patchVehicleFromLiveUpdate } from "@/lib/liveVehicleUpdate";
import { toast } from "sonner";

/** Admin: patch vehicle cache from server Socket.IO (no snapshot reload). */
export default function useAdminFleetLive({ enabled = true } = {}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [lastLiveAt, setLastLiveAt] = useState(null);
  const [connected, setConnected] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);

  useEffect(() => {
    if (!enabled || user?.role !== "admin") return undefined;

    let detach = () => {};

    acquireTrackingSocket({ role: "admin" })
      .then((socket) => {
        const onLocation = (payload) => {
          setLastLiveAt(payload.timestamp || new Date().toISOString());
          queryClient.setQueryData(["admin-vehicles"], (prev = []) =>
            patchVehicleFromLiveUpdate(prev, payload)
          );
        };

        const onFleetState = (states) => {
          if (Array.isArray(states)) states.forEach(onLocation);
        };

        const onOffline = ({ vehicleId, timestamp }) => {
          queryClient.setQueryData(["admin-vehicles"], (prev = []) =>
            prev.map((v) =>
              v.id === vehicleId
                ? { ...v, _socketOnline: false, last_location_update: timestamp || v.last_location_update }
                : v
            )
          );
        };

        const onConnect = () => {
          setConnected(true);
          setReconnecting(false);
        };
        const onDisconnect = () => setConnected(false);
        const onReconnect = () => setReconnecting(true);

        socket.on("locationUpdate", onLocation);
        socket.on("fleetLiveState", onFleetState);
        socket.on("vehicleOffline", onOffline);
        socket.on("emergencyAlert", (payload) => {
          toast.error(`Emergency alert from ${payload.driverId || "driver"}`, { duration: 10000 });
        });
        socket.on("connect", onConnect);
        socket.on("disconnect", onDisconnect);
        socket.io?.on("reconnect_attempt", onReconnect);
        setConnected(socket.connected);

        detach = () => {
          socket.off("locationUpdate", onLocation);
          socket.off("fleetLiveState", onFleetState);
          socket.off("vehicleOffline", onOffline);
          socket.off("emergencyAlert");
          socket.off("connect", onConnect);
          socket.off("disconnect", onDisconnect);
          socket.io?.off("reconnect_attempt", onReconnect);
        };
      })
      .catch(() => setConnected(false));

    return () => {
      detach();
      releaseTrackingSocket();
    };
  }, [enabled, user?.role, queryClient]);

  return { connected, reconnecting, lastLiveAt };
}
