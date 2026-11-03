import { fmtDateMDT, fmtTimeMDT, parseDatetimeLocalAsMdt, todayStrMDT } from "@/lib/timezone"
import { getCalendarTimeZoneAbbreviation } from "@/utils/calendar.utils"

// Mountain Time (America/Denver, MDT/MST) helpers shared by Transportation,
// Driver Tracker, the Driver Portal and the Drivers pages, so moments and
// expiration days read the same everywhere.

/** "9:05 AM MDT": a moment's time in Mountain Time, with MDT or MST. */
export function formatMountainTime(iso: string): string {
  const date = new Date(iso)
  return `${fmtTimeMDT(date)} ${getCalendarTimeZoneAbbreviation(date)}`
}

/** "Oct 13, 9:05 AM MDT": a moment in Mountain Time. */
export function formatMountainDateTime(iso: string): string {
  return `${fmtDateMDT(new Date(iso), { year: undefined })}, ${formatMountainTime(iso)}`
}

const mountainFieldParts = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Denver",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
})

/** "2026-11-05T09:00": a saved moment in Mountain Time, for a date-and-time field. */
export function mountainDateTimeInput(iso?: string | null): string {
  if (!iso) return ""
  const date = new Date(iso)
  if (!Number.isFinite(date.getTime())) return ""
  const parts: Record<string, string> = {}
  for (const part of mountainFieldParts.formatToParts(date)) parts[part.type] = part.value
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`
}

/** The moment a date-and-time field means, read as Mountain Time on any device ("" when empty). */
export function mountainDateTimeValue(input: string): string {
  return input ? parseDatetimeLocalAsMdt(input)?.toISOString() ?? "" : ""
}

/**
 * Expiration dates are calendar days, stored as midnight UTC of that day.
 * Whole days from today on the Mountain Time calendar to that day: 0 on the
 * day itself (it counts as expired from then on), negative once past. The
 * server counts the same way (mountainDaysUntil in DriverProfile.model).
 */
export function mountainDaysUntil(value?: string | null): number | null {
  if (!value) return null
  const expiry = Date.parse(`${String(value).slice(0, 10)}T00:00:00Z`)
  if (!Number.isFinite(expiry)) return null
  return Math.round((expiry - Date.parse(`${todayStrMDT()}T00:00:00Z`)) / 86_400_000)
}

/** "Oct 17, 2026": an expiration day exactly as stored (not shifted by a time zone). */
export function formatExpirationDay(value?: string | null): string {
  if (!value) return ""
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00Z`)
  if (!Number.isFinite(date.getTime())) return ""
  return date.toLocaleDateString("en-US", { timeZone: "UTC", month: "short", day: "numeric", year: "numeric" })
}
