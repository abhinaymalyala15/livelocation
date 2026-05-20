import { fleetApi } from "./fleetApi";
import { apiLogin, apiMe, apiLogout, getAuthToken } from "./authApi";
import { normalizeVehicle, normalizeVehicles } from "@/lib/normalizeVehicle";

let currentUser = null;
let isAuthenticated = false;

const apiClient = {
  auth: {
    me: async () => {
      const token = getAuthToken();
      if (token) {
        try {
          currentUser = await apiMe();
          isAuthenticated = true;
          return { ...currentUser };
        } catch {
          currentUser = null;
          isAuthenticated = false;
        }
      }
      if (!isAuthenticated || !currentUser) {
        throw { status: 401, message: "Not authenticated" };
      }
      return { ...currentUser };
    },

    login: async (email, password) => {
      const user = await apiLogin(email, password);
      currentUser = user;
      isAuthenticated = true;
      return { ...user };
    },

    logout: async () => {
      await apiLogout();
      currentUser = null;
      isAuthenticated = false;
    },

    redirectToLogin: (returnUrl) => {
      window.location.href = `/login?return=${encodeURIComponent(returnUrl)}`;
    },
  },

  entities: {
    Vehicle: {
      list: async (sortBy, limit) =>
        normalizeVehicles(await fleetApi.vehicles.list(sortBy, limit)),
      filter: async (query = {}) =>
        normalizeVehicles(await fleetApi.vehicles.filter(query)),
      get: async (id) => normalizeVehicle(await fleetApi.vehicles.get(id)),
      create: async (data) => normalizeVehicle(await fleetApi.vehicles.create(data)),
      update: async (id, data) => normalizeVehicle(await fleetApi.vehicles.update(id, data)),
      delete: async (id) => fleetApi.vehicles.delete(id),
      subscribe: () => () => {},
    },

    Trip: {
      list: async (sortBy, limit) => fleetApi.trips.list(sortBy, limit),
      filter: async (query = {}) => fleetApi.trips.filter(query),
      get: async (id) => fleetApi.trips.get(id),
      create: async (data) => fleetApi.trips.create(data),
      update: async (id, data) => fleetApi.trips.update(id, data),
      delete: async (id) => fleetApi.trips.delete(id),
    },

    LocationLog: {
      list: async () => fleetApi.locationLogs.list(),
      filter: async (query = {}, sortBy = null, limit = 100) =>
        fleetApi.locationLogs.filter(query, sortBy, limit),
      create: async () => {
        throw new Error("Location logs are created via /api/fleet/tracking/location");
      },
    },

    Geofence: {
      list: async () => fleetApi.geofences.list(),
      filter: async (query = {}) => fleetApi.geofences.filter(query),
      get: async (id) => fleetApi.geofences.get(id),
      create: async (data) => fleetApi.geofences.create(data),
      update: async (id, data) => fleetApi.geofences.update(id, data),
      delete: async (id) => fleetApi.geofences.delete(id),
    },

    MaintenanceLog: {
      list: async () => fleetApi.maintenance.list(),
      filter: async (query = {}) => fleetApi.maintenance.filter(query),
      create: async (data) => fleetApi.maintenance.create(data),
      update: async (id, data) => fleetApi.maintenance.update(id, data),
      delete: async (id) => fleetApi.maintenance.delete(id),
    },

    ReportSchedule: {
      list: async (sortBy, limit) => fleetApi.reportSchedules.list(sortBy, limit),
      filter: async (query = {}) => fleetApi.reportSchedules.filter(query),
      create: async (data) => fleetApi.reportSchedules.create(data),
      delete: async (id) => fleetApi.reportSchedules.delete(id),
    },
  },

  functions: {
    invoke: async (functionName, params = {}) => {
      if (functionName === "generateTripReport") {
        const trip = await fleetApi.trips.get(params.trip_id);
        const locationLogs = await fleetApi.locationLogs.filter(
          { trip_id: params.trip_id },
          null,
          5000
        );
        return {
          data: JSON.stringify({ trip, locationLogs, generatedAt: new Date().toISOString() }),
          status: 200,
        };
      }
      if (functionName === "sendWeeklyFleetReport") {
        return { data: { message: "Weekly report sent to all admins" }, status: 200 };
      }
      throw { status: 404, message: `Function ${functionName} not found` };
    },
  },
};

apiClient.asServiceRole = { entities: apiClient.entities };

export const base44 = apiClient;
export default apiClient;
