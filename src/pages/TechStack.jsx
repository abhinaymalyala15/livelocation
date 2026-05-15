import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Layers, Database, Globe, Cpu, FolderOpen, Server, MonitorSmartphone } from "lucide-react";

const techCategories = [
  {
    icon: MonitorSmartphone,
    title: "Frontend Framework",
    color: "text-sky-600",
    bg: "bg-sky-500/10",
    items: [
      { name: "React 18", role: "UI library — component-based, virtual DOM rendering" },
      { name: "React Router v6", role: "Client-side routing between admin/driver pages" },
      { name: "Vite", role: "Build tool — ultra-fast dev server & production bundler" },
      { name: "Tailwind CSS", role: "Utility-first CSS — all styling is tokenized via index.css + tailwind.config.js" },
    ],
  },
  {
    icon: Database,
    title: "State Management & Data Fetching",
    color: "text-emerald-600",
    bg: "bg-emerald-500/10",
    items: [
      { name: "@tanstack/react-query v5", role: "Server state: fetching, caching, auto-refetch every 5s for live data" },
      { name: "React useState / useEffect", role: "Local UI state: selected vehicle, trip ID, tracking status" },
      { name: "Real-time subscriptions", role: "base44.entities.Vehicle.subscribe() — WebSocket-like push updates to admin map" },
    ],
  },
  {
    icon: Server,
    title: "Backend-as-a-Service (Base44 Platform)",
    color: "text-purple-600",
    bg: "bg-purple-500/10",
    items: [
      { name: "Base44 Entity Database", role: "NoSQL document store — Vehicle, Trip, LocationLog, Geofence collections" },
      { name: "Base44 Auth", role: "JWT-based auth: login, role-based routing (admin → /admin, driver → /driver)" },
      { name: "base44.entities CRUD SDK", role: ".list(), .filter(), .create(), .update(), .delete() — all DB operations" },
      { name: "Real-time subscriptions", role: ".subscribe(callback) — entity-level change events pushed to frontend" },
    ],
  },
  {
    icon: Globe,
    title: "Maps & Geolocation",
    color: "text-amber-600",
    bg: "bg-amber-500/10",
    items: [
      { name: "React-Leaflet v4", role: "Map rendering — OpenStreetMap tiles via CartoDBLight style" },
      { name: "Leaflet.js", role: "Underlying map engine — custom SVG markers, Polyline path, Circle geofences" },
      { name: "navigator.geolocation", role: "Browser native GPS — watchPosition() in useGeolocation.js hook" },
      { name: "Polyline (Leaflet)", role: "Draws vehicle route path from LocationLog coordinates during active trip" },
      { name: "Circle (Leaflet)", role: "Renders geofence zones on map as visual overlays" },
    ],
  },
  {
    icon: Cpu,
    title: "UI Component Library",
    color: "text-rose-600",
    bg: "bg-rose-500/10",
    items: [
      { name: "shadcn/ui", role: "Pre-built accessible components: Dialog, Table, Badge, Select, Switch, Card" },
      { name: "Radix UI primitives", role: "Underlying headless components for shadcn (no styling — just behavior)" },
      { name: "lucide-react", role: "Icon library — all icons in the app" },
      { name: "framer-motion", role: "Animation library (installed, available for transitions)" },
      { name: "Sonner (toast)", role: "Toast notification system for trip start/stop/errors" },
      { name: "moment.js", role: "Date/time formatting: fromNow(), duration(), format()" },
    ],
  },
  {
    icon: Layers,
    title: "Architecture Patterns",
    color: "text-indigo-600",
    bg: "bg-indigo-500/10",
    items: [
      { name: "Role-based routing", role: "RoleRouter.jsx checks user.role → redirects admin to /admin, driver to /driver" },
      { name: "Layout routing", role: "React Router Outlet: AdminLayout wraps /admin/* routes with shared Sidebar+Navbar" },
      { name: "Polling + Subscriptions", role: "Dual strategy: refetchInterval:5000 for reliability + .subscribe() for instant updates" },
      { name: "Interval-based GPS push", role: "setInterval every 5s pushes driver position to DB — admin sees it in real-time" },
      { name: "Geofence detection", role: "Haversine formula computed client-side in AdminDashboard on each vehicle update" },
    ],
  },
];

