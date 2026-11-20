"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  Receipt,
  Loader2,
  CheckCircle2,
  Clock,
  XCircle,
  RefreshCw,
  CreditCard,
  Wallet,
  AlertCircle,
  Package,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { apiClient } from "@/lib/api-client";
import { fmtDateMDT } from "@/lib/timezone";
import { useAlert } from "@/components/AlertDialog";
import { userErrorMessage } from "@/lib/user-error";
import { isPartlyRefunded, refundedSoFar } from "@/lib/payment-refunds";
import { invoiceMoney, isDiscountLine, savedLineDetail } from "@/lib/invoice-lines";
import { paymentPurposeLabel } from "@/lib/payment-purpose";

// --- Types --------------------------------------------------------------------

interface LineItem {
  label: string;
  kind: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}
interface PaymentInvoice {
  _id: string;
  invoiceNumber?: string;
  description: string;
  amount: number;
  subtotal?: number;
  taxRate?: number;
  taxAmount?: number;
  lineItems?: LineItem[];
  currency: string;
  status: "pending" | "processing" | "succeeded" | "failed" | "refunded" | "cancelled";
  source?: "manual" | "aftermarket";
  dueDate?: string;
  paidAt?: string;
  receiptUrl?: string;
  /** Refunded so far; a partly refunded invoice stays "succeeded". */
  refundedAmount?: number;
  createdAt: string;
  aftermarketProductId?: { name?: string; media?: { url?: string } } | string;
  /** The dealership's note to the customer, shown on the invoice. */
  customerNote?: string;
  /** Which dealership sent it, and what it's for (2026-11-21). */
  dealershipName?: string;
  purpose?: string;
}
interface MyPaymentsResponse {
  payments: PaymentInvoice[];
  stats: { totalOwed: number; totalPaid: number; pendingCount: number };
}

// --- Helpers ------------------------------------------------------------------

