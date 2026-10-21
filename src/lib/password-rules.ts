/**
 * Password rules for every new account and every password reset. Must match
 * strongPasswordProblems on the server (validations/auth.validation.ts).
 */
export const PASSWORD_RULES = [
  { key: "length", label: "At least 8 characters", test: (p: string) => p.length >= 8 },
  { key: "uppercase", label: "One uppercase letter", test: (p: string) => /[A-Z]/.test(p) },
  { key: "number", label: "One number", test: (p: string) => /[0-9]/.test(p) },
  { key: "special", label: "One special character", test: (p: string) => /[^A-Za-z0-9]/.test(p) },
] as const;

/** A sentence naming the rules this password misses, or null when it meets them all. */
export function passwordRulesMessage(password: string): string | null {
  const missing = PASSWORD_RULES.filter((rule) => !rule.test(password));
  if (missing.length === 0) return null;
  return `Your password needs ${missing.map((rule) => rule.label.toLowerCase()).join(", ")}.`;
}
