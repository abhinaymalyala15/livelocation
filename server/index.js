import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createServer } from "http";
import { db, dbPath, getDriverDebug, getStorageSummary } from "./db.js";
import { initStorage, getStorageHealth, logStorageStartup } from "./storage.js";
import { seedDatabaseIfEmpty } from "./seed.js";
import {
  loginUser,
  loginDriverByName,
  logoutToken,
  createDriverByAdmin,
  getUserByToken,
  updateDisplayName,
  listUsers,
  lookupUserByEmail,
} from "./auth.js";
import {
  initFleetTables,
  getFleetSummary,
  listVehicles,
  createVehicle,
} from "./fleetRepository.js";
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

function requireAdmin(req, res, next) {
  const user = getUserByToken(bearerToken(req));
  if (!user || user.role !== "admin") {
    return res.status(403).json({ error: "Admin only" });
  }
  req.user = user;
  next();
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

app.post("/api/auth/register", (_req, res) => {
  res.status(403).json({ error: "Drivers are created by admin only" });
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
    const { email, name, password } = req.body;
    if (name && !email) {
      const { user, token } = loginDriverByName(name, password);
      tracking.revokeDriverSockets(user.email, token);
      return res.json({ user, token });
    }
    const { user, token } = loginUser(email, password);
    res.json({ user, token });
  } catch (e) {
    res.status(e.status || 401).json({ error: e.message });
  }
});

app.get("/api/admin/drivers", requireAdmin, (_req, res) => {
  const drivers = listUsers("driver").map((d) => ({
    ...d,
    vehicles: listVehicles({ driverEmail: d.email }),
  }));
  res.json(drivers);
});

app.post("/api/admin/drivers", requireAdmin, (req, res) => {
  try {
    const { display_name, password, vehicle_name, plate } = req.body;
    const vName = String(vehicle_name || "").trim();
    const plateId = String(plate || "").trim();
    if (!vName || !plateId) {
      return res.status(400).json({ error: "Vehicle name and plate are required" });
    }

    const user = createDriverByAdmin({ display_name, password });
    const vehicle = createVehicle({
      vehicle_name: vName,
      name: vName,
      vehicle_unique_id: plateId.toUpperCase(),
      plate: plateId.toUpperCase(),
      driver_email: user.email,
      driver_name: user.display_name,
      driver_id: user.id,
      status: "available",
    });
    res.status(201).json({ user, vehicle });
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message });
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

app.get("/api/users", requireAdmin, (req, res) => {
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

function shutdown() {
  try {
    db.exec("PRAGMA wal_checkpoint(TRUNCATE)");
  } catch {
    /* ignore */
  }
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

httpServer.listen(PORT, () => {
  const storage = getStorageHealth();
  console.log(`FleetTrack API: http://localhost:${PORT}`);
  console.log(`Realtime: Socket.IO on /socket.io`);
  console.log(`SQLite database: ${storage.database}`);
  if (!storage.persistentDataDir) {
    console.log(`[storage] Tip: set FLEET_DATA_DIR=./data in .env.local to keep data in the project folder`);
  }
});
