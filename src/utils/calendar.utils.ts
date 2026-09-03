import type { CalendarItem } from "@/types/calendar.types";

export const DAY_MS = 86_400_000;

/**
 * The whole calendar renders in the dealership's timezone — Mountain Time
 * (America/Denver handles MDT/MST daylight-saving switches automatically) —
 * regardless of where the viewer is. Instants stay UTC in the database and
 * API; conversion happens only at the display/input boundary via
 * toZoned / fromZoned below.
 */
export const CALENDAR_TZ = "America/Denver";
export const CALENDAR_TZ_LABEL = "Mountain Time";

const tzLabelFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: CALENDAR_TZ,
  timeZoneName: "short",
});

/**
 * "MDT" or "MST" depending on the actual date — America/Denver spends
 * roughly half the year in each, so this must be computed per-call rather
 * than hardcoded (a previous static "MDT" constant was wrong Nov–Mar).
 */
export function calendarTzLabel(date: Date = new Date()): string {
  return (
    tzLabelFormatter.formatToParts(date).find((p) => p.type === "timeZoneName")
      ?.value ?? "MT"
  );
}

const tzFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: CALENDAR_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

const mountainDateKeyFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: CALENDAR_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const mountainZoneNameFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: CALENDAR_TZ,
  timeZoneName: "short",
});

const scheduleDateFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  month: "short",
  day: "numeric",
  year: "numeric",
});

function datePartsToKey(parts: Intl.DateTimeFormatPart[]) {
  const values: Record<string, string> = {};
  for (const part of parts) {
    if (part.type !== "literal") values[part.type] = part.value;
  }
  return `${values.year}-${values.month}-${values.day}`;
}

/** Current Transportation business-calendar date in America/Denver. */
export const mountainTodayDateKey = (): string =>
  datePartsToKey(mountainDateKeyFormatter.formatToParts(new Date()));

/** Returns the daylight-aware Mountain abbreviation, e.g. MDT or MST. */
export const getCalendarTimeZoneAbbreviation = (
  date: Date = new Date(),
): string => {
  const part = mountainZoneNameFormatter
    .formatToParts(date)
    .find((item) => item.type === "timeZoneName");
  return part?.value || "MT";
};

/**
 * Load schedule fields are date-only business-calendar values, not moments.
 * Preserve the YYYY-MM-DD key so Mongo's UTC-midnight Date storage cannot
 * display as the previous day when rendered in America/Denver.
 */
export const scheduleDateKey = (
  value?: string | Date | null,
): string => {
  if (!value) return "";

  if (typeof value === "string") {
    const direct = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (direct) return `${direct[1]}-${direct[2]}-${direct[3]}`;
  }

  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
};

export const formatScheduleDate = (
  value?: string | Date | null,
): string => {
  const key = scheduleDateKey(value);
  if (!key) return "—";
  const [year, month, day] = key.split("-").map(Number);
  return scheduleDateFormatter.format(
    new Date(Date.UTC(year, month - 1, day, 12, 0, 0)),
  );
};

/**
 * Instant → wall-clock Date in CALENDAR_TZ. The returned Date's *local*
 * getters (getHours etc.) yield Mountain Time fields; use it only for
 * rendering/grid math, never send it to the API directly.
 */
export const toZoned = (d: Date): Date => {
  const p: Record<string, string> = {};
  for (const part of tzFormatter.formatToParts(d)) p[part.type] = part.value;
  return new Date(
    +p.year,
    +p.month - 1,
    +p.day,
    +p.hour,
    +p.minute,
    +p.second
  );
};

/**
 * Wall-clock Date in CALENDAR_TZ → real UTC instant. Two-pass adjustment
 * keeps DST transition edges correct.
 */
export const fromZoned = (wall: Date): Date => {
  const wallUTC = Date.UTC(
    wall.getFullYear(),
    wall.getMonth(),
    wall.getDate(),
    wall.getHours(),
    wall.getMinutes(),
    wall.getSeconds()
  );
  let instant = new Date(wallUTC);
  for (let i = 0; i < 2; i++) {
    const z = toZoned(instant);
    const zUTC = Date.UTC(
      z.getFullYear(),
      z.getMonth(),
      z.getDate(),
      z.getHours(),
      z.getMinutes(),
      z.getSeconds()
    );
    instant = new Date(instant.getTime() + (wallUTC - zUTC));
  }
  return instant;
};

/** "Now" in Mountain Time wall-clock space. */
export const zonedNow = (): Date => toZoned(new Date());

export const startOfDay = (d: Date) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

export const addDays = (d: Date, n: number) =>
  new Date(d.getTime() + n * DAY_MS);

export const startOfWeek = (d: Date) => {
  const x = startOfDay(d);
  return addDays(x, -x.getDay()); // Sunday start
};

