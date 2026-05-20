import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Filter } from "lucide-react";
import VehicleListItem from "./VehicleListItem";

export default function VehicleList({ vehicles, selectedVehicleId, onSelectVehicle, alertedVehicleIds = new Set() }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filtered = vehicles.filter((v) => {
    const name = v.vehicle_name || v.name || "";
    const matchesSearch =
      name.toLowerCase().includes(search.toLowerCase()) ||
      v.driver_name?.toLowerCase().includes(search.toLowerCase()) ||
      v.vehicle_unique_id?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || v.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const activeCount = vehicles.filter((v) => v.status === "on_trip").length;

  return (
    <div className="flex flex-col h-full bg-card">
      <div className="p-3 sm:p-4 border-b border-border space-y-3 shrink-0">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-sm text-foreground">Fleet</h2>
          <span className="text-xs text-muted-foreground tabular-nums">
            {activeCount} active · {vehicles.length} total
          </span>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search vehicles…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-sm input-professional"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-9 text-sm input-professional">
            <div className="flex items-center gap-2">
              <Filter className="h-3.5 w-3.5 text-muted-foreground" />
              <SelectValue placeholder="Filter status" />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="on_trip">On trip</SelectItem>
            <SelectItem value="available">Available</SelectItem>
            <SelectItem value="offline">Offline</SelectItem>
            <SelectItem value="maintenance">Maintenance</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {filtered.length === 0 ? (
          <div className="text-center py-14">
            <p className="text-sm text-muted-foreground">No vehicles match your filters</p>
          </div>
        ) : (
          filtered.map((vehicle) => (
            <VehicleListItem
              key={vehicle.id}
              vehicle={vehicle}
              isSelected={vehicle.id === selectedVehicleId}
              isAlerted={alertedVehicleIds.has(vehicle.id)}
              onClick={() => onSelectVehicle(vehicle)}
            />
          ))
        )}
      </div>
    </div>
  );
}
