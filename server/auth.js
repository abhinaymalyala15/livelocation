import crypto from "crypto";
import { db } from "./db.js";

const sessions = new Map();

export function hashPassword(password) {
  return crypto.createHash("sha256").update(String(password)).digest("hex");
}

export function createToken() {
  return crypto.randomBytes(24).toString("hex");
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

  const user = {
    id: `user_${Date.now()}`,
    email: trimmedEmail,
    password_hash: hashPassword(password),
    role: "driver",
    display_name: name,
    created_at: new Date().toISOString(),
  };

  db.prepare(
    `INSERT INTO users (id, email, password_hash, role, display_name, created_at)
     VALUES (@id, @email, @password_hash, @role, @display_name, @created_at)`
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
  sessions.set(token, user);
  return { user, token };
}

export function getUserByToken(token) {
  if (!token) return null;
  return sessions.get(token) || null;
}

export function logoutToken(token) {
  if (token) sessions.delete(token);
}

export function updateDisplayName(email, display_name) {
  const name = String(display_name).trim();
  if (!name) throw { status: 400, message: "Display name is required" };

  db.prepare("UPDATE users SET display_name = ? WHERE email = ?").run(name, email);
  const row = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
  const user = toPublicUser(row);
  for (const [token, sess] of sessions.entries()) {
    if (sess.email === email) sessions.set(token, user);
  }
  return user;
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
    status: "active",
    created_at: row.created_at,
  };
}
