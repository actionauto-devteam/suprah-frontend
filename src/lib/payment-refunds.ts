/**
 * Refund amounts on a payment (2026-11-19). A payment can be refunded in
 * parts: a partly refunded payment stays "succeeded" and records
 * `refundedAmount`; only a full refund changes its status to "refunded".
 */

type RefundablePayment = { status: string; amount: number; refundedAmount?: number | null };

const cents = (value: number) => Math.round(value * 100) / 100;

/** Money already sent back to the customer. */
export function refundedSoFar(payment: RefundablePayment): number {
  if (payment.status === "refunded") return cents(Number(payment.refundedAmount) || Number(payment.amount) || 0);
  return cents(Number(payment.refundedAmount) || 0);
}

/**
 * Money from a paid payment that the dealership still has: what it kept,
 * and also the most that can still be refunded. Zero unless it was paid.
 */
export function notRefunded(payment: RefundablePayment): number {
  if (payment.status !== "succeeded") return 0;
  return Math.max(0, cents((Number(payment.amount) || 0) - refundedSoFar(payment)));
}

export function isPartlyRefunded(payment: RefundablePayment): boolean {
  return payment.status === "succeeded" && refundedSoFar(payment) > 0;
}

/**
 * Card disputes (chargebacks), 2026-11-20: a disputed payment keeps counting
 * while the bank reviews it; a dispute the dealership lost is left out like a
 * refund. Matches the server's revenue totals.
 */
type DisputablePayment = RefundablePayment & {
  disputeStatus?: "open" | "won" | "lost" | string | null;
  disputedAmount?: number | null;
};

/** Money lost to a dispute the dealership lost (0 while open or if won). */
export function lostToDispute(payment: DisputablePayment): number {
  return payment.disputeStatus === "lost" ? cents(Number(payment.disputedAmount) || 0) : 0;
}

/** Money a paid payment kept: not refunded and not lost to a dispute. */
export function keptAmount(payment: DisputablePayment): number {
  return Math.max(0, cents(notRefunded(payment) - lostToDispute(payment)));
}

/** A short label for a dispute that matters on screen, or null. */
export function disputeLabel(payment: DisputablePayment): "Disputed" | "Dispute lost" | null {
  if (payment.disputeStatus === "open") return "Disputed";
  if (payment.disputeStatus === "lost") return "Dispute lost";
  return null;
}

/**
 * The Payments page's Revenue Trend: the last 6 months (UTC, like the
 * server's totals), oldest first, with the money kept in each. Months the
 * server didn't send count as 0.
 */
export function revenueTrend(
  monthly: Array<{ year: number; month: number; revenue: number }> | undefined,
  now: Date,
): Array<{ label: string; value: number }> {
  const byKey = new Map((monthly ?? []).map((m) => [`${m.year}-${m.month}`, Number(m.revenue) || 0]));
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (5 - i), 1));
    return {
      label: d.toLocaleString("en-US", { month: "short", timeZone: "UTC" }),
      value: byKey.get(`${d.getUTCFullYear()}-${d.getUTCMonth() + 1}`) ?? 0,
    };
  });
}
