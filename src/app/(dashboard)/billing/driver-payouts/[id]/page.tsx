"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";
import { getLoadById, confirmLoadDelivery } from "@/lib/api/loads";
import { Load } from "@/types/load";
import { formatCurrency } from "@/utils/format";
import {
  ChevronLeft, RefreshCw, Truck, CheckCircle2,
  DollarSign, Loader2, FileCheck, Eye,
  MapPin, Package, AlertCircle, Info,
} from "lucide-react";
import { toast } from "sonner";
import { userErrorMessage } from "@/lib/user-error";
import { initializeSocket } from "@/lib/socket.client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const PAYOUT_IN_DEVELOPMENT_MESSAGE =
  "Driver payouts are still being built. No payout was sent. Delivery confirmation is recorded separately.";

const cardClass = "rounded-2xl border border-border bg-card text-card-foreground";
const fieldClass =
  "w-full rounded-xl border border-input bg-background text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30";

function PayoutActionCard({ load }: { load: Load }) {
  const [amount, setAmount] = React.useState(load.pricing?.carrierPayAmount || 0);
  const [notes, setNotes] = React.useState("");
  const [showNotice, setShowNotice] = React.useState(false);

  // Billing and payout processing are still in development, so this button
  // must never move money yet. It only explains that to the dispatcher.
  const handleSubmit = () => {
    setShowNotice(true);
    toast.info("Payout feature is still in development", {
      description: PAYOUT_IN_DEVELOPMENT_MESSAGE,
    });
  };

  // A payout follows Dispatch confirming the delivery proof.
  const isConfirmed = !!load.proofOfDelivery?.confirmedAt;

  if (!isConfirmed) {
    return (
      <div className="rounded-2xl border border-amber-500/25 bg-amber-500/5 p-5">
        <div className="flex gap-3">
          <AlertCircle className="size-5 shrink-0 text-amber-600 dark:text-amber-400" />
          <div>
            <h4 className="text-base font-bold text-foreground">Pending Confirmation</h4>
            <p className="mt-1 text-[13px] text-muted-foreground">
              You must confirm the delivery proof before you can initiate a payout.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(cardClass, "p-6")}>
      <h3 className="mb-5 flex items-center gap-2 text-lg font-bold text-foreground">
        <DollarSign className="size-[18px] text-primary" />
        Process Payout
      </h3>

      <div className="flex flex-col gap-4">
        <div>
          <label htmlFor="payout-amount" className="mb-2 block text-xs text-muted-foreground">
            Payout Amount (USD) <span className="text-primary">*</span>
          </label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono text-muted-foreground">$</span>
            <input
              id="payout-amount"
              type="number"
              value={amount || ""}
              onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
              placeholder="0.00"
              className={cn(fieldClass, "py-3 pl-7 pr-3.5 font-mono text-base")}
            />
          </div>
          <p className="mt-1.5 font-mono text-[11px] text-muted-foreground">
            Carrier Pay: {formatCurrency(load.pricing?.carrierPayAmount || 0)}
          </p>
        </div>

        <div>
          <label htmlFor="payout-notes" className="mb-2 block text-xs text-muted-foreground">
            Notes for Driver
          </label>
          <textarea
            id="payout-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Add any internal or driver-facing notes..."
            className={cn(fieldClass, "resize-none px-3.5 py-3 text-[13px]")}
          />
        </div>

        {showNotice && (
          <div role="status" className="flex items-start gap-2 text-amber-700 dark:text-amber-400">
            <Info className="mt-0.5 size-3.5 shrink-0" />
            <p className="text-[13px]">{PAYOUT_IN_DEVELOPMENT_MESSAGE}</p>
          </div>
        )}

        <Button type="button" onClick={handleSubmit} className="h-12 w-full gap-2.5 rounded-xl text-[15px] font-bold">
          <DollarSign className="size-[18px]" />
          Approve & Send Payout
        </Button>
      </div>
    </div>
  );
}

