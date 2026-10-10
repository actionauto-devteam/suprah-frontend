import type { LoadStatus } from "@/types/load";

/**
 * Status colours for the phone redesign (iPhone deck, slide 13):
 * amber = attention, purple = in flight, mint = done/live.
 */
export type PreviewTone = "mint" | "purple" | "amber" | "blue" | "grey";

export const LOAD_STATUS_TONE: Record<LoadStatus, PreviewTone> = {
  Draft: "grey",
  Posted: "blue",
  // Waiting for the driver to accept.
  Assigned: "amber",
  Accepted: "purple",
  "Picked Up": "purple",
  "In-Transit": "purple",
  Delivered: "mint",
  Cancelled: "grey",
};

/** Every load status, in lifecycle order. */
export const LOAD_STATUS_ORDER = Object.keys(LOAD_STATUS_TONE) as LoadStatus[];

export const QUOTE_STATUS_TONE: Record<string, PreviewTone> = {
  pending: "amber",
  accepted: "purple",
  booked: "mint",
  rejected: "grey",
};

export function loadStatusTone(status: string): PreviewTone {
  return LOAD_STATUS_TONE[status as LoadStatus] ?? "grey";
}

export function quoteStatusTone(status: string): PreviewTone {
  return QUOTE_STATUS_TONE[status.toLowerCase()] ?? "grey";
}
