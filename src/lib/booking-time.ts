import { denverTzAbbr, mdtWallTimeToUtc, todayStrMDT } from "@/lib/timezone"

// Customers book service appointments and test drives on the dealership's
// clock (Mountain Time), whatever their own device says: "10:00 AM" on the
// 5th is 10:00 AM Mountain Time on the 5th.

/** Tomorrow on the Mountain Time calendar, as YYYY-MM-DD. */
export function mountainTomorrow(): string {
  const [year, month, day] = todayStrMDT().split("-").map(Number)
  return new Date(Date.UTC(year, month - 1, day + 1)).toISOString().slice(0, 10)
}

/** The moment a service slot starts: a YYYY-MM-DD day and a label like "8:00 AM", in Mountain Time. */
export function serviceSlotStart(day: string, label: string): Date | null {
  const dayMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day)
  const timeMatch = /^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/i.exec(label.trim())
  if (!dayMatch || !timeMatch) return null
  let hour = Number(timeMatch[1]) % 12
  if (timeMatch[3].toUpperCase() === "PM") hour += 12
  const minute = timeMatch[2] ? Number(timeMatch[2]) : 0
  return mdtWallTimeToUtc(Number(dayMatch[1]), Number(dayMatch[2]), Number(dayMatch[3]), hour, minute)
}

/** "8:00 AM MST": the picked slot with that day's Mountain Time abbreviation. */
export function pickedTimeLabel(day: string, label: string): string {
  const start = serviceSlotStart(day, label)
  return start ? `${label} ${denverTzAbbr(start)}` : label
}

/** "Wed, Nov 5" for a YYYY-MM-DD day, exactly as picked. */
export function pickedDayLabel(day: string): string {
  const date = new Date(`${day}T12:00:00Z`)
  if (!Number.isFinite(date.getTime())) return day
  return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" })
}
