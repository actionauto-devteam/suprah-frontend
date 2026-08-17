"use client";

import * as React from "react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type OperationalFilter = "all" | "active" | "on_leave" | "maintenance";
type ActiveSubFilter = "all" | DriverStatus;
type GpsFilter = "all" | "sharing" | "not-sharing";

interface DriverTrackerListCardProps {
  drivers: DriverTrackingItem[];
  isLoading: boolean;
  error: string | null;
  statusLabel: Record<DriverStatus, string>;
  statusStyles: Record<DriverStatus, string>;
  statusText: Record<DriverStatus, string>;
  onAssignLoad?: (driver: DriverTrackingItem) => void;
  onDriverClick?: (driver: DriverTrackingItem) => void;
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
  isLoading,
  error,
  statusLabel,
  statusStyles,
  statusText,
  onAssignLoad,
  onDriverClick,
  onAlertDriver,
  onMessageDriver,
  onViewCompliance,
  onViewStatusRequest,
  unreadMessageCounts = {},
}: DriverTrackerListCardProps) {
  const [operationalFilter, setOperationalFilter] = React.useState<OperationalFilter>("all");
  const [activeSubFilter, setActiveSubFilter] = React.useState<ActiveSubFilter>("all");
  const [gpsFilter, setGpsFilter] = React.useState<GpsFilter>("all");
  const [query, setQuery] = React.useState("");
  const [expandedId, setExpandedId] = React.useState<string | null>(null);
  const listScrollRef = React.useRef<HTMLDivElement | null>(null);

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
        if (gpsFilter === "sharing" && !d.isSharing) return false;
        if (gpsFilter === "not-sharing" && d.isSharing) return false;
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
        const aSharing = a.isSharing ? 0 : 1;
        const bSharing = b.isSharing ? 0 : 1;
        if (aSharing !== bSharing) return aSharing - bSharing;
        return (originalOrder.get(a.id) ?? Number.MAX_SAFE_INTEGER) -
          (originalOrder.get(b.id) ?? Number.MAX_SAFE_INTEGER);
      });
  }, [drivers, operationalFilter, activeSubFilter, gpsFilter, query, expandedId]);

  const counts = React.useMemo(() => {
    const activeDrivers = drivers.filter(isWorkAvailable);
    return {
      all: drivers.length,
      active: activeDrivers.length,
      on_leave: drivers.filter((driver) => opStatusOf(driver) === "on_leave").length,
      maintenance: drivers.filter((driver) => opStatusOf(driver) === "maintenance").length,
      sharing: drivers.filter((driver) => driver.isSharing).length,
      notSharing: drivers.filter((driver) => !driver.isSharing).length,
      activeStatus: {
        "on-route": activeDrivers.filter((driver) => driver.status === "on-route").length,
        idle: activeDrivers.filter((driver) => driver.status === "idle").length,
        waiting: activeDrivers.filter((driver) => driver.status === "waiting").length,
        "on-break": activeDrivers.filter((driver) => driver.status === "on-break").length,
        offline: activeDrivers.filter((driver) => driver.status === "offline").length,
      } as Record<DriverStatus, number>,
    };
  }, [drivers]);

  return (
    <Card className="border-border/50 shadow-sm p-0 gap-0 overflow-hidden flex flex-col min-h-0 h-[60vh] min-h-80 max-h-105 sm:h-120 lg:h-150 lg:max-h-none">
      <CardHeader className="py-4 px-5 border-b border-border/30 shrink-0 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-black flex items-center gap-2">
              <Users className="size-5 text-primary" />
              All Drivers
            </CardTitle>
            <p className="text-sm text-muted-foreground/80 font-medium mt-1">
              {filtered.length} of {drivers.length} driver
              {drivers.length !== 1 ? "s" : ""}
            </p>
          </div>
          <Badge
            variant="secondary"
            className="h-7 text-xs font-bold bg-blue-500/10 text-blue-600 gap-1.5 px-2.5"
          >
            <Wifi className="size-3.5" />
            {counts.sharing} GPS sharing
          </Badge>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground/40" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, email, or load..."
            className="h-10 pl-9 text-sm rounded-lg border-border/50 bg-muted/30"
          />
        </div>

        <div className="grid grid-cols-4 gap-1 p-1 rounded-lg bg-muted/30 border border-border/40">
          <button
            onClick={() => { setOperationalFilter("all"); setActiveSubFilter("all"); }}
            className={`rounded-md px-2 py-2 text-xs font-bold border transition-all ${operationalFilter === "all" ? "bg-indigo-500/15 border-indigo-500/30 text-indigo-700 dark:text-indigo-300" : "border-transparent text-muted-foreground hover:bg-muted/60"}`}
          >All ({counts.all})</button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={`rounded-md px-2 py-2 text-xs font-bold border transition-all flex items-center justify-center gap-1 ${operationalFilter === "active" ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-700 dark:text-emerald-300" : "border-transparent text-muted-foreground hover:bg-muted/60"}`}
              >
                Active ({counts.active}) <ChevronDown className="size-3" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-52">
              <DropdownMenuLabel className="text-xs uppercase tracking-wider">Work Availability: Active</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => { setOperationalFilter("active"); setActiveSubFilter("all"); }}>All Active ({counts.active})</DropdownMenuItem>
              {(["on-route", "idle", "waiting", "on-break", "offline"] as DriverStatus[]).map((status) => (
                <DropdownMenuItem key={status} onClick={() => { setOperationalFilter("active"); setActiveSubFilter(status); }}>
                  {statusLabel[status]} ({counts.activeStatus[status]})
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <button
            onClick={() => { setOperationalFilter("on_leave"); setActiveSubFilter("all"); }}
            className={`rounded-md px-2 py-2 text-xs font-bold border transition-all ${operationalFilter === "on_leave" ? "bg-amber-500/15 border-amber-500/30 text-amber-700 dark:text-amber-300" : "border-transparent text-muted-foreground hover:bg-muted/60"}`}
          >On Leave ({counts.on_leave})</button>
          <button
            onClick={() => { setOperationalFilter("maintenance"); setActiveSubFilter("all"); }}
            className={`rounded-md px-2 py-2 text-xs font-bold border transition-all ${operationalFilter === "maintenance" ? "bg-blue-500/15 border-blue-500/30 text-blue-700 dark:text-blue-300" : "border-transparent text-muted-foreground hover:bg-muted/60"}`}
          >In Shop ({counts.maintenance})</button>
        </div>

        <div className="flex items-center gap-1">
          {([
            ["all", `All GPS (${drivers.length})`],
            ["sharing", `Sharing (${counts.sharing})`],
            ["not-sharing", `Not Sharing (${counts.notSharing})`],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setGpsFilter(key)}
              className={`flex-1 rounded-md border px-2 py-1.5 text-xs font-semibold transition-colors ${gpsFilter === key ? "border-primary/30 bg-primary/5 text-primary" : "border-border/40 text-muted-foreground hover:bg-muted/40"}`}
            >{label}</button>
          ))}
        </div>
      </CardHeader>

      <CardContent
        ref={listScrollRef}
        className="p-2 min-h-0 flex-1 overflow-y-scroll overscroll-contain space-y-1.5 [scrollbar-gutter:stable]"
      >
        {error && (
          <div className="rounded-lg bg-destructive/5 border border-destructive/10 px-3 py-2">
            <p className="text-xs text-destructive font-medium">{error}</p>
          </div>
        )}

        {isLoading && !error && (
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
              {query ? "No drivers match your search" : "No drivers found"}
            </p>
          </div>
        )}

        {filtered.map((driver) => {
          const shipments = driver.shipments ?? [];
          const isExpanded = expandedId === driver.id;
          const eq = driver.equipment;
          const unreadMessageCount = Math.max(
            0,
            Number(unreadMessageCounts[driver.driver?.id ?? driver.id] ?? 0),
          );
          const operationalStatus = opStatusOf(driver);
          const availabilityLabel = workAvailabilityLabelOf(driver);
          const statusRequest = driver.statusRequest;

          return (
            <div
              key={driver.id}
              className="rounded-xl border border-border/40 transition-all duration-200 hover:border-primary/20 hover:shadow-sm"
            >
              <div
                className={`p-3 ${onDriverClick && driver.coords ? "cursor-pointer" : ""}`}
                onClick={() =>
                  onDriverClick && driver.coords && onDriverClick(driver)
                }
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
                      <p className="min-w-0 break-words text-sm font-bold leading-tight text-foreground [overflow-wrap:anywhere] sm:text-base">
                        {driver.driver?.name || "Unknown Driver"}
                      </p>
                      <div className="flex items-center gap-1 shrink-0">
                        {shipments.length > 0 && (
                          <Badge
                            variant="outline"
                            className="h-7 border-border/50 px-2.5 text-[11px] font-semibold"
                          >
                            {shipments.length} active load{shipments.length !== 1 ? "s" : ""}
                          </Badge>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="size-8 p-0"
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
                        className={`h-7 px-2.5 text-[11px] ${
                          operationalStatus === "active"
                            ? "border-emerald-500/30 text-emerald-700 dark:text-emerald-400"
                            : operationalStatus === "on_leave"
                              ? "border-amber-500/30 text-amber-700 dark:text-amber-400"
                              : "border-blue-500/30 text-blue-700 dark:text-blue-400"
                        }`}
                      >
                        Availability: {availabilityLabel}
                      </Badge>
                      <Badge variant="outline" className={`text-[11px] h-7 px-2.5 ${statusText[driver.status]}`}>
                        Activity: {statusLabel[driver.status]}
                      </Badge>
                      <Badge variant="outline" className={`text-[11px] h-7 gap-1.5 px-2.5 ${driver.isSharing ? "border-blue-500/30 text-blue-600 dark:text-blue-400" : "border-slate-500/30 text-slate-500"}`}>
                        {driver.isSharing ? <Wifi className="size-3" /> : <WifiOff className="size-3" />}
                        {driver.isSharing ? "Sharing" : "Not Sharing"}
                      </Badge>
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground/80">
                        <Clock className="size-3" />
                        {driver.lastSeenAt
                          ? new Date(driver.lastSeenAt).toLocaleTimeString('en-US', { hour: "2-digit", minute: "2-digit", timeZone: "America/Denver" })
                          : "Never"}
                      </span>
                    </div>
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
                    <div className="mt-2 grid grid-cols-2 gap-1.5">
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

                    {eq?.trailerType && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
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
                  </div>
                </div>
              </div>

              {isExpanded && (
                <div className="px-3 pb-3 pt-0 space-y-2 border-t border-border/20 mt-0">
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
                              Compliance & Documents
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
                                : "View verification records"}
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
                        Active Loads
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