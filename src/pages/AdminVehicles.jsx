import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import StatusBadge from "../components/tracking/StatusBadge";
import Loader from "../components/tracking/Loader";
import PageHeader from "../components/tracking/PageHeader";
import { Plus, Truck, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import moment from "moment";
import { apiListDrivers } from "@/api/authApi";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function AdminVehicles() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [vehicleToDelete, setVehicleToDelete] = useState(null);
  const [form, setForm] = useState({ vehicle_name: "", vehicle_unique_id: "", driver_email: "", driver_name: "" });
  const queryClient = useQueryClient();

  const { data: vehicles = [], isLoading } = useQuery({
    queryKey: ["admin-vehicles"],
    queryFn: () => base44.entities.Vehicle.list("-created_date"),
  });

  const { data: registeredDrivers = [] } = useQuery({
    queryKey: ["registered-drivers"],
    queryFn: () => apiListDrivers(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Vehicle.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-vehicles"] });
      setOpen(false);
      setForm({ vehicle_name: "", vehicle_unique_id: "", driver_email: "", driver_name: "" });
      toast.success("Vehicle created successfully");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Vehicle.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-vehicles"] });
      setVehicleToDelete(null);
      toast.success("Vehicle deleted");
    },
    onError: (err) => {
      toast.error(err?.message || "Could not delete vehicle");
    },
  });

  const confirmDelete = () => {
    if (!vehicleToDelete) return;
    if (vehicleToDelete.status === "on_trip") {
      toast.error("End the active trip before deleting this vehicle");
      return;
    }
    deleteMutation.mutate(vehicleToDelete.id);
  };

  const filtered = vehicles.filter(v =>
    v.vehicle_name?.toLowerCase().includes(search.toLowerCase()) ||
    v.vehicle_unique_id?.toLowerCase().includes(search.toLowerCase()) ||
    v.driver_name?.toLowerCase().includes(search.toLowerCase())
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.vehicle_name || !form.vehicle_unique_id) {
      toast.error("Please fill required fields");
      return;
    }
    createMutation.mutate({ ...form, status: "available" });
  };

  if (isLoading) return <Loader text="Loading vehicles..." className="h-full" />;

  return (
    <div className="page-shell">
      <PageHeader
        title="Vehicles"
        description={`${vehicles.length} vehicles in your fleet`}
        action={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Add Vehicle
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Vehicle</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Vehicle Name *</Label>
                <Input placeholder="e.g., Truck Alpha-01" value={form.vehicle_name} onChange={e => setForm({...form, vehicle_name: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Unique ID / Plate *</Label>
                <Input placeholder="e.g., TRK-001" value={form.vehicle_unique_id} onChange={e => setForm({...form, vehicle_unique_id: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Assign driver</Label>
                <Select
                  value={form.driver_email || "_none"}
                  onValueChange={(v) => {
                    if (v === "_none") {
                      setForm({ ...form, driver_email: "", driver_name: "" });
                      return;
                    }
                    const d = registeredDrivers.find((x) => x.email === v);
                    setForm({
                      ...form,
                      driver_email: d?.email || "",
                      driver_name: d?.display_name || d?.name || "",
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select registered driver" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">Unassigned</SelectItem>
                    {registeredDrivers.map((d) => (
                      <SelectItem key={d.email} value={d.email}>
                        {d.display_name || d.name} ({d.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Creating..." : "Create Vehicle"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
        }
      />

      <Card className="surface-card overflow-hidden">
        <CardHeader className="p-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search vehicles..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>ID</TableHead>
                  <TableHead>Driver</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Update</TableHead>
                  <TableHead className="text-right w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">No vehicles found</TableCell>
                  </TableRow>
                ) : (
                  filtered.map(v => (
                    <TableRow key={v.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Truck className="h-4 w-4 text-primary" />
                          </div>
                          <span className="font-medium text-sm">{v.vehicle_name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{v.vehicle_unique_id}</TableCell>
                      <TableCell className="text-sm">{v.driver_name || "—"}</TableCell>
                      <TableCell><StatusBadge status={v.status} /></TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {v.last_location_update ? moment(v.last_location_update).fromNow() : "Never"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          title="Delete vehicle"
                          onClick={() => setVehicleToDelete(v)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={!!vehicleToDelete} onOpenChange={(open) => !open && setVehicleToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete vehicle?</AlertDialogTitle>
            <AlertDialogDescription>
              {vehicleToDelete && (
                <>
                  Remove <strong>{vehicleToDelete.vehicle_name}</strong> (
                  {vehicleToDelete.vehicle_unique_id}) from the fleet. This cannot be undone.
                  {vehicleToDelete.status === "on_trip" && (
                    <span className="block mt-2 text-destructive font-medium">
                      This vehicle is on an active trip — end the trip first.
                    </span>
                  )}
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleteMutation.isPending || vehicleToDelete?.status === "on_trip"}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}