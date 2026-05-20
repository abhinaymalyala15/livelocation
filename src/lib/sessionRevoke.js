/** Fired when this device was signed out because the driver logged in elsewhere */
const listeners = new Set();

export function onSessionRevoked(handler) {
  listeners.add(handler);
  return () => listeners.delete(handler);
}

export function emitSessionRevoked(detail = {}) {
  for (const fn of listeners) {
    try {
      fn(detail);
    } catch (e) {
      console.error("sessionRevoked handler", e);
    }
  }
}
