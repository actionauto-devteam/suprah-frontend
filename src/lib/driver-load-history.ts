/**
 * The driver's Loads page (2026-11-15): current loads come in full, delivered
 * loads come a page at a time from the server (newest first), so the page no
 * longer downloads every load the driver ever had every 30 seconds.
 */

type WithId = { _id: string };

/** Current loads with the details the Accept window needs. */
export const CURRENT_LOADS_URL = "/api/driver-tracking/my-loads?view=current";

/** One page of delivered loads, optionally searched on the server. */
export function deliveredLoadsUrl(page: number, search: string): string {
  const params = new URLSearchParams({ view: "history", page: String(Math.max(1, Math.floor(page) || 1)) });
  const q = search.trim();
  if (q) params.set("q", q.slice(0, 60));
  return `/api/driver-tracking/my-loads?${params.toString()}`;
}

/**
 * A refresh brings the newest page again; older pages the driver already
 * opened with Load more stay, without repeating any load.
 */
export function refreshDeliveredLoads<T extends WithId>(shown: T[], firstPage: T[]): T[] {
  const fresh = new Set(firstPage.map((load) => load._id));
  return [...firstPage, ...shown.filter((load) => !fresh.has(load._id))];
}

/** The next page goes after the loads already shown, without repeats. */
export function appendDeliveredLoads<T extends WithId>(shown: T[], nextPage: T[]): T[] {
  const seen = new Set(shown.map((load) => load._id));
  return [...shown, ...nextPage.filter((load) => !seen.has(load._id))];
}
