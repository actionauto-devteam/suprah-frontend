"use client";

/**
 * Create invoice (2026-11-20): a standard invoice form in the SuprahPay look.
 * Each item is Qty × Price = Amount, a discount takes its amount off, and the
 * totals read Subtotal, Discount, Tax and Total due. The note is shown to the
 * customer on their invoice in SuprahPay.
 */
import * as React from "react";
import { Loader2, Plus, Receipt, Trash2, X } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { GhostButton, PrimaryButton, T, FONT, numeric, TextInput, Wordmark } from "@/components/billing/ui";
import {
  type DraftInvoiceLine,
  type InvoiceLineKind,
  draftLineAmount,
  draftLineProblem,
  draftLineToSend,
  invoiceMoney,
  invoiceTotals,
  isDiscountLine,
  typedNumber,
} from "@/lib/invoice-lines";

const MAX_LINES = 50;
const NOTE_MAX = 1000;
const FIRST_PRICE_ID = "invoice-first-price";

export interface InvoiceBuilderProps {
  inquiryId: string;
  customerName: string;
  customerEmail?: string;
  productName: string;
  /** The product's listed price, used for the first line. */
  startingPrice?: number | null;
  onClose: () => void;
  onCreated: () => void;
}

const labelStyle: React.CSSProperties = { fontSize: 12.5, fontWeight: 600, color: T.textSub, fontFamily: FONT };
const helpStyle: React.CSSProperties = { fontSize: 12, color: T.textMute, margin: 0, lineHeight: 1.45 };
const sectionTitle: React.CSSProperties = { fontSize: 13, fontWeight: 700, color: T.text, margin: 0 };

function newLine(kind: InvoiceLineKind): DraftInvoiceLine {
  if (kind === "fee") return { label: "Service fee", kind, quantity: "1", price: "" };
  if (kind === "discount") return { label: "Discount", kind, quantity: "1", price: "" };
  return { label: "", kind, quantity: "1", price: "" };
}

/** A money box with a "$" in front, so prices read as prices. */
function MoneyInput({
  sign = "$",
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { sign?: string }) {
  return (
    <div style={{ position: "relative" }}>
      <span
        aria-hidden
        style={{
          position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)",
          fontSize: 14, color: T.textMute, pointerEvents: "none", ...numeric,
        }}
      >
        {sign}
      </span>
      <TextInput
        {...props}
        inputMode="decimal"
        autoComplete="off"
        style={{ paddingLeft: sign.length > 1 ? 30 : 24, textAlign: "right", ...numeric }}
      />
    </div>
  );
}

