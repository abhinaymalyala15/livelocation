import { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import AdminSidebar from "./AdminSidebar";
import AdminNavbar from "./AdminNavbar";
import { base44 } from "@/api/base44Client";

export default function AdminLayout() {
  const [user, setUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    base44.auth.me().then(setUser);
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <div className="hidden lg:flex shrink-0">
        <AdminSidebar
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed((c) => !c)}
        />
      </div>

      {sidebarOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-30 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="fixed left-0 top-0 z-40 lg:hidden shadow-2xl">
            <AdminSidebar collapsed={false} />
          </div>
        </>
      )}

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <AdminNavbar
          user={user}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          connected={true}
        />
        <main className="flex-1 overflow-auto bg-[linear-gradient(180deg,hsl(var(--background))_0%,hsl(210_20%_96%)_100%)]">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
