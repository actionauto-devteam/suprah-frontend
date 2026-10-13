"use client";

import * as React from "react";
import Link from "next/link";
import { useAuth } from "@/providers/AuthProvider";
import { apiClient } from "@/lib/api-client";
import { DriverPayout, DeliverableLoad, DriverPayoutStats } from "@/types/driver-payout";
import { formatCurrency } from "@/utils/format";
import {
  ChevronLeft,
  RefreshCw,
  Truck,
  DollarSign,
  X,
  Package,
  FileCheck,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function ProofLightbox({ src, onClose }: { src: string; onClose: () => void }) {
  const [zoom, setZoom] = React.useState(1);
  const MIN_ZOOM = 0.5;
  const MAX_ZOOM = 5;
  const containerRef = React.useRef<HTMLDivElement>(null);
  const lastPinchDist = React.useRef<number | null>(null);
  const isTouchDevice = typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;

  const clampZoom = (z: number) => Math.min(Math.max(z, MIN_ZOOM), MAX_ZOOM);
  const zoomIn = () => setZoom((z) => clampZoom(z + 0.25));
  const zoomOut = () => setZoom((z) => clampZoom(z - 0.25));
  const reset = () => setZoom(1);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      setZoom((z) => clampZoom(z - e.deltaY * 0.001));
    };
    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  }, []);

  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 2) return;
      e.preventDefault();
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (lastPinchDist.current !== null) {
        const delta = dist - lastPinchDist.current;
        setZoom((z) => clampZoom(z + delta * 0.005));
      }
      lastPinchDist.current = dist;
    };

    const onTouchEnd = () => {
      lastPinchDist.current = null;
    };

    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd);

    return () => {
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black/90"
      onClick={onClose}
    >
      <div
        className="absolute right-3 top-3 z-[10000] flex gap-2"
        onClick={(e) => e.stopPropagation()}
      >
        {[
          { label: "-", action: zoomOut, title: "Zoom out" },
          { label: `${Math.round(zoom * 100)}%`, action: reset, title: "Reset zoom" },
          { label: "+", action: zoomIn, title: "Zoom in" },
          { label: "x", action: onClose, title: "Close" },
        ].map(({ label, action, title }) => (
          <button
            key={title}
            type="button"
            onClick={action}
            title={title}
            aria-label={title}
            className="flex h-11 min-w-11 items-center justify-center rounded-xl border border-white/15 bg-white/10 px-2 font-mono text-[15px] text-white transition-colors hover:bg-white/20"
          >
            {label}
          </button>
        ))}
      </div>

      <div
        ref={containerRef}
        className="flex h-screen w-screen touch-none items-center justify-center overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt="Proof of delivery"
          draggable={false}
          className="block max-h-[85vh] max-w-[90vw] select-none object-contain transition-transform duration-100"
          style={{ transform: `scale(${zoom})`, transformOrigin: "center center" }}
        />
      </div>

      <p className="absolute inset-x-0 bottom-4 px-4 text-center font-mono text-[11px] text-white/40">
        {isTouchDevice ? "Tap outside to close · Pinch to zoom" : "Click outside or press Esc · Scroll to zoom"}
      </p>
    </div>
  );
}

const PAYOUT_STATUS_CLASSES: Record<string, { badge: string; dot: string }> = {
  pending: { badge: "bg-amber-500/10 text-amber-700 dark:text-amber-400", dot: "bg-amber-500" },
  processing: { badge: "bg-amber-500/10 text-amber-700 dark:text-amber-400", dot: "bg-amber-500" },
  paid: { badge: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400", dot: "bg-emerald-500" },
  confirmed: { badge: "bg-blue-500/10 text-blue-700 dark:text-blue-400", dot: "bg-blue-500" },
  failed: { badge: "bg-red-500/10 text-red-700 dark:text-red-400", dot: "bg-red-500" },
  cancelled: { badge: "bg-slate-500/10 text-slate-600 dark:text-slate-400", dot: "bg-slate-400" },
};

function PayoutStatusBadge({ status }: { status: string }) {
  const c = PAYOUT_STATUS_CLASSES[status] || PAYOUT_STATUS_CLASSES.pending;
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider", c.badge)}>
      <span className={cn("size-1.5 rounded-full", c.dot)} />
      {status}
    </span>
  );
}

