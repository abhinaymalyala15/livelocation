import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Loader from "../components/tracking/Loader";
import PageHeader from "../components/tracking/PageHeader";
import { Plus, MapPin, Trash2, ShieldCheck, Bell } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const EMPTY_FORM = {
  name: "",
  description: "",
  center_latitude: "",
  center_longitude: "",
  radius_meters: 500,
  alert_on_exit: true,
  alert_on_enter: false,
  is_active: true,
};

export default function AdminGeofences() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const queryClient = useQueryClient();

  const { data: geofences = [], isLoading } = useQuery({
    queryKey: ["geofences"],
    queryFn: () => base44.entities.Geofence.list("-created_date"),
  });

  const { data: vehicles = [] } = useQuery({
    queryKey: ["admin-vehicles"],
    queryFn: () => base44.entities.Vehicle.list("-updated_date"),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Geofence.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["geofences"] });
      setOpen(false);
      setForm(EMPTY_FORM);
      toast.success("Geofence created successfully");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Geofence.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["geofences"] });
      toast.success("Geofence deleted");
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, is_active }) => base44.entities.Geofence.update(id, { is_active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["geofences"] }),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const lat = parseFloat(form.center_latitude);
    const lng = parseFloat(form.center_longitude);
    const radius = parseFloat(form.radius_meters);
    if (!form.name || isNaN(lat) || isNaN(lng) || isNaN(radius)) {
      toast.error("Please fill all required fields with valid numbers");
      return;
    }
    createMutation.mutate({
      ...form,
      center_latitude: lat,
      center_longitude: lng,
      radius_meters: radius,
    });
  };

  if (isLoading) return <Loader text="Loading geofences..." className="h-full" />;

  return (
    <div className="page-shell">
      <PageHeader
        title="Geofences"
        description="Zones for enter and exit alerts on the live map"
        action={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" /> Add Zone
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create Geofence Zone</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Zone Name *</Label>
                <Input
                  placeholder="e.g., Warehouse District"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input
                  placeholder="Optional notes"
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Center Latitude *</Label>
                  <Input
                    type="number"
                    step="any"
                    placeholder="e.g., 40.7128"
                    value={form.center_latitude}
                    onChange={e => setForm({ ...form, center_latitude: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Center Longitude *</Label>
                  <Input
                    type="number"
                    step="any"
                    placeholder="e.g., -74.0060"
                    value={form.center_longitude}
                    onChange={e => setForm({ ...form, center_longitude: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Radius (meters) *</Label>
                <Input
                  type="number"
                  placeholder="500"
                  value={form.radius_meters}
                  onChange={e => setForm({ ...form, radius_meters: e.target.value })}
                />
              </div>
              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm">Alert on Exit</Label>
                    <p className="text-xs text-muted-foreground">Notify when a vehicle leaves this zone</p>
                  </div>
                  <Switch
                    checked={form.alert_on_exit}
                    onCheckedChange={v => setForm({ ...form, alert_on_exit: v })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm">Alert on Enter</Label>
                    <p className="text-xs text-muted-foreground">Notify when a vehicle arrives at this zone</p>
                  </div>
                  <Switch
                    checked={form.alert_on_enter}
                    onCheckedChange={v => setForm({ ...form, alert_on_enter: v })}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground bg-muted/60 rounded-lg p-3">
                💡 Tip: To get coordinates, right-click any location in Google Maps and copy the lat/lng shown.
              </p>
              <Button type="submit" className="w-full" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Creating..." : "Create Zone"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
        }
      />

      {geofences.length === 0 ? (
        <Card className="surface-card">
          <CardContent className="py-16 text-center">
            <ShieldCheck className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-40" />
            <p className="text-muted-foreground font-medium">No geofence zones defined yet</p>
            <p className="text-sm text-muted-foreground mt-1">Create a zone to monitor vehicle boundaries</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {geofences.map(zone => {
            const assignedVehicles = vehicles.filter(v =>
              (zone.assigned_vehicle_ids || []).includes(v.id)
            );
            return (
              <Card key={zone.id} className={cn("surface-card", !zone.is_active && "opacity-60")}>
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <MapPin className="h-4 w-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <CardTitle className="text-sm truncate">{zone.name}</CardTitle>
                        {zone.description && (
                          <p className="text-xs text-muted-foreground truncate">{zone.description}</p>
                        )}
                      </div>
                    </div>
                    <Switch
                      checked={zone.is_active}
                      onCheckedChange={v => toggleMutation.mutate({ id: zone.id, is_active: v })}
                    />
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-2 space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-muted/60 rounded-lg p-2">
                      <p className="text-muted-foreground">Latitude</p>
                      <p className="font-mono font-semibold">{zone.center_latitude.toFixed(5)}</p>
                    </div>
                    <div className="bg-muted/60 rounded-lg p-2">
                      <p className="text-muted-foreground">Longitude</p>
                      <p className="font-mono font-semibold">{zone.center_longitude.toFixed(5)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">Radius:</span> {zone.radius_meters}m
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {zone.alert_on_exit && (
                      <Badge variant="outline" className="text-xs gap-1 bg-red-500/10 text-red-600 border-red-500/20">
                        <Bell className="h-3 w-3" /> Exit Alert
                      </Badge>
                    )}
                    {zone.alert_on_enter && (
                      <Badge variant="outline" className="text-xs gap-1 bg-emerald-500/10 text-emerald-700 border-emerald-500/20">
                        <Bell className="h-3 w-3" /> Entry Alert
                      </Badge>
                    )}
                    <Badge variant="outline" className={zone.is_active ? "text-xs bg-sky-500/10 text-sky-700 border-sky-500/20" : "text-xs"}>
                      {zone.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-destructive hover:text-destructive hover:bg-destructive/5 gap-1.5 mt-1"
                    onClick={() => deleteMutation.mutate(zone.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Delete Zone
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}