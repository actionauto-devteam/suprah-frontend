"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, CalendarClock, Car, CheckCircle2, Circle, CircleDot, Loader2, MapPin, RefreshCw, ShoppingBag, Store, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/providers/AuthProvider";
import { getMyShipments, type CustomerShipment } from "@/lib/api/customerQuoteRequests";
import {
  SHIPMENT_STAGE_META,
  formatExpectedByDate,
  formatShipmentDate,
  formatShipmentPrice,
  shipmentSteps,
  type ShipmentStageMeta,
} from "@/lib/customer-shipments";
import { userErrorMessage } from "@/lib/user-error";
import { cn, resolveImageUrl } from "@/lib/utils";

// ─── My Shipments ─────────────────────────────────────────────────────────────
// The shipping requests this customer sent from Shop, Wishlist or Compare, and
// how each shipment is going. No driver details or location are shown.

const TONE_CLASSES: Record<ShipmentStageMeta["tone"], string> = {
  waiting: "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300",
  progress: "border-sky-500/30 bg-sky-500/10 text-sky-800 dark:text-sky-300",
  done: "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300",
  stopped: "border-red-500/30 bg-red-500/10 text-red-800 dark:text-red-300",
};

function ShipmentCard({ entry }: { entry: CustomerShipment }) {
  const meta = SHIPMENT_STAGE_META[entry.stage];
  const steps = shipmentSteps(entry);
  const price = formatShipmentPrice(entry.rate);
  const eta = entry.eta && entry.eta.min > 0 ? `${entry.eta.min}–${entry.eta.max} days` : "";
  const expectedBy = formatExpectedByDate(entry.shipment?.expectedBy);
  const image = entry.vehicleImage ? resolveImageUrl(entry.vehicleImage) : "";

  return (
    <li className="overflow-hidden rounded-2xl border border-border/50 bg-card dark:bg-zinc-900/60">
      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:p-5">
        <div className="relative h-36 w-full shrink-0 overflow-hidden rounded-xl bg-muted sm:h-28 sm:w-40">
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element -- listing photo from the dealership's feed
            <img src={image} alt={entry.vehicleName || "Vehicle"} className="h-full w-full object-cover" loading="lazy" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
              <Car className="size-8" aria-hidden="true" />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <h2 className="break-words text-base font-black leading-tight text-foreground sm:text-lg">
                {entry.vehicleName || "Vehicle"}
              </h2>
              <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                {entry.dealerName && (
                  <span className="inline-flex min-w-0 items-center gap-1">
                    <Store className="size-3.5 shrink-0" aria-hidden="true" />
                    <span className="break-words">{entry.dealerName}</span>
                  </span>
                )}
                {entry.deliveryAddress && (
                  <span className="inline-flex min-w-0 items-center gap-1">
                    <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
                    <span className="break-words [overflow-wrap:anywhere]">To {entry.deliveryAddress}</span>
                  </span>
                )}
              </p>
            </div>
            <span className={cn("shrink-0 rounded-full border px-2.5 py-1 text-xs font-bold", TONE_CLASSES[meta.tone])}>
              {meta.label}
            </span>
          </div>

          <p className="text-sm text-foreground/90">{meta.description}</p>

          {expectedBy && (
            <p className="flex items-center gap-1.5 text-sm text-foreground/90">
              <CalendarClock className="size-4 shrink-0 text-sky-600 dark:text-sky-400" aria-hidden="true" />
              <span>
                Expected by <span className="font-bold text-foreground">{expectedBy}</span>
              </span>
            </p>
          )}

          {entry.stage === "cancelled" && entry.shipment?.cancelReason && (
            <p className="text-sm text-red-800 dark:text-red-300">Reason: {entry.shipment.cancelReason}</p>
          )}

          {entry.stage === "declined" && entry.declineReason && (
            <p className="break-words text-sm text-red-800 dark:text-red-300">Reason: {entry.declineReason}</p>
          )}

          {steps && (
            <ol className="grid grid-cols-4 gap-1" aria-label="Shipment progress">
              {steps.map((step) => (
                <li key={step.key} className="min-w-0">
                  <div className="flex items-center gap-1">
                    {step.state === "done" ? (
                      <CheckCircle2 className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                    ) : step.state === "current" ? (
                      <CircleDot className="size-4 shrink-0 text-sky-600 dark:text-sky-400" aria-hidden="true" />
                    ) : (
                      <Circle className="size-4 shrink-0 text-muted-foreground/50" aria-hidden="true" />
                    )}
                    <span
                      className={cn(
                        "truncate text-[11px] font-bold sm:text-xs",
                        step.state === "upcoming" ? "text-muted-foreground" : "text-foreground",
                      )}
                    >
                      {step.label}
                      <span className="sr-only">
                        {step.state === "done" ? " (done)" : step.state === "current" ? " (current step)" : " (not yet)"}
                      </span>
                    </span>
                  </div>
                  {step.at && (
                    <p className="mt-0.5 truncate pl-5 text-[10px] text-muted-foreground sm:text-[11px]">
                      {formatShipmentDate(step.at)}
                    </p>
                  )}
                </li>
              ))}
            </ol>
          )}

          <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-border/40 pt-2 text-xs text-muted-foreground">
            {price && (
              <span>
                Estimated shipping <span className="font-bold text-foreground">{price}</span>
                {eta ? ` · ${eta}` : ""}
              </span>
            )}
            {entry.shipment?.number && (
              <span>
                Shipment <span className="font-mono font-bold text-foreground">{entry.shipment.number}</span>
              </span>
            )}
            {entry.requestedAt && <span>Requested {formatShipmentDate(entry.requestedAt)}</span>}
          </div>
        </div>
      </div>
    </li>
  );
}

