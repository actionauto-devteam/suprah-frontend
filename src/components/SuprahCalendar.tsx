"use client";

import { useMemo, useState } from "react";
import type {
  CalendarItem,
  CalendarView,
  EventDraft,
} from "@/types/calendar.types";
import {
  CALENDAR_TZ_LABEL,
  addDays,
  expandOccurrences,
  fmtDayLabel,
  fmtTime,
  fromZoned,
  sameDay,
  startOfDay,
  startOfMonth,
  startOfWeek,
  zonedNow,
  type Occurrence,
} from "@/utils/calendar.utils";
import { useCalendar } from "@/hooks/useCalendar";
import { EventModal } from "@/components/EventModal";
import { MySchedule } from "@/components/MySchedule";

/**
 * Suprah Calendar — cockpit-styled, Google Calendar-class scheduling.
 * Day / Week / Month / Agenda views + the My Schedule personal panel.
 *
 * TODO(integration): replace the accent classes below with tokens from
 * your shared cockpit `ui.tsx` if you prefer central definitions — the
 * palette here matches the emerald/mint glow system used across
 * AppSidebar / AppointmentDashboard / SuprahPay.
 */

const TYPE_STYLES: Record<string, string> = {
  event:
    "border-emerald-400/40 bg-emerald-400/10 text-emerald-200 shadow-[0_0_12px_-4px_rgba(52,211,153,0.5)]",
  meeting:
    "border-cyan-400/40 bg-cyan-400/10 text-cyan-200 shadow-[0_0_12px_-4px_rgba(34,211,238,0.5)]",
  task: "border-amber-400/40 bg-amber-400/10 text-amber-200 shadow-[0_0_12px_-4px_rgba(251,191,36,0.5)]",
  reminder:
    "border-violet-400/40 bg-violet-400/10 text-violet-200 shadow-[0_0_12px_-4px_rgba(167,139,250,0.5)]",
  appointment:
    "border-teal-300/40 bg-teal-300/10 text-teal-100 shadow-[0_0_12px_-4px_rgba(94,234,212,0.5)]",
};

const HOURS = Array.from({ length: 24 }, (_, h) => h);
const HOUR_PX = 64;

/**
 * Splits every multi-day occurrence into one visual segment per calendar day.
 *
 * Example:
 * Jul 20, 11:30 PM → Jul 21, 1:00 AM becomes:
 * - Jul 20: 11:30 PM → end of day
 * - Jul 21: 12:00 AM → 1:00 AM
 *
 * This prevents a card from extending below the 24-hour grid and makes the
 * continuation appear in the next day's column.
 */
function splitOccurrencesByDay(
  occurrences: Occurrence[],
  rangeStart: Date,
  rangeEnd: Date,
): Occurrence[] {
  const segments: Occurrence[] = [];

  for (const occurrence of occurrences) {
    const clippedStart = new Date(
      Math.max(occurrence.start.getTime(), rangeStart.getTime()),
    );
    const clippedEnd = new Date(
      Math.min(occurrence.end.getTime(), rangeEnd.getTime()),
    );

    if (
      Number.isNaN(clippedStart.getTime()) ||
      Number.isNaN(clippedEnd.getTime()) ||
      clippedEnd <= clippedStart
    ) {
      continue;
    }

    let dayStart = startOfDay(clippedStart);

    while (dayStart < clippedEnd && dayStart < rangeEnd) {
      const nextDay = addDays(dayStart, 1);
      const segmentStart = new Date(
        Math.max(clippedStart.getTime(), dayStart.getTime()),
      );
      const segmentEnd = new Date(
        Math.min(clippedEnd.getTime(), nextDay.getTime(), rangeEnd.getTime()),
      );

      if (segmentEnd > segmentStart) {
        segments.push({
          item: occurrence.item,
          start: segmentStart,
          end: segmentEnd,
        });
      }

      dayStart = nextDay;
    }
  }

  return segments.sort((a, b) => a.start.getTime() - b.start.getTime());
}

/**
 * Displays the end of a segment clearly when it reaches midnight.
 * The underlying position still ends exactly at the next day's boundary.
 */
