"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Package, Eye, ExternalLink, Truck, Trash2, RefreshCw,
  Loader2, MapPin, ArrowRight, Search, Camera, CheckCircle2,
  Navigation2, AlertCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { DriverTrackingItem } from "@/types/driver-tracking";
import { trailerTypeOptions } from "@/components/driver-profile/driver-profile-constants";
import { cn } from "@/lib/utils";

const STATUS_BADGE: Record<string, string> = {
  Assigned: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  Accepted: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  "Picked Up": "bg-orange-500/10 text-orange-600 border-orange-500/20",
  "In-Transit": "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  "In-Route": "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  Dispatched: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  Delivered: "bg-green-500/10 text-green-700 border-green-500/20",
  Cancelled: "bg-red-500/10 text-red-600 border-red-500/20",
};

const trailerLabel = (val?: string) =>
  trailerTypeOptions.find((t) => t.value === val)?.label || val || "";

interface DriverTrackerLoadsCardProps {
  drivers: DriverTrackingItem[];
  isLoading: boolean;
  error: string | null;
  activeDrivers?: DriverTrackingItem[];
  onRemoveLoad?: (shipmentId: string) => Promise<void>;
  onReassignLoad?: (shipmentId: string, newDriverId: string) => Promise<void>;
}

export function DriverTrackerLoadsCard({
  drivers,
  isLoading,
  error,
  activeDrivers = [],
  onRemoveLoad,
  onReassignLoad,
}: DriverTrackerLoadsCardProps) {
  const router = useRouter();
  const [viewDriver, setViewDriver] = React.useState<DriverTrackingItem | null>(null);
  const currentViewDriver = React.useMemo(
    () => (viewDriver ? (drivers.find((d) => d.id === viewDriver.id) ?? null) : null),
    [drivers, viewDriver],
  );
  const [removing, setRemoving] = React.useState<string | null>(null);
  const [reassigning, setReassigning] = React.useState<string | null>(null);
  const [reassignShipmentId, setReassignShipmentId] = React.useState<string | null>(null);
  const [driverSearch, setDriverSearch] = React.useState("");

  const handleRemove = async (shipmentId: string) => {
    if (!onRemoveLoad) return;
    setRemoving(shipmentId);
    try { await onRemoveLoad(shipmentId); } finally { setRemoving(null); }
  };

  const handleReassign = async (shipmentId: string, newDriverId: string) => {
    if (!onReassignLoad) return;
    setReassigning(shipmentId);
    try {
      await onReassignLoad(shipmentId, newDriverId);
      setReassignShipmentId(null);
    } finally {
      setReassigning(null);
    }
  };

  const reassignCandidates = React.useMemo(() => {
    const q = driverSearch.trim().toLowerCase();
    const filtered = activeDrivers.filter((d) => d.driver?.id !== viewDriver?.driver?.id);
    if (!q) return filtered;
    return filtered.filter((d) => {
      const name = d.driver?.name?.toLowerCase() || "";
      const email = d.driver?.email?.toLowerCase() || "";
      return name.includes(q) || email.includes(q);
    });
  }, [activeDrivers, viewDriver, driverSearch]);

  if (isLoading) {
    return (
      <div className="space-y-3 p-4">
        {[1, 2].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="size-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="rounded-lg bg-destructive/5 border border-destructive/10 px-4 py-3">
          <p className="text-xs text-destructive font-medium">{error}</p>
        </div>
      </div>
    );
  }

  if (drivers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <div className="size-14 rounded-2xl bg-muted/40 flex items-center justify-center">
          <Package className="size-7 text-muted-foreground/40" />
        </div>
        <p className="text-sm text-muted-foreground font-medium">No assigned loads</p>
        <p className="text-[11px] text-muted-foreground/60">Assign loads to drivers from the Available tab</p>
      </div>
    );
  }

  return (
    <>
      <div className="divide-y divide-border/30">
        {drivers.map((item) => {
          const shipments = item.shipments ?? [];
          return (
            <div key={item.id} className="p-3 sm:p-4 hover:bg-accent/30 transition-colors">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar className="size-10 border-2 border-background shadow-sm shrink-0">
                    {item.driver?.avatar && <AvatarImage src={item.driver.avatar} />}
                    <AvatarFallback className="text-xs font-bold bg-primary/5 text-primary">
                      {item.driver?.name?.[0]?.toUpperCase() || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-foreground truncate">
                      {item.driver?.name || "Unknown Driver"}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground/60 font-medium">
                        <Package className="size-3" />
                        {shipments.length} load{shipments.length !== 1 ? "s" : ""}
                      </span>
                      {item.equipment?.trailerType && (
                        <>
                          <span className="hidden sm:inline text-muted-foreground/20">|</span>
                          <Badge className="text-[9px] px-1.5 py-0 h-5 bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-500/30 gap-0.5">
                            <Truck className="size-2.5" />{trailerLabel(item.equipment.trailerType)}
                          </Badge>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap shrink-0">
                  {shipments.length > 0 && shipments.length <= 2 && shipments.map((s) => (
                    <div key={s.id} className="flex items-center gap-1">
                      <Badge variant="outline" className="text-[10px] font-semibold h-6 gap-1 border-border/50">
                        <Package className="size-2.5" />
                        {s.trackingNumber || s.id.slice(-6)}
                      </Badge>
                      {s.status && (
                        <Badge variant="outline" className={cn("text-[9px] h-5 px-1.5 gap-0.5", (s.status && STATUS_BADGE[s.status]) || "border-border/50")}>
                          {(s.status === "In-Transit" || s.status === "In-Route") && <Navigation2 className="size-2.5" />}
                          {s.status === "Picked Up" && <Truck className="size-2.5" />}
                          {s.status === "Accepted" && <CheckCircle2 className="size-2.5" />}
                          {s.status}
                        </Badge>
                      )}
                      {(s as any).proofPending && (
                        <Badge className="text-[9px] h-5 px-1.5 gap-0.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 animate-pulse">
                          <Camera className="size-2.5" />Proof
                        </Badge>
                      )}
                    </div>
                  ))}
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-9 sm:h-8 px-3 text-xs font-semibold gap-1.5 border-border/50 hover:bg-primary/5 hover:text-primary hover:border-primary/30 w-full sm:w-auto"
                    onClick={() => setViewDriver(item)}
                  >
                    <Eye className="size-3.5" />
                    View Loads
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={viewDriver !== null && !reassignShipmentId} onOpenChange={(open) => { if (!open) setViewDriver(null); }}>
        <DialogContent
          className="sm:max-w-lg w-[calc(100%-1.5rem)] sm:w-full"
          overlayClassName="bg-black/72 backdrop-blur-[4px]"
        >
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 pr-6">
              <Truck className="size-4 text-primary shrink-0" />
              <span className="truncate">{currentViewDriver?.driver?.name || "Driver"} — Assigned Loads</span>
            </DialogTitle>
            <p className="text-[11px] text-muted-foreground/60 font-medium">
              {currentViewDriver?.shipments?.length || 0} load{(currentViewDriver?.shipments?.length || 0) !== 1 ? "s" : ""} assigned
            </p>
            {currentViewDriver?.equipment && (
              <div className="flex flex-wrap gap-1 mt-1">
                {currentViewDriver.equipment.truckMake && (
                  <Badge className="text-[9px] px-1.5 py-0 h-5 bg-muted text-muted-foreground border-border/50">
                    {currentViewDriver.equipment.truckMake} {currentViewDriver.equipment.truckModel || ""}
                  </Badge>
                )}
                {currentViewDriver.equipment.trailerType && (
                  <Badge className="text-[9px] px-1.5 py-0 h-5 bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-500/30 gap-0.5">
                    <Truck className="size-2.5" />{trailerLabel(currentViewDriver.equipment.trailerType)}
                  </Badge>
                )}
                {currentViewDriver.equipment.maxVehicleCapacity != null && (
                  <Badge className="text-[9px] px-1.5 py-0 h-5 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-500/30">
                    Cap: {currentViewDriver.equipment.maxVehicleCapacity}
                  </Badge>
                )}
              </div>
            )}
          </DialogHeader>
          <div className="space-y-2 max-h-[55vh] sm:max-h-96 overflow-y-auto modal-scrollbar pr-1">
            {(currentViewDriver?.shipments?.length || 0) === 0 && (
              <div className="flex flex-col items-center justify-center py-8 gap-2">
                <Package className="size-8 text-muted-foreground/30" />
                <p className="text-xs text-muted-foreground">No loads assigned</p>
              </div>
            )}
            {currentViewDriver?.shipments?.map((shipment) => (
              <div key={shipment.id} className="rounded-xl border border-border/40 p-3 sm:p-4 hover:border-primary/30 hover:shadow-sm transition-all duration-200">
                <div
                  className="flex items-start justify-between gap-3 cursor-pointer"
                  onClick={() => {
                    const query = shipment.trackingNumber || shipment.id;
                    router.push(`/transportation?search=${encodeURIComponent(query)}`);
                  }}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="size-10 rounded-xl bg-primary/5 flex items-center justify-center shrink-0">
                      <Package className="size-5 text-primary" />
                    </div>
                    <div className="min-w-0 space-y-1">
                      <p className="text-sm font-bold text-foreground truncate">
                        {shipment.trackingNumber || shipment.id}
                      </p>
                      {(shipment.origin || shipment.destination) && (
                        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                          <MapPin className="size-3 shrink-0" />
                          <span className="truncate">{shipment.origin}</span>
                          <ArrowRight className="size-3 shrink-0 text-muted-foreground/40" />
                          <span className="truncate">{shipment.destination}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 flex-wrap justify-end">
                    {(shipment as any).proofPending && (
                      <Badge className="text-[9px] h-5 px-1.5 gap-0.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 animate-pulse">
                        <Camera className="size-2.5" />Proof
                      </Badge>
                    )}
                    <Badge variant="outline" className={cn("text-[10px] font-semibold", (shipment.status && STATUS_BADGE[shipment.status]) || "border-border/50")}>
                      {shipment.status || "—"}
                    </Badge>
                    <ExternalLink className="size-3.5 text-muted-foreground/40 hidden sm:block" />
                  </div>
                </div>

                {(onRemoveLoad || onReassignLoad) && (
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/20">
                    {onRemoveLoad && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-9 sm:h-7 px-2.5 text-[10px] font-semibold gap-1 text-destructive border-destructive/20 hover:bg-destructive/10 flex-1 sm:flex-initial"
                        disabled={removing === shipment.id}
                        onClick={(e) => { e.stopPropagation(); handleRemove(shipment.id); }}
                      >
                        {removing === shipment.id ? <Loader2 className="size-3 animate-spin" /> : <Trash2 className="size-3" />}
                        Remove
                      </Button>
                    )}
                    {onReassignLoad && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-9 sm:h-7 px-2.5 text-[10px] font-semibold gap-1 border-border/50 hover:bg-primary/5 flex-1 sm:flex-initial"
                        disabled={reassigning === shipment.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setReassignShipmentId(shipment.id);
                          setDriverSearch("");
                        }}
                      >
                        <RefreshCw className="size-3" />
                        Reassign
                      </Button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={reassignShipmentId !== null} onOpenChange={(open) => { if (!open) setReassignShipmentId(null); }}>
        <DialogContent
          className="sm:max-w-xl w-[calc(100%-1.5rem)] sm:w-full"
          overlayClassName="bg-black/72 backdrop-blur-[4px]"
        >
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <RefreshCw className="size-4 text-primary" />
              Reassign Load
            </DialogTitle>
            <p className="text-[11px] text-muted-foreground/60 font-medium">
              Select a new driver to reassign this load
            </p>
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
            {reassignCandidates.length === 0 && (
              <div className="flex flex-col items-center justify-center py-8 gap-2">
                <p className="text-xs text-muted-foreground">No other drivers available</p>
              </div>
            )}
            {reassignCandidates.map((d) => {
              const eq = d.equipment;
              return (
                <div
                  key={d.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between rounded-xl border border-border/40 p-3 gap-3 hover:border-primary/30 hover:shadow-sm transition-all duration-200"
                >
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <Avatar className="size-10 border-2 border-background shadow-sm shrink-0">
                      {d.driver?.avatar && <AvatarImage src={d.driver.avatar} />}
                      <AvatarFallback className="text-xs font-bold bg-primary/5 text-primary">
                        {d.driver?.name?.[0]?.toUpperCase() || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="text-sm font-bold truncate">{d.driver?.name || "Unknown"}</p>
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                        <span>{d.shipments?.length || 0} load{(d.shipments?.length || 0) !== 1 ? "s" : ""}</span>
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
                      </div>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    className="h-10 sm:h-8 px-3 text-xs font-bold shrink-0 shadow-sm w-full sm:w-auto"
                    disabled={reassigning !== null}
                    onClick={() => d.driver?.id && reassignShipmentId && handleReassign(reassignShipmentId, d.driver.id)}
                  >
                    {reassigning === reassignShipmentId ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      "Reassign"
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
