import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, Route } from "lucide-react";
import Loader from "../components/tracking/Loader";
import moment from "moment";

const tripStatusColors = {
  active: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
  completed: "bg-sky-500/10 text-sky-700 border-sky-500/20",
  cancelled: "bg-red-500/10 text-red-600 border-red-500/20",
};

export default function AdminTrips() {
  const [search, setSearch] = useState("");

  const { data: trips = [], isLoading } = useQuery({
    queryKey: ["admin-trips"],
    queryFn: () => base44.entities.Trip.list("-created_date", 100),
  });

  const filtered = trips.filter(t =>
    t.vehicle_name?.toLowerCase().includes(search.toLowerCase()) ||
    t.driver_name?.toLowerCase().includes(search.toLowerCase()) ||
    t.destination?.toLowerCase().includes(search.toLowerCase())
  );

  if (isLoading) return <Loader text="Loading trips..." className="h-full" />;

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div>
        <h2 className="text-xl font-bold">Trip History</h2>
        <p className="text-sm text-muted-foreground">{trips.length} total trips</p>
      </div>

      <Card>
        <CardHeader className="p-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search trips..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Driver</TableHead>
                  <TableHead>Destination</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Started</TableHead>
                  <TableHead>Ended</TableHead>
                  <TableHead>Duration</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                      <Route className="h-8 w-8 mx-auto mb-2 opacity-40" />
                      No trips found
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map(t => {
                    const duration = t.start_time && t.end_time
                      ? moment.duration(moment(t.end_time).diff(moment(t.start_time))).humanize()
                      : t.status === "active" ? "In progress" : "—";

                    return (
                      <TableRow key={t.id}>
                        <TableCell className="font-medium text-sm">{t.vehicle_name || "—"}</TableCell>
                        <TableCell className="text-sm">{t.driver_name || "—"}</TableCell>
                        <TableCell className="text-sm max-w-[200px] truncate">{t.destination}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={tripStatusColors[t.status] || ""}>
                            {t.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {t.start_time ? moment(t.start_time).format("MMM D, HH:mm") : "—"}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {t.end_time ? moment(t.end_time).format("MMM D, HH:mm") : "—"}
                        </TableCell>
                        <TableCell className="text-xs">{duration}</TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}