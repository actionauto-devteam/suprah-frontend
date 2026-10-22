export type SmsPhoneProblem = "missing" | "extension" | "invalid";

export function smsPhoneProblem(phone: string | null | undefined): SmsPhoneProblem | null {
  const raw = String(phone ?? "").trim();
  if (!raw) return "missing";
  if (/[^\d\s()+.-]/.test(raw) || raw.lastIndexOf("+") > 0) return "extension";
  const digits = raw.replace(/\D/g, "");
  if (raw.startsWith("+")) {
    return digits.length >= 10 && digits.length <= 15 ? null : "invalid";
  }
  if (digits.length === 10 || (digits.length === 11 && digits.startsWith("1"))) return null;
  return "invalid";
}
