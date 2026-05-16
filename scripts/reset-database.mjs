/**
 * Delete SQLite DB and recreate empty fleet (no demo data).
 * Run: npm run db:reset
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = path.join(root, "data");
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

for (const name of fs.readdirSync(dataDir)) {
  if (name.startsWith("fleet.sqlite") || name === "fleet-db.json") {
    fs.unlinkSync(path.join(dataDir, name));
    console.log("Removed", name);
  }
}

console.log("\nRestart API: npm run dev:api");
console.log("Fresh DB will have admin@fleet.com / admin123 only.\n");