const fieldClass =
  "mt-1.5 block w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30";

function PayoutModal({
  target,
  onClose,
}: {
  target: DeliverableLoad;
  onClose: () => void;
  onCreated: () => void;
  getToken: () => Promise<string | null>;
}) {
  const [amount, setAmount] = React.useState(0);
  const [notes, setNotes] = React.useState("");
  const [notice, setNotice] = React.useState<string | null>(null);

  // Billing and payout processing are still in development, so this window
  // must never move money yet. It only explains that to the user.
  const handleSubmit = () => {
    setNotice(
      "Driver payouts are still being built. No payout was sent. Delivery confirmation is recorded separately on the load.",
    );
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 p-5">
      <div className="w-full max-w-[420px] rounded-2xl border border-border bg-card p-6 text-card-foreground shadow-xl">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-foreground">Send Driver Payout</h3>
            <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">{target.trackingNumber}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex size-11 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="mb-4 rounded-xl bg-muted/50 px-3.5 py-3">
          <p className="text-[13px] text-muted-foreground">Driver</p>
          <p className="mt-0.5 text-[15px] font-bold text-foreground">
            {target.assignedDriverId?.name || "Unknown Driver"}
          </p>
        </div>

        <div className="flex flex-col gap-3.5">
          <label className="text-xs text-muted-foreground">
            Payout Amount (USD) <span className="text-primary">*</span>
            <input
              type="number"
              value={amount || ""}
              onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
              placeholder="0.00"
              min="0"
              step="0.01"
              className={cn(fieldClass, "font-mono text-base")}
            />
          </label>

          <label className="text-xs text-muted-foreground">
            Notes (optional)
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Delivery bonus, route details..."
              className={cn(fieldClass, "resize-y text-[13px]")}
            />
          </label>

          {notice && <p role="status" className="text-[13px] text-amber-700 dark:text-amber-400">{notice}</p>}

          <div className="flex gap-2.5">
            <Button type="button" variant="outline" className="h-11 flex-1 rounded-xl" onClick={onClose}>
              Cancel
            </Button>
            <Button type="button" className="h-11 flex-[2] gap-2 rounded-xl font-bold" onClick={handleSubmit}>
              <DollarSign className="size-3.5" />
              Send Payout
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DriverPayoutsPage() {
  const { getToken } = useAuth();
  const [deliverableLoads, setDeliverableLoads] = React.useState<DeliverableLoad[]>([]);
  const [pendingProofs, setPendingProofs] = React.useState<any[]>([]);
  const [payouts, setPayouts] = React.useState<DriverPayout[]>([]);
  const [payoutStats, setPayoutStats] = React.useState<DriverPayoutStats | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [payoutTarget, setPayoutTarget] = React.useState<DeliverableLoad | null>(null);
  const [lightboxSrc, setLightboxSrc] = React.useState<string | null>(null);
  const [tab, setTab] = React.useState<"pending-proofs" | "deliverable" | "history">("pending-proofs");

  const authHeaders = React.useCallback(async () => {
    const token = await getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, [getToken]);

  const fetchData = React.useCallback(async () => {
    setLoading(true);
    try {
      const headers = await authHeaders();
      const [dRes, ppRes, pRes, sRes] = await Promise.all([
        apiClient.get("/api/driver-payouts/deliverable", { headers }),
        apiClient.get("/api/driver-payouts/pending-proofs", { headers }),
        apiClient.get("/api/driver-payouts", { headers }),
        apiClient.get("/api/driver-payouts/stats", { headers }),
      ]);
      setDeliverableLoads(dRes.data.data || []);
      setPendingProofs(ppRes.data.data || []);
      setPayouts(pRes.data.data || []);
      setPayoutStats(sRes.data.data || null);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [authHeaders]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const loader = (
    <div className="py-12 text-center">
      <RefreshCw className="mx-auto size-5 animate-spin text-muted-foreground" />
    </div>
  );

  const loadIdLabel = (
    <p className="font-mono text-[10px] tracking-wider text-muted-foreground">LOAD #</p>
  );

  return (
    <>
      <div className="min-h-full bg-background text-foreground">
        <div className="mx-auto max-w-[1100px] px-4 pb-16 pt-7 sm:px-5">
          <div className="mb-7 flex flex-wrap items-center gap-3.5">
            <Link
              href="/billing"
              className="flex min-h-11 items-center gap-1.5 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
            >
              <ChevronLeft className="size-4" /> Dashboard
            </Link>
            <span className="text-muted-foreground/50">›</span>
            <h1 className="text-[22px] font-bold text-foreground">Driver Payouts</h1>
          </div>

          <div className="mb-6 grid grid-cols-[repeat(auto-fill,minmax(130px,1fr))] gap-2">
            {[
              { label: "Total Paid Out", val: formatCurrency(payoutStats?.totalPaid ?? 0), color: "text-emerald-600 dark:text-emerald-400" },
              { label: "Pending Payouts", val: formatCurrency(payoutStats?.totalPending ?? 0), color: "text-amber-600 dark:text-amber-400" },
              { label: "Deliverable Loads", val: String(deliverableLoads.length), color: "text-primary" },
              { label: "All Payouts", val: String(payouts.length), color: "text-blue-600 dark:text-blue-400" },
            ].map(({ label, val, color }) => (
              <div key={label} className="rounded-xl border border-border bg-card px-4 py-3.5">
                <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
                <p className={cn("mt-1.5 text-[22px] font-bold", color)}>{val}</p>
              </div>
            ))}
          </div>

          <div className="mb-4 flex w-full gap-1 overflow-x-auto rounded-xl border border-border bg-muted/40 p-1">
            {([
              ["pending-proofs", "Pending Proofs", FileCheck, pendingProofs.length],
              ["deliverable", "Ready to Pay", Truck, deliverableLoads.length],
              ["history", "Payout History", DollarSign, 0],
            ] as ["pending-proofs" | "deliverable" | "history", string, any, number][]).map(([key, label, Icon, count]) => (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                aria-pressed={tab === key}
                className={cn(
                  "flex min-h-11 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-3.5 text-[13px] font-semibold transition-colors",
                  tab === key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="size-3.5 shrink-0" />
                <span>{label}</span>
                {count > 0 && (
                  <span
                    className={cn(
                      "rounded-lg px-1.5 py-px font-mono text-[10px]",
                      tab === key ? "bg-black/15 text-primary-foreground" : "bg-primary/15 text-primary",
                    )}
                  >
                    {count}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="mb-3.5 flex justify-end">
            <Button type="button" variant="outline" size="sm" className="min-h-11 gap-1.5 rounded-xl text-xs" onClick={fetchData}>
              <RefreshCw className="size-3.5" /> Refresh
            </Button>
          </div>

          {tab === "pending-proofs" &&
            (loading ? (
              loader
            ) : pendingProofs.length === 0 ? (
              <div className="rounded-2xl border border-border bg-card px-5 py-14 text-center">
                <FileCheck className="mx-auto mb-3.5 size-9 text-muted-foreground/30" />
                <p className="text-base font-semibold text-foreground">No pending proofs</p>
                <p className="text-[13px] text-muted-foreground">Drivers will submit proofs of delivery directly to you here.</p>
              </div>
            ) : (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,300px),1fr))] gap-3">
                {pendingProofs.map((item: any) => (
                  <div key={item._id} className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-[18px]">
                    <div className="flex items-start justify-between">
                      <div>
                        {loadIdLabel}
                        <p className="mt-0.5 font-mono text-[13px] text-foreground">{item.loadNumber || item.trackingNumber}</p>
                      </div>
                      <div className="flex size-[34px] items-center justify-center rounded-lg bg-blue-500/10">
                        <FileCheck className="size-4 text-blue-600 dark:text-blue-400" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-[11px] text-muted-foreground">Driver</p>
                        <p className="mt-0.5 text-[13px] font-bold text-foreground">{item.assignedDriverId?.name || "-"}</p>
                      </div>
                      <div>
                        <p className="text-[11px] text-muted-foreground">Submitted</p>
                        <p className="mt-0.5 text-[13px] text-foreground/80">
                          {item.proofOfDelivery?.submittedAt ? new Date(item.proofOfDelivery.submittedAt).toLocaleDateString() : "-"}
                        </p>
                      </div>
                    </div>

                    {item.proofOfDelivery?.note && (
                      <p className="rounded-lg bg-muted/50 px-2.5 py-2 text-xs text-muted-foreground">
                        {item.proofOfDelivery.note}
                      </p>
                    )}
                    <Button asChild className="min-h-11 w-full gap-1.5 rounded-xl text-xs font-bold">
                      <Link href={`/billing/driver-payouts/${item._id}`}>
                        <Eye className="size-3.5" />
                        Review Proof & Payout
                      </Link>
                    </Button>
                  </div>
                ))}
              </div>
            ))}

          {tab === "deliverable" &&
            (loading ? (
              loader
            ) : deliverableLoads.length === 0 ? (
              <div className="rounded-2xl border border-border bg-card px-5 py-14 text-center">
                <Package className="mx-auto mb-3.5 size-9 text-muted-foreground/30" />
                <p className="text-base font-semibold text-foreground">No deliverable loads</p>
                <p className="text-[13px] text-muted-foreground">Delivered loads appear here once you confirm their proof of delivery (Pending Proofs).</p>
              </div>
            ) : (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,280px),1fr))] gap-3">
                {deliverableLoads.map((s) => (
                  <div key={s._id} className="flex flex-col gap-3.5 rounded-2xl border border-border bg-card p-[18px]">
                    <div className="flex items-start justify-between">
                      <div>
                        {loadIdLabel}
                        <p className="mt-0.5 font-mono text-[13px] text-foreground">{s.loadNumber || s.trackingNumber}</p>
                      </div>
                      <div className="flex size-[34px] items-center justify-center rounded-lg bg-primary/10">
                        <Truck className="size-4 text-primary" />
                      </div>
                    </div>

                    <div>
                      <p className="text-xs text-muted-foreground">Driver</p>
                      <p className="mt-0.5 text-[15px] font-bold text-foreground">{s.assignedDriverId?.name || "-"}</p>
                    </div>
                    <Button asChild className="min-h-11 w-full gap-1.5 rounded-xl text-xs font-bold">
                      <Link href={`/billing/driver-payouts/${s._id}`}>
                        <DollarSign className="size-3.5" />
                        Process Payout
                      </Link>
                    </Button>
                  </div>
                ))}
              </div>
            ))}

          {tab === "history" && (
            <div className="overflow-hidden rounded-2xl border border-border bg-card">
              <div className="overflow-x-auto">
                <div className="grid min-w-[480px] grid-cols-[1fr_1fr_auto_auto] gap-3 border-b border-border px-4 py-3">
                  {["Driver", "Load", "Amount", "Status"].map((h) => (
                    <span key={h} className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{h}</span>
                  ))}
                </div>

                {loading ? (
                  loader
                ) : payouts.length === 0 ? (
                  <p className="py-10 text-center text-sm text-muted-foreground">No payouts yet</p>
                ) : (
                  payouts.map((p) => (
                    <div key={p._id} className="grid min-w-[480px] grid-cols-[1fr_1fr_auto_auto] items-center gap-3 border-b border-border px-4 py-3.5 last:border-b-0">
                      <div>
                        <p className="text-sm font-semibold text-foreground">{(p.driverId as any)?.name || "-"}</p>
                        <p className="font-mono text-[11px] text-muted-foreground">{new Date(p.createdAt || "").toLocaleDateString()}</p>
                      </div>
                      <p className="font-mono text-xs text-muted-foreground">{(p.loadId as any)?.loadNumber || (p.loadId as any)?.trackingNumber || "-"}</p>
                      <p className="font-mono text-sm font-bold text-foreground">{formatCurrency(p.amount)}</p>
                      <PayoutStatusBadge status={p.status} />
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {payoutTarget && (
        <PayoutModal target={payoutTarget} onClose={() => setPayoutTarget(null)} onCreated={fetchData} getToken={getToken} />
      )}
      {lightboxSrc && <ProofLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />}
    </>
  );
}
