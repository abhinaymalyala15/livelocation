import { seedDefaultAdmin } from "./auth.js";
import { initFleetTables } from "./fleetRepository.js";

/** Empty fleet tables + default admin — no demo vehicles */
export async function seedDatabaseIfEmpty() {
  seedDefaultAdmin();
  initFleetTables();
}
