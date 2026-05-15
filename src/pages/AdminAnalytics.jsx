import { useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import Loader from "../components/tracking/Loader";
import { BarChart2, Trophy, Gauge, Clock, Route, TrendingUp } from "lucide-react";
import moment from "moment";

export default function AdminAnalytics() {
  const { data: trips = [], isLoading } = useQuery({
    queryKey: ["analytics-trips"],
    queryFn: () => base44.entities.Trip.list("-created_date", 1000),
  });

  // Driver performance stats
  const driverStats = useMemo(() => {
    const map = {};
    trips.filter(t => t.status === "completed" && t.driver_name).forEach(t => {
      const key = t.driver_email || t.driver_name;
      if (!map[key]) {
        map[key] = {
          name: t.driver_name,
          totalDistance: 0,
          totalMinutes: 0,
          tripCount: 0,
          speeds: [],
        };
      }
      map[key].totalDistance += t.distance_km || 0;
      map[key].tripCount += 1;
      if (t.start_time && t.end_time) {
        map[key].totalMinutes += moment(t.end_time).diff(moment(t.start_time), "minutes");
      }
    });

    return Object.values(map)
      .map(d => ({
        ...d,
        avgSpeed: d.totalMinutes > 0 ? (d.totalDistance / (d.totalMinutes / 60)).toFixed(1) : 0,
        totalDistanceKm: d.totalDistance.toFixed(1),
        totalHours: (d.totalMinutes / 60).toFixed(1),
        // efficiency score: trips per hour weighted with distance
        score: d.totalMinutes > 0
          ? ((d.totalDistance / (d.totalMinutes / 60)) * 0.4 + d.tripCount * 5).toFixed(0)
          : 0,
      }))
      .sort((a, b) => Number(b.score) - Number(a.score));
  }, [trips]);

  // Trip frequency over last 30 days
  const tripTrendData = useMemo(() => {
    const days = [];
    for (let i = 29; i >= 0; i--) {
      const day = moment().subtract(i, "days");
      const count = trips.filter(t =>
        t.start_time && moment(t.start_time).isSame(day, "day")
      ).length;
      days.push({ date: day.format("MMM D"), trips: count });
    }
    return days;
  }, [trips]);

  // Driver distance bar chart data
  const driverChartData = driverStats.slice(0, 8).map(d => ({
    name: d.name.split(" ")[0],
    distance: parseFloat(d.totalDistanceKm),
    trips: d.tripCount,
  }));

  const medalColors = ["text-yellow-500", "text-slate-400", "text-amber-600"];
  const medalLabels = ["🥇", "🥈", "🥉"];

  if (isLoading) return <Loader text="Loading analytics..." className="h-full" />;

  return (
    <div className="p-4 lg:p-6 space-y-5">
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <BarChart2 className="h-5 w-5 text-primary" /> Driver Analytics
        </h2>
        <p className="text-sm text-muted-foreground">Performance metrics based on completed trips</p>
      </div>

      {/* Fleet-level summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Trips", value: trips.filter(t => t.status === "completed").length, icon: Route, color: "text-primary" },
          { label: "Active Drivers", value: driverStats.length, icon: Trophy, color: "text-yellow-600" },
          { label: "Total Distance", value: `${trips.reduce((s, t) => s + (t.distance_km || 0), 0).toFixed(0)} km`, icon: Gauge, color: "text-emerald-600" },
          { label: "Avg Trip Time", value: (() => {
            const completed = trips.filter(t => t.status === "completed" && t.start_time && t.end_time);
            if (!completed.length) return "—";
            const avg = completed.reduce((s, t) => s + moment(t.end_time).diff(moment(t.start_time), "minutes"), 0) / completed.length;
            return `${Math.round(avg)}m`;
          })(), icon: Clock, color: "text-sky-600" },
        ].map(stat => (
          <Card key={stat.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center">
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
                <p className="font-bold text-lg leading-tight">{stat.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Leaderboard */}
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Trophy className="h-4 w-4 text-yellow-500" /> Driver Leaderboard
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1 space-y-2">
            {driverStats.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No completed trips yet</p>
            ) : (
              driverStats.map((driver, idx) => (
                <div key={driver.name} className={`flex items-center gap-3 p-3 rounded-lg ${idx < 3 ? "bg-muted/60" : ""}`}>
                  <span className="text-lg w-6 text-center">{medalLabels[idx] || `${idx + 1}`}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{driver.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {driver.tripCount} trips · {driver.totalDistanceKm} km · {driver.totalHours}h
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-primary">{driver.avgSpeed} km/h</p>
                    <p className="text-xs text-muted-foreground">avg speed</p>
                  </div>
                  <Badge variant="outline" className="text-xs bg-primary/5 text-primary border-primary/20">
                    {driver.score} pts
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Distance bar chart */}
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Gauge className="h-4 w-4 text-primary" /> Distance per Driver (km)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            {driverChartData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No data yet</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={driverChartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid hsl(var(--border))" }}
                    formatter={(v, n) => [n === "distance" ? `${v} km` : v, n === "distance" ? "Distance" : "Trips"]}
                  />
                  <Bar dataKey="distance" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 30-day trend */}
      <Card>
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" /> Trip Frequency — Last 30 Days
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-1">
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={tripTrendData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10 }}
                interval={4}
              />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid hsl(var(--border))" }}
                formatter={v => [`${v} trips`, "Trips"]}
              />
              <Line
                type="monotone"
                dataKey="trips"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}