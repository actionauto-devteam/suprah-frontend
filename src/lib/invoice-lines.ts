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

/** The boxes on a line of the Create invoice form. */
export type DraftLineField = "label" | "quantity" | "price";

/**
 * Everything on a typed line that stops it being sent, box by box, so the
 * form can highlight each one (2026-11-23). Empty when the line is fine.
 */
export function draftLineIssues(line: DraftInvoiceLine, index: number): { field: DraftLineField; message: string }[] {
  const where = `Line ${index + 1}`;
  const issues: { field: DraftLineField; message: string }[] = [];
  if (!line.label.trim()) issues.push({ field: "label", message: `${where}: add a description.` });
  if (isDiscountLine(line)) {
    const off = typedNumber(line.price);
    if (!(Number.isFinite(off) && off > 0)) issues.push({ field: "price", message: `${where}: enter the discount amount.` });
    return issues;
  }
  const quantity = typedNumber(line.quantity);
  if (!Number.isFinite(quantity) || quantity <= 0) {
    issues.push({ field: "quantity", message: `${where}: enter a quantity of 1 or more.` });
  }
  if (!Number.isFinite(typedNumber(line.price))) issues.push({ field: "price", message: `${where}: enter the price for one.` });
  return issues;
}

/** Why a typed line can't be sent yet (its first problem), or null when it's fine. */
export function draftLineProblem(line: DraftInvoiceLine, index: number): string | null {
  return draftLineIssues(line, index)[0]?.message ?? null;
}

/**
 * Which box of the Create invoice form a message from the server is about,
 * so that box is highlighted too: "line-2-price", "tax", "due", "note",
 * "items" or "total". Null when it isn't about one box (for example, no
 * Finance access).
 */
export function invoiceIssueKeyForServerMessage(message: string): string | null {
  const line = /^Line (\d+)/.exec(message);
  if (line) {
    const index = Number(line[1]) - 1;
    if (/description/i.test(message)) return `line-${index}-label`;
    if (/quantity/i.test(message)) return `line-${index}-quantity`;
    return `line-${index}-price`;
  }
  if (/at least one item/i.test(message)) return "items";
  if (/tax rate/i.test(message)) return "tax";
  if (/due date/i.test(message)) return "due";
  if (/note to the customer/i.test(message)) return "note";
  if (/invoice total|limit of|amount must be/i.test(message)) return "total";
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
