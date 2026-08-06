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
} from "lucide-react";
import { trailerTypeOptions } from "@/components/driver-profile/driver-profile-constants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { LayoutGrid } from "lucide-react";
import { DriverTrackingItem, DriverStatus } from "@/types/driver-tracking";

type DriverFilter = "all" | "active" | "offline" | "sharing" | "not-sharing";

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
}

const trailerLabel = (val?: string) =>
  trailerTypeOptions.find((t) => t.value === val)?.label ?? val ?? "Unknown";

const FILTER_OPTIONS: { key: DriverFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "offline", label: "Offline" },
  { key: "sharing", label: "Sharing" },
  { key: "not-sharing", label: "Not Sharing" },
];

const FILTER_STYLE: Record<
  DriverFilter,
  { activeClass: string; badgeClass: string; icon: React.ReactNode }
> = {
  all: {
    activeClass: "bg-indigo-500/20 border-indigo-500/40",
    badgeClass: "bg-indigo-500/20 text-indigo-600 dark:text-indigo-400",
    icon: <LayoutGrid className="size-3 text-indigo-600 dark:text-indigo-400" />,
  },
  active: {
    activeClass: "bg-emerald-500/20 border-emerald-500/40",
    badgeClass: "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400",
    icon: (
      <span className="relative flex size-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-40" />
        <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
      </span>
    ),
  },
  offline: {
    activeClass: "bg-slate-500/20 border-slate-500/40",
    badgeClass: "bg-slate-500/20 text-slate-600 dark:text-slate-400",
    icon: <span className="inline-block size-2 rounded-full bg-slate-400" />,
  },
  sharing: {
    activeClass: "bg-blue-500/20 border-blue-500/40",
    badgeClass: "bg-blue-500/20 text-blue-600 dark:text-blue-400",
    icon: <Wifi className="size-3 text-blue-600 dark:text-blue-400" />,
  },
  "not-sharing": {
    activeClass: "bg-amber-500/20 border-amber-500/40",
    badgeClass: "bg-amber-500/20 text-amber-600 dark:text-amber-400",
    icon: <WifiOff className="size-3 text-amber-600 dark:text-amber-400" />,
  },
};

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
}: DriverTrackerListCardProps) {
  const [filter, setFilter] = React.useState<DriverFilter>("all");
  const [query, setQuery] = React.useState("");
  const [expandedId, setExpandedId] = React.useState<string | null>(null);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return drivers.filter((d) => {
      if (filter === "active" && d.status === "offline") return false;
      if (filter === "offline" && d.status !== "offline") return false;
      if (filter === "sharing" && !d.isSharing) return false;
      if (filter === "not-sharing" && d.isSharing) return false;
      if (!q) return true;
      const name = d.driver?.name?.toLowerCase() || "";
      const email = d.driver?.email?.toLowerCase() || "";
      const tracking =
        d.shipments
          ?.map((s) => s.trackingNumber?.toLowerCase() || "")
          .join(" ") || "";
      return name.includes(q) || email.includes(q) || tracking.includes(q);
    });
  }, [drivers, filter, query]);

  const counts = React.useMemo(
    () => ({
      all: drivers.length,
      active: drivers.filter((d) => d.status !== "offline").length,
      offline: drivers.filter((d) => d.status === "offline").length,
      sharing: drivers.filter((d) => d.isSharing).length,
      "not-sharing": drivers.filter((d) => !d.isSharing).length,
    }),
    [drivers],
  );

  return (
    <Card className="border-border/50 shadow-sm p-0 gap-0 overflow-hidden flex flex-col h-full">
      <CardHeader className="py-4 px-5 border-b border-border/30 shrink-0 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-black flex items-center gap-2">
              <Users className="size-4.5 text-primary" />
              All Drivers
            </CardTitle>
            <p className="text-[10px] text-muted-foreground/60 font-medium mt-0.5">
              {filtered.length} of {drivers.length} driver
              {drivers.length !== 1 ? "s" : ""}
            </p>
          </div>
          {counts.active > 0 && (
            <Badge
              variant="secondary"
              className="text-[10px] font-bold bg-emerald-500/10 text-emerald-600 gap-1"
            >
              <span className="relative flex size-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-40" />
                <span className="relative inline-flex size-1.5 rounded-full bg-emerald-500" />
              </span>
              {counts.active} online
            </Badge>
          )}
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground/40" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, email, or load..."
            className="h-10 sm:h-8 pl-9 text-base sm:text-[11px] rounded-lg border-border/40 bg-muted/30"
          />
        </div>

        <div className="flex flex-wrap gap-1 p-1 rounded-lg bg-muted/30 border border-border/40">
          {FILTER_OPTIONS.map((opt) => {
            const cfg = FILTER_STYLE[opt.key];
            const isActive = filter === opt.key;
            return (
              <button
                key={opt.key}
                onClick={() => setFilter(opt.key)}
                className={`flex items-center justify-center gap-1.5 px-2 sm:px-2.5 py-2 sm:py-1.5 min-h-9 rounded-md flex-1 min-w-[calc(33%-0.25rem)] transition-all ${
                  isActive
                    ? `${cfg.activeClass} border shadow-sm`
                    : "border border-transparent hover:bg-muted/50"
                }`}
              >
                {cfg.icon}
                <span
                  className={`text-[11px] font-bold flex-1 text-left ${
                    isActive ? "text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {opt.label}
                </span>
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                    isActive
                      ? cfg.badgeClass
                      : "bg-muted/50 text-muted-foreground/60"
                  }`}
                >
                  {counts[opt.key]}
                </span>
              </button>
            );
          })}
        </div>
      </CardHeader>

      <CardContent className="p-2 flex-1 overflow-y-auto space-y-1.5">
        {error && (
          <div className="rounded-lg bg-destructive/5 border border-destructive/10 px-3 py-2">
            <p className="text-[11px] text-destructive font-medium">{error}</p>
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
            <p className="text-xs text-muted-foreground font-medium">
              {query ? "No drivers match your search" : "No drivers found"}
            </p>
          </div>
        )}

        {filtered.map((driver) => {
          const shipments = driver.shipments ?? [];
          const isExpanded = expandedId === driver.id;
          const eq = driver.equipment;
          const canMessage = Boolean(
            driver.driver?.messagingAvailable && driver.driver?.crmUserId,
          );
          const messagingUnavailableReason =
            driver.driver?.messagingUnavailableReason ||
            "No active Suprah Space account is linked to this driver.";

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
                      <p className="text-sm font-bold text-foreground truncate">
                        {driver.driver?.name || "Unknown Driver"}
                      </p>
                      <div className="flex items-center gap-1 shrink-0">
                        {shipments.length > 0 && (
                          <Badge
                            variant="outline"
                            className={`text-[9px] font-semibold h-5 ${eq?.maxVehicleCapacity && shipments.length >= eq.maxVehicleCapacity ? "border-red-500/50 text-red-600 dark:text-red-400" : "border-border/50"}`}
                          >
                            {shipments.length}
                            {eq?.maxVehicleCapacity
                              ? `/${eq.maxVehicleCapacity}`
                              : ""}{" "}
                            load{shipments.length !== 1 ? "s" : ""}
                          </Badge>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="size-8 sm:size-6 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedId(isExpanded ? null : driver.id);
                          }}
                        >
                          {isExpanded ? (
                            <ChevronUp className="size-3.5 sm:size-3" />
                          ) : (
                            <ChevronDown className="size-3.5 sm:size-3" />
                          )}
                        </Button>
                      </div>
                    </div>
                    <div className="mt-0.5 flex items-center gap-2 text-[11px]">
                      <span className="relative flex size-2">
                        {driver.status === "on-route" && (
                          <span
                            className={`animate-ping absolute inline-flex h-full w-full rounded-full ${statusStyles[driver.status]} opacity-40`}
                          />
                        )}
                        <span
                          className={`relative inline-flex size-2 rounded-full ${statusStyles[driver.status]}`}
                        />
                      </span>
                      <span
                        className={`font-semibold ${statusText[driver.status]}`}
                      >
                        {statusLabel[driver.status]}
                      </span>
                      <span className="text-muted-foreground/30">|</span>
                      <span className="inline-flex items-center gap-1 text-muted-foreground/60">
                        <Clock className="size-2.5" />
                        {driver.lastSeenAt
                          ? new Date(driver.lastSeenAt).toLocaleTimeString('en-US', {
                              hour: "2-digit",
                              minute: "2-digit",
                              timeZone: "America/Denver",
                            })
                          : "Never"}
                      </span>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-1.5">
                      {onAlertDriver && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-8 gap-1.5 text-[10px] font-semibold border-amber-500/30 text-amber-700 hover:bg-amber-500/10 dark:text-amber-400"
                          onClick={(event) => {
                            event.stopPropagation();
                            onAlertDriver(driver);
                          }}
                        >
                          <Bell className="size-3" />
                          Alert
                        </Button>
                      )}
                      {onMessageDriver && (
                        <span
                          className="block"
                          title={canMessage ? "Message driver" : messagingUnavailableReason}
                        >
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={!canMessage}
                            aria-label={
                              canMessage
                                ? `Message ${driver.driver?.name || "driver"}`
                                : messagingUnavailableReason
                            }
                            className={`h-8 w-full gap-1.5 text-[10px] font-semibold ${
                              canMessage
                                ? "border-primary/30 hover:bg-primary/5"
                                : "cursor-not-allowed border-border/40 text-muted-foreground/50"
                            }`}
                            onClick={(event) => {
                              event.stopPropagation();
                              if (canMessage) onMessageDriver(driver);
                            }}
                          >
                            <MessageSquare className="size-3" />
                            Message
                          </Button>
                        </span>
                      )}
                    </div>
                    {onMessageDriver && !canMessage && (
                      <p className="mt-1 text-[9px] leading-snug text-muted-foreground/60">
                        Suprah Space account not linked
                      </p>
                    )}

                    {eq?.trailerType && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        <span className="inline-flex items-center gap-1 rounded-full bg-purple-500/10 px-2 py-0.5 text-[9px] font-semibold text-purple-600 dark:text-purple-400">
                          <Truck className="size-2.5" />
                          {trailerLabel(eq.trailerType)}
                        </span>
                        {eq.maxVehicleCapacity && eq.maxVehicleCapacity > 0 && (
                          <span
                            className={`rounded-full px-2 py-0.5 text-[9px] font-semibold ${shipments.length >= eq.maxVehicleCapacity ? "bg-red-500/10 text-red-600 dark:text-red-400" : "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"}`}
                          >
                            {shipments.length}/{eq.maxVehicleCapacity} loads
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
                        <p className="text-[9px] text-muted-foreground font-medium">
                          Truck
                        </p>
                        <p className="text-[11px] font-bold">
                          {eq.truckMake} {eq.truckModel || ""}
                        </p>
                      </div>
                    )}
                    {eq?.trailerType && (
                      <div className="rounded-lg bg-muted/30 px-2.5 py-1.5">
                        <p className="text-[9px] text-muted-foreground font-medium">
                          Trailer
                        </p>
                        <p className="text-[11px] font-bold">
                          {trailerLabel(eq.trailerType)}
                        </p>
                      </div>
                    )}
                    {eq?.maxVehicleCapacity != null && (
                      <div
                        className={`rounded-lg px-2.5 py-1.5 ${shipments.length >= eq.maxVehicleCapacity ? "bg-red-500/5 border border-red-500/10" : "bg-muted/30"}`}
                      >
                        <p className="text-[9px] text-muted-foreground font-medium">
                          Load Capacity
                        </p>
                        <p
                          className={`text-[11px] font-bold ${shipments.length >= eq.maxVehicleCapacity ? "text-red-600 dark:text-red-400" : ""}`}
                        >
                          {shipments.length}/{eq.maxVehicleCapacity} active
                        </p>
                      </div>
                    )}
                    {eq?.operationalStatus && (
                      <div className="rounded-lg bg-muted/30 px-2.5 py-1.5">
                        <p className="text-[9px] text-muted-foreground font-medium">
                          Op. Status
                        </p>
                        <p className="text-[11px] font-bold capitalize">
                          {eq.operationalStatus.replace("_", " ")}
                        </p>
                      </div>
                    )}
                    {eq?.profileCompletionScore != null && (
                      <div className="rounded-lg bg-muted/30 px-2.5 py-1.5">
                        <p className="text-[9px] text-muted-foreground font-medium">
                          Profile
                        </p>
                        <div className="flex items-center gap-1.5">
                          <div className="flex-1 h-1 rounded-full bg-border/50 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-primary transition-all"
                              style={{ width: `${eq.profileCompletionScore}%` }}
                            />
                          </div>
                          <span className="text-[10px] font-bold">
                            {eq.profileCompletionScore}%
                          </span>
                        </div>
                      </div>
                    )}
                    {eq?.isComplianceExpired && (
                      <div className="rounded-lg bg-red-500/5 border border-red-500/10 px-2.5 py-1.5">
                        <p className="text-[9px] text-red-500 font-medium">
                          Compliance
                        </p>
                        <p className="text-[11px] font-bold text-red-600 dark:text-red-400">
                          Expired
                        </p>
                      </div>
                    )}
                  </div>

                  {shipments.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">
                        Active Loads
                      </p>
                      {shipments.map((s) => (
                        <div
                          key={s.id}
                          className="flex items-center gap-2 rounded-lg bg-muted/20 px-2.5 py-1.5"
                        >
                          <Package className="size-3 text-primary shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="text-[10px] font-bold truncate">
                              {s.trackingNumber || s.id}
                            </p>
                            {(s.origin || s.destination) && (
                              <p className="text-[9px] text-muted-foreground truncate">
                                {s.origin} → {s.destination}
                              </p>
                            )}
                          </div>
                          {s.status && (
                            <Badge
                              variant="outline"
                              className="text-[8px] h-4 shrink-0"
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
                      className="w-full h-7 text-[10px] font-semibold gap-1.5 border-border/50 hover:bg-primary/5 hover:text-primary hover:border-primary/30"
                      onClick={(e) => {
                        e.stopPropagation();
                        onAssignLoad(driver);
                      }}
                    >
                      <UserPlus className="size-3" />
                      Assign Load
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
