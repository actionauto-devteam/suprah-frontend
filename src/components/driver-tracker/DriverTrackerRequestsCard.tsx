"use client";

import * as React from "react";
import {
  CheckCircle2, XCircle, Truck, MapPin, ArrowRight,
  Loader2, Clock, AlertTriangle, DollarSign, Calendar,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { trailerTypeOptions } from "@/components/driver-profile/driver-profile-constants";
import type { DriverLoadCompatibility } from "@/types/driver-tracking";
import { titleCaseDay } from "@/lib/driver-load-compatibility";
import { DriverLoadRecommendationBadges } from "@/components/driver-tracker/DriverLoadRecommendationBadges";

interface LoadRequest {
  shipmentId?: string;
  loadId?: string;
  trackingNumber?: string;
  origin: string;
  destination: string;
  trailerTypeRequired?: string;
  vehicleCount?: number;
  carrierPayAmount?: number;
  requestedPickupDate?: string;
  driverId: string;
  driverName: string;
  requestedAt: string;
  workEligible?: boolean;
  workEligibilityReason?: string | null;
  compatibility?: DriverLoadCompatibility | null;
  equipment?: {
    trailerType?: string;
    maxVehicleCapacity?: number;
    operationalStatus?: string;
    isComplianceExpired?: boolean;
    truckMake?: string;
    truckModel?: string;
    profileCompletionScore?: number;
  } | null;
}

interface DriverTrackerRequestsCardProps {
  requests: LoadRequest[];
  isLoading: boolean;
  onApprove: (loadId: string, driverId: string) => void | Promise<boolean>;
  onReject: (loadId: string, driverId: string) => void;
  approvingId: string | null;
  rejectingId: string | null;
}

const trailerLabel = (val?: string) =>
  trailerTypeOptions.find((t) => t.value === val)?.label ?? val ?? "Unknown";

const timeAgo = (d: string) => {
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

export function DriverTrackerRequestsCard({
  requests,
  isLoading,
  onApprove,
  onReject,
  approvingId,
  rejectingId,
}: DriverTrackerRequestsCardProps) {
  if (isLoading) {
    return (
      <div className="p-4 space-y-3">
        {[1, 2].map((i) => (
          <div key={i} className="p-3 rounded-xl space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-48" />
            <Skeleton className="h-8 w-full" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="divide-y divide-border/30">
      {requests.map((req) => {
        const key = `${req.loadId || req.shipmentId}-${req.driverId}`;
        const isApproving = approvingId === key;
        const isRejecting = rejectingId === key;
        const compatibility = req.compatibility ?? null;
        const trailerMatch = compatibility
          ? compatibility.trailer.status
          : req.equipment?.trailerType && req.trailerTypeRequired
            ? req.equipment.trailerType === req.trailerTypeRequired
              ? "match"
              : "mismatch"
            : "unknown";
        const capacityMatch = compatibility
          ? compatibility.capacity.status
          : req.equipment?.maxVehicleCapacity && req.vehicleCount
            ? req.equipment.maxVehicleCapacity >= req.vehicleCount
              ? "match"
              : "exceeded"
            : "unknown";
        const availabilityMatch =
          compatibility?.availability.status ?? "unknown";
        const needsReview =
          availabilityMatch === "off_schedule" || capacityMatch !== "match";

        return (
          <div key={key} className="p-3 sm:p-4 hover:bg-accent/30 transition-colors">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-4">
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-bold">{req.driverName}</p>
                    {req.equipment?.truckMake && (
                      <span className="text-[10px] text-muted-foreground">
                        {req.equipment.truckMake} {req.equipment.truckModel || ""}
                      </span>
                    )}
                    {req.equipment?.trailerType && (
                      <Badge className="text-[9px] px-1.5 py-0 bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-500/30 h-5">
                        {trailerLabel(req.equipment.trailerType)}
                      </Badge>
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground shrink-0 flex items-center gap-1">
                    <Clock className="size-2.5" />{timeAgo(req.requestedAt)}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-[11px] flex-wrap">
                  <Badge variant="outline" className="text-[10px] font-semibold shrink-0">
                    {req.trackingNumber || (req.loadId || req.shipmentId || "").slice(-8)}
                  </Badge>
                  <div className="flex items-center gap-1.5 text-muted-foreground min-w-0">
                    <MapPin className="size-3 shrink-0" />
                    <span className="min-w-0 break-words [overflow-wrap:anywhere]">{req.origin}</span>
                    <ArrowRight className="size-3 shrink-0" />
                    <span className="min-w-0 break-words [overflow-wrap:anywhere]">{req.destination}</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  <Badge className={`text-[9px] px-1.5 py-0 min-h-5 h-auto gap-0.5 whitespace-normal ${availabilityMatch === "match" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30" : availabilityMatch === "off_schedule" ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/25" : "bg-muted text-muted-foreground border-border/50"}`}>
                    {availabilityMatch === "match" ? <CheckCircle2 className="size-2.5 shrink-0" /> : availabilityMatch === "off_schedule" ? <AlertTriangle className="size-2.5 shrink-0" /> : <Calendar className="size-2.5 shrink-0" />}
                    {availabilityMatch === "match"
                      ? `Available ${titleCaseDay(compatibility?.availability.pickupDay) || ""}`.trim()
                      : availabilityMatch === "off_schedule"
                        ? `Off Schedule ${titleCaseDay(compatibility?.availability.pickupDay) || ""}`.trim()
                        : "Schedule Unknown"}
                  </Badge>
                  {trailerMatch !== "unknown" && (
                    <Badge className={`text-[9px] px-1.5 py-0 min-h-5 h-auto gap-0.5 whitespace-normal ${trailerMatch === "match" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30" : "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/25"}`}>
                      {trailerMatch === "match" ? <CheckCircle2 className="size-2.5 shrink-0" /> : <AlertTriangle className="size-2.5 shrink-0" />}
                      Trailer {trailerMatch === "match" ? "Match" : "Mismatch"}
                    </Badge>
                  )}
                  {capacityMatch === "match" ? (
                    <Badge className="text-[9px] px-1.5 py-0 min-h-5 h-auto gap-0.5 whitespace-normal bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30">
                      <CheckCircle2 className="size-2.5 shrink-0" />
                      Capacity {compatibility?.capacity.requiredVehicles ?? req.vehicleCount ?? "?"}/{compatibility?.capacity.maxVehicles ?? req.equipment?.maxVehicleCapacity ?? "?"}
                    </Badge>
                  ) : (
                    <Badge className="text-[9px] px-1.5 py-0 min-h-5 h-auto gap-0.5 whitespace-normal bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/30">
                      {capacityMatch === "exceeded" ? <XCircle className="size-2.5 shrink-0" /> : <AlertTriangle className="size-2.5 shrink-0" />}
                      {capacityMatch === "exceeded"
                        ? `Capacity ${compatibility?.capacity.requiredVehicles ?? req.vehicleCount ?? "?"}/${compatibility?.capacity.maxVehicles ?? req.equipment?.maxVehicleCapacity ?? "?"} · Exceeded`
                        : "Capacity Not Verified"}
                    </Badge>
                  )}
                  {req.workEligible === false && (
                    <Badge className="text-[9px] px-1.5 py-0 h-5 gap-0.5 bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/25">
                      <AlertTriangle className="size-2.5" />Unavailable for New Work
                    </Badge>
                  )}
                  {req.equipment?.isComplianceExpired && (
                    <Badge className="text-[9px] px-1.5 py-0 h-5 gap-0.5 bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/30">
                      <AlertTriangle className="size-2.5" />Compliance Expired
                    </Badge>
                  )}
                  {req.equipment?.profileCompletionScore != null && (
                    <Badge className="text-[9px] px-1.5 py-0 h-5 gap-0.5 bg-muted text-muted-foreground border-border/50">
                      Profile: {req.equipment.profileCompletionScore}%
                    </Badge>
                  )}
                  {req.carrierPayAmount != null && req.carrierPayAmount > 0 && (
                    <Badge className="text-[9px] px-1.5 py-0 h-5 gap-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30">
                      <DollarSign className="size-2.5" />{req.carrierPayAmount.toLocaleString()}
                    </Badge>
                  )}
                </div>

                <DriverLoadRecommendationBadges
                  compatibility={compatibility}
                  className="pt-1"
                />
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Button
                  size="sm"
                  className="h-10 sm:h-8 px-3 text-xs font-bold gap-1.5 flex-1 sm:flex-initial"
                  onClick={() => onApprove(req.loadId!, req.driverId)}
                  disabled={isApproving || isRejecting || req.workEligible === false}
                  title={req.workEligible === false ? (req.workEligibilityReason || "Driver is unavailable for new work") : undefined}
                >
                  {isApproving ? <Loader2 className="size-3.5 animate-spin" /> : needsReview ? <AlertTriangle className="size-3.5" /> : <CheckCircle2 className="size-3.5" />}
                  {needsReview ? "Review & Approve" : "Approve"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-10 sm:h-8 px-3 text-xs font-bold gap-1.5 hover:bg-red-50 hover:text-red-600 hover:border-red-200 dark:hover:bg-red-500/10 dark:hover:text-red-400 dark:hover:border-red-500/30 flex-1 sm:flex-initial"
                  onClick={() => onReject(req.loadId!, req.driverId)}
                  disabled={isApproving || isRejecting}
                >
                  {isRejecting ? <Loader2 className="size-3.5 animate-spin" /> : <XCircle className="size-3.5" />}
                  Reject
                </Button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}