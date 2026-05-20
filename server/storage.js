import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Default Render persistent disk mount (see render.yaml) */
export const RENDER_DATA_DIR = "/var/data";

let storageInfo = null;

function resolveDataDir() {
  const configured = process.env.FLEET_DATA_DIR?.trim();
  if (configured) return path.resolve(configured);
  return path.join(__dirname, "..", "data");
}

/**
 * Ensure data directory exists and is writable. Call once at server startup.
 */
export function initStorage() {
  if (storageInfo) return storageInfo;

  const dataDir = resolveDataDir();
  const dbPath = path.join(dataDir, "fleet.sqlite");
  const usingPersistentEnv = Boolean(process.env.FLEET_DATA_DIR?.trim());

  try {
    fs.mkdirSync(dataDir, { recursive: true });
  } catch (err) {
    throw new Error(`Cannot create fleet data directory "${dataDir}": ${err.message}`);
  }

  let writable = false;
  let writeError = null;
  const probe = path.join(dataDir, ".fleet-write-probe");
  try {
    fs.writeFileSync(probe, `${Date.now()}\n`, "utf8");
    fs.unlinkSync(probe);
    writable = true;
  } catch (err) {
    writeError = err.message;
  }

  if (!writable) {
    throw new Error(`Fleet data directory is not writable: ${dataDir} (${writeError})`);
  }

  const dbExists = fs.existsSync(dbPath);
  const persistentDataDir = usingPersistentEnv && writable;

  storageInfo = {
    dataDir,
    dbPath,
    dbExists,
    writable,
    persistentDataDir,
    mode: persistentDataDir ? "persistent" : "local",
  };

  return storageInfo;
}

export function getStorageInfo() {
  return storageInfo ?? initStorage();
}

/** Health payload fields for GET /api/health */
export function getStorageHealth() {
  const info = getStorageInfo();
  return {
    ok: info.writable,
    persistentDataDir: info.persistentDataDir,
    database: info.dbPath,
    dataDir: info.dataDir,
    dbExists: info.dbExists,
    storageMode: info.mode,
  };
}

export function logStorageStartup() {
  const info = getStorageInfo();
  const lines = [
    `[storage] mode=${info.mode}`,
    `[storage] dataDir=${info.dataDir}`,
    `[storage] database=${info.dbPath}`,
    `[storage] persistentDataDir=${info.persistentDataDir}`,
    `[storage] dbExists=${info.dbExists}`,
  ];

  if (process.env.NODE_ENV === "production" && !info.persistentDataDir) {
    lines.push(
      "[storage] WARNING: FLEET_DATA_DIR is not set — SQLite uses ephemeral disk and data may be lost on restart."
    );
    lines.push(`[storage] Set FLEET_DATA_DIR=${RENDER_DATA_DIR} and attach a Render persistent disk.`);
  }

  lines.forEach((line) => console.log(line));
}
