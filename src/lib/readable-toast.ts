import { toast as sonnerToast, type ExternalToast } from "sonner"

/*
 * Toasts people have time to read. Sonner's default hides every toast after
 * 4 seconds, often before a plain-English note (what went wrong, what to do,
 * the support email) has been read. Here:
 * - errors and warnings stay 8 to 15 seconds, by length, with a close button;
 * - successes and other notes stay 4 to 8 seconds, by length;
 * - a duration passed by the caller always wins, and loading toasts stay
 *   until they're replaced, as before.
 *
 * Same API as sonner's `toast`: import { toast } from "@/lib/readable-toast".
 */

type ToastKind = "error" | "warning" | "success" | "info" | "message"
type ToastMessage = Parameters<typeof sonnerToast>[0]

/** About 200 words a minute, plus a moment to notice the toast. */
const MS_PER_WORD = 300

const LIMITS: Record<ToastKind, { min: number; max: number; extra: number }> = {
  error: { min: 8_000, max: 15_000, extra: 3_000 },
  warning: { min: 8_000, max: 15_000, extra: 3_000 },
  success: { min: 4_000, max: 8_000, extra: 1_500 },
  info: { min: 4_000, max: 8_000, extra: 1_500 },
  message: { min: 4_000, max: 8_000, extra: 1_500 },
}

const wordsIn = (value: unknown) => (typeof value === "string" ? value.split(/\s+/).filter(Boolean).length : 0)

/** How long a toast stays, by its kind and how much there is to read. */
export function readableDuration(kind: ToastKind, message: unknown, description?: unknown): number {
  const { min, max, extra } = LIMITS[kind]
  const words = wordsIn(message) + wordsIn(description)
  return Math.min(max, Math.max(min, words * MS_PER_WORD + extra))
}

/** The caller's options, with a reading time (and a close button for problems) unless they set their own. */
export function readableOptions(kind: ToastKind, message: unknown, options?: ExternalToast): ExternalToast {
  return {
    ...(kind === "error" || kind === "warning" ? { closeButton: true } : {}),
    ...options,
    duration: options?.duration ?? readableDuration(kind, message, options?.description),
  }
}

const show = (kind: ToastKind) => (message: ToastMessage, options?: ExternalToast) =>
  kind === "message"
    ? sonnerToast.message(message, readableOptions(kind, message, options))
    : sonnerToast[kind](message, readableOptions(kind, message, options))

/** Drop-in for sonner's `toast` (see above). */
export const toast = Object.assign(
  (message: ToastMessage, options?: ExternalToast) => sonnerToast(message, readableOptions("message", message, options)),
  sonnerToast,
  {
    error: show("error"),
    warning: show("warning"),
    success: show("success"),
    info: show("info"),
    message: show("message"),
  },
) as typeof sonnerToast
