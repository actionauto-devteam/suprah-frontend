export const MDT_OFFSET_MS = -6 * 60 * 60 * 1000
export const MDT_TZ = 'America/Denver' as const

/**
 * Shifts a Date so its UTC clock equals the MDT wall-clock time.
 * ONLY use this with toLocale* or Intl calls that also pass timeZone:"UTC".
 * Do NOT use with date-fns format() — that function uses the browser's local
 * timezone and will produce wrong results.
 */
export function toMDT(d: Date | string): Date {
  const date = typeof d === 'string' ? new Date(d) : d
  return new Date(date.getTime() + MDT_OFFSET_MS)
}

// ── MDT-correct locale helpers (work regardless of browser timezone) ──────────

function d(v: Date | string): Date {
  return typeof v === 'string' ? new Date(v) : v
}

export function fmtDateMDT(v: Date | string, opts?: Intl.DateTimeFormatOptions): string {
  return d(v).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: MDT_TZ, ...opts })
}

export function fmtTimeMDT(v: Date | string, hour12 = true): string {
  return d(v).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12, timeZone: MDT_TZ })
}

export function fmtTime24MDT(v: Date | string): string {
  return d(v).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: MDT_TZ })
}

export function fmtDateTimeMDT(v: Date | string): string {
  return d(v).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true, timeZone: MDT_TZ })
}

export function fmtMonthYearMDT(v: Date | string): string {
  return d(v).toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: MDT_TZ })
}

/** "May 1 · 2:30 PM" — date + time with bullet separator */
export function fmtShortDateTimeMDT(v: Date | string): string {
  const dt = d(v)
  const datePart = dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: MDT_TZ })
  const timePart = dt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: MDT_TZ })
  return `${datePart} · ${timePart}`
}

/** "May 1, 2024 · 2:30 PM" — full date + time with bullet separator */
export function fmtFullDateTimeMDT(v: Date | string): string {
  const dt = d(v)
  const datePart = dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: MDT_TZ })
  const timePart = dt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: MDT_TZ })
  return `${datePart} · ${timePart}`
}

/** "Tuesday, May 1, 2024 at 2:30 PM" — PPP p equivalent */
export function fmtLongDateTimeMDT(v: Date | string): string {
  return d(v).toLocaleString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true, timeZone: MDT_TZ })
}

/** "May 1, 2024" full date for PPP */
export function fmtLongDateMDT(v: Date | string): string {
  return d(v).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: MDT_TZ })
}

/** "Wed, May 1" — EEE, MMM d */
export function fmtWeekdayDateMDT(v: Date | string): string {
  return d(v).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: MDT_TZ })
}

/** "Wednesday, May 1, 2024 · 2:30 PM" — EEEE, MMM d · h:mm a */
export function fmtFullWeekdayDateTimeMDT(v: Date | string): string {
  const dt = d(v)
  const datePart = dt.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', timeZone: MDT_TZ })
  const timePart = dt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: MDT_TZ })
  return `${datePart} · ${timePart}`
}

/** "May 1, 14:30" — short date + 24h time (for logs, activity feeds) */
export function fmtDateTime24MDT(v: Date | string): string {
  const dt = d(v)
  const datePart = dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: MDT_TZ })
  const timePart = dt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: MDT_TZ })
  return `${datePart}, ${timePart}`
}

/** "May 1, 2024 · 14:30" — full date + 24h time with bullet separator */
export function fmtFullDateTime24MDT(v: Date | string): string {
  const dt = d(v)
  const datePart = dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: MDT_TZ })
  const timePart = dt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: MDT_TZ })
  return `${datePart} · ${timePart}`
}

/** Check if a server timestamp falls on "today" in MDT */
export function isTodayMDT(v: Date | string): boolean {
  return d(v).toLocaleDateString('en-US', { timeZone: MDT_TZ }) === new Date().toLocaleDateString('en-US', { timeZone: MDT_TZ })
}

/** Check if a server timestamp falls on "yesterday" in MDT */
export function isYesterdayMDT(v: Date | string): boolean {
  return d(v).toLocaleDateString('en-US', { timeZone: MDT_TZ }) === new Date(Date.now() - 86400000).toLocaleDateString('en-US', { timeZone: MDT_TZ })
}

/** Check if a server timestamp falls on "tomorrow" in MDT */
export function isTomorrowMDT(v: Date | string): boolean {
  return d(v).toLocaleDateString('en-US', { timeZone: MDT_TZ }) === new Date(Date.now() + 86400000).toLocaleDateString('en-US', { timeZone: MDT_TZ })
}

/** "YYYY-MM-DD" for the MDT calendar day at `offsetDays` from now — for <input type="date"> values and range queries */
export function todayStrMDT(offsetDays = 0): string {
  return new Date(Date.now() + offsetDays * 86_400_000).toLocaleDateString('en-CA', { timeZone: MDT_TZ })
}


/**
 * Convert a calendar date (YYYY-MM-DD) in America/Denver into the exact UTC
 * boundaries for that Mountain Time day. This is DST-safe: winter dates use
 * MST (UTC-7) and summer dates use MDT (UTC-6).
 *
 * Use this for API date filters instead of `new Date("YYYY-MM-DDT00:00:00")`,
 * because the latter is interpreted in the browser's local timezone.
 */
export function mdtDayRangeUtc(dateStr: string): { start: string; end: string } {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr)
  if (!match) {
    throw new Error(`Invalid Mountain Time calendar date: ${dateStr}`)
  }

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])

  const startMs = mountainWallTimeToUtcMs(year, month, day)

  // Move to the next calendar day without involving the browser timezone, then
  // convert that next Mountain Time midnight independently. Subtracting 1 ms
  // gives an inclusive end boundary and also handles 23/25-hour DST days.
  const nextCalendarDay = new Date(Date.UTC(year, month - 1, day + 1))
  const nextYear = nextCalendarDay.getUTCFullYear()
  const nextMonth = nextCalendarDay.getUTCMonth() + 1
  const nextDay = nextCalendarDay.getUTCDate()
  const nextStartMs = mountainWallTimeToUtcMs(nextYear, nextMonth, nextDay)

  return {
    start: new Date(startMs).toISOString(),
    end: new Date(nextStartMs - 1).toISOString(),
  }
}

const mountainPartsFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: MDT_TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
})

/** Resolve Mountain Time midnight to UTC without a fixed offset. */
function mountainWallTimeToUtcMs(year: number, month: number, day: number): number {
  const desiredWallClockAsUtc = Date.UTC(year, month - 1, day, 0, 0, 0, 0)
  let guess = desiredWallClockAsUtc

  // Two/three iterations are enough because timezone offsets are piecewise
  // constant around a normal wall-clock time. Keeping three makes DST edges
  // deterministic without introducing an external timezone dependency.
  for (let i = 0; i < 3; i += 1) {
    const parts = mountainPartsFormatter.formatToParts(new Date(guess))
    const values: Record<string, string> = {}
    for (const part of parts) {
      if (part.type !== 'literal') values[part.type] = part.value
    }

    const representedWallClockAsUtc = Date.UTC(
      Number(values.year),
      Number(values.month) - 1,
      Number(values.day),
      Number(values.hour),
      Number(values.minute),
      Number(values.second),
      0,
    )

    const correction = desiredWallClockAsUtc - representedWallClockAsUtc
    if (correction === 0) break
    guess += correction
  }

  return guess
}