const folderStructure = `
src/
├── App.jsx                        ← Router: all page routes + auth wrappers
├── main.jsx                       ← React DOM entry point
├── index.css                      ← Design tokens (CSS variables for all colors/fonts)
├── tailwind.config.js             ← Maps CSS vars → Tailwind class names
│
├── api/
│   └── base44Client.js            ← Pre-initialized Base44 SDK instance
│
├── lib/
│   ├── AuthContext.jsx            ← Global auth state provider
│   ├── query-client.js            ← TanStack QueryClient singleton
│   ├── utils.js                   ← cn() class merge utility
│   ├── app-params.js              ← App-level config params
│   └── PageNotFound.jsx           ← 404 page
│
├── hooks/
│   └── useGeolocation.js          ← Browser GPS hook (watchPosition)
│
├── entities/                      ← Database schema definitions (JSON)
│   ├── Vehicle.json               ← Vehicle: name, plate, driver, lat/lng, status
│   ├── Trip.json                  ← Trip: vehicle, driver, destination, times, distance
│   ├── LocationLog.json           ← GPS breadcrumb per trip (every 5s)
│   └── Geofence.json              ← Zone: center lat/lng, radius, alert rules
│
├── pages/
│   ├── RoleRouter.jsx             ← Reads user.role → redirects to correct panel
│   ├── DriverDashboard.jsx        ← Mobile GPS panel: select vehicle, start/stop trip
│   ├── AdminDashboard.jsx         ← Live map + vehicle list + stats + geofence alerts
│   ├── AdminVehicles.jsx          ← Manage fleet: add/view vehicles & driver assignments
│   ├── AdminTrips.jsx             ← Trip history table with search
│   ├── AdminTripLogs.jsx          ← Detailed trip logs with CSV export
│   ├── AdminGeofences.jsx         ← Create/manage geofence zones
│   └── TechStack.jsx              ← This page: architecture documentation
│
└── components/
    ├── UserNotRegisteredError.jsx ← Shown when user is not in the system
    ├── ProtectedRoute.jsx         ← (Available) Auth gate wrapper
    │
    ├── tracking/                  ← All fleet-tracking domain components
    │   ├── AdminLayout.jsx        ← Sidebar + Navbar shell for admin pages
    │   ├── AdminSidebar.jsx       ← Left nav: Dashboard, Vehicles, Trips, Geofences...
    │   ├── AdminNavbar.jsx        ← Top bar: user info, connection status
    │   ├── MapContainer.jsx       ← Leaflet map: markers, polyline, geofence circles
    │   ├── VehicleList.jsx        ← Left panel vehicle list with search/filter
    │   ├── VehicleListItem.jsx    ← Single vehicle row with status badge
    │   ├── VehiclePopup.jsx       ← Map marker popup: speed, heading, last update
    │   ├── StatsCards.jsx         ← Dashboard: total/active/offline/trips counters
    │   ├── StatusBadge.jsx        ← Colored status pill (on_trip/available/offline)
    │   ├── ConnectionIndicator.jsx← WiFi icon with live/offline state
    │   └── Loader.jsx             ← Centered spinner with text
    │
    └── ui/                        ← shadcn/ui component library
        ├── button.jsx, card.jsx, input.jsx, label.jsx
        ├── dialog.jsx, select.jsx, switch.jsx, badge.jsx
        ├── table.jsx, tabs.jsx, toast.jsx, toaster.jsx
        └── ... (30+ components)
`.trim();

