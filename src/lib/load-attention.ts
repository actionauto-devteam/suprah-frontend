import type { LoadAttentionItem, LoadAttentionKind } from "@/lib/api/loads"

// ─── Needs attention: wording and links ───────────────────────────────────────
// The text and destination of each row in Transportation's "Needs attention"
// list. Kept apart from the panel so the wording can be tested.

/** Display order, most urgent first. Mirrors the server's ATTENTION_KINDS. */
export const ATTENTION_KIND_ORDER: LoadAttentionKind[] = [
  "proof_waiting",
  "late_delivery",
  "late_pickup",
  "unassigned_pickup",
  "not_accepted",
  "release_request",
  "gps_quiet",
  "load_request",
  "customer_request",
  "vehicle_removed",
  "document_expired",
  "document_expiring",
]

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

/** The summary line's words for a count of one kind, e.g. "2 late pickups". */
export function attentionKindLabel(kind: LoadAttentionKind, n: number): string {
  switch (kind) {
    case "proof_waiting":
      return plural(n, "delivery photo to confirm", "delivery photos to confirm")
    case "late_delivery":
      return plural(n, "late delivery", "late deliveries")
    case "late_pickup":
      return plural(n, "late pickup", "late pickups")
    case "unassigned_pickup":
      return plural(n, "load with no driver on pickup day", "loads with no driver on pickup day")
    case "not_accepted":
      return plural(n, "assignment not accepted", "assignments not accepted")
    case "release_request":
      return plural(n, "release request", "release requests")
    case "gps_quiet":
      return plural(n, "driver not sharing location", "drivers not sharing location")
    case "load_request":
      return plural(n, "load with driver requests", "loads with driver requests")
    case "customer_request":
      return plural(n, "customer shipping request", "customer shipping requests")
    case "vehicle_removed":
      return plural(n, "vehicle removed from inventory", "vehicles removed from inventory")
    case "document_expired":
      return plural(n, "expired document", "expired documents")
    case "document_expiring":
      return plural(n, "document expiring soon", "documents expiring soon")
  }
}

/** Today on the dealership calendar (Mountain Time), YYYY-MM-DD. */
export function mountainTodayKey(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Denver",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now)
}

/** "Oct 12" for a YYYY-MM-DD calendar day. */
export function formatAttentionDay(day?: string): string {
  if (!day) return "an earlier day"
  const date = new Date(`${day}T12:00:00Z`)
  if (!Number.isFinite(date.getTime())) return day
  return date.toLocaleDateString("en-US", { timeZone: "UTC", month: "short", day: "numeric" })
}

/** "25 min ago", "3 h ago", "2 days ago". */
export function formatAttentionAgo(iso?: string, nowMs: number = Date.now()): string {
  if (!iso) return ""
  const minutes = Math.max(0, Math.round((nowMs - new Date(iso).getTime()) / 60_000))
  if (!Number.isFinite(minutes)) return ""
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.round(minutes / 60)
  if (hours < 48) return `${hours} h ago`
  return `${Math.round(hours / 24)} days ago`
}

/** The row's bold first line: the load number, or the customer for a request or quote. */
export function attentionTitle(item: LoadAttentionItem): string {
  if (!item.loadId) return item.customerName || "A customer"
  return item.loadNumber
}

/** The row's plain-English explanation. */
export function describeAttention(
  item: LoadAttentionItem,
  todayKey: string = mountainTodayKey(),
  nowMs: number = Date.now(),
): string {
  const driver = item.driverName || "The driver"
  const ago = (iso?: string) => formatAttentionAgo(iso, nowMs)
  switch (item.kind) {
    case "proof_waiting":
      return `Delivery photo waiting for your confirmation${item.since ? ` · sent ${ago(item.since)}` : ""}`
    case "late_delivery":
      return `Delivery was due ${formatAttentionDay(item.date)} · ${item.status}`
    case "late_pickup":
      return `Pickup was due ${formatAttentionDay(item.date)} · ${item.status}`
    case "unassigned_pickup":
      return item.date === todayKey
        ? "Pickup is today and there's no driver yet"
        : `Pickup was due ${formatAttentionDay(item.date)} and there's no driver yet`
    case "not_accepted":
      return `${driver} hasn't accepted this load yet${item.since ? ` · assigned ${ago(item.since)}` : ""}`
    case "release_request":
      return `${driver} asked to be released from this load${item.emergency ? " (emergency)" : ""}${
        item.since ? ` · ${ago(item.since)}` : ""
      }`
    case "gps_quiet":
      return item.since
        ? `${driver} hasn't shared location since ${ago(item.since)}`
        : `${driver} isn't sharing location`
    case "load_request": {
      const count = item.requestCount ?? 1
      return `${count} driver${count === 1 ? " is" : "s are"} waiting for your answer${
        item.since ? ` · first asked ${ago(item.since)}` : ""
      }`
    }
    case "vehicle_removed":
      return item.loadId
        ? `${item.vehicleName || "A vehicle"} on this load was removed from inventory before pickup`
        : `${item.vehicleName || "The vehicle"} on this quote was removed from inventory`
    case "customer_request":
      return `Asked for shipping${item.vehicleName ? ` on ${item.vehicleName}` : ""}${
        item.since ? ` · ${ago(item.since)}` : ""
      }`
    case "document_expired":
      return `${driver}'s ${item.credential ?? "document"} expired on ${formatAttentionDay(item.date)}`
    case "document_expiring":
      return `${driver}'s ${item.credential ?? "document"} expires ${
        (item.daysLeft ?? 0) <= 1 ? "tomorrow" : `in ${item.daysLeft} days`
      }`
  }
}

/**
 * Where a row goes: the delivery review for proofs, Driver Tracker for driver
 * requests (where they're answered), the Quotes tab for customer requests, and
 * otherwise the load. The iPhone app has no Billing pages, so there proofs
 * open the load page, which shows the delivery photo.
 */
export function attentionHref(item: LoadAttentionItem, inNativeApp: boolean): string {
  switch (item.kind) {
    case "proof_waiting":
      return inNativeApp ? `/transportation/load/${item.loadId}` : `/billing/driver-payouts/${item.loadId}`
    case "release_request":
      return item.driverId ? `/driver-tracker?driverId=${encodeURIComponent(item.driverId)}` : "/driver-tracker"
    case "load_request":
      return "/driver-tracker"
    case "customer_request":
      return "/transportation?tab=drafts"
    case "vehicle_removed":
      return item.loadId ? `/transportation/load/${item.loadId}` : "/transportation?tab=drafts"
    default:
      return `/transportation/load/${item.loadId}`
  }
}

/** A stable list key: one row per kind and load, quote or credential. */
export function attentionKey(item: LoadAttentionItem): string {
  return `${item.kind}:${item.loadId || item.quoteId || ""}:${item.credential ?? ""}`
}
