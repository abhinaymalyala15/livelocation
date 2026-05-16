import { getSnapshot, saveSnapshot } from "./db.js";
import { seedDefaultAdmin } from "./auth.js";
import { buildInitialStorage } from "./buildSeed.js";

/** Empty fleet + default admin account only */
export async function seedDatabaseIfEmpty() {
  seedDefaultAdmin();

  if (getSnapshot()) return;

  const data = buildInitialStorage();
  saveSnapshot(data);
  console.log("[db] Empty fleet database ready (no demo data)");
}
