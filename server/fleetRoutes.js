import { Router } from "express";
import { getUserByToken } from "./auth.js";
import {
  listVehicles,
  getVehicle,
  createVehicle,
  updateVehicle,
  deleteVehicle,
  listTrips,
  getTrip,
  createTrip,
  updateTripRecord,
  deleteTrip,
  listLocationLogs,
  listGeofences,
  getGeofence,
  createGeofence,
  updateGeofence,
  deleteGeofence,
  listMaintenance,
  createMaintenance,
  updateMaintenance,
  deleteMaintenance,
  listReportSchedules,
  createReportSchedule,
  deleteReportSchedule,
  recordLocationUpdate,
} from "./fleetRepository.js";

export function createFleetRouter({ broadcastLocation } = {}) {
  const router = Router();

  function bearerToken(req) {
    const h = req.headers.authorization || "";
    return h.startsWith("Bearer ") ? h.slice(7) : null;
  }

  function requireAuth(req, res, next) {
    const user = getUserByToken(bearerToken(req));
    if (!user) return res.status(401).json({ error: "Not authenticated" });
    req.user = user;
    next();
  }

  function parseSortLimit(req) {
    return {
      sortBy: req.query.sort || req.query.sortBy || null,
      limit: req.query.limit ? Number(req.query.limit) : null,
    };
  }

  router.use(requireAuth);

  router.get("/vehicles", (req, res) => {
    const driverEmail = req.query.driver_email || (req.user.role === "driver" ? req.user.email : null);
    const vehicles = listVehicles({ driverEmail, ...parseSortLimit(req) });
    res.json(vehicles);
  });

  router.get("/vehicles/:id", (req, res) => {
    const vehicle = getVehicle(req.params.id);
    if (!vehicle) return res.status(404).json({ error: "Vehicle not found" });
    if (
      req.user.role === "driver" &&
      String(vehicle.driver_email || "").toLowerCase() !== req.user.email
    ) {
      return res.status(403).json({ error: "Forbidden" });
    }
    res.json(vehicle);
  });

  router.post("/vehicles", (req, res) => {
    if (req.user.role === "driver") {
      const email = req.user.email;
      const body = {
        ...req.body,
        driver_email: email,
        driver_id: req.user.id,
        driver_name: req.body.driver_name || req.user.display_name || req.user.name,
      };
      if (
        req.body.driver_email &&
        String(req.body.driver_email).trim().toLowerCase() !== email
      ) {
        return res.status(403).json({ error: "Cannot assign a vehicle to another driver" });
      }
      const vehicle = createVehicle(body);
      return res.status(201).json(vehicle);
    }
    if (req.user.role !== "admin") return res.status(403).json({ error: "Admin only" });
    const vehicle = createVehicle(req.body);
    res.status(201).json(vehicle);
  });

  router.patch("/vehicles/:id", (req, res) => {
    const existing = getVehicle(req.params.id);
    if (!existing) return res.status(404).json({ error: "Vehicle not found" });
    if (
      req.user.role === "driver" &&
      String(existing.driver_email || "").toLowerCase() !== req.user.email
    ) {
      return res.status(403).json({ error: "Forbidden" });
    }
    const vehicle = updateVehicle(req.params.id, req.body);
    res.json(vehicle);
  });

  router.delete("/vehicles/:id", (req, res) => {
    if (req.user.role !== "admin") return res.status(403).json({ error: "Admin only" });
    const removed = deleteVehicle(req.params.id);
    if (!removed) return res.status(404).json({ error: "Vehicle not found" });
    res.json(removed);
  });

  /** Driver GPS — persists to SQLite and broadcasts to admins */
  router.post("/tracking/location", (req, res) => {
    const {
      driverId,
      vehicleId,
      tripId,
      lat,
      lng,
      latitude,
      longitude,
      speed,
      heading,
      accuracy,
      timestamp,
    } = req.body;

    const email = (driverId || req.user.email || "").toLowerCase();
    if (req.user.role === "driver" && email !== req.user.email) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const vehicle = getVehicle(vehicleId);
    if (!vehicle) return res.status(404).json({ error: "Vehicle not found" });
    if (req.user.role === "driver" && String(vehicle.driver_email || "").toLowerCase() !== req.user.email) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const result = recordLocationUpdate({
      driverId: email,
      vehicleId,
      tripId,
      latitude: lat ?? latitude,
      longitude: lng ?? longitude,
      speed,
      heading,
      accuracy,
      timestamp,
      saveLog: req.body.saveLog !== false,
    });

    if (!result) return res.status(404).json({ error: "Update failed" });

    if (broadcastLocation) broadcastLocation(result.broadcast);
    res.json({ ok: true, vehicle: result.vehicle, live: result.broadcast });
  });

  router.get("/trips", (req, res) => {
    const driverEmail = req.query.driver_email || (req.user.role === "driver" ? req.user.email : null);
    res.json(listTrips({ driverEmail, ...parseSortLimit(req) }));
  });

  router.get("/trips/:id", (req, res) => {
    const trip = getTrip(req.params.id);
    if (!trip) return res.status(404).json({ error: "Trip not found" });
    res.json(trip);
  });

  router.post("/trips", (req, res) => {
    const trip = createTrip({
      ...req.body,
      driver_email: req.body.driver_email || req.user.email,
    });
    res.status(201).json(trip);
  });

  router.patch("/trips/:id", (req, res) => {
    const trip = updateTripRecord(req.params.id, req.body);
    if (!trip) return res.status(404).json({ error: "Trip not found" });
    res.json(trip);
  });

  router.delete("/trips/:id", (req, res) => {
    if (req.user.role !== "admin") return res.status(403).json({ error: "Admin only" });
    const removed = deleteTrip(req.params.id);
    if (!removed) return res.status(404).json({ error: "Trip not found" });
    res.json(removed);
  });

  router.get("/location-logs", (req, res) => {
    const logs = listLocationLogs({
      tripId: req.query.trip_id,
      driverEmail: req.query.driver_email,
      limit: req.query.limit ? Number(req.query.limit) : 500,
    });
    res.json(logs);
  });

  router.get("/geofences", (_req, res) => res.json(listGeofences()));
  router.get("/geofences/:id", (req, res) => {
    const g = getGeofence(req.params.id);
    if (!g) return res.status(404).json({ error: "Not found" });
    res.json(g);
  });
  router.post("/geofences", (req, res) => {
    if (req.user.role !== "admin") return res.status(403).json({ error: "Admin only" });
    res.status(201).json(createGeofence(req.body));
  });
  router.patch("/geofences/:id", (req, res) => {
    if (req.user.role !== "admin") return res.status(403).json({ error: "Admin only" });
    const g = updateGeofence(req.params.id, req.body);
    if (!g) return res.status(404).json({ error: "Not found" });
    res.json(g);
  });
  router.delete("/geofences/:id", (req, res) => {
    if (req.user.role !== "admin") return res.status(403).json({ error: "Admin only" });
    const g = deleteGeofence(req.params.id);
    if (!g) return res.status(404).json({ error: "Not found" });
    res.json(g);
  });

  router.get("/maintenance", (_req, res) => res.json(listMaintenance()));
  router.post("/maintenance", (req, res) => {
    if (req.user.role !== "admin") return res.status(403).json({ error: "Admin only" });
    res.status(201).json(createMaintenance(req.body));
  });
  router.patch("/maintenance/:id", (req, res) => {
    if (req.user.role !== "admin") return res.status(403).json({ error: "Admin only" });
    const m = updateMaintenance(req.params.id, req.body);
    if (!m) return res.status(404).json({ error: "Not found" });
    res.json(m);
  });
  router.delete("/maintenance/:id", (req, res) => {
    if (req.user.role !== "admin") return res.status(403).json({ error: "Admin only" });
    const m = deleteMaintenance(req.params.id);
    if (!m) return res.status(404).json({ error: "Not found" });
    res.json(m);
  });

  router.get("/report-schedules", (_req, res) => res.json(listReportSchedules()));
  router.post("/report-schedules", (req, res) => {
    if (req.user.role !== "admin") return res.status(403).json({ error: "Admin only" });
    res.status(201).json(createReportSchedule(req.body));
  });
  router.delete("/report-schedules/:id", (req, res) => {
    if (req.user.role !== "admin") return res.status(403).json({ error: "Admin only" });
    const r = deleteReportSchedule(req.params.id);
    if (!r) return res.status(404).json({ error: "Not found" });
    res.json(r);
  });

  return router;
}
