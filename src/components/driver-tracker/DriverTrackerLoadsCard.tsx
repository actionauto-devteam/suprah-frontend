"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Package,
  Eye,
  ExternalLink,
  Truck,
  Trash2,
  RefreshCw,
  Loader2,
  MapPin,
  ArrowRight,
  Search,
  Camera,
  CheckCircle2,
  Navigation2,
  AlertTriangle,
  Calendar,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DriverTrackingItem } from "@/types/driver-tracking";
import { trailerTypeOptions } from "@/components/driver-profile/driver-profile-constants";
import { cn } from "@/lib/utils";
import {
  compatibilityRank,
  evaluateDriverLoadCompatibility,
  titleCaseDay,
} from "@/lib/driver-load-compatibility";
import { useDriverLoadCompatibilityPreview } from "@/hooks/useDriverLoadCompatibilityPreview";
import { DriverLoadRecommendationBadges } from "@/components/driver-tracker/DriverLoadRecommendationBadges";

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
  onReassignLoad?: (shipmentId: string, newDriverId: string) => Promise<boolean>;
  onKeepAssigned?: (shipmentId: string) => Promise<void>;
}

export function DriverTrackerLoadsCard({
  drivers,
  isLoading,
  error,
  activeDrivers = [],
  onRemoveLoad,
  onReassignLoad,
  onKeepAssigned,
}: DriverTrackerLoadsCardProps) {
  const router = useRouter();
  const [viewDriver, setViewDriver] = React.useState<DriverTrackingItem | null>(null);
  const currentViewDriver = React.useMemo(
    () => (viewDriver ? (drivers.find((d) => d.id === viewDriver.id) ?? null) : null),
    [drivers, viewDriver],
  );
  const [removing, setRemoving] = React.useState<string | null>(null);
  const [reassigning, setReassigning] = React.useState<string | null>(null);
  const [keepingAssigned, setKeepingAssigned] = React.useState<string | null>(null);
  const [reassignShipmentId, setReassignShipmentId] = React.useState<string | null>(null);
  const [driverSearch, setDriverSearch] = React.useState("");

  const handleRemove = async (shipmentId: string) => {
    if (!onRemoveLoad) return;
    setRemoving(shipmentId);
    try {
      await onRemoveLoad(shipmentId);
    } finally {
      setRemoving(null);
    }
  };

  const handleKeepAssigned = async (shipmentId: string) => {
    if (!onKeepAssigned) return;
    setKeepingAssigned(shipmentId);
    try {
      await onKeepAssigned(shipmentId);
    } finally {
      setKeepingAssigned(null);
    }
  };

  const handleReassign = async (shipmentId: string, newDriverId: string) => {
    if (!onReassignLoad) return false;
    setReassigning(shipmentId);
    try {
      const succeeded = await onReassignLoad(shipmentId, newDriverId);
      if (succeeded) setReassignShipmentId(null);
      return succeeded;
    } finally {
      setReassigning(null);
    }
  };

  const reassignShipment = React.useMemo(
    () =>
      drivers
        .flatMap((driver) => driver.shipments ?? [])
        .find((shipment) => String(shipment.id) === String(reassignShipmentId)) ??
      null,
    [drivers, reassignShipmentId],
  );

  const reassignLoadPreview = React.useMemo(
    () =>
      reassignShipment
        ? {
            requestedPickupDate: reassignShipment.pickupDate,
            vehicleCount: reassignShipment.vehicleCount,
            trailerTypeRequired: reassignShipment.trailerType,
            pickupLocation: reassignShipment.pickupLocation,
            deliveryLocation: reassignShipment.deliveryLocation,
          }
        : null,
    [reassignShipment],
  );
  const previewDriverIds = React.useMemo(
    () => activeDrivers.map((driver) => driver.id),
    [activeDrivers],
  );
  const { compatibilityByDriverId } = useDriverLoadCompatibilityPreview({
    load: reassignLoadPreview,
    driverIds: previewDriverIds,
    enabled: Boolean(reassignShipment),
  });

  const reassignCandidates = React.useMemo(() => {
    const q = driverSearch.trim().toLowerCase();
    const filtered = activeDrivers.filter((d) => {
      if (!d.assignable || d.driver?.id === viewDriver?.driver?.id) return false;
      if (!q) return true;
      const name = d.driver?.name?.toLowerCase() || "";
      const email = d.driver?.email?.toLowerCase() || "";
      return name.includes(q) || email.includes(q);
    });

    if (!reassignShipment) return filtered;

    return [...filtered].sort((a, b) => {
      const previewLoad = reassignLoadPreview ?? {
        requestedPickupDate: reassignShipment.pickupDate,
        vehicleCount: reassignShipment.vehicleCount,
        trailerTypeRequired: reassignShipment.trailerType,
      };
      const aCompatibility =
        compatibilityByDriverId[a.id] ??
        evaluateDriverLoadCompatibility(a, previewLoad);
      const bCompatibility =
        compatibilityByDriverId[b.id] ??
        evaluateDriverLoadCompatibility(b, previewLoad);
      const rankDifference =
        compatibilityRank(aCompatibility) - compatibilityRank(bCompatibility);
      if (rankDifference !== 0) return rankDifference;
      return String(a.driver?.name || "").localeCompare(
        String(b.driver?.name || ""),
      );
    });
  }, [
    activeDrivers,
    viewDriver,
    driverSearch,
    reassignShipment,
    reassignLoadPreview,
    compatibilityByDriverId,
  ]);

  if (isLoading) {
    return (
      <div className="space-y-3 p-4">
        {[1, 2].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="size-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48 max-w-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="rounded-lg border border-destructive/10 bg-destructive/5 px-4 py-3">
          <p className="break-words text-xs font-medium text-destructive [overflow-wrap:anywhere]">{error}</p>
        </div>
      </div>
    );
  }

  if (drivers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 px-4 py-16 text-center">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-muted/40">
          <Package className="size-7 text-muted-foreground/40" />
        </div>
        <p className="text-sm font-medium text-muted-foreground">No assigned loads</p>
        <p className="break-words text-xs leading-relaxed text-muted-foreground/70 [overflow-wrap:anywhere]">
          Assign loads to drivers from the Available tab
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="divide-y divide-border/30">
        {drivers.map((item) => {
          const shipments = item.shipments ?? [];
          return (
            <div key={item.id} className="p-3 transition-colors hover:bg-accent/30 sm:p-4">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center sm:gap-4">
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar className="size-10 shrink-0 border-2 border-background shadow-sm">
                    {item.driver?.avatar && <AvatarImage src={item.driver.avatar} />}
                    <AvatarFallback className="bg-primary/5 text-xs font-bold text-primary">
                      {item.driver?.name?.[0]?.toUpperCase() || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="break-words text-sm font-bold text-foreground [overflow-wrap:anywhere]">
                      {item.driver?.name || "Unknown Driver"}
                    </p>
                    <div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground/70">
                        <Package className="size-3 shrink-0" />
                        {shipments.length} load{shipments.length !== 1 ? "s" : ""}
                      </span>
                      {item.equipment?.trailerType && (
                        <Badge className="min-h-5 h-auto max-w-full whitespace-normal break-words border-purple-200 bg-purple-500/10 px-1.5 py-0.5 text-[9px] leading-tight text-purple-600 [overflow-wrap:anywhere] dark:border-purple-500/30 dark:text-purple-400">
                          <Truck className="mr-0.5 size-2.5 shrink-0" />{trailerLabel(item.equipment.trailerType)}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex min-w-0 shrink-0 flex-wrap items-center gap-2 sm:justify-end">
                  {shipments.length > 0 && shipments.length <= 2 && shipments.map((s) => (
                    <div key={s.id} className="flex min-w-0 max-w-full flex-wrap items-center gap-1">
                      <Badge variant="outline" className="min-h-6 h-auto max-w-full whitespace-normal break-all px-2 py-1 text-[10px] font-semibold leading-tight [overflow-wrap:anywhere] border-border/50">
                        <Package className="mr-0.5 size-2.5 shrink-0" />
                        {s.trackingNumber || s.id.slice(-6)}
                      </Badge>
                      {s.status && (
                        <Badge variant="outline" className={cn("min-h-5 h-auto whitespace-normal break-words px-1.5 py-0.5 text-[9px] leading-tight [overflow-wrap:anywhere]", STATUS_BADGE[s.status] || "border-border/50")}>
                          {(s.status === "In-Transit" || s.status === "In-Route") && <Navigation2 className="mr-0.5 size-2.5 shrink-0" />}
                          {s.status === "Picked Up" && <Truck className="mr-0.5 size-2.5 shrink-0" />}
                          {s.status === "Accepted" && <CheckCircle2 className="mr-0.5 size-2.5 shrink-0" />}
                          {s.status}
                        </Badge>
                      )}
                      {(s as any).proofPending && (
                        <Badge className="min-h-5 h-auto whitespace-normal break-words border-amber-500/20 bg-amber-500/10 px-1.5 py-0.5 text-[9px] leading-tight text-amber-600 [overflow-wrap:anywhere] animate-pulse dark:text-amber-400">
                          <Camera className="mr-0.5 size-2.5 shrink-0" />Proof
                        </Badge>
                      )}
                    </div>
                  ))}
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-9 w-full gap-1.5 border-border/50 px-3 text-xs font-semibold hover:border-primary/30 hover:bg-primary/5 hover:text-primary sm:h-8 sm:w-auto"
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

      <Dialog
        open={viewDriver !== null && !reassignShipmentId}
        onOpenChange={(open) => {
          if (!open) setViewDriver(null);
        }}
      >
        <DialogContent
          className="flex h-[calc(100dvh-1rem)] max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] flex-col gap-0 overflow-hidden p-0 sm:h-auto sm:max-h-[88dvh] sm:w-[92vw] sm:max-w-lg duration-300 ease-out data-[state=closed]:duration-200 data-[state=closed]:ease-in motion-reduce:duration-0"
          overlayClassName="bg-black/70 backdrop-blur-[3px] duration-300 ease-out data-[state=closed]:duration-200 data-[state=closed]:ease-in motion-reduce:duration-0"
        >
          <DialogHeader className="shrink-0 border-b border-border/60 px-4 py-4 text-left sm:px-5">
            <DialogTitle className="flex min-w-0 items-start gap-2 pr-6 text-base font-bold">
              <Truck className="mt-0.5 size-4 shrink-0 text-primary" />
              <span className="min-w-0 break-words [overflow-wrap:anywhere]">
                {currentViewDriver?.driver?.name || "Driver"} — Assigned Loads
              </span>
            </DialogTitle>
            <DialogDescription className="break-words text-xs leading-relaxed [overflow-wrap:anywhere]">
              {currentViewDriver?.shipments?.length || 0} load{(currentViewDriver?.shipments?.length || 0) !== 1 ? "s" : ""} assigned. Review, remove, or reassign individual loads below.
            </DialogDescription>
            {currentViewDriver?.equipment && (
              <div className="mt-1 flex min-w-0 flex-wrap gap-1">
                {currentViewDriver.equipment.truckMake && (
                  <Badge className="min-h-5 h-auto max-w-full whitespace-normal break-words bg-muted px-1.5 py-0.5 text-[9px] leading-tight text-muted-foreground [overflow-wrap:anywhere] border-border/50">
                    {currentViewDriver.equipment.truckMake} {currentViewDriver.equipment.truckModel || ""}
                  </Badge>
                )}
                {currentViewDriver.equipment.trailerType && (
                  <Badge className="min-h-5 h-auto max-w-full whitespace-normal break-words border-purple-200 bg-purple-500/10 px-1.5 py-0.5 text-[9px] leading-tight text-purple-600 [overflow-wrap:anywhere] dark:border-purple-500/30 dark:text-purple-400">
                    <Truck className="mr-0.5 size-2.5 shrink-0" />{trailerLabel(currentViewDriver.equipment.trailerType)}
                  </Badge>
                )}
                {currentViewDriver.equipment.maxVehicleCapacity != null && (
                  <Badge className="min-h-5 h-auto whitespace-normal break-words border-indigo-200 bg-indigo-500/10 px-1.5 py-0.5 text-[9px] leading-tight text-indigo-600 [overflow-wrap:anywhere] dark:border-indigo-500/30 dark:text-indigo-400">
                    Cap: {currentViewDriver.equipment.maxVehicleCapacity}
                  </Badge>
                )}
              </div>
            )}
          </DialogHeader>

          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5">
            {(currentViewDriver?.shipments?.length || 0) === 0 && (
              <div className="flex flex-col items-center justify-center gap-2 px-4 py-8 text-center">
                <Package className="size-8 text-muted-foreground/30" />
                <p className="text-xs text-muted-foreground">No loads assigned</p>
              </div>
            )}

            {currentViewDriver?.shipments?.map((shipment) => (
              <div key={shipment.id} className="rounded-xl border border-border/40 p-3 transition-all duration-200 hover:border-primary/30 hover:shadow-sm sm:p-4">
                <div
                  className="flex min-w-0 cursor-pointer flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"
                  onClick={() => {
                    const query = shipment.trackingNumber || shipment.id;
                    router.push(`/transportation?search=${encodeURIComponent(query)}`);
                  }}
                >
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/5">
                      <Package className="size-5 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="break-all text-sm font-bold text-foreground [overflow-wrap:anywhere]">
                        {shipment.trackingNumber || shipment.id}
                      </p>
                      {(shipment.origin || shipment.destination) && (
                        <div className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-start gap-x-1.5 gap-y-1 text-[11px] leading-relaxed text-muted-foreground sm:flex sm:flex-wrap sm:items-center">
                          <MapPin className="mt-0.5 size-3 shrink-0 sm:mt-0" />
                          <span className="min-w-0 break-words [overflow-wrap:anywhere]">
                            {shipment.origin || "Origin not provided"}
                          </span>
                          <ArrowRight className="col-start-1 mt-0.5 size-3 shrink-0 text-muted-foreground/40 sm:col-auto sm:mt-0" />
                          <span className="min-w-0 break-words [overflow-wrap:anywhere]">
                            {shipment.destination || "Destination not provided"}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex min-w-0 flex-wrap items-center gap-1.5 sm:shrink-0 sm:justify-end sm:gap-2">
                    {(shipment as any).proofPending && (
                      <Badge className="min-h-5 h-auto whitespace-normal break-words border-amber-500/20 bg-amber-500/10 px-1.5 py-0.5 text-[9px] leading-tight text-amber-600 [overflow-wrap:anywhere] animate-pulse dark:text-amber-400">
                        <Camera className="mr-0.5 size-2.5 shrink-0" />Proof
                      </Badge>
                    )}
                    <Badge variant="outline" className={cn("min-h-6 h-auto whitespace-normal break-words px-2 py-1 text-[10px] font-semibold leading-tight [overflow-wrap:anywhere]", (shipment.status && STATUS_BADGE[shipment.status]) || "border-border/50")}>
                      {shipment.status || "—"}
                    </Badge>
                    <ExternalLink className="hidden size-3.5 shrink-0 text-muted-foreground/40 sm:block" />
                  </div>
                </div>

                {shipment.releaseRequest?.status === "pending" && (
                  <div className="mt-3 rounded-xl border border-amber-500/25 bg-amber-500/[0.06] p-3 text-xs leading-relaxed text-muted-foreground">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
                      <div className="min-w-0 space-y-1">
                        <p className="font-bold text-foreground">
                          {shipment.releaseRequest.priority === "emergency"
                            ? "Emergency release requested"
                            : "Driver requested release"}
                        </p>
                        <p>
                          Reason: {String(shipment.releaseRequest.reason || "other").replace(/_/g, " ")}.
                          {shipment.releaseRequest.message ? ` ${shipment.releaseRequest.message}` : ""}
                        </p>
                        <p className="font-medium text-amber-700 dark:text-amber-300">
                          The load is still assigned. Dispatch must choose the final action.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {(onRemoveLoad || onReassignLoad || (onKeepAssigned && shipment.releaseRequest?.status === "pending")) && (
                  <div className="mt-3 grid grid-cols-1 gap-2 border-t border-border/20 pt-3 sm:flex sm:flex-wrap sm:items-center">
                    {onKeepAssigned && shipment.releaseRequest?.status === "pending" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-9 w-full gap-1 border-emerald-500/25 px-2.5 text-[10px] font-semibold text-emerald-700 hover:bg-emerald-500/10 sm:h-8 sm:w-auto dark:text-emerald-400"
                        disabled={keepingAssigned === shipment.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          void handleKeepAssigned(shipment.id);
                        }}
                      >
                        {keepingAssigned === shipment.id ? <Loader2 className="size-3 animate-spin" /> : <CheckCircle2 className="size-3" />}
                        Keep Assigned
                      </Button>
                    )}
                    {onRemoveLoad && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-9 w-full gap-1 border-destructive/20 px-2.5 text-[10px] font-semibold text-destructive hover:bg-destructive/10 sm:h-8 sm:w-auto"
                        disabled={removing === shipment.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          void handleRemove(shipment.id);
                        }}
                      >
                        {removing === shipment.id ? <Loader2 className="size-3 animate-spin" /> : <Trash2 className="size-3" />}
                        {shipment.releaseRequest?.status === "pending" ? "Approve & Return to Available" : "Remove"}
                      </Button>
                    )}
                    {onReassignLoad && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-9 w-full gap-1 border-border/50 px-2.5 text-[10px] font-semibold hover:bg-primary/5 sm:h-8 sm:w-auto"
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

      <Dialog
        open={reassignShipmentId !== null}
        onOpenChange={(open) => {
          if (!open) setReassignShipmentId(null);
        }}
      >
        <DialogContent
          className="flex h-[calc(100dvh-1rem)] max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] flex-col gap-0 overflow-hidden p-0 sm:h-auto sm:max-h-[88dvh] sm:w-[92vw] sm:max-w-xl duration-300 ease-out data-[state=closed]:duration-200 data-[state=closed]:ease-in motion-reduce:duration-0"
          overlayClassName="bg-black/70 backdrop-blur-[3px] duration-300 ease-out data-[state=closed]:duration-200 data-[state=closed]:ease-in motion-reduce:duration-0"
        >
          <DialogHeader className="shrink-0 border-b border-border/60 px-4 py-4 text-left sm:px-5">
            <DialogTitle className="flex min-w-0 items-start gap-2 pr-6 text-base font-bold">
              <RefreshCw className="mt-0.5 size-4 shrink-0 text-primary" />
              <span className="min-w-0 break-words [overflow-wrap:anywhere]">Reassign Load</span>
            </DialogTitle>
            <DialogDescription className="break-words text-xs leading-relaxed [overflow-wrap:anywhere]">
              Select another eligible Active driver. Drivers are ranked by pickup-day availability and equipment capacity; warnings remain visible instead of hiding valid override options.
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5">
            <div className="sticky top-0 z-10 -mx-1 mb-3 bg-background/95 px-1 pb-2 backdrop-blur-sm">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground/40" />
                <Input
                  value={driverSearch}
                  onChange={(e) => setDriverSearch(e.target.value)}
                  placeholder="Search drivers..."
                  className="h-10 rounded-lg border-border/40 pl-9 text-base sm:h-9 sm:text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              {reassignCandidates.length === 0 && (
                <div className="flex flex-col items-center justify-center gap-2 px-4 py-8 text-center">
                  <p className="break-words text-xs text-muted-foreground [overflow-wrap:anywhere]">No other drivers available</p>
                </div>
              )}

              {reassignCandidates.map((d) => {
                const eq = d.equipment;
                const compatibility = reassignShipment
                  ? compatibilityByDriverId[d.id] ??
                    evaluateDriverLoadCompatibility(
                      d,
                      reassignLoadPreview ?? {
                        requestedPickupDate: reassignShipment.pickupDate,
                        vehicleCount: reassignShipment.vehicleCount,
                        trailerTypeRequired: reassignShipment.trailerType,
                      },
                    )
                  : null;
                const availability = compatibility?.availability.status ?? "unknown";
                const capacity = compatibility?.capacity.status ?? "unknown";
                const trailer = compatibility?.trailer.status ?? "unknown";
                const needsReview =
                  availability === "off_schedule" || capacity !== "match";
                return (
                  <div
                    key={d.id}
                    className="flex min-w-0 flex-col justify-between gap-3 rounded-xl border border-border/40 p-3 transition-all duration-200 hover:border-primary/30 hover:shadow-sm sm:flex-row sm:items-center"
                  >
                    <div className="flex min-w-0 flex-1 items-start gap-3">
                      <Avatar className="size-10 shrink-0 border-2 border-background shadow-sm">
                        {d.driver?.avatar && <AvatarImage src={d.driver.avatar} />}
                        <AvatarFallback className="bg-primary/5 text-xs font-bold text-primary">
                          {d.driver?.name?.[0]?.toUpperCase() || "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1 space-y-1">
                        <p className="break-words text-sm font-bold [overflow-wrap:anywhere]">
                          {d.driver?.name || "Unknown"}
                        </p>
                        {d.driver?.email && (
                          <p className="break-all text-[10px] leading-relaxed text-muted-foreground [overflow-wrap:anywhere]">
                            {d.driver.email}
                          </p>
                        )}
                        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-muted-foreground">
                          <span>{d.shipments?.length || 0} load{(d.shipments?.length || 0) !== 1 ? "s" : ""}</span>
                          {eq?.truckMake && (
                            <span className="min-w-0 break-words [overflow-wrap:anywhere]">
                              {eq.truckMake} {eq.truckModel || ""}
                            </span>
                          )}
                        </div>
                        <div className="flex min-w-0 flex-wrap gap-1">
                          {eq?.trailerType && (
                            <Badge className="min-h-5 h-auto max-w-full whitespace-normal break-words border-purple-200 bg-purple-500/10 px-1.5 py-0.5 text-[9px] leading-tight text-purple-600 [overflow-wrap:anywhere] dark:border-purple-500/30 dark:text-purple-400">
                              <Truck className="mr-0.5 size-2.5 shrink-0" />{trailerLabel(eq.trailerType)}
                            </Badge>
                          )}
                          {eq?.maxVehicleCapacity != null && eq.maxVehicleCapacity > 0 && (
                            <Badge className="min-h-5 h-auto whitespace-normal break-words border-indigo-200 bg-indigo-500/10 px-1.5 py-0.5 text-[9px] leading-tight text-indigo-600 [overflow-wrap:anywhere] dark:border-indigo-500/30 dark:text-indigo-400">
                              Cap: {eq.maxVehicleCapacity}
                            </Badge>
                          )}
                          {availability !== "unknown" && (
                            <Badge className={`min-h-5 h-auto whitespace-normal break-words px-1.5 py-0.5 text-[9px] leading-tight [overflow-wrap:anywhere] ${availability === "match" ? "border-emerald-200 bg-emerald-500/10 text-emerald-600 dark:border-emerald-500/30 dark:text-emerald-400" : "border-amber-200 bg-amber-500/10 text-amber-700 dark:border-amber-500/30 dark:text-amber-400"}`}>
                              {availability === "match" ? <CheckCircle2 className="mr-0.5 size-2.5 shrink-0" /> : <AlertTriangle className="mr-0.5 size-2.5 shrink-0" />}
                              {availability === "match"
                                ? `Available ${titleCaseDay(compatibility?.availability.pickupDay) || ""}`.trim()
                                : `Off Schedule ${titleCaseDay(compatibility?.availability.pickupDay) || ""}`.trim()}
                            </Badge>
                          )}
                          {capacity === "match" ? (
                            <Badge className="min-h-5 h-auto whitespace-normal break-words border-emerald-200 bg-emerald-500/10 px-1.5 py-0.5 text-[9px] leading-tight text-emerald-600 [overflow-wrap:anywhere] dark:border-emerald-500/30 dark:text-emerald-400">
                              <CheckCircle2 className="mr-0.5 size-2.5 shrink-0" />
                              Capacity {compatibility?.capacity.requiredVehicles}/{compatibility?.capacity.maxVehicles}
                            </Badge>
                          ) : (
                            <Badge className="min-h-5 h-auto whitespace-normal break-words border-red-200 bg-red-500/10 px-1.5 py-0.5 text-[9px] leading-tight text-red-600 [overflow-wrap:anywhere] dark:border-red-500/30 dark:text-red-400">
                              {capacity === "exceeded" ? <XCircle className="mr-0.5 size-2.5 shrink-0" /> : <AlertTriangle className="mr-0.5 size-2.5 shrink-0" />}
                              {capacity === "exceeded"
                                ? `Capacity ${compatibility?.capacity.requiredVehicles}/${compatibility?.capacity.maxVehicles} · Exceeded`
                                : "Capacity Not Verified"}
                            </Badge>
                          )}
                          {trailer === "mismatch" && (
                            <Badge className="min-h-5 h-auto whitespace-normal break-words border-amber-200 bg-amber-500/10 px-1.5 py-0.5 text-[9px] leading-tight text-amber-700 [overflow-wrap:anywhere] dark:border-amber-500/30 dark:text-amber-400">
                              <AlertTriangle className="mr-0.5 size-2.5 shrink-0" />Trailer Mismatch
                            </Badge>
                          )}
                        </div>
                        <DriverLoadRecommendationBadges
                          compatibility={compatibility}
                          className="pt-1"
                        />
                      </div>
                    </div>

                    <Button
                      size="sm"
                      className="h-10 w-full shrink-0 px-3 text-xs font-bold shadow-sm sm:h-8 sm:w-auto"
                      disabled={reassigning !== null}
                      onClick={() =>
                        d.driver?.id &&
                        reassignShipmentId &&
                        void handleReassign(reassignShipmentId, d.driver.id)
                      }
                    >
                      {reassigning === reassignShipmentId ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : reassignShipment?.releaseRequest?.status === "pending" ? (
                        needsReview ? "Review & Approve Reassign" : "Approve & Reassign"
                      ) : needsReview ? (
                        "Review & Reassign"
                      ) : (
                        "Reassign"
                      )}
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}