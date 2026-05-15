import { Link, useLocation, useNavigate } from "react-router-dom";
import { Map, Truck, Route, ShieldCheck, LayoutDashboard, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/AuthContext";

const navItems = [
  { path: "/admin", icon: LayoutDashboard, label: "Live Map" },
  { path: "/admin/vehicles", icon: Truck, label: "Vehicles" },
  { path: "/admin/trip-logs", icon: Route, label: "Trips" },
  { path: "/admin/geofences", icon: ShieldCheck, label: "Geofences" },
];

export default function AdminSidebar({ collapsed = false }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, user } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <aside
      className={cn(
        "h-screen flex flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border",
        collapsed ? "w-[4.5rem]" : "w-60"
      )}
    >
      <div className="h-14 flex items-center gap-3 px-4 border-b border-sidebar-border shrink-0">
        <div className="h-9 w-9 rounded-lg bg-sidebar-primary flex items-center justify-center shrink-0 shadow-lg shadow-black/20">
          <Map className="h-[1.125rem] w-[1.125rem] text-sidebar-primary-foreground" />
        </div>
        {!collapsed && (
          <div>
            <p className="font-semibold text-sm leading-tight">FleetTrack</p>
            <p className="text-[11px] text-sidebar-foreground/50">Fleet management</p>
          </div>
        )}
      </div>

      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {!collapsed && (
          <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/40">
            Menu
          </p>
        )}
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              title={collapsed ? item.label : undefined}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
                isActive
                  ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-md shadow-black/15"
                  : "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-foreground"
              )}
            >
              <item.icon className={cn("h-[1.125rem] w-[1.125rem] shrink-0", isActive && "opacity-100")} />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-sidebar-border space-y-2 shrink-0">
        {!collapsed && user && (
          <div className="px-3 py-2 rounded-lg bg-sidebar-accent/80">
            <p className="text-xs font-medium truncate">{user.name || "User"}</p>
            <p className="text-[11px] text-sidebar-foreground/50 truncate capitalize">{user.role}</p>
          </div>
        )}
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && <span>Sign out</span>}
        </button>
      </div>
    </aside>
  );
}