function money(n?: number | null) {
  return `$${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function fmtDate(d?: string) {
  return d ? fmtDateMDT(d) : "";
}

const STATUS_META: Record<
  PaymentInvoice["status"],
  { label: string; icon: LucideIcon; cls: string }
> = {
  pending: { label: "Due", icon: Clock, cls: "bg-chart-2/15 text-chart-2" },
  failed: { label: "Failed", icon: XCircle, cls: "bg-destructive/15 text-destructive" },
  processing: { label: "Payment started", icon: Loader2, cls: "bg-muted text-muted-foreground" },
  succeeded: { label: "Paid", icon: CheckCircle2, cls: "bg-primary/15 text-primary" },
  refunded: { label: "Refunded", icon: RefreshCw, cls: "bg-muted text-muted-foreground" },
  cancelled: { label: "Cancelled", icon: XCircle, cls: "bg-muted text-muted-foreground" },
};

// --- Invoice card -------------------------------------------------------------

function InvoiceCard({
  inv,
  paying,
  cancelling,
  onPay,
  onCancel,
}: {
  inv: PaymentInvoice;
  paying: boolean;
  cancelling: boolean;
  onPay: () => void;
  onCancel: () => void;
}) {
  const meta = STATUS_META[inv.status];
  const Icon = meta.icon;
  // "processing" = a Stripe payment page was opened. Pay stays available: the
  // server checks that page with Stripe first, so nobody pays twice.
  const payable = inv.status === "pending" || inv.status === "failed" || inv.status === "processing";
  const cancellable = inv.status === "pending" || inv.status === "failed" || inv.status === "processing";

  return (
    <div className="rounded-[14px] border border-border bg-card overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-3 px-5 pt-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <p className="font-bold text-sm tracking-tight min-w-0 break-words [overflow-wrap:anywhere] whitespace-normal">{inv.description}</p>
            {inv.source === "aftermarket" && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-muted-foreground font-mono">
                <Package className="h-3 w-3" /> aftermarket
              </span>
            )}
          </div>
          <p className="text-[11px] font-mono font-semibold tracking-wide text-muted-foreground/60 mt-0.5">
            {inv.invoiceNumber || inv._id.slice(-8).toUpperCase()} · {fmtDate(inv.createdAt)}
            {inv.dueDate && inv.status === "pending" ? ` · due ${fmtDate(inv.dueDate)}` : ""}
          </p>
          {(inv.dealershipName || paymentPurposeLabel(inv.purpose)) && (
            <p className="text-xs text-muted-foreground mt-0.5 [overflow-wrap:anywhere]">
              {[inv.dealershipName && `From ${inv.dealershipName}`, paymentPurposeLabel(inv.purpose)].filter(Boolean).join(" · ")}
            </p>
          )}
        </div>
        <span className={cn("inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide font-mono px-2 py-1 rounded-full shrink-0", meta.cls)}>
          <Icon className={cn("h-3 w-3", inv.status === "processing" && "animate-spin")} />
          {meta.label}
        </span>
      </div>

      {/* Line items */}
      {inv.lineItems?.length ? (
        <div className="px-5 py-3 mt-2 space-y-1.5">
          {/* Each line: what it is, Qty × Price, and its amount; a discount reads −$ (2026-11-20). */}
          {inv.lineItems.map((li, i) => (
            <div key={i} className="flex justify-between gap-3 text-xs">
              <div className="min-w-0">
                <p className={cn("text-foreground/90 [overflow-wrap:anywhere]", isDiscountLine(li) && "text-primary")}>{li.label}</p>
                <p className="text-[11px] text-muted-foreground font-mono">{savedLineDetail(li)}</p>
              </div>
              <span className={cn("tabular-nums font-mono shrink-0", isDiscountLine(li) ? "text-primary" : "text-foreground/80")}>
                {invoiceMoney(li.lineTotal)}
              </span>
            </div>
          ))}
          {!!inv.taxAmount && (
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Tax{inv.taxRate ? ` (${inv.taxRate}%)` : ""}</span>
              <span className="tabular-nums font-mono">{money(inv.taxAmount)}</span>
            </div>
          )}
        </div>
      ) : null}

      {inv.customerNote && (
        <div className="mx-5 mt-1 rounded-lg bg-muted/40 px-3 py-2">
          <p className="text-[11px] font-semibold text-muted-foreground">Note from the dealership</p>
          <p className="text-xs text-foreground/90 whitespace-pre-line [overflow-wrap:anywhere]">{inv.customerNote}</p>
        </div>
      )}

      <div className="flex flex-col gap-3 px-5 py-4 border-t border-border mt-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground/60 font-mono">Total</p>
          <p className="text-lg font-bold tabular-nums font-mono">{money(inv.amount)}</p>
          {(isPartlyRefunded(inv) || inv.status === "refunded") && (
            <p className="text-xs text-muted-foreground">
              {money(refundedSoFar(inv))} refunded to you. It can take 5–10 business days to show on your card.
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {inv.receiptUrl && inv.status === "succeeded" && (
            <a href={inv.receiptUrl} target="_blank" rel="noreferrer" className="shrink-0">
              <Button variant="outline" size="sm" className="h-9 rounded-xl gap-1.5">
                <Receipt className="h-3.5 w-3.5" /> Receipt
              </Button>
            </a>
          )}
          {cancellable && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onCancel}
              disabled={cancelling || paying}
              className="h-9 rounded-xl gap-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            >
              {cancelling ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
              Cancel
            </Button>
          )}
          {payable && (
            <Button size="sm" onClick={onPay} disabled={paying || cancelling} className="h-9 flex-1 rounded-xl gap-1.5 sm:flex-initial">
              {paying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CreditCard className="h-3.5 w-3.5" />}
              Pay {money(inv.amount)}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, tone }: { icon: LucideIcon; label: string; value: string; tone: string }) {
  return (
    <div className="rounded-[14px] border border-border bg-card p-4 flex items-center gap-3">
      <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center", tone)}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground/60 font-mono">{label}</p>
        <p className="text-lg font-bold tabular-nums font-mono">{value}</p>
      </div>
    </div>
  );
}

// --- Page ---------------------------------------------------------------------

function PaymentsView() {
  const router = useRouter();
  const params = useSearchParams();

  const [payingId, setPayingId] = React.useState<string | null>(null);
  const [cancellingId, setCancellingId] = React.useState<string | null>(null);
  const [banner, setBanner] = React.useState<{ kind: "success" | "info" | "error"; text: string } | null>(null);
  const { confirm, AlertComponent } = useAlert();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["my-payments"],
    queryFn: async () => {
      const r = await apiClient.get("/api/payments/my-payments");
      return r.data?.data as MyPaymentsResponse;
    },
    // Poll while anything is pending/processing so webhook-driven status lands.
    refetchInterval: (q) => {
      const d = q.state.data as MyPaymentsResponse | undefined;
      const active = d?.payments?.some((p) => p.status === "pending" || p.status === "processing");
      return active ? 8_000 : false;
    },
    staleTime: 5_000,
  });

  const payInvoice = React.useCallback(
    async (paymentId: string) => {
      setPayingId(paymentId);
      setBanner(null);
      try {
        const r = await apiClient.post("/api/payments/create-customer-checkout", { paymentId });
        const url = r.data?.data?.url;
        if (url) {
          window.location.href = url; // hosted Stripe Checkout
        } else {
          throw new Error("No checkout URL returned");
        }
      } catch (e: unknown) {
        setBanner({ kind: "error", text: userErrorMessage(e, "start this payment") });
        setPayingId(null);
        // e.g. the earlier payment page turned out to be paid: show the real status.
        refetch();
      }
    },
    [refetch]
  );

  const doCancelInvoice = React.useCallback(
    async (paymentId: string) => {
      setCancellingId(paymentId);
      setBanner(null);
      try {
        await apiClient.post(`/api/payments/${paymentId}/cancel-mine`);
        setBanner({ kind: "info", text: "Invoice cancelled." });
        refetch();
      } catch (e: unknown) {
        setBanner({ kind: "error", text: userErrorMessage(e, "cancel this invoice") });
        // If it was already paid, refetch so the UI reflects the real status.
        refetch();
      } finally {
        setCancellingId(null);
      }
    },
    [refetch]
  );

  const cancelInvoice = React.useCallback(
    async (paymentId: string) => {
      await confirm(
        "Cancel invoice?",
        "Cancel this invoice? You won't be charged. This can't be undone.",
        () => doCancelInvoice(paymentId),
        "Cancel Invoice",
        "Keep Invoice",
      );
    },
    [confirm, doCancelInvoice]
  );

  // Handle return from Stripe + Buy Now hand-off.
  React.useEffect(() => {
    const status = params.get("status");
    const sessionId = params.get("session_id");
    const pay = params.get("pay");

    if (status === "success" && sessionId) {
      (async () => {
        try {
          await apiClient.get(`/api/payments/checkout-session/${sessionId}`);
        } catch { /* webhook will reconcile */ }
        setBanner({ kind: "success", text: "Payment successful — thank you!" });
        refetch();
        router.replace("/customer/payments");
      })();
    } else if (status === "cancelled") {
      // Left Stripe's page without paying: close it and put the invoice back under "To pay".
      const invoiceId = params.get("invoice");
      (async () => {
        if (invoiceId) {
          try {
            await apiClient.post(`/api/payments/${encodeURIComponent(invoiceId)}/left-checkout`);
          } catch { /* Stripe's page expires on its own, and Pay checks it again */ }
        }
        setBanner({ kind: "info", text: "Payment cancelled. Your invoice is back under To pay whenever you're ready." });
        refetch();
        router.replace("/customer/payments");
      })();
    } else if (pay) {
      // Buy Now created an invoice and sent us here — launch Checkout for it.
      payInvoice(pay);
      router.replace("/customer/payments");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  const payments = data?.payments || [];
  const stats = data?.stats || { totalOwed: 0, totalPaid: 0, pendingCount: 0 };
  const outstanding = payments.filter((p) => p.status === "pending" || p.status === "failed" || p.status === "processing");
  const history = payments.filter((p) => !(p.status === "pending" || p.status === "failed" || p.status === "processing"));

  // Coming from My Garage's "Payments Due" (#to-pay): once the invoices have
  // loaded, bring the "To pay" list into view and move focus to its heading.
  const toPayRef = React.useRef<HTMLElement>(null);
  const jumpedToPay = React.useRef(false);
  React.useEffect(() => {
    if (jumpedToPay.current || isLoading || window.location.hash !== "#to-pay") return;
    const section = toPayRef.current;
    if (!section) return;
    jumpedToPay.current = true;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    section.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
    section.querySelector<HTMLElement>("#to-pay-heading")?.focus({ preventScroll: true });
  }, [isLoading, outstanding.length]);

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <Wallet className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0">
            <h1 className="font-bold text-lg tracking-tight min-w-0 break-words [overflow-wrap:anywhere] whitespace-normal">SuprahPay</h1>
            <p className="text-xs text-muted-foreground min-w-0 break-words [overflow-wrap:anywhere] whitespace-normal">Invoices & payment history</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={() => refetch()} className="h-9 w-9 shrink-0 p-0 rounded-xl hover:bg-primary/10 hover:text-primary">
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {banner && (
        <div
          className={cn(
            "mb-4 flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm border",
            banner.kind === "success" && "border-primary/30 bg-primary/5 text-primary",
            banner.kind === "info" && "border-border bg-muted/40 text-muted-foreground",
            banner.kind === "error" && "border-destructive/30 bg-destructive/5 text-destructive"
          )}
        >
          {banner.kind === "success" ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          {banner.text}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <StatCard icon={Clock} label="Outstanding" value={money(stats.totalOwed)} tone="bg-chart-2/15 text-chart-2" />
        <StatCard icon={CheckCircle2} label="Total paid" value={money(stats.totalPaid)} tone="bg-primary/15 text-primary" />
        <StatCard icon={Receipt} label="Open invoices" value={String(stats.pendingCount)} tone="bg-muted text-muted-foreground" />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : payments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
          <div className="h-14 w-14 rounded-[12px] bg-muted flex items-center justify-center">
            <Receipt className="h-6 w-6 text-muted-foreground/50" />
          </div>
          <p className="text-sm text-muted-foreground">No invoices yet.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {outstanding.length > 0 && (
            <section id="to-pay" ref={toPayRef} aria-labelledby="to-pay-heading" className="space-y-3 scroll-mt-4">
              <p id="to-pay-heading" tabIndex={-1} className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground/60 font-mono">
                To pay · {outstanding.length}
              </p>
              {outstanding.map((inv) => (
                <InvoiceCard
                  key={inv._id}
                  inv={inv}
                  paying={payingId === inv._id}
                  cancelling={cancellingId === inv._id}
                  onPay={() => payInvoice(inv._id)}
                  onCancel={() => cancelInvoice(inv._id)}
                />
              ))}
            </section>
          )}

          {history.length > 0 && (
            <section className="space-y-3">
              <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground/60 font-mono">History</p>
              {history.map((inv) => (
                <InvoiceCard
                  key={inv._id}
                  inv={inv}
                  paying={false}
                  cancelling={false}
                  onPay={() => {}}
                  onCancel={() => {}}
                />
              ))}
            </section>
          )}
        </div>
      )}
      <AlertComponent />
    </div>
  );
}

export default function CustomerPaymentsPage() {
  return (
    <React.Suspense
      fallback={
        <div className="flex justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <PaymentsView />
    </React.Suspense>
  );
}