// Create Load phone numbers are saved as the 10 digits of a US number
// (2026-11-10). People type or paste them with formatting or the +1 country
// code, such as "+1 (801) 555-0100": the formatting is dropped, and so is a
// leading 1 when there are more than 10 digits, so that saves as 8015550100
// instead of a cut-off number.
export function usPhoneDigits(input: string | null | undefined): string {
  const digits = String(input ?? "").replace(/\D/g, "");
  const local = digits.length > 10 && digits.startsWith("1") ? digits.slice(1) : digits;
  return local.slice(0, 10);
}

/** True when some digits were entered but not all 10. */
export function usPhoneIncomplete(input: string | null | undefined): boolean {
  const count = String(input ?? "").replace(/\D/g, "").length;
  return count > 0 && count < 10;
}