export const startOfMonth = (d: Date) =>
  new Date(d.getFullYear(), d.getMonth(), 1);

export const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

export const fmtTime = (d: Date) =>
  d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

export const fmtDayLabel = (d: Date) =>
  d.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });

/** Local-field "YYYY-MM-DD" key for a (wall-clock) date. */
export const toDateKey = (d: Date) => {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export const toLocalInputValue = (d: Date) => {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
};

/**
 * A single renderable block on the grid, in Mountain Time wall-clock space.
 * Multi-day items with a fixed daily window expand into one occurrence per
 * included day; everything else is a single occurrence.
 */
export interface Occurrence {
  item: CalendarItem;
  start: Date;
  end: Date;
}

/** Midnight (local wall-clock) on the UTC calendar date of `d` — used only
 *  for synced all-day appointments, see the comment in expandOccurrences. */
const utcDateOnly = (d: Date) =>
  new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());

/**
 * A synced Google Calendar all-day appointment stores its span as UTC-date
 * boundaries (a "date", not an instant) — e.g. 2026-03-23T00:00:00.000Z to
 * 2026-03-23T23:59:59.999Z means "all of March 23", regardless of viewer
 * timezone. Running that through toZoned (which assumes every stored value
 * is a real Mountain-time instant) shifts it onto the *previous* Mountain
 * calendar day for roughly half the year, since UTC midnight is 5–6 PM
 * Mountain time the day before. That misplaced the item by a day in Agenda
 * grouping and could double-render a one-hour sliver in the Week/Day all-day
 * lane on the wrong neighboring day. Native CalendarEvent all-day items
 * don't have this problem (their start/end are genuinely Mountain-time
 * instants from EventModal), so this only applies to synced appointments.
 */
function allDayAppointmentSpan(item: CalendarItem): { start: Date; end: Date } {
  const start = utcDateOnly(new Date(item.start));
  const rawEnd = new Date(item.end);
  const endDateOnly = utcDateOnly(rawEnd);
  const endIsExactUtcMidnight =
    rawEnd.getUTCHours() === 0 &&
    rawEnd.getUTCMinutes() === 0 &&
    rawEnd.getUTCSeconds() === 0 &&
    rawEnd.getUTCMilliseconds() === 0;
  // An end that isn't itself exactly midnight (e.g. 23:59:59.999, "end of
  // the day") is an inclusive last moment — bump to the following midnight
  // for an exclusive boundary. An end that's already exact midnight is
  // already exclusive.
  const end = endIsExactUtcMidnight ? endDateOnly : addDays(endDateOnly, 1);
  return { start, end };
}

const isSyncedAllDayAppointment = (item: CalendarItem) =>
  item.allDay && item.source === "appointment";

/** The item's start/end in local wall-clock display space — routes synced
 *  all-day appointments through allDayAppointmentSpan instead of toZoned,
 *  for any caller that needs the display date/time without full occurrence
 *  expansion (e.g. My Schedule's list rows, EventModal's read-only view). */
export function itemDisplaySpan(item: CalendarItem): { start: Date; end: Date } {
  return isSyncedAllDayAppointment(item)
    ? allDayAppointmentSpan(item)
    : { start: toZoned(new Date(item.start)), end: toZoned(new Date(item.end)) };
}

export function itemDisplayStart(item: CalendarItem): Date {
  return itemDisplaySpan(item).start;
}

export function expandOccurrences(
  items: CalendarItem[],
  rangeStart: Date, // wall-clock (Mountain Time)
  rangeEnd: Date
): Occurrence[] {
  const out: Occurrence[] = [];
  for (const item of items) {
    const { start: s, end: e } = itemDisplaySpan(item);

    if (item.repeatsDailyWindow && item.dailyStartTime && item.dailyEndTime) {
      const [sh, sm] = item.dailyStartTime.split(":").map(Number);
      const [eh, em] = item.dailyEndTime.split(":").map(Number);
      const included =
        item.includedDates && item.includedDates.length > 0
          ? new Set(item.includedDates)
          : null;
      for (
        let day = startOfDay(s < rangeStart ? rangeStart : s);
        day <= e && day < rangeEnd;
        day = addDays(day, 1)
      ) {
        if (included && !included.has(toDateKey(day))) continue;
        const os = new Date(day);
        os.setHours(sh, sm, 0, 0);
        const oe = new Date(day);
        oe.setHours(eh, em, 0, 0);
        out.push({ item, start: os, end: oe });
      }
    } else if (s < rangeEnd && e > rangeStart) {
      out.push({ item, start: s, end: e });
    }
  }
  return out.sort((a, b) => a.start.getTime() - b.start.getTime());
}