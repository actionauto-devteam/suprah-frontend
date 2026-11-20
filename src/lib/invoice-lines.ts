/**
 * Invoice lines in plain invoice terms (2026-11-20): each item is
 * Qty × Price = Amount, and a discount takes its amount off. Used by the
 * Create invoice form, the customer's SuprahPay invoice and the staff
 * Payments details, so all three say the same thing. Matches the server's
 * totals (tax is worked out on the total after discounts).
 */

export type InvoiceLineKind = "product" | "fee" | "charge" | "discount";

/** A saved invoice line, as the server sends it. */
export interface SavedInvoiceLine {
  label: string;
  kind: InvoiceLineKind | string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

/** A line being typed in the Create invoice form: numbers stay as typed text. */
export interface DraftInvoiceLine {
  label: string;
  kind: InvoiceLineKind;
  quantity: string;
  price: string;
}

const cents = (value: number) => Math.round(value * 100) / 100;

const USD = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

/** "$1,234.50"; a negative amount reads "−$5.00". */
export function invoiceMoney(value: number): string {
  const n = Number(value) || 0;
  return n < 0 ? `−${USD.format(Math.abs(n))}` : USD.format(n);
}

export const isDiscountLine = (line: { kind?: string }) => line.kind === "discount";

/** A typed number, or NaN when it isn't one ("" counts as not typed yet). */
export function typedNumber(text: string): number {
  const cleaned = String(text ?? "").replace(/[$,\s]/g, "");
  if (!cleaned) return Number.NaN;
  return /^\d*\.?\d*$/.test(cleaned) ? Number(cleaned) : Number.NaN;
}

/** Quantity without trailing zeros: 2, 1.5. */
export function quantityText(quantity: number): string {
  return String(Math.round((Number(quantity) || 0) * 100) / 100);
}

/** The amount of a line being typed: Qty × Price, or minus the discount. 0 while incomplete. */
export function draftLineAmount(line: DraftInvoiceLine): number {
  if (isDiscountLine(line)) {
    const off = typedNumber(line.price);
    return Number.isFinite(off) ? -cents(off) : 0;
  }
  const quantity = typedNumber(line.quantity);
  const price = typedNumber(line.price);
  if (!Number.isFinite(quantity) || !Number.isFinite(price)) return 0;
  return cents(quantity * cents(price));
}

export interface InvoiceTotals {
  /** Items before any discount. */
  itemsTotal: number;
  /** Discounts, as a positive amount. */
  discountTotal: number;
  tax: number;
  /** What the customer pays. */
  total: number;
}

/** Totals from line amounts (items positive, discounts negative) and a tax rate in percent. */
export function invoiceTotals(amounts: number[], taxRate: number): InvoiceTotals {
  const itemsTotal = cents(amounts.filter((a) => a > 0).reduce((s, a) => s + a, 0));
  const discountTotal = cents(-amounts.filter((a) => a < 0).reduce((s, a) => s + a, 0));
  const afterDiscounts = cents(itemsTotal - discountTotal);
  const rate = Number.isFinite(taxRate) && taxRate > 0 ? taxRate : 0;
  const tax = Math.round(Math.max(0, afterDiscounts) * rate) / 100;
  return { itemsTotal, discountTotal, tax, total: cents(afterDiscounts + tax) };
}

/** Why a typed line can't be sent yet, or null when it's fine. */
export function draftLineProblem(line: DraftInvoiceLine, index: number): string | null {
  const where = `Line ${index + 1}`;
  if (!line.label.trim()) return `${where}: add a description.`;
  if (isDiscountLine(line)) {
    const off = typedNumber(line.price);
    return Number.isFinite(off) && off > 0 ? null : `${where}: enter the discount amount.`;
  }
  const quantity = typedNumber(line.quantity);
  if (!Number.isFinite(quantity) || quantity <= 0) return `${where}: enter a quantity of 1 or more.`;
  const price = typedNumber(line.price);
  if (!Number.isFinite(price)) return `${where}: enter the price for one.`;
  return null;
}

/** What the server receives for a typed line. A discount is sent as 1 × its amount. */
export function draftLineToSend(line: DraftInvoiceLine) {
  const discount = isDiscountLine(line);
  return {
    label: line.label.trim(),
    kind: line.kind,
    quantity: discount ? 1 : typedNumber(line.quantity),
    unitPrice: cents(typedNumber(line.price)),
  };
}

/** The small line under a saved line's description: "2 × $20.00", or "Discount". */
export function savedLineDetail(line: SavedInvoiceLine): string {
  if (isDiscountLine(line)) return "Discount";
  return `${quantityText(line.quantity)} × ${invoiceMoney(line.unitPrice)}`;
}
