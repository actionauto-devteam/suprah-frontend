"use client";

/**
 * CalendarNotificationsBell — Suprah Calendar's notification center.
 *
 * Bell for the SuprahCalendar toolbar, fed by CalendarNotificationContext.
 * Sections:
 *   Overdue tasks        — deadlines already passed (rose)
 *   Due soon             — tasks due within 3 days (amber)
 *   Today's schedule     — remaining events / meetings / task deadlines (emerald)
 *   Next 24 hours        — items starting after today but within a day
 *
 * Built on the shared Popover primitive (same one MultiSelectFilter uses)
 * rather than a hand-rolled portal/position/outside-click — Radix
 * already handles body-portal rendering (so this can't be clipped by the
 * calendar shell's overflow-hidden), collision-aware flipping, and
 * dismissal for free.
 *
 * Drop into the SuprahCalendar toolbar, e.g. just before the "My Schedule"
 * button:  <CalendarNotificationsBell />
 */

import * as React from "react";
import Link from "next/link";
import { useCalendarNotifications } from "@/context/CalendarNotificationContext";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

const fmtDay = (iso: string) =>
  new Date(iso).toLocaleDateString([], { month: "short", day: "numeric" });

function Section({
  label,
  tone,
  children,
}: {
  label: string;
  tone: "rose" | "amber" | "emerald" | "cyan";
  children: React.ReactNode;
}) {
  const tones = {
    rose: "text-rose-700 dark:text-rose-300 border-rose-500/25",
    amber: "text-amber-700 dark:text-amber-300 border-amber-500/25",
    emerald: "text-emerald-700 dark:text-emerald-300 border-emerald-500/25",
    cyan: "text-cyan-700 dark:text-cyan-300 border-cyan-500/25",
  } as const;
  return (
    <div className="px-3 pb-2 pt-2.5">
      <p
        className={`mb-1.5 inline-flex rounded border bg-muted/40 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.14em] ${tones[tone]}`}
      >
        {label}
      </p>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

export function CalendarNotificationsBell() {
  const { summary, badgeCount, refresh } = useCalendarNotifications();
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    if (open) refresh();
  }, [open, refresh]);

  const s = summary;
  const empty =
    !s ||
    (s.todayItems.length === 0 &&
      s.upcoming24h.length === 0 &&
      s.overdueTasks.length === 0 &&
      s.approachingTasks.length === 0);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          title="Calendar notifications"
          className={`relative rounded-lg border px-2.5 py-1.5 text-xs transition ${
            open
              ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
              : "border-border text-foreground hover:bg-accent"
          }`}
        >
          {/* bell glyph kept inline to avoid icon-library coupling in this file */}
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
            <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.7 21a2 2 0 0 1-3.4 0" />
          </svg>
          {badgeCount > 0 && (
            <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-600 px-1 font-mono text-[9px] font-bold text-white">
              {badgeCount > 99 ? "99+" : badgeCount}
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[min(20rem,90vw)] max-h-[min(440px,var(--radix-popover-content-available-height))] overflow-y-auto rounded-xl border border-border bg-popover p-0 shadow-2xl backdrop-blur-xl [scrollbar-width:thin]"
      >
        <div className="border-b border-border px-3 py-2">
          <p className="text-xs font-semibold text-popover-foreground">Calendar updates</p>
          <p className="text-[10px] text-muted-foreground">
            Today&apos;s schedule, deadlines, and what&apos;s next
          </p>
        </div>

        {empty ? (
          <p className="px-4 py-8 text-center text-xs text-muted-foreground">
            Nothing needs your attention — no events today and no
            approaching deadlines.
          </p>
        ) : (
          <>
            {s!.overdueTasks.length > 0 && (
              <Section label="Overdue tasks" tone="rose">
                {s!.overdueTasks.map((t) => (
                  <Link
                    key={t.id}
                    href={`/project?task=${t.id}&group=${t.groupId}`}
                    onClick={() => setOpen(false)}
                    className="block rounded-md border border-rose-400/20 bg-rose-400/[0.06] px-2 py-1.5 transition hover:bg-rose-400/[0.12]"
                  >
                    <p className="truncate text-[11px] font-semibold text-rose-700 dark:text-rose-200">
                      {t.title}
                    </p>
                    <p className="text-[9px] text-rose-600/70 dark:text-rose-300/70">
                      {t.groupName} · was due {fmtDay(t.deadline)}
                    </p>
                  </Link>
                ))}
              </Section>
            )}

            {s!.approachingTasks.length > 0 && (
              <Section label="Due soon" tone="amber">
                {s!.approachingTasks.map((t) => (
                  <Link
                    key={t.id}
                    href={`/project?task=${t.id}&group=${t.groupId}`}
                    onClick={() => setOpen(false)}
                    className="block rounded-md border border-amber-400/20 bg-amber-400/[0.06] px-2 py-1.5 transition hover:bg-amber-400/[0.12]"
                  >
                    <p className="truncate text-[11px] font-semibold text-amber-700 dark:text-amber-200">
                      {t.title}
                    </p>
                    <p className="text-[9px] text-amber-600/70 dark:text-amber-300/70">
                      {t.groupName} · due {fmtDay(t.deadline)} {fmtTime(t.deadline)}
                    </p>
                  </Link>
                ))}
              </Section>
            )}

            {s!.todayItems.length > 0 && (
              <Section label="Today's schedule" tone="emerald">
                {s!.todayItems.map((e) => (
                  <Link
                    key={e.id}
                    href={`/crm/suprah-calendar?event=${e.id}`}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-2 rounded-md border border-emerald-400/15 bg-emerald-400/[0.05] px-2 py-1.5 transition hover:bg-emerald-400/[0.1]"
                  >
                    <span className="w-14 shrink-0 font-mono text-[10px] tabular-nums text-emerald-700 dark:text-emerald-300">
                      {e.allDay ? "All day" : fmtTime(e.start)}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[11px] font-medium text-foreground">
                      {e.title}
                    </span>
                    <span className="shrink-0 rounded border border-border bg-muted/40 px-1 py-0.5 text-[8px] uppercase tracking-wider text-muted-foreground">
                      {e.type}
                    </span>
                  </Link>
                ))}
              </Section>
            )}

            {s!.upcoming24h.length > 0 && (
              <Section label="Next 24 hours" tone="cyan">
                {s!.upcoming24h.map((e) => (
                  <Link
                    key={e.id}
                    href={`/crm/suprah-calendar?event=${e.id}`}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-2 rounded-md border border-cyan-400/15 bg-cyan-400/[0.05] px-2 py-1.5 transition hover:bg-cyan-400/[0.1]"
                  >
                    <span className="w-20 shrink-0 font-mono text-[10px] tabular-nums text-cyan-700 dark:text-cyan-300">
                      {fmtDay(e.start)} {fmtTime(e.start)}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[11px] font-medium text-foreground">
                      {e.title}
                    </span>
                  </Link>
                ))}
              </Section>
            )}
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
