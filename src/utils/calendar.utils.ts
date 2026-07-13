import type { CalendarItem } from "@/types/calendar.types";

export const DAY_MS = 86_400_000;

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

export const toLocalInputValue = (d: Date) => {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
};

/**
 * A single renderable block on the grid. Multi-day items with a fixed
 * daily window expand into one occurrence per day; everything else is a
 * single occurrence.
 */
export interface Occurrence {
  item: CalendarItem;
  start: Date;
  end: Date;
}

export function expandOccurrences(
  items: CalendarItem[],
  rangeStart: Date,
  rangeEnd: Date
): Occurrence[] {
  const out: Occurrence[] = [];
  for (const item of items) {
    const s = new Date(item.start);
    const e = new Date(item.end);

    if (item.repeatsDailyWindow && item.dailyStartTime && item.dailyEndTime) {
      const [sh, sm] = item.dailyStartTime.split(":").map(Number);
      const [eh, em] = item.dailyEndTime.split(":").map(Number);
      for (
        let day = startOfDay(s < rangeStart ? rangeStart : s);
        day <= e && day < rangeEnd;
        day = addDays(day, 1)
      ) {
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
