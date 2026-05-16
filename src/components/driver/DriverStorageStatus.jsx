import { useQuery } from "@tanstack/react-query";
import { Database, CheckCircle2, AlertCircle } from "lucide-react";
import { fetchDriverStorageDebug, isDatabaseOnline } from "@/api/persist";
import { cn } from "@/lib/utils";

export default function DriverStorageStatus({ driverEmail, tripActive }) {
  const { data, isFetching, error } = useQuery({
    queryKey: ["driver-storage-debug", driverEmail],
    queryFn: () => fetchDriverStorageDebug(driverEmail),
    enabled: !!driverEmail && tripActive,
    refetchInterval: tripActive ? 8000 : false,
  });

  const dbOnline = isDatabaseOnline();

  if (!driverEmail) return null;

  return (
    <section className="rounded-xl border border-border bg-card p-4 text-sm">
      <div className="flex items-center gap-2 font-medium mb-2">
        <Database className="h-4 w-4 text-primary" />
        Data storage
      </div>
      <div className="space-y-1.5 text-muted-foreground">
        <p className="flex items-center gap-2">
          {dbOnline ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
          )}
          <span>
            Database server:{" "}
            <span className={cn(dbOnline ? "text-emerald-700" : "text-amber-700", "font-medium")}>
              {dbOnline ? "Connected (SQLite)" : "Offline - using browser backup only"}
            </span>
          </span>
        </p>
        {tripActive && (
          <>
            {isFetching && !data && <p>Checking saved GPS points...</p>}
            {error && <p className="text-destructive">Could not verify storage.</p>}
            {data && (
              <>
                <p>
                  Trips in DB: <strong className="text-foreground">{data.tripCount}</strong>
                  {" · "}Active: <strong className="text-foreground">{data.activeTrips}</strong>
                </p>
                <p>
                  GPS logs saved:{" "}
                  <strong className="text-emerald-700">{data.locationLogCount}</strong>
                </p>
                {data.recentLogs?.[0] && (
                  <p className="text-xs truncate">
                    Last point: {data.recentLogs[0].latitude?.toFixed(5)},{" "}
                    {data.recentLogs[0].longitude?.toFixed(5)} at{" "}
                    {new Date(data.recentLogs[0].timestamp).toLocaleTimeString()}
                  </p>
                )}
              </>
            )}
          </>
        )}
        {!tripActive && (
          <p className="text-xs">Start a trip to verify GPS is written to the database.</p>
        )}
      </div>
    </section>
  );
}
