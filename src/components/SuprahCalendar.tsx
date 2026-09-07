"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  CALENDAR_TYPE_OPTIONS,
  type CalendarItem,
  type CalendarView,
  type CrmUserLite,
  type EventDraft,
} from "@/types/calendar.types";
import {
  calendarTzLabel,
  addDays,
  expandOccurrences,
  fmtTime,
  fromZoned,
  sameDay,
  startOfDay,
  startOfMonth,
  startOfWeek,
  toZoned,
  zonedNow,
  type Occurrence,
} from "@/utils/calendar.utils";
import { useCalendar } from "@/hooks/useCalendar";
import { useIsMobile } from "@/hooks/use-mobile";
import { EventModal } from "@/components/EventModal";
import { MySchedule } from "@/components/MySchedule";
import { CalendarNotificationsBell } from "@/components/CalendarNotificationsBell";
import { apiClient } from "@/lib/api-client";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MultiSelectFilter } from "@/components/calendar/MultiSelectFilter";
import { SavedViewsMenu, type CalendarSavedView } from "@/components/calendar/SavedViewsMenu";
import { CalendarEmptyState } from "@/components/calendar/CalendarEmptyState";
import { MonthViewMobile } from "@/components/calendar/MonthViewMobile";
import { BulkActionBar } from "@/components/admin/BulkActionBar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  CalendarDays,
  CheckSquare,
  CircleDot,
  Download,
  Filter,
  Loader2,
  Printer,
  Search,
  Tag,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";

export function initials(name?: string) {
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
    const mapped = (Array.isArray(raw) ? raw : []).map((u: any) => ({
      _id: String(u._id ?? u.id),
      fullName: u.fullName ?? u.name,
      username: u.username,
      email: u.email,
    }));
    return Array.from(new Map(mapped.map((u) => [u._id, u])).values());
  } catch {
    return [];
  }
}

/**
 * Suprah Calendar — Day / Week / Month / Agenda views + the My Schedule
 * personal panel. Flat, solid-color event chips (one color per type,
 * consistent in light and dark) rather than tinted/bordered/glowing cards —
 * the neutral chrome around them (toolbar, filters, panels) uses the app's
 * shadcn tokens so theme support carries through unchanged.
 */

export const TYPE_STYLES: Record<string, string> = {
  event: "border-transparent bg-emerald-600 text-white",
  meeting: "border-transparent bg-cyan-600 text-white",
  task: "border-transparent bg-amber-500 text-zinc-900",
  reminder: "border-transparent bg-violet-600 text-white",
  appointment: "border-transparent bg-teal-600 text-white",
};

const TYPE_ROW_STYLES: Record<string, string> = {
  event: "border-b-border border-l-emerald-600 bg-card text-foreground hover:bg-accent",
  meeting: "border-b-border border-l-cyan-600 bg-card text-foreground hover:bg-accent",
  task: "border-b-border border-l-amber-500 bg-card text-foreground hover:bg-accent",
  reminder: "border-b-border border-l-violet-600 bg-card text-foreground hover:bg-accent",
  appointment: "border-b-border border-l-teal-600 bg-card text-foreground hover:bg-accent",
};

export const TYPE_TIME_STYLES: Record<string, string> = {
  event: "text-white/85",
  meeting: "text-white/85",
  task: "text-zinc-900/75",
  reminder: "text-white/85",
  appointment: "text-white/85",
};

const TYPE_DURATION_STYLES: Record<string, string> = {
  event: "text-white/70",
  meeting: "text-white/70",
  task: "text-zinc-900/65",
  reminder: "text-white/70",
  appointment: "text-white/70",
};

const TYPE_GROUP_STYLES: Record<string, string> = {
  event: "border border-border border-l-4 border-l-emerald-600 bg-card",
  meeting: "border border-border border-l-4 border-l-cyan-600 bg-card",
  task: "border border-border border-l-4 border-l-amber-500 bg-card",
  reminder: "border border-border border-l-4 border-l-violet-600 bg-card",
  appointment: "border border-border border-l-4 border-l-teal-600 bg-card",
  mixed: "border border-border border-l-4 border-l-muted-foreground/50 bg-card",
};

const HOURS = Array.from({ length: 24 }, (_, h) => h);
const HOUR_PX = 64;

