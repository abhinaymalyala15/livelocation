# Render persistent SQLite storage

Fleet data (drivers, vehicles, trips, GPS logs) is stored in **SQLite** at:

```
$FLEET_DATA_DIR/fleet.sqlite
```

## Production setup (Render)

1. **Upgrade** to a plan that supports [persistent disks](https://render.com/docs/disks) (Starter or higher).
2. In the Render dashboard (or use `render.yaml` in this repo):
   - Add a **disk** mounted at `/var/data` (1 GB is enough to start).
   - Set environment variable: `FLEET_DATA_DIR=/var/data`
3. Redeploy the service.

The blueprint `render.yaml` already defines:

- `disk.mountPath: /var/data`
- `FLEET_DATA_DIR: /var/data`

## Verify after deploy

```bash
curl https://YOUR-SERVICE.onrender.com/api/health
```

Expected in production:

```json
{
  "ok": true,
  "persistentDataDir": true,
  "dataDir": "/var/data",
  "dbExists": true,
  "storageMode": "persistent"
}
```

If `persistentDataDir` is `false`, data is on ephemeral disk and **will be lost** when the instance restarts.

## Local development

Without `FLEET_DATA_DIR`, the database is created at:

```
./data/fleet.sqlite
```

Optional (same path as Render):

```bash
FLEET_DATA_DIR=./data npm run dev:api
```

## Startup checks

On boot the server:

1. Creates the data directory if missing
2. Verifies the directory is writable
3. Opens SQLite at `fleet.sqlite` inside that directory
4. Logs storage mode and warns in production if persistence is not configured
