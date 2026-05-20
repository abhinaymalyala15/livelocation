import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { UserPlus, Users, Truck, Lock } from "lucide-react";
import { toast } from "sonner";
import moment from "moment";
import { apiListAdminDrivers, apiCreateDriver } from "@/api/authApi";
import PageHeader from "@/components/tracking/PageHeader";
import Loader from "@/components/tracking/Loader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import MobileDataCards from "@/components/tracking/MobileDataCards";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const emptyForm = {
  display_name: "",
  password: "",
  vehicle_name: "",
  plate: "",
};

export default function AdminDrivers() {
  const [form, setForm] = useState(emptyForm);
  const queryClient = useQueryClient();

  const { data: drivers = [], isLoading } = useQuery({
    queryKey: ["admin-drivers"],
    queryFn: () => apiListAdminDrivers(),
  });

  const createMutation = useMutation({
    mutationFn: (payload) => apiCreateDriver(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-drivers"] });
      queryClient.invalidateQueries({ queryKey: ["admin-vehicles"] });
      queryClient.invalidateQueries({ queryKey: ["registered-drivers"] });
      setForm(emptyForm);
      toast.success("Driver account and vehicle saved");
    },
    onError: (err) => {
      toast.error(err?.message || "Could not create driver");
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const display_name = form.display_name.trim();
    const password = form.password;
    const vehicle_name = form.vehicle_name.trim();
    const plate = form.plate.trim();

    if (!display_name || !password || !vehicle_name || !plate) {
      toast.error("Fill in driver name, password, vehicle name, and plate");
      return;
    }
    if (password.length < 4) {
      toast.error("Password must be at least 4 characters");
      return;
    }

    createMutation.mutate({ display_name, password, vehicle_name, plate });
  };

  if (isLoading) return <Loader text="Loading drivers…" />;

  return (
    <div className="page-shell">
      <PageHeader
        title="Drivers"
        description="Create driver logins and assign their vehicle. Drivers sign in with the name and password you set here."
      />

      <Card>
        <CardHeader className="pb-3">
          <h3 className="font-semibold flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            Create driver
          </h3>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2 max-w-3xl">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="display_name">Driver name *</Label>
              <Input
                id="display_name"
                placeholder="e.g. Rahul Sharma"
                value={form.display_name}
                onChange={(e) => setForm((f) => ({ ...f, display_name: e.target.value }))}
                required
              />
              <p className="text-xs text-muted-foreground">
                Used on the driver login screen (name field must match exactly, case-insensitive).
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5" />
                Password *
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="Personal password"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                minLength={4}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vehicle_name" className="flex items-center gap-1.5">
                <Truck className="h-3.5 w-3.5" />
                Vehicle name *
              </Label>
              <Input
                id="vehicle_name"
                placeholder="e.g. Delivery Van 1"
                value={form.vehicle_name}
                onChange={(e) => setForm((f) => ({ ...f, vehicle_name: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="plate">Number plate / vehicle ID *</Label>
              <Input
                id="plate"
                placeholder="e.g. TS09AB1234"
                value={form.plate}
                onChange={(e) => setForm((f) => ({ ...f, plate: e.target.value }))}
                required
              />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Saving…" : "Save driver"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <h3 className="font-semibold">Registered drivers ({drivers.length})</h3>
        </CardHeader>
        <CardContent className="p-0">
          <MobileDataCards
            items={drivers}
            emptyMessage="No drivers yet. Create one above."
            renderCard={(d) => {
              const vehicle = d.vehicles?.[0];
              return (
                <div className="space-y-1">
                  <p className="font-semibold text-base">{d.display_name || d.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {vehicle?.vehicle_name || vehicle?.name || "No vehicle"} ·{" "}
                    <span className="font-mono">{vehicle?.vehicle_unique_id || vehicle?.plate || "—"}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {d.created_at ? moment(d.created_at).format("DD MMM YYYY") : ""}
                  </p>
                </div>
              );
            }}
          />
          <div className="hidden lg:block table-scroll">
          <Table className="min-w-[520px]">
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Vehicle</TableHead>
                <TableHead>Plate</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {drivers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                    No drivers yet. Create one above.
                  </TableCell>
                </TableRow>
              ) : (
                drivers.map((d) => {
                  const vehicle = d.vehicles?.[0];
                  return (
                    <TableRow key={d.id}>
                      <TableCell className="font-medium">{d.display_name || d.name}</TableCell>
                      <TableCell>{vehicle?.vehicle_name || vehicle?.name || "—"}</TableCell>
                      <TableCell className="font-mono text-sm">
                        {vehicle?.vehicle_unique_id || vehicle?.plate || "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {d.created_at ? moment(d.created_at).format("DD MMM YYYY") : "—"}
                      </TableCell>
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
