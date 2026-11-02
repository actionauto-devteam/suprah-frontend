/**
 * A CRM lead's shipping quotes and the loads they became, for the lead page's
 * Shipping list (decided 2026-10-30). Quotes are made from the lead's own
 * Quote shipping button, which links them to that lead.
 */

/** One of a lead's shipping quotes and the load it became (GET /api/quotes/for-lead/:leadId). */
export interface LeadShipment {
  quoteId: string
  status: string
  source: string
  vehicleName: string
  rate: number | null
  createdAt: string | null
  load: { _id: string; loadNumber: string; status: string } | null
}

const QUOTE_STATUS_WORDS: Record<string, string> = {
  pending: "Pending",
  accepted: "Accepted",
  rejected: "Rejected",
  booked: "Converted to Load",
}

/** A quote's status in the words the Quotes tab uses. */
export function quoteStatusWords(status: string): string {
  return QUOTE_STATUS_WORDS[status] ?? status
}

/** "$950" for a quote's price, or "" when there's none. */
export function quotePriceWords(rate: number | null | undefined): string {
  return typeof rate === "number" && Number.isFinite(rate) && rate > 0 ? `$${Math.round(rate).toLocaleString("en-US")}` : ""
}

/** Sent after a quote is made from a lead, so that lead's Shipping list refreshes. */
export const LEAD_SHIPMENTS_CHANGED_EVENT = "suprah:lead-shipments-changed"

export function announceLeadShipmentsChanged(leadId: string): void {
  if (typeof window === "undefined" || !leadId) return
  window.dispatchEvent(new CustomEvent(LEAD_SHIPMENTS_CHANGED_EVENT, { detail: { leadId } }))
}

/** The lead an announcement is about, or "" when it isn't one. */
export function leadIdFromShipmentsEvent(event: Event): string {
  const detail = (event as CustomEvent<{ leadId?: unknown } | null>).detail
  return typeof detail?.leadId === "string" ? detail.leadId : ""
}
