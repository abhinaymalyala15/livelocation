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
import { Plus, Truck, Search } from "lucide-react";
import { toast } from "sonner";
import moment from "moment";

export default function AdminVehicles() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({ vehicle_name: "", vehicle_unique_id: "", driver_email: "", driver_name: "" });
  const queryClient = useQueryClient();

  const { data: vehicles = [], isLoading } = useQuery({
    queryKey: ["admin-vehicles"],
    queryFn: () => base44.entities.Vehicle.list("-created_date"),
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
                <Label>Driver Name</Label>
                <Input placeholder="Driver full name" value={form.driver_name} onChange={e => setForm({...form, driver_name: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Driver Email</Label>
                <Input placeholder="driver@example.com" value={form.driver_email} onChange={e => setForm({...form, driver_email: e.target.value})} />
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">No vehicles found</TableCell>
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