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
