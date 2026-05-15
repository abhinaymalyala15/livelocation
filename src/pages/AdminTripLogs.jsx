import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Loader from "../components/tracking/Loader";
import PageHeader from "../components/tracking/PageHeader";
import TripRouteMap from "../components/tracking/TripRouteMap";
import { Search, Download, Route, Clock } from "lucide-react";
import moment from "moment";

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

  const { data: tripsData, isLoading, isError, error } = useQuery({
    queryKey: ["trip-logs"],
    queryFn: () => base44.entities.Trip.list("-created_date", 500),
    refetchInterval: 15000,
  });

  const trips = Array.isArray(tripsData) ? tripsData : [];

  const filtered = trips.filter((t) => {
    const q = search.toLowerCase();
    const matchSearch =
      t.vehicle_name?.toLowerCase().includes(q) ||
      t.driver_name?.toLowerCase().includes(q) ||
      t.destination?.toLowerCase().includes(q);
    const matchStatus = statusFilter === "all" || t.status === statusFilter;
    return matchSearch && matchStatus;
  });

  useEffect(() => {
    if (filtered.length === 0) {
      setSelectedTrip(null);
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

  return (
    <div className="page-shell">
      <PageHeader
        title="Trips"
        description={`${filtered.length} trips · ${activeCount} active`}
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

      <Card className="surface-card overflow-hidden">
        <CardHeader className="p-4 pb-2 border-b bg-muted/30">
          <p className="text-sm font-medium">Route map</p>
          <p className="text-xs text-muted-foreground">
            Select a trip in the table to view the full path from start to end.
          </p>
        </CardHeader>
        <CardContent className="p-4">
          <TripRouteMap trip={selectedTrip} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="p-4 pb-3 space-y-3">
          <div className="flex gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search..."
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
                  <TableHead>End</TableHead>
                  <TableHead>Duration</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                      No trips found
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((t) => (
                    <TableRow
                      key={t.id}
                      className={`cursor-pointer ${
                        selectedTrip?.id === t.id ? "bg-primary/10" : "hover:bg-muted/50"
                      }`}
                      onClick={() => setSelectedTrip(t)}
                    >
                      <TableCell className="font-medium text-sm">{t.vehicle_name || "—"}</TableCell>
                      <TableCell className="text-sm">{t.driver_name || "—"}</TableCell>
                      <TableCell className="text-sm max-w-[200px] truncate">
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
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {t.end_time ? moment(t.end_time).format("MMM D, HH:mm") : "—"}
                      </TableCell>
                      <TableCell className="text-sm">{getDuration(t)}</TableCell>
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
