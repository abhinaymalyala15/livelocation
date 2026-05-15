import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Loader from "../components/tracking/Loader";
import { Wrench, Plus, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { toast } from "sonner";
import moment from "moment";

const SERVICE_TYPES = [
  { value: "oil_change", label: "Oil Change" },
  { value: "tire_rotation", label: "Tire Rotation" },
  { value: "brake_service", label: "Brake Service" },
  { value: "engine_repair", label: "Engine Repair" },
  { value: "inspection", label: "Inspection" },
  { value: "other", label: "Other" },
];

const EMPTY_FORM = {
  vehicle_id: "",
  type: "oil_change",
  description: "",
  service_date: moment().format("YYYY-MM-DDTHH:mm"),
  mileage_at_service: "",
  next_service_mileage: "",
  next_service_date: "",
  cost: "",
  technician: "",
  status: "completed",
  notes: "",
};

const statusColors = {
  completed: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
  in_progress: "bg-amber-500/10 text-amber-700 border-amber-500/20",
  scheduled: "bg-sky-500/10 text-sky-700 border-sky-500/20",
};

export default function AdminMaintenance() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [selectedVehicleFilter, setSelectedVehicleFilter] = useState("all");
  const queryClient = useQueryClient();

  const { data: vehicles = [], isLoading: vLoading } = useQuery({
    queryKey: ["admin-vehicles"],
    queryFn: () => base44.entities.Vehicle.list("-created_date"),
  });

  const { data: logs = [], isLoading: lLoading } = useQuery({
    queryKey: ["maintenance-logs"],
    queryFn: () => base44.entities.MaintenanceLog.list("-service_date", 300),
    refetchInterval: 30000,
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.MaintenanceLog.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maintenance-logs"] });
      setOpen(false);
      setForm(EMPTY_FORM);
      toast.success("Maintenance log added");
    },
  });

  const setVehicleMaintenanceMutation = useMutation({
    mutationFn: ({ id, status }) => base44.entities.Vehicle.update(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-vehicles"] });
      toast.success("Vehicle status updated");
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.vehicle_id || !form.type || !form.service_date) {
      toast.error("Please fill required fields");
      return;
    }
    const vehicle = vehicles.find(v => v.id === form.vehicle_id);
    createMutation.mutate({
      ...form,
      vehicle_name: vehicle?.vehicle_name || "",
      mileage_at_service: form.mileage_at_service ? parseFloat(form.mileage_at_service) : undefined,
      next_service_mileage: form.next_service_mileage ? parseFloat(form.next_service_mileage) : undefined,
      cost: form.cost ? parseFloat(form.cost) : undefined,
    });
  };

  // Compute alert flags per vehicle: last service > 90 days ago
  const vehicleAlerts = vehicles.map(v => {
    const vehicleLogs = logs.filter(l => l.vehicle_id === v.id && l.status === "completed");
    const lastService = vehicleLogs[0];
    const daysSince = lastService
      ? moment().diff(moment(lastService.service_date), "days")
      : null;
    const overdueService = daysSince !== null && daysSince > 90;
    const noServiceEver = vehicleLogs.length === 0;
    return { ...v, lastService, daysSince, overdueService, noServiceEver };
  }).filter(v => v.overdueService || v.noServiceEver);

  const filtered = logs.filter(l =>
    selectedVehicleFilter === "all" || l.vehicle_id === selectedVehicleFilter
  );

  if (vLoading || lLoading) return <Loader text="Loading maintenance data..." className="h-full" />;

  return (
    <div className="p-4 lg:p-6 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Wrench className="h-5 w-5 text-primary" /> Maintenance
          </h2>
          <p className="text-sm text-muted-foreground">Track vehicle repairs and service history</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" /> Log Service</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Log Maintenance / Service</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Vehicle *</Label>
                <Select value={form.vehicle_id} onValueChange={v => setForm({ ...form, vehicle_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select vehicle" /></SelectTrigger>
                  <SelectContent>
                    {vehicles.map(v => (
                      <SelectItem key={v.id} value={v.id}>{v.vehicle_name} ({v.vehicle_unique_id})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Service Type *</Label>
                  <Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {SERVICE_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="scheduled">Scheduled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Service Date *</Label>
                <Input type="datetime-local" value={form.service_date} onChange={e => setForm({ ...form, service_date: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Mileage at Service (km)</Label>
                  <Input type="number" placeholder="e.g., 45000" value={form.mileage_at_service} onChange={e => setForm({ ...form, mileage_at_service: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Next Service Mileage (km)</Label>
                  <Input type="number" placeholder="e.g., 50000" value={form.next_service_mileage} onChange={e => setForm({ ...form, next_service_mileage: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Next Service Date</Label>
                <Input type="datetime-local" value={form.next_service_date} onChange={e => setForm({ ...form, next_service_date: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Technician / Garage</Label>
                  <Input placeholder="Name or garage" value={form.technician} onChange={e => setForm({ ...form, technician: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Cost ($)</Label>
                  <Input type="number" placeholder="0.00" value={form.cost} onChange={e => setForm({ ...form, cost: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Description / Notes</Label>
                <Input placeholder="Additional details..." value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.status === "in_progress"}
                    onChange={e => setForm({ ...form, status: e.target.checked ? "in_progress" : "completed" })}
                    className="rounded"
                  />
                  Mark vehicle as "In Shop" (sets status to Maintenance)
                </Label>
              </div>
              <Button type="submit" className="w-full" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Saving..." : "Save Record"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Overdue alerts */}
      {vehicleAlerts.length > 0 && (
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-amber-700">
              <AlertTriangle className="h-4 w-4" /> Service Overdue Alerts
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1 space-y-2">
            {vehicleAlerts.map(v => (
              <div key={v.id} className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  <span className="text-sm font-medium">{v.vehicle_name}</span>
                  <span className="text-xs text-muted-foreground">
                    {v.noServiceEver ? "No service recorded" : `Last service ${v.daysSince} days ago`}
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={() => {
                      setForm({ ...EMPTY_FORM, vehicle_id: v.id });
                      setOpen(true);
                    }}
                  >
                    Log Service
                  </Button>
                  {v.status !== "maintenance" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs border-amber-500/40 text-amber-700"
                      onClick={() => setVehicleMaintenanceMutation.mutate({ id: v.id, status: "maintenance" })}
                    >
                      Set In Shop
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Vehicle quick status */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {vehicles.map(v => {
          const vehicleLogs = logs.filter(l => l.vehicle_id === v.id && l.status === "completed");
          const last = vehicleLogs[0];
          return (
            <Card key={v.id} className={v.status === "maintenance" ? "border-amber-500/40" : ""}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-sm">{v.vehicle_name}</p>
                    <p className="text-xs text-muted-foreground">{v.vehicle_unique_id}</p>
                  </div>
                  <div className="flex gap-1.5 flex-col items-end">
                    {v.status === "maintenance" ? (
                      <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-700 border-amber-500/20">
                        <Wrench className="h-3 w-3 mr-1" /> In Shop
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-700 border-emerald-500/20">
                        <CheckCircle2 className="h-3 w-3 mr-1" /> OK
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="mt-3 text-xs text-muted-foreground space-y-1">
                  {last ? (
                    <>
                      <p className="flex items-center gap-1.5">
                        <Clock className="h-3 w-3" />
                        Last service: {moment(last.service_date).format("MMM D, YYYY")} ({moment(last.service_date).fromNow()})
                      </p>
                      <p>Type: {SERVICE_TYPES.find(t => t.value === last.type)?.label || last.type}</p>
                    </>
                  ) : (
                    <p className="text-amber-600">No service history recorded</p>
                  )}
                </div>
                <div className="mt-3 flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs flex-1"
                    onClick={() => {
                      setForm({ ...EMPTY_FORM, vehicle_id: v.id });
                      setOpen(true);
                    }}
                  >
                    Log Service
                  </Button>
                  {v.status !== "maintenance" ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs border-amber-500/30 text-amber-700"
                      onClick={() => setVehicleMaintenanceMutation.mutate({ id: v.id, status: "maintenance" })}
                    >
                      In Shop
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs border-emerald-500/30 text-emerald-700"
                      onClick={() => setVehicleMaintenanceMutation.mutate({ id: v.id, status: "available" })}
                    >
                      Release
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Full service log table */}
      <Card>
        <CardHeader className="p-4 pb-3 flex flex-row items-center justify-between gap-3">
          <CardTitle className="text-sm">Service History</CardTitle>
          <Select value={selectedVehicleFilter} onValueChange={setSelectedVehicleFilter}>
            <SelectTrigger className="w-48 h-8 text-xs">
              <SelectValue placeholder="All Vehicles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Vehicles</SelectItem>
              {vehicles.map(v => <SelectItem key={v.id} value={v.id}>{v.vehicle_name}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Service Date</TableHead>
                  <TableHead>Mileage</TableHead>
                  <TableHead>Technician</TableHead>
                  <TableHead>Cost</TableHead>
                  <TableHead>Next Service</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                      <Wrench className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      No maintenance records
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map(log => (
                    <TableRow key={log.id}>
                      <TableCell className="font-medium text-sm">{log.vehicle_name || "—"}</TableCell>
                      <TableCell className="text-sm">{SERVICE_TYPES.find(t => t.value === log.type)?.label || log.type}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={statusColors[log.status] || ""}>
                          {log.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {moment(log.service_date).format("MMM D, YYYY")}
                      </TableCell>
                      <TableCell className="text-xs">{log.mileage_at_service ? `${log.mileage_at_service.toLocaleString()} km` : "—"}</TableCell>
                      <TableCell className="text-sm">{log.technician || "—"}</TableCell>
                      <TableCell className="text-sm">{log.cost != null ? `$${log.cost.toFixed(2)}` : "—"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {log.next_service_date ? moment(log.next_service_date).format("MMM D, YYYY") : "—"}
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