const API_BASE = "/api";

/** Backend availability check — fleet data is loaded per-request via /api/fleet, not localStorage */
export async function checkDatabaseHealth() {
  try {
    const res = await fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return false;
    const body = await res.json();
    return !!body.ok;
  } catch {
    return false;
  }
}

export async function reloadFleetData() {
  const ok = await checkDatabaseHealth();
  return { source: ok ? "database" : "offline", data: null };
}

export async function loadFleetData() {
  return reloadFleetData();
}

export async function fetchDriverStorageDebug(driverEmail) {
  try {
    const res = await fetch(`${API_BASE}/debug/driver/${encodeURIComponent(driverEmail)}`);
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}
