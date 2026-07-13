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
      <p className="p-4 text-xs text-rose-300">
        Couldn’t load your schedule. Refresh to try again.
      </p>
    );
  if (!data)
    return (
      <p className="p-4 font-mono text-xs tabular-nums text-zinc-500">
        loading schedule…
      </p>
    );

  return (
    <div className="flex flex-col gap-5 p-4">
      <header>
        <h2 className="text-sm font-semibold text-zinc-100">My Schedule</h2>
        <p className="text-[11px] text-zinc-500">
          Everything you created or were assigned to — next 30 days.
        </p>
      </header>

      <Section
        title="Upcoming"
        accent="text-emerald-300"
        items={data.upcoming}
        empty="No upcoming activities."
        onItemClick={onItemClick}
      />
      <Section
        title="Pending tasks"
        accent="text-amber-300"
        items={data.pendingTasks}
        empty="No pending tasks — clear runway."
        onItemClick={onItemClick}
      />
      <Section
        title="Meetings"
        accent="text-cyan-300"
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
        className={`mb-2 text-[11px] font-semibold uppercase tracking-wider ${accent}`}
      >
        {title}
        <span className="ml-2 font-mono tabular-nums text-zinc-500">
          {items.length}
        </span>
      </h3>
      {items.length === 0 ? (
        <p className="text-xs text-zinc-600">{empty}</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {items.map((item) => {
            const s = toZoned(new Date(item.start));
            return (
              <li key={item.id}>
                <button
                  onClick={() => onItemClick(item)}
                  className="group flex w-full flex-col gap-0.5 rounded-lg border border-white/5 bg-white/[0.03] px-3 py-2 text-left transition hover:border-white/15 hover:bg-white/[0.06]"
                >
                  <span className="truncate text-xs font-medium text-zinc-200">
                    {item.title}
                  </span>
                  <span className="font-mono text-[10px] tabular-nums text-zinc-500">
                    {fmtDayLabel(s)}
                    {!item.allDay && ` · ${fmtTime(s)}`}
                  </span>
                  {showJoin && item.meetingLink && (
                    <a
                      href={item.meetingLink}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="mt-1 self-start rounded border border-cyan-400/40 bg-cyan-400/10 px-2 py-0.5 text-[10px] text-cyan-300 transition hover:bg-cyan-400/20"
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
