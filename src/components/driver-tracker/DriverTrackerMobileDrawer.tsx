"use client";

import * as React from "react";
import {
  AlertTriangle,
  Bell,
  ChevronLeft,
  ChevronRight,
  FileCheck2,
  MapPin,
  Package,
  Route,
  Truck,
  UserPlus,
  Wifi,
  WifiOff,
  X,
} from "lucide-react";

import { DispatchChatInlinePane } from "@/components/suprah-mail/DispatchChatInlinePane";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type {
  DriverOperationalStatus,
  DriverStatus,
  DriverTrackingItem,
} from "@/types/driver-tracking";
import { trailerTypeOptions } from "@/components/driver-profile/driver-profile-constants";

export type DriverTrackerMobileDrawerTab = "overview" | "chat" | "loads";

interface DriverTrackerMobileDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  driver: DriverTrackingItem | null;
  activeTab: DriverTrackerMobileDrawerTab;
  onActiveTabChange: (tab: DriverTrackerMobileDrawerTab) => void;
  statusLabel: Record<DriverStatus, string>;
  unreadMessageCount?: number;
  onAlertDriver?: (driver: DriverTrackingItem) => void;
  onAssignLoad?: (driver: DriverTrackingItem) => void;
  onViewCompliance?: (driver: DriverTrackingItem) => void;
  onViewStatusRequest?: (driver: DriverTrackingItem) => void;
  onLocateDriver?: (driver: DriverTrackingItem) => void;
  onOpenLoadManagement?: (driver: DriverTrackingItem) => void;
  onUnreadRefresh?: (driverId: string) => void | Promise<void>;
  onReviewLoadRequest?: (loadId: string, driverId: string) => void;
}

const OP_LABEL: Record<DriverOperationalStatus, string> = {
  active: "Active",
  on_leave: "On Leave",
  maintenance: "In Shop",
};

const trailerLabel = (value?: string) =>
  trailerTypeOptions.find((option) => option.value === value)?.label ??
  value ??
  "Not provided";

function formatMountainTime(value: string | Date | null | undefined) {
  if (!value) return "Never";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Never";
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Denver",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function statusTone(status: DriverStatus) {
  switch (status) {
    case "on-route":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
    case "waiting":
      return "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300";
    case "idle":
      return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300";
    case "on-break":
      return "border-slate-500/30 bg-slate-500/10 text-slate-700 dark:text-slate-300";
    default:
      return "border-slate-500/30 bg-slate-500/10 text-slate-600 dark:text-slate-400";
  }
}

function availabilityTone(status: DriverOperationalStatus) {
  if (status === "active") {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  }
  if (status === "on_leave") {
    return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300";
  }
  return "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300";
}

function InfoTile({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="min-w-0 rounded-xl border border-border/55 bg-muted/[0.12] p-2.5">
      <p className="text-[9px] font-black uppercase tracking-[0.11em] text-muted-foreground">
        {label}
      </p>
      <div className="mt-1 break-words text-[13px] font-bold [overflow-wrap:anywhere]">
        {value}
      </div>
    </div>
  );
}