const STATUS_FILTER_OPTIONS = [
  { value: "scheduled", label: "Scheduled" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

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
export function splitOccurrencesByDay(
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
export function formatSegmentTimeRange(start: Date, end: Date): string {
  const endsAtMidnight =
    end.getHours() === 0 &&
    end.getMinutes() === 0 &&
    end.getSeconds() === 0 &&
    !sameDay(start, end);

  return endsAtMidnight
    ? `${fmtTime(start)} – End of day`
    : `${fmtTime(start)} – ${fmtTime(end)}`;
}

export function formatDuration(start: Date, end: Date): string {
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
 * Treat genuine all-day items and long blocks anchored to a midnight
 * boundary as all-day-like for Week/Day presentation. This keeps near-full-
 * day blocks (a day-off running 12:00 AM–5:59 PM, ~18h; or 6:00 PM–End of
 * day, ~6h) out of the timed grid, where they'd otherwise render as an
 * uncapped stack that pushes the whole column tall — the compact all-day
 * lane already caps height and scrolls internally.
 *
 * The two boundary directions get independently tuned floors rather than
 * one shared number, because they can't share a single safe threshold:
 * - starts-at-midnight needs a HIGH floor (16h) so a genuine multi-hour
 *   midnight-start meeting (e.g. 12:00 AM–1:00 PM, 13h) stays in the timed
 *   grid with its precise time visible.
 * - ends-at-midnight uses a 5h floor — low enough to catch the "day off
 *   after work" pattern (e.g. 6:00 PM–End of day, ~6h) this exists for,
 *   but high enough to stay clear of a genuine multi-hour evening meeting
 *   that happens to end at midnight (e.g. an 8:00 PM–12:00 AM, 4h event).
 */
function isAllDayLikeOccurrence(occurrence: Occurrence): boolean {
  const { item } = occurrence;
  if (item.allDay) return true;

  let startsAtMidnight: boolean;
  let endsAtMidnight: boolean;
  let durationMinutes: number;

  if (item.repeatsDailyWindow && item.dailyStartTime && item.dailyEndTime) {
    // A recurring daily-window item's start/end only bound the overall
    // multi-day recurrence range (e.g. a "day off" schedule spanning a
    // whole quarter) — they carry no meaningful time-of-day. The real daily
    // window lives in dailyStartTime/dailyEndTime instead, the same fields
    // expandOccurrences() uses to place each day's occurrence. Reading
    // item.start/item.end here (as this used to) misjudges a genuine
    // "00:00–17:59 every included day" window as a normal timed event,
    // since the recurrence's overall start/end rarely lands on a midnight
    // boundary themselves — which then piles every same-day occurrence of
    // it into one giant overlapping stack in the timed grid instead of the
    // compact All Day lane.
    const [sh, sm] = item.dailyStartTime.split(":").map(Number);
    const [eh, em] = item.dailyEndTime.split(":").map(Number);
    startsAtMidnight = sh === 0 && sm === 0;
    endsAtMidnight = eh === 0 && em === 0;
    durationMinutes = eh * 60 + em - (sh * 60 + sm);
  } else {
    // Judge the FULL item's real span, not this occurrence's day-clipped
    // segment. splitOccurrencesByDay clips every segment's boundaries to
    // midnight, so a genuine single "8:00 PM–2:00 AM" overnight meeting would
    // otherwise get its day-1 segment mechanically clipped to "8:00 PM–
    // midnight" and misread as an all-day block purely because of where the
    // day boundary happened to fall — not because of anything about the real
    // event. For single-day items the item's real start/end already equal
    // the occurrence's own, so this changes nothing for them.
    const realStart = toZoned(new Date(item.start));
    const realEnd = toZoned(new Date(item.end));
    startsAtMidnight = realStart.getHours() === 0 && realStart.getMinutes() === 0;
    endsAtMidnight = realEnd.getHours() === 0 && realEnd.getMinutes() === 0;
    durationMinutes = Math.round((realEnd.getTime() - realStart.getTime()) / 60000);
  }

  if (startsAtMidnight && durationMinutes >= 16 * 60) return true;
  if (endsAtMidnight && durationMinutes >= 5 * 60) return true;
  return false;
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
  const isMobile = useIsMobile();
  const [view, setView] = useState<CalendarView>("week");
  const [cursor, setCursor] = useState<Date>(startOfDay(zonedNow()));
  const [showMySchedule, setShowMySchedule] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [modal, setModal] = useState<{
    open: boolean;
    editing?: CalendarItem;
    presetStart?: Date;
  }>({ open: false });

  // Google Calendar mobile defaults to a single-day view rather than the
  // horizontally-scrolling week grid. Applied once on first real mobile
  // detection so it doesn't fight a user's manual view choice on later
  // resizes/rotations (useIsMobile briefly reports `false` on first mount
  // before its matchMedia effect settles, so the guard triggers on the
  // first `true`, not the first render).
  const defaultViewAppliedRef = useRef(false);
  useEffect(() => {
    if (defaultViewAppliedRef.current || !isMobile) return;
    defaultViewAppliedRef.current = true;
    setView("day");
  }, [isMobile]);

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
  const [teamFilter, setTeamFilter] = useState<string[]>([]);
  const [typeFilter, setTypeFilter] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  // The input itself stays bound to `query` for zero-lag typing; filtering
  // reacts to this debounced copy instead, so a large item list isn't
  // re-filtered on every single keystroke.
  const [debouncedQuery, setDebouncedQuery] = useState("");

  useEffect(() => {
    void fetchTeamMembers().then(setTeamMembers);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 200);
    return () => clearTimeout(t);
  }, [query]);

  /** Shared by the toolbar's team filter and the bulk-reassign picker below. */
  const teamMemberOptions = useMemo(
    () =>
      teamMembers.map((m) => ({
        value: m._id,
        label: m.fullName || m.username || m.email || "Unknown",
      })),
    [teamMembers],
  );

  const applySavedView = (savedView: CalendarSavedView) => {
    setTeamFilter(savedView.teamFilter);
    setTypeFilter(savedView.typeFilter);
    setStatusFilter(savedView.statusFilter);
    setQuery(savedView.query);
  };

  // Deep-link support: clicking a calendar item from the notification bell
  // or a push notification lands here with ?event=<id> — open it directly
  // instead of leaving the user to hunt for it. Clears the param once
  // handled (found or not) so it doesn't re-trigger or linger in the URL.
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Adjusting state in response to a changed value (the URL) during render,
  // guarded by comparing against the last-consumed id — React's documented
  // pattern for this (not an effect, since it should apply before paint;
  // not a ref, since this project's stricter lint config requires render to
  // stay pure — refs may only be touched in effects/event handlers).
  const [consumedEventId, setConsumedEventId] = useState<string | null>(null);
  const deepLinkEventId = searchParams.get("event");
  if (deepLinkEventId && deepLinkEventId !== consumedEventId && !loading) {
    const match = allItems.find((i) => i.id === deepLinkEventId);
    if (match) {
      setConsumedEventId(deepLinkEventId);
      setModal({ open: true, editing: match });
    }
  }

  useEffect(() => {
    const eventId = searchParams.get("event");
    if (!eventId || loading) return;
    // allItems is scoped to the currently loaded view/date range, so a link
    // to an item outside it (e.g. a "next 24h" notification for an event
    // just past the current week) won't be found here — tell the user
    // rather than silently clearing the param with no explanation.
    if (!allItems.some((i) => i.id === eventId)) {
      toast.error("Couldn't find that item in the current view — try Agenda view or a different date range.");
    }
    const next = new URLSearchParams(searchParams.toString());
    next.delete("event");
    router.replace(next.toString() ? `${pathname}?${next.toString()}` : pathname, {
      scroll: false,
    });
  }, [searchParams, loading, allItems, router, pathname]);

  /** Combined toolbar filters: team, type, status, and a free-text title search. Each empty = no restriction. */
  const items = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    return allItems.filter((item) => {
      if (
        teamFilter.length > 0 &&
        !(
          item.assignees?.some((a) => teamFilter.includes(a._id)) ||
          (item.createdBy?._id && teamFilter.includes(item.createdBy._id))
        )
      ) {
        return false;
      }
      if (typeFilter.length > 0 && !typeFilter.includes(item.type)) return false;
      if (statusFilter.length > 0 && !statusFilter.includes(item.status)) return false;
      if (q && !item.title.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [allItems, teamFilter, typeFilter, statusFilter, debouncedQuery]);

  // Bulk actions — Agenda view only. Real calendar products (and this app's
  // own sibling bulk-select in the timeproof screenshots page) restrict
  // multi-select to list views; cramming checkboxes into the small Month/
  // Week/Day grid cells would fight the density work already done there.
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [reassignTargets, setReassignTargets] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState<
    "delete" | "completed" | "cancelled" | "reassign" | null
  >(null);
  const [bulkBusy, setBulkBusy] = useState(false);

  const toggleSelectMode = () => {
    setSelectMode((v) => !v);
    setSelectedIds(new Set());
  };

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const runBulkAction = async () => {
    if (!bulkAction || selectedIds.size === 0) return;
    setBulkBusy(true);
    try {
      const ids = Array.from(selectedIds);
      const res =
        bulkAction === "delete"
          ? await apiClient.patch("/api/calendar/events/bulk-delete", { ids })
          : bulkAction === "reassign"
            ? await apiClient.patch("/api/calendar/events/bulk-reassign", {
              ids,
              assignees: reassignTargets,
            })
            : await apiClient.patch("/api/calendar/events/bulk-status", {
              ids,
              status: bulkAction,
            });
      const { succeeded, failed } = res.data as {
        succeeded: string[];
        failed: { id: string; reason: string }[];
      };
      if (failed.length === 0) {
        toast.success(`${succeeded.length} item${succeeded.length === 1 ? "" : "s"} updated.`);
        setSelectedIds(new Set());
        setSelectMode(false);
      } else {
        toast.error(`${succeeded.length} updated, ${failed.length} failed.`);
        setSelectedIds(new Set(failed.map((f) => f.id)));
      }
    } catch {
      toast.error("Bulk action failed. Try again.");
    } finally {
      setBulkBusy(false);
      setBulkAction(null);
      setReassignTargets([]);
    }
  };

  const handleExportIcs = async () => {
    try {
      const res = await apiClient.get("/api/calendar/export.ics", {
        params: {
          from: fromZoned(rangeStart).toISOString(),
          to: fromZoned(rangeEnd).toISOString(),
        },
        responseType: "blob",
      });
      const blob = new Blob([res.data], { type: "text/calendar" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "suprah-calendar.ics";
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 0);
      toast.success("Calendar exported.");
    } catch (err) {
      console.error("Calendar export failed:", err);
      toast.error("Couldn't export the calendar.");
    }
  };

  /** Commits a drag-to-move/resize from TimeGridView. Optimistic via updateItem's own state merge; reverts visually on failure since the item's real start/end come back from the server response. */
  const handleItemDragCommit = async (id: string, start: Date, end: Date) => {
    try {
      await updateItem(id, {
        start: fromZoned(start).toISOString(),
        end: fromZoned(end).toISOString(),
      });
    } catch {
      toast.error("Couldn't reschedule the item.");
    }
  };

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
    // No toast.error here: on failure this rethrows into EventModal's own
    // catch, which already shows an inline error inside the still-open
    // modal — a toast on top would just repeat the same failure twice.
    if (draft.id) await updateItem(draft.id, draft);
    else await createItem(draft);
    setModal({ open: false });
    toast.success(draft.id ? "Updated." : "Created.");
  };

  /** Drives the mobile Filters sheet's trigger badge. Search stays visible
   *  inline on mobile (not counted here) since it's never hidden behind it. */
  const activeFilterCount =
    teamFilter.length + typeFilter.length + statusFilter.length;

  return (
    <div className="suprah-calendar-print relative flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-border bg-card text-foreground print:h-auto print:overflow-visible print:rounded-none print:border-0 print:shadow-none">
      {/* Toolbar */}
      <header className="relative z-10 flex flex-wrap items-center gap-2 border-b border-border bg-card/95 px-3 py-3 sm:gap-3 sm:px-5 print:hidden">
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
            {calendarTzLabel()} · Mountain Time
          </span>
        </div>

        <div className="ml-auto flex h-9 shrink-0 flex-wrap items-center gap-2">
          {/* View switcher: segmented tabs everywhere — compact below sm, full-width labels from sm up */}
          <div
            role="tablist"
            aria-label="Calendar view"
            className="flex h-9 items-center overflow-hidden rounded-lg border border-border bg-background sm:hidden"
          >
            {(["day", "week", "month", "agenda"] as CalendarView[]).map((v) => (
              <button
                key={v}
                role="tab"
                aria-selected={view === v}
                onClick={() => setView(v)}
                className={`flex h-full items-center px-2.5 text-xs capitalize leading-none transition ${view === v
                  ? "bg-emerald-500/15 font-semibold text-emerald-700 dark:text-emerald-200"
                  : "text-muted-foreground hover:bg-accent"
                  }`}
              >
                {v}
              </button>
            ))}
          </div>
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

          {view === "agenda" && (
            <button
              onClick={toggleSelectMode}
              className={`hidden h-9 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium leading-none transition sm:flex ${selectMode
                ? "border-emerald-600/35 bg-emerald-500/10 font-semibold text-emerald-700 dark:text-emerald-200"
                : "border-border text-foreground hover:bg-accent"
                }`}
            >
              <CheckSquare className="h-3.5 w-3.5" />
              Select
            </button>
          )}

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
            onClick={handleExportIcs}
            title="Export visible range as .ics"
            aria-label="Export visible range as .ics"
            className="hidden h-9 w-9 items-center justify-center rounded-lg border border-border bg-background text-foreground transition hover:bg-accent sm:flex"
          >
            <Download className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => window.print()}
            title="Print"
            aria-label="Print"
            className="hidden h-9 w-9 items-center justify-center rounded-lg border border-border bg-background text-foreground transition hover:bg-accent sm:flex"
          >
            <Printer className="h-3.5 w-3.5" />
          </button>

          <button
            onClick={() => openCreate()}
            className="flex h-9 items-center rounded-lg bg-emerald-600 px-4 text-xs font-semibold leading-none text-white transition hover:bg-emerald-500"
          >
            + Create
          </button>
        </div>
      </header>

      {/* Filters — shared by every view (Month/Week/Day/Agenda all read from
          the same filtered `items`), so filtering isn't agenda-only. Search
          stays inline at every width; the team/type/status/saved-view
          dropdowns move into a bottom sheet on mobile instead of wrapping
          into a cramped multi-row toolbar. */}
      {isMobile ? (
        <div className="relative z-10 flex items-center gap-2 border-b border-border bg-card/70 px-3 py-2 print:hidden">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search titles…"
              className="h-9 w-full rounded-lg border border-border bg-background pl-8 pr-7 text-xs text-foreground outline-none transition focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground transition hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => setFiltersOpen(true)}
            className="flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-border bg-background px-3 text-xs font-medium text-foreground transition hover:bg-accent"
          >
            <Filter className="h-3.5 w-3.5" />
            Filters
            {activeFilterCount > 0 && (
              <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-500 px-1 text-[9px] font-bold leading-none text-white">
                {activeFilterCount}
              </span>
            )}
          </button>

          <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
            <SheetContent
              side="bottom"
              className="flex max-h-[80dvh] flex-col gap-0 rounded-t-2xl border-border p-0 pb-[max(env(safe-area-inset-bottom),1rem)]"
            >
              <SheetHeader className="shrink-0 border-b border-border px-4 py-3 text-left">
                <SheetTitle className="text-base font-semibold">Filters</SheetTitle>
                <SheetDescription className="sr-only">
                  Filter the calendar by team, type, status, or apply a saved view.
                </SheetDescription>
              </SheetHeader>
              <div className="flex min-h-0 flex-1 flex-col items-start gap-2 overflow-y-auto p-4">
                <MultiSelectFilter
                  filterLabel="Team"
                  icon={Users}
                  allLabel="Everyone"
                  options={teamMemberOptions}
                  value={teamFilter}
                  onChange={setTeamFilter}
                  searchPlaceholder="Search teammates…"
                  emptyLabel="No teammates found."
                />
                <MultiSelectFilter
                  filterLabel="Type"
                  icon={Tag}
                  allLabel="All types"
                  options={CALENDAR_TYPE_OPTIONS}
                  value={typeFilter}
                  onChange={setTypeFilter}
                  searchable={false}
                  emptyLabel="No types."
                />
                <MultiSelectFilter
                  filterLabel="Status"
                  icon={CircleDot}
                  allLabel="All statuses"
                  options={STATUS_FILTER_OPTIONS}
                  value={statusFilter}
                  onChange={setStatusFilter}
                  searchable={false}
                  emptyLabel="No statuses."
                />
                <SavedViewsMenu
                  current={{ teamFilter, typeFilter, statusFilter, query }}
                  onApply={applySavedView}
                />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      ) : (
        <div className="relative z-10 flex flex-wrap items-center gap-2 border-b border-border bg-card/70 px-3 py-2 sm:px-5 print:hidden">
          <div className="relative min-w-0 flex-1 sm:max-w-64">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search titles…"
              className="h-9 w-full rounded-lg border border-border bg-background pl-8 pr-7 text-xs text-foreground outline-none transition focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground transition hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <MultiSelectFilter
            filterLabel="Team"
            icon={Users}
            allLabel="Everyone"
            options={teamMemberOptions}
            value={teamFilter}
            onChange={setTeamFilter}
            searchPlaceholder="Search teammates…"
            emptyLabel="No teammates found."
          />
          <MultiSelectFilter
            filterLabel="Type"
            icon={Tag}
            allLabel="All types"
            options={CALENDAR_TYPE_OPTIONS}
            value={typeFilter}
            onChange={setTypeFilter}
            searchable={false}
            emptyLabel="No types."
          />
          <MultiSelectFilter
            filterLabel="Status"
            icon={CircleDot}
            allLabel="All statuses"
            options={STATUS_FILTER_OPTIONS}
            value={statusFilter}
            onChange={setStatusFilter}
            searchable={false}
            emptyLabel="No statuses."
          />

          <SavedViewsMenu
            current={{ teamFilter, typeFilter, statusFilter, query }}
            onApply={applySavedView}
          />
        </div>
      )}

      {/* Body */}
      <div className="relative z-10 flex min-h-0 flex-1 print:h-auto print:flex-none">
        <div className="min-h-0 flex-1 overflow-auto print:h-auto print:overflow-visible">
          {error && (
            <p className="p-6 text-sm font-medium text-rose-700 dark:text-rose-300">
              Couldn’t load the calendar — {error}. Check your connection and
              try again.
            </p>
          )}
          {view === "month" && (
            isMobile ? (
              <MonthViewMobile
                cursor={cursor}
                items={items}
                onDayClick={(d) => openCreate(d)}
                onItemClick={openEdit}
              />
            ) : (
              <MonthView
                cursor={cursor}
                items={items}
                onDayClick={(d) => openCreate(d)}
                onItemClick={openEdit}
              />
            )
          )}
          {(view === "week" || view === "day") && (
            <TimeGridView
              days={view === "week" ? 7 : 1}
              anchor={view === "week" ? startOfWeek(cursor) : cursor}
              items={items}
              onSlotClick={(d) => openCreate(d)}
              onItemClick={openEdit}
              onItemDragCommit={handleItemDragCommit}
            />
          )}
          {view === "agenda" && (
            <>
              {selectMode && selectedIds.size > 0 && (
                <div className="sticky top-0 z-20 border-b border-border bg-background/95 px-3 py-2 backdrop-blur sm:px-5">
                  <BulkActionBar
                    count={selectedIds.size}
                    onClear={() => setSelectedIds(new Set())}
                  >
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      onClick={() => setBulkAction("completed")}
                    >
                      Mark completed
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      onClick={() => setBulkAction("cancelled")}
                    >
                      Mark cancelled
                    </Button>
                    <div className="flex items-center gap-1.5">
                      <MultiSelectFilter
                        filterLabel="Reassign to"
                        icon={Users}
                        allLabel="Reassign to…"
                        options={teamMemberOptions}
                        value={reassignTargets}
                        onChange={setReassignTargets}
                        searchPlaceholder="Search teammates…"
                        emptyLabel="No teammates found."
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        disabled={reassignTargets.length === 0}
                        onClick={() => setBulkAction("reassign")}
                      >
                        Apply
                      </Button>
                    </div>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="h-7 text-xs"
                      onClick={() => setBulkAction("delete")}
                    >
                      Delete
                    </Button>
                  </BulkActionBar>
                </div>
              )}
              <AgendaView
                items={items}
                onItemClick={openEdit}
                selectMode={selectMode}
                selectedIds={selectedIds}
                onToggleSelected={toggleSelected}
              />
            </>
          )}
          {loading && (
            <div className="flex items-center justify-center gap-2 p-4 text-xs font-medium text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-600" />
              Syncing…
            </div>
          )}
        </div>

        {showMySchedule && (
          <aside className="fixed inset-0 z-40 overflow-y-auto bg-background shadow-2xl md:static md:z-auto md:w-90 md:shrink-0 md:border-l md:border-border md:bg-card/98 md:shadow-[-12px_0_30px_-24px_rgba(0,0,0,0.18)] print:hidden">
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
                try {
                  await deleteItem(modal.editing!.id);
                  setModal({ open: false });
                  toast.success("Deleted.");
                } catch {
                  toast.error("Couldn't delete the item.");
                }
              }
              : undefined
          }
        />
      )}

      <AlertDialog open={bulkAction !== null} onOpenChange={(open) => !open && setBulkAction(null)}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {bulkAction === "delete"
                ? `Delete ${selectedIds.size} item${selectedIds.size === 1 ? "" : "s"}?`
                : bulkAction === "reassign"
                  ? `Reassign ${selectedIds.size} item${selectedIds.size === 1 ? "" : "s"}?`
                  : `Mark ${selectedIds.size} item${selectedIds.size === 1 ? "" : "s"} as ${bulkAction}?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {bulkAction === "delete"
                ? "This can't be undone from here."
                : bulkAction === "reassign"
                  ? "This replaces the current assignees on every selected item."
                  : "This updates the status on every selected item."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkBusy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={bulkBusy}
              onClick={(e) => {
                e.preventDefault();
                void runBulkAction();
              }}
              className={
                bulkAction === "delete"
                  ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  : undefined
              }
            >
              {bulkBusy ? "Working…" : "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
                    ? "bg-emerald-500 font-semibold text-white dark:bg-emerald-600"
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
                      className={`flex min-h-12 w-full shrink-0 flex-col items-center justify-center rounded-lg border px-2.5 py-1.5 text-center transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current/50 ${TYPE_STYLES[item.type]}`}
                    >
                      <span className="block w-full whitespace-normal break-words text-[12px] font-bold leading-snug">
                        {item.title}
                      </span>

                      <span className={`mt-1 block w-full font-mono text-[10.5px] font-semibold leading-tight tabular-nums ${TYPE_TIME_STYLES[item.type]}`}>
                        {timeLabel}
                      </span>

                      {durationLabel && (
                        <span className={`mt-0.5 block text-[10px] font-semibold leading-tight ${TYPE_DURATION_STYLES[item.type]}`}>
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

const DRAG_SNAP_MINUTES = 15;
const DRAG_THRESHOLD_PX = 6;

function TimeGridView({
  days,
  anchor,
  items,
  onSlotClick,
  onItemClick,
  onItemDragCommit,
}: {
  days: number;
  anchor: Date;
  items: CalendarItem[];
  onSlotClick: (d: Date) => void;
  onItemClick: (i: CalendarItem) => void;
  onItemDragCommit?: (id: string, start: Date, end: Date) => void;
}) {
  // Live preview state during a move/resize drag — the actual commit only
  // happens on pointerup, via onItemDragCommit. onMove/onUp below are plain
  // closures scoped to one gesture (mirroring useDraggableWidget.ts), so
  // add/removeEventListener always reference the same instances regardless
  // of how many re-renders happen mid-drag from the setDrag calls here.
  const [drag, setDrag] = useState<{
    itemId: string;
    mode: "move" | "resize";
    deltaMinutes: number;
  } | null>(null);
  // Set right before the synthetic click that follows a real drag's pointerup,
  // and consumed by onClickCapture below — `drag` state is already cleared by
  // then, so it can't tell "just finished dragging" from "never dragged".
  const justDraggedRef = useRef(false);

  const beginDrag = (
    e: React.PointerEvent,
    mode: "move" | "resize",
    item: CalendarItem,
    originalStart: Date,
    originalEnd: Date,
  ) => {
    if (item.canEdit === false) return;
    e.stopPropagation();
    e.preventDefault();

    const gesture = { moved: false, deltaMinutes: 0 };
    const startClientY = e.clientY;

    const onMove = (ev: PointerEvent) => {
      const deltaY = ev.clientY - startClientY;
      if (!gesture.moved && Math.abs(deltaY) < DRAG_THRESHOLD_PX) return;
      gesture.moved = true;
      const rawMinutes = (deltaY / HOUR_PX) * 60;
      gesture.deltaMinutes = Math.round(rawMinutes / DRAG_SNAP_MINUTES) * DRAG_SNAP_MINUTES;
      setDrag({ itemId: item.id, mode, deltaMinutes: gesture.deltaMinutes });
    };

    const cleanup = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", cleanup);
      setDrag(null);
    };

    const onUp = () => {
      cleanup();
      if (!gesture.moved || gesture.deltaMinutes === 0) return;
      justDraggedRef.current = true;
      if (mode === "move") {
        const newStart = new Date(originalStart.getTime() + gesture.deltaMinutes * 60000);
        const newEnd = new Date(originalEnd.getTime() + gesture.deltaMinutes * 60000);
        onItemDragCommit?.(item.id, newStart, newEnd);
      } else {
        const minEnd = new Date(originalStart.getTime() + DRAG_SNAP_MINUTES * 60000);
        const rawNewEnd = new Date(originalEnd.getTime() + gesture.deltaMinutes * 60000);
        onItemDragCommit?.(item.id, originalStart, rawNewEnd < minEnd ? minEnd : rawNewEnd);
      }
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", cleanup);
  };

  const cols = Array.from({ length: days }, (_, i) => addDays(anchor, i));
  // Memoized so a drag's frequent setDrag() re-renders (one per pointermove
  // tick, per the live-preview logic above) don't re-split/re-group every
  // occurrence across all visible days each time — only recomputes when the
  // actual data or visible range changes, not on every drag-preview frame.
  // anchor is a prop recomputed fresh on every parent render (startOfWeek(
  // cursor) allocates a new Date even when cursor's value is unchanged), so
  // this keys on its primitive time value rather than object identity.
  const occ = useMemo(() => {
    const rangeEnd = addDays(anchor, days);
    return splitOccurrencesByDay(
      expandOccurrences(items, anchor, rangeEnd),
      anchor,
      rangeEnd,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, anchor.getTime(), days]);

  const allDayOcc = useMemo(() => occ.filter(isAllDayLikeOccurrence), [occ]);
  const isEmpty = occ.length === 0;
  const headerHeight = 64;
  // Only the hour-label column narrows on mobile — HOUR_PX (row height) stays
  // fixed everywhere since drag/resize math, NowLine position, and every
  // occurrence's top/bottom are all computed from that one constant.
  const isMobile = useIsMobile();
  const hourColPx = isMobile ? 56 : 80;
  // Each day column needs a real floor, not just a flat total-width fallback —
  // minmax(0, 1fr) let columns get squeezed down to ~40-70px on narrow/7-day
  // views, which isn't enough room for a mono "12:00 AM" time label (~50px)
  // plus its padding, so both the title and time truncated mid-word. Giving
  // every column its own minimum lets the grid overflow past the container's
  // width on its own, and the existing overflow-x-auto wrapper picks that up
  // and scrolls — no separate total-width class needed, and it scales
  // correctly whether this is a 1-day, 3-day, or 7-day view.
  const dayColMinPx = isMobile ? 116 : 140;
  const gridTemplateColumns = `${hourColPx}px repeat(${days}, minmax(${dayColMinPx}px, 1fr))`;

  return (
    <div className="overflow-x-auto print:overflow-visible">
    <div className="time-grid-inner relative bg-background text-foreground">
      <style jsx global>{`
        .time-grid-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: rgba(161, 161, 170, 0.5) transparent;
        }
        .time-grid-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .time-grid-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .time-grid-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(161, 161, 170, 0.5);
          border-radius: 9999px;
        }
      `}</style>

      {isEmpty && (
        <div className="pointer-events-none sticky left-0 z-20 flex h-0 w-full items-start justify-center">
          <div className="mt-24">
            <CalendarEmptyState
              icon={CalendarDays}
              title={days === 1 ? "Nothing scheduled today" : "Nothing scheduled this week"}
              subtitle="Select any time slot on the grid to add an event, or use a quick shortcut below."
              actions={
                <>
                  <button
                    onClick={() => onSlotClick(quickSlot(9))}
                    className="rounded-lg border border-emerald-600/35 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-500/15 dark:border-emerald-400/40 dark:bg-emerald-400/10 dark:text-emerald-200"
                  >
                    + 9:00 AM today
                  </button>
                  <button
                    onClick={() => onSlotClick(quickSlot(14))}
                    className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground transition hover:bg-accent"
                  >
                    + 2:00 PM today
                  </button>
                </>
              }
            />
          </div>
        </div>
      )}

      {/* Sticky day header */}
      <div
        className="sticky top-0 z-30 grid border-b border-border bg-card/95 shadow-sm backdrop-blur-xl"
        style={{
          gridTemplateColumns,
          minHeight: headerHeight,
        }}
      >
        <div className="flex items-center justify-center border-r border-border px-2">
          <span className="inline-flex h-5 items-center justify-center rounded border border-emerald-600/25 bg-emerald-500/10 px-2 text-[9px] font-bold uppercase leading-none tracking-[0.14em] text-emerald-700 dark:text-emerald-200">
            {calendarTzLabel()}
          </span>
        </div>

        {cols.map((day) => {
          const today = sameDay(day, zonedNow());
          return (
            <div
              key={`header-${day.toISOString()}`}
              className={`min-w-0 border-r border-border px-2 py-1.5 text-center ${
                today
                  ? "bg-emerald-500/8 dark:bg-emerald-500/12"
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
                  className={`mt-1 inline-flex h-7 min-w-7 items-center justify-center rounded-full px-2 font-mono text-xs font-bold tabular-nums sm:h-8 sm:min-w-8 sm:text-sm ${
                    today
                      ? "bg-emerald-600 text-white"
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
            gridTemplateColumns,
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
                className="time-grid-scrollbar min-h-16 max-h-64 overflow-y-auto border-r border-border p-1.5"
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
                        className={`w-full rounded-lg border px-2.5 py-2 text-left transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 ${TYPE_STYLES[o.item.type]}`}
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
          gridTemplateColumns,
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
                className={`absolute right-1.5 rounded bg-muted/40 px-1 font-mono text-[9px] font-semibold tabular-nums text-muted-foreground sm:right-3 sm:px-1.5 sm:text-[10.5px] ${
                  h === 0 ? "top-1.5" : "-top-2.5"
                }`}
              >
                {new Date(2000, 0, 1, h).toLocaleTimeString([], {
                  hour: "numeric",
                  minute: isMobile ? undefined : "2-digit",
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
                  ? "bg-emerald-500/6 dark:bg-emerald-500/10"
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
                    onClickCapture={(e) => {
                      // A drag that releases over empty space (rather than
                      // back over the dragged item's own, snap-repositioned
                      // box) would otherwise let this slot's click through
                      // and spuriously open "create event" right after a
                      // reschedule — same guard as the occurrence buttons.
                      if (justDraggedRef.current) {
                        justDraggedRef.current = false;
                        e.preventDefault();
                        e.stopPropagation();
                      }
                    }}
                    style={{ top: h * HOUR_PX, height: HOUR_PX }}
                    className={`group absolute inset-x-0 border-b border-border/90 transition hover:bg-emerald-500/6 dark:hover:bg-emerald-500/10 focus-visible:z-10 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-emerald-500/50 ${
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

                    // Drag-to-move/resize is scoped to single, non-repeating,
                    // single-day occurrences. Repeating items have the same
                    // "which day is this segment" ambiguity noted below; a
                    // multi-day (non-repeating) item's occurrence here is
                    // clipped to this one day by splitOccurrencesByDay, so
                    // dragging it would commit the clipped segment as the
                    // item's new start/end and silently truncate the rest of
                    // its real span — isFullSpan guards against that.
                    const itemRealStart = toZoned(new Date(o.item.start));
                    const itemRealEnd = toZoned(new Date(o.item.end));
                    const isFullSpan =
                      o.start.getTime() === itemRealStart.getTime() &&
                      o.end.getTime() === itemRealEnd.getTime();
                    const canDrag =
                      o.item.canEdit !== false && !o.item.repeatsDailyWindow && isFullSpan;
                    const isDraggingThis = drag?.itemId === o.item.id;
                    const dragDeltaPx = isDraggingThis
                      ? (drag!.deltaMinutes / 60) * HOUR_PX
                      : 0;
                    const previewTop =
                      isDraggingThis && drag!.mode === "move" ? top + dragDeltaPx : top;
                    const previewBottom = isDraggingThis ? bottom - dragDeltaPx : bottom;

                    return (
                      <button
                        key={`${o.item.id}-${o.start.toISOString()}`}
                        type="button"
                        onClick={() => onItemClick(o.item)}
                        onClickCapture={(e) => {
                          if (justDraggedRef.current) {
                            justDraggedRef.current = false;
                            e.preventDefault();
                            e.stopPropagation();
                          }
                        }}
                        onPointerDown={
                          canDrag ? (e) => beginDrag(e, "move", o.item, o.start, o.end) : undefined
                        }
                        style={{
                          top: previewTop,
                          bottom: previewBottom,
                          height: "auto",
                          minHeight: renderedHeight < 20 ? 18 : 0,
                          boxSizing: "border-box",
                          touchAction: canDrag ? "none" : undefined,
                        }}
                        title={`${o.item.title} — ${timeLabel} (${durationLabel})`}
                        aria-label={`${o.item.title}, ${timeLabel}, ${durationLabel}`}
                        className={`group absolute inset-x-1.5 z-5 flex overflow-hidden rounded-lg border px-2.5 py-2 text-left transition duration-150 hover:z-10 hover:brightness-110 focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/70 ${TYPE_STYLES[o.item.type]} ${canDrag ? "cursor-grab active:cursor-grabbing" : ""} ${isDraggingThis ? "opacity-90" : ""}`}
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

                        {canDrag && renderedHeight >= 30 && (
                          <div
                            onPointerDown={(e) => beginDrag(e, "resize", o.item, o.start, o.end)}
                            title="Drag to resize"
                            aria-hidden="true"
                            style={{ touchAction: "none" }}
                            className="absolute inset-x-0 bottom-0 h-2 cursor-ns-resize opacity-0 transition-opacity group-hover:opacity-100 hover:opacity-100"
                          >
                            <span className="absolute inset-x-0 bottom-0.5 mx-auto block h-0.5 w-6 rounded-full bg-current/50" />
                          </div>
                        )}
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
                      className={`absolute inset-x-1.5 z-6 overflow-hidden rounded-lg ${TYPE_GROUP_STYLES[groupType ?? "mixed"] ?? TYPE_GROUP_STYLES.mixed}`}
                    >
                      {/* No overscroll-contain: this box sits inside the page's own
                          scroll area, so once its internal scroll bottoms out, wheel
                          input should keep flowing to the page — containing it here
                          traps the user's scroll gesture whenever the cursor happens
                          to be over a dense cluster (e.g. many "On Day Off" entries). */}
                      <div className="time-grid-scrollbar flex h-full flex-col overflow-y-auto">
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

                              <span className="mt-1 block truncate font-mono text-[10.5px] font-semibold leading-tight tabular-nums text-muted-foreground">

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
      className="pointer-events-none absolute inset-x-0 z-8 h-px bg-red-500 dark:bg-red-400"
    >
      <span className="absolute -left-1.5 -top-1.25 h-2.5 w-2.5 rounded-full border-2 border-background bg-red-500 dark:bg-red-400" />

      {showLabel && (
        <span className="absolute left-2 top-1 rounded-md border border-red-500/30 bg-background/95 px-1.5 py-0.5 font-mono text-[9px] font-bold tabular-nums text-red-600 dark:border-red-400/30 dark:text-red-300">
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
  selectMode = false,
  selectedIds,
  onToggleSelected,
}: {
  items: CalendarItem[];
  onItemClick: (item: CalendarItem) => void;
  selectMode?: boolean;
  selectedIds?: Set<string>;
  onToggleSelected?: (id: string) => void;
}) {
  const from = startOfDay(zonedNow());
  const rangeEnd = addDays(from, 60);

  // `items` already reflects the toolbar's team/type/status/search filters —
  // AgendaView doesn't filter on its own, so results stay consistent with
  // whatever Month/Week/Day are also showing.
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
        <CalendarEmptyState
          icon={CalendarDays}
          title={items.length === 0 ? "Nothing scheduled" : "No matches"}
          subtitle={
            items.length === 0
              ? "No calendar items are scheduled in the next 60 days."
              : "Nothing in the next 60 days matches the current filters."
          }
        />
      </div>
    );
  }

  return (
    <div className="w-full bg-background">
      <div className="divide-y divide-border">
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

                const selected = selectedIds?.has(item.id) ?? false;

                return (
                  <button
                    key={`${item.id}-${start.toISOString()}`}
                    type="button"
                    onClick={() =>
                      selectMode ? onToggleSelected?.(item.id) : onItemClick(item)
                    }
                    title={`${item.title} — ${timeLabel}`}
                    className={`group flex min-h-13 w-full min-w-0 flex-nowrap items-center gap-2 rounded-lg border px-3 py-2.5 text-left transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60 sm:px-4 ${TYPE_STYLES[item.type]} ${selected ? "ring-2 ring-emerald-500/70" : ""}`}
                  >
                    {selectMode && (
                      <Checkbox
                        checked={selected}
                        onCheckedChange={() => onToggleSelected?.(item.id)}
                        onClick={(e) => e.stopPropagation()}
                        aria-label={selected ? `Deselect ${item.title}` : `Select ${item.title}`}
                        className="shrink-0 border-current/40 data-[state=checked]:border-emerald-500 data-[state=checked]:bg-emerald-500 dark:data-[state=checked]:border-emerald-600 dark:data-[state=checked]:bg-emerald-600"
                      />
                    )}
                    <div className="shrink-0 border-r border-current/15 pr-3 sm:w-37.5 sm:pr-4">
                      <span className={`block whitespace-nowrap font-mono text-[10.5px] font-semibold tabular-nums ${TYPE_TIME_STYLES[item.type]}`}>
                        {timeLabel}
                      </span>
                      {!item.allDay && (
                        <span className="mt-0.5 hidden text-[10px] font-semibold uppercase tracking-wide opacity-75 sm:block">
                          {calendarTzLabel(start)} · Mountain Time
                        </span>
                      )}
                    </div>

                    <div className="min-w-0 flex-1 px-1 sm:px-4">
                      <span
                        className="block w-full whitespace-normal break-words text-[12px] font-bold leading-snug"
                        style={{
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                        }}
                      >
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
    </div>
  );
}