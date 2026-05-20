import { io } from "socket.io-client";
import { getAuthToken } from "@/api/authApi";
import { emitSessionRevoked } from "@/lib/sessionRevoke";

let socket = null;
let refCount = 0;
let revokeListenerAttached = false;

function attachRevokeListener(sock) {
  if (revokeListenerAttached || !sock) return;
  revokeListenerAttached = true;
  sock.on("session:revoked", (payload) => {
    emitSessionRevoked({ reason: payload?.reason || "logged_in_elsewhere", source: "socket" });
  });
}

export function getTrackingSocket() {
  return socket;
}

export function acquireTrackingSocket({ role, vehicleId, driverId } = {}) {
  refCount += 1;
  const token = getAuthToken();

  if (!socket) {
    socket = io({
      path: "/socket.io",
      autoConnect: false,
      auth: { token },
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      transports: ["websocket", "polling"],
    });
    attachRevokeListener(socket);
  } else {
    socket.auth = { token };
  }

  return new Promise((resolve, reject) => {
    const register = () => {
      if (role === "driver") {
        socket.emit("session:register", { vehicleId, driverId });
      }
      resolve(socket);
    };

    if (socket.connected) {
      register();
      return;
    }

    const onConnect = () => {
      socket.off("connect_error", onError);
      register();
    };
    const onError = (err) => {
      socket.off("connect", onConnect);
      reject(err);
    };

    socket.once("connect", onConnect);
    socket.once("connect_error", onError);
    socket.connect();
  });
}

export function releaseTrackingSocket() {
  refCount = Math.max(0, refCount - 1);
  if (refCount === 0 && socket) {
    socket.disconnect();
    socket = null;
    revokeListenerAttached = false;
  }
}
