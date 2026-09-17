"use client";

import * as React from "react";
import { driverAttentionReasons, relativeLocationTime } from "@/lib/driver-tracker-mobile";
import { trackingState, formatTrackingTime } from "@/lib/driver-tracking-view";
import {
  Package,
  Clock,
  UserPlus,
  Users,
  Truck,
  Search,
  Wifi,
  WifiOff,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  ChevronLeft,
  Bell,
  MessageSquare,
  FileCheck2,
} from "lucide-react";
import { trailerTypeOptions } from "@/components/driver-profile/driver-profile-constants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { LayoutGrid } from "lucide-react";
import { DriverTrackingItem, DriverStatus, DriverOperationalStatus } from "@/types/driver-tracking";


type OperationalFilter = "all" | "active" | "on_leave" | "maintenance";
type ActiveSubFilter = "all" | DriverStatus;
type GpsFilter = "all" | "sharing" | "not-sharing";

interface DriverTrackerListCardProps {
  drivers: DriverTrackingItem[];
  attentionOnly?: boolean;
  onAttentionOnlyChange?: (value: boolean) => void;
  pendingRequestDriverIds?: string[];
  selectedDriverId?: string | null;
  trackingNow?: number;
  isLoading: boolean;
  error: string | null;
  onRetry?: () => void;
  statusLabel: Record<DriverStatus, string>;
  statusStyles: Record<DriverStatus, string>;
  statusText: Record<DriverStatus, string>;
  onAssignLoad?: (driver: DriverTrackingItem) => void;
  onDriverClick?: (driver: DriverTrackingItem) => void;
  onOpenDriver?: (driver: DriverTrackingItem, tab?: "overview" | "chat" | "loads") => void;
  onAlertDriver?: (driver: DriverTrackingItem) => void;
  onMessageDriver?: (driver: DriverTrackingItem) => void;
  onViewCompliance?: (driver: DriverTrackingItem) => void;
  onViewStatusRequest?: (driver: DriverTrackingItem) => void;
  unreadMessageCounts?: Record<string, number>;
}

const trailerLabel = (val?: string) =>
  trailerTypeOptions.find((t) => t.value === val)?.label ?? val ?? "Unknown";

const opStatusOf = (driver: DriverTrackingItem): DriverOperationalStatus =>
  driver.equipment?.operationalStatus ?? "active";

const OP_LABEL: Record<DriverOperationalStatus, string> = {
  active: "Active",
  on_leave: "On Leave",
  maintenance: "In Shop",
};

// Work Availability and Current Activity are intentionally separate concepts.
// A driver can remain Work Availability: Active while Current Activity is
// Offline; GPS sharing is shown independently as a third signal.
const isWorkAvailable = (driver: DriverTrackingItem) =>
  opStatusOf(driver) === "active";

const workAvailabilityLabelOf = (driver: DriverTrackingItem) =>
  OP_LABEL[opStatusOf(driver)];

