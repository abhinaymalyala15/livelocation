import { getStorageData, setStorageData, getDefaultStorage } from "./mockData";

const STORAGE_KEY = "fleettrack_db_v1";
const API_BASE = "/api";

let dbAvailable = null;

export async function checkDatabaseHealth() {
  try {
    const res = await fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(3000) });
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

/** Load fleet data: SQLite API first, then localStorage, then defaults */
export async function loadFleetData() {
  const online = await checkDatabaseHealth();

  if (online) {
    dbAvailable = true;
    try {
      const res = await fetch(`${API_BASE}/data`);
      if (res.ok) {
        const data = await res.json();
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

/** Save after every driver/admin mutation */
export async function persistFleetData(data = getStorageData()) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn("[persist] localStorage save failed", e);
  }

  if (dbAvailable === false) return { savedLocal: true, savedDb: false };

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

  if (dbAvailable === false) return;

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

  if (dbAvailable === false) return;

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
