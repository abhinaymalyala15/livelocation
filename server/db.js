import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { DatabaseSync } from "node:sqlite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, "..", "data");
const dbPath = path.join(dataDir, "fleet.sqlite");
const legacyJsonPath = path.join(dataDir, "fleet-db.json");

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new DatabaseSync(dbPath);

db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS fleet_snapshot (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    data TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS trips (
    id TEXT PRIMARY KEY,
    vehicle_id TEXT,
    driver_email TEXT,
    driver_name TEXT,
    status TEXT,
    start_time TEXT,
    end_time TEXT,
    start_latitude REAL,
    start_longitude REAL,
    end_latitude REAL,
    end_longitude REAL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS location_logs (
    id TEXT PRIMARY KEY,
    trip_id TEXT,
    vehicle_id TEXT,
    driver_email TEXT,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    speed REAL,
    heading REAL,
    accuracy REAL,
    timestamp TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_trips_driver ON trips(driver_email);
  CREATE INDEX IF NOT EXISTS idx_logs_driver ON location_logs(driver_email);
  CREATE INDEX IF NOT EXISTS idx_logs_trip ON location_logs(trip_id);
  CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON location_logs(timestamp);

  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL,
    display_name TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

  CREATE TABLE IF NOT EXISTS auth_sessions (
    token TEXT PRIMARY KEY,
    user_json TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
`);

export function getSnapshot() {
  const row = db.prepare("SELECT data FROM fleet_snapshot WHERE id = 1").get();
  return row ? JSON.parse(row.data) : null;
}

export function saveSnapshot(data) {
  const json = JSON.stringify(data);
  const updatedAt = new Date().toISOString();

  db.exec("BEGIN");
  try {
    db.prepare(
      `INSERT INTO fleet_snapshot (id, data, updated_at) VALUES (1, ?, ?)
       ON CONFLICT(id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at`
    ).run(json, updatedAt);

    const tripStmt = db.prepare(
      `INSERT INTO trips (
        id, vehicle_id, driver_email, driver_name, status,
        start_time, end_time, start_latitude, start_longitude,
        end_latitude, end_longitude, created_at, updated_at
      ) VALUES (
        @id, @vehicle_id, @driver_email, @driver_name, @status,
        @start_time, @end_time, @start_latitude, @start_longitude,
        @end_latitude, @end_longitude, @created_at, @updated_at
      )
      ON CONFLICT(id) DO UPDATE SET
        status = excluded.status,
        end_time = excluded.end_time,
        end_latitude = excluded.end_latitude,
        end_longitude = excluded.end_longitude,
        updated_at = excluded.updated_at`
    );

    const logStmt = db.prepare(
      `INSERT INTO location_logs (
        id, trip_id, vehicle_id, driver_email,
        latitude, longitude, speed, heading, accuracy,
        timestamp, created_at
      ) VALUES (
        @id, @trip_id, @vehicle_id, @driver_email,
        @latitude, @longitude, @speed, @heading, @accuracy,
        @timestamp, @created_at
      )
      ON CONFLICT(id) DO UPDATE SET
        latitude = excluded.latitude,
        longitude = excluded.longitude,
        speed = excluded.speed,
        heading = excluded.heading,
        accuracy = excluded.accuracy,
        timestamp = excluded.timestamp,
        driver_email = excluded.driver_email`
    );

    for (const trip of data.trips ?? []) {
      tripStmt.run(tripRow(trip));
    }
    for (const log of data.locationLogs ?? []) {
      const trip = data.trips?.find((t) => t.id === log.trip_id);
      logStmt.run(logRow(log, log.driver_email || trip?.driver_email || null));
    }
    db.exec("COMMIT");
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }

  return updatedAt;
}

function tripRow(trip) {
  return {
    id: trip.id,
    vehicle_id: trip.vehicle_id ?? null,
    driver_email: trip.driver_email ?? null,
    driver_name: trip.driver_name ?? null,
    status: trip.status ?? null,
    start_time: trip.start_time ?? null,
    end_time: trip.end_time ?? null,
    start_latitude: trip.start_latitude ?? null,
    start_longitude: trip.start_longitude ?? null,
    end_latitude: trip.end_latitude ?? null,
    end_longitude: trip.end_longitude ?? null,
    created_at: trip.created_date ?? trip.created_at ?? new Date().toISOString(),
    updated_at: trip.updated_date ?? trip.updated_at ?? new Date().toISOString(),
  };
}

function logRow(log, driverEmail) {
  return {
    id: log.id,
    trip_id: log.trip_id ?? null,
    vehicle_id: log.vehicle_id ?? null,
    driver_email: driverEmail ?? log.driver_email ?? null,
    latitude: log.latitude,
    longitude: log.longitude,
    speed: log.speed ?? 0,
    heading: log.heading ?? 0,
    accuracy: log.accuracy ?? 0,
    timestamp: log.timestamp ?? new Date().toISOString(),
    created_at: new Date().toISOString(),
  };
}

export function upsertTrip(trip) {
  db.prepare(
    `INSERT INTO trips (
      id, vehicle_id, driver_email, driver_name, status,
      start_time, end_time, start_latitude, start_longitude,
      end_latitude, end_longitude, created_at, updated_at
    ) VALUES (
      @id, @vehicle_id, @driver_email, @driver_name, @status,
      @start_time, @end_time, @start_latitude, @start_longitude,
      @end_latitude, @end_longitude, @created_at, @updated_at
    )
    ON CONFLICT(id) DO UPDATE SET
      status = excluded.status,
      end_time = excluded.end_time,
      end_latitude = excluded.end_latitude,
      end_longitude = excluded.end_longitude,
      updated_at = excluded.updated_at`
  ).run(tripRow(trip));

  const data = getSnapshot();
  if (!data) return;
  const idx = data.trips.findIndex((t) => t.id === trip.id);
  if (idx === -1) data.trips.push(trip);
  else data.trips[idx] = { ...data.trips[idx], ...trip };
  const json = JSON.stringify(data);
  db.prepare(
    `UPDATE fleet_snapshot SET data = ?, updated_at = ? WHERE id = 1`
  ).run(json, new Date().toISOString());
}

export function insertLocationLog(log, driverEmail = null) {
  const email = driverEmail ?? log.driver_email ?? null;
  db.prepare(
    `INSERT INTO location_logs (
      id, trip_id, vehicle_id, driver_email,
      latitude, longitude, speed, heading, accuracy,
      timestamp, created_at
    ) VALUES (
      @id, @trip_id, @vehicle_id, @driver_email,
      @latitude, @longitude, @speed, @heading, @accuracy,
      @timestamp, @created_at
    )
    ON CONFLICT(id) DO UPDATE SET
      latitude = excluded.latitude,
      longitude = excluded.longitude,
      speed = excluded.speed,
      timestamp = excluded.timestamp,
      driver_email = excluded.driver_email`
  ).run(logRow({ ...log, driver_email: email }, email));

  const data = getSnapshot();
  if (!data) return;
  const enriched = { ...log, driver_email: email };
  const idx = data.locationLogs.findIndex((l) => l.id === enriched.id);
  if (idx === -1) data.locationLogs.push(enriched);
  else data.locationLogs[idx] = enriched;
  db.prepare(`UPDATE fleet_snapshot SET data = ?, updated_at = ? WHERE id = 1`).run(
    JSON.stringify(data),
    new Date().toISOString()
  );
}

export function getDriverDebug(driverEmail) {
  const tripCount = db
    .prepare(`SELECT COUNT(*) AS c FROM trips WHERE driver_email = ?`)
    .get(driverEmail);
  const activeTrips = db
    .prepare(
      `SELECT COUNT(*) AS c FROM trips WHERE driver_email = ? AND status = 'active'`
    )
    .get(driverEmail);
  const logCount = db
    .prepare(`SELECT COUNT(*) AS c FROM location_logs WHERE driver_email = ?`)
    .get(driverEmail);

  const recentTrips = db
    .prepare(
      `SELECT * FROM trips WHERE driver_email = ? ORDER BY updated_at DESC LIMIT 5`
    )
    .all(driverEmail);

  const recentLogs = db
    .prepare(
      `SELECT * FROM location_logs WHERE driver_email = ? ORDER BY timestamp DESC LIMIT 10`
    )
    .all(driverEmail);

  const lastSnapshot = db.prepare("SELECT updated_at FROM fleet_snapshot WHERE id = 1").get();

  return {
    driverEmail,
    tripCount: tripCount?.c ?? 0,
    activeTrips: activeTrips?.c ?? 0,
    locationLogCount: logCount?.c ?? 0,
    recentTrips,
    recentLogs,
    databaseFile: dbPath,
    databaseType: "sqlite",
    lastSnapshot: lastSnapshot ? { updated_at: lastSnapshot.updated_at } : null,
  };
}

export function getStorageSummary() {
  const data = getSnapshot();
  if (!data) return null;
  const lastSnapshot = db.prepare("SELECT updated_at FROM fleet_snapshot WHERE id = 1").get();
  return {
    vehicles: data.vehicles?.length ?? 0,
    trips: data.trips?.length ?? 0,
    locationLogs: data.locationLogs?.length ?? 0,
    geofences: data.geofences?.length ?? 0,
    tripsInSql: db.prepare("SELECT COUNT(*) AS c FROM trips").get()?.c ?? 0,
    logsInSql: db.prepare("SELECT COUNT(*) AS c FROM location_logs").get()?.c ?? 0,
    databaseFile: dbPath,
    databaseType: "sqlite",
    lastSnapshot: lastSnapshot ? { updated_at: lastSnapshot.updated_at } : null,
  };
}

export { db, dbPath };
