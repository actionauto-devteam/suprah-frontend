import type { CustomerShipmentStage, CustomerShipmentTracking } from "@/lib/api/customerQuoteRequests"

// ─── My Shipments: the live map's words ──────────────────────────────────────
// From pickup until delivery (decided 2026-11-05), the customer sees where the
// driver carrying their car is, moving live, and the delivery point, plus the
// arrival time once road routes are on, with "Running late" when the delivery
// deadline is at risk. Times are in Mountain Time, the dealership's time zone.

/** The stages that show the live map. */
export const LIVE_MAP_STAGES: ReadonlySet<CustomerShipmentStage> = new Set(["picked_up", "on_the_way", "arrived"])

/**
 * How often the map also asks for the latest while it's open. The driver's
 * position arrives live (CUSTOMER_LOCATION_EVENT); this catches anything
 * missed and refreshes the arrival time.
 */
export const LIVE_MAP_REFRESH_MS = 60_000

/** The driver's new position, sent to the customer the moment it arrives. */
export const CUSTOMER_LOCATION_EVENT = "customer-shipment:location"

/** Staff unlinked a shipment from the customer's portal, or linked it again. */
export const CUSTOMER_SHIPMENT_CHANGED_EVENT = "customer-shipment:changed"

/** Where every shipment notification links to. */
export const MY_SHIPMENTS_ROUTE = "/customer/shipments"

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
    text: `${minutes < 2 ? "Live location" : `Location from ${durationWords(minutes)} ago`}. It moves on the map as your driver does, while this page is open.${approximate}`,
    stale: false,
  }
}

/** A live position update for one shipment (see CUSTOMER_LOCATION_EVENT). */
export interface LivePositionUpdate {
  quoteId: string
  driver: NonNullable<CustomerShipmentTracking["driver"]>
}

const validPoint = (point: { lat?: unknown; lng?: unknown } | null | undefined) =>
  Boolean(point) && Number.isFinite(Number(point?.lat)) && Number.isFinite(Number(point?.lng))

/**
 * The map's data with the driver's newer position from a live update. The
 * same data when the update is for another shipment, older than what's shown,
 * or broken, or when the map isn't live.
 */
export function withLivePosition(
  view: CustomerShipmentTracking | undefined,
  update: LivePositionUpdate | null | undefined,
  shipmentId: string,
): CustomerShipmentTracking | undefined {
  if (!view?.live || !update || update.quoteId !== shipmentId || !validPoint(update.driver?.position)) return view
  const next = new Date(update.driver.measuredAt).getTime()
  if (!Number.isFinite(next)) return view
  const shown = view.driver ? new Date(view.driver.measuredAt).getTime() : Number.NEGATIVE_INFINITY
  if (Number.isFinite(shown) && next <= shown) return view
  return {
    ...view,
    driver: {
      position: { lat: Number(update.driver.position.lat), lng: Number(update.driver.position.lng) },
      measuredAt: new Date(next).toISOString(),
      approximate: Boolean(update.driver.approximate),
    },
  }
}

/**
 * Where a shipment step's notification goes: that shipment on My Shipments
 * (2026-11-13). Steps were saved with only the page's address, plus the
 * shipment's quote id, so older ones open the right shipment too.
 */
export function shipmentNotificationRoute(
  notification: { metadata?: { route?: unknown; quoteId?: unknown } | null } | null | undefined,
): string | null {
  if (notification?.metadata?.route !== MY_SHIPMENTS_ROUTE) return null
  const quoteId = String(notification.metadata.quoteId ?? "").trim()
  return /^[a-f0-9]{24}$/i.test(quoteId) ? `${MY_SHIPMENTS_ROUTE}?shipment=${quoteId}` : null
}

/** Whether a notification is about the customer's shipments (every shipment step sends one). */
export function isShipmentNotification(notification: { metadata?: { route?: unknown } | null } | null | undefined): boolean {
  const route = typeof notification?.metadata?.route === "string" ? notification.metadata.route : ""
  return route === MY_SHIPMENTS_ROUTE || route.startsWith(`${MY_SHIPMENTS_ROUTE}?`)
}

// ─── The live map's camera ───────────────────────────────────────────────────

/** How close the map is while it follows the driver: a few streets around them. */
export const FOLLOW_ZOOM = 13
/** How close the map is on the delivery point while the driver's location is on its way. */
const DELIVERY_ZOOM = 12

type MapPoint = { lat: number; lng: number }

/** Where the live map looks next; null leaves the customer's own view alone. */
export type LiveMapCameraMove = {
  target: "driver" | "delivery"
  center: [number, number]
  /** Set for a first look (the map goes straight there); left out to glide along at the customer's zoom. */
  zoom?: number
} | null

/**
 * Like a ride-hailing app: while following, the map first centres on the
 * driver a few streets close (or closer, if the customer zoomed in), then
 * glides along with each new position at whatever zoom the customer picked.
 * Without a driver position yet, the delivery point is shown once. Not
 * following: nothing moves the customer's view. Which gestures stop following
 * is in lib/map-follow.
 */
export function liveMapCamera(input: {
  following: boolean
  /** The map already centred on the driver once since following (re)started. */
  started: boolean
  driver: MapPoint | null
  delivery: MapPoint | null
  /** The delivery point was already shown while waiting for the driver. */
  deliveryShown: boolean
  currentZoom: number
}): LiveMapCameraMove {
  const { following, started, driver, delivery, deliveryShown, currentZoom } = input
  if (driver && following) {
    const center: [number, number] = [driver.lng, driver.lat]
    return started ? { target: "driver", center } : { target: "driver", center, zoom: Math.max(currentZoom, FOLLOW_ZOOM) }
  }
  if (!driver && delivery && !deliveryShown) {
    return { target: "delivery", center: [delivery.lng, delivery.lat], zoom: Math.max(currentZoom, DELIVERY_ZOOM) }
  }
  return null
}
