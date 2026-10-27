// Mirrors suprah-backend/src/constants/loadCancellation.ts. Change both together.

export const LOAD_CANCELLATION_REASONS = [
  "customer_cancelled",
  "vehicle_unavailable",
  "duplicate_load",
  "price_not_agreed",
  "other",
] as const;

export type LoadCancellationReason = (typeof LOAD_CANCELLATION_REASONS)[number];

export const LOAD_CANCELLATION_REASON_LABELS: Readonly<Record<LoadCancellationReason, string>> = {
  customer_cancelled: "Customer cancelled",
  vehicle_unavailable: "Vehicle sold or unavailable",
  duplicate_load: "Duplicate load",
  price_not_agreed: "Price not agreed",
  other: "Other",
};

/** "Other" needs a note at least this long. */
export const LOAD_CANCELLATION_NOTE_MIN = 3;
export const LOAD_CANCELLATION_NOTE_MAX = 500;

/** The reason's label, or a plain fallback for a value this app doesn't know yet. */
export function cancellationReasonLabel(reason: unknown): string {
  const key = String(reason ?? "") as LoadCancellationReason;
  return LOAD_CANCELLATION_REASON_LABELS[key] ?? "Reason not recorded";
}

/** Whether the Cancel load form can be sent: a reason, and a note for "Other". */
export function canSubmitCancellation(reason: LoadCancellationReason | null, note: string): boolean {
  if (!reason) return false;
  const length = note.trim().length;
  if (length > LOAD_CANCELLATION_NOTE_MAX) return false;
  return reason !== "other" || length >= LOAD_CANCELLATION_NOTE_MIN;
}