export function DriverTrackerMobileDrawer({
  open,
  onOpenChange,
  driver,
  activeTab,
  onActiveTabChange,
  statusLabel,
  unreadMessageCount = 0,
  onAlertDriver,
  onAssignLoad,
  onViewCompliance,
  onViewStatusRequest,
  onLocateDriver,
  onOpenLoadManagement,
  onUnreadRefresh,
  onReviewLoadRequest,
}: DriverTrackerMobileDrawerProps) {
  const operationalStatus =
    driver?.equipment?.operationalStatus ?? ("active" as DriverOperationalStatus);
  const shipments = driver?.shipments ?? [];
  const driverId = driver?.driver?.id ?? driver?.id ?? "";
  const driverName = driver?.driver?.name || "Driver";

  const inlineDriver = React.useMemo(() => {
    if (!driver || !driverId) return null;
    return {
      id: driverId,
      name: driverName,
      email: driver.driver?.email || undefined,
      avatar: driver.driver?.avatar ?? null,
      status: driver.status,
      isSharing: driver.isSharing,
      activeLoadCount: shipments.length,
      shipments: shipments.map((shipment) => ({
        id: shipment.id,
        trackingNumber: shipment.trackingNumber || shipment.id,
        status: shipment.status || "Active",
        origin: shipment.origin || "",
        destination: shipment.destination || "",
        vehicleCount: Math.max(0, Number(shipment.vehicleCount ?? 0)),
      })),
    };
  }, [driver, driverId, driverName, shipments]);

  const request = driver?.statusRequest ?? null;
  const requestIsEmergency = request?.priority === "emergency";
  const requestNeedsAttention = Boolean(request);

  const handleUnreadRefresh = React.useCallback(() => {
    return onUnreadRefresh?.(driverId);
  }, [driverId, onUnreadRefresh]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className="@container z-[70] h-dvh w-full max-w-none gap-0 overflow-hidden border-l border-border/70 p-0 pb-[env(safe-area-inset-bottom)] md:w-[94vw] md:max-w-[28rem] md:pb-0"
      >
        <div className="flex h-11 shrink-0 items-center justify-between border-b border-border/60 bg-background px-2">
          <SheetClose asChild>
            <Button
              type="button"
              variant="ghost"
              className="h-8 gap-1.5 px-2 text-xs font-bold"
              aria-label="Back to Driver Tracker"
            >
              <ChevronLeft className="size-4" />
              Back
            </Button>
          </SheetClose>

          <SheetClose asChild>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="size-8 shrink-0"
              aria-label="Close driver workspace"
            >
              <X className="size-4" />
            </Button>
          </SheetClose>
        </div>

        {driver && (
          <>
            <SheetHeader className="relative shrink-0 border-b border-border/60 bg-linear-to-b from-primary/[0.07] via-primary/[0.025] to-background px-3 pb-2.5 pt-3 text-left">
              <div className="flex min-w-0 items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="relative shrink-0">
                  <Avatar className="size-10 border-2 border-background shadow-sm">
                    {driver.driver?.avatar && (
                      <AvatarImage
                        src={driver.driver.avatar}
                        alt={driverName}
                        className="object-cover"
                      />
                    )}
                    <AvatarFallback className="bg-primary/10 text-sm font-black text-primary">
                      {driverName.slice(0, 1).toUpperCase() || "D"}
                    </AvatarFallback>
                  </Avatar>
                  <span
                    className={`absolute -bottom-0.5 -right-0.5 size-3.5 rounded-full border-2 border-background ${
                      driver.status === "on-route"
                        ? "bg-emerald-500"
                        : driver.status === "waiting"
                          ? "bg-blue-500"
                          : driver.status === "idle"
                            ? "bg-amber-500"
                            : "bg-slate-400"
                    }`}
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="mb-1 text-[9px] font-black uppercase tracking-[0.16em] text-primary/80">
                    Suprah Driver Workspace
                  </p>
                  <SheetTitle className="break-words text-[17px] font-black leading-tight [overflow-wrap:anywhere]">
                    {driverName}
                  </SheetTitle>
                  <SheetDescription className="mt-1 break-all text-xs leading-relaxed [overflow-wrap:anywhere]">
                    {driver.driver?.email || "Driver operational workspace"}
                  </SheetDescription>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    <Badge
                      variant="outline"
                      className={`h-auto whitespace-normal px-2 py-1 text-[10px] font-bold ${availabilityTone(
                        operationalStatus,
                      )}`}
                    >
                      {OP_LABEL[operationalStatus]}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={`h-auto whitespace-normal px-2 py-1 text-[10px] font-bold ${statusTone(
                        driver.status,
                      )}`}
                    >
                      {statusLabel[driver.status]}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={`h-auto gap-1 whitespace-normal px-2 py-1 text-[10px] font-bold ${
                        driver.isSharing
                          ? "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300"
                          : "border-slate-500/30 bg-slate-500/10 text-slate-600 dark:text-slate-400"
                      }`}
                    >
                      {driver.isSharing ? (
                        <Wifi className="size-3" />
                      ) : (
                        <WifiOff className="size-3" />
                      )}
                      {driver.isSharing ? "GPS Sharing" : "GPS Not Sharing"}
                    </Badge>
                  </div>
                </div>
              </div>

                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  className="relative mt-0.5 size-10 shrink-0 touch-manipulation border-amber-500/30 bg-amber-500/[0.04] text-amber-700 hover:bg-amber-500/10 focus-visible:ring-2 focus-visible:ring-amber-500/40 dark:text-amber-300"
                  aria-label={`Alert ${driverName}`}
                  onClick={() => onAlertDriver?.(driver)}
                >
                  <Bell className="size-4" />
                </Button>
              </div>
            </SheetHeader>

            <div className="shrink-0 border-b border-border/50 px-2.5 py-2">
              <div className="grid grid-cols-2 gap-1.5">
                <Button
                  type="button"
                  variant={driver.assignable ? "default" : "outline"}
                  className={`h-auto min-h-10 min-w-0 justify-start gap-1.5 px-3 py-2 text-xs font-black ${
                    driver.assignable
                      ? "shadow-sm"
                      : "text-muted-foreground"
                  }`}
                  disabled={!driver.assignable}
                  onClick={() => driver.assignable && onAssignLoad?.(driver)}
                >
                  <UserPlus className="size-4 shrink-0" />
                  <span className="min-w-0 break-words text-left leading-tight [overflow-wrap:anywhere]">
                    {driver.assignable ? "Assign Load" : "Unavailable for Assignment"}
                  </span>
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  className={`h-auto min-h-10 min-w-0 justify-start gap-1.5 px-3 py-2 text-xs font-bold ${
                    driver.equipment?.isComplianceExpired
                      ? "border-red-500/35 bg-red-500/[0.05] text-red-700 hover:bg-red-500/10 dark:text-red-300"
                      : "border-border/60 hover:border-primary/25 hover:bg-primary/[0.04]"
                  }`}
                  onClick={() => onViewCompliance?.(driver)}
                >
                  <FileCheck2 className="size-4 shrink-0" />
                  <span className="min-w-0 break-words text-left leading-tight [overflow-wrap:anywhere]">
                    Driver Review Center
                  </span>
                </Button>
              </div>

              {requestNeedsAttention && (
                <Button
                  type="button"
                  variant="outline"
                  className={`mt-1.5 h-auto min-h-10 w-full justify-between gap-2 whitespace-normal px-3 py-2 text-left ${
                    requestIsEmergency
                      ? "border-red-500/35 bg-red-500/[0.06] text-red-700 hover:bg-red-500/10 dark:text-red-300"
                      : "border-amber-500/35 bg-amber-500/[0.06] text-amber-700 hover:bg-amber-500/10 dark:text-amber-300"
                  }`}
                  onClick={() => onViewStatusRequest?.(driver)}
                >
                  <span className="flex min-w-0 items-start gap-2">
                    <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                    <span className="min-w-0 break-words text-xs font-bold [overflow-wrap:anywhere]">
                      {requestIsEmergency
                        ? "Emergency work availability request"
                        : request?.status === "approved_awaiting_reassignment"
                          ? "Approved — awaiting reassignment"
                          : "Work availability request pending"}
                    </span>
                  </span>
                  <ChevronRight className="size-4 shrink-0" />
                </Button>
              )}
            </div>
          </>
        )}

        <div className="shrink-0 border-b border-border/50 bg-background px-2.5 py-1.5">
          <div
            className="grid min-w-0 grid-cols-3 gap-1 rounded-xl border border-border/40 bg-muted/25 p-1"
            role="tablist"
            aria-label="Driver workspace sections"
          >
            {(
              [
                { tab: "overview", label: "Overview" },
                { tab: "chat", label: "Chat" },
                { tab: "loads", label: "Assigned Loads" },
              ] as const
            ).map(({ tab, label }) => {
              const isActive = activeTab === tab;
              const count =
                tab === "loads"
                  ? shipments.length
                  : tab === "chat" && unreadMessageCount > 0
                    ? unreadMessageCount
                    : null;

              return (
                <button
                  key={tab}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => onActiveTabChange(tab)}
                  className={`relative flex min-h-11 min-w-0 items-center justify-center gap-1 rounded-lg border px-1.5 py-1 text-[10px] font-black transition-[background-color,border-color,color,box-shadow] xs:px-2 xs:text-[11px] ${
                    isActive
                      ? "border-primary/25 bg-primary/10 text-primary shadow-sm"
                      : "border-transparent text-muted-foreground hover:border-border/45 hover:bg-background/60 hover:text-foreground"
                  }`}
                >
                  <span className="min-w-0 text-center leading-tight">{label}</span>

                  {count !== null && (
                    <span
                      className={`flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full px-1 text-[8px] font-black leading-none ${
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {count > 99 ? "99+" : count}
                    </span>
                  )}

                  <span
                    aria-hidden="true"
                    className={`absolute inset-x-2 bottom-0 h-0.5 rounded-full transition-opacity ${
                      isActive ? "bg-primary opacity-100" : "opacity-0"
                    }`}
                  />
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden">
          {!driver ? (
            <div className="flex h-full items-center justify-center px-6 text-center text-sm text-muted-foreground">
              Select a driver to open the mobile workspace.
            </div>
          ) : activeTab === "chat" && inlineDriver ? (
            <DispatchChatInlinePane
              driver={inlineDriver}
              onBack={() => onActiveTabChange("overview")}
              onUnreadRefresh={handleUnreadRefresh}
              onReviewLoadRequest={onReviewLoadRequest}
            />
          ) : activeTab === "loads" ? (
            <div className="modal-scrollbar flex h-full min-h-0 min-w-0 w-full flex-1 flex-col overflow-y-auto overscroll-contain px-2.5 py-2.5">
              <div className="sticky top-0 z-10 -mx-2.5 mb-2 flex items-center justify-between gap-2 border-b border-border/45 bg-background/95 px-2.5 pb-2 backdrop-blur">
                <div className="min-w-0">
                  <p className="text-sm font-black">Assigned Loads</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {shipments.length} assigned load{shipments.length === 1 ? "" : "s"}
                  </p>
                </div>
                {onOpenLoadManagement && (
                  <Button
                    type="button"
                    size="sm"
                    className="h-9 shrink-0 gap-1.5 px-3 text-xs font-black"
                    onClick={() => onOpenLoadManagement(driver)}
                  >
                    <Package className="size-3.5" />
                    Manage
                  </Button>
                )}
              </div>

              {shipments.length === 0 ? (
                <div className="flex min-h-52 flex-col items-center justify-center rounded-2xl border border-dashed border-border/60 px-6 text-center">
                  <Package className="size-8 text-muted-foreground/35" />
                  <p className="mt-3 text-sm font-black">No active loads</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    Assign a load when this driver is eligible for new work.
                  </p>
                </div>
              ) : (
                <div className="w-full space-y-2.5">
                  {shipments.map((shipment) => (
                    <div
                      key={shipment.id}
                      className="w-full rounded-xl border border-border/55 bg-muted/[0.10] p-3"
                    >
                      <div className="flex min-w-0 items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-[9px] font-black uppercase tracking-[0.12em] text-primary/75">
                            Assigned Load
                          </p>
                          <p className="mt-1 break-all text-sm font-black [overflow-wrap:anywhere]">
                            {shipment.trackingNumber || shipment.id}
                          </p>
                        </div>

                        <div className="flex shrink-0 flex-col items-end gap-1">
                          {shipment.status && (
                            <Badge
                              variant="outline"
                              className="h-auto max-w-[8rem] whitespace-normal border-primary/20 bg-primary/[0.06] px-2 py-0.5 text-right text-[9px] font-black leading-tight text-primary"
                            >
                              {shipment.status}
                            </Badge>
                          )}
                          <Badge
                            variant="outline"
                            className="h-auto shrink-0 px-2 py-0.5 text-[9px] font-bold"
                          >
                            {Math.max(0, Number(shipment.vehicleCount ?? 0))} vehicle
                            {Number(shipment.vehicleCount ?? 0) === 1 ? "" : "s"}
                          </Badge>
                        </div>
                      </div>

                      <div className="mt-2.5 grid min-w-0 grid-cols-[minmax(0,1.25fr)_minmax(7.25rem,0.75fr)] gap-2 max-[360px]:grid-cols-1">
                        <div className="min-w-0 rounded-lg border border-border/45 bg-background/35 p-2.5">
                          <p className="mb-2 text-[9px] font-black uppercase tracking-[0.12em] text-muted-foreground">
                            Route
                          </p>

                          <div className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-x-2 gap-y-2 text-[11px] text-muted-foreground">
                            <MapPin className="mt-0.5 size-3.5 shrink-0 text-emerald-500" />
                            <div className="min-w-0">
                              <p className="text-[9px] font-black uppercase tracking-[0.08em] text-muted-foreground/70">
                                Pickup
                              </p>
                              <p className="mt-0.5 break-words font-semibold text-foreground [overflow-wrap:anywhere]">
                                {shipment.origin || "Origin not provided"}
                              </p>
                            </div>

                            <Route className="mt-0.5 size-3.5 shrink-0 text-blue-500" />
                            <div className="min-w-0">
                              <p className="text-[9px] font-black uppercase tracking-[0.08em] text-muted-foreground/70">
                                Delivery
                              </p>
                              <p className="mt-0.5 break-words font-semibold text-foreground [overflow-wrap:anywhere]">
                                {shipment.destination || "Destination not provided"}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="min-w-0 rounded-lg border border-border/45 bg-background/35 p-2.5">
                          <p className="text-[9px] font-black uppercase tracking-[0.12em] text-muted-foreground">
                            Dispatch Details
                          </p>

                          <div className="mt-2 space-y-2">
                            <div className="min-w-0">
                              <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-muted-foreground/70">
                                Pickup Schedule
                              </p>
                              <p className="mt-0.5 break-words text-[11px] font-bold text-foreground [overflow-wrap:anywhere]">
                                {shipment.pickupDate
                                  ? formatMountainTime(shipment.pickupDate)
                                  : "Not scheduled"}
                              </p>
                            </div>

                            <div className="border-t border-border/40 pt-2">
                              <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-muted-foreground/70">
                                Trailer
                              </p>
                              <p className="mt-0.5 break-words text-[11px] font-bold text-foreground [overflow-wrap:anywhere]">
                                {shipment.trailerType
                                  ? trailerLabel(shipment.trailerType)
                                  : "Not specified"}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {shipment.releaseRequest?.status === "pending" && (
                        <div className="mt-2.5 flex items-start gap-2 rounded-lg border border-amber-500/25 bg-amber-500/[0.06] p-2.5 text-xs text-amber-800 dark:text-amber-300">
                          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                          <span className="break-words [overflow-wrap:anywhere]">
                            Driver release request is pending dispatch review.
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="modal-scrollbar flex h-full min-h-0 min-w-0 w-full flex-1 flex-col overflow-y-auto overscroll-contain px-2.5 py-2.5">
              <div className="grid grid-cols-2 gap-1.5">
                <InfoTile
                  label="Work Availability"
                  value={OP_LABEL[operationalStatus]}
                />
                <InfoTile
                  label="Current Activity"
                  value={statusLabel[driver.status]}
                />
                <InfoTile
                  label="GPS"
                  value={driver.isSharing ? "Sharing" : "Not Sharing"}
                />
                <InfoTile
                  label="Last Seen"
                  value={formatMountainTime(driver.lastSeenAt)}
                />
              </div>

              {(driver.coords && onLocateDriver) || onOpenLoadManagement ? (
                <div className="mt-2 grid grid-cols-2 gap-1.5">
                  {driver.coords && onLocateDriver ? (
                    <Button
                      type="button"
                      variant="outline"
                      className="h-10 min-w-0 justify-start gap-1.5 px-2.5 text-[11px] font-bold"
                      onClick={() => onLocateDriver(driver)}
                    >
                      <MapPin className="size-3.5 shrink-0 text-blue-500" />
                      <span className="min-w-0 break-words text-left leading-tight [overflow-wrap:anywhere]">
                        Live Map
                      </span>
                    </Button>
                  ) : (
                    <div />
                  )}

                  {onOpenLoadManagement ? (
                    <Button
                      type="button"
                      className="h-10 min-w-0 justify-start gap-1.5 px-2.5 text-[11px] font-black"
                      onClick={() => onOpenLoadManagement(driver)}
                    >
                      <Package className="size-3.5 shrink-0" />
                      <span className="min-w-0 break-words text-left leading-tight [overflow-wrap:anywhere]">
                        Load Management
                      </span>
                    </Button>
                  ) : (
                    <div />
                  )}
                </div>
              ) : null}

              <div className="mt-2.5 rounded-2xl border border-border/55 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-black">Dispatch Snapshot</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Equipment and assignment readiness
                    </p>
                  </div>
                  <Truck className="size-5 shrink-0 text-primary" />
                </div>

                <div className="mt-2.5 grid grid-cols-2 gap-1.5 text-xs">
                  <InfoTile
                    label="Truck"
                    value={
                      [driver.equipment?.truckMake, driver.equipment?.truckModel]
                        .filter(Boolean)
                        .join(" ") || "Not provided"
                    }
                  />
                  <InfoTile
                    label="Trailer"
                    value={trailerLabel(driver.equipment?.trailerType)}
                  />
                  <InfoTile
                    label="Capacity / Load"
                    value={
                      driver.equipment?.maxVehicleCapacity != null
                        ? `${driver.equipment.maxVehicleCapacity} vehicle${
                            driver.equipment.maxVehicleCapacity === 1 ? "" : "s"
                          }`
                        : "Not verified"
                    }
                  />
                  <InfoTile
                    label="Assignment Eligibility"
                    value={driver.assignable ? "Eligible" : "Unavailable"}
                  />
                </div>

                {driver.equipment?.profileCompletionScore != null && (
                  <div className="mt-2.5 rounded-xl border border-border/45 bg-muted/[0.10] p-2.5">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-bold text-muted-foreground">
                        Profile completion
                      </span>
                      <span className="font-black">
                        {driver.equipment.profileCompletionScore}%
                      </span>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-border/50">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{
                          width: `${Math.max(
                            0,
                            Math.min(100, driver.equipment.profileCompletionScore),
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {(driver.driver?.phone || driver.logistics?.homeBase?.city) && (
                <div className="mt-2.5 rounded-2xl border border-border/55 p-3">
                  <p className="text-sm font-black">Contact & Service Area</p>
                  <div className="mt-3 space-y-2 text-xs">
                    {driver.driver?.phone && (
                      <div className="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-2">
                        <span className="font-bold text-muted-foreground">Phone</span>
                        <span className="break-all font-semibold [overflow-wrap:anywhere]">
                          {driver.driver.phone}
                        </span>
                      </div>
                    )}
                    {driver.logistics?.homeBase?.city && (
                      <div className="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-2">
                        <span className="font-bold text-muted-foreground">Home base</span>
                        <span className="break-words font-semibold [overflow-wrap:anywhere]">
                          {[driver.logistics.homeBase.city, driver.logistics.homeBase.state]
                            .filter(Boolean)
                            .join(", ")}
                        </span>
                      </div>
                    )}
                    {driver.logistics?.serviceRadiusMiles != null && (
                      <div className="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-2">
                        <span className="font-bold text-muted-foreground">Service radius</span>
                        <span className="font-semibold">
                          {driver.logistics.serviceRadiusMiles} miles
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {driver.warnings.length > 0 && (
                <div className="mt-2.5 rounded-2xl border border-amber-500/25 bg-amber-500/[0.05] p-3">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-500" />
                    <div className="min-w-0">
                      <p className="text-sm font-black text-amber-800 dark:text-amber-300">
                        Dispatch Notes
                      </p>
                      <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-muted-foreground">
                        {driver.warnings.map((warning, index) => (
                          <li
                            key={`${warning}:${index}`}
                            className="break-words [overflow-wrap:anywhere]"
                          >
                            • {warning}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}


            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}