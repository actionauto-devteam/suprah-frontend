/**
 * Who pays for a load's shipping (SuprahPay, decisions of 2026-11-25), for
 * the screens. The server decides and checks everything again.
 *
 * 2026-11-26: cash is on delivery only (COD). Cash on pickup means the
 * customer collects the car at the dealership, so there's no shipment. A car
 * sold to the person receiving it also gets the dealership's automatic
 * SuprahPay invoice for its price plus sales tax.
 */

export type LoadBillTo = "customer" | "dealership"
export type LoadBillingMethod = "suprahpay" | "cod"

export interface LoadBilling {
  billTo?: LoadBillTo
  /** "cop" only on loads saved while testing, before 2026-11-26: shown as cash on delivery. */
  method?: LoadBillingMethod | "cop"
  customerName?: string
  customerEmail?: string
  shippingPrice?: number
  /** A car sold to the person receiving it: what they pay the dealership for it. */
  vehiclePrice?: number
  vehicleTaxRate?: number
  vehicleInvoiceId?: string
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
  /** The dealership's invoice to the customer for the car (2026-11-26). */
  carInvoice?: { status: string; amount: number; invoiceNumber?: string; paidAt?: string | null } | null
  driverPay: { ok: true; amount: number } | { ok: false; code: string; message: string }
}

/** What staff choose in Create Load, or for an older load. */
export interface LoadBillingInput {
  billTo: LoadBillTo | ""
  method: LoadBillingMethod
  customerName: string
  customerEmail: string
  shippingPrice: string
  /** A car sold to the person receiving it: its price, and its sales tax (blank = the dealership's default). */
  vehiclePrice: string
  vehicleTaxRate: string
}

export const EMPTY_BILLING_INPUT: LoadBillingInput = {
  billTo: "",
  method: "suprahpay",
  customerName: "",
  customerEmail: "",
  shippingPrice: "",
  vehiclePrice: "",
  vehicleTaxRate: "",
}

export const BILLING_METHOD_LABEL: Record<LoadBillingMethod | "cop", string> = {
  suprahpay: "SuprahPay invoice",
  cod: "Cash to the driver on delivery (COD)",
  // Loads saved while testing, before 2026-11-26.
  cop: "Cash to the driver on delivery (COD)",
}

/** Whether the customer pays the driver in cash (older test loads may say "cop"). */
export const isCashMethod = (method: string | undefined | null) => method === "cod" || method === "cop"

export const INVOICE_STATUS_LABEL: Record<string, string> = {
  pending: "Not paid yet",
  failed: "Card declined, not paid yet",
  processing: "Payment started",
  succeeded: "Paid",
  refunded: "Refunded",
  cancelled: "Cancelled",
}

/** Dollars with cents and thousands separators: $19,841.25. */
export const formatDollars = (value: number) =>
  `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MAX_VEHICLE_PRICE = 999_999.99
const hasCents = (n: number) => Math.abs(Math.round(n * 100) - n * 100) > 1e-6

function customerProblem(input: LoadBillingInput): string | null {
  if (!input.customerName.trim()) return "Enter the customer's name."
  if (!EMAIL.test(input.customerEmail.trim())) return "Enter the customer's email address, for example name@example.com."
  return null
}

/** The problem with the car's price or sales tax, or null. */
function vehicleProblem(input: LoadBillingInput): string | null {
  const price = Number(input.vehiclePrice.trim())
  if (!input.vehiclePrice.trim() || !Number.isFinite(price) || price <= 0 || price > MAX_VEHICLE_PRICE || hasCents(price)) {
    return "Enter the car's price the customer pays your dealership, in dollars and cents, for example 18500.00."
  }
  if (input.vehicleTaxRate.trim()) {
    const rate = Number(input.vehicleTaxRate.trim())
    if (!Number.isFinite(rate) || rate < 0 || rate > 100) return "Enter the car's sales tax as a percentage from 0 to 100, for example 7.25."
  }
  return null
}

/**
 * The problem with a billing choice (shown on the form), or null. Same rules
 * as the server. `soldToReceiver`: Create Load's "the car is sold to the
 * person receiving it" (the car's price and the buyer are then needed).
 */
export function billingInputProblem(input: LoadBillingInput, carrierPay: number | null, soldToReceiver = false): string | null {
  if (!input.billTo) return "Choose who pays for this load: a customer or your dealership."
  if (carrierPay === null || carrierPay <= 0) return "Enter the driver's pay first."
  if (input.billTo === "customer" || soldToReceiver) {
    const problem = customerProblem(input)
    if (problem) return problem
  }
  if (soldToReceiver) {
    const problem = vehicleProblem(input)
    if (problem) return problem
  }
  if (input.billTo === "dealership" || input.method !== "suprahpay") return null
  const price = Number(input.shippingPrice.trim())
  if (!input.shippingPrice.trim() || !Number.isFinite(price) || price <= 0) {
    return "Enter the shipping price the customer pays, for example 650.00."
  }
  if (hasCents(price)) return "Enter the shipping price in dollars and cents, for example 650.00."
  if (carrierPay > price) return "The driver's pay can't be more than the customer's shipping price."
  return null
}

/** The body the server takes for a billing choice. */
export function billingInputToSend(input: LoadBillingInput, soldToReceiver = false) {
  const sale = soldToReceiver
    ? {
        customerName: input.customerName.trim(),
        customerEmail: input.customerEmail.trim(),
        vehicle: {
          price: Number(input.vehiclePrice.trim()),
          ...(input.vehicleTaxRate.trim() ? { taxRate: Number(input.vehicleTaxRate.trim()) } : {}),
        },
      }
    : {}
  if (input.billTo === "dealership") return { billTo: "dealership", method: "suprahpay", ...sale }
  return {
    billTo: "customer",
    method: input.method,
    customerName: input.customerName.trim(),
    customerEmail: input.customerEmail.trim(),
    ...(input.method === "suprahpay" ? { shippingPrice: Number(input.shippingPrice.trim()) } : {}),
    ...sale,
  }
}

/** The car invoice's total: price plus sales tax, rounded like the server. Null when the price isn't valid yet. */
export function vehicleInvoiceTotal(price: string, taxRate: string, defaultTaxRate: number): number | null {
  const subtotal = Number(price.trim())
  if (!price.trim() || !Number.isFinite(subtotal) || subtotal <= 0) return null
  const rate = taxRate.trim() ? Number(taxRate.trim()) : defaultTaxRate
  if (!Number.isFinite(rate) || rate < 0 || rate > 100) return null
  const tax = Math.round(subtotal * rate) / 100
  return Math.round((subtotal + tax) * 100) / 100
}
