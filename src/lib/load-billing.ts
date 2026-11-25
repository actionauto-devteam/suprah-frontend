/**
 * Who pays for a load's shipping (SuprahPay, decisions of 2026-11-25), for
 * the screens. The server decides and checks everything again.
 */

export type LoadBillTo = "customer" | "dealership"
export type LoadBillingMethod = "suprahpay" | "cop" | "cod"

export interface LoadBilling {
  billTo?: LoadBillTo
  method?: LoadBillingMethod
  customerName?: string
  customerEmail?: string
  shippingPrice?: number
  /** Pricing was skipped: settled outside Suprah, the staff pay the driver directly. */
  outside?: boolean
  invoiceId?: string
  cashConfirmedAt?: string | null
  cashNotReceivedAt?: string | null
  cashCustomerConfirmedAt?: string | null
}

export interface LoadBillingSummary {
  billing: LoadBilling | null
  invoice: { status: string; amount: number; billedTo?: LoadBillTo; invoiceNumber?: string; paidAt?: string | null } | null
  driverPay: { ok: true; amount: number } | { ok: false; code: string; message: string }
}

/** What staff choose in Create Load, or for an older load. */
export interface LoadBillingInput {
  billTo: LoadBillTo | ""
  method: LoadBillingMethod
  customerName: string
  customerEmail: string
  shippingPrice: string
}

export const EMPTY_BILLING_INPUT: LoadBillingInput = {
  billTo: "",
  method: "suprahpay",
  customerName: "",
  customerEmail: "",
  shippingPrice: "",
}

export const BILLING_METHOD_LABEL: Record<LoadBillingMethod, string> = {
  suprahpay: "SuprahPay invoice",
  cop: "Cash to the driver at pickup (COP)",
  cod: "Cash to the driver on delivery (COD)",
}

export const INVOICE_STATUS_LABEL: Record<string, string> = {
  pending: "Not paid yet",
  failed: "Card declined, not paid yet",
  processing: "Payment started",
  succeeded: "Paid",
  refunded: "Refunded",
  cancelled: "Cancelled",
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** The problem with a billing choice (shown on the form), or null. Same rules as the server. */
export function billingInputProblem(input: LoadBillingInput, carrierPay: number | null): string | null {
  if (!input.billTo) return "Choose who pays for this load: a customer or your dealership."
  if (carrierPay === null || carrierPay <= 0) return "Enter the driver's pay first."
  if (input.billTo === "dealership") return null
  if (!input.customerName.trim()) return "Enter the customer's name."
  if (!EMAIL.test(input.customerEmail.trim())) return "Enter the customer's email address, for example name@example.com."
  if (input.method !== "suprahpay") return null
  const price = Number(input.shippingPrice.trim())
  if (!input.shippingPrice.trim() || !Number.isFinite(price) || price <= 0) {
    return "Enter the shipping price the customer pays, for example 650.00."
  }
  if (Math.abs(Math.round(price * 100) - price * 100) > 1e-6) return "Enter the shipping price in dollars and cents, for example 650.00."
  if (carrierPay > price) return "The driver's pay can't be more than the customer's shipping price."
  return null
}

/** The body the server takes for a billing choice. */
export function billingInputToSend(input: LoadBillingInput) {
  if (input.billTo === "dealership") return { billTo: "dealership", method: "suprahpay" }
  return {
    billTo: "customer",
    method: input.method,
    customerName: input.customerName.trim(),
    customerEmail: input.customerEmail.trim(),
    ...(input.method === "suprahpay" ? { shippingPrice: Number(input.shippingPrice.trim()) } : {}),
  }
}