export default function PayoutDetailPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const { getToken } = useAuth();

  const [load, setLoad] = React.useState<Load | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [actionLoading, setActionLoading] = React.useState(false);
  const [zoomImage, setZoomImage] = React.useState(false);

  // A silent refresh (live update) keeps the page on screen instead of
  // showing the full-page loader, and stays quiet if it fails.
  const fetchData = React.useCallback(async (options?: { silent?: boolean }) => {
    const silent = options?.silent === true;
    if (!silent) setLoading(true);
    try {
      const data = await getLoadById(id);
      setLoad(data);
    } catch (e) {
      console.error(e);
      if (!silent) toast.error("We couldn't load payout details. Please try again.");
    } finally {
      if (!silent) setLoading(false);
    }
  }, [id]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Live updates: a new pickup or delivery photo, a load edit or a delivery
  // confirmation (by anyone) shows here without a manual refresh. Also
  // catches up after a lost connection and when the tab is shown again.
  React.useEffect(() => {
    let active = true;
    let socket: ReturnType<typeof initializeSocket> | null = null;
    const refresh = () => {
      if (active) void fetchData({ silent: true });
    };
    const onLoadChange = (payload?: { loadId?: string }) => {
      if (String(payload?.loadId ?? "") === String(id)) refresh();
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") refresh();
    };

    void (async () => {
      const token = await getToken();
      if (!token || !active) return;
      socket = initializeSocket(token);
      socket.on("load:change", onLoadChange);
      socket.on("connect", refresh);
    })();
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      active = false;
      socket?.off("load:change", onLoadChange);
      socket?.off("connect", refresh);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [fetchData, getToken, id]);

  const handleConfirmDelivery = async () => {
    // Already confirmed: nothing to do (the button is disabled too).
    if (actionLoading || load?.proofOfDelivery?.confirmedAt) return;
    setActionLoading(true);
    try {
      const { message } = await confirmLoadDelivery(id);
      if (/already confirmed/i.test(message)) {
        toast.info("Delivery already confirmed");
      } else {
        toast.success("Delivery confirmed. The driver has been notified.");
      }
      void fetchData({ silent: true });
    } catch (e: any) {
      toast.error(userErrorMessage(e, "confirm this delivery"));
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <RefreshCw className="size-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!load) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-background text-foreground">
        <AlertCircle className="size-12 text-muted-foreground/30" />
        <h2 className="text-xl font-bold">Load not found</h2>
        <Link href="/billing/driver-payouts" className="flex min-h-11 items-center font-semibold text-primary hover:underline">
          Return to Payouts
        </Link>
      </div>
    );
  }

  const driver = typeof load.assignedDriverId === "object" ? load.assignedDriverId : null;
  const confirmedAt = load.proofOfDelivery?.confirmedAt;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <div className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-3 px-4 py-3 sm:px-5 sm:py-4">
          <div className="flex min-w-0 items-center gap-3 sm:gap-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex min-h-11 items-center gap-1 rounded-lg px-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <ChevronLeft className="size-5" />
              <span>Back</span>
            </button>
            <div className="h-6 w-px bg-border" />
            <div className="min-w-0">
              <h1 className="text-lg font-bold sm:text-xl">Review Payout</h1>
              <p className="mt-0.5 truncate font-mono text-[11px] text-primary">{load.loadNumber}</p>
            </div>
          </div>

          <div className="shrink-0 text-right">
            <p className="text-xs text-muted-foreground">Status</p>
            <div className="mt-0.5 flex items-center justify-end gap-1.5">
              <span className={cn("size-1.5 rounded-full", load.status === "Delivered" ? "bg-emerald-500" : "bg-amber-500")} />
              <span className="text-sm font-semibold">{load.status}</span>
            </div>
          </div>
        </div>
      </div>

      <main className="mx-auto grid max-w-[1200px] grid-cols-1 gap-8 px-4 py-8 sm:px-5 min-[900px]:grid-cols-[1fr_380px]">
        {/* Left Content: POD & Details */}
        <div className="flex min-w-0 flex-col gap-8">
          {/* Proof of Delivery Section */}
          <section>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h2 className="flex items-center gap-2.5 text-lg font-bold">
                <FileCheck className="size-5 text-primary" />
                Proof of Delivery
              </h2>
              {load.proofOfDelivery?.submittedAt && (
                <span className="font-mono text-[11px] text-muted-foreground">
                  Submitted: {new Date(load.proofOfDelivery.submittedAt).toLocaleString()}
                </span>
              )}
            </div>

            {load.proofOfDelivery?.imageUrl ? (
              <div className={cn(cardClass, "relative overflow-hidden")}>
                <button
                  type="button"
                  onClick={() => setZoomImage(!zoomImage)}
                  aria-label={zoomImage ? "Show smaller photo" : "Show full-size photo"}
                  aria-pressed={zoomImage}
                  className={cn(
                    "relative flex w-full items-center justify-center bg-black transition-all duration-300",
                    zoomImage ? "h-auto cursor-zoom-out" : "h-[500px] max-h-[600px] cursor-zoom-in",
                  )}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={load.proofOfDelivery.imageUrl}
                    alt="Proof of Delivery"
                    className="h-full w-full object-contain"
                  />
                  {!zoomImage && (
                    <span className="pointer-events-none absolute bottom-5 right-5 flex items-center gap-2 rounded-xl bg-black/60 px-3 py-2 text-xs text-white backdrop-blur-sm">
                      <Eye className="size-3.5" />
                      Click to Expand
                    </span>
                  )}
                </button>

                {load.proofOfDelivery.note && (
                  <div className="border-t border-border bg-muted/30 p-6">
                    <p className="mb-2 font-mono text-xs uppercase tracking-wider text-muted-foreground">Driver Note</p>
                    <p className="text-[15px] leading-relaxed">{load.proofOfDelivery.note}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex h-[300px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-card">
                <Package className="size-10 text-muted-foreground/30" />
                <p className="text-muted-foreground">No proof of delivery uploaded yet</p>
              </div>
            )}
          </section>

          {/* Load Overview */}
          <section className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div className={cn(cardClass, "p-5")}>
              <h3 className="mb-4 text-sm font-bold text-muted-foreground">Origin</h3>
              <div className="flex gap-3">
                <MapPin className="size-[18px] shrink-0 text-primary" />
                <div className="min-w-0">
                  <p className="text-[15px] font-semibold">{load.pickupLocation.city}, {load.pickupLocation.state}</p>
                  <p className="mt-1 text-[13px] text-muted-foreground">{load.pickupLocation.street}</p>
                </div>
              </div>
            </div>
            <div className={cn(cardClass, "p-5")}>
              <h3 className="mb-4 text-sm font-bold text-muted-foreground">Destination</h3>
              <div className="flex gap-3">
                <MapPin className="size-[18px] shrink-0 text-emerald-600 dark:text-emerald-400" />
                <div className="min-w-0">
                  <p className="text-[15px] font-semibold">{load.deliveryLocation.city}, {load.deliveryLocation.state}</p>
                  <p className="mt-1 text-[13px] text-muted-foreground">{load.deliveryLocation.street}</p>
                </div>
              </div>
            </div>
          </section>

          {/* Vehicle List */}
          <section className={cn(cardClass, "p-5")}>
            <h3 className="mb-4 text-sm font-bold text-muted-foreground">Vehicles ({load.vehicles.length})</h3>
            <div className="flex flex-col gap-3">
              {load.vehicles.map((v, i) => (
                <div key={i} className="flex items-center justify-between gap-3 rounded-xl bg-muted/40 px-3.5 py-2.5">
                  <div className="flex min-w-0 items-center gap-3">
                    <Truck className="size-4 shrink-0 text-muted-foreground" />
                    <span className="truncate font-semibold">{v.year} {v.make} {v.model}</span>
                  </div>
                  <span className="shrink-0 font-mono text-[11px] text-muted-foreground">{v.vin || "NO VIN"}</span>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Right Content: Sidebar Actions */}
        <div className="flex min-w-0 flex-col gap-6">
          {/* Driver Card */}
          <div className={cn(cardClass, "p-5")}>
            <p className="mb-3 font-mono text-xs uppercase tracking-wider text-muted-foreground">Assigned Driver</p>
            <div className="flex items-center gap-3">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary text-lg font-bold text-primary-foreground">
                {driver?.name?.[0] || "?"}
              </div>
              <div className="min-w-0">
                <p className="truncate text-base font-bold">{driver?.name || "Unassigned"}</p>
                <p className="mt-0.5 truncate text-[13px] text-muted-foreground">{driver?.email || "No email"}</p>
              </div>
            </div>
          </div>

          {/* Approval Action */}
          {/* Delivery confirmation is separate from payout: the driver
              completes delivery, then Dispatch confirms the proof here. */}
          {load.proofOfDelivery?.imageUrl && (
            <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/5 p-5">
              <h4 className="mb-3 flex items-center gap-2 text-[15px] font-bold">
                <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
                {confirmedAt ? "Delivery Confirmed" : "Verify Proof"}
              </h4>
              <p className="mb-5 text-[13px] leading-relaxed text-muted-foreground">
                {confirmedAt
                  ? `Confirmed on ${new Date(confirmedAt).toLocaleString()}.`
                  : "Confirm that the proof of delivery is valid and the vehicle has been received by the customer."}
              </p>
              {/* Once confirmed, the button turns grey and can't be pressed
                  again, so Dispatch can see at a glance it's done. */}
              <Button
                type="button"
                onClick={handleConfirmDelivery}
                disabled={actionLoading || Boolean(confirmedAt)}
                aria-disabled={actionLoading || Boolean(confirmedAt)}
                className={cn(
                  "h-11 w-full gap-2 rounded-xl text-sm font-bold",
                  confirmedAt && "bg-muted text-muted-foreground disabled:opacity-100",
                )}
              >
                {actionLoading ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
                {confirmedAt ? "Delivery Confirmed" : "Confirm Delivery"}
              </Button>
            </div>
          )}

          {/* Payout Action */}
          <PayoutActionCard load={load} />

          {/* Quick Links */}
          <Button asChild variant="outline" className="h-11 w-full gap-2 rounded-xl text-[13px] font-semibold">
            <Link href={`/transportation/load/${load._id}`}>
              <Info className="size-3.5" />
              View Original Load
            </Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
