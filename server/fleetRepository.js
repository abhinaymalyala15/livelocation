import { db, getSnapshot, insertLocationLog, upsertTrip } from "./db.js";

const now = () => new Date().toISOString();

export function initFleetTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS vehicles (
      id TEXT PRIMARY KEY,
      payload TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS geofences (
      id TEXT PRIMARY KEY,
      payload TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS maintenance_logs (
      id TEXT PRIMARY KEY,
      payload TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS report_schedules (
      id TEXT PRIMARY KEY,
      payload TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_vehicles_updated ON vehicles(updated_at);
  `);

  const tripCols = db.prepare("PRAGMA table_info(trips)").all();
  if (!tripCols.some((c) => c.name === "meta")) {
    db.exec("ALTER TABLE trips ADD COLUMN meta TEXT");
  }

  migrateSnapshotToTables();
}

function parsePayload(row) {
  if (!row?.payload) return null;
  return JSON.parse(row.payload);
}

function migrateSnapshotToTables() {
  const vehicleCount = db.prepare("SELECT COUNT(*) AS c FROM vehicles").get()?.c ?? 0;
  if (vehicleCount > 0) return;

  const snapshot = getSnapshot();
  if (!snapshot) return;

  for (const v of snapshot.vehicles ?? []) upsertVehicleRecord(v);
  for (const g of snapshot.geofences ?? []) upsertGeofenceRecord(g);
  for (const m of snapshot.maintenance ?? []) upsertMaintenanceRecord(m);
  for (const r of snapshot.reportSchedules ?? []) upsertReportScheduleRecord(r);
  for (const t of snapshot.trips ?? []) upsertTrip(t);
  console.log("[fleet] Migrated legacy snapshot into SQLite tables");
}

function upsertVehicleRecord(vehicle) {
  db.prepare(
    `INSERT INTO vehicles (id, payload, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET payload = excluded.payload, updated_at = excluded.updated_at`
  ).run(vehicle.id, JSON.stringify(vehicle), vehicle.updated_date || vehicle.updated_at || now());
}

export function listVehicles({ driverEmail = null, sortBy = null, limit = null } = {}) {
  let rows = db.prepare("SELECT payload FROM vehicles").all().map(parsePayload);
  if (driverEmail) {
    const email = String(driverEmail).trim().toLowerCase();
    rows = rows.filter(
      (v) => String(v.driver_email || "").trim().toLowerCase() === email
    );
  }
  return sortAndLimit(rows, sortBy, limit);
}

export function getVehicle(id) {
  const row = db.prepare("SELECT payload FROM vehicles WHERE id = ?").get(id);
  return parsePayload(row);
}

export function createVehicle(data) {
  const vehicle = {
    id: data.id || `vehicle_${Date.now()}`,
    ...data,
    created_date: data.created_date || now(),
    updated_date: now(),
  };
  upsertVehicleRecord(vehicle);
  return vehicle;
}

export function updateVehicle(id, patch) {
  const existing = getVehicle(id);
  if (!existing) return null;
  const vehicle = { ...existing, ...patch, id, updated_date: now() };
  upsertVehicleRecord(vehicle);
  return vehicle;
}

export function deleteVehicle(id) {
  const existing = getVehicle(id);
  if (!existing) return null;
  db.prepare("DELETE FROM vehicles WHERE id = ?").run(id);
  return existing;
}

/** Driver GPS — SQLite source of truth for live vehicle state */
export function recordLocationUpdate({
  driverId,
  vehicleId,
  tripId,
  latitude,
  longitude,
  speed = 0,
  heading = 0,
  accuracy = 0,
  timestamp,
  saveLog = true,
}) {
  const ts = timestamp || now();
  const vehicle = getVehicle(vehicleId);
  if (!vehicle) return null;

  const updated = updateVehicle(vehicleId, {
    current_latitude: latitude,
    current_longitude: longitude,
    latitude,
    longitude,
    current_speed: speed,
    speed,
    heading,
    accuracy,
    last_location_update: ts,
    status: tripId ? "on_trip" : vehicle.status,
    current_trip_id: tripId || vehicle.current_trip_id,
  });

  let log = null;
  if (tripId && saveLog) {
    log = {
      id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      vehicle_id: vehicleId,
      trip_id: tripId,
      driver_email: driverId,
      latitude,
      longitude,
      speed,
      heading,
      accuracy,
      timestamp: ts,
    };
    insertLocationLog(log, driverId);
  }

  return {
    vehicle: updated,
    log,
    broadcast: toLivePayload(updated, driverId, tripId),
  };
}

export function toLivePayload(vehicle, driverId, tripId) {
  const lat = vehicle.current_latitude ?? vehicle.latitude;
  const lng = vehicle.current_longitude ?? vehicle.longitude;
  return {
    driverId: driverId || vehicle.driver_email,
    vehicleId: vehicle.id,
    lat,
    lng,
    speed: vehicle.current_speed ?? vehicle.speed ?? 0,
    heading: vehicle.heading ?? 0,
    accuracy: vehicle.accuracy ?? 0,
    timestamp: vehicle.last_location_update || now(),
    tripId: tripId || vehicle.current_trip_id || null,
    online: true,
  };
}

export function listTrips({ driverEmail = null, sortBy = null, limit = null } = {}) {
  let sql = "SELECT * FROM trips";
  const params = [];
  if (driverEmail) {
    sql += " WHERE driver_email = ?";
    params.push(String(driverEmail).trim().toLowerCase());
  }
  sql += " ORDER BY updated_at DESC";
  let rows = db.prepare(sql).all(...params).map(tripFromRow);
  if (sortBy || limit != null) rows = sortAndLimit(rows, sortBy, limit);
  return rows;
}

function tripFromRow(row) {
  let meta = {};
  try {
    meta = row.meta ? JSON.parse(row.meta) : {};
  } catch {
    meta = {};
  }
  return {
    id: row.id,
    vehicle_id: row.vehicle_id,
    driver_email: row.driver_email,
    driver_name: row.driver_name,
    status: row.status,
    start_time: row.start_time,
    end_time: row.end_time,
    start_latitude: row.start_latitude,
    start_longitude: row.start_longitude,
    end_latitude: row.end_latitude,
    end_longitude: row.end_longitude,
    created_date: row.created_at,
    updated_date: row.updated_at,
    ...meta,
  };
}

export function getTrip(id) {
  const row = db.prepare("SELECT * FROM trips WHERE id = ?").get(id);
  return row ? tripFromRow(row) : null;
}

export function createTrip(data) {
  const trip = {
    id: data.id || `trip_${Date.now()}`,
    ...data,
    status: data.status || "active",
    start_time: data.start_time || now(),
    created_date: now(),
    updated_date: now(),
  };
  upsertTrip(trip);
  return trip;
}

export function updateTripRecord(id, patch) {
  const existing = getTrip(id);
  if (!existing) return null;
  const trip = { ...existing, ...patch, id, updated_date: now() };
  upsertTrip(trip);
  return trip;
}

export function deleteTrip(id) {
  const existing = getTrip(id);
  if (!existing) return null;
  db.prepare("DELETE FROM trips WHERE id = ?").run(id);
  return existing;
}

export function listLocationLogs({ tripId = null, driverEmail = null, limit = 500 } = {}) {
  let sql = "SELECT * FROM location_logs WHERE 1=1";
  const params = [];
  if (tripId) {
    sql += " AND trip_id = ?";
    params.push(tripId);
  }
  if (driverEmail) {
    sql += " AND driver_email = ?";
    params.push(String(driverEmail).trim().toLowerCase());
  }
  sql += " ORDER BY timestamp ASC";
  if (limit) sql += ` LIMIT ${Number(limit)}`;
  return db.prepare(sql).all(...params).map((row) => ({
    id: row.id,
    trip_id: row.trip_id,
    vehicle_id: row.vehicle_id,
    driver_email: row.driver_email,
    latitude: row.latitude,
    longitude: row.longitude,
    speed: row.speed,
    heading: row.heading,
    accuracy: row.accuracy,
    timestamp: row.timestamp,
  }));
}

export function listGeofences() {
  return db.prepare("SELECT payload FROM geofences").all().map(parsePayload);
}

export function getGeofence(id) {
  return parsePayload(db.prepare("SELECT payload FROM geofences WHERE id = ?").get(id));
}

function upsertGeofenceRecord(g) {
  db.prepare(
    `INSERT INTO geofences (id, payload, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET payload = excluded.payload, updated_at = excluded.updated_at`
  ).run(g.id, JSON.stringify(g), g.updated_date || now());
}

export function createGeofence(data) {
  const g = { id: data.id || `geofence_${Date.now()}`, ...data, created_date: now(), updated_date: now() };
  upsertGeofenceRecord(g);
  return g;
}

export function updateGeofence(id, patch) {
  const existing = getGeofence(id);
  if (!existing) return null;
  const g = { ...existing, ...patch, id, updated_date: now() };
  upsertGeofenceRecord(g);
  return g;
}

export function deleteGeofence(id) {
  const existing = getGeofence(id);
  if (!existing) return null;
  db.prepare("DELETE FROM geofences WHERE id = ?").run(id);
  return existing;
}

export function listMaintenance() {
  return db.prepare("SELECT payload FROM maintenance_logs").all().map(parsePayload);
}

function upsertMaintenanceRecord(m) {
  db.prepare(
    `INSERT INTO maintenance_logs (id, payload, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET payload = excluded.payload, updated_at = excluded.updated_at`
  ).run(m.id, JSON.stringify(m), m.updated_date || now());
}

export function createMaintenance(data) {
  const m = { id: data.id || `maint_${Date.now()}`, ...data, created_date: now(), updated_date: now() };
  upsertMaintenanceRecord(m);
  return m;
}

export function updateMaintenance(id, patch) {
  const row = db.prepare("SELECT payload FROM maintenance_logs WHERE id = ?").get(id);
  if (!row) return null;
  const m = { ...parsePayload(row), ...patch, id, updated_date: now() };
  upsertMaintenanceRecord(m);
  return m;
}

export function deleteMaintenance(id) {
  const existing = parsePayload(db.prepare("SELECT payload FROM maintenance_logs WHERE id = ?").get(id));
  if (!existing) return null;
  db.prepare("DELETE FROM maintenance_logs WHERE id = ?").run(id);
  return existing;
}

function upsertReportScheduleRecord(r) {
  db.prepare(
    `INSERT INTO report_schedules (id, payload, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET payload = excluded.payload, updated_at = excluded.updated_at`
  ).run(r.id, JSON.stringify(r), r.updated_date || now());
}

export function listReportSchedules() {
  return db.prepare("SELECT payload FROM report_schedules").all().map(parsePayload);
}

export function createReportSchedule(data) {
  const r = { id: data.id || `report_${Date.now()}`, ...data, created_date: now(), updated_date: now() };
  upsertReportScheduleRecord(r);
  return r;
}

export function deleteReportSchedule(id) {
  const existing = parsePayload(db.prepare("SELECT payload FROM report_schedules WHERE id = ?").get(id));
  if (!existing) return null;
  db.prepare("DELETE FROM report_schedules WHERE id = ?").run(id);
  return existing;
}

export function getFleetSummary() {
  return {
    vehicles: db.prepare("SELECT COUNT(*) AS c FROM vehicles").get()?.c ?? 0,
    trips: db.prepare("SELECT COUNT(*) AS c FROM trips").get()?.c ?? 0,
    locationLogs: db.prepare("SELECT COUNT(*) AS c FROM location_logs").get()?.c ?? 0,
    geofences: db.prepare("SELECT COUNT(*) AS c FROM geofences").get()?.c ?? 0,
  };
}

function sortAndLimit(items, sortBy, limit) {
  const list = [...items];
  if (sortBy) {
    const desc = String(sortBy).startsWith("-");
    const field = desc ? String(sortBy).slice(1) : String(sortBy);
    list.sort((a, b) => {
      const av = a[field];
      const bv = b[field];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (field.includes("date") || field.includes("time")) {
        return desc ? new Date(bv) - new Date(av) : new Date(av) - new Date(bv);
      }
      if (av < bv) return desc ? 1 : -1;
      if (av > bv) return desc ? -1 : 1;
      return 0;
    });
  }
  if (limit != null) return list.slice(0, limit);
  return list;
}
