"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle, Check, ChevronDown, Copy, Loader2 } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import {
  CALENDAR_TYPE_OPTIONS,
  type CalendarItem,
  type CalendarItemType,
  type MySchedulePayload,
} from "@/types/calendar.types";
import { fmtDayLabel, fmtTime, itemDisplayStart } from "@/utils/calendar.utils";
import { useCalendarNotifications } from "@/context/CalendarNotificationContext";
import { CalendarEmptyState } from "@/components/calendar/CalendarEmptyState";
import { TYPE_STYLES } from "@/components/SuprahCalendar";

/**
 * My Schedule — personal dashboard of everything the signed-in user
 * created or is assigned to: upcoming activities, pending tasks, meetings.
 * Fed by GET /api/calendar/my-schedule.
 */
export function MySchedule({
  onItemClick,
}: {
  onItemClick: (item: CalendarItem) => void;
}) {
  const [data, setData] = useState<MySchedulePayload | null>(null);
  const [error, setError] = useState(false);
  const [typeFilter, setTypeFilter] = useState<Set<CalendarItemType>>(new Set());
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  // Reuse the socket the layout already established (CalendarNotificationsGate)
  // instead of opening/deriving a second one on every mount of this panel.
  const { socket } = useCalendarNotifications();

  const mountedRef = useRef(true);
  const requestIdRef = useRef(0);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const refetch = useCallback(() => {
    const id = ++requestIdRef.current;
    return apiClient
      .get<MySchedulePayload>("/api/calendar/my-schedule")
      .then((res) => {
        // Only apply this response if it's still the latest in-flight
        // request and the panel hasn't unmounted — guards against both a
        // slower earlier request overwriting a newer one, and setting state
        // after the panel closes.
        if (mountedRef.current && id === requestIdRef.current) {
          setData(res.data);
          setError(false);
        }
      })
      .catch(() => {
        if (mountedRef.current && id === requestIdRef.current) setError(true);
      });
  }, []);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  /**
   * Keep the panel live while it's open — it previously only fetched once
   * on mount. Also resyncs on socket "connect" (including reconnects after
   * a dropped connection, routine on mobile) so a phone sleeping or
   * switching networks while this panel is open doesn't leave it silently
   * stale with no way to tell anything was missed.
   */
  useEffect(() => {
    if (!socket) return;
    const onChange = () => void refetch();
    socket.on("connect", onChange);
    socket.on("calendar:created", onChange);
    socket.on("calendar:updated", onChange);
    socket.on("calendar:deleted", onChange);
    return () => {
      socket.off("connect", onChange);
      socket.off("calendar:created", onChange);
      socket.off("calendar:updated", onChange);
      socket.off("calendar:deleted", onChange);
    };
  }, [socket, refetch]);

  const toggleType = (t: CalendarItemType) => {
    setTypeFilter((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });
  };

  const toggleCollapsed = (title: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(title)) next.delete(title);
      else next.add(title);
      return next;
    });
  };

  const applyFilter = (items: CalendarItem[]) =>
    typeFilter.size === 0 ? items : items.filter((i) => typeFilter.has(i.type));

  if (error)
    return (
      <div className="p-4">
        <CalendarEmptyState
          icon={AlertCircle}
          title="Couldn't load your schedule"
          subtitle="Something went wrong fetching it. Refresh to try again."
        />
      </div>
    );
  if (!data)
    return (
      <div className="flex items-center justify-center gap-2 p-8 text-xs font-medium text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-600" />
        Loading schedule…
      </div>
    );

  const typesPresent = new Set(
    [...data.upcoming, ...data.pendingTasks, ...data.meetings].map((i) => i.type),
  );

  return (
    <div className="flex flex-col gap-6 p-5">
      <header>
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">My Schedule</h2>
        <p className="mt-1 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
          Everything you created or were assigned to — next 30 days.
        </p>
      </header>

      {(typesPresent.size > 1 || typeFilter.size > 0) && (
        <div className="-mt-2 flex flex-wrap gap-1.5">
          {CALENDAR_TYPE_OPTIONS.filter((o) => typesPresent.has(o.value)).map((o) => {
            const active = typeFilter.has(o.value);
            return (
              <button
                key={o.value}
                type="button"
                onClick={() => toggleType(o.value)}
                className={`min-h-8 rounded-full border px-3 py-1.5 text-[11px] font-semibold transition ${active
                  ? TYPE_STYLES[o.value]
                  : "border-border text-muted-foreground hover:bg-accent"
                  }`}
              >
                {o.label}
              </button>
            );
          })}
          {typeFilter.size > 0 && (
            <button
              type="button"
              onClick={() => setTypeFilter(new Set())}
              className="rounded-full px-2.5 py-1 text-[10.5px] font-semibold text-muted-foreground underline-offset-2 hover:underline"
            >
              Clear
            </button>
          )}
        </div>
      )}

      <Section
        title="Upcoming"
        accent="text-emerald-600 dark:text-emerald-300"
        items={applyFilter(data.upcoming)}
        empty="No upcoming activities."
        onItemClick={onItemClick}
        collapsed={collapsed.has("Upcoming")}
        onToggleCollapsed={() => toggleCollapsed("Upcoming")}
      />
      <Section
        title="Pending tasks"
        accent="text-amber-600 dark:text-amber-300"
        items={applyFilter(data.pendingTasks)}
        empty="No pending tasks — clear runway."
        onItemClick={onItemClick}
        collapsed={collapsed.has("Pending tasks")}
        onToggleCollapsed={() => toggleCollapsed("Pending tasks")}
      />
      <Section
        title="Meetings"
        accent="text-cyan-600 dark:text-cyan-300"
        items={applyFilter(data.meetings)}
        empty="No meetings scheduled."
        onItemClick={onItemClick}
        showJoin
        collapsed={collapsed.has("Meetings")}
        onToggleCollapsed={() => toggleCollapsed("Meetings")}
      />
    </div>
  );
}

