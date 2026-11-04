import type { CustomerShipmentStage } from "@/lib/api/customerQuoteRequests"

// ─── My Shipments: the live map's words ──────────────────────────────────────
// From pickup until delivery (decided 2026-11-05), the customer sees where the
// driver carrying their car is, and the arrival time once road routes are on,
// with "Running late" when the delivery deadline is at risk. Times are in
// Mountain Time, the dealership's time zone.

/** The stages that show the live map. */
export const LIVE_MAP_STAGES: ReadonlySet<CustomerShipmentStage> = new Set(["picked_up", "on_the_way", "arrived"])

/** How often the map asks for the driver's position while it's open. */
export const LIVE_MAP_REFRESH_MS = 60_000

/** A position older than this is called out, so nobody trusts a frozen dot. */
export const STALE_POSITION_MS = 30 * 60_000

const DENVER = "America/Denver"

const minutesBetween = (fromIso: string, nowMs: number) => {
  const time = new Date(fromIso).getTime()
  return Number.isFinite(time) ? Math.max(0, Math.round((nowMs - time) / 60_000)) : null
}

const durationWords = (minutes: number) => {
  if (minutes < 60) return `${minutes} min`
  const hours = Math.round(minutes / 60)
  return hours < 24 ? `${hours} h` : `${Math.round(hours / 24)} d`
}

/** The time zone's short name at that moment: MST or MDT. */
function zoneOf(date: Date): string {
  const part = new Intl.DateTimeFormat("en-US", { timeZone: DENVER, timeZoneName: "short" })
    .formatToParts(date)
    .find((p) => p.type === "timeZoneName")
  return part?.value ?? "MT"
}

const denverDay = (date: Date) => date.toLocaleDateString("en-CA", { timeZone: DENVER })

/**
 * "Arriving around 3:40 PM MST", with the day when it isn't today
 * ("Arriving around Thu, Nov 6, 3:40 PM MST"). "" when the time isn't valid.
 */
export function arrivalLine(arrivalAt: string | null | undefined, nowMs = Date.now()): string {
  if (!arrivalAt) return ""
  const date = new Date(arrivalAt)
  if (!Number.isFinite(date.getTime())) return ""
  const time = date.toLocaleTimeString("en-US", { timeZone: DENVER, hour: "numeric", minute: "2-digit" })
  const sameDay = denverDay(date) === denverDay(new Date(nowMs))
  const day = sameDay ? "" : `${date.toLocaleDateString("en-US", { timeZone: DENVER, weekday: "short", month: "short", day: "numeric" })}, `
  return `Arriving around ${day}${time} ${zoneOf(date)}`
}

/** "updated just now" / "updated 4 min ago". "" when the time isn't valid. */
export function updatedAgo(iso: string | null | undefined, nowMs = Date.now()): string {
  const minutes = iso ? minutesBetween(iso, nowMs) : null
  if (minutes === null) return ""
  return minutes < 1 ? "updated just now" : `updated ${durationWords(minutes)} ago`
}

/**
 * What the customer reads under the map about the driver's position: live,
 * a few minutes old, or not heard from for a while (with what happens next).
 */
export function positionLine(
  driver: { measuredAt: string; approximate: boolean } | null | undefined,
  nowMs = Date.now(),
): { text: string; stale: boolean } {
  if (!driver) {
    return { text: "Waiting for your driver's location. It shows here as soon as their phone shares it.", stale: true }
  }
  const minutes = minutesBetween(driver.measuredAt, nowMs)
  const approximate = driver.approximate ? " The spot is approximate." : ""
  if (minutes === null) return { text: `Your driver's location.${approximate}`, stale: false }
  if (minutes * 60_000 >= STALE_POSITION_MS) {
    return {
      text: `We haven't had your driver's location for ${durationWords(minutes)}. It updates as soon as their phone reconnects; your vehicle is still on its way.${approximate}`,
      stale: true,
    }
  }
  return {
    text: `${minutes < 2 ? "Live location" : `Location from ${durationWords(minutes)} ago`}. It refreshes about every minute while this page is open.${approximate}`,
    stale: false,
  }
}
