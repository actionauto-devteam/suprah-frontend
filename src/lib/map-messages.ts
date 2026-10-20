/**
 * Plain words for map problems, shown to drivers and Dispatch. The map is
 * never the only way to do something, so each message says the rest of the
 * page still works. Technical details (tokens, HTTP codes, API names) go to
 * the browser console only.
 */
export const MAP_MESSAGES = {
  loading: "Loading the map…",
  updating: "Updating the map…",
  slow: "The map is taking longer than usual. Check your connection. Everything else on this page still works.",
  failed: "The map couldn't load. Everything else on this page still works. Check your connection, then reopen the page.",
  unavailable: "The map isn't available right now. Everything else on this page still works. If this keeps happening, contact support@suprahai.com.",
  unsupported: "This browser can't show the map. Everything else on this page still works. Try another browser, or turn on hardware acceleration in this browser's settings.",
  markersFailed: "Drivers couldn't be shown on the map. The driver list still works. Reopen the page to try again.",
} as const;

/** Logs the technical reason a map failed, for whoever investigates it. */
export function logMapProblem(where: string, detail: unknown) {
  console.warn(`[Map] ${where}:`, detail);
}
