"use client";

import { useMemo, useState } from "react";
import type { CalendarItem, CalendarView, EventDraft } from "@/types/calendar.types";
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
  task:
    "border-amber-400/40 bg-amber-400/10 text-amber-200 shadow-[0_0_12px_-4px_rgba(251,191,36,0.5)]",
  reminder:
    "border-violet-400/40 bg-violet-400/10 text-violet-200 shadow-[0_0_12px_-4px_rgba(167,139,250,0.5)]",
  appointment:
    "border-teal-300/40 bg-teal-300/10 text-teal-100 shadow-[0_0_12px_-4px_rgba(94,234,212,0.5)]",
};

const HOURS = Array.from({ length: 24 }, (_, h) => h);
const HOUR_PX = 56;

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
  const openEdit = (item: CalendarItem) => setModal({ open: true, editing: item });

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
      <header className="relative z-10 flex flex-wrap items-center gap-3 border-b border-white/10 px-5 py-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCursor(startOfDay(zonedNow()))}
            className="rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-3 py-1.5 text-xs font-medium text-emerald-300 transition hover:bg-emerald-400/20"
          >
            Today
          </button>
          <button
            aria-label="Previous"
            onClick={() => step(-1)}
            className="rounded-lg border border-white/10 px-2.5 py-1.5 text-zinc-300 transition hover:bg-white/5"
          >
            ‹
          </button>
          <button
            aria-label="Next"
            onClick={() => step(1)}
            className="rounded-lg border border-white/10 px-2.5 py-1.5 text-zinc-300 transition hover:bg-white/5"
          >
            ›
          </button>
        </div>

        <h1 className="text-lg font-semibold tracking-tight text-zinc-100">
          {headline}
        </h1>
        <span className="rounded-md border border-white/10 bg-white/5 px-2 py-1 font-mono text-[10px] tabular-nums text-zinc-400">
          {CALENDAR_TZ_LABEL} · Mountain Time
        </span>

        <div className="ml-auto flex items-center gap-2">
          <div className="flex overflow-hidden rounded-lg border border-white/10">
            {(["day", "week", "month", "agenda"] as CalendarView[]).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-3 py-1.5 text-xs capitalize transition ${
                  view === v
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
            className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
              showMySchedule
                ? "border-cyan-400/40 bg-cyan-400/15 text-cyan-300"
                : "border-white/10 text-zinc-300 hover:bg-white/5"
            }`}
          >
            My Schedule
          </button>
          <button
            onClick={() => openCreate()}
            className="rounded-lg bg-emerald-400/90 px-4 py-1.5 text-xs font-semibold text-zinc-950 shadow-[0_0_20px_-6px_rgba(52,211,153,0.9)] transition hover:bg-emerald-300"
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
              Couldn’t load the calendar — {error}. Check your connection and try again.
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
          <aside className="w-80 shrink-0 overflow-auto border-l border-white/10 bg-zinc-900/60">
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
  const occ = expandOccurrences(items, gridStart, addDays(gridStart, 42));

  return (
    <div className="grid h-full grid-cols-7 grid-rows-[auto_repeat(6,minmax(0,1fr))]">
      {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
        <div
          key={d}
          className="border-b border-r border-white/5 px-2 py-1.5 text-[11px] font-medium uppercase tracking-wider text-zinc-500"
        >
          {d}
        </div>
      ))}
      {days.map((day) => {
        const today = sameDay(day, zonedNow());
        const inMonth = day.getMonth() === cursor.getMonth();
        const dayOcc = occ.filter((o) => sameDay(o.start, day)).slice(0, 4);
        const overflow =
          occ.filter((o) => sameDay(o.start, day)).length - dayOcc.length;
        return (
          <button
            key={day.toISOString()}
            onClick={() => onDayClick(day)}
            className={`flex flex-col gap-1 border-b border-r border-white/5 p-1.5 text-left align-top transition hover:bg-white/[0.03] ${
              inMonth ? "" : "opacity-40"
            }`}
          >
            <span
              className={`self-start rounded-md px-1.5 font-mono text-xs tabular-nums ${
                today
                  ? "bg-emerald-400/90 font-semibold text-zinc-950"
                  : "text-zinc-400"
              }`}
            >
              {day.getDate()}
            </span>
            {dayOcc.map((o) => (
              <span
                key={o.item.id + o.start.toISOString()}
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation();
                  onItemClick(o.item);
                }}
                className={`truncate rounded border px-1.5 py-0.5 text-[11px] ${TYPE_STYLES[o.item.type]}`}
              >
                {!o.item.allDay && (
                  <span className="mr-1 font-mono tabular-nums opacity-70">
                    {fmtTime(o.start)}
                  </span>
                )}
                {o.item.title}
              </span>
            ))}
            {overflow > 0 && (
              <span className="text-[10px] text-zinc-500">+{overflow} more</span>
            )}
          </button>
        );
      })}
    </div>
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
  const occ = expandOccurrences(items, anchor, addDays(anchor, days));

  return (
    <div className="flex min-w-[640px]">
      {/* Hour gutter */}
      <div className="w-14 shrink-0 border-r border-white/5 pt-10">
        {HOURS.map((h) => (
          <div
            key={h}
            style={{ height: HOUR_PX }}
            className="pr-2 text-right font-mono text-[10px] tabular-nums text-zinc-500"
          >
            {String(h).padStart(2, "0")}:00
          </div>
        ))}
      </div>

      {cols.map((day) => {
        const dayOcc = occ.filter((o) => sameDay(o.start, day) && !o.item.allDay);
        const allDayOcc = occ.filter(
          (o) => sameDay(o.start, day) && o.item.allDay
        );
        const today = sameDay(day, zonedNow());
        return (
          <div key={day.toISOString()} className="relative min-w-0 flex-1 border-r border-white/5">
            <div
              className={`sticky top-0 z-10 border-b border-white/10 bg-zinc-950/90 px-2 py-2 text-xs backdrop-blur ${
                today ? "text-emerald-300" : "text-zinc-400"
              }`}
            >
              {fmtDayLabel(day)}
              {allDayOcc.map((o) => (
                <span
                  key={o.item.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => onItemClick(o.item)}
                  className={`ml-2 rounded border px-1.5 py-0.5 text-[10px] ${TYPE_STYLES[o.item.type]}`}
                >
                  {o.item.title}
                </span>
              ))}
            </div>
            <div className="relative" style={{ height: HOUR_PX * 24 }}>
              {HOURS.map((h) => (
                <button
                  key={h}
                  aria-label={`Create at ${h}:00`}
                  onClick={() => {
                    const d = new Date(day);
                    d.setHours(h, 0, 0, 0);
                    onSlotClick(d);
                  }}
                  style={{ top: h * HOUR_PX, height: HOUR_PX }}
                  className="absolute inset-x-0 border-b border-white/[0.04] transition hover:bg-white/[0.03]"
                />
              ))}
              {today && <NowLine />}
              {dayOcc.map((o) => {
                const top =
                  (o.start.getHours() + o.start.getMinutes() / 60) * HOUR_PX;
                const height = Math.max(
                  22,
                  ((o.end.getTime() - o.start.getTime()) / 3_600_000) * HOUR_PX
                );
                return (
                  <button
                    key={o.item.id + o.start.toISOString()}
                    onClick={() => onItemClick(o.item)}
                    style={{ top, height }}
                    className={`absolute inset-x-1 z-[5] overflow-hidden rounded-lg border px-2 py-1 text-left text-[11px] backdrop-blur-sm transition hover:brightness-125 ${TYPE_STYLES[o.item.type]}`}
                  >
                    <span className="block truncate font-medium">
                      {o.item.title}
                    </span>
                    <span className="font-mono text-[10px] tabular-nums opacity-70">
                      {fmtTime(o.start)}–{fmtTime(o.end)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function NowLine() {
  const now = zonedNow();
  const top = (now.getHours() + now.getMinutes() / 60) * HOUR_PX;
  return (
    <div
      style={{ top }}
      className="pointer-events-none absolute inset-x-0 z-[6] h-px bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]"
    >
      <span className="absolute -left-1 -top-1 h-2 w-2 rounded-full bg-emerald-400" />
    </div>
  );
}

/* ── Agenda view ────────────────────────────────────────────────────────── */

function AgendaView({
  items,
  onItemClick,
}: {
  items: CalendarItem[];
  onItemClick: (i: CalendarItem) => void;
}) {
  const from = startOfDay(zonedNow());
  const occ = expandOccurrences(items, from, addDays(from, 60));
  const byDay = new Map<string, Occurrence[]>();
  for (const o of occ) {
    const key = startOfDay(o.start).toISOString();
    byDay.set(key, [...(byDay.get(key) ?? []), o]);
  }

  if (!byDay.size)
    return (
      <div className="p-10 text-center text-sm text-zinc-500">
        Nothing scheduled in the next 60 days. Select “Create” to add your first item.
      </div>
    );

  return (
    <div className="divide-y divide-white/5">
      {[...byDay.entries()].map(([key, dayOcc]) => (
        <section key={key} className="flex gap-4 px-5 py-4">
          <div className="w-28 shrink-0 pt-1 text-xs font-medium text-zinc-400">
            {fmtDayLabel(new Date(key))}
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            {dayOcc.map((o) => (
              <button
                key={o.item.id + o.start.toISOString()}
                onClick={() => onItemClick(o.item)}
                className={`flex items-center gap-3 rounded-lg border px-3 py-2 text-left text-sm transition hover:brightness-125 ${TYPE_STYLES[o.item.type]}`}
              >
                <span className="font-mono text-xs tabular-nums opacity-80">
                  {o.item.allDay ? "all day" : `${fmtTime(o.start)}–${fmtTime(o.end)}`}
                </span>
                <span className="truncate font-medium">{o.item.title}</span>
                <span className="ml-auto rounded bg-white/5 px-1.5 py-0.5 text-[10px] uppercase tracking-wider opacity-70">
                  {o.item.type}
                </span>
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

