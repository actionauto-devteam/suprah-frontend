/*
 * Maps that follow a driver (decided 2026-11-07): the customer's live map on
 * My Shipments and the driver's own map on the Driver Page follow the driver
 * until the person drags the map to look around; zooming keeps following.
 */

/**
 * Whether a gesture on the map means the person is looking around on their
 * own, so the map stops following: dragging with the mouse or one finger, or
 * the arrow keys. Zooming (scroll, pinch, double tap, the + and − buttons)
 * keeps following. The map's own moves have no event.
 */
export function stopsFollowing(
  event: { type?: string; key?: string; touches?: { length: number } } | null | undefined,
): boolean {
  if (!event?.type) return false
  if (event.type === "keydown") return typeof event.key === "string" && event.key.startsWith("Arrow")
  if (event.touches) return event.touches.length <= 1
  return event.type.startsWith("mouse") || event.type.startsWith("pointer")
}
