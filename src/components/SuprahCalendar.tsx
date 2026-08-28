"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  CalendarItem,
  CalendarView,
  CrmUserLite,
  EventDraft,
} from "@/types/calendar.types";
import {
  CALENDAR_TZ_LABEL,
  addDays,
  expandOccurrences,
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
import { CalendarNotificationsBell } from "@/components/CalendarNotificationsBell";
import { apiClient } from "@/lib/api-client";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

function initials(name?: string) {
  return (name || "U")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

async function fetchTeamMembers(): Promise<CrmUserLite[]> {
  try {
    const res = await apiClient.getTeamMembers();
    const raw = res.data?.members ?? res.data?.data ?? res.data ?? [];
    return (Array.isArray(raw) ? raw : []).map((u: any) => ({
      _id: String(u._id ?? u.id),
      fullName: u.fullName ?? u.name,
      username: u.username,
      email: u.email,
    }));
  } catch {
    return [];
  }
}

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
    "border-emerald-600/55 bg-emerald-100 text-emerald-950 shadow-sm dark:border-emerald-300/60 dark:bg-emerald-500/25 dark:text-emerald-50 dark:shadow-[0_0_14px_-5px_rgba(52,211,153,0.55)]",
  meeting:
    "border-cyan-600/55 bg-cyan-100 text-cyan-950 shadow-sm dark:border-cyan-300/60 dark:bg-cyan-500/25 dark:text-cyan-50 dark:shadow-[0_0_14px_-5px_rgba(34,211,238,0.55)]",
  task:
    "border-amber-600/55 border-l-4 border-l-amber-500 bg-amber-100 text-amber-950 shadow-sm hover:bg-amber-200 dark:border-amber-300/45 dark:border-l-amber-300/80 dark:bg-amber-400/[0.11] dark:text-orange-50 dark:shadow-[0_0_0_1px_rgba(251,191,36,0.06)] dark:hover:bg-amber-400/[0.16]",
  reminder:
    "border-violet-600/55 bg-violet-100 text-violet-950 shadow-sm dark:border-violet-300/60 dark:bg-violet-500/25 dark:text-violet-50 dark:shadow-[0_0_14px_-5px_rgba(167,139,250,0.55)]",
  appointment:
    "border-teal-600/55 bg-teal-100 text-teal-950 shadow-sm dark:border-teal-300/60 dark:bg-teal-500/25 dark:text-teal-50 dark:shadow-[0_0_14px_-5px_rgba(94,234,212,0.55)]",
};

const TYPE_ROW_STYLES: Record<string, string> = {
  event:
    "border-l-emerald-600 bg-emerald-100 text-emerald-950 hover:bg-emerald-200 dark:border-l-emerald-300 dark:bg-emerald-500/25 dark:text-emerald-50 dark:hover:bg-emerald-500/35",
  meeting:
    "border-l-cyan-600 bg-cyan-100 text-cyan-950 hover:bg-cyan-200 dark:border-l-cyan-300 dark:bg-cyan-500/25 dark:text-cyan-50 dark:hover:bg-cyan-500/35",
  task:
    "border-b-amber-600/25 border-l-amber-600 bg-amber-100 text-amber-950 hover:bg-amber-200 dark:border-b-amber-300/20 dark:border-l-amber-300/80 dark:bg-amber-400/[0.11] dark:text-orange-50 dark:hover:bg-amber-400/[0.16]",
  reminder:
    "border-l-violet-600 bg-violet-100 text-violet-950 hover:bg-violet-200 dark:border-l-violet-300 dark:bg-violet-500/25 dark:text-violet-50 dark:hover:bg-violet-500/35",
  appointment:
    "border-l-teal-600 bg-teal-100 text-teal-950 hover:bg-teal-200 dark:border-l-teal-300 dark:bg-teal-500/25 dark:text-teal-50 dark:hover:bg-teal-500/35",
};

const TYPE_TIME_STYLES: Record<string, string> = {
  event: "text-emerald-900 dark:text-emerald-100/90",
  meeting: "text-cyan-900 dark:text-cyan-100/90",
  task: "text-amber-900 dark:text-amber-100/90",
  reminder: "text-violet-900 dark:text-violet-100/90",
  appointment: "text-teal-900 dark:text-teal-100/90",
};

const TYPE_DURATION_STYLES: Record<string, string> = {
  event: "text-emerald-800 dark:text-emerald-100/75",
  meeting: "text-cyan-800 dark:text-cyan-100/75",
  task: "text-amber-800 dark:text-amber-100/75",
  reminder: "text-violet-800 dark:text-violet-100/75",
  appointment: "text-teal-800 dark:text-teal-100/75",
};

const TYPE_GROUP_STYLES: Record<string, string> = {
  event:
    "border-2 border-emerald-600/90 ring-2 ring-emerald-500/15 shadow-[0_0_0_1px_rgba(5,150,105,0.08),0_8px_22px_-14px_rgba(5,150,105,0.65)] dark:border-emerald-300/85 dark:ring-emerald-300/20 dark:shadow-[0_0_0_1px_rgba(110,231,183,0.08),0_8px_24px_-14px_rgba(52,211,153,0.65)]",
  meeting:
    "border-2 border-cyan-600/90 ring-2 ring-cyan-500/15 shadow-[0_0_0_1px_rgba(8,145,178,0.08),0_8px_22px_-14px_rgba(8,145,178,0.65)] dark:border-cyan-300/85 dark:ring-cyan-300/20 dark:shadow-[0_0_0_1px_rgba(103,232,249,0.08),0_8px_24px_-14px_rgba(34,211,238,0.65)]",
  task:
    "border-2 border-amber-600/85 ring-1 ring-amber-500/15 shadow-[0_0_0_1px_rgba(217,119,6,0.07),0_8px_20px_-16px_rgba(217,119,6,0.45)] dark:border-amber-300/50 dark:ring-1 dark:ring-amber-300/30 dark:shadow-[0_0_0_1px_rgba(251,191,36,0.08)]",
  reminder:
    "border-2 border-violet-600/90 ring-2 ring-violet-500/15 shadow-[0_0_0_1px_rgba(124,58,237,0.08),0_8px_22px_-14px_rgba(124,58,237,0.65)] dark:border-violet-300/85 dark:ring-violet-300/20 dark:shadow-[0_0_0_1px_rgba(196,181,253,0.08),0_8px_24px_-14px_rgba(167,139,250,0.65)]",
  appointment:
    "border-2 border-teal-600/90 ring-2 ring-teal-500/15 shadow-[0_0_0_1px_rgba(13,148,136,0.08),0_8px_22px_-14px_rgba(13,148,136,0.65)] dark:border-teal-300/85 dark:ring-teal-300/20 dark:shadow-[0_0_0_1px_rgba(94,234,212,0.08),0_8px_24px_-14px_rgba(45,212,191,0.65)]",
  mixed:
    "border-2 border-zinc-500/80 ring-2 ring-zinc-500/10 shadow-md dark:border-zinc-400/75 dark:ring-white/10",
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

/**
 * Treat genuine all-day items and midnight-to-midnight blocks as all-day-like
 * for Week/Day presentation. This keeps 24-hour items out of the timed grid,
 * where they would otherwise become a full-height column with tiny text.
 */
function isAllDayLikeOccurrence(occurrence: Occurrence): boolean {
  if (occurrence.item.allDay) return true;

  const startsAtMidnight =
    occurrence.start.getHours() === 0 && occurrence.start.getMinutes() === 0;
  const endsAtMidnight =
    occurrence.end.getHours() === 0 && occurrence.end.getMinutes() === 0;
  const durationMinutes = Math.round(
    (occurrence.end.getTime() - occurrence.start.getTime()) / 60000,
  );

  return (
    startsAtMidnight &&
    endsAtMidnight &&
    !sameDay(occurrence.start, occurrence.end) &&
    durationMinutes >= 23 * 60
  );
}

interface OverlapGroup {
  occurrences: Occurrence[];
  start: Date;
  end: Date;
}

/**
 * Groups intersecting timed items into a single visual cell.
 *
 * Items that overlap directly, or are connected through another overlapping
 * item, share one card. Each item remains independently clickable inside that
 * card and is separated by a clear divider.
 */
function groupOverlappingOccurrences(
  occurrences: Occurrence[],
): OverlapGroup[] {
  const sorted = [...occurrences].sort((a, b) => {
    const startDiff = a.start.getTime() - b.start.getTime();
    if (startDiff !== 0) return startDiff;
    return a.end.getTime() - b.end.getTime();
  });

  const groups: OverlapGroup[] = [];

  for (const occurrence of sorted) {
    const current = groups[groups.length - 1];

    if (
      !current ||
      occurrence.start.getTime() >= current.end.getTime()
    ) {
      groups.push({
        occurrences: [occurrence],
        start: occurrence.start,
        end: occurrence.end,
      });
      continue;
    }

    current.occurrences.push(occurrence);

    if (occurrence.end.getTime() > current.end.getTime()) {
      current.end = occurrence.end;
    }
  }

  return groups;
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
  const { items: allItems, loading, error, createItem, updateItem, deleteItem } =
    useCalendar(fromZoned(rangeStart), fromZoned(rangeEnd));

  const [teamMembers, setTeamMembers] = useState<CrmUserLite[]>([]);
  const [teamFilter, setTeamFilter] = useState<string>("all");

  useEffect(() => {
    void fetchTeamMembers().then(setTeamMembers);
  }, []);

  /** "What's my team doing this week" — narrows the grid to one teammate's items. */
  const items = useMemo(() => {
    if (teamFilter === "all") return allItems;
    return allItems.filter(
      (item) =>
        item.assignees?.some((a) => a._id === teamFilter) ||
        item.createdBy?._id === teamFilter,
    );
  }, [allItems, teamFilter]);

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
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-border bg-card text-foreground shadow-sm backdrop-blur-xl">
      {/* Ambient blobs — cockpit atmosphere */}
      <div className="pointer-events-none absolute -top-32 -left-24 h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 right-0 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl" />

      {/* Toolbar */}
      <header className="relative z-10 flex flex-wrap items-center gap-2 border-b border-border bg-card/95 px-3 py-3 sm:gap-3 sm:px-5">
        <div className="flex h-9 shrink-0 items-center gap-2">
          <button
            onClick={() => setCursor(startOfDay(zonedNow()))}
            className="flex h-9 items-center rounded-lg border border-emerald-600/35 bg-emerald-500/10 px-3 text-xs font-semibold leading-none text-emerald-700 transition hover:bg-emerald-500/15 dark:text-emerald-200"
          >
            Today
          </button>
          <button
            aria-label="Previous"
            onClick={() => step(-1)}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-background leading-none text-foreground transition hover:bg-accent"
          >
            ‹
          </button>
          <button
            aria-label="Next"
            onClick={() => step(1)}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-background leading-none text-foreground transition hover:bg-accent"
          >
            ›
          </button>
        </div>

        <div className="flex h-9 min-w-0 items-center gap-2">
          <h1 className="truncate text-base font-semibold leading-none tracking-tight text-foreground sm:text-lg">
            {headline}
          </h1>
          <span className="hidden h-6 shrink-0 items-center rounded-md border border-border bg-muted px-2 font-mono text-[10px] font-semibold leading-none tabular-nums text-muted-foreground sm:flex">
            {CALENDAR_TZ_LABEL} · Mountain Time
          </span>
        </div>

        <div className="ml-auto flex h-9 shrink-0 flex-wrap items-center gap-2">
          <select
            aria-label="Team"
            value={teamFilter}
            onChange={(e) => setTeamFilter(e.target.value)}
            className="h-9 rounded-lg border border-border bg-background px-2 text-xs text-foreground outline-none transition hover:bg-accent"
          >
            <option value="all">Everyone</option>
            {teamMembers.map((m) => (
              <option key={m._id} value={m._id}>
                {m.fullName || m.username || m.email}
              </option>
            ))}
          </select>

          {/* View switcher: buttons on wider screens, a select below sm */}
          <select
            aria-label="Calendar view"
            value={view}
            onChange={(e) => setView(e.target.value as CalendarView)}
            className="h-9 rounded-lg border border-border bg-background px-2 text-xs capitalize text-foreground outline-none transition hover:bg-accent sm:hidden"
          >
            {(["day", "week", "month", "agenda"] as CalendarView[]).map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
          <div className="hidden h-9 items-center overflow-hidden rounded-lg border border-border bg-background sm:flex">
            {(["day", "week", "month", "agenda"] as CalendarView[]).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`flex h-full items-center px-3 text-xs capitalize leading-none transition ${view === v
                  ? "bg-emerald-500/15 font-semibold text-emerald-700 dark:text-emerald-200"
                  : "text-muted-foreground hover:bg-accent"
                  }`}
              >
                {v}
              </button>
            ))}
          </div>

          <CalendarNotificationsBell />

          <button
            onClick={() => setShowMySchedule((s) => !s)}
            className={`flex h-9 items-center rounded-lg border px-3 text-xs font-medium leading-none transition ${showMySchedule
              ? "border-cyan-600/35 bg-cyan-500/10 font-semibold text-cyan-700 dark:text-cyan-200"
              : "border-border text-foreground hover:bg-accent"
              }`}
          >
            <span className="hidden sm:inline">My Schedule</span>
            <span className="sm:hidden">Mine</span>
          </button>
          <button
            onClick={() => openCreate()}
            className="flex h-9 items-center rounded-lg bg-emerald-500 px-4 text-xs font-semibold leading-none text-white shadow-[0_0_20px_-6px_rgba(16,185,129,0.7)] transition hover:bg-emerald-400"
          >
            + Create
          </button>
        </div>
      </header>

      {/* Body */}
      <div className="relative z-10 flex min-h-0 flex-1">
        <div className="min-h-0 flex-1 overflow-auto">
          {error && (
            <p className="p-6 text-sm font-medium text-rose-700 dark:text-rose-300">
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
            <p className="p-4 font-mono text-xs font-medium tabular-nums text-muted-foreground">
              syncing…
            </p>
          )}
        </div>

        {showMySchedule && (
          <aside className="fixed inset-0 z-40 overflow-y-auto bg-background shadow-2xl md:static md:z-auto md:w-90 md:shrink-0 md:border-l md:border-border md:bg-card/98 md:shadow-[-12px_0_30px_-24px_rgba(0,0,0,0.18)]">
            <div className="flex items-center justify-between border-b border-border px-4 py-3 md:hidden">
              <span className="text-sm font-semibold text-foreground">My Schedule</span>
              <button
                onClick={() => setShowMySchedule(false)}
                className="rounded-lg border border-border px-2.5 py-1 text-xs text-foreground hover:bg-accent"
              >
                Close
              </button>
            </div>
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
            className="border-b border-r border-border bg-muted/40 px-2 py-1.5 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
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
              className={`group flex min-h-0 flex-col gap-1.5 border-b border-r border-border bg-card p-1.5 text-center align-top transition hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-500/50 ${inMonth ? "" : "opacity-45"
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
                    ? "bg-emerald-500 font-semibold text-white"
                    : "text-foreground"
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
                      className={`flex min-h-12 w-full shrink-0 flex-col items-center justify-center rounded-md border px-2 py-1.5 text-center transition hover:-translate-y-px hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current/50 ${TYPE_STYLES[item.type]}`}
                    >
                      <span className="block w-full whitespace-normal break-words text-[12px] font-bold leading-snug">
                        {item.title}
                      </span>

                      <span className="mt-1 block w-full font-mono text-[10.5px] font-semibold leading-tight tabular-nums opacity-95">
                        {timeLabel}
                      </span>

                      {durationLabel && (
                        <span className="mt-0.5 block text-[10px] font-semibold leading-tight opacity-80">
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

  const allDayOcc = occ.filter(isAllDayLikeOccurrence);
  const isEmpty = occ.length === 0;
  const headerHeight = 64;

  return (
    <div className="overflow-x-auto">
    <div className="relative min-w-190 bg-background text-foreground">
      {isEmpty && (
        <div className="pointer-events-none sticky left-0 z-20 flex h-0 w-full items-start justify-center">
          <div className="pointer-events-auto mt-24 flex flex-col items-center gap-3 rounded-2xl border border-border bg-card/95 px-8 py-10 text-center shadow-xl backdrop-blur-md">
            <span className="text-3xl" aria-hidden>
              🗓️
            </span>
            <p className="text-sm font-semibold text-foreground">
              {days === 1
                ? "Nothing scheduled today"
                : "Nothing scheduled this week"}
            </p>
            <p className="max-w-xs text-xs font-medium text-muted-foreground">
              Select any time slot on the grid to add an event, or use a quick
              shortcut below.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              <button
                onClick={() => onSlotClick(quickSlot(9))}
                className="rounded-lg border border-emerald-600/35 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-500/15 dark:text-emerald-200"
              >
                + 9:00 AM today
              </button>
              <button
                onClick={() => onSlotClick(quickSlot(14))}
                className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground transition hover:bg-accent"
              >
                + 2:00 PM today
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sticky day header */}
      <div
        className="sticky top-0 z-30 grid border-b border-border bg-card/95 shadow-sm backdrop-blur-xl"
        style={{
          gridTemplateColumns: `80px repeat(${days}, minmax(0, 1fr))`,
          minHeight: headerHeight,
        }}
      >
        <div className="flex items-center justify-center border-r border-border px-2">
          <span className="inline-flex h-5 items-center justify-center rounded border border-emerald-600/25 bg-emerald-500/10 px-2 text-[9px] font-bold uppercase leading-none tracking-[0.14em] text-emerald-700 dark:text-emerald-200">
            MDT
          </span>
        </div>

        {cols.map((day) => {
          const today = sameDay(day, zonedNow());
          return (
            <div
              key={`header-${day.toISOString()}`}
              className={`min-w-0 border-r border-border px-2 py-1.5 text-center ${
                today
                  ? "bg-emerald-500/8"
                  : "bg-card"
              }`}
            >
              <div className="flex min-h-10 flex-col items-center justify-center">
                <span
                  className={`text-[10px] font-bold uppercase tracking-[0.14em] ${
                    today
                      ? "text-emerald-700 dark:text-emerald-200"
                      : "text-muted-foreground"
                  }`}
                >
                  {day.toLocaleDateString([], { weekday: "short" })}
                </span>

                <span
                  className={`mt-1 inline-flex h-8 min-w-8 items-center justify-center rounded-full px-2 font-mono text-sm font-bold tabular-nums ${
                    today
                      ? "bg-emerald-500 text-white shadow-[0_0_18px_-5px_rgba(16,185,129,0.65)]"
                      : "text-foreground"
                  }`}
                >
                  {day.getDate()}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Dedicated all-day lane. It stays compact and scrolls when many items exist. */}
      {allDayOcc.length > 0 && (
        <div
          className="grid border-b border-border bg-muted/40"
          style={{
            gridTemplateColumns: `80px repeat(${days}, minmax(0, 1fr))`,
          }}
        >
          <div className="flex items-start justify-center border-r border-border px-2 py-3">
            <span className="rounded-md bg-muted px-2 py-1 text-[9px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
              All day
            </span>
          </div>

          {cols.map((day) => {
            const dayAllDay = allDayOcc.filter((o) => sameDay(o.start, day));

            return (
              <div
                key={`all-day-${day.toISOString()}`}
                className="min-h-16 max-h-44 overflow-y-auto border-r border-border p-1.5"
              >
                <div className="flex flex-col gap-1.5">
                  {dayAllDay.map((o) => {
                    const timeLabel = o.item.allDay
                      ? "All day"
                      : formatSegmentTimeRange(o.start, o.end);

                    return (
                      <button
                        key={`all-day-${o.item.id}-${o.start.toISOString()}`}
                        type="button"
                        onClick={() => onItemClick(o.item)}
                        title={`${o.item.title} — ${timeLabel}`}
                        aria-label={`${o.item.title}, ${timeLabel}`}
                        className={`w-full rounded-lg border px-2.5 py-2 text-left transition hover:-translate-y-px hover:brightness-105 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 ${TYPE_STYLES[o.item.type]}`}
                      >
                        <span
                          className="block overflow-hidden text-[12px] font-bold leading-[1.3]"
                          style={{
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                          }}
                        >
                          {o.item.title}
                        </span>
                        <span
                          className={`mt-1 block font-mono text-[10.5px] font-semibold leading-tight tabular-nums ${TYPE_TIME_STYLES[o.item.type]}`}
                        >
                          {timeLabel}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Hour grid */}
      <div
        className="grid"
        style={{
          gridTemplateColumns: `80px repeat(${days}, minmax(0, 1fr))`,
        }}
      >
        <div className="relative border-r border-border bg-muted/40">
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
                className={`absolute right-3 rounded bg-muted/40 px-1.5 font-mono text-[10.5px] font-semibold tabular-nums text-muted-foreground ${
                  h === 0 ? "top-1.5" : "-top-2.5"
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
            (o) => sameDay(o.start, day) && !isAllDayLikeOccurrence(o),
          );
          const today = sameDay(day, zonedNow());

          return (
            <div
              key={day.toISOString()}
              className={`relative min-w-0 border-r border-border ${
                today
                  ? "bg-emerald-500/6"
                  : "bg-background"
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
                    className={`group absolute inset-x-0 border-b border-border/90 transition hover:bg-emerald-500/6 focus-visible:z-10 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-emerald-500/50 ${
                      h === 0
                        ? "border-t border-border/90"
                        : ""
                    }`}
                  >
                    <span className="pointer-events-none absolute inset-x-0 top-1/2 border-t border-dashed border-border/70" />
                  </button>
                ))}

                {today && <NowLine showLabel={days === 1} />}

                {groupOverlappingOccurrences(dayOcc).map((group) => {
                  const gridHeight = HOUR_PX * 24;
                  const startMinutes =
                    group.start.getHours() * 60 + group.start.getMinutes();

                  const endsAtNextMidnight =
                    !sameDay(group.start, group.end) &&
                    group.end.getHours() === 0 &&
                    group.end.getMinutes() === 0;

                  const endMinutes = endsAtNextMidnight
                    ? 24 * 60
                    : group.end.getHours() * 60 + group.end.getMinutes();

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

                  if (group.occurrences.length === 1) {
                    const o = group.occurrences[0];
                    const timeLabel = formatSegmentTimeRange(o.start, o.end);
                    const durationLabel = formatDuration(o.start, o.end);

                    return (
                      <button
                        key={`${o.item.id}-${o.start.toISOString()}`}
                        type="button"
                        onClick={() => onItemClick(o.item)}
                        style={{
                          top,
                          bottom,
                          height: "auto",
                          minHeight: renderedHeight < 20 ? 18 : 0,
                          boxSizing: "border-box",
                        }}
                        title={`${o.item.title} — ${timeLabel} (${durationLabel})`}
                        aria-label={`${o.item.title}, ${timeLabel}, ${durationLabel}`}
                        className={`absolute inset-x-1.5 z-5 flex overflow-hidden rounded-lg border px-2.5 py-2 text-left transition duration-150 hover:z-10 hover:-translate-y-px hover:brightness-105 hover:shadow-lg focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/70 ${TYPE_STYLES[o.item.type]}`}
                      >
                        {renderedHeight >= 46 && o.item.assignees && o.item.assignees.length > 0 && (
                          <Avatar
                            className="absolute right-1.5 top-1.5 size-5 shrink-0 ring-1 ring-current/20"
                            title={o.item.assignees.map((a) => a.fullName || a.username || a.email).join(", ")}
                          >
                            <AvatarFallback className="bg-current/15 text-[8px] font-bold">
                              {initials(o.item.assignees[0].fullName || o.item.assignees[0].username)}
                            </AvatarFallback>
                          </Avatar>
                        )}
                        <span className="flex min-w-0 flex-1 flex-col items-start justify-center text-left">
                          <span
                            className={`block w-full overflow-hidden font-bold leading-[1.25] ${
                              renderedHeight >= 46
                                ? "whitespace-normal break-words text-[12px]"
                                : "truncate text-[11.5px]"
                            }`}
                            style={
                              renderedHeight >= 46
                                ? {
                                    display: "-webkit-box",
                                    WebkitLineClamp: 2,
                                    WebkitBoxOrient: "vertical",
                                  }
                                : undefined
                            }
                          >
                            {o.item.title}
                          </span>

                          {renderedHeight >= 31 && (
                            <span
                              className={`mt-1 block w-full truncate font-mono text-[10.5px] font-semibold leading-tight tabular-nums ${TYPE_TIME_STYLES[o.item.type]}`}
                            >
                              {timeLabel}
                            </span>
                          )}

                          {renderedHeight >= 54 && (
                            <span
                              className={`mt-1 block text-[10px] font-semibold leading-tight ${TYPE_DURATION_STYLES[o.item.type]}`}
                            >
                              {durationLabel}
                            </span>
                          )}
                        </span>
                      </button>
                    );
                  }

                  const groupLabel = `${group.occurrences.length} overlapping calendar items`;
                  const firstGroupType = group.occurrences[0]?.item.type;
                  const groupType = group.occurrences.every(
                    (occurrence) => occurrence.item.type === firstGroupType,
                  )
                    ? firstGroupType
                    : "mixed";

                  return (
                    <div
                      key={`overlap-${group.start.toISOString()}-${group.end.toISOString()}`}
                      role="group"
                      aria-label={groupLabel}
                      title={groupLabel}
                      style={{
                        top,
                        bottom,
                        height: "auto",
                        minHeight: renderedHeight < 30 ? 28 : 0,
                        boxSizing: "border-box",
                      }}
                      className={`absolute inset-x-1.5 z-6 overflow-hidden rounded-lg bg-transparent ${TYPE_GROUP_STYLES[groupType ?? "mixed"] ?? TYPE_GROUP_STYLES.mixed}`}
                    >
                      <div className="flex h-full flex-col overflow-y-auto overscroll-contain">
                        {group.occurrences.map((o) => {
                          const timeLabel = formatSegmentTimeRange(
                            o.start,
                            o.end,
                          );

                          return (
                            <button
                              key={`${o.item.id}-${o.start.toISOString()}`}
                              type="button"
                              onClick={() => onItemClick(o.item)}
                              title={`${o.item.title} — ${timeLabel}`}
                              aria-label={`${o.item.title}, ${timeLabel}`}
                              className={`flex min-h-13 w-full flex-1 flex-col justify-center border-b border-l-4 px-2.5 py-2 text-left transition last:border-b-0 focus-visible:relative focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-500/70 ${TYPE_ROW_STYLES[o.item.type]}`}
                            >
                              <span
                                className="block overflow-hidden text-[11.5px] font-bold leading-[1.25] text-current"
                                style={{
                                  display: "-webkit-box",
                                  WebkitLineClamp: 2,
                                  WebkitBoxOrient: "vertical",
                                }}
                              >
                                {o.item.title}
                              </span>

                              <span
                                className={`mt-1 block truncate font-mono text-[10.5px] font-semibold leading-tight tabular-nums ${TYPE_TIME_STYLES[o.item.type]}`}
                              >
                                {timeLabel}
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
        })}
      </div>
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
      className="pointer-events-none absolute inset-x-0 z-8 h-px bg-emerald-600 shadow-[0_0_8px_rgba(5,150,105,0.55)] dark:bg-emerald-400 dark:shadow-[0_0_10px_rgba(52,211,153,0.75)]"
    >
      <span className="absolute -left-1.5 -top-1.25 h-2.5 w-2.5 rounded-full border-2 border-background bg-emerald-600 shadow-[0_0_8px_rgba(5,150,105,0.55)] dark:bg-emerald-400 dark:shadow-[0_0_10px_rgba(52,211,153,0.9)]" />

      {showLabel && (
        <span className="absolute left-2 top-1 rounded-md border border-emerald-600/30 bg-background/95 px-1.5 py-0.5 font-mono text-[9px] font-bold tabular-nums text-emerald-700 shadow-sm dark:border-emerald-400/25 dark:text-emerald-200">
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
        <div className="rounded-xl border border-border bg-card px-8 py-6 text-center shadow-sm">
          <p className="text-sm font-semibold text-foreground">
            Nothing scheduled
          </p>
          <p className="mt-1 text-xs font-medium text-muted-foreground">
            No calendar items are scheduled in the next 60 days.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full divide-y divide-border bg-background">
      {[...groupedByDay.entries()].map(([dayKey, dayOccurrences]) => {
        const day = new Date(dayKey);
        const isToday = sameDay(day, zonedNow());

        return (
          <section
            key={dayKey}
            className="grid grid-cols-[72px_minmax(0,1fr)] gap-3 px-3 py-4 transition hover:bg-accent/30 sm:grid-cols-[112px_minmax(0,1fr)] sm:gap-4 sm:px-5"
          >
            <div className="pt-1">
              <div
                className={`inline-flex min-w-16 flex-col rounded-lg border px-2 py-1.5 sm:min-w-22 sm:px-3 sm:py-2 ${isToday
                    ? "border-emerald-600/30 bg-emerald-500/10"
                    : "border-border bg-muted/40"
                  }`}
              >
                <span
                  className={`text-[11px] font-semibold ${isToday ? "text-emerald-700 dark:text-emerald-200" : "text-foreground"
                    }`}
                >
                  {day.toLocaleDateString([], { weekday: "short" })}
                </span>
                <span className="mt-0.5 text-xs font-semibold text-muted-foreground">
                  {day.toLocaleDateString([], {
                    month: "short",
                    day: "numeric",
                  })}
                </span>
                {isToday && (
                  <span className="mt-1 text-[9px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
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
                const owner = item.assignees?.[0] ?? item.createdBy;

                return (
                  <button
                    key={`${item.id}-${start.toISOString()}`}
                    type="button"
                    onClick={() => onItemClick(item)}
                    className={`group flex min-h-13 w-full min-w-0 flex-wrap items-center gap-2 rounded-lg border px-3 py-2.5 text-left shadow-sm transition hover:-translate-y-px hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60 sm:flex-nowrap sm:px-4 ${TYPE_STYLES[item.type]}`}
                  >
                    <div className="shrink-0 border-r border-current/15 pr-3 sm:w-37.5 sm:pr-4">
                      <span className="block whitespace-nowrap font-mono text-[11px] font-semibold tabular-nums opacity-95">
                        {timeLabel}
                      </span>
                      {!item.allDay && (
                        <span className="mt-0.5 hidden text-[10px] font-semibold uppercase tracking-wide opacity-75 sm:block">
                          Mountain Time
                        </span>
                      )}
                    </div>

                    <div className="min-w-0 flex-1 px-1 sm:px-4">
                      <span className="block truncate text-[13px] font-bold">
                        {item.title}
                      </span>
                      {item.description && (
                        <span className="mt-1 hidden truncate text-[11px] font-medium opacity-80 sm:block">
                          {item.description}
                        </span>
                      )}
                    </div>

                    {owner && (
                      <Avatar
                        className="hidden size-6 shrink-0 ring-1 ring-current/20 sm:flex"
                        title={owner.fullName || owner.username || owner.email}
                      >
                        <AvatarFallback className="bg-current/15 text-[9px] font-bold">
                          {initials(owner.fullName || owner.username)}
                        </AvatarFallback>
                      </Avatar>
                    )}

                    <span className="ml-auto shrink-0 rounded-md border border-current/15 bg-current/6 px-2 py-1 text-[9px] font-semibold uppercase tracking-wider opacity-90 sm:ml-0">
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