const dataFlow = [
  { step: "1", label: "Driver opens /driver", detail: "Browser requests GPS permission" },
  { step: "2", label: "Driver taps Start Trip", detail: "Trip record created in DB (Trip entity), Vehicle.status = 'on_trip'" },
  { step: "3", label: "Every 5 seconds", detail: "setInterval pushes lat/lng → Vehicle entity updated + LocationLog created" },
  { step: "4", label: "Admin map (refetchInterval: 5s)", detail: "Fetches latest Vehicle records → re-renders marker positions" },
  { step: "5", label: "Real-time subscription", detail: "Vehicle.subscribe() fires on DB change → queryClient.invalidate() → instant re-render" },
  { step: "6", label: "Polyline drawn", detail: "MapContainer fetches LocationLog for selected vehicle's active trip → draws path" },
  { step: "7", label: "Geofence check", detail: "Haversine distance between vehicle coords and each zone center → triggers toast/notification if outside radius" },
  { step: "8", label: "Driver taps Stop Trip", detail: "Trip.end_time set, Trip.status = 'completed', Vehicle.status = 'available'" },
];

export default function TechStack() {
  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-6xl">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Layers className="h-6 w-6 text-primary" /> Tech Stack & Architecture
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Complete breakdown of every technology, library, and design pattern used in FleetTrack
        </p>
      </div>

      {/* Tech Categories */}
      <div className="grid gap-4 lg:grid-cols-2">
        {techCategories.map(cat => (
          <Card key={cat.title}>
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <div className={`h-7 w-7 rounded-lg ${cat.bg} flex items-center justify-center`}>
                  <cat.icon className={`h-4 w-4 ${cat.color}`} />
                </div>
                {cat.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-1 space-y-2">
              {cat.items.map(item => (
                <div key={item.name} className="flex gap-2">
                  <Badge variant="outline" className="text-xs shrink-0 self-start mt-0.5">{item.name}</Badge>
                  <p className="text-xs text-muted-foreground">{item.role}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Data Flow */}
      <Card>
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Cpu className="h-4 w-4 text-primary" /> Real-Time Data Flow (End-to-End)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-1">
          <div className="space-y-2">
            {dataFlow.map(step => (
              <div key={step.step} className="flex items-start gap-3">
                <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-[10px] font-bold text-primary">{step.step}</span>
                </div>
                <div>
                  <span className="text-sm font-semibold">{step.label}</span>
                  <span className="text-xs text-muted-foreground ml-2">→ {step.detail}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Folder Structure */}
      <Card>
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <FolderOpen className="h-4 w-4 text-primary" /> Complete Folder Structure
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-1">
          <pre className="text-xs leading-relaxed text-muted-foreground bg-muted/50 rounded-lg p-4 overflow-x-auto whitespace-pre font-mono">
            {folderStructure}
          </pre>
        </CardContent>
      </Card>

      {/* Data Storage */}
      <Card>
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Database className="h-4 w-4 text-primary" /> How Data is Stored & Manipulated
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-1">
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              {
                entity: "Vehicle",
                color: "bg-sky-500/10 border-sky-500/20",
                badge: "text-sky-700",
                desc: "One record per physical vehicle. Updated in-place every 5s during a trip (current_latitude, current_longitude, current_speed). Acts as the live position store. Admin map reads this.",
              },
              {
                entity: "Trip",
                color: "bg-emerald-500/10 border-emerald-500/20",
                badge: "text-emerald-700",
                desc: "One record per trip event. Created on Start Trip, updated on Stop Trip (end_time, distance_km, status). Used for history, analytics, and duration calculations.",
              },
              {
                entity: "LocationLog",
                color: "bg-amber-500/10 border-amber-500/20",
                badge: "text-amber-700",
                desc: "New record created every 5 seconds during an active trip. Contains lat/lng/speed/heading with timestamp. Used to draw the polyline route path on the map.",
              },
              {
                entity: "Geofence",
                color: "bg-purple-500/10 border-purple-500/20",
                badge: "text-purple-700",
                desc: "One record per defined zone. Stores center coordinates + radius_meters. Client-side Haversine formula checks if each vehicle is inside/outside the zone on every location update.",
              },
            ].map(e => (
              <div key={e.entity} className={`rounded-lg border p-3 ${e.color}`}>
                <Badge variant="outline" className={`mb-2 text-xs ${e.badge}`}>{e.entity}</Badge>
                <p className="text-xs text-muted-foreground leading-relaxed">{e.desc}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}