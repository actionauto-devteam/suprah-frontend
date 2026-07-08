"use client";

import * as React from "react";
import {
  Truck,
  Package,
  Loader2,
  MapPin,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Search,
  Calendar,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DriverTrackingItem } from "@/types/driver-tracking";
import { trailerTypeOptions } from "@/components/driver-profile/driver-profile-constants";

const trailerLabel = (val?: string) =>
  trailerTypeOptions.find((t) => t.value === val)?.label || val || "";

interface AvailableItem {
  _id: string;
  __docType: "shipment" | "load";
  trackingNumber?: string;
  origin?: string;
  destination?: string;
  status: string;
  trailerTypeRequired?: string;
  vehicleCount?: number;
  carrierPayAmount?: number;
  requestedPickupDate?: string;
  isPostedToBoard?: boolean;
}

interface DriverAssignLoadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  driver: DriverTrackingItem | null;
  availableLoads: AvailableItem[];
  isLoading: boolean;
  onAssign: (item: AvailableItem) => Promise<void>;
}

export function DriverAssignLoadModal({
  open,
  onOpenChange,
  driver,
  availableLoads,
  isLoading,
  onAssign,
}: DriverAssignLoadModalProps) {
  const [assigning, setAssigning] = React.useState<string | null>(null);
  const [loadSearch, setLoadSearch] = React.useState("");

  const eq = driver?.equipment;

  const filteredLoads = React.useMemo(() => {
    const q = loadSearch.trim().toLowerCase();
    if (!q) return availableLoads;
    return availableLoads.filter((s) => {
      const tn = s.trackingNumber?.toLowerCase() || "";
      const origin = s.origin?.toLowerCase() || "";
      const dest = s.destination?.toLowerCase() || "";
      return tn.includes(q) || origin.includes(q) || dest.includes(q);
    });
  }, [availableLoads, loadSearch]);

  const handleAssign = async (item: AvailableItem) => {
    setAssigning(item._id);
    try {
      await onAssign(item);
    } finally {
      setAssigning(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-xl w-[calc(100%-1.5rem)] sm:w-full"
        overlayClassName="bg-black/72 backdrop-blur-[4px]"
      >
        <DialogHeader>
          <DialogTitle className="text-base font-bold flex items-center gap-2 pr-6">
            <Package className="size-4 text-primary shrink-0" />
            <span className="truncate">Assign Load — {driver?.driver?.name || "Driver"}</span>
          </DialogTitle>
          <p className="text-[11px] text-muted-foreground/60 font-medium">
            Select an available load to assign to this driver
          </p>
          <div className="flex items-center gap-3 mt-2">
            <Avatar className="size-10 border-2 border-background shadow-sm shrink-0">
              {driver?.driver?.avatar && (
                <AvatarImage src={driver.driver.avatar} />
              )}
              <AvatarFallback className="text-xs font-bold bg-primary/5 text-primary">
                {driver?.driver?.name?.[0]?.toUpperCase() || "?"}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold truncate">
                {driver?.driver?.name || "Unknown"}
              </p>
              <div className="flex flex-wrap gap-1 mt-0.5">
                {eq?.truckMake && (
                  <Badge className="text-[9px] px-1.5 py-0 h-5 bg-muted text-muted-foreground border-border/50">
                    {eq.truckMake} {eq.truckModel || ""}
                  </Badge>
                )}
                {eq?.trailerType && (
                  <Badge className="text-[9px] px-1.5 py-0 h-5 bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-500/30 gap-0.5">
                    <Truck className="size-2.5" />
                    {trailerLabel(eq.trailerType)}
                  </Badge>
                )}
                {eq?.maxVehicleCapacity != null && (
                  <Badge className="text-[9px] px-1.5 py-0 h-5 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-500/30">
                    Cap: {eq.maxVehicleCapacity}
                  </Badge>
                )}
                <Badge className="text-[9px] px-1.5 py-0 h-5 bg-muted text-muted-foreground border-border/50">
                  {driver?.shipments?.length || 0} current load
                  {(driver?.shipments?.length || 0) !== 1 ? "s" : ""}
                </Badge>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground/40" />
          <Input
            value={loadSearch}
            onChange={(e) => setLoadSearch(e.target.value)}
            placeholder="Search loads by tracking #, origin, or destination..."
            className="h-10 sm:h-9 pl-9 text-base sm:text-xs rounded-lg border-border/40"
          />
        </div>

        <div className="space-y-4 max-h-[50vh] sm:max-h-96 overflow-y-auto modal-scrollbar [scrollbar-gutter:stable] pr-2">
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-8 gap-3">
              <Loader2 className="size-6 text-primary animate-spin" />
              <p className="text-xs text-muted-foreground font-medium">
                Loading available loads...
              </p>
            </div>
          )}
          {!isLoading && filteredLoads.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 gap-2">
              <div className="size-12 rounded-xl bg-muted/40 flex items-center justify-center">
                <Package className="size-6 text-muted-foreground/40" />
              </div>
              <p className="text-xs text-muted-foreground font-medium">
                {loadSearch
                  ? "No loads match your search"
                  : "No loads available for pickup"}
              </p>
            </div>
          )}
          {filteredLoads.map((load) => {
            const trailerMatch = eq?.trailerType && load.trailerTypeRequired
              ? eq.trailerType === load.trailerTypeRequired
              : null;
            const capacityMatch = eq?.maxVehicleCapacity && load.vehicleCount
              ? eq.maxVehicleCapacity >= load.vehicleCount
              : null;

            return (
              <div
                key={load._id}
                className="rounded-xl border border-border/40 p-3 sm:p-4 hover:border-primary/30 hover:shadow-sm transition-all duration-200"
              >
                <div className="flex flex-col sm:flex-row items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className="size-10 rounded-xl bg-primary/5 flex items-center justify-center shrink-0">
                      <Package className="size-5 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="text-sm font-bold text-foreground truncate">
                        {load.trackingNumber || load._id}
                      </p>
                      {(load.origin || load.destination) && (
                        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                          <MapPin className="size-3 shrink-0" />
                          <span className="truncate">{load.origin}</span>
                          <ArrowRight className="size-3 shrink-0 text-muted-foreground/40" />
                          <span className="truncate">{load.destination}</span>
                        </div>
                      )}
                      {load.requestedPickupDate && (
                        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/60">
                          <Calendar className="size-3" />
                          Pickup: {new Date(load.requestedPickupDate).toLocaleDateString('en-US', { timeZone: 'America/Denver' })}
                        </div>
                      )}
                      <div className="flex flex-wrap gap-1 mt-1">
                        {load.trailerTypeRequired && (
                          <Badge className="text-[9px] px-1.5 py-0 h-5 bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-500/30 gap-0.5">
                            <Truck className="size-2.5" />{trailerLabel(load.trailerTypeRequired)}
                          </Badge>
                        )}
                        {load.vehicleCount != null && (
                          <Badge className="text-[9px] px-1.5 py-0 h-5 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-500/30">
                            {load.vehicleCount} vehicle{load.vehicleCount !== 1 ? "s" : ""}
                          </Badge>
                        )}
                        {load.carrierPayAmount != null && (
                          <Badge className="text-[9px] px-1.5 py-0 h-5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30">
                            ${load.carrierPayAmount.toLocaleString()}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    className="h-10 sm:h-8 px-3 text-xs font-bold shrink-0 shadow-sm w-full sm:w-auto"
                    onClick={() => handleAssign(load)}
                    disabled={assigning !== null}
                  >
                    {assigning === load._id ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      "Assign"
                    )}
                  </Button>
                </div>

                {(trailerMatch !== null || capacityMatch !== null) && (
                  <div className="flex items-center gap-3 mt-4 pt-4 border-t border-border/20 flex-wrap">
                    {trailerMatch !== null && (
                      <span
                        className={`flex items-center gap-1.5 text-xs font-semibold ${trailerMatch ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}`}
                      >
                        {trailerMatch ? (
                          <CheckCircle2 className="size-3.5" />
                        ) : (
                          <XCircle className="size-3.5" />
                        )}
                        Trailer {trailerMatch ? "Match" : "Mismatch"}
                      </span>
                    )}
                    {capacityMatch !== null && (
                      <span
                        className={`flex items-center gap-1.5 text-xs font-semibold ${capacityMatch ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}`}
                      >
                        {capacityMatch ? (
                          <CheckCircle2 className="size-3.5" />
                        ) : (
                          <XCircle className="size-3.5" />
                        )}
                        Capacity {capacityMatch ? "OK" : "Exceeded"}
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
