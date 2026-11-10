/**
 * A phone number with its area code (10 to 15 digits, at most 30 characters),
 * or "" when it isn't one. The server uses the same rule for a customer's
 * shipping quote request (2026-11-10).
 */
export function usableQuotePhone(value: unknown): string {
  const phone = String(value ?? "").trim();
  const digits = phone.replace(/\D/g, "");
  return phone.length <= 30 && digits.length >= 10 && digits.length <= 15 ? phone : "";
}