export function InvoiceBuilder({
  inquiryId,
  customerName,
  customerEmail,
  productName,
  startingPrice,
  onClose,
  onCreated,
}: InvoiceBuilderProps) {
  const [lines, setLines] = React.useState<DraftInvoiceLine[]>(() => [
    {
      label: productName,
      kind: "product",
      quantity: "1",
      price: Number(startingPrice) > 0 ? String(Number(startingPrice)) : "",
    },
  ]);
  const [taxRate, setTaxRate] = React.useState("");
  const [dueDate, setDueDate] = React.useState("");
  const [note, setNote] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const rate = taxRate.trim() === "" ? 0 : typedNumber(taxRate);
  const totals = invoiceTotals(lines.map(draftLineAmount), Number.isFinite(rate) ? rate : 0);
  const itemCount = lines.filter((l) => !isDiscountLine(l)).length;
  const canSend = totals.total > 0 && !submitting;

  React.useEffect(() => {
    // Start in the first price box, the field most invoices need first.
    document.getElementById(FIRST_PRICE_ID)?.focus();
  }, []);

  React.useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !submitting) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, submitting]);

  const updateLine = (index: number, patch: Partial<DraftInvoiceLine>) =>
    setLines((current) => current.map((line, i) => (i === index ? { ...line, ...patch } : line)));
  const addLine = (kind: InvoiceLineKind) =>
    setLines((current) => (current.length >= MAX_LINES ? current : [...current, newLine(kind)]));
  const removeLine = (index: number) => setLines((current) => current.filter((_, i) => i !== index));

  const submit = async () => {
    setError(null);
    const problem = lines.map(draftLineProblem).find(Boolean);
    if (problem) return setError(problem);
    if (itemCount === 0) return setError("Add at least one item. A discount can't be the only line.");
    if (!Number.isFinite(rate) || rate < 0 || rate > 100) return setError("Enter a tax rate from 0% to 100%.");
    if (totals.total <= 0) return setError("The total due must be more than $0.");

    setSubmitting(true);
    try {
      await apiClient.post(`/api/crm/aftermarket/inquiries/${encodeURIComponent(inquiryId)}/invoice`, {
        lineItems: lines.map(draftLineToSend),
        taxRate: rate,
        dueDate: dueDate || undefined,
        customerNote: note.trim() || undefined,
      });
      onCreated();
    } catch (e: unknown) {
      const message = (e as { response?: { data?: { message?: unknown } } })?.response?.data?.message;
      setError(typeof message === "string" && message ? message : "The invoice wasn't sent. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4" style={{ fontFamily: FONT }}>
      <div aria-hidden className="absolute inset-0 bg-black/55 backdrop-blur-[2px]" onClick={() => !submitting && onClose()} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="invoice-builder-title"
        className="relative flex w-full max-w-[720px] flex-col overflow-hidden"
        style={{
          maxHeight: "92dvh",
          borderRadius: 18,
          background: T.surface,
          border: `1px solid ${T.border}`,
          color: T.text,
          boxShadow: "0 24px 60px rgba(0,0,0,0.35)",
        }}
      >
        {/* SuprahPay rail */}
        <div
          aria-hidden
          style={{ height: 3, background: `linear-gradient(90deg, ${T.mint}, ${T.brand} 45%, transparent)` }}
        />

        {/* Header */}
        <div
          className="flex items-start justify-between gap-3 px-4 py-4 sm:px-5"
          style={{ borderBottom: `1px solid ${T.border}` }}
        >
          <div className="flex min-w-0 items-start gap-3">
            <span
              aria-hidden
              className="flex shrink-0 items-center justify-center"
              style={{ width: 40, height: 40, borderRadius: 12, background: T.brandSoft, border: `1px solid ${T.brandBorder}` }}
            >
              <Receipt style={{ width: 18, height: 18, color: T.brand }} />
            </span>
            <div className="min-w-0">
              <Wordmark size={13} />
              <h2 id="invoice-builder-title" style={{ margin: "4px 0 0", fontSize: 18, fontWeight: 800, letterSpacing: "-0.01em" }}>
                New invoice
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            aria-label="Close"
            className="flex shrink-0 items-center justify-center transition-colors hover:bg-muted"
            style={{ width: 40, height: 40, borderRadius: 12, border: `1px solid ${T.border}`, background: "transparent", color: T.text, cursor: "pointer" }}
          >
            <X style={{ width: 16, height: 16 }} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 space-y-5 overflow-y-auto px-4 py-4 sm:px-5" style={{ scrollbarWidth: "thin" }}>
          {/* Bill to */}
          <section
            aria-label="Bill to"
            className="grid gap-1"
            style={{ borderRadius: 12, border: `1px solid ${T.border}`, background: T.surfaceAlt, padding: "12px 14px" }}
          >
            <p style={{ ...labelStyle, margin: 0 }}>Bill to</p>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 700, overflowWrap: "anywhere" }}>{customerName}</p>
            {customerEmail && (
              <p style={{ margin: 0, fontSize: 13, color: T.textSub, overflowWrap: "anywhere" }}>{customerEmail}</p>
            )}
            <p style={{ margin: "2px 0 0", fontSize: 13, color: T.textSub, overflowWrap: "anywhere" }}>
              For: {productName}
            </p>
          </section>

          {/* Items */}
          <section aria-labelledby="invoice-items-title" className="space-y-2">
            <p id="invoice-items-title" style={sectionTitle}>Items</p>
            <div
              aria-hidden
              className="hidden gap-2 sm:grid sm:grid-cols-[minmax(0,1fr)_84px_124px_108px_40px]"
              // Same side padding as a line (10px + its 1px border), so each title sits over its column.
              style={{ ...labelStyle, padding: "0 11px" }}
            >
              <span>Description</span>
              <span className="text-center">Qty</span>
              <span className="text-right">Price</span>
              <span className="text-right">Amount</span>
              <span />
            </div>

            {lines.map((line, i) => {
              const discount = isDiscountLine(line);
              const amount = draftLineAmount(line);
              const n = i + 1;
              return (
                <div
                  key={i}
                  className="grid grid-cols-[minmax(0,1fr)_40px] items-start gap-2 sm:grid-cols-[minmax(0,1fr)_84px_124px_108px_40px] sm:items-center"
                  style={{ borderRadius: 12, border: `1px solid ${T.border}`, padding: 10 }}
                >
                  <div className="col-start-1 row-start-1 min-w-0 sm:col-start-auto sm:row-start-auto">
                    <TextInput
                      value={line.label}
                      onChange={(e) => updateLine(i, { label: e.target.value })}
                      placeholder={discount ? "What the discount is for" : "What you're charging for"}
                      aria-label={`Description, line ${n}`}
                      maxLength={200}
                    />
                  </div>

                  {/* Phones: Qty, Price and Amount sit side by side under the description. */}
                  <div className="col-span-2 row-start-2 grid grid-cols-3 gap-2 sm:contents">
                    <div className="grid gap-1">
                      <span className="sm:hidden" style={labelStyle}>{discount ? "Type" : "Qty"}</span>
                      {discount ? (
                        <span
                          className="flex items-center justify-center"
                          style={{ height: 42, fontSize: 12.5, fontWeight: 600, color: T.brand, borderRadius: 10, background: T.brandSofter }}
                        >
                          Discount
                        </span>
                      ) : (
                        <TextInput
                          value={line.quantity}
                          onChange={(e) => updateLine(i, { quantity: e.target.value })}
                          inputMode="decimal"
                          autoComplete="off"
                          aria-label={`Quantity, line ${n}`}
                          style={{ textAlign: "center", ...numeric }}
                        />
                      )}
                    </div>
                    <div className="grid gap-1">
                      <span className="sm:hidden" style={labelStyle}>{discount ? "Amount off" : "Price"}</span>
                      <MoneyInput
                        sign={discount ? "−$" : "$"}
                        value={line.price}
                        onChange={(e) => updateLine(i, { price: e.target.value })}
                        placeholder="0.00"
                        aria-label={discount ? `Discount amount, line ${n}` : `Price for one, line ${n}`}
                        id={i === 0 ? FIRST_PRICE_ID : undefined}
                      />
                    </div>
                    <div className="grid gap-1">
                      <span className="sm:hidden" style={labelStyle}>Amount</span>
                      <span
                        className="flex items-center justify-end"
                        style={{ height: 42, fontSize: 14, fontWeight: 700, color: discount ? T.brand : T.text, ...numeric }}
                      >
                        {invoiceMoney(amount)}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => removeLine(i)}
                    disabled={lines.length === 1}
                    aria-label={`Remove line ${n}`}
                    className="col-start-2 row-start-1 flex items-center justify-center transition-colors hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-30 sm:col-start-auto sm:row-start-auto"
                    style={{ width: 40, height: 42, borderRadius: 10, border: "none", background: "transparent", color: T.textMute, cursor: "pointer" }}
                  >
                    <Trash2 style={{ width: 16, height: 16 }} />
                  </button>
                </div>
              );
            })}

            <div className="flex flex-wrap gap-2 pt-1">
              {([
                ["product", "Add item"],
                ["fee", "Add fee"],
                ["discount", "Add discount"],
              ] as const).map(([kind, text]) => (
                <GhostButton
                  key={kind}
                  type="button"
                  onClick={() => addLine(kind)}
                  disabled={lines.length >= MAX_LINES}
                  style={{ padding: "8px 12px", fontSize: 13, borderRadius: 10 }}
                >
                  <Plus style={{ width: 14, height: 14, color: T.brand }} /> {text}
                </GhostButton>
              ))}
            </div>
          </section>

          {/* Tax and due date */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <label htmlFor="invoice-tax" style={labelStyle}>Tax (%)</label>
              <TextInput
                id="invoice-tax"
                value={taxRate}
                onChange={(e) => setTaxRate(e.target.value)}
                inputMode="decimal"
                autoComplete="off"
                placeholder="0"
                style={numeric}
              />
              <p style={helpStyle}>Worked out on the total after any discount.</p>
            </div>
            <div className="grid gap-1.5">
              <label htmlFor="invoice-due" style={labelStyle}>Due date (optional)</label>
              <TextInput id="invoice-due" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              <p style={helpStyle}>Leave empty if it&apos;s due when they receive it.</p>
            </div>
          </div>

          {/* Note to customer */}
          <div className="grid gap-1.5">
            <label htmlFor="invoice-note" style={labelStyle}>Note to customer (optional)</label>
            <textarea
              id="invoice-note"
              value={note}
              onChange={(e) => setNote(e.target.value.slice(0, NOTE_MAX))}
              rows={3}
              placeholder="For example: pickup times, what's included, or how long the price is held."
              className="w-full resize-y"
              style={{
                fontFamily: FONT, fontSize: 14, color: T.text, background: "rgba(255,255,255,0.04)",
                border: `1px solid ${T.borderHi}`, borderRadius: 10, padding: "10px 13px", outline: "none",
              }}
            />
            <div className="flex flex-wrap justify-between gap-2">
              <p style={helpStyle}>Shown to the customer on their invoice in SuprahPay.</p>
              <p style={{ ...helpStyle, ...numeric }}>{note.length}/{NOTE_MAX}</p>
            </div>
          </div>

          {/* Totals */}
          <section
            aria-label="Totals"
            className="grid gap-1.5"
            style={{ borderRadius: 12, border: `1px solid ${T.brandBorder}`, background: T.brandSofter, padding: "12px 14px" }}
          >
            <div className="flex justify-between gap-3" style={{ fontSize: 13, color: T.textSub }}>
              <span>Subtotal</span>
              <span style={numeric}>{invoiceMoney(totals.itemsTotal)}</span>
            </div>
            {totals.discountTotal > 0 && (
              <div className="flex justify-between gap-3" style={{ fontSize: 13, color: T.textSub }}>
                <span>Discount</span>
                <span style={numeric}>{invoiceMoney(-totals.discountTotal)}</span>
              </div>
            )}
            <div className="flex justify-between gap-3" style={{ fontSize: 13, color: T.textSub }}>
              <span>Tax ({Number.isFinite(rate) ? rate : 0}%)</span>
              <span style={numeric}>{invoiceMoney(totals.tax)}</span>
            </div>
            <div
              className="flex items-baseline justify-between gap-3"
              style={{ borderTop: `1px solid ${T.border}`, marginTop: 4, paddingTop: 8 }}
            >
              <span style={{ fontSize: 15, fontWeight: 800 }}>Total due</span>
              <span style={{ fontSize: 20, fontWeight: 800, color: T.brand, ...numeric }}>{invoiceMoney(totals.total)}</span>
            </div>
          </section>

          {error && (
            <p
              role="alert"
              style={{ margin: 0, fontSize: 13, color: T.danger, background: T.dangerBg, borderRadius: 10, padding: "10px 12px" }}
            >
              {error}
            </p>
          )}
        </div>

        {/* Footer */}
        {/* Phones: Send above Cancel, both full width. Computers: side by side on the right. */}
        <div
          className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-end sm:px-5"
          style={{ borderTop: `1px solid ${T.border}` }}
        >
          {totals.total <= 0 && (
            <p className="order-1 sm:mr-auto" style={helpStyle}>
              Add a price to send this invoice.
            </p>
          )}
          <GhostButton type="button" onClick={onClose} disabled={submitting} className="order-3 w-full sm:order-2 sm:w-auto">
            Cancel
          </GhostButton>
          <PrimaryButton type="button" onClick={submit} disabled={!canSend} className="order-2 w-full sm:order-3 sm:w-auto">
            {submitting ? <Loader2 className="animate-spin" style={{ width: 16, height: 16 }} /> : <Receipt style={{ width: 16, height: 16 }} />}
            Send invoice · {invoiceMoney(totals.total)}
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}
