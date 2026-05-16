/**
 * Verify driver trips and GPS logs are stored in SQLite (Node node:sqlite).
 * Run: npm run db:verify
 * Required: DRIVER_EMAIL=you@example.com npm run db:verify
 */

const API = process.env.API_URL || "http://localhost:3001";
const DRIVER = process.env.DRIVER_EMAIL || "";

async function main() {
  if (!DRIVER) {
    console.error("\nSet driver email: DRIVER_EMAIL=your@email.com npm run db:verify\n");
    process.exitCode = 1;
    return;
  }

  console.log("\n=== FleetTrack driver storage verification ===\n");
  console.log("API:", API);
  console.log("Driver:", DRIVER);

  try {
    const health = await fetch(`${API}/api/health`);
    if (!health.ok) throw new Error(`Health check failed: ${health.status}`);
    const healthBody = await health.json();
    console.log("\n[OK] Database server running");
    console.log("     Type:", healthBody.type ?? "unknown");
    console.log("     File:", healthBody.database);

    const debugRes = await fetch(`${API}/api/debug/driver/${encodeURIComponent(DRIVER)}`);
    if (!debugRes.ok) throw new Error(`Debug endpoint failed: ${debugRes.status}`);
    const debug = await debugRes.json();

    console.log("\n--- Driver records in database ---");
    console.log("Trips (total):     ", debug.tripCount);
    console.log("Trips (active):    ", debug.activeTrips);
    console.log("GPS location logs: ", debug.locationLogCount);
    console.log("Last DB snapshot:  ", debug.lastSnapshot?.updated_at ?? "n/a");

    if (debug.recentTrips?.length) {
      console.log("\nRecent trips:");
      debug.recentTrips.forEach((t) => {
        console.log(`  - ${t.id} | ${t.status} | started ${t.start_time}`);
      });
    }

    if (debug.recentLogs?.length) {
      console.log("\nRecent GPS logs:");
      debug.recentLogs.slice(0, 5).forEach((l) => {
        console.log(
          `  - ${l.timestamp} | ${l.latitude?.toFixed(5)}, ${l.longitude?.toFixed(5)} | ${l.speed} km/h`
        );
      });
    }

    const summaryRes = await fetch(`${API}/api/debug/storage-summary`);
    if (summaryRes.ok) {
      const summary = await summaryRes.json();
      console.log("\n--- Full fleet snapshot ---");
      console.log("Vehicles:", summary.vehicles);
      console.log("Trips:", summary.trips);
      console.log("All location logs:", summary.locationLogs);
    }

    if (debug.locationLogCount === 0) {
      console.log("\n[WARN] No GPS logs for this driver yet.");
      console.log("       Log in as driver, start a trip, allow GPS, and wait for movement.");
      process.exitCode = 1;
    } else {
      console.log("\n[PASS] Driver data is stored in the database.");
    }
  } catch (err) {
    console.error("\n[FAIL]", err.message);
    console.error("\nStart the API first: npm run dev:api   (or npm run dev)");
    process.exitCode = 1;
  }

  console.log("");
}

main();