export default function MyShipmentsPage() {
  const { getToken } = useAuth();
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["customer-shipments"],
    queryFn: async () => getMyShipments(await getToken()),
    // Shipment steps happen during the day; keep the page current while it's open.
    refetchInterval: 120_000,
    refetchOnWindowFocus: true,
    retry: 1,
  });
  const shipments = data ?? [];

  return (
    <div className="mx-auto flex min-h-full w-full max-w-5xl flex-col space-y-4 sm:space-y-5">
      <div className="relative overflow-hidden rounded-2xl border border-border/40 bg-card dark:bg-zinc-900/60">
        <div className="absolute left-0 right-0 top-0 h-0.5 bg-linear-to-r from-emerald-500 via-emerald-400 to-emerald-500/0" />
        <div className="relative flex flex-col gap-3 px-5 py-5 sm:flex-row sm:items-end sm:justify-between sm:px-7 sm:py-6">
          <div className="min-w-0 space-y-2">
            <div className="flex items-center gap-2">
              <Truck className="size-3.5 shrink-0 text-emerald-500" aria-hidden="true" />
              <span className="text-[10px] font-black uppercase tracking-[0.25em] text-emerald-600 dark:text-emerald-400">
                Shipping
              </span>
            </div>
            <h1 className="text-3xl font-black uppercase leading-none tracking-tight text-foreground sm:text-4xl">
              My <span className="text-emerald-500">Shipments</span>
            </h1>
            <p className="max-w-xl text-sm text-muted-foreground">
              The shipping quotes you asked for and how each shipment is going. You&apos;ll also get a notification at
              every step.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void refetch()}
            disabled={isFetching}
            className="h-9 shrink-0 gap-1.5 self-start rounded-xl text-xs font-semibold sm:self-auto"
          >
            {isFetching ? <Loader2 className="size-3.5 animate-spin" aria-hidden="true" /> : <RefreshCw className="size-3.5" aria-hidden="true" />}
            Refresh
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-3 rounded-2xl border border-border/50 bg-card px-4 py-6 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin text-emerald-500" aria-hidden="true" />
          Loading your shipments…
        </div>
      ) : isError ? (
        <div role="alert" className="flex flex-col gap-3 rounded-2xl border border-destructive/20 bg-destructive/5 px-4 py-5 text-sm sm:flex-row sm:items-center sm:justify-between">
          <span className="flex items-start gap-2 text-destructive">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span className="min-w-0 break-words">{userErrorMessage(error, "load your shipments")}</span>
          </span>
          <Button type="button" variant="outline" size="sm" onClick={() => void refetch()} className="h-9 shrink-0 rounded-xl">
            Try again
          </Button>
        </div>
      ) : shipments.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border/60 bg-card px-6 py-10 text-center">
          <Truck className="size-8 text-emerald-500" aria-hidden="true" />
          <div>
            <p className="text-base font-bold text-foreground">No shipping requests yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Ask for a shipping quote on any vehicle in Shop, and you can follow it here.
            </p>
          </div>
          <Button asChild className="h-10 gap-1.5 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700">
            <Link href="/customer/shop">
              <ShoppingBag className="size-4" aria-hidden="true" />
              Shop vehicles
            </Link>
          </Button>
        </div>
      ) : (
        <ul className="space-y-3" aria-label="Your shipments">
          {shipments.map((entry) => (
            <ShipmentCard key={entry.id} entry={entry} />
          ))}
        </ul>
      )}
    </div>
  );
}
