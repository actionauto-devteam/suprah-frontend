"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import type { CalendarItem, MySchedulePayload } from "@/types/calendar.types";
import { fmtDayLabel, fmtTime, toZoned } from "@/utils/calendar.utils";

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

  useEffect(() => {
    let live = true;
    apiClient
      .get<MySchedulePayload>("/api/calendar/my-schedule")
      .then((res) => live && setData(res.data))
      .catch(() => live && setError(true));
    return () => {
      live = false;
    };
  }, []);

  if (error)
    return (
      <p className="p-4 text-sm text-rose-600 dark:text-rose-300">
        Couldn’t load your schedule. Refresh to try again.
      </p>
    );
  if (!data)
    return (
      <p className="p-4 font-mono text-sm tabular-nums text-zinc-600 dark:text-zinc-400">
        loading schedule…
      </p>
    );

  return (
    <div className="flex flex-col gap-6 p-5">
      <header>
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">My Schedule</h2>
        <p className="mt-1 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
          Everything you created or were assigned to — next 30 days.
        </p>
      </header>

      <Section
        title="Upcoming"
        accent="text-emerald-600 dark:text-emerald-300"
        items={data.upcoming}
        empty="No upcoming activities."
        onItemClick={onItemClick}
      />
      <Section
        title="Pending tasks"
        accent="text-amber-600 dark:text-amber-300"
        items={data.pendingTasks}
        empty="No pending tasks — clear runway."
        onItemClick={onItemClick}
      />
      <Section
        title="Meetings"
        accent="text-cyan-600 dark:text-cyan-300"
        items={data.meetings}
        empty="No meetings scheduled."
        onItemClick={onItemClick}
        showJoin
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
}: {
  title: string;
  accent: string;
  items: CalendarItem[];
  empty: string;
  onItemClick: (item: CalendarItem) => void;
  showJoin?: boolean;
}) {
  return (
    <section>
      <h3
        className={`mb-2.5 text-xs font-semibold uppercase tracking-[0.08em] ${accent}`}
      >
        {title}
        <span className="ml-2 font-mono text-[11px] tabular-nums text-zinc-600 dark:text-zinc-400">
          {items.length}
        </span>
      </h3>
      {items.length === 0 ? (
        <p className="text-[13px] leading-5 text-zinc-600 dark:text-zinc-400">{empty}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((item) => {
            const s = toZoned(new Date(item.start));
            return (
              <li key={item.id}>
                <button
                  onClick={() => onItemClick(item)}
                  className="group flex w-full flex-col gap-1 rounded-lg border border-zinc-200 bg-zinc-50/80 px-3.5 py-2.5 text-left transition hover:border-zinc-300 hover:bg-zinc-100 dark:border-white/8 dark:bg-white/[0.03] dark:hover:border-white/15 dark:hover:bg-white/[0.06]"
                >
                  <span className="truncate text-[13px] font-medium leading-5 text-zinc-800 dark:text-zinc-100">
                    {item.title}
                  </span>
                  <span className="font-mono text-[11px] leading-4 tabular-nums text-zinc-600 dark:text-zinc-400">
                    {fmtDayLabel(s)}
                    {!item.allDay && ` · ${fmtTime(s)}`}
                  </span>
                  {showJoin && item.meetingLink && (
                    <a
                      href={item.meetingLink}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="mt-1.5 self-start rounded-md border border-cyan-500/35 bg-cyan-500/10 px-2.5 py-1 text-[11px] font-medium text-cyan-700 transition hover:bg-cyan-500/15 dark:border-cyan-400/40 dark:bg-cyan-400/10 dark:text-cyan-300 dark:hover:bg-cyan-400/20"
                    >
                      Join Supra-Space
                    </a>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}