"use client";

import * as React from "react";
import { AlertTriangle, CalendarDays, Loader2, Package, ShieldAlert, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { DriverLoadCompatibility } from "@/types/driver-tracking";
import { titleCaseDay } from "@/lib/driver-load-compatibility";

export interface DriverActiveLoadSummary {
  id: string;
  trackingNumber?: string;
  status?: string;
  vehicleCount?: number;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  compatibility: DriverLoadCompatibility | null;
  driverName: string;
  loadLabel: string;
  actionLabel: string;
  activeLoads?: DriverActiveLoadSummary[];
  isSubmitting?: boolean;
  onConfirm: () => void | Promise<void>;
}

export function DriverLoadCompatibilityReviewDialog({
  open,
  onOpenChange,
  compatibility,
  driverName,
  loadLabel,
  actionLabel,
  activeLoads = [],
  isSubmitting = false,
  onConfirm,
}: Props) {
  const availability = compatibility?.availability;
  const capacity = compatibility?.capacity;
  const hasAvailabilityWarning = availability?.status === "off_schedule";
  const hasCapacityWarning = capacity?.status !== "match";
  const normalizedActiveLoads = React.useMemo(
    () =>
      activeLoads.map((load) => ({
        ...load,
        vehicleCount: Number.isFinite(Number(load.vehicleCount))
          ? Math.max(0, Number(load.vehicleCount))
          : 0,
      })),
    [activeLoads],
  );
  const totalActiveVehicles = React.useMemo(
    () =>
      normalizedActiveLoads.reduce(
        (total, load) => total + load.vehicleCount,
        0,
      ),
    [normalizedActiveLoads],
  );
  const hasActiveLoads = normalizedActiveLoads.length > 0;

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!isSubmitting) onOpenChange(nextOpen);
      }}
    >
      <DialogContent
        className="flex h-[calc(100dvh-1rem)] max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] flex-col gap-0 overflow-hidden p-0 sm:h-auto sm:max-h-[calc(100dvh-2rem)] sm:w-[calc(100vw-2rem)] sm:max-w-lg duration-300 ease-out data-[state=closed]:duration-200 data-[state=closed]:ease-in motion-reduce:duration-0"
        overlayClassName="bg-black/70 backdrop-blur-[3px] duration-300 ease-out data-[state=closed]:duration-200 data-[state=closed]:ease-in motion-reduce:duration-0"
      >
        <DialogHeader className="shrink-0 border-b border-border/60 px-4 py-4 text-left sm:px-5">
          <DialogTitle className="flex items-start gap-2 pr-7 text-base font-black sm:text-lg">
            <ShieldAlert className="mt-0.5 size-5 shrink-0 text-amber-500" />
            <span className="min-w-0 break-words [overflow-wrap:anywhere]">
              Review Driver Compatibility
            </span>
          </DialogTitle>
          <DialogDescription className="break-words text-xs leading-relaxed [overflow-wrap:anywhere] sm:text-sm">
            {driverName} can still be assigned by Dispatch, but this load has one or more compatibility warnings that require an explicit override.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5">
          <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Assignment
            </p>
            <p className="mt-1 break-all text-sm font-black [overflow-wrap:anywhere]">
              {loadLabel}
            </p>
            <p className="mt-0.5 break-words text-xs text-muted-foreground [overflow-wrap:anywhere]">
              Driver: {driverName}
            </p>
          </div>

          {hasActiveLoads && (
            <div className="rounded-xl border border-sky-500/25 bg-sky-500/5 p-3.5">
              <div className="flex items-start gap-3">
                <Package className="mt-0.5 size-4 shrink-0 text-sky-500" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-bold text-sky-800 dark:text-sky-300">
                        Current Driver Workload
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {normalizedActiveLoads.length} active load{normalizedActiveLoads.length === 1 ? "" : "s"} · {totalActiveVehicles} vehicle{totalActiveVehicles === 1 ? "" : "s"} across those loads
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 max-h-36 space-y-2 overflow-y-auto overscroll-contain pr-1">
                    {normalizedActiveLoads.map((load) => (
                      <div
                        key={load.id}
                        className="flex items-center justify-between gap-3 rounded-lg border border-border/50 bg-background/50 px-3 py-2"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-xs font-bold">
                            {load.trackingNumber || load.id}
                          </p>
                          <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                            {load.status || "Active load"}
                          </p>
                        </div>
                        <span className="shrink-0 text-xs font-semibold text-foreground/80">
                          {load.vehicleCount} vehicle{load.vehicleCount === 1 ? "" : "s"}
                        </span>
                      </div>
                    ))}
                  </div>

                  <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
                    For dispatch awareness only. Vehicle capacity is checked per load; vehicles on existing loads are not subtracted from the driver's configured per-load capacity.
                  </p>
                </div>
              </div>
            </div>
          )}

          {hasAvailabilityWarning && (
            <div className="flex items-start gap-3 rounded-xl border border-amber-500/25 bg-amber-500/5 p-3.5">
              <CalendarDays className="mt-0.5 size-4 shrink-0 text-amber-500" />
              <div className="min-w-0">
                <p className="break-words text-sm font-bold text-amber-800 [overflow-wrap:anywhere] dark:text-amber-300">
                  Outside Regular Availability
                </p>
                <p className="mt-1 break-words text-xs leading-relaxed text-muted-foreground [overflow-wrap:anywhere]">
                  The pickup falls on {titleCaseDay(availability?.pickupDay) || "a day outside the configured schedule"}. Dispatch can continue if the driver has agreed to work outside their normal schedule.
                </p>
              </div>
            </div>
          )}

          {hasCapacityWarning && (
            <div className="flex items-start gap-3 rounded-xl border border-red-500/25 bg-red-500/5 p-3.5">
              <Truck className="mt-0.5 size-4 shrink-0 text-red-500" />
              <div className="min-w-0">
                <p className="break-words text-sm font-bold text-red-700 [overflow-wrap:anywhere] dark:text-red-400">
                  {capacity?.status === "exceeded"
                    ? "Vehicle Capacity Exceeded"
                    : "Vehicle Capacity Not Verified"}
                </p>
                <p className="mt-1 break-words text-xs leading-relaxed text-muted-foreground [overflow-wrap:anywhere]">
                  {capacity?.status === "exceeded"
                    ? `This load requires ${capacity.requiredVehicles} vehicle${capacity.requiredVehicles === 1 ? "" : "s"}, while the driver's configured capacity is ${capacity.maxVehicles}. Verify the equipment before overriding.`
                    : "The driver's equipment capacity could not be verified. Confirm the current equipment before overriding this warning."}
                </p>
              </div>
            </div>
          )}

          <div className="flex items-start gap-2 rounded-xl border border-border/60 bg-muted/15 p-3">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <p className="break-words text-xs leading-relaxed text-muted-foreground [overflow-wrap:anywhere]">
              This override affects only this assignment. It does not change the driver's saved work days, equipment capacity, Dispatch Status, GPS policy, or any existing load.
            </p>
          </div>
        </div>

        <DialogFooter className="shrink-0 border-t border-border/60 px-4 py-3 sm:px-5">
          <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2">
            <Button
              type="button"
              variant="outline"
              className="h-10"
              disabled={isSubmitting}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="h-10 gap-2 font-bold"
              disabled={isSubmitting}
              onClick={() => void onConfirm()}
            >
              {isSubmitting && <Loader2 className="size-4 animate-spin" />}
              {isSubmitting ? "Applying Override..." : actionLabel}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}