"use client";

import * as React from "react";
import {
  Package,
  Truck,
  Loader2,
  UserPlus,
  Megaphone,
  MapPin,
  ArrowRight,
  Calendar,
  DollarSign,
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DriverTrackingItem } from "@/types/driver-tracking";
import { trailerTypeOptions } from "@/components/driver-profile/driver-profile-constants";
import {
  compatibilityRank,
  evaluateDriverLoadCompatibility,
  titleCaseDay,
} from "@/lib/driver-load-compatibility";
import { useDriverLoadCompatibilityPreview } from "@/hooks/useDriverLoadCompatibilityPreview";
import { DriverLoadRecommendationBadges } from "@/components/driver-tracker/DriverLoadRecommendationBadges";
import { formatScheduleDate } from "@/utils/calendar.utils";

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

interface DriverTrackerAvailableLoadsCardProps {
  loads: AvailableItem[];
  isLoading: boolean;
  activeDrivers: DriverTrackingItem[];
  onAssign: (item: AvailableItem, driverId: string) => Promise<boolean>;
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

  const previewDriverIds = React.useMemo(
    () => activeDrivers.map((driver) => driver.id),
    [activeDrivers],
  );
  const { compatibilityByDriverId } = useDriverLoadCompatibilityPreview({
    load: assignLoad,
    driverIds: previewDriverIds,
    enabled: Boolean(assignLoad),
  });

  const handleAssign = async (item: AvailableItem, driverId: string) => {
    setAssigning(item._id);
    try {
      const succeeded = await onAssign(item, driverId);
      if (succeeded) setAssignLoad(null);
    } finally {
      setAssigning(null);
    }
  };

