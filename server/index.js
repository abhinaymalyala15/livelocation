import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createServer } from "http";
import { dbPath, getDriverDebug, getStorageSummary } from "./db.js";
import { initStorage, getStorageHealth, logStorageStartup } from "./storage.js";
import { seedDatabaseIfEmpty } from "./seed.js";
import {
  loginUser,
  logoutToken,
  registerDriver,
  getUserByToken,
  updateDisplayName,
  listUsers,
  lookupUserByEmail,
} from "./auth.js";
import { initFleetTables, getFleetSummary, listVehicles } from "./fleetRepository.js";
import { createFleetRouter } from "./fleetRoutes.js";
import { initTrackingSocket } from "./socket.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3001;

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));

function bearerToken(req) {
  const h = req.headers.authorization || "";
  return h.startsWith("Bearer ") ? h.slice(7) : null;
}

initStorage();
logStorageStartup();

await seedDatabaseIfEmpty();
initFleetTables();

const httpServer = createServer(app);
const tracking = initTrackingSocket(httpServer);
const fleetRouter = createFleetRouter({
  broadcastLocation: (payload) => tracking.broadcastLocation(tracking.io, payload),
});
app.use("/api/fleet", fleetRouter);

app.post("/api/auth/register", (req, res) => {
  try {
    const user = registerDriver(req.body);
    res.status(201).json({ user });
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message });
  }
});

app.get("/api/auth/lookup", (req, res) => {
  const result = lookupUserByEmail(req.query.email);
  if (!result.exists) return res.json({ exists: false });

  const fleet = { vehicles: [], activeTrips: 0, locationLogCount: 0 };
  if (result.user.role === "driver") {
    const debug = getDriverDebug(result.user.email);
    fleet.vehicles = listVehicles({ driverEmail: result.user.email }).map((v) => ({
      id: v.id,
      vehicle_name: v.vehicle_name || v.name,
      plate: v.vehicle_unique_id || v.plate,
      status: v.status,
    }));
    fleet.activeTrips = debug.activeTrips ?? 0;
    fleet.locationLogCount = debug.locationLogCount ?? 0;
  }

  res.json({ exists: true, user: result.user, fleet });
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
  const storage = getStorageHealth();
  const summary = getFleetSummary();
  res.json({
    ok: storage.ok,
    persistentDataDir: storage.persistentDataDir,
    database: storage.database,
    dataDir: storage.dataDir,
    dbExists: storage.dbExists,
    storageMode: storage.storageMode,
    type: "sqlite",
    realtime: "socket.io",
    fleet: summary,
  });
});

app.get("/api/debug/driver/:email", (req, res) => {
  const email = decodeURIComponent(req.params.email);
  res.json(getDriverDebug(email));
});

app.get("/api/debug/storage-summary", (_req, res) => {
  res.json({ ...getStorageSummary(), ...getFleetSummary() });
});

const distDir = path.join(__dirname, "..", "dist");
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api") || req.path.startsWith("/socket.io")) return next();
    res.sendFile(path.join(distDir, "index.html"));
  });
}

httpServer.listen(PORT, () => {
  const storage = getStorageHealth();
  console.log(`FleetTrack API: http://localhost:${PORT}`);
  console.log(`Realtime: Socket.IO on /socket.io`);
  if (!storage.persistentDataDir) {
    console.log(`SQLite (local/ephemeral): ${storage.database}`);
  }
});
