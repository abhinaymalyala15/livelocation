import { useState } from "react";
import { motion } from "framer-motion";
import { User, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { base44 } from "@/api/base44Client";
import { apiUpdateProfile } from "@/api/authApi";
import { toast } from "sonner";

export default function DriverOnboarding({ user, onComplete }) {
  const [displayName, setDisplayName] = useState(user?.display_name || user?.name || "");
  const [vehicleName, setVehicleName] = useState("");
  const [plate, setPlate] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const name = displayName.trim();
    if (!name) {
      toast.error("Enter your name — it will show on the admin panel");
      return;
    }
    if (!vehicleName.trim() || !plate.trim()) {
      toast.error("Add your vehicle name and plate number");
      return;
    }

    setSaving(true);
    try {
      await apiUpdateProfile(name);
      await base44.entities.Vehicle.create({
        vehicle_name: vehicleName.trim(),
        name: vehicleName.trim(),
        vehicle_unique_id: plate.trim().toUpperCase(),
        plate: plate.trim().toUpperCase(),
        driver_email: user.email,
        driver_name: name,
        driver_id: user.id,
        status: "available",
      });
      toast.success("Profile and vehicle saved");
      onComplete?.({ displayName: name });
    } catch (err) {
      toast.error(err.message || "Could not save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="surface-card rounded-xl border border-primary/20 p-4 sm:p-6 w-full max-w-lg mx-auto"
    >
      <h2 className="text-lg font-semibold">Set up your driver profile</h2>
      <p className="text-sm text-muted-foreground mt-1 mb-6">
        Your name appears on the admin live map and trip logs. Add the vehicle you drive.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <motion.div className="space-y-2">
          <Label className="flex items-center gap-2">
            <User className="h-4 w-4 text-primary" />
            Your display name *
          </Label>
          <Input
            placeholder="e.g. Rahul Sharma"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
          />
          <p className="text-xs text-muted-foreground">Shown to fleet admin on every trip</p>
        </motion.div>

        <motion.div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Truck className="h-4 w-4 text-primary" />
            Vehicle name *
          </Label>
          <Input
            placeholder="e.g. Delivery Van 1"
            value={vehicleName}
            onChange={(e) => setVehicleName(e.target.value)}
            required
          />
        </motion.div>

        <motion.div className="space-y-2">
          <Label>Plate / vehicle ID *</Label>
          <Input
            placeholder="e.g. TS09AB1234"
            value={plate}
            onChange={(e) => setPlate(e.target.value)}
            required
          />
        </motion.div>

        <Button type="submit" className="w-full" disabled={saving}>
          {saving ? "Saving…" : "Save and continue"}
        </Button>
      </form>
    </motion.section>
  );
}
