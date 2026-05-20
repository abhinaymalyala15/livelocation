import path from "path";
import { DatabaseSync } from "node:sqlite";
import { loadProjectEnv } from "./loadEnv.js";
import { initStorage } from "./storage.js";

loadProjectEnv();

const { dataDir, dbPath } = initStorage();
const legacyJsonPath = path.join(dataDir, "fleet-db.json");

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
`);

const userCols = db.prepare("PRAGMA table_info(users)").all();
if (!userCols.some((c) => c.name === "login_name")) {
  db.exec("ALTER TABLE users ADD COLUMN login_name TEXT");
  db.exec(
    "CREATE UNIQUE INDEX IF NOT EXISTS idx_users_login_name ON users(login_name) WHERE login_name IS NOT NULL"
  );
  const drivers = db
    .prepare("SELECT id, display_name FROM users WHERE role = 'driver'")
    .all();
  for (const row of drivers) {
    if (row.display_name) {
      const loginName = String(row.display_name).trim().toLowerCase().replace(/\s+/g, " ");
      db.prepare("UPDATE users SET login_name = ? WHERE id = ?").run(loginName, row.id);
    }
  }
}

db.exec(`

  CREATE TABLE IF NOT EXISTS auth_sessions (
    token TEXT PRIMARY KEY,
    user_json TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS driver_active_session (
    user_id TEXT PRIMARY KEY,
    token TEXT NOT NULL,
    updated_at TEXT NOT NULL
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

function tripMeta(trip) {
  const meta = {
    start_location: trip.start_location ?? null,
    end_location: trip.end_location ?? null,
    destination: trip.destination ?? null,
    vehicle_name: trip.vehicle_name ?? null,
    distance_km: trip.distance_km ?? trip.distance ?? null,
  };
  return JSON.stringify(meta);
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
    meta: trip.meta ?? tripMeta(trip),
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
      end_latitude, end_longitude, meta, created_at, updated_at
    ) VALUES (
      @id, @vehicle_id, @driver_email, @driver_name, @status,
      @start_time, @end_time, @start_latitude, @start_longitude,
      @end_latitude, @end_longitude, @meta, @created_at, @updated_at
    )
    ON CONFLICT(id) DO UPDATE SET
      status = excluded.status,
      end_time = excluded.end_time,
      end_latitude = excluded.end_latitude,
      end_longitude = excluded.end_longitude,
      meta = excluded.meta,
      updated_at = excluded.updated_at`
  ).run(tripRow(trip));
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
  const vehicleCount =
    db.prepare("SELECT COUNT(*) AS c FROM vehicles").get()?.c ??
    (getSnapshot()?.vehicles?.length ?? 0);
  const lastSnapshot = db.prepare("SELECT updated_at FROM fleet_snapshot WHERE id = 1").get();
  return {
    vehicles: vehicleCount,
    trips: db.prepare("SELECT COUNT(*) AS c FROM trips").get()?.c ?? 0,
    locationLogs: db.prepare("SELECT COUNT(*) AS c FROM location_logs").get()?.c ?? 0,
    geofences:
      db.prepare("SELECT COUNT(*) AS c FROM geofences").get()?.c ??
      (getSnapshot()?.geofences?.length ?? 0),
    tripsInSql: db.prepare("SELECT COUNT(*) AS c FROM trips").get()?.c ?? 0,
    logsInSql: db.prepare("SELECT COUNT(*) AS c FROM location_logs").get()?.c ?? 0,
    databaseFile: dbPath,
    databaseType: "sqlite",
    lastSnapshot: lastSnapshot ? { updated_at: lastSnapshot.updated_at } : null,
  };
}

export { db, dbPath };
