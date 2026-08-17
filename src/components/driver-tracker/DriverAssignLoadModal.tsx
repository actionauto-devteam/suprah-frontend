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
  AlertTriangle,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DriverTrackingItem } from "@/types/driver-tracking";
import { trailerTypeOptions } from "@/components/driver-profile/driver-profile-constants";
import {
  evaluateDriverLoadCompatibility,
  titleCaseDay,
} from "@/lib/driver-load-compatibility";
import { useDriverLoadCompatibilityMatrixPreview } from "@/hooks/useDriverLoadCompatibilityMatrixPreview";
import { DriverLoadRecommendationBadges } from "@/components/driver-tracker/DriverLoadRecommendationBadges";

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
  pickupLocation?: {
    city?: string;
    state?: string;
    zip?: string;
    coordinates?: { lat: number; lng: number } | null;
  };
  deliveryLocation?: {
    city?: string;
    state?: string;
    zip?: string;
    coordinates?: { lat: number; lng: number } | null;
  };
  isPostedToBoard?: boolean;
}

interface DriverAssignLoadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  driver: DriverTrackingItem | null;
  availableLoads: AvailableItem[];
  isLoading: boolean;
  onAssign: (item: AvailableItem) => Promise<boolean>;
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

  const compatibilityPreviewLoads = React.useMemo(
    () =>
      availableLoads.map((load) => ({
        key: load._id,
        load: {
          requestedPickupDate: load.requestedPickupDate,
          vehicleCount: load.vehicleCount,
          trailerTypeRequired: load.trailerTypeRequired,
          pickupLocation: load.pickupLocation,
          deliveryLocation: load.deliveryLocation,
        },
      })),
    [availableLoads],
  );

  const { compatibilityByLoadKey } =
    useDriverLoadCompatibilityMatrixPreview({
      loads: compatibilityPreviewLoads,
      driverIds: driver?.id ? [driver.id] : [],
      enabled: open && Boolean(driver?.id),
    });

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
        className="flex h-[calc(100dvh-1rem)] max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] flex-col gap-0 overflow-hidden p-0 sm:h-auto sm:max-h-[calc(100dvh-2rem)] sm:w-[calc(100vw-2rem)] sm:max-w-xl duration-300 ease-out data-[state=closed]:duration-200 data-[state=closed]:ease-in motion-reduce:duration-0"
        overlayClassName="bg-black/70 backdrop-blur-[3px] duration-300 ease-out data-[state=closed]:duration-200 data-[state=closed]:ease-in motion-reduce:duration-0"
      >
        <DialogHeader className="shrink-0 border-b border-border/60 px-4 py-4 text-left sm:px-5 sm:py-5">
          <DialogTitle className="flex items-start gap-2 pr-7 text-base font-bold sm:text-lg">
            <Package className="mt-0.5 size-4 shrink-0 text-primary sm:size-5" />
            <span className="min-w-0 break-words [overflow-wrap:anywhere]">
              Assign Load — {driver?.driver?.name || "Driver"}
            </span>
          </DialogTitle>
          <DialogDescription className="break-words text-xs leading-relaxed [overflow-wrap:anywhere] sm:text-sm">
            Select an available load to assign to this driver.
          </DialogDescription>

          <div className="mt-2 flex min-w-0 items-start gap-3">
            <Avatar className="size-10 shrink-0 border-2 border-background shadow-sm">
              {driver?.driver?.avatar && <AvatarImage src={driver.driver.avatar} />}
              <AvatarFallback className="bg-primary/5 text-xs font-bold text-primary">
                {driver?.driver?.name?.[0]?.toUpperCase() || "?"}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="break-words text-sm font-bold [overflow-wrap:anywhere]">
                {driver?.driver?.name || "Unknown"}
              </p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {eq?.truckMake && (
                  <Badge className="h-auto max-w-full whitespace-normal break-words bg-muted px-2 py-1 text-[10px] leading-tight text-muted-foreground [overflow-wrap:anywhere]">
                    {eq.truckMake} {eq.truckModel || ""}
                  </Badge>
                )}
                {eq?.trailerType && (
                  <Badge className="h-auto max-w-full gap-1 whitespace-normal break-words border-purple-200 bg-purple-500/10 px-2 py-1 text-[10px] leading-tight text-purple-600 [overflow-wrap:anywhere] dark:border-purple-500/30 dark:text-purple-400">
                    <Truck className="size-3 shrink-0" />
                    {trailerLabel(eq.trailerType)}
                  </Badge>
                )}
                {eq?.maxVehicleCapacity != null && (
                  <Badge className="h-auto bg-indigo-500/10 px-2 py-1 text-[10px] text-indigo-600 dark:text-indigo-400">
                    Cap: {eq.maxVehicleCapacity}
                  </Badge>
                )}
                <Badge className="h-auto bg-muted px-2 py-1 text-[10px] text-muted-foreground">
                  {driver?.shipments?.length || 0} current load
                  {(driver?.shipments?.length || 0) !== 1 ? "s" : ""}
                </Badge>
                <Badge
                  className={`h-auto max-w-full whitespace-normal break-words px-2 py-1 text-[10px] leading-tight [overflow-wrap:anywhere] ${
                    driver?.assignable
                      ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600"
                      : "border-amber-500/20 bg-amber-500/10 text-amber-700"
                  }`}
                >
                  {driver?.assignable
                    ? "Eligible"
                    : `Unavailable · ${(eq?.operationalStatus || "active")
                        .replace("maintenance", "In Shop")
                        .replace("on_leave", "On Leave")}`}
                </Badge>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5">
          <div className="space-y-4">
            {driver && !driver.assignable && (
              <div className="break-words rounded-lg border border-amber-500/25 bg-amber-500/5 px-3 py-2.5 text-xs leading-relaxed text-amber-700 [overflow-wrap:anywhere] dark:text-amber-400">
                This driver is not currently eligible for a new assignment. Return the driver to Active and clear any blocking status transition first.
              </div>
            )}

            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground/40" />
              <Input
                value={loadSearch}
                onChange={(e) => setLoadSearch(e.target.value)}
                placeholder="Search by tracking number, origin, or destination"
                className="h-10 w-full rounded-lg border-border/40 pl-9 text-sm"
              />
            </div>

            <div className="space-y-3">
              {isLoading && (
                <div className="flex flex-col items-center justify-center gap-3 py-8">
                  <Loader2 className="size-6 animate-spin text-primary" />
                  <p className="text-xs font-medium text-muted-foreground">Loading available loads...</p>
                </div>
              )}

              {!isLoading && filteredLoads.length === 0 && (
                <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
                  <div className="flex size-12 items-center justify-center rounded-xl bg-muted/40">
                    <Package className="size-6 text-muted-foreground/40" />
                  </div>
                  <p className="break-words text-xs font-medium text-muted-foreground [overflow-wrap:anywhere]">
                    {loadSearch ? "No loads match your search" : "No loads available for pickup"}
                  </p>
                </div>
              )}

              {filteredLoads.map((load) => {
                const compatibility =
                  (driver?.id
                    ? compatibilityByLoadKey[load._id]?.[driver.id]
                    : null) ?? evaluateDriverLoadCompatibility(driver, load);
                const trailerMatch = compatibility.trailer.status;
                const capacityMatch = compatibility.capacity.status;
                const availabilityMatch = compatibility.availability.status;
                const needsReview =
                  availabilityMatch === "off_schedule" ||
                  capacityMatch !== "match";

                return (
                  <div
                    key={load._id}
                    className="rounded-xl border border-border/40 p-3 transition-all duration-200 hover:border-primary/30 hover:shadow-sm sm:p-4"
                  >
                    <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex min-w-0 flex-1 items-start gap-3">
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/5">
                          <Package className="size-5 text-primary" />
                        </div>
                        <div className="min-w-0 flex-1 space-y-1.5">
                          <p className="break-all text-sm font-bold text-foreground [overflow-wrap:anywhere]">
                            {load.trackingNumber || load._id}
                          </p>

                          {(load.origin || load.destination) && (
                            <div className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-start gap-x-1.5 gap-y-1 text-[11px] text-muted-foreground sm:flex sm:flex-wrap sm:items-center">
                              <MapPin className="mt-0.5 size-3 shrink-0 sm:mt-0" />
                              <span className="min-w-0 break-words [overflow-wrap:anywhere] sm:flex-1">
                                {load.origin || "Origin not provided"}
                              </span>
                              <span className="hidden sm:inline-flex">
                                <ArrowRight className="size-3 shrink-0 text-muted-foreground/40" />
                              </span>
                              <span className="hidden sm:block min-w-0 break-words [overflow-wrap:anywhere] sm:flex-1">
                                {load.destination || "Destination not provided"}
                              </span>
                              <span className="col-start-2 min-w-0 break-words [overflow-wrap:anywhere] sm:hidden">
                                → {load.destination || "Destination not provided"}
                              </span>
                            </div>
                          )}

                          {load.requestedPickupDate && (
                            <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground/70">
                              <Calendar className="size-3 shrink-0" />
                              <span>
                                Pickup: {new Date(load.requestedPickupDate).toLocaleDateString("en-US", { timeZone: "UTC" })}
                              </span>
                            </div>
                          )}

                          <div className="mt-1 flex flex-wrap gap-1.5">
                            {load.trailerTypeRequired && (
                              <Badge className="h-auto max-w-full gap-1 whitespace-normal break-words border-purple-200 bg-purple-500/10 px-2 py-1 text-[10px] leading-tight text-purple-600 [overflow-wrap:anywhere] dark:border-purple-500/30 dark:text-purple-400">
                                <Truck className="size-3 shrink-0" />
                                {trailerLabel(load.trailerTypeRequired)}
                              </Badge>
                            )}
                            {load.vehicleCount != null && (
                              <Badge className="h-auto bg-indigo-500/10 px-2 py-1 text-[10px] text-indigo-600 dark:text-indigo-400">
                                {load.vehicleCount} vehicle{load.vehicleCount !== 1 ? "s" : ""}
                              </Badge>
                            )}
                            {load.carrierPayAmount != null && (
                              <Badge className="h-auto bg-emerald-500/10 px-2 py-1 text-[10px] text-emerald-600 dark:text-emerald-400">
                                ${load.carrierPayAmount.toLocaleString()}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>

                      <Button
                        size="sm"
                        className="h-10 w-full shrink-0 px-3 text-xs font-bold shadow-sm sm:h-9 sm:w-auto"
                        onClick={() => handleAssign(load)}
                        disabled={assigning !== null || !driver?.assignable}
                      >
                        {assigning === load._id ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : needsReview ? (
                          "Review & Assign"
                        ) : (
                          "Assign"
                        )}
                      </Button>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-border/20 pt-3">
                      <span
                        className={`flex items-center gap-1.5 text-xs font-semibold ${
                          availabilityMatch === "match"
                            ? "text-emerald-600 dark:text-emerald-400"
                            : availabilityMatch === "off_schedule"
                              ? "text-amber-600 dark:text-amber-400"
                              : "text-muted-foreground"
                        }`}
                      >
                        {availabilityMatch === "match" ? (
                          <CheckCircle2 className="size-3.5 shrink-0" />
                        ) : availabilityMatch === "off_schedule" ? (
                          <AlertTriangle className="size-3.5 shrink-0" />
                        ) : (
                          <Calendar className="size-3.5 shrink-0" />
                        )}
                        {availabilityMatch === "match"
                          ? `Available ${titleCaseDay(compatibility.availability.pickupDay) || "on pickup day"}`
                          : availabilityMatch === "off_schedule"
                            ? `Off Schedule ${titleCaseDay(compatibility.availability.pickupDay) || ""}`.trim()
                            : "Schedule Unknown"}
                      </span>

                      <span
                        className={`flex items-center gap-1.5 text-xs font-semibold ${
                          capacityMatch === "match"
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-red-500 dark:text-red-400"
                        }`}
                      >
                        {capacityMatch === "match" ? (
                          <CheckCircle2 className="size-3.5 shrink-0" />
                        ) : (
                          <XCircle className="size-3.5 shrink-0" />
                        )}
                        {capacityMatch === "match"
                          ? `Capacity ${compatibility.capacity.requiredVehicles}/${compatibility.capacity.maxVehicles}`
                          : capacityMatch === "exceeded"
                            ? `Capacity ${compatibility.capacity.requiredVehicles}/${compatibility.capacity.maxVehicles} · Exceeded`
                            : "Capacity Not Verified"}
                      </span>

                      {trailerMatch !== "unknown" && (
                        <span
                          className={`flex items-center gap-1.5 text-xs font-semibold ${
                            trailerMatch === "match"
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-amber-600 dark:text-amber-400"
                          }`}
                        >
                          {trailerMatch === "match" ? (
                            <CheckCircle2 className="size-3.5 shrink-0" />
                          ) : (
                            <AlertTriangle className="size-3.5 shrink-0" />
                          )}
                          Trailer {trailerMatch === "match" ? "Match" : "Mismatch"}
                        </span>
                      )}
                    </div>

                    <DriverLoadRecommendationBadges
                      compatibility={compatibility}
                      className="mt-2"
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}