function Section({
  title,
  accent,
  items,
  empty,
  onItemClick,
  showJoin,
  collapsed,
  onToggleCollapsed,
}: {
  title: string;
  accent: string;
  items: CalendarItem[];
  empty: string;
  onItemClick: (item: CalendarItem) => void;
  showJoin?: boolean;
  collapsed: boolean;
  onToggleCollapsed: () => void;
}) {
  return (
    <section>
      <button
        type="button"
        onClick={onToggleCollapsed}
        className="mb-2.5 flex w-full items-center gap-1.5 text-left"
      >
        <ChevronDown
          className={`h-3 w-3 shrink-0 text-muted-foreground transition-transform ${collapsed ? "-rotate-90" : ""}`}
        />
        <h3 className={`text-xs font-semibold uppercase tracking-[0.08em] ${accent}`}>
          {title}
        </h3>
        <span className="font-mono text-[11px] tabular-nums text-zinc-600 dark:text-zinc-400">
          {items.length}
        </span>
      </button>
      {!collapsed &&
        (items.length === 0 ? (
          <p className="pl-4.5 text-[13px] leading-5 text-zinc-600 dark:text-zinc-400">{empty}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {items.map((item) => {
              const s = itemDisplayStart(item);
              return (
                <li key={item.id}>
                  <button
                    onClick={() => onItemClick(item)}
                    title={item.title}
                    className="group flex w-full flex-col gap-1 rounded-lg border border-zinc-200 bg-zinc-50/80 px-3.5 py-2.5 text-left transition hover:border-zinc-300 hover:bg-zinc-100 dark:border-white/8 dark:bg-white/[0.03] dark:hover:border-white/15 dark:hover:bg-white/[0.06]"
                  >
                    <span
                      className="block w-full whitespace-normal break-words text-sm font-medium leading-5 text-zinc-800 dark:text-zinc-100"
                      style={{
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                    >
                      {item.title}
                    </span>
                    <span className="font-mono text-xs leading-4 tabular-nums text-zinc-600 dark:text-zinc-400">
                      {fmtDayLabel(s)}
                      {!item.allDay && ` · ${fmtTime(s)}`}
                    </span>
                    {showJoin && item.meetingLink && (
                      <div className="mt-1.5 flex items-center gap-1.5">
                        <a
                          href={item.meetingLink}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="flex min-h-9 items-center self-start rounded-md border border-cyan-500/35 bg-cyan-500/10 px-3 text-xs font-medium text-cyan-700 transition hover:bg-cyan-500/15 dark:border-cyan-400/40 dark:bg-cyan-400/10 dark:text-cyan-300 dark:hover:bg-cyan-400/20"
                        >
                          Join Supra-Space
                        </a>
                        <CopyLinkButton link={item.meetingLink} />
                      </div>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        ))}
    </section>
  );
}

function CopyLinkButton({ link }: { link: string }) {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return (
    <button
      type="button"
      title="Copy meeting link"
      aria-label="Copy meeting link"
      onClick={async (e) => {
        e.stopPropagation();
        try {
          await navigator.clipboard.writeText(link);
          setCopied(true);
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
          timeoutRef.current = setTimeout(() => setCopied(false), 1500);
        } catch {
          /* clipboard unavailable — no-op */
        }
      }}
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border text-muted-foreground transition hover:bg-accent"
    >
      {copied ? (
        <Check className="h-3.5 w-3.5 text-emerald-600" />
      ) : (
        <Copy className="h-3.5 w-3.5" />
      )}
    </button>
  );
}
