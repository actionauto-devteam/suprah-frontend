/**
 * What a customer payment is for (2026-11-21, decision B1). Matches the
 * server's list; "other" is used when none was chosen.
 */
export const PAYMENT_PURPOSES = [
  { value: "shipping", label: "Shipping" },
  { value: "car_deposit", label: "Deposit to hold a car" },
  { value: "aftermarket", label: "Aftermarket product" },
  { value: "service", label: "Service and repairs" },
  { value: "down_payment", label: "Down payment" },
  { value: "other", label: "Other" },
] as const;

export type PaymentPurpose = (typeof PAYMENT_PURPOSES)[number]["value"];

/** The label for a purpose, or null when there's nothing worth showing. */
export function paymentPurposeLabel(purpose: string | null | undefined): string | null {
  if (!purpose || purpose === "other") return null;
  return PAYMENT_PURPOSES.find((p) => p.value === purpose)?.label ?? null;
}
