import { useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { mockSocket } from "@/services/mockSocketService";
import { toast } from "sonner";

export default function SOSPanel({ position, driverId, vehicleId, tripId }) {
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);

  const sendSOS = async () => {
    setSending(true);
    const payload = {
      driverId,
      vehicleId,
      tripId,
      latitude: position?.latitude,
      longitude: position?.longitude,
      timestamp: new Date().toISOString(),
    };
    mockSocket.emit("emergencyAlert", payload);
    toast.error("Emergency alert sent to dispatch.");
    setOpen(false);
    setSending(false);
  };

  return (
    <>
      <motion.section
        id="sos"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border border-red-200 bg-red-50/80 dark:bg-red-950/20 dark:border-red-900 p-4"
      >
        <motion.div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <motion.div>
            <h3 className="font-medium text-red-800 dark:text-red-200 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Emergency
            </h3>
            <p className="text-sm text-red-700/80 dark:text-red-300/80 mt-1">
              Sends your live coordinates to the fleet dispatcher.
            </p>
          </motion.div>
          <Button
            variant="destructive"
            className="shrink-0 animate-pulse hover:animate-none"
            onClick={() => setOpen(true)}
          >
            SOS
          </Button>
        </motion.div>
      </motion.section>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Send emergency alert?</AlertDialogTitle>
            <AlertDialogDescription>
              Dispatch will receive your current location immediately. Only use in a real emergency.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={sendSOS} disabled={sending} className="bg-destructive">
              Confirm SOS
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
