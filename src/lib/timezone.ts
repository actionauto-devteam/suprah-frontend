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
