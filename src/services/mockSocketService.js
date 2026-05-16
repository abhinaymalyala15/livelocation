/**
 * Mock realtime layer for demo (no Socket.io server required).
 * Replace connect/emit with socket.io-client when a backend exists.
 */

let connected = false;
const listeners = new Map();

function emitLocal(event, payload) {
  (listeners.get(event) || []).forEach((cb) => cb(payload));
}

export const mockSocket = {
  connect() {
    if (connected) return Promise.resolve();
    return new Promise((resolve) => {
      setTimeout(() => {
        connected = true;
        emitLocal("connect");
        resolve();
      }, 400);
    });
  },

  disconnect() {
    connected = false;
    emitLocal("disconnect");
  },

  isConnected() {
    return connected;
  },

  on(event, callback) {
    if (!listeners.has(event)) listeners.set(event, new Set());
    listeners.get(event).add(callback);
    return () => listeners.get(event)?.delete(callback);
  },

  emit(event, payload) {
    if (!connected && event !== "connect") return;
    emitLocal(event, payload);
    if (event === "locationUpdate") {
      setTimeout(() => emitLocal("locationAck", { ok: true, ...payload }), 80);
    }
    if (event === "emergencyAlert") {
      setTimeout(() => emitLocal("emergencyAck", { ok: true }), 200);
    }
  },
};
