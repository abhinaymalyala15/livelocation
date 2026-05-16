import { Activity } from "lucide-react";
import moment from "moment";
import { LiveBadge, LastUpdatedText } from "./LiveIndicator";

function getGreeting() {
  const h = moment().hour();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default function DashboardHero({ activeCount, totalCount, lastUpdated }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-1">
      <div>
        <p className="text-xs font-medium text-primary uppercase tracking-wider">{getGreeting()}</p>
        <h2 className="text-lg font-semibold text-foreground mt-0.5">Hyderabad fleet overview</h2>
        <p className="text-sm text-muted-foreground">
          {activeCount} of {totalCount} vehicles moving or on trip
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <LiveBadge />
        <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
          <Activity className="h-3.5 w-3.5" />
          <LastUpdatedText timestamp={lastUpdated ? new Date(lastUpdated).toISOString() : null} prefix="Fleet data" />
        </div>
      </div>
    </div>
  );
}
