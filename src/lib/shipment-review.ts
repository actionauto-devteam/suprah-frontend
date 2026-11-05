import type { ShipmentReviewInput } from "@/lib/api/shipmentReview"

// ─── Shipment reviews: words and checks ──────────────────────────────────────
// The same limits as the server, so the customer sees what to fix before
// sending. Times are in Mountain Time, like the rest of My Shipments.

export const MAX_DRIVER_COMMENT = 1000
export const MAX_DEALERSHIP_COMMENT = 2000

/** "4 out of 5 stars" for screen readers and summaries. */
export function starsLabel(stars: number | null | undefined): string {
  const n = Math.round(Number(stars) || 0)
  if (n < 1 || n > 5) return "No stars"
  return `${n} out of 5 star${n === 1 ? "" : "s"}`
}

/** "4.7 from 3 customers" for Driver Tracker. "" when there are no ratings yet. */
export function ratingSummary(rating: { average: number; count: number } | null | undefined): string {
  if (!rating || !(rating.count > 0) || !Number.isFinite(rating.average)) return ""
  return `${rating.average.toFixed(1)} from ${rating.count} customer${rating.count === 1 ? "" : "s"}`
}

/**
 * What's missing from a review before it can be sent, in plain English, or
 * null when it's ready. `hasDriver` is false when nobody drove the load.
 */
export function reviewProblem(review: ShipmentReviewInput, hasDriver: boolean): string | null {
  const stars = hasDriver ? review.driverStars ?? null : null
  const driverWords = hasDriver ? (review.driverComment ?? "").trim() : ""
  const dealerWords = (review.dealershipComment ?? "").trim()
  if (driverWords && !stars) return "Choose 1 to 5 stars for your driver, then send your review."
  if (driverWords.length > MAX_DRIVER_COMMENT) {
    return `What you wrote about your driver can be up to ${MAX_DRIVER_COMMENT.toLocaleString("en-US")} characters. Shorten it and try again.`
  }
  if (dealerWords.length > MAX_DEALERSHIP_COMMENT) {
    return `What you wrote for the dealership can be up to ${MAX_DEALERSHIP_COMMENT.toLocaleString("en-US")} characters. Shorten it and try again.`
  }
  if (!stars && !dealerWords) {
    return hasDriver
      ? "Choose stars for your driver or write a few words for the dealership, then send your review."
      : "Write a few words for the dealership, then send your review."
  }
  return null
}

/** Whether the customer started a review (otherwise "Confirm received" sends none). */
export function reviewStarted(review: ShipmentReviewInput): boolean {
  return Boolean(review.driverStars) || Boolean((review.driverComment ?? "").trim()) || Boolean((review.dealershipComment ?? "").trim())
}

/** "You confirmed you received it on Nov 5 at 3:40 PM MST." */
export function receivedLine(receivedAt: string | null | undefined): string {
  if (!receivedAt) return ""
  const date = new Date(receivedAt)
  if (!Number.isFinite(date.getTime())) return ""
  const day = date.toLocaleDateString("en-US", { timeZone: "America/Denver", month: "short", day: "numeric" })
  const time = date.toLocaleTimeString("en-US", { timeZone: "America/Denver", hour: "numeric", minute: "2-digit", timeZoneName: "short" })
  return `You confirmed you received it on ${day} at ${time}.`
}
