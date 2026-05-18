import { getStorageData, setStorageData, getDefaultStorage } from "./mockData";

const STORAGE_KEY = "fleettrack_db_v1";
const API_BASE = "/api";

let dbAvailable = null;

function fetchWithTimeout(url, options = {}, ms = 15000) {
  return fetch(url, { ...options, signal: AbortSignal.timeout(ms) });
}

export async function checkDatabaseHealth() {
  try {
    const res = await fetchWithTimeout(`${API_BASE}/health`, {}, 5000);
    if (!res.ok) return false;
    const body = await res.json();
    dbAvailable = !!body.ok;
    return dbAvailable;
  } catch {
    dbAvailable = false;
    return false;
  }
}

export function isDatabaseOnline() {
  return dbAvailable === true;
}

/** Reload from server after login so saved vehicles/trips appear */
export async function reloadFleetData() {
  return loadFleetData({ forceServer: true });
}

/** Load fleet data: SQLite API first, then localStorage, then defaults */
export async function loadFleetData(options = {}) {
  const { forceServer = false } = options;
  const online = await checkDatabaseHealth();

  if (online) {
    dbAvailable = true;
    try {
      const res = await fetchWithTimeout(`${API_BASE}/data`, {}, 20000);
      if (res.ok) {
        const data = await res.json();
        const hasFleet =
          (data.vehicles?.length ?? 0) > 0 ||
          (data.trips?.length ?? 0) > 0 ||
          (data.locationLogs?.length ?? 0) > 0;

        if (!hasFleet && !forceServer) {
          try {
            const local = localStorage.getItem(STORAGE_KEY);
            if (local) {
              const localData = JSON.parse(local);
              const localHas =
                (localData.vehicles?.length ?? 0) > 0 ||
                (localData.trips?.length ?? 0) > 0;
              if (localHas) {
                setStorageData(localData);
                await persistFleetData(localData);
                return { source: "localStorage-synced", data: localData };
              }
            }
          } catch (e) {
            console.warn("[persist] local merge failed", e);
          }
        }

        setStorageData(data);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        return { source: "database", data };
      }
    } catch (e) {
      console.warn("[persist] API load failed", e);
      dbAvailable = false;
    }
  }

  try {
    const local = localStorage.getItem(STORAGE_KEY);
    if (local) {
      const data = JSON.parse(local);
      setStorageData(data);
      if (online) await persistFleetData(data);
      return { source: "localStorage", data };
    }
  } catch (e) {
    console.warn("[persist] localStorage load failed", e);
  }

  const data = getDefaultStorage();
  setStorageData(data);
  return { source: "default", data };
}

/** Save after every driver/admin mutation — always retry server (don't skip after one failed health check) */
export async function persistFleetData(data = getStorageData()) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn("[persist] localStorage save failed", e);
  }

  try {
    const res = await fetch(`${API_BASE}/data`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      dbAvailable = true;
      return { savedLocal: true, savedDb: true };
    }
    console.warn("[persist] database PUT failed", res.status);
    dbAvailable = false;
  } catch (e) {
    console.warn("[persist] database save failed", e);
    dbAvailable = false;
  }

  return { savedLocal: true, savedDb: false };
}

/** Index one GPS row in SQLite for driver verification queries */
export async function persistLocationLog(log, driverEmail) {
  const payload = { ...log, driver_email: driverEmail };
  await persistFleetData();

  try {
    await fetch(`${API_BASE}/location-logs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (e) {
    console.warn("[persist] location log index failed", e);
  }
}

export async function persistTrip(trip, isNew = false) {
  await persistFleetData();

  try {
    const url = isNew ? `${API_BASE}/trips` : `${API_BASE}/trips/${trip.id}`;
    await fetch(url, {
      method: isNew ? "POST" : "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(trip),
    });
  } catch (e) {
    console.warn("[persist] trip index failed", e);
  }
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
