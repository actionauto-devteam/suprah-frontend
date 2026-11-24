"use client";

/**
 * Create invoice (2026-11-20): a standard invoice form in the SuprahPay look.
 * Each item is Qty × Price = Amount, a discount takes its amount off, and the
 * totals read Subtotal, Discount, Tax and Total due. The note is shown to the
 * customer on their invoice in SuprahPay.
 *
 * Feedback (2026-11-23): Send can always be pressed. Anything that stops the
 * invoice (from the form's own checks or the server) highlights its box with
 * the reason under it, moves to the first one, and shows a SuprahPay notice;
 * a sent invoice shows a SuprahPay notice too. Highlights clear as each box
 * is fixed.
 */
import * as React from "react";
import { Loader2, Plus, Receipt, Trash2, X } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { useSuprahPaySettings } from "@/hooks/useSuprahPay";
import { GhostButton, PrimaryButton, T, FONT, numeric, TextInput, Wordmark } from "@/components/billing/ui";
import { suprahPayToast } from "@/components/billing/SuprahPayToast";
import {
  type DraftInvoiceLine,
  type InvoiceLineKind,
  draftLineAmount,
  draftLineIssues,
  draftLineToSend,
  invoiceIssueKeyForServerMessage,
  invoiceMoney,
  invoiceTotals,
  isDiscountLine,
  typedNumber,
} from "@/lib/invoice-lines";

