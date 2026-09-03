"use client";

import { useMemo, useState } from "react";
import { CalendarDays, Plus } from "lucide-react";
import type { CalendarItem } from "@/types/calendar.types";
import {
  addDays,
  expandOccurrences,
  sameDay,
  startOfMonth,
  startOfWeek,
  zonedNow,
} from "@/utils/calendar.utils";
import {
  formatSegmentTimeRange,
  initials,
  splitOccurrencesByDay,
  TYPE_STYLES,
  TYPE_TIME_STYLES,
} from "@/components/SuprahCalendar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { CalendarEmptyState } from "@/components/calendar/CalendarEmptyState";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Matches the exact solid color each type renders as in SuprahCalendar's
 *  TYPE_STYLES — kept as a standalone dot color since TYPE_STYLES bundles a
 *  full chip style (bg/text) that isn't a fit for a 6px indicator dot. */
const TYPE_DOT_COLORS: Record<string, string> = {
  event: "bg-emerald-600",
  meeting: "bg-cyan-600",
  task: "bg-amber-500",
  reminder: "bg-violet-600",
  appointment: "bg-teal-600",
};

/**
 * Compact Google-Calendar-style month view for phone widths: a small date
 * grid with per-type dot indicators (no event text — there's no room for it
 * at this width) plus an agenda strip below for whichever day is selected.
 * Reuses the same occurrence math as the desktop MonthView so filtering and
 * multi-day splitting stay identical between the two.
 */
export function MonthViewMobile({
  cursor,
  items,
  onDayClick,
  onItemClick,
}: {
  cursor: Date;
  items: CalendarItem[];
  onDayClick: (d: Date) => void;
  onItemClick: (i: CalendarItem) => void;
}) {
  const gridStart = startOfWeek(startOfMonth(cursor));
  const days = useMemo(() => Array.from({ length: 42 }, (_, i) => addDays(gridStart, i)), [gridStart]);
  const gridEnd = addDays(gridStart, 42);

  const occ = useMemo(
    () => splitOccurrencesByDay(expandOccurrences(items, gridStart, gridEnd), gridStart, gridEnd),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items, gridStart.getTime(), gridEnd.getTime()],
  );

  const today = zonedNow();
  const [selectedDay, setSelectedDay] = useState<Date>(() => {
    const inGrid = days.find((d) => sameDay(d, today));
    return inGrid ?? cursor;
  });

  const selectedOccurrences = occ
    .filter((o) => sameDay(o.start, selectedDay))
    .sort((a, b) => {
      if (a.item.allDay !== b.item.allDay) return a.item.allDay ? -1 : 1;
      return a.start.getTime() - b.start.getTime();
    });

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 border-b border-border">
        <div className="grid grid-cols-7">
          {WEEKDAYS.map((d) => (
            <div
              key={d}
              className="border-r border-border bg-muted/40 py-1.5 text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground last:border-r-0"
            >
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 grid-rows-6">
          {days.map((day) => {
            const isToday = sameDay(day, today);
            const isSelected = sameDay(day, selectedDay);
            const inMonth = day.getMonth() === cursor.getMonth();
            const dayTypes = Array.from(
              new Set(occ.filter((o) => sameDay(o.start, day)).map((o) => o.item.type)),
            ).slice(0, 4);

            return (
              <button
                key={day.toISOString()}
                type="button"
                onClick={() => setSelectedDay(day)}
                aria-pressed={isSelected}
                aria-label={day.toLocaleDateString([], {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
                className={`flex h-12 flex-col items-center justify-center gap-0.5 border-r border-b border-border transition xs:h-14 ${inMonth ? "" : "opacity-40"
                  } ${isSelected ? "bg-emerald-500/10" : "hover:bg-accent/50"}`}
              >
                <span
                  className={`inline-flex h-6 w-6 items-center justify-center rounded-full font-mono text-xs tabular-nums ${isToday
                    ? "bg-emerald-500 font-semibold text-white dark:bg-emerald-600"
                    : isSelected
                      ? "font-semibold text-emerald-700 dark:text-emerald-300"
                      : "text-foreground"
                    }`}
                >
                  {day.getDate()}
                </span>
                <span className="flex h-1.5 items-center gap-0.5">
                  {dayTypes.map((t) => (
                    <span
                      key={t}
                      className={`h-1.5 w-1.5 rounded-full ${TYPE_DOT_COLORS[t] ?? "bg-zinc-400"}`}
                    />
                  ))}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        <div className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-border bg-card/95 px-4 py-2.5 backdrop-blur">
          <span className="text-sm font-semibold text-foreground">
            {selectedDay.toLocaleDateString([], {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </span>
          <button
            type="button"
            onClick={() => onDayClick(selectedDay)}
            aria-label="Add event on this day"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-600/35 bg-emerald-500/10 text-emerald-700 transition hover:bg-emerald-500/15 dark:text-emerald-200"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        {selectedOccurrences.length === 0 ? (
          <div className="flex flex-1 items-center justify-center px-6 py-10">
            <CalendarEmptyState
              icon={CalendarDays}
              title="Nothing scheduled"
              subtitle="Tap the + button to add something to this day."
            />
          </div>
        ) : (
          <div className="flex flex-col gap-2 p-3">
            {selectedOccurrences.map((o) => {
              const { item, start, end } = o;
              const timeLabel = item.allDay ? "All Day" : formatSegmentTimeRange(start, end);
              const owner = item.assignees?.[0] ?? item.createdBy;

              return (
                <button
                  key={`${item.id}-${start.toISOString()}`}
                  type="button"
                  onClick={() => onItemClick(item)}
                  className={`flex min-h-14 w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition hover:brightness-110 ${TYPE_STYLES[item.type]}`}
                >
                  <div className="min-w-0 flex-1">
                    <span className="block w-full truncate text-[13px] font-bold leading-snug">
                      {item.title}
                    </span>
                    <span
                      className={`mt-0.5 block font-mono text-[11px] font-semibold tabular-nums ${TYPE_TIME_STYLES[item.type]}`}
                    >
                      {timeLabel}
                    </span>
                  </div>

                  {owner && (
                    <Avatar
                      className="size-6 shrink-0 ring-1 ring-current/20"
                      title={owner.fullName || owner.username || owner.email}
                    >
                      <AvatarFallback className="bg-current/15 text-[9px] font-bold">
                        {initials(owner.fullName || owner.username)}
                      </AvatarFallback>
                    </Avatar>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
