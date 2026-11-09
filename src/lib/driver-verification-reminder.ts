/*
 * The Driver Page reminder for approved drivers whose Driver Verification
 * details aren't all in yet (2026-11-09). The backend sends the same labels the
 * approval check uses (e.g. "Insurance Provider", "VIN"); this turns them into
 * plain words for a sentence.
 */

/** "insurance provider, insurance policy number and VIN", or null when nothing is missing. */
export function verificationDetailsText(labels: readonly string[] | null | undefined): string | null {
  const words = (labels ?? [])
    .map((label) => String(label ?? "").trim())
    .filter(Boolean)
    // Lower-case ordinary words; keep CDL, VIN, SSN and numbers as they are.
    .map((label) => label.split(/\s+/).map((word) => (word === word.toUpperCase() ? word : word.toLowerCase())).join(" "));
  if (words.length === 0) return null;
  if (words.length === 1) return words[0];
  return `${words.slice(0, -1).join(", ")} and ${words[words.length - 1]}`;
}
