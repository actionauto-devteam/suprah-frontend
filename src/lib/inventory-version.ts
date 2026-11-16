/**
 * Inventory's quiet refresh (2026-11-16): every two minutes the page first asks
 * for a small "has anything changed?" stamp and downloads the whole inventory
 * again only when it differs from the one the cars on screen came with. If the
 * stamp can't be read (an older server, a failed request), it downloads as
 * before, so the list is never left out of date.
 */
export const INVENTORY_VERSION_URL = "/api/vehicles/inventory-version"

/** The stamp the full inventory list came with, if the server sent one. */
export function inventoryVersionOf(responseData: unknown): string | null {
  const version = (responseData as { inventoryVersion?: unknown } | null | undefined)?.inventoryVersion
  return typeof version === "string" && version.trim() ? version.trim() : null
}

/** True only when both stamps are known and the same. */
export function inventoryUnchanged(known: string | null | undefined, latest: string | null | undefined): boolean {
  return Boolean(known && latest && known === latest)
}
