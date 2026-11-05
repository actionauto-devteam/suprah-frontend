"use client";

import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, Loader2, PackageCheck, ShieldCheck, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { StarRatingDisplay, StarRatingInput } from "@/components/shipment-review/StarRating";
import { useAuth } from "@/providers/AuthProvider";
import type { CustomerShipment } from "@/lib/api/customerQuoteRequests";
import { confirmShipmentReceived, sendShipmentReview, type ShipmentReviewInput } from "@/lib/api/shipmentReview";
import {
  MAX_DEALERSHIP_COMMENT,
  MAX_DRIVER_COMMENT,
  receivedLine,
  reviewProblem,
  reviewStarted,
} from "@/lib/shipment-review";
import { userErrorMessage } from "@/lib/user-error";

// My Shipments, on a delivered shipment: "Confirm received" (which closes the
// chats with the driver and dispatcher) and the customer's one review: 1–5
// stars and words for the driver, words for the dealership.

type Mode = "confirm" | "review";

const textareaClass =
  "w-full resize-y rounded-xl border border-input bg-background px-3 py-2.5 text-base outline-none focus-visible:border-emerald-500 focus-visible:ring-2 focus-visible:ring-emerald-500/30 sm:text-sm";

function ReviewDialog({
  entry,
  mode,
  open,
  onOpenChange,
}: {
  entry: CustomerShipment;
  mode: Mode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const [review, setReview] = React.useState<ShipmentReviewInput>({ driverStars: null, driverComment: "", dealershipComment: "" });
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const idBase = React.useId();
  const dealer = entry.dealerName || "the dealership";
  const vehicle = entry.vehicleName || "vehicle";
  const driverName = entry.driver?.name || "";
  const hasDriver = Boolean(entry.driver);

  React.useEffect(() => {
    if (open) {
      setReview({ driverStars: null, driverComment: "", dealershipComment: "" });
      setError(null);
    }
  }, [open]);

  const submit = async () => {
    const withReview = mode === "review" || reviewStarted(review);
    const problem = withReview ? reviewProblem(review, hasDriver) : null;
    if (problem) {
      setError(problem);
      return;
    }
    setBusy(true);
    setError(null);
    const payload: ShipmentReviewInput = {
      ...(hasDriver && review.driverStars ? { driverStars: review.driverStars } : {}),
      ...(hasDriver && review.driverComment?.trim() ? { driverComment: review.driverComment.trim() } : {}),
      ...(review.dealershipComment?.trim() ? { dealershipComment: review.dealershipComment.trim() } : {}),
    };
    try {
      const token = await getToken();
      const result =
        mode === "confirm"
          ? await confirmShipmentReceived(entry.id, withReview ? payload : null, token)
          : await sendShipmentReview(entry.id, payload, token);
      toast.success(result.message);
      onOpenChange(false);
    } catch (err) {
      setError(userErrorMessage(err, mode === "confirm" ? "confirm you received your vehicle" : "send your review"));
    } finally {
      setBusy(false);
      void queryClient.invalidateQueries({ queryKey: ["customer-shipments"] });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !busy && onOpenChange(next)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{mode === "confirm" ? `Did you receive your ${vehicle}?` : "Review this delivery"}</DialogTitle>
          <DialogDescription>
            {mode === "confirm"
              ? `Confirming tells ${dealer} the vehicle arrived and closes your chats with the driver and dispatcher. A review is optional.`
              : `Tell ${dealer} how the delivery went. Reviews can't be changed once they're sent.`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {hasDriver && (
            <>
              <StarRatingInput
                name={`${idBase}-stars`}
                legend={`Rate your driver${driverName ? `, ${driverName}` : ""}${mode === "confirm" ? " (optional)" : ""}`}
                value={review.driverStars ?? null}
                onChange={(stars) => setReview((current) => ({ ...current, driverStars: stars }))}
                disabled={busy}
              />
              <div className="space-y-1.5">
                <label htmlFor={`${idBase}-driver`} className="text-sm font-semibold text-foreground">
                  Anything about your driver? (optional)
                </label>
                <textarea
                  id={`${idBase}-driver`}
                  rows={3}
                  maxLength={MAX_DRIVER_COMMENT}
                  value={review.driverComment ?? ""}
                  onChange={(event) => setReview((current) => ({ ...current, driverComment: event.target.value }))}
                  disabled={busy}
                  className={textareaClass}
                />
              </div>
            </>
          )}
          <div className="space-y-1.5">
            <label htmlFor={`${idBase}-dealer`} className="text-sm font-semibold text-foreground">
              Tell {dealer} about your experience (optional)
            </label>
            <textarea
              id={`${idBase}-dealer`}
              rows={3}
              maxLength={MAX_DEALERSHIP_COMMENT}
              value={review.dealershipComment ?? ""}
              onChange={(event) => setReview((current) => ({ ...current, dealershipComment: event.target.value }))}
              disabled={busy}
              className={textareaClass}
            />
          </div>
          <p className="flex items-start gap-2 rounded-xl bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
            <span>
              Your driver doesn&apos;t see your review. Only {dealer} reads what you write; other dealerships only see your
              driver&apos;s average stars. Reviews can&apos;t be changed once they&apos;re sent.
            </span>
          </p>
          {error && (
            <p role="alert" className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <span className="min-w-0 break-words">{error}</span>
            </p>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy} className="h-10 rounded-xl">
            {mode === "confirm" ? "Not yet" : "Cancel"}
          </Button>
          <Button
            type="button"
            onClick={() => void submit()}
            disabled={busy}
            className="h-10 gap-1.5 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700"
          >
            {busy && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
            {mode === "confirm" ? "Confirm received" : "Send review"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ShipmentReceivedSection({ entry }: { entry: CustomerShipment }) {
  const [mode, setMode] = React.useState<Mode | null>(null);
  if (entry.stage !== "delivered" || entry.receipt === undefined) return null;

  if (entry.receipt === "unknown") {
    return (
      <p className="text-xs text-muted-foreground">
        We couldn&apos;t check whether you confirmed this delivery. Refresh My Shipments in a moment to confirm it or leave a review.
      </p>
    );
  }

  const receipt = entry.receipt;
  return (
    <div className="space-y-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
      {!receipt ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-foreground">Got your vehicle? Confirm it arrived, and review the delivery if you like.</p>
          <Button
            type="button"
            onClick={() => setMode("confirm")}
            className="h-10 w-full shrink-0 gap-1.5 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 sm:w-auto"
          >
            <PackageCheck className="size-4" aria-hidden="true" />
            Confirm received
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 space-y-1">
            <p className="flex items-start gap-1.5 text-sm text-foreground">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
              <span>{receivedLine(receipt.receivedAt)}</span>
            </p>
            {receipt.reviewed && (
              <p className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                Thanks for your review.
                {receipt.driverStars ? <StarRatingDisplay stars={receipt.driverStars} /> : null}
              </p>
            )}
          </div>
          {!receipt.reviewed && (
            <Button type="button" variant="outline" onClick={() => setMode("review")} className="h-10 w-full shrink-0 gap-1.5 rounded-xl sm:w-auto">
              <Star className="size-4 text-amber-500" aria-hidden="true" />
              Review this delivery
            </Button>
          )}
        </div>
      )}
      <ReviewDialog entry={entry} mode={mode ?? "confirm"} open={mode !== null} onOpenChange={(next) => !next && setMode(null)} />
    </div>
  );
}
