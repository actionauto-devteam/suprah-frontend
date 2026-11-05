"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, Clock, Lock, MessageSquareQuote } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StarRatingDisplay } from "@/components/shipment-review/StarRating";
import { useAuth } from "@/providers/AuthProvider";
import { getLoadCustomerReview } from "@/lib/api/shipmentReview";
import { formatMountainDateTime } from "@/lib/mountain-time";
import { starsLabel } from "@/lib/shipment-review";
import { userErrorMessage } from "@/lib/user-error";

// The load page, for a delivered load a portal customer follows: whether they
// confirmed they received the vehicle, and their review. Only the load's own
// dealership sees the words; drivers never see reviews.

export function LoadCustomerReviewCard({ loadId }: { loadId: string }) {
  const { getToken } = useAuth();
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["load-customer-review", loadId],
    queryFn: async () => getLoadCustomerReview(loadId, await getToken()),
    enabled: Boolean(loadId),
    retry: 1,
  });

  let body: React.ReactNode;
  if (isLoading) {
    body = <p className="text-sm text-muted-foreground">Checking the customer&apos;s confirmation…</p>;
  } else if (isError) {
    body = (
      <p role="alert" className="flex items-start gap-2 text-sm text-destructive">
        <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <span className="min-w-0 break-words">{userErrorMessage(error, "load the customer's review")}</span>
      </p>
    );
  } else if (!data) {
    body = (
      <p className="flex items-start gap-2 text-sm text-muted-foreground">
        <Clock className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <span>The customer hasn&apos;t confirmed they received the vehicle yet. They can do it from My Shipments in their portal.</span>
      </p>
    );
  } else {
    body = (
      <div className="space-y-3">
        <p className="flex items-start gap-2 text-sm text-foreground">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
          <span className="min-w-0 break-words">
            {data.customerName} confirmed they received the vehicle on {formatMountainDateTime(data.receivedAt)}.
          </span>
        </p>
        {data.reviewedAt ? (
          <div className="space-y-3 rounded-xl border border-border/50 bg-muted/20 p-3">
            {data.driverStars ? (
              <div className="space-y-1">
                <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Driver</p>
                <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-foreground">
                  <StarRatingDisplay stars={data.driverStars} />
                  {starsLabel(data.driverStars)}
                </p>
                {data.driverComment && <p className="whitespace-pre-wrap break-words text-sm text-foreground/90">{data.driverComment}</p>}
              </div>
            ) : null}
            {data.dealershipComment && (
              <div className="space-y-1">
                <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Your dealership</p>
                <p className="whitespace-pre-wrap break-words text-sm text-foreground/90">{data.dealershipComment}</p>
              </div>
            )}
            <p className="text-xs text-muted-foreground">Reviewed {formatMountainDateTime(data.reviewedAt)}.</p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No review yet. The customer can still leave one from My Shipments.</p>
        )}
        <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
          <Lock className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          <span>Only your dealership sees these words. Other dealerships only see the driver&apos;s average stars, and drivers never see reviews.</span>
        </p>
      </div>
    );
  }

  return (
    <Card className="border-border shadow-sm bg-card overflow-hidden p-0">
      <CardHeader className="p-4 border-b border-border/50 bg-muted/20">
        <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
          <MessageSquareQuote className="size-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
          Customer confirmation and review
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">{body}</CardContent>
    </Card>
  );
}
