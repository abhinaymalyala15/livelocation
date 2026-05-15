import { useLocation } from "react-router-dom";
import { Menu, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import ConnectionIndicator from "./ConnectionIndicator";

const PAGE_TITLES = {
  "/admin": { title: "Live Map", subtitle: "Monitor vehicles in real time" },
  "/admin/vehicles": { title: "Vehicles", subtitle: "Manage your fleet" },
  "/admin/trip-logs": { title: "Trips", subtitle: "History and route playback" },
  "/admin/geofences": { title: "Geofences", subtitle: "Zones and alerts" },
};

export default function AdminNavbar({ user, onToggleSidebar, connected }) {
  const { pathname } = useLocation();
  const page = PAGE_TITLES[pathname] || { title: "FleetTrack", subtitle: "Admin" };

  return (
    <header className="h-14 shrink-0 border-b border-border bg-card/95 backdrop-blur-md flex items-center justify-between px-4 lg:px-6 sticky top-0 z-20">
      <div className="flex items-center gap-3 min-w-0">
        <Button variant="ghost" size="icon" className="lg:hidden shrink-0" onClick={onToggleSidebar}>
          <Menu className="h-5 w-5" />
        </Button>
        <div className="min-w-0">
          <h2 className="font-semibold text-foreground truncate">{page.title}</h2>
          <p className="text-xs text-muted-foreground truncate hidden sm:block">{page.subtitle}</p>
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <ConnectionIndicator connected={connected} />
        <div className="h-8 w-px bg-border hidden sm:block" />
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
            <User className="h-4 w-4 text-primary" />
          </div>
          <span className="text-sm font-medium text-foreground hidden md:block max-w-[140px] truncate">
            {user?.name || user?.email}
          </span>
        </div>
      </div>
    </header>
  );
}
