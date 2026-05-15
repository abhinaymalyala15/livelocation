import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Route } from "lucide-react";
import TripRouteMap from "./TripRouteMap";

export default function TripPathModal({ trip, open, onClose }) {
  if (!open || !trip) return null;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-4xl w-full p-4 overflow-hidden">
        <DialogHeader className="pb-2">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Route className="h-4 w-4 text-primary" />
            Full trip route
          </DialogTitle>
        </DialogHeader>
        <TripRouteMap trip={trip} className="min-h-[480px]" />
      </DialogContent>
    </Dialog>
  );
}
