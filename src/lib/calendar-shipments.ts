import type { CalendarItem } from "@/types/calendar.types"

/**
 * Shipments on the Suprah Calendar (decided 2026-10-30): each live load's
 * planned pickup window and delivery deadline, read-only. Clicking one opens
 * the load in Transportation. Admins see every live load; anyone else sees
 * only the loads they're dispatching. They come from Transportation, not from
 * the calendar's own events.
 */

/** One entry as GET /api/loads/calendar returns it. Dates are calendar days, both inclusive. */
export interface CalendarShipmentEntry {
  loadId: string
  loadNumber: string
  status: string
  kind: "pickup" | "delivery"
  title: string
  startDate: string
  endDate: string
}

const PREFIX = "shipment:"

/** Turns a calendar day into the instant the calendar uses (its own all-day items are Mountain Time). */
export type DayToInstant = (day: string, endOfDay: boolean) => string

export function shipmentToCalendarItem(entry: CalendarShipmentEntry, dayToInstant: DayToInstant): CalendarItem {
  return {
    id: `${PREFIX}${entry.loadId}:${entry.kind}`,
    source: "shipment",
    type: "shipment",
    title: entry.title,
    description: "Planned in Transportation. Open the load to see or change it.",
    start: dayToInstant(entry.startDate, false),
    end: dayToInstant(entry.endDate, true),
    allDay: true,
    repeatsDailyWindow: false,
    status: "scheduled",
    canEdit: false,
  }
}

export function isShipmentItem(item: Pick<CalendarItem, "id"> | string | null | undefined): boolean {
  const id = typeof item === "string" ? item : item?.id
  return typeof id === "string" && id.startsWith(PREFIX)
}

/** The load page a shipment item opens, or "" for anything else. */
export function shipmentLoadHref(item: Pick<CalendarItem, "id">): string {
  if (!isShipmentItem(item)) return ""
  const loadId = item.id.slice(PREFIX.length).split(":")[0]
  return /^[a-f0-9]{24}$/i.test(loadId) ? `/transportation/load/${loadId}` : ""
}