function formatSegmentTimeRange(start: Date, end: Date): string {
  const endsAtMidnight =
    end.getHours() === 0 &&
    end.getMinutes() === 0 &&
    end.getSeconds() === 0 &&
    !sameDay(start, end);

  return endsAtMidnight
    ? `${fmtTime(start)} – End of day`
    : `${fmtTime(start)} – ${fmtTime(end)}`;
}

function formatDuration(start: Date, end: Date): string {
  const totalMinutes = Math.max(
    0,
    Math.round((end.getTime() - start.getTime()) / 60000),
  );

  if (totalMinutes < 60) {
    return `${totalMinutes} min`;
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (minutes === 0) {
    return `${hours} hr${hours === 1 ? "" : "s"}`;
  }

  return `${hours} hr${hours === 1 ? "" : "s"} ${minutes} min`;
}

function quickSlot(hour: number): Date {
  const d = zonedNow();
  d.setHours(hour, 0, 0, 0);
  return d;
}

export default function SuprahCalendar() {
  const [view, setView] = useState<CalendarView>("week");
  const [cursor, setCursor] = useState<Date>(startOfDay(zonedNow()));
  const [showMySchedule, setShowMySchedule] = useState(false);
  const [modal, setModal] = useState<{
    open: boolean;
    editing?: CalendarItem;
    presetStart?: Date;
  }>({ open: false });

  /** Visible window drives fetching — pad a week each side for smoothness. */
  const [rangeStart, rangeEnd] = useMemo(() => {
    if (view === "month") {
      const s = startOfWeek(startOfMonth(cursor));
      return [addDays(s, -7), addDays(s, 49)];
    }
    if (view === "week") {
      const s = startOfWeek(cursor);
      return [addDays(s, -7), addDays(s, 14)];
    }
    if (view === "day") return [addDays(cursor, -1), addDays(cursor, 2)];
    const today = startOfDay(zonedNow());
    return [today, addDays(today, 60)]; // agenda
  }, [view, cursor]);

  // Grid math runs in Mountain Time wall-clock space; the API needs instants.
  const { items, loading, error, createItem, updateItem, deleteItem } =
    useCalendar(fromZoned(rangeStart), fromZoned(rangeEnd));

  const step = (dir: 1 | -1) => {
    if (view === "month")
      setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + dir, 1));
    else if (view === "week") setCursor(addDays(cursor, 7 * dir));
    else setCursor(addDays(cursor, dir));
  };

  const headline =
    view === "day"
      ? cursor.toLocaleDateString([], {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      })
      : cursor.toLocaleDateString([], { month: "long", year: "numeric" });

  const openCreate = (presetStart?: Date) =>
    setModal({ open: true, presetStart });
  const openEdit = (item: CalendarItem) =>
    setModal({ open: true, editing: item });

  const handleSave = async (draft: EventDraft) => {
    if (draft.id) await updateItem(draft.id, draft);
    else await createItem(draft);
    setModal({ open: false });
  };

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/80 backdrop-blur-xl">
      {/* Ambient blobs — cockpit atmosphere */}
      <div className="pointer-events-none absolute -top-32 -left-24 h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 right-0 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl" />

      {/* Toolbar */}
      <header className="relative z-10 flex flex-wrap items-center gap-3 border-b border-white/10 px-5 py-3">
        <div className="flex h-9 shrink-0 items-center gap-2">
          <button
            onClick={() => setCursor(startOfDay(zonedNow()))}
            className="flex h-9 items-center rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-3 text-xs font-medium leading-none text-emerald-300 transition hover:bg-emerald-400/20"
          >
            Today
          </button>
          <button
            aria-label="Previous"
            onClick={() => step(-1)}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 leading-none text-zinc-300 transition hover:bg-white/5"
          >
            ‹
          </button>
          <button
            aria-label="Next"
            onClick={() => step(1)}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 leading-none text-zinc-300 transition hover:bg-white/5"
          >
            ›
          </button>
        </div>

        <div className="flex h-9 min-w-0 items-center gap-2">
          <h1 className="truncate text-lg font-semibold leading-none tracking-tight text-zinc-100">
            {headline}
          </h1>
          <span className="flex h-6 shrink-0 items-center rounded-md border border-white/10 bg-white/5 px-2 font-mono text-[10px] leading-none tabular-nums text-zinc-400">
            {CALENDAR_TZ_LABEL} · Mountain Time
          </span>
        </div>

        <div className="ml-auto flex h-9 shrink-0 items-center gap-2">
          <div className="flex h-9 items-center overflow-hidden rounded-lg border border-white/10">
            {(["day", "week", "month", "agenda"] as CalendarView[]).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`flex h-full items-center px-3 text-xs capitalize leading-none transition ${view === v
                  ? "bg-emerald-400/15 text-emerald-300"
                  : "text-zinc-400 hover:bg-white/5"
                  }`}
              >
                {v}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowMySchedule((s) => !s)}
            className={`flex h-9 items-center rounded-lg border px-3 text-xs font-medium leading-none transition ${showMySchedule
              ? "border-cyan-400/40 bg-cyan-400/15 text-cyan-300"
              : "border-white/10 text-zinc-300 hover:bg-white/5"
              }`}
          >
            My Schedule
          </button>
          <button
            onClick={() => openCreate()}
            className="flex h-9 items-center rounded-lg bg-emerald-400/90 px-4 text-xs font-semibold leading-none text-zinc-950 shadow-[0_0_20px_-6px_rgba(52,211,153,0.9)] transition hover:bg-emerald-300"
          >
            + Create
          </button>
        </div>
      </header>

      {/* Body */}
      <div className="relative z-10 flex min-h-0 flex-1">
        <div className="min-h-0 flex-1 overflow-auto">
          {error && (
            <p className="p-6 text-sm text-rose-300">
              Couldn’t load the calendar — {error}. Check your connection and
              try again.
            </p>
          )}
          {view === "month" && (
            <MonthView
              cursor={cursor}
              items={items}
              onDayClick={(d) => openCreate(d)}
              onItemClick={openEdit}
            />
          )}
          {(view === "week" || view === "day") && (
            <TimeGridView
              days={view === "week" ? 7 : 1}
              anchor={view === "week" ? startOfWeek(cursor) : cursor}
              items={items}
              onSlotClick={(d) => openCreate(d)}
              onItemClick={openEdit}
            />
          )}
          {view === "agenda" && (
            <AgendaView items={items} onItemClick={openEdit} />
          )}
          {loading && (
            <p className="p-4 font-mono text-xs tabular-nums text-zinc-500">
              syncing…
            </p>
          )}
        </div>

        {showMySchedule && (
          <aside className="w-90 shrink-0 overflow-y-auto border-l border-white/10 bg-zinc-950/95 shadow-[-12px_0_30px_-24px_rgba(0,0,0,0.9)]">
            <MySchedule onItemClick={openEdit} />
          </aside>
        )}
      </div>

      {modal.open && (
        <EventModal
          editing={modal.editing}
          presetStart={modal.presetStart}
          onClose={() => setModal({ open: false })}
          onSave={handleSave}
          onDelete={
            modal.editing?.source === "calendarEvent" &&
              modal.editing?.canEdit !== false
              ? async () => {
                await deleteItem(modal.editing!.id);
                setModal({ open: false });
              }
              : undefined
          }
        />
      )}
    </div>
  );
}

