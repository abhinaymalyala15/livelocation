import { useState, useEffect } from "react";
import {
  connectTrackingSocket,
  disconnectTrackingSocket,
  mockSocket,
} from "@/services/trackingService";

/** Mock realtime connection state (swap for socket.io-client when backend exists). */
export default function useSocketTracking() {
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    let cancelled = false;
    connectTrackingSocket().then(() => {
      if (!cancelled) setConnected(mockSocket.isConnected());
    });

    const offConnect = mockSocket.on("connect", () => setConnected(true));
    const offDisconnect = mockSocket.on("disconnect", () => setConnected(false));

    return () => {
      cancelled = true;
      offConnect();
      offDisconnect();
      disconnectTrackingSocket();
    };
  }, []);

  return connected;
}