const MAX_LINES = 50;
const NOTE_MAX = 1000;
const MAX_INVOICE_TOTAL = 999_999.99;
/** The page id of a box: "line-0-price" → "invoice-line-0-price", "tax" → "invoice-tax". */
const fieldId = (key: string) => `invoice-${key}`;
const errorId = (key: string) => `invoice-${key}-error`;
const errorTextStyle: React.CSSProperties = { margin: 0, fontSize: 12.5, fontWeight: 600, color: T.danger, lineHeight: 1.45 };

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
}: React.InputHTMLAttributes<HTMLInputElement> & { sign?: string; hasError?: boolean }) {
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
  // Starts with the dealership's default sales tax (2026-11-21) until staff change it.
  const { data: suprahPay } = useSuprahPaySettings();
  const taxTouched = React.useRef(false);
  React.useEffect(() => {
    if (!taxTouched.current && suprahPay && suprahPay.defaultTaxRate > 0) setTaxRate(String(suprahPay.defaultTaxRate));
  }, [suprahPay]);
  const [dueDate, setDueDate] = React.useState("");
  const [note, setNote] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  // Highlights show once Send has been pressed, then follow each change.
  const [attempted, setAttempted] = React.useState(false);
  // What the server refused, until anything in the form changes.
  const [serverIssue, setServerIssue] = React.useState<{ key: string | null; message: string } | null>(null);

  const rate = taxRate.trim() === "" ? 0 : typedNumber(taxRate);
  const totals = invoiceTotals(lines.map(draftLineAmount), Number.isFinite(rate) ? rate : 0);
  const itemCount = lines.filter((l) => !isDiscountLine(l)).length;
  const firstItemIndex = Math.max(0, lines.findIndex((l) => !isDiscountLine(l)));
  const paymentLimit = suprahPay?.maxPaymentAmount;

  /** What stops this invoice being sent, by box, in the order the boxes appear. */
  const formIssues = React.useMemo(() => {
    const found = new Map<string, string>();
    lines.forEach((line, i) => {
      for (const issue of draftLineIssues(line, i)) found.set(`line-${i}-${issue.field}`, issue.message);
    });
    if (itemCount === 0) found.set("items", "Add at least one item. A discount can't be the only line.");
    if (!Number.isFinite(rate) || rate < 0 || rate > 100) found.set("tax", "Enter a tax rate from 0% to 100%.");
    const linesOk = ![...found.keys()].some((key) => key.startsWith("line-"));
    if (linesOk && itemCount > 0 && totals.total <= 0) {
      found.set("total", "The total due must be more than $0. Add a price to an item.");
    } else if (totals.total > MAX_INVOICE_TOTAL) {
      found.set("total", "The total due can't be more than $999,999.99.");
    } else if (typeof paymentLimit === "number" && paymentLimit > 0 && totals.total > paymentLimit) {
      found.set("total", `This is more than SuprahPay's limit of ${invoiceMoney(paymentLimit)} for one payment. Split it into smaller invoices, or contact Suprah.`);
    }
    return found;
  }, [lines, itemCount, rate, totals.total, paymentLimit]);

  const issues = new Map(attempted ? formIssues : []);
  if (serverIssue?.key && !issues.has(serverIssue.key)) issues.set(serverIssue.key, serverIssue.message);
  const issueFor = (key: string) => issues.get(key);
  /** Props that mark a box as needing a fix and point screen readers at the reason. */
  const invalidProps = (key: string) =>
    issues.has(key) ? { hasError: true, "aria-invalid": true as const, "aria-describedby": errorId(key) } : {};

  // A server refusal is about what was sent; any change starts fresh.
  React.useEffect(() => setServerIssue(null), [lines, taxRate, dueDate, note]);

  /** Moves to a box that needs a fix (the total points at the first item's price). */
  const goToIssue = (key: string) => {
    const target = key === "total" ? `line-${firstItemIndex}-price` : key;
    const el = document.getElementById(fieldId(target));
    if (!el) return;
    el.scrollIntoView({ block: "center" });
    el.focus({ preventScroll: true });
  };

  React.useEffect(() => {
    // Start in the first price box, the field most invoices need first.
    document.getElementById(fieldId("line-0-price"))?.focus();
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
    if (submitting) return;
    setAttempted(true);
    setServerIssue(null);
    const keys = [...formIssues.keys()];
    if (keys.length > 0) {
      goToIssue(keys[0]);
      suprahPayToast.error(
        "Invoice not sent",
        keys.length === 1 ? formIssues.get(keys[0]) : `Fix the ${keys.length} highlighted fields, then send it again.`,
      );
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiClient.post(`/api/crm/aftermarket/inquiries/${encodeURIComponent(inquiryId)}/invoice`, {
        lineItems: lines.map(draftLineToSend),
        taxRate: rate,
        dueDate: dueDate || undefined,
        customerNote: note.trim() || undefined,
      });
      const invoiceNumber = (res?.data as { data?: { payment?: { invoiceNumber?: unknown } } })?.data?.payment?.invoiceNumber;
      suprahPayToast.success(
        typeof invoiceNumber === "string" && invoiceNumber ? `Invoice ${invoiceNumber} sent` : "Invoice sent",
        `${customerName} was notified and can pay ${invoiceMoney(totals.total)} in SuprahPay.`,
      );
      onCreated();
    } catch (e: unknown) {
      const sent = (e as { response?: { data?: { message?: unknown } } })?.response?.data?.message;
      const message = typeof sent === "string" && sent ? sent : "The invoice wasn't sent. Check your connection and try again.";
      const key = invoiceIssueKeyForServerMessage(message);
      setServerIssue({ key, message });
      if (key) goToIssue(key);
      suprahPayToast.error("Invoice not sent", message);
    } finally {
      setSubmitting(false);
    }
  };

  // The line under the form: the server's reason, or how many boxes need a fix.
  const footerProblem = serverIssue && !serverIssue.key
    ? serverIssue.message
    : issues.size > 0
      ? issues.size === 1
        ? [...issues.values()][0]
        : `Fix the ${issues.size} highlighted fields to send this invoice.`
      : null;

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
              const lineIssues = (["label", "quantity", "price"] as const)
                .map((field) => ({ key: `line-${i}-${field}`, message: issueFor(`line-${i}-${field}`) }))
                .filter((issue): issue is { key: string; message: string } => Boolean(issue.message));
              return (
                <div
                  key={i}
                  className="grid grid-cols-[minmax(0,1fr)_40px] items-start gap-2 sm:grid-cols-[minmax(0,1fr)_84px_124px_108px_40px] sm:items-center"
                  style={{ borderRadius: 12, border: `1px solid ${lineIssues.length ? T.danger : T.border}`, padding: 10 }}
                >
                  <div className="col-start-1 row-start-1 min-w-0 sm:col-start-auto sm:row-start-auto">
                    <TextInput
                      value={line.label}
                      onChange={(e) => updateLine(i, { label: e.target.value })}
                      placeholder={discount ? "What the discount is for" : "What you're charging for"}
                      aria-label={`Description, line ${n}`}
                      maxLength={200}
                      id={fieldId(`line-${i}-label`)}
                      {...invalidProps(`line-${i}-label`)}
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
                          id={fieldId(`line-${i}-quantity`)}
                          {...invalidProps(`line-${i}-quantity`)}
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
                        id={fieldId(`line-${i}-price`)}
                        {...invalidProps(`line-${i}-price`)}
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

                  {lineIssues.length > 0 && (
                    <div className="col-span-2 grid gap-0.5 sm:col-span-5">
                      {lineIssues.map((issue) => (
                        <p key={issue.key} id={errorId(issue.key)} style={errorTextStyle}>{issue.message}</p>
                      ))}
                    </div>
                  )}
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
                  id={kind === "product" ? fieldId("items") : undefined}
                  type="button"
                  onClick={() => addLine(kind)}
                  disabled={lines.length >= MAX_LINES}
                  style={{ padding: "8px 12px", fontSize: 13, borderRadius: 10 }}
                >
                  <Plus style={{ width: 14, height: 14, color: T.brand }} /> {text}
                </GhostButton>
              ))}
            </div>
            {issueFor("items") && <p id={errorId("items")} style={errorTextStyle}>{issueFor("items")}</p>}
          </section>

          {/* Tax and due date */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <label htmlFor="invoice-tax" style={labelStyle}>Tax (%)</label>
              <TextInput
                id="invoice-tax"
                value={taxRate}
                onChange={(e) => { taxTouched.current = true; setTaxRate(e.target.value); }}
                inputMode="decimal"
                autoComplete="off"
                placeholder="0"
                style={numeric}
                {...invalidProps("tax")}
              />
              {issueFor("tax") && <p id={errorId("tax")} style={errorTextStyle}>{issueFor("tax")}</p>}
              <p style={helpStyle}>Worked out on the total after any discount.</p>
            </div>
            <div className="grid gap-1.5">
              <label htmlFor="invoice-due" style={labelStyle}>Due date (optional)</label>
              <TextInput id="invoice-due" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} {...invalidProps("due")} />
              {issueFor("due") && <p id={errorId("due")} style={errorTextStyle}>{issueFor("due")}</p>}
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
              aria-invalid={issues.has("note") || undefined}
              aria-describedby={issues.has("note") ? errorId("note") : undefined}
              style={{
                fontFamily: FONT, fontSize: 14, color: T.text, background: "rgba(255,255,255,0.04)",
                border: `1px solid ${issues.has("note") ? T.danger : T.borderHi}`, borderRadius: 10, padding: "10px 13px", outline: "none",
              }}
            />
            {issueFor("note") && <p id={errorId("note")} style={errorTextStyle}>{issueFor("note")}</p>}
            <div className="flex flex-wrap justify-between gap-2">
              <p style={helpStyle}>Shown to the customer on their invoice in SuprahPay.</p>
              <p style={{ ...helpStyle, ...numeric }}>{note.length}/{NOTE_MAX}</p>
            </div>
          </div>

          {/* Totals */}
          <section
            aria-label="Totals"
            className="grid gap-1.5"
            style={{ borderRadius: 12, border: `1px solid ${issues.has("total") ? T.danger : T.brandBorder}`, background: T.brandSofter, padding: "12px 14px" }}
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
            {issueFor("total") && <p id={errorId("total")} style={{ ...errorTextStyle, marginTop: 4 }}>{issueFor("total")}</p>}
          </section>
        </div>

        {/* Footer */}
        {/* Phones: Send above Cancel, both full width. Computers: side by side on the right. */}
        <div className="grid gap-2 px-4 py-3 sm:px-5" style={{ borderTop: `1px solid ${T.border}` }}>
          {footerProblem && (
            // The notice and the highlighted box are announced; this keeps the reason in view.
            <p style={{ ...errorTextStyle, background: T.dangerBg, borderRadius: 10, padding: "8px 12px", overflowWrap: "anywhere" }}>
              {footerProblem}
            </p>
          )}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
            {totals.total <= 0 && !footerProblem && (
              <p className="order-1 sm:mr-auto" style={helpStyle}>
                Add a price to send this invoice.
              </p>
            )}
            <GhostButton type="button" onClick={onClose} disabled={submitting} className="order-3 w-full sm:order-2 sm:w-auto">
              Cancel
            </GhostButton>
            <PrimaryButton type="button" onClick={submit} disabled={submitting} className="order-2 w-full sm:order-3 sm:w-auto">
              {submitting ? <Loader2 className="animate-spin" style={{ width: 16, height: 16 }} /> : <Receipt style={{ width: 16, height: 16 }} />}
              Send invoice · {invoiceMoney(totals.total)}
            </PrimaryButton>
          </div>
        </div>
      </div>
    </div>
  );
}