export function DriverTrackerListCard({
  drivers,
  attentionOnly = false,
  onAttentionOnlyChange,
  pendingRequestDriverIds = [],
  selectedDriverId,
  trackingNow = Date.now(),
  isLoading,
  error,
  onRetry,
  statusLabel,
  statusStyles,
  statusText,
  onAssignLoad,
  onDriverClick,
  onOpenDriver,
  onAlertDriver,
  onMessageDriver,
  onViewCompliance,
  onViewStatusRequest,
  unreadMessageCounts = {},
}: DriverTrackerListCardProps) {
  const activeFiltersId = React.useId();
  const [operationalFilter, setOperationalFilter] = React.useState<OperationalFilter>("all");
  const [activeSubFilter, setActiveSubFilter] = React.useState<ActiveSubFilter>("all");
  const [gpsFilter, setGpsFilter] = React.useState<GpsFilter>("all");
  const [query, setQuery] = React.useState("");
  const [expandedId, setExpandedId] = React.useState<string | null>(null);
  const [selectedAssignmentIds, setSelectedAssignmentIds] = React.useState<Record<string, string>>({});
  const listScrollRef = React.useRef<HTMLDivElement | null>(null);
  React.useEffect(() => {
    if (!selectedDriverId) return;
    if (!window.matchMedia("(min-width: 768px)").matches) return;
    const frame = requestAnimationFrame(() => {
      const list = listScrollRef.current;
      const card = Array.from(list?.querySelectorAll<HTMLElement>("[data-driver-card]") ?? []).find(el => el.dataset.driverCard === selectedDriverId);
      if (list && card) list.scrollTop += card.getBoundingClientRect().top - list.getBoundingClientRect().top;
    });
    return () => cancelAnimationFrame(frame);
  }, [selectedDriverId]);

  React.useEffect(() => {
    if (!expandedId) return;

    const frame = window.requestAnimationFrame(() => {
      listScrollRef.current?.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [expandedId]);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    const originalOrder = new Map(
      drivers.map((driver, index) => [driver.id, index]),
    );

    return drivers
      .filter((d) => {
        if (attentionOnly && driverAttentionReasons(d, trackingNow, pendingRequestDriverIds).length === 0) return false;
        const opStatus = opStatusOf(d);
        if (operationalFilter === "active" && !isWorkAvailable(d)) return false;
        if (
          operationalFilter !== "all" &&
          operationalFilter !== "active" &&
          opStatus !== operationalFilter
        ) return false;
        if (
          operationalFilter === "active" &&
          activeSubFilter !== "all" &&
          d.status !== activeSubFilter
        ) return false;
        if (gpsFilter === "sharing" && trackingState(d, trackingNow).kind !== "live") return false;
        if (gpsFilter === "not-sharing" && trackingState(d, trackingNow).kind === "live") return false;
        if (!q) return true;

        const name = d.driver?.name?.toLowerCase() || "";
        const email = d.driver?.email?.toLowerCase() || "";
        const tracking =
          d.shipments?.map((shipment) => shipment.trackingNumber?.toLowerCase() || "").join(" ") || "";
        return name.includes(q) || email.includes(q) || tracking.includes(q);
      })
      .sort((a, b) => {
        if (a.id === expandedId && b.id !== expandedId) return -1;
        if (b.id === expandedId && a.id !== expandedId) return 1;

        const attentionRank = (driver: DriverTrackingItem) =>
          driver.statusRequest?.priority === "emergency"
            ? 0
            : driver.statusRequest?.status === "approved_awaiting_reassignment"
              ? 1
              : 2;
        const aAttention = attentionRank(a);
        const bAttention = attentionRank(b);
        if (aAttention !== bAttention) return aAttention - bAttention;

        if (a.assignable !== b.assignable) return a.assignable ? -1 : 1;
        const aSharing = trackingState(a, trackingNow).kind === "live" ? 0 : 1;
        const bSharing = trackingState(b, trackingNow).kind === "live" ? 0 : 1;
        if (aSharing !== bSharing) return aSharing - bSharing;
        return (originalOrder.get(a.id) ?? Number.MAX_SAFE_INTEGER) -
          (originalOrder.get(b.id) ?? Number.MAX_SAFE_INTEGER);
      });
  }, [drivers, operationalFilter, activeSubFilter, gpsFilter, query, expandedId, trackingNow, attentionOnly, pendingRequestDriverIds]);

  const counts = React.useMemo(() => {
    const activeDrivers = drivers.filter(isWorkAvailable);
    return {
      all: drivers.length,
      active: activeDrivers.length,
      on_leave: drivers.filter((driver) => opStatusOf(driver) === "on_leave").length,
      maintenance: drivers.filter((driver) => opStatusOf(driver) === "maintenance").length,
      sharing: drivers.filter((driver) => trackingState(driver, trackingNow).kind === "live").length,
      notSharing: drivers.filter((driver) => trackingState(driver, trackingNow).kind !== "live").length,
      activeStatus: {
        "on-route": activeDrivers.filter((driver) => driver.status === "on-route").length,
        idle: activeDrivers.filter((driver) => driver.status === "idle").length,
        waiting: activeDrivers.filter((driver) => driver.status === "waiting").length,
        "on-break": activeDrivers.filter((driver) => driver.status === "on-break").length,
        offline: activeDrivers.filter((driver) => driver.status === "offline").length,
      } as Record<DriverStatus, number>,
    };
  }, [drivers, trackingNow]);

  return (
    <Card className="flex h-auto min-h-0 max-h-none w-full min-w-0 flex-col gap-0 overflow-hidden rounded-none border-x-0 border-border/50 p-0 shadow-sm md:h-120 md:min-h-80 md:max-h-120 md:rounded-xl md:border-x lg:h-150 lg:max-h-none xl:absolute xl:inset-0 xl:h-full xl:min-h-0 xl:max-h-none">
      <CardHeader className="border-b border-border/30 px-3 py-3 shrink-0 space-y-2.5 sm:px-5 sm:py-4 sm:space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base font-black sm:text-lg">
              <Users className="size-5 text-primary" />
              <span>Driver Directory</span>
            </CardTitle>
            <p className="mt-0.5 text-xs font-medium text-muted-foreground/80 sm:mt-1 sm:text-sm">
              {filtered.length} of {drivers.length} driver
              {drivers.length !== 1 ? "s" : ""}
            </p>
          </div>
          <Badge
            variant="secondary"
            className="h-6 gap-1 px-2 text-[10px] font-bold bg-blue-500/10 text-blue-600 sm:h-7 sm:gap-1.5 sm:px-2.5 sm:text-xs"
          >
            <Wifi className="size-3.5" />
            {counts.sharing} Fresh GPS
          </Badge>
        </div>

        {onAttentionOnlyChange && <Button type="button" variant="outline" aria-pressed={attentionOnly} className="min-h-11 justify-between text-sm" onClick={() => onAttentionOnlyChange(!attentionOnly)}><span>{attentionOnly ? "Showing drivers needing attention" : "Needs attention"}</span><span>{drivers.filter(driver => driverAttentionReasons(driver, trackingNow, pendingRequestDriverIds).length > 0).length}</span></Button>}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground/40" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, email, or load..."
            className="h-10 rounded-lg border-border/50 bg-muted/30 pl-9 text-base sm:text-sm"
          />
        </div>

        <div className="grid grid-cols-4 gap-1 p-1 rounded-lg bg-muted/30 border border-border/40">
          <button
            type="button"
            aria-pressed={operationalFilter === "all"}
            onClick={() => { setOperationalFilter("all"); setActiveSubFilter("all"); }}
            className={`min-h-11 rounded-md px-1.5 py-2 text-[10px] md:min-h-0 font-bold border transition-all sm:px-2 sm:text-xs ${operationalFilter === "all" ? "bg-indigo-500/15 border-indigo-500/30 text-indigo-700 dark:text-indigo-300" : "border-transparent text-muted-foreground hover:bg-muted/60"}`}
          >All ({counts.all})</button>

          <button
            type="button"
            aria-expanded={operationalFilter === "active"}
            aria-controls={activeFiltersId}
            aria-pressed={operationalFilter === "active"}
            onClick={() => setOperationalFilter("active")}
            className={"min-h-11 rounded-md border px-1.5 py-2 text-[10px] font-bold transition-colors sm:px-2 sm:text-xs md:min-h-0 " + (operationalFilter === "active" ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" : "border-transparent text-muted-foreground hover:bg-muted/60")}
          >Active ({counts.active})</button>

          <button
            type="button"
            aria-pressed={operationalFilter === "on_leave"}
            onClick={() => { setOperationalFilter("on_leave"); setActiveSubFilter("all"); }}
            className={`min-h-11 rounded-md px-1.5 py-2 text-[10px] md:min-h-0 font-bold border transition-all sm:px-2 sm:text-xs ${operationalFilter === "on_leave" ? "bg-amber-500/15 border-amber-500/30 text-amber-700 dark:text-amber-300" : "border-transparent text-muted-foreground hover:bg-muted/60"}`}
          >On Leave ({counts.on_leave})</button>
          <button
            type="button"
            aria-pressed={operationalFilter === "maintenance"}
            onClick={() => { setOperationalFilter("maintenance"); setActiveSubFilter("all"); }}
            className={`min-h-11 rounded-md px-1.5 py-2 text-[10px] md:min-h-0 font-bold border transition-all sm:px-2 sm:text-xs ${operationalFilter === "maintenance" ? "bg-blue-500/15 border-blue-500/30 text-blue-700 dark:text-blue-300" : "border-transparent text-muted-foreground hover:bg-muted/60"}`}
          >In Shop ({counts.maintenance})</button>
        </div>

        <div id={activeFiltersId} hidden={operationalFilter !== "active"}>
          <div role="group" aria-label="Active driver activity" className="flex flex-wrap gap-2">
            {(["all", "on-route", "idle", "waiting", "on-break", "offline"] as const).map(status => (
              <button
                key={status}
                type="button"
                aria-pressed={activeSubFilter === status}
                onClick={() => setActiveSubFilter(status)}
                className={"inline-flex min-h-11 max-w-full items-center justify-center gap-1.5 rounded-full border px-3 py-2 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring " + (activeSubFilter === status ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" : "border-border/60 bg-muted/40 text-muted-foreground hover:bg-muted/70")}
              >
                <span>{status === "all" ? "All Active" : statusLabel[status]}</span>
                <span>({status === "all" ? counts.active : counts.activeStatus[status]})</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-1">
          {([
            ["all", `All GPS (${drivers.length})`],
            ["sharing", `Fresh GPS (${counts.sharing})`],
            ["not-sharing", `Not fresh (${counts.notSharing})`],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setGpsFilter(key)}
              className={`min-h-11 flex-1 rounded-md border px-1.5 py-1.5 md:min-h-0 text-[10px] font-semibold transition-colors sm:px-2 sm:text-xs ${gpsFilter === key ? "border-primary/30 bg-primary/5 text-primary" : "border-border/40 text-muted-foreground hover:bg-muted/40"}`}
            >{label}</button>
          ))}
        </div>
      </CardHeader>

      <CardContent
        ref={listScrollRef}
        className="p-2 min-h-0 flex-1 overflow-visible md:overflow-y-scroll md:overscroll-contain space-y-1.5 [scrollbar-gutter:stable]"
      >
        {error && (
          <div className="rounded-lg bg-destructive/5 border border-destructive/10 px-3 py-2">
            <p role="alert" className="text-xs text-destructive font-medium">{error}</p>
            {onRetry && <Button type="button" variant="outline" size="sm" className="mt-2" disabled={isLoading} onClick={onRetry}>Retry</Button>}
          </div>
        )}

        {isLoading && drivers.length === 0 && !error && (
          <div className="space-y-2 p-1">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl">
                <Skeleton className="size-9 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3.5 w-28" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!isLoading && filtered.length === 0 && !error && (
          <div className="flex flex-col items-center justify-center py-10 gap-2">
            <div className="size-12 rounded-xl bg-muted/40 flex items-center justify-center">
              <Users className="size-6 text-muted-foreground/40" />
            </div>
            <p className="text-sm text-muted-foreground font-medium">
              {drivers.length === 0 ? "No drivers available" : "No drivers match these filters"}
            </p>
            {drivers.length > 0 && <Button type="button" variant="outline" size="sm" onClick={() => { setQuery(""); setOperationalFilter("all"); setActiveSubFilter("all"); setGpsFilter("all"); onAttentionOnlyChange?.(false); }}>Clear filters</Button>}
          </div>
        )}

        {filtered.map((driver) => {
          const reasons = driverAttentionReasons(driver, trackingNow, pendingRequestDriverIds);
          const shipments = driver.shipments ?? [];
          // Keep the same load selected when realtime updates reorder the list.
          // If it is released or removed, display the first remaining assignment.
          const selectedAssignmentIndex = Math.max(
            0,
            shipments.findIndex((shipment) => shipment.id === selectedAssignmentIds[driver.id]),
          );
          const selectedAssignment = shipments[selectedAssignmentIndex];
          const switchAssignment = (direction: number) => {
            if (shipments.length < 2) return;
            const nextIndex = (selectedAssignmentIndex + direction + shipments.length) % shipments.length;
            setSelectedAssignmentIds((previous) => ({
              ...previous,
              [driver.id]: shipments[nextIndex].id,
            }));
          };
          const isExpanded = expandedId === driver.id;
          const eq = driver.equipment;
          const unreadMessageCount = Math.max(
            0,
            Number(unreadMessageCounts[driver.driver?.id ?? driver.id] ?? 0),
          );
          const operationalStatus = opStatusOf(driver);
          const availabilityLabel = workAvailabilityLabelOf(driver);
          const statusRequest = driver.statusRequest;
          const tracking = trackingState(driver, trackingNow);

          return (
            <div
              key={driver.id}
              data-driver-card={driver.id}
              style={selectedDriverId === driver.id ? { outline: "2px solid var(--primary)", outlineOffset: "-2px" } : undefined}
              className="group/driver relative overflow-hidden rounded-xl border border-border/40 bg-card/45 transition-all duration-200 hover:border-primary/25 hover:bg-card/70 hover:shadow-sm"
            >
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-primary/70 via-emerald-400/35 to-transparent opacity-70" />
              <div
                className={`p-3 ${onDriverClick ? "cursor-pointer" : ""}`}
                onClick={() => {
                  // The server only exposes authorized driver coordinates to this
                  // directory. A card tap therefore focuses the live map when a
                  // dispatcher has a usable/authorized location projection.
                  if (onDriverClick) {
                    onDriverClick(driver);
                  }
                }}
              >
                <div className="flex items-start gap-3">
                  <div className="relative">
                    <Avatar className="size-9 border-2 border-background shadow-sm">
                      {driver.driver?.avatar && (
                        <AvatarImage src={driver.driver.avatar} />
                      )}
                      <AvatarFallback className="text-xs font-bold bg-primary/5 text-primary">
                        {driver.driver?.name?.[0]?.toUpperCase() || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <span
                      className={`absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-background ${statusStyles[driver.status]}`}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <button type="button" disabled={!onDriverClick} aria-pressed={selectedDriverId === driver.id}
                        onClick={event => { event.stopPropagation(); onDriverClick?.(driver); }}
                        className="min-w-0 rounded break-words text-left text-sm font-bold leading-tight text-foreground outline-offset-4 focus-visible:outline-2 focus-visible:outline-primary [overflow-wrap:anywhere] sm:text-base">
                        {driver.driver?.name || "Unknown Driver"}
                      </button>
                      <div className="flex items-center gap-1 shrink-0">
                        {shipments.length > 0 && (
                          <Badge
                            variant="outline"
                            className="h-6 border-border/50 px-2 text-[10px] font-semibold sm:h-7 sm:px-2.5 sm:text-[11px]"
                          >
                            {shipments.length} load{shipments.length !== 1 ? "s" : ""}
                          </Badge>
                        )}

                        {onOpenDriver && (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className={`relative size-11 p-0 md:hidden ${
                              unreadMessageCount > 0
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-muted-foreground"
                            }`}
                            aria-label={`Message ${driver.driver?.name || "driver"}`}
                            onClick={(event) => {
                              event.stopPropagation();
                              onOpenDriver(driver, "chat");
                            }}
                          >
                            <MessageSquare className="size-4" />
                            {unreadMessageCount > 0 && (
                              <span className="absolute -right-0.5 -top-0.5 flex min-w-4 items-center justify-center rounded-full bg-emerald-600 px-1 text-[8px] font-black leading-4 text-white">
                                {unreadMessageCount > 9 ? "9+" : unreadMessageCount}
                              </span>
                            )}
                          </Button>
                        )}

                        {onAlertDriver && (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="size-11 p-0 text-amber-600 md:hidden dark:text-amber-400"
                            aria-label={`Alert ${driver.driver?.name || "driver"}`}
                            onClick={(event) => {
                              event.stopPropagation();
                              onAlertDriver(driver);
                            }}
                          >
                            <Bell className="size-4" />
                          </Button>
                        )}

                        {onOpenDriver && (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="size-11 p-0 md:hidden"
                            aria-label={`Open ${driver.driver?.name || "driver"} workspace`}
                            onClick={(event) => {
                              event.stopPropagation();
                              onOpenDriver(driver, "overview");
                            }}
                          >
                            <ChevronRight className="size-4 text-muted-foreground" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="hidden size-8 p-0 md:inline-flex"
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedId(isExpanded ? null : driver.id);
                          }}
                        >
                          {isExpanded ? (
                            <ChevronUp className="size-4" />
                          ) : (
                            <ChevronDown className="size-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <Badge
                        variant="outline"
                        className={`${operationalStatus === "active" ? "hidden md:inline-flex" : "inline-flex"} h-auto px-2 py-1 text-[10px] sm:h-7 sm:px-2.5 sm:text-[11px] ${
                          operationalStatus === "active"
                            ? "border-emerald-500/30 text-emerald-700 dark:text-emerald-400"
                            : operationalStatus === "on_leave"
                              ? "border-amber-500/30 text-amber-700 dark:text-amber-400"
                              : "border-blue-500/30 text-blue-700 dark:text-blue-400"
                        }`}
                      >
                        Availability: {availabilityLabel}
                      </Badge>
                      <Badge variant="outline" className={`h-auto px-2 py-1 text-[10px] sm:h-7 sm:px-2.5 sm:text-[11px] ${statusText[driver.status]}`}>
                        Activity: {statusLabel[driver.status]}
                      </Badge>
                      <Badge variant="outline" className={`h-auto gap-1 px-2 py-1 text-[10px] sm:h-7 sm:gap-1.5 sm:px-2.5 sm:text-[11px] ${tracking.kind === "live" ? "border-blue-500/30 text-blue-600 dark:text-blue-400" : "border-slate-500/30 text-slate-500"}`}>
                        {tracking.kind === "live" ? <Wifi className="size-3" /> : <WifiOff className="size-3" />}
                        {tracking.label}
                      </Badge>
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground/80">
                        <Clock className="size-3" />
                        <span className="md:hidden">{relativeLocationTime(driver.locationRecordedAt, trackingNow)}</span><span className="hidden md:inline">{formatTrackingTime(driver.locationRecordedAt)}</span>
                      </span>
                    </div>
                    {reasons.length > 0 && <p className="mt-2 text-xs leading-relaxed text-amber-700 dark:text-amber-300">Needs attention: {reasons.join(" · ")}</p>}
                    {statusRequest && (
                      <button
                        type="button"
                        onClick={(event) => { event.stopPropagation(); onViewStatusRequest?.(driver); }}
                        className={`mt-2 w-full rounded-lg border px-3 py-2.5 text-left transition-colors ${statusRequest.priority === "emergency" ? "border-red-500/25 bg-red-500/5 hover:bg-red-500/10" : "border-amber-500/25 bg-amber-500/5 hover:bg-amber-500/10"}`}
                      >
                        <p className={`text-sm font-bold ${statusRequest.priority === "emergency" ? "text-red-600 dark:text-red-400" : "text-amber-700 dark:text-amber-400"}`}>
                          {statusRequest.priority === "emergency" ? "Emergency Release Active" : statusRequest.status === "approved_awaiting_reassignment" ? "Approved — Awaiting Reassignment" : "Work Availability Request Pending"}
                        </p>
                        <p className="text-xs text-muted-foreground/80 mt-1">Requested availability: {statusRequest.requestedStatus === "maintenance" ? "In Shop" : "On Leave"} · View request →</p>
                      </button>
                    )}
                    <div className="mt-2 hidden grid-cols-2 gap-1.5 md:grid">
                      {onAlertDriver && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-9 gap-1.5 text-xs font-semibold border-amber-500/30 text-amber-700 hover:bg-amber-500/10 dark:text-amber-400"
                          onClick={(event) => {
                            event.stopPropagation();
                            onAlertDriver(driver);
                          }}
                        >
                          <Bell className="size-3.5" />
                          Alert
                        </Button>
                      )}
                      {onMessageDriver && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className={`h-9 gap-1.5 text-xs font-semibold ${
                            unreadMessageCount > 0
                              ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/15 dark:text-emerald-300"
                              : "border-primary/30 hover:bg-primary/5"
                          }`}
                          onClick={(event) => {
                            event.stopPropagation();
                            onMessageDriver(driver);
                          }}
                        >
                          <MessageSquare className="size-3.5" />
                          {unreadMessageCount > 0
                            ? `New Message${unreadMessageCount === 1 ? "" : "s"} (${unreadMessageCount})`
                            : "Message"}
                        </Button>
                      )}
                    </div>

                    {selectedAssignment && (
                      <div className="mt-2 rounded-xl border border-border/45 bg-muted/[0.10] p-2.5 md:hidden">
                        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                          <p className="text-[9px] font-black uppercase tracking-[0.12em] text-muted-foreground">
                            Current Assignment
                          </p>
                          {shipments.length > 1 && (
                            <div className="flex items-center gap-1">
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className="size-11 shrink-0 rounded-md md:size-7"
                                aria-label={`Previous load for ${driver.driver?.name || "driver"}`}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  switchAssignment(-1);
                                }}
                              >
                                <ChevronLeft className="size-4" />
                              </Button>
                              <span className="min-w-14 text-center text-[10px] font-bold tabular-nums text-muted-foreground" aria-live="polite" aria-atomic="true">
                                Load {selectedAssignmentIndex + 1} of {shipments.length}
                              </span>
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className="size-11 shrink-0 rounded-md md:size-7"
                                aria-label={`Next load for ${driver.driver?.name || "driver"}`}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  switchAssignment(1);
                                }}
                              >
                                <ChevronRight className="size-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                          <Package className="size-3.5 shrink-0 text-primary" />
                          <span className="min-w-0 break-all text-xs font-black [overflow-wrap:anywhere]">
                            {selectedAssignment.trackingNumber || selectedAssignment.id}
                          </span>
                          {selectedAssignment.status && (
                            <Badge variant="outline" className="h-auto whitespace-normal px-1.5 py-0.5 text-[9px]">
                              {selectedAssignment.status}
                            </Badge>
                          )}
                        </div>
                        {(selectedAssignment.origin || selectedAssignment.destination) && (
                          <div className="mt-2 grid grid-cols-[4.25rem_minmax(0,1fr)] gap-x-2 gap-y-1 text-[11px] leading-relaxed">
                            <span className="font-bold text-muted-foreground">Pickup</span>
                            <span className="min-w-0 break-words [overflow-wrap:anywhere]">
                              {selectedAssignment.origin || "Not provided"}
                            </span>
                            <span className="font-bold text-muted-foreground">Delivery</span>
                            <span className="min-w-0 break-words [overflow-wrap:anywhere]">
                              {selectedAssignment.destination || "Not provided"}
                            </span>
                          </div>
                        )}

                      </div>
                    )}

                    {driver.coords && (
                      <p className="mt-1.5 hidden text-[11px] leading-relaxed text-muted-foreground md:block">
                        GPS measured: {formatTrackingTime(driver.locationRecordedAt)} · Server confirmed: {formatTrackingTime(driver.lastSeenAt)}
                        {driver.accuracy != null && Number.isFinite(driver.accuracy) ? ` · Accuracy ±${Math.round(driver.accuracy)} m` : ""}
                        {tracking.kind !== "live" && " · Last known position; location may have changed."}
                      </p>
                    )}
                    {eq?.trailerType && (
                      <div className="mt-1.5 hidden flex-wrap gap-1 md:flex">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-500/10 px-2.5 py-1 text-[11px] font-semibold text-purple-600 dark:text-purple-400">
                          <Truck className="size-3" />
                          {trailerLabel(eq.trailerType)}
                        </span>
                        {eq.maxVehicleCapacity && eq.maxVehicleCapacity > 0 && (
                          <span className="rounded-full bg-indigo-500/10 px-2.5 py-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">
                            Capacity: {eq.maxVehicleCapacity} vehicle{eq.maxVehicleCapacity === 1 ? "" : "s"}/load
                          </span>
                        )}
                      </div>
                    )}
                    {eq?.isComplianceExpired && (
                      <div className="mt-1.5 md:hidden">
                        <span className="inline-flex max-w-full items-center gap-1 rounded-full border border-red-500/25 bg-red-500/10 px-2.5 py-1 text-[10px] font-bold text-red-700 dark:text-red-300">
                          <FileCheck2 className="size-3 shrink-0" />
                          Compliance needs attention
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {isExpanded && (
                <div className="hidden px-3 pb-3 pt-0 space-y-2 border-t border-border/20 mt-0 md:block">
                  <div className="pt-2 grid grid-cols-2 gap-2">
                    {eq?.truckMake && (
                      <div className="rounded-lg bg-muted/30 px-2.5 py-1.5">
                        <p className="text-[11px] text-muted-foreground font-semibold">
                          Truck
                        </p>
                        <p className="text-sm font-bold">
                          {eq.truckMake} {eq.truckModel || ""}
                        </p>
                      </div>
                    )}
                    {eq?.trailerType && (
                      <div className="rounded-lg bg-muted/30 px-2.5 py-1.5">
                        <p className="text-[11px] text-muted-foreground font-semibold">
                          Trailer
                        </p>
                        <p className="text-sm font-bold">
                          {trailerLabel(eq.trailerType)}
                        </p>
                      </div>
                    )}
                    {eq?.maxVehicleCapacity != null && (
                      <div className="rounded-lg bg-muted/30 px-2.5 py-1.5">
                        <p className="text-[11px] text-muted-foreground font-semibold">
                          Equipment Capacity
                        </p>
                        <p className="text-sm font-bold">
                          {eq.maxVehicleCapacity} vehicle{eq.maxVehicleCapacity === 1 ? "" : "s"} / load
                        </p>
                      </div>
                    )}
                    {eq?.operationalStatus && (
                      <div className="rounded-lg bg-muted/30 px-2.5 py-1.5">
                        <p className="text-[11px] text-muted-foreground font-semibold">
                          Work Availability
                        </p>
                        <p
                          className={`text-sm font-bold ${
                            operationalStatus === "active"
                              ? "text-emerald-600 dark:text-emerald-400"
                              : operationalStatus === "on_leave"
                                ? "text-amber-600 dark:text-amber-400"
                                : "text-blue-600 dark:text-blue-400"
                          }`}
                        >
                          {availabilityLabel}
                        </p>
                      </div>
                    )}
                    {eq?.profileCompletionScore != null && (
                      <div className="rounded-lg bg-muted/30 px-2.5 py-1.5">
                        <p className="text-[11px] text-muted-foreground font-semibold">
                          Profile
                        </p>
                        <div className="flex items-center gap-1.5">
                          <div className="flex-1 h-1 rounded-full bg-border/50 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-primary transition-all"
                              style={{ width: `${eq.profileCompletionScore}%` }}
                            />
                          </div>
                          <span className="text-xs font-bold">
                            {eq.profileCompletionScore}%
                          </span>
                        </div>
                      </div>
                    )}
                    {onViewCompliance && (
                      <button
                        type="button"
                        className={`rounded-lg border px-2.5 py-1.5 text-left transition-all ${
                          eq?.isComplianceExpired
                            ? "border-red-500/20 bg-red-500/5 hover:bg-red-500/10"
                            : "border-emerald-500/15 bg-emerald-500/5 hover:border-emerald-500/30 hover:bg-emerald-500/10"
                        }`}
                        onClick={(event) => {
                          event.stopPropagation();
                          onViewCompliance(driver);
                        }}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
                              <FileCheck2 className="size-3 text-emerald-500" />
                              Driver Review Center
                            </p>
                            <p
                              className={`mt-1 text-sm font-bold ${
                                eq?.isComplianceExpired
                                  ? "text-red-600 dark:text-red-400"
                                  : "text-foreground"
                              }`}
                            >
                              {eq?.isComplianceExpired
                                ? "Needs attention"
                                : "Open review center"}
                            </p>
                          </div>
                          <span className="shrink-0 text-xs font-black text-emerald-600 dark:text-emerald-400">
                            View →
                          </span>
                        </div>
                      </button>
                    )}
                    {eq?.isComplianceExpired && (
                      <div className="rounded-lg bg-red-500/5 border border-red-500/10 px-2.5 py-1.5">
                        <p className="text-[11px] text-red-500 font-semibold">
                          Compliance
                        </p>
                        <p className="text-sm font-bold text-red-600 dark:text-red-400">
                          Expired
                        </p>
                      </div>
                    )}
                  </div>

                  {shipments.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                        Assigned Loads
                      </p>
                      {shipments.map((s) => (
                        <div
                          key={s.id}
                          className="flex items-center gap-2 rounded-lg bg-muted/20 px-2.5 py-1.5"
                        >
                          <Package className="size-3 text-primary shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold truncate">
                              {s.trackingNumber || s.id}
                            </p>
                            {(s.origin || s.destination) && (
                              <p className="text-xs text-muted-foreground/80 truncate">
                                {s.origin} → {s.destination}
                              </p>
                            )}
                          </div>
                          {s.status && (
                            <Badge
                              variant="outline"
                              className="text-[10px] h-6 shrink-0"
                            >
                              {s.status}
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {onAssignLoad && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!driver.assignable}
                      className="w-full h-10 text-sm font-semibold gap-2 border-border/50 hover:bg-primary/5 hover:text-primary hover:border-primary/30 disabled:opacity-50"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (driver.assignable) onAssignLoad(driver);
                      }}
                    >
                      <UserPlus className="size-3.5" />
                      {driver.assignable ? "Assign Load" : "Unavailable for Assignment"}
                    </Button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
} 