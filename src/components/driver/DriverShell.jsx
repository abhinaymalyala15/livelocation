import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, Map, LogOut, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV = [
  { id: "dashboard", label: "Dashboard", icon: Map },
  { id: "sos", label: "Emergency", icon: AlertTriangle },
];

export default function DriverShell({
  user,
  children,
  onLogout,
  activeSection = "dashboard",
  onNav,
  minimal = false,
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  if (minimal) {
    return (
      <div className="min-h-[100dvh] max-h-[100dvh] bg-background flex flex-col overflow-hidden">
        <header className="shrink-0 flex items-center justify-between px-4 py-2.5 border-b border-border bg-card safe-top">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <Map className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-semibold text-sm">FleetTrack</span>
          </div>
          <Button variant="ghost" size="sm" className="gap-1.5" onClick={onLogout}>
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Logout</span>
          </Button>
        </header>
        {children}
      </div>
    );
  }

  return (
    <motion.div className="min-h-screen bg-background flex">
      <aside className="hidden md:flex w-56 flex-col border-r border-border bg-card shrink-0">
        <motion.div className="p-4 border-b border-border">
          <motion.div className="flex items-center gap-2">
            <motion.div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center">
              <Map className="h-5 w-5 text-primary-foreground" />
            </motion.div>
            <motion.div>
              <p className="font-semibold text-sm">FleetTrack</p>
              <p className="text-[11px] text-muted-foreground">Driver</p>
            </motion.div>
          </motion.div>
        </motion.div>
        <nav className="flex-1 p-3 space-y-1">
          {NAV.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => onNav?.(id)}
              className={cn(
                "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-colors",
                activeSection === id
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:bg-muted"
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </nav>
        <motion.div className="p-3 border-t border-border">
          <motion.div className="flex items-center gap-2 px-2 py-2 mb-2">
            <motion.div className="h-8 w-8 rounded-full bg-primary/15 flex items-center justify-center text-xs font-semibold text-primary">
              {user?.name?.[0] || "D"}
            </motion.div>
            <motion.div className="min-w-0">
              <p className="text-sm font-medium truncate">{user?.name}</p>
              <p className="text-[11px] text-muted-foreground truncate">{user?.email}</p>
            </motion.div>
          </motion.div>
          <Button variant="ghost" className="w-full justify-start gap-2" onClick={onLogout}>
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </motion.div>
      </aside>

      <motion.div className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden sticky top-0 z-20 bg-card/95 backdrop-blur border-b border-border px-4 py-3 flex items-center justify-between">
          <Button variant="ghost" size="icon" onClick={() => setMobileOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
          <p className="font-semibold text-sm">Driver Dashboard</p>
          <Button variant="ghost" size="icon" onClick={onLogout}>
            <LogOut className="h-4 w-4" />
          </Button>
        </header>

        <AnimatePresence>
          {mobileOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/40 z-30 md:hidden"
                onClick={() => setMobileOpen(false)}
              />
              <motion.aside
                initial={{ x: -280 }}
                animate={{ x: 0 }}
                exit={{ x: -280 }}
                className="fixed left-0 top-0 bottom-0 w-72 bg-card z-40 border-r md:hidden flex flex-col"
              >
                <motion.div className="p-4 flex justify-between items-center border-b">
                  <span className="font-semibold">Menu</span>
                  <Button variant="ghost" size="icon" onClick={() => setMobileOpen(false)}>
                    <X className="h-5 w-5" />
                  </Button>
                </motion.div>
                <nav className="p-3 space-y-1 flex-1">
                  {NAV.map(({ id, label, icon: Icon }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => {
                        onNav?.(id);
                        setMobileOpen(false);
                      }}
                      className={cn(
                        "w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm",
                        activeSection === id ? "bg-primary/10 text-primary" : "hover:bg-muted"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {label}
                    </button>
                  ))}
                </nav>
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        {children}
      </motion.div>
    </motion.div>
  );
}
