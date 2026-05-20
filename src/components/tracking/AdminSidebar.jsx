import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Map,
  Truck,
  Route,
  ShieldCheck,
  LayoutDashboard,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/AuthContext";
import { LiveDot } from "./LiveIndicator";

const navItems = [
  { path: "/admin", icon: LayoutDashboard, label: "Live Map" },
  { path: "/admin/drivers", icon: Users, label: "Drivers" },
  { path: "/admin/vehicles", icon: Truck, label: "Vehicles" },
  { path: "/admin/trip-logs", icon: Route, label: "Trips" },
  { path: "/admin/geofences", icon: ShieldCheck, label: "Geofences" },
];

export default function AdminSidebar({ collapsed = false, onToggleCollapse }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, user } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <motion.aside
      layout
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "h-screen flex flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border shrink-0",
        collapsed ? "w-[4.25rem]" : "w-60"
      )}
    >
      <div className="h-14 flex items-center gap-2 px-3 border-b border-sidebar-border shrink-0">
        <div className="h-9 w-9 rounded-lg bg-sidebar-primary flex items-center justify-center shrink-0 shadow-lg shadow-black/20">
          <Map className="h-[1.125rem] w-[1.125rem] text-sidebar-primary-foreground" />
        </div>
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: "auto" }}
              exit={{ opacity: 0, width: 0 }}
              className="flex-1 min-w-0 overflow-hidden"
            >
              <p className="font-semibold text-sm leading-tight">FleetTrack</p>
              <p className="text-[10px] text-sidebar-foreground/50 flex items-center gap-1">
                <LiveDot size="sm" />
                Hyderabad fleet
              </p>
            </motion.div>
          )}
        </AnimatePresence>
        {onToggleCollapse && (
          <button
            type="button"
            onClick={onToggleCollapse}
            className="hidden lg:flex h-8 w-8 items-center justify-center rounded-md hover:bg-sidebar-accent text-sidebar-foreground/70 shrink-0"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        )}
      </div>

      <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
        {!collapsed && (
          <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/40">
            Navigation
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
                "relative flex items-center gap-3 rounded-lg text-sm font-medium transition-colors duration-200",
                collapsed ? "justify-center px-2 py-2.5" : "px-3 py-2.5",
                isActive
                  ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-md shadow-black/15"
                  : "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-foreground"
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute inset-0 rounded-lg bg-sidebar-primary"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              <item.icon className={cn("h-[1.125rem] w-[1.125rem] shrink-0 relative z-10")} />
              {!collapsed && <span className="relative z-10">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="p-2 border-t border-sidebar-border space-y-1 shrink-0">
        {!collapsed && user && (
          <div className="px-3 py-2 rounded-lg bg-sidebar-accent/80 mb-1">
            <p className="text-xs font-medium truncate">{user.name || "User"}</p>
            <p className="text-[10px] text-sidebar-foreground/50 capitalize">{user.role}</p>
          </div>
        )}
        <button
          type="button"
          onClick={handleLogout}
          className={cn(
            "flex w-full items-center gap-3 rounded-lg text-sm font-medium text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors",
            collapsed ? "justify-center px-2 py-2.5" : "px-3 py-2.5"
          )}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && <span>Sign out</span>}
        </button>
      </div>
    </motion.aside>
  );
}
