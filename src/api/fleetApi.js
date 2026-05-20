import { getAuthToken } from "./authApi";

const API = "/api/fleet";

async function parseJson(res) {
  const text = await res.text();
  let body = {};
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = { error: "Invalid server response" };
  }
  if (!res.ok) {
    const err = new Error(body.error || `Request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return body;
}

function authHeaders() {
  const token = getAuthToken();
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

export async function apiRequest(path, options = {}) {
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: { ...authHeaders(), ...options.headers },
  });
  return parseJson(res);
}

export const fleetApi = {
  vehicles: {
    list: (sortBy, limit) => {
      const params = new URLSearchParams();
      if (sortBy) params.set("sort", sortBy);
      if (limit != null) params.set("limit", String(limit));
      const q = params.toString();
      return apiRequest(`/vehicles${q ? `?${q}` : ""}`);
    },
    filter: (query = {}) => {
      const params = new URLSearchParams(query);
      return apiRequest(`/vehicles?${params}`);
    },
    get: (id) => apiRequest(`/vehicles/${id}`),
    create: (data) => apiRequest("/vehicles", { method: "POST", body: JSON.stringify(data) }),
    update: (id, data) =>
      apiRequest(`/vehicles/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    delete: (id) => apiRequest(`/vehicles/${id}`, { method: "DELETE" }),
  },
  trips: {
    list: (sortBy, limit) => {
      const params = new URLSearchParams();
      if (sortBy) params.set("sort", sortBy);
      if (limit != null) params.set("limit", String(limit));
      const q = params.toString();
      return apiRequest(`/trips${q ? `?${q}` : ""}`);
    },
    filter: (query = {}) => {
      const params = new URLSearchParams(query);
      return apiRequest(`/trips?${params}`);
    },
    get: (id) => apiRequest(`/trips/${id}`),
    create: (data) => apiRequest("/trips", { method: "POST", body: JSON.stringify(data) }),
    update: (id, data) =>
      apiRequest(`/trips/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    delete: (id) => apiRequest(`/trips/${id}`, { method: "DELETE" }),
  },
  locationLogs: {
    list: () => apiRequest("/location-logs"),
    filter: (query = {}, _sortBy, limit = 500) => {
      const params = new URLSearchParams(query);
      if (limit) params.set("limit", String(limit));
      return apiRequest(`/location-logs?${params}`);
    },
    create: () => {
      throw new Error("Use POST /api/fleet/tracking/location for GPS logs");
    },
  },
  tracking: {
    sendLocation: (payload) =>
      apiRequest("/tracking/location", { method: "POST", body: JSON.stringify(payload) }),
  },
  geofences: {
    list: () => apiRequest("/geofences"),
    filter: (query = {}) => {
      const all = apiRequest("/geofences");
      return all.then((items) =>
        items.filter((item) =>
          Object.entries(query).every(([k, v]) => item[k] === v)
        )
      );
    },
    get: (id) => apiRequest(`/geofences/${id}`),
    create: (data) => apiRequest("/geofences", { method: "POST", body: JSON.stringify(data) }),
    update: (id, data) =>
      apiRequest(`/geofences/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    delete: (id) => apiRequest(`/geofences/${id}`, { method: "DELETE" }),
  },
  maintenance: {
    list: () => apiRequest("/maintenance"),
    filter: (query = {}) =>
      apiRequest("/maintenance").then((items) =>
        items.filter((item) => Object.entries(query).every(([k, v]) => item[k] === v))
      ),
    create: (data) => apiRequest("/maintenance", { method: "POST", body: JSON.stringify(data) }),
    update: (id, data) =>
      apiRequest(`/maintenance/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    delete: (id) => apiRequest(`/maintenance/${id}`, { method: "DELETE" }),
  },
  reportSchedules: {
    list: (sortBy, limit) => {
      const params = new URLSearchParams();
      if (sortBy) params.set("sort", sortBy);
      if (limit != null) params.set("limit", String(limit));
      const q = params.toString();
      return apiRequest(`/report-schedules${q ? `?${q}` : ""}`);
    },
    filter: (query = {}) =>
      apiRequest("/report-schedules").then((items) =>
        items.filter((item) => Object.entries(query).every(([k, v]) => item[k] === v))
      ),
    create: (data) =>
      apiRequest("/report-schedules", { method: "POST", body: JSON.stringify(data) }),
    delete: (id) => apiRequest(`/report-schedules/${id}`, { method: "DELETE" }),
  },
};
