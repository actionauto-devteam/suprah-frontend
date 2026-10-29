import type { Quote } from "@/types/transportation"

// ─── Customer shipping requests: staff answers ───────────────────────────────
// Requests customers send from the customer portal can be accepted or
// declined from the quote card. The server tells the customer either way.

/** The longest decline reason a customer can be given (the server checks too). */
export const DECLINE_REASON_MAX = 300

/** Which answers staff can still give: only on a customer's open request. */
export function customerRequestAnswers(quote: Pick<Quote, "source" | "status">): {
  accept: boolean
  decline: boolean
} {
  const status = String(quote.status ?? "").toLowerCase()
  const fromCustomer = quote.source === "customer_portal"
  return {
    accept: fromCustomer && status === "pending",
    decline: fromCustomer && (status === "pending" || status === "accepted"),
  }
}

/**
 * The delete confirmation. For a customer's open request it suggests Decline
 * instead, and says the customer will be told the request was closed.
 */
export function quoteDeleteConfirmation(
  quote: Pick<Quote, "source" | "status" | "firstName" | "lastName">,
): { title: string; message: string } {
  const name = `${quote.firstName ?? ""} ${quote.lastName ?? ""}`.trim()
  const forWhom = name ? ` for ${name}` : ""
  if (quote.source !== "customer_portal") {
    return {
      title: "Delete Quote",
      message: `Are you sure you want to delete this quote${forWhom}? This action cannot be undone.`,
    }
  }
  const { decline } = customerRequestAnswers(quote)
  return {
    title: "Delete Customer Request",
    message: decline
      ? `This request came from ${name || "a customer"} through the customer portal. To turn it down, use Decline instead so you can tell them why. If you delete it, they'll be told it was closed. This can't be undone.`
      : `This request came from ${name || "a customer"} through the customer portal. Are you sure you want to delete it? This can't be undone.`,
  }
}
