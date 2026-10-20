"use client";

import * as React from "react";
import { MapPin, Navigation2, Route } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { DriverLoadCompatibility } from "@/types/driver-tracking";
import { cn } from "@/lib/utils";

interface Props {
  compatibility?: DriverLoadCompatibility | null;
  className?: string;
  showUnknown?: boolean;
}

function miles(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.round(value))
    : null;
}

// "45 min ago", "3 h ago"; null when the time is missing.
function timeAgo(iso: string | null | undefined) {
  const at = iso ? new Date(iso).getTime() : Number.NaN;
  if (!Number.isFinite(at)) return null;
  const minutes = Math.max(1, Math.round((Date.now() - at) / 60_000));
  return minutes < 60 ? `${minutes} min ago` : `${Math.round(minutes / 60)} h ago`;
}

function proximitySourceLabel(source: string | null | undefined, lastSeenAt: string | null | undefined) {
  if (source === "live_gps") return " · Live GPS";
  if (source === "shared_location") return " · Location shared by the driver";
  if (source === "last_delivery") {
    const ago = timeAgo(lastSeenAt);
    return ago ? ` · From last delivery, ${ago}` : " · From last delivery";
  }
  if (source === "home_base") return " · Home base";
  return "";
}

export function DriverLoadRecommendationBadges({
  compatibility, 
  className,
  showUnknown = false,
}: Props) {
  if (!compatibility) return null;

  const service = compatibility.serviceArea ?? {
    status: "unknown" as const,
    serviceRadiusMiles: null,
    distanceFromHomeBaseToPickupMiles: null,
    homeBaseLabel: null,
  };
  const route = compatibility.preferredRoute ?? {
    status: "unknown" as const,
    originState: null,
    originCity: null,
    destinationState: null,
    destinationCity: null,
    matchedRoute: null,
    matchLevel: null,
    preferredRoutes: [],
  };
  const proximity = compatibility.proximity ?? {
    distanceToPickupMiles: null,
    source: null,
    lastSeenAt: null,
  };
  const distance = miles(proximity.distanceToPickupMiles);

  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {service.status === "within" && (
        <Badge
          variant="outline"
          className="border-emerald-500/30 bg-emerald-500/5 text-[10px] font-bold text-emerald-700 dark:text-emerald-400"
        >
          <MapPin className="mr-1 size-3 shrink-0" />
          Within {service.serviceRadiusMiles ?? "saved"} mi service area
        </Badge>
      )}

      {service.status === "outside" && (
        <Badge
          variant="outline"
          className="border-amber-500/30 bg-amber-500/5 text-[10px] font-bold text-amber-700 dark:text-amber-400"
        >
          <MapPin className="mr-1 size-3 shrink-0" />
          Outside {service.serviceRadiusMiles ?? "saved"} mi service area
        </Badge>
      )}

      {showUnknown && service.status === "unknown" && (
        <Badge
          variant="outline"
          className="border-border/60 bg-muted/20 text-[10px] font-bold text-muted-foreground"
        >
          <MapPin className="mr-1 size-3 shrink-0" />
          Service area not verified
        </Badge>
      )}

      {route.status === "preferred" && (
        <Badge
          variant="outline"
          className="max-w-full border-violet-500/30 bg-violet-500/5 text-[10px] font-bold text-violet-700 dark:text-violet-400"
          title={route.matchedRoute || undefined}
        >
          <Route className="mr-1 size-3 shrink-0" />
          <span className="min-w-0 break-words [overflow-wrap:anywhere]">
            {route.matchLevel === "city"
              ? "Exact preferred route"
              : route.matchLevel === "mixed"
                ? "Preferred route"
                : "Preferred corridor"}
            {route.matchedRoute ? ` · ${route.matchedRoute}` : ""}
          </span>
        </Badge>
      )}

      {route.status === "not_preferred" && (
        <Badge
          variant="outline"
          className="border-border/70 bg-muted/15 text-[10px] font-bold text-muted-foreground"
        >
          <Route className="mr-1 size-3 shrink-0" />
          Route not preferred
        </Badge>
      )}

      {showUnknown && route.status === "unknown" && (
        <Badge
          variant="outline"
          className="border-border/60 bg-muted/20 text-[10px] font-bold text-muted-foreground"
        >
          <Route className="mr-1 size-3 shrink-0" />
          Route preference not configured
        </Badge>
      )}

      {distance != null ? (
        <Badge
          variant="outline"
          className="border-blue-500/30 bg-blue-500/5 text-[10px] font-bold text-blue-700 dark:text-blue-400"
        >
          <Navigation2 className="mr-1 size-3 shrink-0" />
          {proximity.approximate ? "About " : ""}
          {distance.toLocaleString()} mi from pickup
          {proximitySourceLabel(proximity.source, proximity.lastSeenAt)}
        </Badge>
      ) : showUnknown ? (
        <Badge
          variant="outline"
          className="border-border/60 bg-muted/20 text-[10px] font-bold text-muted-foreground"
        >
          <Navigation2 className="mr-1 size-3 shrink-0" />
          Pickup proximity unavailable
        </Badge>
      ) : null}
    </div>
  );
}