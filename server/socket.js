import { Server } from "socket.io";
import { getUserByToken } from "./auth.js";
import { listVehicles, toLivePayload } from "./fleetRepository.js";

const STALE_MS = 12_000;
const liveSessions = new Map();

export function initTrackingSocket(httpServer) {
  const io = new Server(httpServer, {
    path: "/socket.io",
    cors: { origin: true, credentials: true },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("Authentication required"));
    const user = getUserByToken(token);
    if (!user) return next(new Error("Invalid session"));
    socket.user = user;
    next();
  });

  io.on("connection", (socket) => {
    const role = socket.user.role;
    socket.data.role = role;

    if (role === "admin") {
      socket.join("admins");
      const states = listVehicles()
        .filter((v) => v.last_location_update)
        .map((v) => toLivePayload(v, v.driver_email, v.current_trip_id));
      socket.emit("fleetLiveState", states);
    }

    if (role === "driver") {
      socket.join("drivers");
      const activeToken = socket.handshake.auth?.token;
      for (const other of io.sockets.sockets.values()) {
        if (other.id === socket.id) continue;
        if (other.user?.role !== "driver") continue;
        if (other.user?.email !== socket.user.email) continue;
        if (other.handshake.auth?.token !== activeToken) {
          other.emit("session:revoked", { reason: "logged_in_elsewhere" });
          other.disconnect(true);
        }
      }
    }

    socket.on("session:register", ({ vehicleId, driverId } = {}) => {
      if (role !== "driver") return;
      socket.data.vehicleId = vehicleId;
      socket.data.driverId = driverId || socket.user.email;
      if (vehicleId) socket.join(`vehicle:${vehicleId}`);
    });

    socket.on("emergencyAlert", (payload) => {
      io.to("admins").emit("emergencyAlert", {
        ...payload,
        receivedAt: new Date().toISOString(),
      });
    });

    socket.on("disconnect", () => {
      if (socket.data.vehicleId) {
        liveSessions.delete(socket.data.vehicleId);
      }
    });
  });

  setInterval(() => {
    const now = Date.now();
    for (const [vehicleId, session] of liveSessions) {
      if (now - session.lastSeenAt > STALE_MS && session.online) {
        session.online = false;
        io.to("admins").emit("vehicleOffline", {
          vehicleId,
          timestamp: new Date(session.lastSeenAt).toISOString(),
        });
      }
    }
  }, 4000);

  function revokeDriverSockets(driverEmail, activeToken) {
    const email = String(driverEmail).trim().toLowerCase();
    for (const socket of io.sockets.sockets.values()) {
      if (socket.user?.role !== "driver") continue;
      if (String(socket.user?.email || "").toLowerCase() !== email) continue;
      if (socket.handshake.auth?.token === activeToken) continue;
      socket.emit("session:revoked", { reason: "logged_in_elsewhere" });
      socket.disconnect(true);
    }
  }

  return {
    io,
    revokeDriverSockets,
    broadcastLocation(io, payload) {
      liveSessions.set(payload.vehicleId, {
        ...payload,
        lastSeenAt: Date.now(),
        online: true,
      });
      io.to("admins").emit("locationUpdate", payload);
    },
  };
}
