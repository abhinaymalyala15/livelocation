import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  getSnapshot,
  saveSnapshot,
  upsertTrip,
  insertLocationLog,
  getDriverDebug,
  getStorageSummary,
  dbPath,
} from "./db.js";
import { seedDatabaseIfEmpty } from "./seed.js";
import {
  loginUser,
  logoutToken,
  registerDriver,
  getUserByToken,
  updateDisplayName,
  listUsers,
} from "./auth.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3001;

const app = express();
app.use(cors());
app.use(express.json({ limit: "15mb" }));

function bearerToken(req) {
  const h = req.headers.authorization || "";
  return h.startsWith("Bearer ") ? h.slice(7) : null;
}

await seedDatabaseIfEmpty();

app.post("/api/auth/register", (req, res) => {
  try {
    const user = registerDriver(req.body);
    res.status(201).json({ user });
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message });
  }
});

app.post("/api/auth/login", (req, res) => {
  try {
    const { user, token } = loginUser(req.body.email, req.body.password);
    res.json({ user, token });
  } catch (e) {
    res.status(e.status || 401).json({ error: e.message });
  }
});

app.get("/api/auth/me", (req, res) => {
  const user = getUserByToken(bearerToken(req));
  if (!user) return res.status(401).json({ error: "Not authenticated" });
  res.json(user);
});

app.post("/api/auth/logout", (req, res) => {
  logoutToken(bearerToken(req));
  res.json({ ok: true });
});

app.patch("/api/auth/profile", (req, res) => {
  const session = getUserByToken(bearerToken(req));
  if (!session) return res.status(401).json({ error: "Not authenticated" });
  try {
    const user = updateDisplayName(session.email, req.body.display_name);
    res.json({ user });
  } catch (e) {
    res.status(e.status || 400).json({ error: e.message });
  }
});

app.get("/api/users", (req, res) => {
  const role = req.query.role || null;
  res.json(listUsers(role));
});

app.get("/api/health", (_req, res) => {
  const summary = getStorageSummary();
  res.json({
    ok: true,
    database: dbPath,
    type: "sqlite",
    persistentDataDir: !!process.env.FLEET_DATA_DIR,
    fleet: summary
      ? {
          vehicles: summary.vehicles,
          trips: summary.trips,
          locationLogs: summary.locationLogs,
          lastUpdated: summary.lastSnapshot?.updated_at,
        }
      : null,
  });
});

/** Full fleet JSON (vehicles, trips, locationLogs, …) */
app.get("/api/data", (_req, res) => {
  const data = getSnapshot();
  if (!data) {
    return res.status(404).json({ error: "No data seeded yet" });
  }
  res.json(data);
});

app.put("/api/data", (req, res) => {
  const data = req.body;
  if (!data?.vehicles || !data?.trips || !data?.locationLogs) {
    return res.status(400).json({ error: "Invalid fleet payload" });
  }
  const updatedAt = saveSnapshot(data);

  for (const trip of data.trips) {
    upsertTrip(trip);
  }
  for (const log of data.locationLogs) {
    const trip = data.trips.find((t) => t.id === log.trip_id);
    insertLocationLog(log, log.driver_email || trip?.driver_email || null);
  }

  res.json({ ok: true, updatedAt });
});

/** Index driver trips + GPS rows when frontend syncs a single log */
app.post("/api/location-logs", (req, res) => {
  const log = req.body;
  if (!log?.latitude || !log?.longitude) {
    return res.status(400).json({ error: "Invalid location log" });
  }
  insertLocationLog(log, log.driver_email);
  res.status(201).json({ ok: true, id: log.id });
});

app.post("/api/trips", (req, res) => {
  const trip = req.body;
  if (!trip?.id) return res.status(400).json({ error: "Trip id required" });
  upsertTrip(trip);
  res.status(201).json({ ok: true, id: trip.id });
});

app.patch("/api/trips/:id", (req, res) => {
  const existing = getSnapshot()?.trips?.find((t) => t.id === req.params.id);
  if (!existing) return res.status(404).json({ error: "Trip not found" });
  upsertTrip({ ...existing, ...req.body, id: req.params.id });
  res.json({ ok: true });
});

/** Verify driver data is stored in SQLite */
app.get("/api/debug/driver/:email", (req, res) => {
  const email = decodeURIComponent(req.params.email);
  res.json(getDriverDebug(email));
});

app.get("/api/debug/storage-summary", (_req, res) => {
  const data = getSnapshot();
  if (!data) return res.status(404).json({ error: "No data" });
  res.json({
    vehicles: data.vehicles?.length ?? 0,
    trips: data.trips?.length ?? 0,
    locationLogs: data.locationLogs?.length ?? 0,
    geofences: data.geofences?.length ?? 0,
    databaseFile: dbPath,
    lastSnapshot: getDriverDebug("admin@fleet.com").lastSnapshot,
  });
});

/** Production: serve Vite build (same origin as /api) */
const distDir = path.join(__dirname, "..", "dist");
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api")) return next();
    res.sendFile(path.join(distDir, "index.html"));
  });
}

app.listen(PORT, () => {
  console.log(`FleetTrack API + SQLite: http://localhost:${PORT}`);
  console.log(`Database file: ${dbPath}`);
});
