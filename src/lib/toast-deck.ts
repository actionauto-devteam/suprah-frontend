/**
 * One toast card at a time (2026-11-13): when several toasts are open, the card
 * shows one of them and a button on its right steps through the rest
 * (1 → 2 → 3 → back to 1). These are the deck's rules, kept free of React so
 * they can be tested on their own.
 *
 * Toasts are listed newest first, as the toast library keeps them.
 */

export type DeckToastId = string | number;

/** The library's own default, used when a toast doesn't set its duration. */
export const DEFAULT_TOAST_LIFETIME = 4000;

/** The toast after the one on show; after the last one comes the first again. */
export function nextDeckIndex(current: number, count: number): number {
  if (count <= 0) return 0;
  return (((current + 1) % count) + count) % count;
}

/**
 * Which toast to show after the list changed:
 * - a toast that just arrived shows at once;
 * - otherwise the toast on show stays on show;
 * - if that one closed, the one that took its place shows (or the last one).
 */
export function deckIndexAfterChange(
  previousIds: readonly DeckToastId[],
  nextIds: readonly DeckToastId[],
  shownId: DeckToastId | null,
  shownIndex: number,
): number {
  if (nextIds.length === 0) return 0;
  const arrived = nextIds.find((id) => !previousIds.includes(id));
  if (arrived !== undefined) return nextIds.indexOf(arrived);
  if (shownId !== null) {
    const stillOpen = nextIds.indexOf(shownId);
    if (stillOpen !== -1) return stillOpen;
  }
  return Math.min(Math.max(shownIndex, 0), nextIds.length - 1);
}

/**
 * How long a toast stays on screen, in ms. Loading toasts (including a
 * promise toast still waiting) stay until they're updated or dismissed.
 */
export function toastLifetime(
  toast: { type?: string; duration?: number },
  fallback: number = DEFAULT_TOAST_LIFETIME,
): number {
  if (toast.type === "loading") return Infinity;
  if (typeof toast.duration === "number" && toast.duration > 0) return toast.duration;
  return fallback;
}

/** The switch button's position text, e.g. "2/3". */
export function deckPositionLabel(index: number, count: number): string {
  return `${Math.min(index, Math.max(count - 1, 0)) + 1}/${count}`;
}

/** What the switch button says to screen readers. */
export function deckSwitchLabel(index: number, count: number): string {
  const next = nextDeckIndex(index, count) + 1;
  return `Message ${index + 1} of ${count}. Show message ${next}.`;
}

/** How far a toast must be swiped sideways to dismiss it, in px. */
export const SWIPE_DISMISS_DISTANCE = 64;
