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
export const CALENDAR_TZ_LABEL = "MDT";

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

export function expandOccurrences(
  items: CalendarItem[],
  rangeStart: Date, // wall-clock (Mountain Time)
  rangeEnd: Date
): Occurrence[] {
  const out: Occurrence[] = [];
  for (const item of items) {
    const s = toZoned(new Date(item.start));
    const e = toZoned(new Date(item.end));

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
