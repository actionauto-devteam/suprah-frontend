"use client";

import * as React from "react";
import {
  Package, Truck, Loader2, UserPlus, Megaphone,
  MapPin, ArrowRight, Calendar, DollarSign, Search,
  CheckCircle2, XCircle, AlertTriangle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
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

interface DriverTrackerAvailableLoadsCardProps {
  loads: AvailableItem[];
  isLoading: boolean;
  activeDrivers: DriverTrackingItem[];
  onAssign: (item: AvailableItem, driverId: string) => Promise<void>;
}

export function DriverTrackerAvailableLoadsCard({
  loads,
  isLoading,
  activeDrivers,
  onAssign,
}: DriverTrackerAvailableLoadsCardProps) {
  const [assigning, setAssigning] = React.useState<string | null>(null);
  const [assignLoad, setAssignLoad] = React.useState<AvailableItem | null>(null);
  const [driverSearch, setDriverSearch] = React.useState("");

  const handleAssign = async (item: AvailableItem, driverId: string) => {
    setAssigning(item._id);
    try {
      await onAssign(item, driverId);
      setAssignLoad(null);
    } finally {
      setAssigning(null);
    }
  };

  const filteredDrivers = React.useMemo(() => {
    const q = driverSearch.trim().toLowerCase();
    if (!q) return activeDrivers;
    return activeDrivers.filter((d) => {
      const name = d.driver?.name?.toLowerCase() || "";
      const email = d.driver?.email?.toLowerCase() || "";
      return name.includes(q) || email.includes(q);
    });
  }, [activeDrivers, driverSearch]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-2">
        <Loader2 className="size-5 text-primary animate-spin" />
        <p className="text-xs text-muted-foreground">Loading available loads...</p>
      </div>
    );
  }

  if (loads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <div className="size-14 rounded-2xl bg-muted/40 flex items-center justify-center">
          <Package className="size-7 text-muted-foreground/40" />
        </div>
        <p className="text-sm text-muted-foreground font-medium">No available loads</p>
        <p className="text-[11px] text-muted-foreground/60">Create a load or post to the load board</p>
      </div>
    );
  }

  return (
    <>
      <div className="divide-y divide-border/30">
        {loads.map((load) => (
          <div key={load._id} className="p-3 sm:p-4 hover:bg-accent/30 transition-colors">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-4">
              <div className="flex items-start gap-3 min-w-0 flex-1">
                <div className="size-10 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
                  <Package className="size-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-bold text-foreground">
                      {load.trackingNumber || load._id.slice(-8)}
                    </p>
                    <div className="flex gap-1 flex-wrap">
                      {load.isPostedToBoard && (
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-5 border-blue-300 dark:border-blue-500/40 text-blue-600 dark:text-blue-400 gap-0.5">
                          <Megaphone className="size-2.5" />Board
                        </Badge>
                      )}
                      {load.trailerTypeRequired && (
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-5 border-purple-300 dark:border-purple-500/40 text-purple-600 dark:text-purple-400 gap-0.5">
                          <Truck className="size-2.5" />{trailerLabel(load.trailerTypeRequired)}
                        </Badge>
                      )}
                      {load.vehicleCount && load.vehicleCount > 0 && (
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-5 border-indigo-300 dark:border-indigo-500/40 text-indigo-600 dark:text-indigo-400">
                          {load.vehicleCount} vehicle{load.vehicleCount !== 1 ? "s" : ""}
                        </Badge>
                      )}
                    </div>
                  </div>
                  {(load.origin || load.destination) && (
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <MapPin className="size-3 shrink-0" />
                      <span className="truncate">{load.origin}</span>
                      <ArrowRight className="size-3 shrink-0 text-muted-foreground/40" />
                      <span className="truncate">{load.destination}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-3 text-[10px] text-muted-foreground/60 flex-wrap">
                    {load.requestedPickupDate && (
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="size-2.5" />
                        Pickup: {new Date(load.requestedPickupDate).toLocaleDateString('en-US', { timeZone: 'America/Denver' })}
                      </span>
                    )}
                    {load.carrierPayAmount != null && load.carrierPayAmount > 0 && (
                      <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                        <DollarSign className="size-2.5" />
                        {load.carrierPayAmount.toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <Button
                size="sm"
                className="h-10 sm:h-8 px-3 text-xs font-bold gap-1.5 shrink-0 shadow-sm w-full sm:w-auto"
                disabled={assigning === load._id || activeDrivers.length === 0}
                onClick={() => { setAssignLoad(load); setDriverSearch(""); }}
              >
                {assigning === load._id ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <>
                    <UserPlus className="size-3.5" />
                    Assign Driver
                  </>
                )}
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={assignLoad !== null} onOpenChange={(open) => { if (!open) setAssignLoad(null); }}>
        <DialogContent
          className="sm:max-w-xl w-[calc(100%-1.5rem)] sm:w-full"
          overlayClassName="bg-black/72 backdrop-blur-[4px]"
        >
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <UserPlus className="size-4 text-primary" />
              Assign Driver
            </DialogTitle>
            {assignLoad && (
              <div className="mt-2 rounded-lg border border-border/40 p-3 space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <Package className="size-4 text-blue-600 dark:text-blue-400 shrink-0" />
                  <p className="text-sm font-bold">{assignLoad.trackingNumber || assignLoad._id.slice(-8)}</p>
                  <div className="flex gap-1 flex-wrap">
                    {assignLoad.trailerTypeRequired && (
                      <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-5 border-purple-300 dark:border-purple-500/40 text-purple-600 dark:text-purple-400 gap-0.5">
                        <Truck className="size-2.5" />{trailerLabel(assignLoad.trailerTypeRequired)}
                      </Badge>
                    )}
                    {assignLoad.vehicleCount && assignLoad.vehicleCount > 0 && (
                      <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-5 border-indigo-300 dark:border-indigo-500/40 text-indigo-600 dark:text-indigo-400">
                        {assignLoad.vehicleCount} vehicle{assignLoad.vehicleCount !== 1 ? "s" : ""}
                      </Badge>
                    )}
                  </div>
                </div>
                {(assignLoad.origin || assignLoad.destination) && (
                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <MapPin className="size-3 shrink-0" />
                    <span className="truncate">{assignLoad.origin}</span>
                    <ArrowRight className="size-3 shrink-0" />
                    <span className="truncate">{assignLoad.destination}</span>
                  </div>
                )}
              </div>
            )}
          </DialogHeader>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground/40" />
            <Input
              value={driverSearch}
              onChange={(e) => setDriverSearch(e.target.value)}
              placeholder="Search drivers..."
              className="h-10 sm:h-9 pl-9 text-base sm:text-xs rounded-lg border-border/40"
            />
          </div>

          <div className="space-y-1.5 max-h-[50vh] sm:max-h-80 overflow-y-auto modal-scrollbar pr-1">
            {filteredDrivers.length === 0 && (
              <div className="flex flex-col items-center justify-center py-8 gap-2">
                <p className="text-xs text-muted-foreground">No drivers found</p>
              </div>
            )}
            {filteredDrivers.map((driver) => {
              const eq = driver.equipment;
              const trailerMatch = eq?.trailerType && assignLoad?.trailerTypeRequired
                ? eq.trailerType === assignLoad.trailerTypeRequired : null;
              const capacityMatch = eq?.maxVehicleCapacity && assignLoad?.vehicleCount
                ? eq.maxVehicleCapacity >= assignLoad.vehicleCount : null;

              return (
                <div
                  key={driver.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between rounded-xl border border-border/40 p-3 gap-3 hover:border-primary/30 hover:shadow-sm transition-all duration-200"
                >
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <Avatar className="size-10 border-2 border-background shadow-sm shrink-0">
                      {driver.driver?.avatar && <AvatarImage src={driver.driver.avatar} />}
                      <AvatarFallback className="text-xs font-bold bg-primary/5 text-primary">
                        {driver.driver?.name?.[0]?.toUpperCase() || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="text-sm font-bold truncate">{driver.driver?.name || "Unknown"}</p>
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground flex-wrap">
                        <span>{driver.shipments?.length || 0} load{(driver.shipments?.length || 0) !== 1 ? "s" : ""}</span>
                        {eq?.truckMake && (
                          <>
                            <span className="text-muted-foreground/30">|</span>
                            <span className="truncate">{eq.truckMake} {eq.truckModel || ""}</span>
                          </>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {eq?.trailerType && (
                          <Badge className="text-[9px] px-1.5 py-0 h-5 bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-500/30 gap-0.5">
                            <Truck className="size-2.5" />{trailerLabel(eq.trailerType)}
                          </Badge>
                        )}
                        {eq?.maxVehicleCapacity != null && eq.maxVehicleCapacity > 0 && (
                          <Badge className="text-[9px] px-1.5 py-0 h-5 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-500/30">
                            Cap: {eq.maxVehicleCapacity}
                          </Badge>
                        )}
                        {trailerMatch !== null && (
                          <Badge className={`text-[9px] px-1.5 py-0 h-5 gap-0.5 ${trailerMatch ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30" : "bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/30"}`}>
                            {trailerMatch ? <CheckCircle2 className="size-2.5" /> : <XCircle className="size-2.5" />}
                            Trailer
                          </Badge>
                        )}
                        {capacityMatch !== null && (
                          <Badge className={`text-[9px] px-1.5 py-0 h-5 gap-0.5 ${capacityMatch ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30" : "bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/30"}`}>
                            {capacityMatch ? <CheckCircle2 className="size-2.5" /> : <XCircle className="size-2.5" />}
                            Capacity
                          </Badge>
                        )}
                        {eq?.isComplianceExpired && (
                          <Badge className="text-[9px] px-1.5 py-0 h-5 gap-0.5 bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/30">
                            <AlertTriangle className="size-2.5" />Expired
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    className="h-10 sm:h-8 px-3 text-xs font-bold shrink-0 shadow-sm w-full sm:w-auto"
                    disabled={assigning !== null}
                    onClick={() => driver.driver?.id && assignLoad && handleAssign(assignLoad, driver.driver.id)}
                  >
                    {assigning === assignLoad?._id ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      "Assign"
                    )}
                  </Button>
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
