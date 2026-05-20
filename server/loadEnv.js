import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const rootDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

/**
 * Load .env then .env.local from project root into process.env.
 * Does not override variables already set in the environment.
 */
export function loadProjectEnv() {
  let fleetDataDirFromLocal = null;

  for (const file of [".env", ".env.local"]) {
    const filePath = path.join(rootDir, file);
    if (!fs.existsSync(filePath)) continue;

    const text = fs.readFileSync(filePath, "utf8");
    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }

      if (file === ".env.local" && key === "FLEET_DATA_DIR") {
        fleetDataDirFromLocal = value;
      }

      if (file === ".env.local") {
        process.env[key] = value;
      } else if (process.env[key] === undefined) {
        process.env[key] = value;
      }
    }
  }

  // Local dev: always use .env.local database path (avoids stray shell FLEET_DATA_DIR)
  if (process.env.NODE_ENV !== "production" && fleetDataDirFromLocal) {
    process.env.FLEET_DATA_DIR = fleetDataDirFromLocal;
  }
}
