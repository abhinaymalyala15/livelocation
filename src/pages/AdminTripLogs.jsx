import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import Loader from "../components/tracking/Loader";
import PageHeader from "../components/tracking/PageHeader";
import TripRouteMap from "../components/tracking/TripRouteMap";
import TripDetailPanel from "../components/tracking/TripDetailPanel";
import { Search, Download, Gauge, PanelRightOpen } from "lucide-react";
import moment from "moment";
import { getFleetTotalKm, getDriverTotalKm } from "@/lib/fleetMetrics";
import { LiveBadge } from "../components/tracking/LiveIndicator";

const tripStatusColors = {
  active: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
  completed: "bg-sky-500/10 text-sky-700 border-sky-500/20",
  cancelled: "bg-red-500/10 text-red-600 border-red-500/20",
};

function getDuration(trip) {
  if (!trip?.start_time) return "—";
  if (trip.status === "active") return "In progress";
  if (!trip.end_time) return "—";
  const diff = moment.duration(moment(trip.end_time).diff(moment(trip.start_time)));
  const h = Math.floor(diff.asHours());
  const m = diff.minutes();
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function downloadCSV(trips) {
  const headers = ["Vehicle", "Driver", "Route", "Status", "Start", "End", "Duration (min)", "Distance (km)"];
  const rows = trips.map((t) => {
    const durMins =
      t.start_time && t.end_time
        ? Math.round(moment.duration(moment(t.end_time).diff(moment(t.start_time))).asMinutes())
        : "";
    return [
      t.vehicle_name || "",
      t.driver_name || "",
      `${t.start_location || ""} → ${t.destination || t.end_location || ""}`,
      t.status || "",
      t.start_time ? moment(t.start_time).format("YYYY-MM-DD HH:mm") : "",
      t.end_time ? moment(t.end_time).format("YYYY-MM-DD HH:mm") : "",
      durMins,
      t.distance_km != null ? t.distance_km.toFixed(2) : "",
    ];
  });
  const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `trips-${moment().format("YYYY-MM-DD")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AdminTripLogs() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [detailSheetOpen, setDetailSheetOpen] = useState(false);

  const { data: tripsData, isLoading, isError, error } = useQuery({
    queryKey: ["trip-logs"],
    queryFn: () => base44.entities.Trip.list("-created_date", 500),
    refetchInterval: 15000,
  });

  const { data: vehicles = [] } = useQuery({
    queryKey: ["admin-vehicles"],
    queryFn: () => base44.entities.Vehicle.list("-updated_date"),
  });

  const trips = Array.isArray(tripsData) ? tripsData : [];

  const selectedVehicle = selectedTrip
    ? vehicles.find((v) => v.id === selectedTrip.vehicle_id)
    : null;

  const filtered = trips.filter((t) => {
    const q = search.toLowerCase();
    const matchSearch =
      t.vehicle_name?.toLowerCase().includes(q) ||
      t.driver_name?.toLowerCase().includes(q) ||
      t.destination?.toLowerCase().includes(q);
    const matchStatus = statusFilter === "all" || t.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleSelectTrip = (trip) => {
    setSelectedTrip(trip);
    setDetailSheetOpen(true);
  };

  useEffect(() => {
    if (filtered.length === 0) {
      setSelectedTrip(null);
      setDetailSheetOpen(false);
      return;
    }
    setSelectedTrip((prev) => {
      if (prev && filtered.some((t) => t.id === prev.id)) {
        return filtered.find((t) => t.id === prev.id) ?? prev;
      }
      return (
        filtered.find((t) => t.status === "active") ||
        filtered.find((t) => t.status === "completed") ||
        filtered[0]
      );
    });
  }, [search, statusFilter, tripsData]);

  if (isLoading) return <Loader text="Loading trips..." className="h-full" />;

  if (isError) {
    return (
      <div className="p-6 text-center">
        <p className="text-destructive font-medium">Could not load trips</p>
        <p className="text-sm text-muted-foreground mt-1">{error?.message}</p>
      </div>
    );
  }

  const activeCount = filtered.filter((t) => t.status === "active").length;
  const fleetTotalKm = getFleetTotalKm(trips);
  const filteredTotalKm = getFleetTotalKm(filtered);

  return (
    <div className="page-shell">
      <PageHeader
        title="Trips"
        description={`${filtered.length} trips · ${activeCount} active · ${filteredTotalKm.toFixed(1)} km in view`}
        action={
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => downloadCSV(filtered)}
            disabled={filtered.length === 0}
          >
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="surface-card p-4">
          <p className="text-xs text-muted-foreground font-medium">Fleet distance (all trips)</p>
          <p className="text-2xl font-semibold tabular-nums mt-1">
            {fleetTotalKm.toFixed(1)} <span className="text-sm font-normal text-muted-foreground">km</span>
          </p>
        </Card>
        <Card className="surface-card p-4">
          <p className="text-xs text-muted-foreground font-medium">This page filter</p>
          <p className="text-2xl font-semibold tabular-nums mt-1">
            {filteredTotalKm.toFixed(1)} <span className="text-sm font-normal text-muted-foreground">km</span>
          </p>
        </Card>
        <Card className="surface-card p-4 flex flex-col justify-center">
          <LiveBadge label="Trip logs refreshing" />
        </Card>
      </div>

      {/* Map + detail panel (desktop side-by-side) */}
      <Card className="surface-card overflow-hidden">
        <CardHeader className="p-4 pb-2 border-b bg-muted/30 flex flex-row items-center justify-between gap-2">
          <div>
            <p className="text-sm font-medium">Route map & playback</p>
            <p className="text-xs text-muted-foreground">
              Select a trip below — details appear on the right (desktop) or tap Details on mobile
            </p>
          </div>
          {selectedTrip && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="lg:hidden gap-1.5 shrink-0"
              onClick={() => setDetailSheetOpen(true)}
            >
              <PanelRightOpen className="h-4 w-4" />
              Details
            </Button>
          )}
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            <div className="xl:col-span-2 min-h-[320px]">
              <TripRouteMap trip={selectedTrip} />
            </div>
            <TripDetailPanel
              className="hidden xl:flex min-h-[320px] max-h-[520px]"
              trip={selectedTrip}
              trips={trips}
              vehicle={selectedVehicle}
            />
          </div>
        </CardContent>
      </Card>

      {/* Mobile / tablet slide-over for trip details */}
      <Sheet open={detailSheetOpen} onOpenChange={setDetailSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col">
          <SheetHeader className="sr-only">
            <SheetTitle>Trip details</SheetTitle>
          </SheetHeader>
          <TripDetailPanel
            className="flex-1 border-0 rounded-none shadow-none min-h-0"
            trip={selectedTrip}
            trips={trips}
            vehicle={selectedVehicle}
            onClose={() => setDetailSheetOpen(false)}
          />
        </SheetContent>
      </Sheet>

      <Card className="surface-card overflow-hidden">
        <CardHeader className="p-4 pb-3 space-y-3">
          <div className="flex gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search vehicle, driver, route…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36 h-9">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Driver</TableHead>
                  <TableHead>Route</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Start</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead className="text-right">Trip km</TableHead>
                  <TableHead className="text-right hidden md:table-cell">Driver total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                      No trips found
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((t) => (
                    <TableRow
                      key={t.id}
                      className={`cursor-pointer transition-colors ${
                        selectedTrip?.id === t.id
                          ? "bg-primary/10 ring-1 ring-inset ring-primary/20"
                          : "hover:bg-muted/50"
                      }`}
                      onClick={() => handleSelectTrip(t)}
                    >
                      <TableCell className="font-medium text-sm">
                        <span className="text-primary hover:underline">{t.vehicle_name || "—"}</span>
                      </TableCell>
                      <TableCell className="text-sm">{t.driver_name || "—"}</TableCell>
                      <TableCell className="text-sm max-w-[180px] truncate">
                        {t.start_location || "—"} → {t.destination || t.end_location || "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={tripStatusColors[t.status] || ""}>
                          {t.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {t.start_time ? moment(t.start_time).format("MMM D, HH:mm") : "—"}
                      </TableCell>
                      <TableCell className="text-sm">{getDuration(t)}</TableCell>
                      <TableCell className="text-sm text-right tabular-nums font-medium">
                        {(t.distance_km ?? t.distance) != null
                          ? `${Number(t.distance_km ?? t.distance).toFixed(1)} km`
                          : "—"}
                      </TableCell>
                      <TableCell className="text-xs text-right tabular-nums text-muted-foreground hidden md:table-cell">
                        <span className="inline-flex items-center justify-end gap-1">
                          <Gauge className="h-3 w-3" />
                          {getDriverTotalKm(t.driver_email, trips).toFixed(1)} km
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
