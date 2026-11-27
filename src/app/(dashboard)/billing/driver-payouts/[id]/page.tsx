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
import { apiClient } from "@/lib/api-client";
import { initializeSocket } from "@/lib/socket.client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const cardClass = "rounded-2xl border border-border bg-card text-card-foreground";
const fieldClass =
  "w-full rounded-xl border border-input bg-background text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30";

function PayoutActionCard({ load, onPaid }: { load: Load; onPaid: () => void }) {
  const [notes, setNotes] = React.useState("");
  const [confirming, setConfirming] = React.useState(false);
  const [sending, setSending] = React.useState(false);

  // A payout follows Dispatch confirming the delivery proof.
  const isConfirmed = !!load.proofOfDelivery?.confirmedAt;
  const driver = typeof load.assignedDriverId === "object" && load.assignedDriverId ? (load.assignedDriverId as { _id?: string; name?: string }) : null;
  const driverId = driver?._id ?? (typeof load.assignedDriverId === "string" ? load.assignedDriverId : "");
  // Whether SuprahPay can pay the driver now, and how much: the load's carrier pay (2026-11-25).
  const driverPay = load.billingSummary?.driverPay ?? null;

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

  const send = async () => {
    if (!driverPay?.ok) return;
    setSending(true);
    try {
      await apiClient.post("/api/driver-payouts", {
        loadId: load._id,
        driverId,
        amount: driverPay.amount,
        ...(notes.trim() ? { notes: notes.trim() } : {}),
      });
      toast.success(`Payout sent: ${formatCurrency(driverPay.amount)} to ${driver?.name || "the driver"}.`);
      setConfirming(false);
      onPaid();
    } catch (error) {
      toast.error(userErrorMessage(error, "send this payout"));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className={cn(cardClass, "p-6")}>
      <h3 className="mb-5 flex items-center gap-2 text-lg font-bold text-foreground">
        <DollarSign className="size-[18px] text-primary" />
        Pay the Driver
      </h3>

      {!driverPay ? (
        <p className="text-[13px] text-muted-foreground">Checking whether the driver can be paid…</p>
      ) : !driverPay.ok ? (
        <div className="flex items-start gap-2 text-amber-700 dark:text-amber-400">
          <Info className="mt-0.5 size-4 shrink-0" />
          <div className="min-w-0 space-y-2">
            <p className="text-[13px] leading-relaxed break-words">{driverPay.message}</p>
            {driverPay.code === "needs_billing" && (
              <Link href={`/transportation/load/${load._id}`} className="text-[13px] font-semibold text-primary underline-offset-2 hover:underline">
                Choose who pays on the load page
              </Link>
            )}
            {driverPay.code === "awaiting_payment" && load.billing?.billTo === "dealership" && (
              <Link href="/billing" className="text-[13px] font-semibold text-primary underline-offset-2 hover:underline">
                Open Bills from Suprah
              </Link>
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Driver&apos;s pay (the load&apos;s carrier pay)</p>
            <p className="mt-1 font-mono text-2xl font-bold text-foreground">{formatCurrency(driverPay.amount)}</p>
          </div>

          <div>
            <label htmlFor="payout-notes" className="mb-2 block text-xs text-muted-foreground">
              Notes for the driver (optional)
            </label>
            <textarea
              id="payout-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="For example, thanks for the quick delivery."
              className={cn(fieldClass, "resize-none px-3.5 py-3 text-[13px]")}
            />
          </div>

          {confirming ? (
            <div role="alert" className="rounded-xl border border-primary/30 bg-primary/5 p-3.5">
              <p className="text-[13px] text-foreground break-words">
                Send {formatCurrency(driverPay.amount)} to {driver?.name || "the driver"} for load {load.loadNumber} through SuprahPay? This can&apos;t be undone.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button type="button" onClick={send} disabled={sending} className="h-11 flex-1 gap-2 rounded-xl font-bold">
                  {sending ? <Loader2 className="size-4 animate-spin" /> : <DollarSign className="size-4" />}
                  Send {formatCurrency(driverPay.amount)}
                </Button>
                <Button type="button" variant="outline" onClick={() => setConfirming(false)} disabled={sending} className="h-11 flex-1 rounded-xl">
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <Button type="button" onClick={() => setConfirming(true)} className="h-12 w-full gap-2.5 rounded-xl text-[15px] font-bold">
              <DollarSign className="size-[18px]" />
              Approve & Send Payout
            </Button>
          )}
        </div>
      )}
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
              <p className="mt-0.5 break-all font-mono text-[11px] text-primary">{load.loadNumber}</p>
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
                    <span className="min-w-0 break-words font-semibold">{v.year} {v.make} {v.model}</span>
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
                <p className="min-w-0 break-words text-base font-bold">{driver?.name || "Unassigned"}</p>
                <p className="mt-0.5 break-all text-[13px] text-muted-foreground">{driver?.email || "No email"}</p>
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
          <PayoutActionCard load={load} onPaid={() => void fetchData({ silent: true })} />

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
