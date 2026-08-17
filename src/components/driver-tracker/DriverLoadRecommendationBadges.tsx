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
          {distance.toLocaleString()} mi from pickup
          {proximity.source === "live_gps"
            ? " · Live GPS"
            : proximity.source === "home_base"
              ? " · Home base"
              : ""}
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