/* ── Month view ─────────────────────────────────────────────────────────── */

function MonthView({
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
  const days = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  const gridEnd = addDays(gridStart, 42);
  const occ = splitOccurrencesByDay(
    expandOccurrences(items, gridStart, gridEnd),
    gridStart,
    gridEnd,
  );

  return (
    <>

      <style jsx global>{`
        .month-day-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: transparent transparent;
          overscroll-behavior: contain;
        }

        .month-day-scrollbar:hover,
        .month-day-scrollbar:focus,
        .month-day-scrollbar:focus-within {
          scrollbar-color: rgba(161, 161, 170, 0.65)
            rgba(255, 255, 255, 0.04);
        }

        .month-day-scrollbar::-webkit-scrollbar {
          width: 7px;
        }

        .month-day-scrollbar::-webkit-scrollbar-track {
          background: transparent;
          border-radius: 9999px;
        }

        .month-day-scrollbar::-webkit-scrollbar-thumb {
          background: transparent;
          border: 2px solid transparent;
          border-radius: 9999px;
          background-clip: padding-box;
        }

        .month-day-scrollbar:hover::-webkit-scrollbar-track,
        .month-day-scrollbar:focus::-webkit-scrollbar-track,
        .month-day-scrollbar:focus-within::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.04);
        }

        .month-day-scrollbar:hover::-webkit-scrollbar-thumb,
        .month-day-scrollbar:focus::-webkit-scrollbar-thumb,
        .month-day-scrollbar:focus-within::-webkit-scrollbar-thumb {
          background: rgba(161, 161, 170, 0.6);
          border: 2px solid transparent;
          background-clip: padding-box;
        }

        .month-day-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(212, 212, 216, 0.8);
          border: 2px solid transparent;
          background-clip: padding-box;
        }
      `}</style>

      <div className="grid h-full grid-cols-7 grid-rows-[auto_repeat(6,minmax(0,1fr))]">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div
            key={d}
            className="border-b border-r border-white/5 px-2 py-1.5 text-center text-[11px] font-medium uppercase tracking-wider text-zinc-500"
          >
            {d}
          </div>
        ))}

        {days.map((day) => {
          const today = sameDay(day, zonedNow());
          const inMonth = day.getMonth() === cursor.getMonth();

          const allOccurrences = occ
            .filter((o) => sameDay(o.start, day))
            .sort((a, b) => {
              if (a.item.allDay !== b.item.allDay) {
                return a.item.allDay ? -1 : 1;
              }

              return a.start.getTime() - b.start.getTime();
            });

          const dayOccurrences = allOccurrences;
          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => onDayClick(day)}
              className={`group flex min-h-0 flex-col gap-1.5 border-b border-r border-white/5 p-1.5 text-center align-top transition hover:bg-white/4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-400/50 ${inMonth ? "" : "opacity-40"
                }`}
              aria-label={day.toLocaleDateString([], {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            >
              <span
                className={`mx-auto inline-flex min-h-6 min-w-6 items-center justify-center rounded-md px-1.5 font-mono text-xs tabular-nums ${today
                    ? "bg-emerald-400/90 font-semibold text-zinc-950"
                    : "text-zinc-400"
                  }`}
              >
                {day.getDate()}
              </span>

              <div
                className="month-day-scrollbar flex min-h-0 w-full flex-1 flex-col gap-1.5 overflow-y-auto overflow-x-hidden pr-1 focus-visible:outline-none"
                tabIndex={0}
                onPointerDown={(event) => {
                  event.currentTarget.focus({ preventScroll: true });
                }}
                onClick={(event) => event.stopPropagation()}
                onWheel={(event) => event.stopPropagation()}
                aria-label={`Schedules for ${day.toLocaleDateString([], {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}`}
              >
                {dayOccurrences.map((occurrence) => {
                  const { item, start, end } = occurrence;
                  const timeLabel = item.allDay
                    ? "All Day"
                    : formatSegmentTimeRange(start, end);
                  const durationLabel = item.allDay
                    ? null
                    : formatDuration(start, end);

                  return (
                    <span
                      key={`${item.id}-${start.toISOString()}`}
                      role="button"
                      tabIndex={0}
                      onClick={(event) => {
                        event.stopPropagation();
                        onItemClick(item);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          event.stopPropagation();
                          onItemClick(item);
                        }
                      }}
                      title={
                        item.allDay
                          ? `${item.title} — All Day`
                          : `${item.title} — ${timeLabel} (${durationLabel})`
                      }
                      className={`flex min-h-12 w-full shrink-0 flex-col items-center justify-center rounded-md border px-2 py-1.5 text-center transition hover:brightness-125 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current/50 ${TYPE_STYLES[item.type]}`}
                    >
                      <span className="block w-full truncate text-[11px] font-semibold leading-tight">
                        {item.title}
                      </span>

                      <span className="mt-1 block w-full truncate font-mono text-[10px] font-semibold leading-tight tabular-nums opacity-95">
                        {timeLabel}
                      </span>

                      {durationLabel && (
                        <span className="mt-0.5 block text-[9px] font-medium leading-tight opacity-70">
                          Duration: {durationLabel}
                        </span>
                      )}
                    </span>
                  );
                })}
              </div>
            </button>
          );
        })}
      </div>
    </>
  );
}

