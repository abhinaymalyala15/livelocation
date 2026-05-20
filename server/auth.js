import crypto from "crypto";
import { db } from "./db.js";

export function normalizeLoginName(name) {
  return String(name).trim().toLowerCase().replace(/\s+/g, " ");
}

export function hashPassword(password) {
  return crypto.createHash("sha256").update(String(password)).digest("hex");
}

function migrateLoginNameColumn() {
  const cols = db.prepare("PRAGMA table_info(users)").all();
  if (!cols.some((c) => c.name === "login_name")) {
    db.exec("ALTER TABLE users ADD COLUMN login_name TEXT");
    db.exec(
      "CREATE UNIQUE INDEX IF NOT EXISTS idx_users_login_name ON users(login_name) WHERE login_name IS NOT NULL"
    );
  }
  const drivers = db
    .prepare("SELECT id, display_name, login_name FROM users WHERE role = 'driver'")
    .all();
  for (const row of drivers) {
    if (!row.login_name && row.display_name) {
      db.prepare("UPDATE users SET login_name = ? WHERE id = ?").run(
        normalizeLoginName(row.display_name),
        row.id
      );
    }
  }
}

migrateLoginNameColumn();

export function createToken() {
  return crypto.randomBytes(24).toString("hex");
}

function saveSession(token, user) {
  db.prepare(
    `INSERT INTO auth_sessions (token, user_json, created_at) VALUES (?, ?, ?)
     ON CONFLICT(token) DO UPDATE SET user_json = excluded.user_json`
  ).run(token, JSON.stringify(user), new Date().toISOString());
}

function deleteSession(token) {
  if (token) db.prepare("DELETE FROM auth_sessions WHERE token = ?").run(token);
}

export function seedDefaultAdmin() {
  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get("admin@fleet.com");
  if (existing) return;

  db.prepare(
    `INSERT INTO users (id, email, password_hash, role, display_name, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(
    "user_admin",
    "admin@fleet.com",
    hashPassword("admin123"),
    "admin",
    "Fleet Admin",
    new Date().toISOString()
  );
  console.log("[auth] Default admin: admin@fleet.com / admin123");
}

export function registerDriver({ email, password, display_name }) {
  const trimmedEmail = String(email).trim().toLowerCase();
  const name = String(display_name).trim();

  if (!trimmedEmail || !password || !name) {
    throw { status: 400, message: "Email, password, and display name are required" };
  }

  const exists = db.prepare("SELECT id FROM users WHERE email = ?").get(trimmedEmail);
  if (exists) throw { status: 409, message: "Email already registered" };

  const loginName = normalizeLoginName(name);
  const nameTaken = db.prepare("SELECT id FROM users WHERE login_name = ?").get(loginName);
  if (nameTaken) throw { status: 409, message: "Driver name already in use" };

  const user = {
    id: `user_${Date.now()}`,
    email: trimmedEmail,
    password_hash: hashPassword(password),
    role: "driver",
    display_name: name,
    login_name: loginName,
    created_at: new Date().toISOString(),
  };

  db.prepare(
    `INSERT INTO users (id, email, password_hash, role, display_name, login_name, created_at)
     VALUES (@id, @email, @password_hash, @role, @display_name, @login_name, @created_at)`
  ).run(user);

  return toPublicUser(user);
}

/** Admin creates driver account (name + password); vehicle added separately in route */
export function createDriverByAdmin({ display_name, password }) {
  const name = String(display_name).trim();
  const pwd = String(password);

  if (!name || !pwd) {
    throw { status: 400, message: "Driver name and password are required" };
  }
  if (pwd.length < 4) {
    throw { status: 400, message: "Password must be at least 4 characters" };
  }

  const loginName = normalizeLoginName(name);
  const nameTaken = db.prepare("SELECT id FROM users WHERE login_name = ?").get(loginName);
  if (nameTaken) throw { status: 409, message: "Driver name already exists" };

  const id = `user_${Date.now()}`;
  const safe = loginName.replace(/[^a-z0-9]+/g, ".").replace(/^\.|\.$/g, "") || "driver";
  const email = `${safe}.${id}@fleet.local`;

  const user = {
    id,
    email,
    password_hash: hashPassword(pwd),
    role: "driver",
    display_name: name,
    login_name: loginName,
    created_at: new Date().toISOString(),
  };

  db.prepare(
    `INSERT INTO users (id, email, password_hash, role, display_name, login_name, created_at)
     VALUES (@id, @email, @password_hash, @role, @display_name, @login_name, @created_at)`
  ).run(user);

  return toPublicUser(user);
}

export function loginUser(email, password) {
  const trimmedEmail = String(email).trim().toLowerCase();
  const row = db.prepare("SELECT * FROM users WHERE email = ?").get(trimmedEmail);
  if (!row || row.password_hash !== hashPassword(password)) {
    throw { status: 401, message: "Invalid email or password" };
  }
  const user = toPublicUser(row);
  const token = createToken();
  saveSession(token, user);
  return { user, token };
}

/** Driver sign-in with display name + password (set by admin) */
export function loginDriverByName(name, password) {
  const loginName = normalizeLoginName(name);
  if (!loginName) throw { status: 400, message: "Driver name is required" };

  const row = db
    .prepare("SELECT * FROM users WHERE login_name = ? AND role = 'driver'")
    .get(loginName);
  if (!row || row.password_hash !== hashPassword(password)) {
    throw { status: 401, message: "Invalid name or password" };
  }
  const user = toPublicUser(row);
  const token = createToken();
  saveSession(token, user);
  return { user, token };
}

export function getUserByToken(token) {
  if (!token) return null;
  const row = db.prepare("SELECT user_json FROM auth_sessions WHERE token = ?").get(token);
  if (!row) return null;
  try {
    return JSON.parse(row.user_json);
  } catch {
    deleteSession(token);
    return null;
  }
}

export function logoutToken(token) {
  deleteSession(token);
}

export function updateDisplayName(email, display_name) {
  const name = String(display_name).trim();
  if (!name) throw { status: 400, message: "Display name is required" };

  const normalizedEmail = String(email).trim().toLowerCase();
  db.prepare("UPDATE users SET display_name = ? WHERE email = ?").run(name, normalizedEmail);
  const row = db.prepare("SELECT * FROM users WHERE email = ?").get(normalizedEmail);
  const user = toPublicUser(row);

  const sessions = db.prepare("SELECT token, user_json FROM auth_sessions").all();
  for (const sess of sessions) {
    try {
      const parsed = JSON.parse(sess.user_json);
      if (parsed.email === normalizedEmail) saveSession(sess.token, user);
    } catch {
      deleteSession(sess.token);
    }
  }
  return user;
}

export function lookupUserByEmail(email) {
  const trimmedEmail = String(email).trim().toLowerCase();
  if (!trimmedEmail) return { exists: false };
  const row = db.prepare("SELECT * FROM users WHERE email = ?").get(trimmedEmail);
  if (!row) return { exists: false };
  return { exists: true, user: toPublicUser(row) };
}

export function listUsers(role = null) {
  if (role) {
    return db
      .prepare("SELECT * FROM users WHERE role = ? ORDER BY display_name")
      .all(role)
      .map(toPublicUser);
  }
  return db.prepare("SELECT * FROM users ORDER BY display_name").all().map(toPublicUser);
}

function toPublicUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    role: row.role,
    name: row.display_name,
    display_name: row.display_name,
    login_name: row.login_name || normalizeLoginName(row.display_name),
    status: "active",
    created_at: row.created_at,
  };
}