  const filteredDrivers = React.useMemo(() => {
    const q = driverSearch.trim().toLowerCase();
    const matching = activeDrivers.filter((d) => {
      if (!q) return true;
      const name = d.driver?.name?.toLowerCase() || "";
      const email = d.driver?.email?.toLowerCase() || "";
      return name.includes(q) || email.includes(q);
    });

    if (!assignLoad) return matching;

    return [...matching].sort((a, b) => {
      const aCompatibility =
        compatibilityByDriverId[a.id] ??
        evaluateDriverLoadCompatibility(a, assignLoad);
      const bCompatibility =
        compatibilityByDriverId[b.id] ??
        evaluateDriverLoadCompatibility(b, assignLoad);
      const rankDifference =
        compatibilityRank(aCompatibility) - compatibilityRank(bCompatibility);
      if (rankDifference !== 0) return rankDifference;
      return String(a.driver?.name || "").localeCompare(
        String(b.driver?.name || ""),
      );
    });
  }, [activeDrivers, assignLoad, compatibilityByDriverId, driverSearch]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-12">
        <Loader2 className="size-5 animate-spin text-primary" />
        <p className="text-xs text-muted-foreground">Loading available loads...</p>
      </div>
    );
  }

  if (loads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 px-4 py-16 text-center">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-muted/40">
          <Package className="size-7 text-muted-foreground/40" />
        </div>
        <p className="text-sm font-medium text-muted-foreground">No available loads</p>
        <p className="break-words text-xs leading-relaxed text-muted-foreground/70 [overflow-wrap:anywhere]">
          Create a load or post to the load board
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="divide-y divide-border/30">
        {loads.map((load) => (
          <div key={load._id} className="p-3 transition-colors hover:bg-accent/30 sm:p-4">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start sm:gap-4">
              <div className="flex min-w-0 flex-1 items-start gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/10">
                  <Package className="size-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="min-w-0 break-all text-sm font-bold text-foreground [overflow-wrap:anywhere]">
                      {load.trackingNumber || load._id.slice(-8)}
                    </p>
                    <div className="flex min-w-0 flex-wrap gap-1">
                      {load.isPostedToBoard && (
                        <Badge variant="outline" className="min-h-5 h-auto whitespace-normal break-words px-1.5 py-0.5 text-[9px] leading-tight text-blue-600 [overflow-wrap:anywhere] border-blue-300 dark:border-blue-500/40 dark:text-blue-400">
                          <Megaphone className="mr-0.5 size-2.5 shrink-0" />Board
                        </Badge>
                      )}
                      {load.trailerTypeRequired && (
                        <Badge variant="outline" className="min-h-5 h-auto max-w-full whitespace-normal break-words px-1.5 py-0.5 text-[9px] leading-tight text-purple-600 [overflow-wrap:anywhere] border-purple-300 dark:border-purple-500/40 dark:text-purple-400">
                          <Truck className="mr-0.5 size-2.5 shrink-0" />{trailerLabel(load.trailerTypeRequired)}
                        </Badge>
                      )}
                      {load.vehicleCount && load.vehicleCount > 0 && (
                        <Badge variant="outline" className="min-h-5 h-auto whitespace-normal break-words px-1.5 py-0.5 text-[9px] leading-tight [overflow-wrap:anywhere] border-indigo-300 text-indigo-600 dark:border-indigo-500/40 dark:text-indigo-400">
                          {load.vehicleCount} vehicle{load.vehicleCount !== 1 ? "s" : ""}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {(load.origin || load.destination) && (
                    <div className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-start gap-x-1.5 gap-y-1 text-[11px] leading-relaxed text-muted-foreground sm:flex sm:flex-wrap sm:items-center">
                      <MapPin className="mt-0.5 size-3 shrink-0 sm:mt-0" />
                      <span className="min-w-0 break-words [overflow-wrap:anywhere] sm:max-w-[16rem]">
                        {load.origin || "Origin not provided"}
                      </span>
                      <ArrowRight className="col-start-1 mt-0.5 size-3 shrink-0 text-muted-foreground/40 sm:col-auto sm:mt-0" />
                      <span className="min-w-0 break-words [overflow-wrap:anywhere] sm:max-w-[16rem]">
                        {load.destination || "Destination not provided"}
                      </span>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-muted-foreground/70">
                    {load.requestedPickupDate && (
                      <span className="inline-flex min-w-0 items-start gap-1">
                        <Calendar className="mt-0.5 size-2.5 shrink-0" />
                        <span className="break-words [overflow-wrap:anywhere]">
                          Pickup: {formatScheduleDate(load.requestedPickupDate)}
                        </span>
                      </span>
                    )}
                    {load.carrierPayAmount != null && load.carrierPayAmount > 0 && (
                      <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                        <DollarSign className="size-2.5 shrink-0" />
                        {load.carrierPayAmount.toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <Button
                size="sm"
                className="h-10 w-full shrink-0 gap-1.5 px-3 text-xs font-bold shadow-sm sm:h-8 sm:w-auto"
                disabled={assigning === load._id || activeDrivers.length === 0}
                onClick={() => {
                  setAssignLoad(load);
                  setDriverSearch("");
                }}
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

      <Dialog
        open={assignLoad !== null}
        onOpenChange={(open) => {
          if (!open) setAssignLoad(null);
        }}
      >
        <DialogContent
          className="flex h-[calc(100dvh-1rem)] max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] flex-col gap-0 overflow-hidden p-0 sm:h-auto sm:max-h-[88dvh] sm:w-[92vw] sm:max-w-xl duration-300 ease-out data-[state=closed]:duration-200 data-[state=closed]:ease-in motion-reduce:duration-0"
          overlayClassName="bg-black/70 backdrop-blur-[3px] duration-300 ease-out data-[state=closed]:duration-200 data-[state=closed]:ease-in motion-reduce:duration-0"
        >
          <DialogHeader className="shrink-0 border-b border-border/60 px-4 py-4 text-left sm:px-5">
            <DialogTitle className="flex min-w-0 items-start gap-2 pr-6 text-base font-bold">
              <UserPlus className="mt-0.5 size-4 shrink-0 text-primary" />
              <span className="min-w-0 break-words [overflow-wrap:anywhere]">Assign Driver</span>
            </DialogTitle>
            <DialogDescription className="break-words text-xs leading-relaxed [overflow-wrap:anywhere]">
              Choose an available driver for this load. Driver details and compatibility indicators remain fully visible on smaller screens.
            </DialogDescription>

            {assignLoad && (
              <div className="mt-2 space-y-2 rounded-lg border border-border/40 bg-muted/[0.12] p-3">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <Package className="size-4 shrink-0 text-blue-600 dark:text-blue-400" />
                  <p className="min-w-0 break-all text-sm font-bold [overflow-wrap:anywhere]">
                    {assignLoad.trackingNumber || assignLoad._id.slice(-8)}
                  </p>
                  <div className="flex min-w-0 flex-wrap gap-1">
                    {assignLoad.trailerTypeRequired && (
                      <Badge variant="outline" className="min-h-5 h-auto max-w-full whitespace-normal break-words px-1.5 py-0.5 text-[9px] leading-tight text-purple-600 [overflow-wrap:anywhere] border-purple-300 dark:border-purple-500/40 dark:text-purple-400">
                        <Truck className="mr-0.5 size-2.5 shrink-0" />{trailerLabel(assignLoad.trailerTypeRequired)}
                      </Badge>
                    )}
                    {assignLoad.vehicleCount && assignLoad.vehicleCount > 0 && (
                      <Badge variant="outline" className="min-h-5 h-auto whitespace-normal break-words px-1.5 py-0.5 text-[9px] leading-tight [overflow-wrap:anywhere] border-indigo-300 text-indigo-600 dark:border-indigo-500/40 dark:text-indigo-400">
                        {assignLoad.vehicleCount} vehicle{assignLoad.vehicleCount !== 1 ? "s" : ""}
                      </Badge>
                    )}
                  </div>
                </div>

                {(assignLoad.origin || assignLoad.destination) && (
                  <div className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-start gap-x-1.5 gap-y-1 text-[11px] leading-relaxed text-muted-foreground sm:flex sm:flex-wrap sm:items-center">
                    <MapPin className="mt-0.5 size-3 shrink-0 sm:mt-0" />
                    <span className="min-w-0 break-words [overflow-wrap:anywhere]">
                      {assignLoad.origin || "Origin not provided"}
                    </span>
                    <ArrowRight className="col-start-1 mt-0.5 size-3 shrink-0 sm:col-auto sm:mt-0" />
                    <span className="min-w-0 break-words [overflow-wrap:anywhere]">
                      {assignLoad.destination || "Destination not provided"}
                    </span>
                  </div>
                )}
              </div>
            )}
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
              {filteredDrivers.length === 0 && (
                <div className="flex flex-col items-center justify-center gap-2 px-4 py-8 text-center">
                  <p className="break-words text-xs text-muted-foreground [overflow-wrap:anywhere]">No drivers found</p>
                </div>
              )}

              {filteredDrivers.map((driver) => {
                const eq = driver.equipment;
                const compatibility = assignLoad
                  ? compatibilityByDriverId[driver.id] ??
                    evaluateDriverLoadCompatibility(driver, assignLoad)
                  : null;
                const trailerMatch = compatibility?.trailer.status ?? "unknown";
                const capacityMatch = compatibility?.capacity.status ?? "unknown";
                const availabilityMatch =
                  compatibility?.availability.status ?? "unknown";
                const needsReview =
                  availabilityMatch === "off_schedule" ||
                  capacityMatch !== "match";

                return (
                  <div
                    key={driver.id}
                    className="flex min-w-0 flex-col justify-between gap-3 rounded-xl border border-border/40 p-3 transition-all duration-200 hover:border-primary/30 hover:shadow-sm sm:flex-row sm:items-center"
                  >
                    <div className="flex min-w-0 flex-1 items-start gap-3">
                      <Avatar className="size-10 shrink-0 border-2 border-background shadow-sm">
                        {driver.driver?.avatar && <AvatarImage src={driver.driver.avatar} />}
                        <AvatarFallback className="bg-primary/5 text-xs font-bold text-primary">
                          {driver.driver?.name?.[0]?.toUpperCase() || "?"}
                        </AvatarFallback>
                      </Avatar>

                      <div className="min-w-0 flex-1 space-y-1">
                        <p className="break-words text-sm font-bold [overflow-wrap:anywhere]">
                          {driver.driver?.name || "Unknown"}
                        </p>
                        {driver.driver?.email && (
                          <p className="break-all text-[10px] leading-relaxed text-muted-foreground [overflow-wrap:anywhere]">
                            {driver.driver.email}
                          </p>
                        )}
                        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-muted-foreground">
                          <span>{driver.shipments?.length || 0} load{(driver.shipments?.length || 0) !== 1 ? "s" : ""}</span>
                          {eq?.truckMake && (
                            <span className="min-w-0 break-words [overflow-wrap:anywhere]">
                              {eq.truckMake} {eq.truckModel || ""}
                            </span>
                          )}
                        </div>

                        <div className="flex min-w-0 flex-wrap gap-1">
                          {eq?.trailerType && (
                            <Badge className="min-h-5 h-auto max-w-full whitespace-normal break-words bg-purple-500/10 px-1.5 py-0.5 text-[9px] leading-tight text-purple-600 [overflow-wrap:anywhere] border-purple-200 dark:border-purple-500/30 dark:text-purple-400">
                              <Truck className="mr-0.5 size-2.5 shrink-0" />{trailerLabel(eq.trailerType)}
                            </Badge>
                          )}
                          {eq?.maxVehicleCapacity != null && eq.maxVehicleCapacity > 0 && (
                            <Badge className="min-h-5 h-auto whitespace-normal break-words bg-indigo-500/10 px-1.5 py-0.5 text-[9px] leading-tight text-indigo-600 [overflow-wrap:anywhere] border-indigo-200 dark:border-indigo-500/30 dark:text-indigo-400">
                              Cap: {eq.maxVehicleCapacity}
                            </Badge>
                          )}
                          {availabilityMatch !== "unknown" && (
                            <Badge
                              className={`min-h-5 h-auto whitespace-normal break-words px-1.5 py-0.5 text-[9px] leading-tight [overflow-wrap:anywhere] ${
                                availabilityMatch === "match"
                                  ? "border-emerald-200 bg-emerald-500/10 text-emerald-600 dark:border-emerald-500/30 dark:text-emerald-400"
                                  : "border-amber-200 bg-amber-500/10 text-amber-700 dark:border-amber-500/30 dark:text-amber-400"
                              }`}
                            >
                              {availabilityMatch === "match" ? (
                                <CheckCircle2 className="mr-0.5 size-2.5 shrink-0" />
                              ) : (
                                <AlertTriangle className="mr-0.5 size-2.5 shrink-0" />
                              )}
                              {availabilityMatch === "match"
                                ? `Available ${titleCaseDay(compatibility?.availability.pickupDay) || ""}`.trim()
                                : `Off Schedule ${titleCaseDay(compatibility?.availability.pickupDay) || ""}`.trim()}
                            </Badge>
                          )}
                          {capacityMatch !== "unknown" ? (
                            <Badge className={`min-h-5 h-auto whitespace-normal break-words px-1.5 py-0.5 text-[9px] leading-tight [overflow-wrap:anywhere] ${capacityMatch === "match" ? "border-emerald-200 bg-emerald-500/10 text-emerald-600 dark:border-emerald-500/30 dark:text-emerald-400" : "border-red-200 bg-red-500/10 text-red-600 dark:border-red-500/30 dark:text-red-400"}`}>
                              {capacityMatch === "match" ? <CheckCircle2 className="mr-0.5 size-2.5 shrink-0" /> : <XCircle className="mr-0.5 size-2.5 shrink-0" />}
                              {capacityMatch === "match"
                                ? `Capacity ${compatibility?.capacity.requiredVehicles}/${compatibility?.capacity.maxVehicles}`
                                : `Capacity ${compatibility?.capacity.requiredVehicles}/${compatibility?.capacity.maxVehicles} · Exceeded`}
                            </Badge>
                          ) : (
                            <Badge className="min-h-5 h-auto whitespace-normal break-words border-red-200 bg-red-500/10 px-1.5 py-0.5 text-[9px] leading-tight text-red-600 [overflow-wrap:anywhere] dark:border-red-500/30 dark:text-red-400">
                              <AlertTriangle className="mr-0.5 size-2.5 shrink-0" />Capacity Not Verified
                            </Badge>
                          )}
                          {trailerMatch !== "unknown" && (
                            <Badge className={`min-h-5 h-auto whitespace-normal break-words px-1.5 py-0.5 text-[9px] leading-tight [overflow-wrap:anywhere] ${trailerMatch === "match" ? "border-emerald-200 bg-emerald-500/10 text-emerald-600 dark:border-emerald-500/30 dark:text-emerald-400" : "border-amber-200 bg-amber-500/10 text-amber-700 dark:border-amber-500/30 dark:text-amber-400"}`}>
                              {trailerMatch === "match" ? <CheckCircle2 className="mr-0.5 size-2.5 shrink-0" /> : <AlertTriangle className="mr-0.5 size-2.5 shrink-0" />}
                              Trailer {trailerMatch === "match" ? "Match" : "Mismatch"}
                            </Badge>
                          )}
                          {eq?.isComplianceExpired && (
                            <Badge className="min-h-5 h-auto whitespace-normal break-words border-red-200 bg-red-500/10 px-1.5 py-0.5 text-[9px] leading-tight text-red-600 [overflow-wrap:anywhere] dark:border-red-500/30 dark:text-red-400">
                              <AlertTriangle className="mr-0.5 size-2.5 shrink-0" />Expired
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
                      disabled={assigning !== null}
                      onClick={() => driver.driver?.id && assignLoad && handleAssign(assignLoad, driver.driver.id)}
                    >
                      {assigning === assignLoad?._id ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : needsReview ? (
                        "Review & Assign"
                      ) : (
                        "Assign"
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