/* ── Day / Week time grid ───────────────────────────────────────────────── */

function TimeGridView({
  days,
  anchor,
  items,
  onSlotClick,
  onItemClick,
}: {
  days: number;
  anchor: Date;
  items: CalendarItem[];
  onSlotClick: (d: Date) => void;
  onItemClick: (i: CalendarItem) => void;
}) {
  const cols = Array.from({ length: days }, (_, i) => addDays(anchor, i));
  const rangeEnd = addDays(anchor, days);
  const occ = splitOccurrencesByDay(
    expandOccurrences(items, anchor, rangeEnd),
    anchor,
    rangeEnd,
  );
  const isEmpty = occ.length === 0;

  const headerHeight = 64;

  return (
    <div className="relative min-w-190 bg-zinc-950">
      {isEmpty && (
        <div className="pointer-events-none sticky left-0 z-20 flex h-0 w-full items-start justify-center">
          <div className="pointer-events-auto mt-24 flex flex-col items-center gap-3 rounded-2xl border border-white/10 bg-zinc-900/90 px-8 py-10 text-center shadow-xl backdrop-blur-md">
            <span className="text-3xl" aria-hidden>
              🗓️
            </span>
            <p className="text-sm font-medium text-zinc-200">
              {days === 1 ? "Nothing scheduled today" : "Nothing scheduled this week"}
            </p>
            <p className="max-w-xs text-xs text-zinc-500">
              Select any time slot on the grid to add an event, or use a quick shortcut below.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              <button
                onClick={() => onSlotClick(quickSlot(9))}
                className="rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-3 py-1.5 text-xs font-medium text-emerald-300 transition hover:bg-emerald-400/20"
              >
                + 9:00 AM today
              </button>
              <button
                onClick={() => onSlotClick(quickSlot(14))}
                className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-zinc-300 transition hover:bg-white/5"
              >
                + 2:00 PM today
              </button>
            </div>
          </div>
        </div>
      )}
      <div
        className="sticky top-0 z-20 grid border-b border-white/8 bg-zinc-950/95 backdrop-blur-xl"
        style={{
          gridTemplateColumns: `80px repeat(${days}, minmax(0, 1fr))`,
          minHeight: headerHeight,
        }}
      >
        <div className="flex items-center justify-center border-r border-white/6 px-2">
          <span className="inline-flex h-5 items-center justify-center rounded border border-emerald-400/20 bg-emerald-400/[0.07] px-2 text-[8px] font-semibold uppercase leading-none tracking-[0.14em] text-emerald-300">
            MDT
          </span>
        </div>

        {cols.map((day) => {
          const today = sameDay(day, zonedNow());
          return (
            <div
              key={`header-${day.toISOString()}`}
              className={`min-w-0 border-r border-white/6 px-2 py-1.5 text-center ${today ? "bg-emerald-400/[0.035]" : ""
                }`}
            >
              <div className="flex min-h-10 flex-col items-center justify-center">
                <span
                  className={`text-[10px] font-semibold uppercase tracking-[0.14em] ${today ? "text-emerald-300" : "text-zinc-500"
                    }`}
                >
                  {day.toLocaleDateString([], { weekday: "short" })}
                </span>

                <span
                  className={`mt-1 inline-flex h-8 min-w-8 items-center justify-center rounded-full px-2 font-mono text-sm font-semibold tabular-nums ${today
                      ? "bg-emerald-400 text-zinc-950 shadow-[0_0_18px_-5px_rgba(52,211,153,0.8)]"
                      : "text-zinc-200"
                    }`}
                >
                  {day.getDate()}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div
        className="grid"
        style={{
          gridTemplateColumns: `80px repeat(${days}, minmax(0, 1fr))`,
        }}
      >
        <div className="relative border-r border-white/6 bg-zinc-950">
          {HOURS.map((h) => (
            <div
              key={h}
              style={{
                top: h * HOUR_PX,
                height: HOUR_PX,
              }}
              className="absolute inset-x-0"
            >
              <span
                className={`absolute right-3 rounded bg-zinc-950 px-1.5 font-mono text-[10px] font-medium tabular-nums text-zinc-400 ${h === 0 ? "top-1.5" : "-top-2.5"
                  }`}
              >
                {new Date(2000, 0, 1, h).toLocaleTimeString([], {
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </span>
            </div>
          ))}
          <div style={{ height: HOUR_PX * 24 }} />
        </div>

        {cols.map((day) => {
          const dayOcc = occ.filter(
            (o) => sameDay(o.start, day) && !o.item.allDay,
          );
          const today = sameDay(day, zonedNow());

          return (
            <div
              key={day.toISOString()}
              className={`relative min-w-0 border-r border-white/6 ${today ? "bg-emerald-400/1.5" : ""
                }`}
            >
              <div className="relative" style={{ height: HOUR_PX * 24 }}>
                {HOURS.map((h) => (
                  <button
                    key={h}
                    type="button"
                    aria-label={`Create at ${h}:00 on ${day.toLocaleDateString()}`}
                    onClick={() => {
                      const d = new Date(day);
                      d.setHours(h, 0, 0, 0);
                      onSlotClick(d);
                    }}
                    style={{ top: h * HOUR_PX, height: HOUR_PX }}
                    className={`group absolute inset-x-0 border-b border-white/4.5 transition hover:bg-emerald-400/2.5 focus-visible:z-10 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-emerald-400/40 ${h === 0 ? "border-t border-white/4.5" : ""
                      }`}
                  >
                    <span className="pointer-events-none absolute inset-x-0 top-1/2 border-t border-dashed border-white/[0.018]" />
                  </button>
                ))}

                {today && <NowLine showLabel={days === 1} />}

                {dayOcc.map((o) => {
                  const gridHeight = HOUR_PX * 24;
                  const startMinutes =
                    o.start.getHours() * 60 + o.start.getMinutes();

                  const endsAtNextMidnight =
                    !sameDay(o.start, o.end) &&
                    o.end.getHours() === 0 &&
                    o.end.getMinutes() === 0;

                  const endMinutes = endsAtNextMidnight
                    ? 24 * 60
                    : o.end.getHours() * 60 + o.end.getMinutes();

                  const safeEndMinutes = Math.max(startMinutes + 1, endMinutes);
                  const rawTop = (startMinutes / 60) * HOUR_PX;
                  const rawBottom =
                    gridHeight - (safeEndMinutes / 60) * HOUR_PX;

                  const verticalInset = 3;
                  const top = Math.max(0, rawTop + verticalInset);
                  const bottom = Math.max(0, rawBottom + verticalInset);
                  const renderedHeight = Math.max(
                    0,
                    gridHeight - top - bottom,
                  );

                  return (
                    <button
                      key={`${o.item.id}-${o.start.toISOString()}`}
                      type="button"
                      onClick={() => onItemClick(o.item)}
                      style={{
                        top,
                        bottom,
                        height: "auto",
                        minHeight: renderedHeight < 18 ? 16 : 0,
                        boxSizing: "border-box",
                      }}
                      title={`${o.item.title} — ${formatSegmentTimeRange(
                        o.start,
                        o.end,
                      )} (${formatDuration(o.start, o.end)})`}
                      className={`absolute inset-x-1.5 z-5 flex overflow-hidden rounded-lg border px-2.5 py-1.5 text-left backdrop-blur-md transition duration-150 hover:z-10 hover:brightness-125 hover:shadow-lg focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/70 ${TYPE_STYLES[o.item.type]}`}
                    >
                      <span className="flex min-w-0 flex-1 flex-col items-start justify-start text-left">
                        <span className="block w-full truncate text-[11px] font-semibold leading-tight">
                          {o.item.title}
                        </span>

                        {renderedHeight >= 28 && (
                          <span className="mt-1 block w-full truncate font-mono text-[10px] font-medium leading-tight tabular-nums opacity-90">
                            {formatSegmentTimeRange(o.start, o.end)}
                          </span>
                        )}

                        {renderedHeight >= 48 && (
                          <span className="mt-0.5 block text-[9px] font-medium leading-tight opacity-65">
                            {formatDuration(o.start, o.end)}
                          </span>
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function NowLine({ showLabel = false }: { showLabel?: boolean }) {
  const now = zonedNow();
  const top = (now.getHours() + now.getMinutes() / 60) * HOUR_PX;
  const timeLabel = now.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <div
      style={{ top }}
      className="pointer-events-none absolute inset-x-0 z-8 h-px bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.75)]"
    >
      <span className="absolute -left-1.5 -top-1.25 h-2.5 w-2.5 rounded-full border-2 border-zinc-950 bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.9)]" />

      {showLabel && (
        <span className="absolute left-2 top-1 rounded-md border border-emerald-400/25 bg-zinc-950/95 px-1.5 py-0.5 font-mono text-[9px] font-semibold tabular-nums text-emerald-300 shadow-sm">
          {timeLabel}
        </span>
      )}
    </div>
  );
}

/* ── Agenda view ────────────────────────────────────────────────────────── */

function AgendaView({
  items,
  onItemClick,
}: {
  items: CalendarItem[];
  onItemClick: (item: CalendarItem) => void;
}) {
  const from = startOfDay(zonedNow());
  const rangeEnd = addDays(from, 60);

  const occurrences = expandOccurrences(items, from, rangeEnd).sort(
    (a, b) => a.start.getTime() - b.start.getTime(),
  );

  const groupedByDay = new Map<string, Occurrence[]>();

  for (const occurrence of occurrences) {
    const dayKey = startOfDay(occurrence.start).toISOString();
    const current = groupedByDay.get(dayKey) ?? [];
    groupedByDay.set(dayKey, [...current, occurrence]);
  }

  if (groupedByDay.size === 0) {
    return (
      <div className="flex min-h-90 items-center justify-center px-6 py-12">
        <div className="rounded-xl border border-white/10 bg-white/3 px-8 py-6 text-center">
          <p className="text-sm font-semibold text-zinc-300">
            Nothing scheduled
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            No calendar items are scheduled in the next 60 days.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full divide-y divide-white/8">
      {[...groupedByDay.entries()].map(([dayKey, dayOccurrences]) => {
        const day = new Date(dayKey);
        const isToday = sameDay(day, zonedNow());

        return (
          <section
            key={dayKey}
            className="grid grid-cols-[112px_minmax(0,1fr)] gap-4 px-5 py-4 transition hover:bg-white/1.5"
          >
            <div className="pt-1">
              <div
                className={`inline-flex min-w-22 flex-col rounded-lg border px-3 py-2 ${isToday
                    ? "border-emerald-400/30 bg-emerald-400/10"
                    : "border-white/8 bg-white/2.5"
                  }`}
              >
                <span
                  className={`text-[11px] font-semibold ${isToday ? "text-emerald-300" : "text-zinc-300"
                    }`}
                >
                  {day.toLocaleDateString([], { weekday: "short" })}
                </span>
                <span className="mt-0.5 text-xs font-medium text-zinc-400">
                  {day.toLocaleDateString([], {
                    month: "short",
                    day: "numeric",
                  })}
                </span>
                {isToday && (
                  <span className="mt-1 text-[9px] font-semibold uppercase tracking-wider text-emerald-400">
                    Today
                  </span>
                )}
              </div>
            </div>

            <div className="flex min-w-0 flex-col gap-2.5">
              {dayOccurrences.map((occurrence) => {
                const { item, start, end } = occurrence;
                const timeLabel = item.allDay
                  ? "All Day"
                  : formatSegmentTimeRange(start, end);

                return (
                  <button
                    key={`${item.id}-${start.toISOString()}`}
                    type="button"
                    onClick={() => onItemClick(item)}
                    className={`group flex min-h-13 w-full min-w-0 items-center rounded-lg border px-4 py-2.5 text-left shadow-sm transition hover:-translate-y-px hover:brightness-125 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60 ${TYPE_STYLES[item.type]}`}
                  >
                    <div className="w-37.5 shrink-0 border-r border-current/15 pr-4">
                      <span className="block whitespace-nowrap font-mono text-[11px] font-semibold tabular-nums opacity-95">
                        {timeLabel}
                      </span>
                      {!item.allDay && (
                        <span className="mt-0.5 block text-[9px] uppercase tracking-wide opacity-60">
                          Mountain Time
                        </span>
                      )}
                    </div>

                    <div className="min-w-0 flex-1 px-4">
                      <span className="block truncate text-xs font-semibold">
                        {item.title}
                      </span>
                      {item.description && (
                        <span className="mt-0.5 block truncate text-[10px] opacity-65">
                          {item.description}
                        </span>
                      )}
                    </div>

                    <span className="ml-3 shrink-0 rounded-md border border-current/15 bg-white/6 px-2 py-1 text-[9px] font-semibold uppercase tracking-wider opacity-90">
                      {item.type}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}