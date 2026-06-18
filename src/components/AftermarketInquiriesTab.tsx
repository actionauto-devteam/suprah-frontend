"use client";

import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Package,
  Search,
  Loader2,
  RefreshCw,
  ChevronRight,
  FileText,
  Plus,
  Trash2,
  X,
  Receipt,
  MessageSquare,
  Mail,
  Phone,
  Clock,
  CheckCircle2,
  CircleDot,
  Tag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { apiClient } from "@/lib/api-client";
import { useCrmToken } from "@/hooks/useCrmToken";
import { useSupraSpaceSocket } from "@/hooks/useSupraSpaceSocket";
import { format, isToday, isYesterday } from "date-fns";

// ─── Types ────────────────────────────────────────────────────────────────────

type InquiryStatus = "open" | "answered" | "closed";

interface InquiryInvoiceBadge {
  _id: string;
  invoiceNumber?: string;
  status: string;
  amount: number;
}

interface Inquiry {
  _id: string;
  productId: string;
  productName: string;
  productPrice?: number | null;
  customerName: string;
  customerEmail: string;
  question: string;
  status: InquiryStatus;
  conversationId?: string;
  createdAt: string;
  invoice?: InquiryInvoiceBadge | null;
}

interface ProductMedia {
  url: string;
  mediaType?: "image" | "video";
  fileName?: string;
  mimeType?: string;
}

