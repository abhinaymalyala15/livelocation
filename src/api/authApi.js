import { emitSessionRevoked } from "@/lib/sessionRevoke";

const API = "/api/auth";
const TOKEN_KEY = "fleet_token";

export function getAuthToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setAuthToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

async function parseJson(res) {
  const text = await res.text();
  let body = {};
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = { error: res.status === 404 ? "API route not found — restart backend (npm run dev)" : "Invalid server response" };
  }
  if (!res.ok) {
    if (res.status === 401 && getAuthToken()) {
      emitSessionRevoked({ reason: "session_expired", source: "auth" });
    }
    const err = new Error(body.error || body.message || `Request failed (${res.status})`);
    err.status = res.status;
    err.body = body;
    throw err;
  }
  return body;
}

async function apiFetch(path, options = {}) {
  let res;
  try {
    res = await fetch(path, options);
  } catch {
    const hint =
      import.meta.env.DEV
        ? "Start the API: npm run dev (both) or npm run dev:api, then open http://127.0.0.1:5173"
        : "The API is unavailable. Check that the backend is running and reachable.";
    throw new Error(`Cannot reach API server. ${hint}`);
  }
  return parseJson(res);
}

export async function checkApiHealth() {
  try {
    const res = await fetch("/api/health");
    if (!res.ok) return false;
    const data = await res.json();
    return !!data.ok;
  } catch {
    return false;
  }
}

export async function apiLogin(email, password) {
  const body = await apiFetch(`${API}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: String(email).trim().toLowerCase(),
      password,
    }),
  });
  if (!body.token || !body.user) {
    throw new Error("Invalid login response from server");
  }
  setAuthToken(body.token);
  return body.user;
}

export async function apiLoginDriver(name, password) {
  const body = await apiFetch(`${API}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: String(name).trim(),
      password,
    }),
  });
  if (!body.token || !body.user) {
    throw new Error("Invalid login response from server");
  }
  setAuthToken(body.token);
  return body.user;
}

export async function apiLookupUser(email) {
  const trimmed = String(email || "").trim().toLowerCase();
  if (!trimmed) return { exists: false };
  try {
    const res = await fetch(`/api/auth/lookup?email=${encodeURIComponent(trimmed)}`);
    if (!res.ok) return { exists: false };
    return res.json();
  } catch {
    return { exists: false };
  }
}

export async function apiRegisterDriver({ email, password, display_name }) {
  const body = await apiFetch(`${API}/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, display_name }),
  });
  return body.user;
}

export async function apiMe() {
  const token = getAuthToken();
  if (!token) throw { status: 401, message: "Not authenticated" };
  return apiFetch(`${API}/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function apiLogout() {
  const token = getAuthToken();
  if (token) {
    await fetch(`${API}/logout`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {});
  }
  setAuthToken(null);
}

export async function apiUpdateProfile(display_name) {
  const token = getAuthToken();
  const body = await apiFetch(`${API}/profile`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ display_name }),
  });
  return body.user;
}

export async function apiListDrivers() {
  return apiFetch("/api/users?role=driver", {
    headers: { Authorization: `Bearer ${getAuthToken()}` },
  });
}

export async function apiListAdminDrivers() {
  return apiFetch("/api/admin/drivers", {
    headers: { Authorization: `Bearer ${getAuthToken()}` },
  });
}

export async function apiCreateDriver({ display_name, password, vehicle_name, plate }) {
  return apiFetch("/api/admin/drivers", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getAuthToken()}`,
    },
    body: JSON.stringify({ display_name, password, vehicle_name, plate }),
  });
}