interface InquiryDetail {
  inquiry: Inquiry;
  product: {
    _id: string;
    name: string;
    price?: number | null;
    description?: string;
    media?: ProductMedia;
    file?: { url: string; fileName?: string };
    isActive?: boolean;
    createdAt?: string;
  } | null;
  customer: {
    _id: string;
    name?: string;
    fullName?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    imageUrl?: string;
    avatar?: string;
    createdAt?: string;
  } | null;
  history: Array<{
    _id: string;
    productName: string;
    question: string;
    status: InquiryStatus;
    productPrice?: number | null;
    createdAt: string;
  }>;
  invoice: {
    _id: string;
    invoiceNumber?: string;
    status: string;
    amount: number;
    subtotal?: number;
    taxAmount?: number;
    lineItems?: Array<{ label: string; kind: string; quantity: number; unitPrice: number; lineTotal: number }>;
    createdAt: string;
    paidAt?: string;
    dueDate?: string;
  } | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtRelative(d?: string) {
  if (!d) return "";
  const date = new Date(d);
  if (isToday(date)) return format(date, "h:mm a");
  if (isYesterday(date)) return "Yesterday";
  return format(date, "MMM d");
}
function fmtFull(d?: string) {
  return d ? format(new Date(d), "MMM d, yyyy · h:mm a") : "";
}
function ini(name: string) {
  return (name || "?").split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}
function money(n?: number | null) {
  if (n == null) return "—";
  return `$${Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function inquiryTag(id: string) {
  return `INQ-${id.slice(-6).toUpperCase()}`;
}

const STATUS_TONE: Record<InquiryStatus, string> = {
  open: "text-chart-2",
  answered: "text-primary",
  closed: "text-muted-foreground",
};

// ─── Squircle (shared visual unit, matches CustomersConcernTab) ───────────────

function Squircle({
  label,
  tone = "neutral",
  size = "md",
  muted = false,
  src,
}: {
  label: string;
  tone?: "primary" | "neutral" | "chart2";
  size?: "sm" | "md" | "lg";
  muted?: boolean;
  src?: string;
}) {
  const sizeCls = size === "lg" ? "h-11 w-11 text-sm" : size === "sm" ? "h-7 w-7 text-[10px]" : "h-9 w-9 text-xs";
  const toneCls = muted
    ? "bg-muted text-muted-foreground"
    : tone === "primary"
      ? "bg-primary text-primary-foreground"
      : tone === "chart2"
        ? "bg-chart-2 text-white"
        : "bg-foreground/85 text-background";
  if (src) {
    return (
      <img
        src={src}
        alt={label}
        className={cn("shrink-0 rounded-[10px] object-cover", sizeCls)}
      />
    );
  }
  return (
    <div className={cn("shrink-0 rounded-[10px] flex items-center justify-center font-bold tracking-tight", sizeCls, toneCls)}>
      {ini(label)}
    </div>
  );
}

function StatusPill({ status }: { status: InquiryStatus }) {
  const Icon = status === "open" ? CircleDot : status === "answered" ? Receipt : CheckCircle2;
  return (
    <span className={cn("inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wide font-mono", STATUS_TONE[status])}>
      <Icon className="h-3 w-3" />
      {status}
    </span>
  );
}

// ─── List item ─────────────────────────────────────────────────────────────────

function InquiryRow({
  inquiry,
  isActive,
  onClick,
}: {
  inquiry: Inquiry;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-start gap-3 px-3 py-3 text-left transition-colors relative border-l-[3px]",
        isActive ? "bg-primary/6 border-l-primary" : "border-l-transparent hover:bg-muted/50"
      )}
    >
      <Squircle label={inquiry.customerName} tone="chart2" muted={inquiry.status === "closed"} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-1">
          <p className={cn("text-sm truncate", inquiry.status === "open" ? "font-bold text-foreground" : "font-semibold text-foreground/90")}>
            {inquiry.customerName}
          </p>
          <span className="text-[10px] text-muted-foreground/60 tabular-nums font-mono shrink-0">
            {fmtRelative(inquiry.createdAt)}
          </span>
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <Tag className="h-2.5 w-2.5 text-muted-foreground/50" />
          <p className="text-xs text-foreground/80 truncate font-medium">{inquiry.productName}</p>
        </div>
        <p className="text-xs text-muted-foreground truncate mt-0.5">{inquiry.question}</p>
        <div className="flex items-center gap-2 mt-1.5">
          <StatusPill status={inquiry.status} />
          {inquiry.invoice && (
            <span className="text-[9px] font-bold uppercase tracking-wide text-primary font-mono inline-flex items-center gap-1">
              <Receipt className="h-3 w-3" />
              {inquiry.invoice.status === "succeeded" ? "paid" : "invoiced"}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

// ─── Invoice builder modal ──────────────────────────────────────────────────────

type DraftLine = { label: string; kind: "product" | "fee" | "charge" | "discount"; quantity: number; unitPrice: number };

function InvoiceBuilder({
  detail,
  onClose,
  onCreated,
}: {
  detail: InquiryDetail;
  onClose: () => void;
  onCreated: () => void;
}) {
  const seedPrice = detail.product?.price ?? detail.inquiry.productPrice ?? 0;

  const [lines, setLines] = React.useState<DraftLine[]>([
    { label: detail.inquiry.productName, kind: "product", quantity: 1, unitPrice: Number(seedPrice) || 0 },
  ]);
  const [taxRate, setTaxRate] = React.useState<number>(0);
  const [dueDate, setDueDate] = React.useState<string>("");
  const [notes, setNotes] = React.useState<string>("");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const subtotal = lines.reduce((s, l) => {
    const raw = (Number(l.quantity) || 0) * (Number(l.unitPrice) || 0);
    return s + (l.kind === "discount" ? -Math.abs(raw) : raw);
  }, 0);
  const taxAmount = Math.max(0, subtotal) * ((Number(taxRate) || 0) / 100);
  const total = subtotal + taxAmount;

  const updateLine = (i: number, patch: Partial<DraftLine>) =>
    setLines((p) => p.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  const addLine = (kind: DraftLine["kind"]) =>
    setLines((p) => [...p, { label: kind === "fee" ? "Service fee" : kind === "discount" ? "Discount" : "Item", kind, quantity: 1, unitPrice: 0 }]);
  const removeLine = (i: number) => setLines((p) => p.filter((_, idx) => idx !== i));

  const submit = async () => {
    setError(null);
    if (lines.length === 0) return setError("Add at least one line item.");
    if (total <= 0) return setError("Invoice total must be greater than zero.");
    setSubmitting(true);
    try {
      await apiClient.post(
        `/api/crm/aftermarket/inquiries/${detail.inquiry._id}/invoice`,
        {
          lineItems: lines.map((l) => ({
            label: l.label.trim() || "Item",
            kind: l.kind,
            quantity: Number(l.quantity) || 0,
            unitPrice: Number(l.unitPrice) || 0,
          })),
          taxRate: Number(taxRate) || 0,
          dueDate: dueDate || undefined,
          notes: notes.trim() || undefined,
        }
      );
      onCreated();
    } catch (e: any) {
      setError(e?.response?.data?.message || "Failed to create invoice. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative w-full max-w-xl max-h-[90vh] overflow-hidden rounded-[14px] border border-border bg-background shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10">
              <Receipt className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="font-bold text-sm tracking-tight">Create invoice</p>
              <p className="text-[11px] text-muted-foreground">
                {detail.inquiry.customerName} · {detail.inquiry.productName}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="h-7 w-7 rounded-xl flex items-center justify-center hover:bg-muted transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4" style={{ scrollbarWidth: "thin" }}>
          {/* Line items */}
          <div className="space-y-2">
            <div className="grid grid-cols-[1fr_56px_88px_28px] gap-2 px-0.5">
              <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground/60 font-mono">Item</span>
              <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground/60 font-mono text-center">Qty</span>
              <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground/60 font-mono text-right">Unit</span>
              <span />
            </div>

            {lines.map((l, i) => (
              <div key={i} className="grid grid-cols-[1fr_56px_88px_28px] gap-2 items-center">
                <div className="flex flex-col gap-1">
                  <Input
                    value={l.label}
                    onChange={(e) => updateLine(i, { label: e.target.value })}
                    placeholder="Description"
                    className="h-8 text-xs rounded-lg"
                  />
                  <div className="flex gap-1">
                    {(["product", "fee", "charge", "discount"] as const).map((k) => (
                      <button
                        key={k}
                        onClick={() => updateLine(i, { kind: k })}
                        className={cn(
                          "text-[9px] font-bold uppercase tracking-wide font-mono px-1.5 py-0.5 rounded transition-colors",
                          l.kind === k ? "bg-primary/15 text-primary" : "text-muted-foreground/50 hover:text-foreground"
                        )}
                      >
                        {k}
                      </button>
                    ))}
                  </div>
                </div>
                <Input
                  type="number"
                  min={0}
                  value={l.quantity}
                  onChange={(e) => updateLine(i, { quantity: Number(e.target.value) })}
                  className="h-8 text-xs rounded-lg text-center"
                />
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={l.unitPrice}
                  onChange={(e) => updateLine(i, { unitPrice: Number(e.target.value) })}
                  className="h-8 text-xs rounded-lg text-right"
                />
                <button
                  onClick={() => removeLine(i)}
                  disabled={lines.length === 1}
                  className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}

            <div className="flex gap-2 pt-1">
              <button onClick={() => addLine("product")} className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline">
                <Plus className="h-3 w-3" /> Item
              </button>
              <button onClick={() => addLine("fee")} className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground hover:text-foreground">
                <Plus className="h-3 w-3" /> Fee
              </button>
              <button onClick={() => addLine("discount")} className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground hover:text-foreground">
                <Plus className="h-3 w-3" /> Discount
              </button>
            </div>
          </div>

          {/* Tax + due date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground/60 font-mono">Tax rate (%)</label>
              <Input type="number" min={0} step="0.01" value={taxRate} onChange={(e) => setTaxRate(Number(e.target.value))} className="h-8 text-xs rounded-lg mt-1" />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground/60 font-mono">Due date</label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="h-8 text-xs rounded-lg mt-1" />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground/60 font-mono">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Anything the customer should know…"
              className="w-full mt-1 resize-none rounded-lg border border-border bg-muted/20 px-3 py-2 text-xs focus:outline-none focus:border-primary/50 placeholder:text-muted-foreground/50"
            />
          </div>

          {/* Totals */}
          <div className="rounded-[10px] border border-border bg-muted/30 px-4 py-3 space-y-1.5">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Subtotal</span>
              <span className="tabular-nums font-mono">{money(subtotal)}</span>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Tax ({taxRate || 0}%)</span>
              <span className="tabular-nums font-mono">{money(taxAmount)}</span>
            </div>
            <div className="flex justify-between text-sm font-bold pt-1.5 border-t border-border">
              <span>Total</span>
              <span className="tabular-nums font-mono text-primary">{money(total)}</span>
            </div>
          </div>

          {error && <p className="text-[11px] text-destructive px-1">{error}</p>}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-border shrink-0">
          <Button variant="outline" size="sm" onClick={onClose} className="rounded-xl">Cancel</Button>
          <Button size="sm" onClick={submit} disabled={submitting} className="rounded-xl gap-1.5">
            {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Receipt className="h-3.5 w-3.5" />}
            Send invoice · {money(total)}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Detail panel ────────────────────────────────────────────────────────────

function InfoRow({ icon: Icon, children }: { icon: any; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-xs text-foreground/80">
      <Icon className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
      <span className="truncate">{children}</span>
    </div>
  );
}

function DetailPanel({
  inquiryId,
  onRespond,
  onChanged,
}: {
  inquiryId: string;
  onRespond?: (conversationId: string) => void;
  onChanged: () => void;
}) {
  const queryClient = useQueryClient();
  const [showBuilder, setShowBuilder] = React.useState(false);
  const [statusBusy, setStatusBusy] = React.useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["aftermarket-inquiry-detail", inquiryId],
    queryFn: async () => {
      const r = await apiClient.get(`/api/crm/aftermarket/inquiries/${inquiryId}`);
      return r.data?.data as InquiryDetail;
    },
    staleTime: 10_000,
  });

  const changeStatus = async (status: InquiryStatus) => {
    setStatusBusy(true);
    try {
      await apiClient.patch(`/api/crm/aftermarket/inquiries/${inquiryId}`, { status });
      await refetch();
      onChanged();
    } finally {
      setStatusBusy(false);
    }
  };

  if (isLoading || !data) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const { inquiry, product, customer, history, invoice } = data;
  const customerName = customer?.fullName || customer?.name || inquiry.customerName;
  const mediaUrl = product?.media?.url;
  const isVideo = product?.media?.mediaType === "video" || product?.media?.mimeType?.startsWith("video/");

  return (
    <div className="flex-1 min-h-0 overflow-y-auto" style={{ scrollbarWidth: "thin" }}>
      <div className="p-5 space-y-5 max-w-2xl">
        {/* Product card */}
        <div className="rounded-[12px] border border-border overflow-hidden">
          {mediaUrl ? (
            isVideo ? (
              <video src={mediaUrl} controls className="w-full max-h-56 object-cover bg-muted" />
            ) : (
              <img src={mediaUrl} alt={product?.name} className="w-full max-h-56 object-cover bg-muted" />
            )
          ) : (
            <div className="w-full h-32 bg-muted flex items-center justify-center">
              <Package className="h-8 w-8 text-muted-foreground/40" />
            </div>
          )}
          <div className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-bold text-sm tracking-tight truncate">{product?.name || inquiry.productName}</p>
                <p className="text-[10px] font-mono font-semibold tracking-wide text-muted-foreground/60 mt-0.5">
                  {inquiryTag(inquiry._id)}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-bold tabular-nums font-mono text-primary">
                  {product?.price != null ? money(product.price) : "No price"}
                </p>
                {product?.price == null && (
                  <p className="text-[9px] uppercase tracking-wide text-muted-foreground/60 font-mono">quote required</p>
                )}
              </div>
            </div>
            {product?.description && (
              <p className="text-xs text-muted-foreground mt-2 leading-relaxed line-clamp-3">{product.description}</p>
            )}
            {product?.file?.url && (
              <a
                href={product.file.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-primary hover:underline mt-2"
              >
                <FileText className="h-3 w-3" /> {product.file.fileName || "Attached file"}
              </a>
            )}
          </div>
        </div>

        {/* Customer + status */}
        <div className="flex items-start gap-3">
          <Squircle label={customerName} tone="chart2" size="lg" src={customer?.imageUrl || customer?.avatar} />
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <p className="font-semibold text-sm">{customerName}</p>
              <StatusPill status={inquiry.status} />
            </div>
            <InfoRow icon={Mail}>{customer?.email || inquiry.customerEmail}</InfoRow>
            {customer?.phone && <InfoRow icon={Phone}>{customer.phone}</InfoRow>}
            <InfoRow icon={Clock}>Inquired {fmtFull(inquiry.createdAt)}</InfoRow>
          </div>
        </div>

        {/* The question */}
        <div className="rounded-r-lg rounded-l-[3px] border-l-[3px] border-l-chart-2 bg-chart-2/6 px-4 py-3">
          <p className="text-[10px] font-bold uppercase tracking-wide text-chart-2 font-mono mb-1">Inquiry</p>
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{inquiry.question}</p>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {invoice ? (
            <div className="flex-1 min-w-[200px] rounded-[10px] border border-border bg-muted/30 px-4 py-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground/60 font-mono">
                    {invoice.invoiceNumber || "Invoice"}
                  </p>
                  <p className="text-sm font-bold tabular-nums font-mono mt-0.5">{money(invoice.amount)}</p>
                </div>
                <span className={cn(
                  "text-[9px] font-bold uppercase tracking-wide font-mono px-2 py-1 rounded-full",
                  invoice.status === "succeeded" ? "bg-primary/15 text-primary" : "bg-chart-2/15 text-chart-2"
                )}>
                  {invoice.status === "succeeded" ? "paid" : invoice.status}
                </span>
              </div>
            </div>
          ) : (
            <Button size="sm" onClick={() => setShowBuilder(true)} className="rounded-xl gap-1.5">
              <Receipt className="h-3.5 w-3.5" /> Create invoice
            </Button>
          )}

          {inquiry.conversationId && onRespond && (
            <Button variant="outline" size="sm" onClick={() => onRespond(inquiry.conversationId!)} className="rounded-xl gap-1.5">
              <MessageSquare className="h-3.5 w-3.5" /> Respond
            </Button>
          )}

          {/* Status quick-toggle */}
          <div className="flex items-center gap-1 ml-auto">
            {(["open", "answered", "closed"] as const).map((s) => (
              <button
                key={s}
                onClick={() => changeStatus(s)}
                disabled={statusBusy || inquiry.status === s}
                className={cn(
                  "text-[10px] font-bold uppercase tracking-wide font-mono px-2 py-1 rounded-lg transition-colors",
                  inquiry.status === s ? "bg-primary/15 text-primary cursor-default" : "text-muted-foreground/60 hover:text-foreground hover:bg-muted"
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* History */}
        {history.length > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground/60 font-mono">
              History · {history.length}
            </p>
            <div className="rounded-[10px] border border-border divide-y divide-border/60 overflow-hidden">
              {history.map((h) => (
                <div key={h._id} className="flex items-center justify-between gap-3 px-3.5 py-2.5">
                  <div className="min-w-0">
                    <p className="text-xs font-medium truncate">{h.productName}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{h.question}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <StatusPill status={h.status} />
                    <span className="text-[10px] text-muted-foreground/60 tabular-nums font-mono">{fmtRelative(h.createdAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {showBuilder && (
        <InvoiceBuilder
          detail={data}
          onClose={() => setShowBuilder(false)}
          onCreated={() => {
            setShowBuilder(false);
            refetch();
            onChanged();
            queryClient.invalidateQueries({ queryKey: ["aftermarket-inquiries"] });
          }}
        />
      )}
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export function AftermarketInquiriesTab({
  onRespond,
}: {
  /** Optional: jump to the support conversation for an inquiry (e.g. switch to the Concerns tab). */
  onRespond?: (conversationId: string) => void;
}) {
  const queryClient = useQueryClient();

  const [search, setSearch] = React.useState("");
  const [debSearch, setDebSearch] = React.useState("");
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const [filter, setFilter] = React.useState<"open" | "answered" | "closed" | "all">("open");

  React.useEffect(() => {
    const t = setTimeout(() => setDebSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["aftermarket-inquiries", filter, debSearch],
    queryFn: async () => {
      const r = await apiClient.get("/api/crm/aftermarket/inquiries", {
        params: {
          status: filter === "all" ? undefined : filter,
          search: debSearch || undefined,
          limit: 50,
        },
      });
      return r.data?.data as { inquiries: Inquiry[]; openCount: number };
    },
    refetchInterval: 20_000,
    staleTime: 10_000,
  });

  const inquiries = data?.inquiries || [];
  const openCount = data?.openCount || 0;

  // Real-time: SupraSpace socket joins crm:staff and receives aftermarket events.
  const crmToken = useCrmToken();
  const { socket } = useSupraSpaceSocket(crmToken);

  React.useEffect(() => {
    if (!socket) return;
    const refresh = () => {
      queryClient.invalidateQueries({ queryKey: ["aftermarket-inquiries"] });
      if (activeId) queryClient.invalidateQueries({ queryKey: ["aftermarket-inquiry-detail", activeId] });
    };
    socket.on("aftermarket:inquiry_new", refresh);
    socket.on("aftermarket:inquiry_invoiced", refresh);
    socket.on("aftermarket:invoice_paid", refresh);
    socket.on("aftermarket:inquiry_updated", refresh);
    return () => {
      socket.off("aftermarket:inquiry_new", refresh);
      socket.off("aftermarket:inquiry_invoiced", refresh);
      socket.off("aftermarket:invoice_paid", refresh);
      socket.off("aftermarket:inquiry_updated", refresh);
    };
  }, [socket, activeId, queryClient]);

  return (
    <div className="flex h-full min-h-0 overflow-hidden border border-border bg-background">
      {/* Left: inquiry list */}
      <div
        className={cn(
          "flex flex-col border-r border-border shrink-0 overflow-hidden",
          activeId ? "hidden md:flex md:w-72 lg:w-80" : "w-full md:w-72 lg:w-80"
        )}
      >
        <div className="p-3 space-y-2.5 border-b border-border shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                <Package className="h-3.5 w-3.5 text-primary" />
              </div>
              <p className="font-bold text-sm tracking-tight">Aftermarket</p>
              {openCount > 0 && (
                <span className="h-4.5 min-w-4.5 rounded-full bg-primary text-primary-foreground text-[9px] font-bold px-1.5 flex items-center justify-center">
                  {openCount > 99 ? "99+" : openCount}
                </span>
              )}
            </div>
            <Button variant="ghost" size="sm" onClick={() => refetch()} className="h-7 w-7 p-0 rounded-xl hover:bg-primary/10 hover:text-primary">
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          </div>

          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search inquiries…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-xs bg-muted/40 border-border rounded-xl focus-visible:ring-primary/30 focus-visible:border-primary/40"
            />
          </div>

          <div className="flex gap-3 border-b border-border -mb-px">
            {(["open", "answered", "closed", "all"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "pb-1.5 text-[11px] font-bold uppercase tracking-wide transition-colors border-b-2",
                  filter === f ? "text-primary border-primary" : "text-muted-foreground border-transparent hover:text-foreground"
                )}
              >
                {f}
                {f === "open" && openCount > 0 && <span className="ml-1 font-mono opacity-70">{openCount}</span>}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-border/60" style={{ scrollbarWidth: "thin" }}>
          {isLoading ? (
            <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : inquiries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center px-4">
              <div className="h-12 w-12 rounded-[10px] bg-muted flex items-center justify-center">
                <Package className="h-5 w-5 text-muted-foreground/50" />
              </div>
              <p className="text-xs text-muted-foreground">{search ? "No results found" : `No ${filter === "all" ? "" : filter} inquiries`}</p>
            </div>
          ) : (
            inquiries.map((inq) => (
              <InquiryRow key={inq._id} inquiry={inq} isActive={inq._id === activeId} onClick={() => setActiveId(inq._id)} />
            ))
          )}
        </div>
      </div>

      {/* Right: detail */}
      <div className={cn("flex flex-col flex-1 min-w-0 overflow-hidden", !activeId && "hidden md:flex")}>
        {!activeId ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-6">
            <div className="h-14 w-14 rounded-[12px] bg-muted flex items-center justify-center">
              <Package className="h-6 w-6 text-muted-foreground/50" />
            </div>
            <div>
              <p className="font-semibold text-sm">Select an inquiry</p>
              <p className="text-xs text-muted-foreground mt-1">Review the product and customer, then create an invoice or respond.</p>
            </div>
          </div>
        ) : (
          <>
            <div className="shrink-0 flex items-center gap-3 px-4 py-3 border-b border-border bg-card md:hidden">
              <button onClick={() => setActiveId(null)} className="h-7 w-7 rounded-md flex items-center justify-center hover:bg-muted">
                <ChevronRight className="h-4 w-4 rotate-180" />
              </button>
              <p className="font-semibold text-sm">Inquiry detail</p>
            </div>
            <DetailPanel
              inquiryId={activeId}
              onRespond={onRespond}
              onChanged={() => queryClient.invalidateQueries({ queryKey: ["aftermarket-inquiries"] })}
            />
          </>
        )}
      </div>
    </div>
  );
}