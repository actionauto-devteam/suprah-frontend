"use client";

/**
 * CalendarNotificationContext — the Suprah Calendar notification center's
 * data layer, mirroring ProjectNotificationContext.
 *
 * Polls GET /api/calendar/notifications-summary (60s) and refreshes
 * instantly on the calendar socket events (calendar:created / updated /
 * deleted, calendar:reminder, notification:new), so the sidebar badge and
 * the in-calendar bell always reflect:
 *   - today's remaining events / meetings / synced task deadlines
 *   - overdue tasks assigned to the user
 *   - tasks due today
 *
 * Wrap the dashboard layout:
 *   <CalendarNotificationProvider socket={crmSocket}>…</CalendarNotificationProvider>
 * and read anywhere via useCalendarNotifications() (safe default outside).
 */

import * as React from "react";
import { apiClient } from "@/lib/api-client";

export type CalendarSummaryItem = {
  id: string;
  type: string;
  title: string;
  start: string;
  end: string;
  allDay?: boolean;
  meetingLink?: string;
};

export type CalendarTaskItem = {
  id: string;
  title: string;
  deadline: string;
  groupId: string;
  groupName: string;
};

export type CalendarSummary = {
  todayItems: CalendarSummaryItem[];
  upcoming24h: CalendarSummaryItem[];
  overdueTasks: CalendarTaskItem[];
  approachingTasks: CalendarTaskItem[];
  badgeCount: number;
};

/** Minimal socket surface consumers need — enough for .on/.off listeners. */
export type CalendarSocketLike = {
  on: (e: string, cb: (...args: unknown[]) => void) => void;
  off: (e: string, cb: (...args: unknown[]) => void) => void;
};

type Ctx = {
  summary: CalendarSummary | null;
  badgeCount: number;
  refresh: () => Promise<void>;
  /** The shared calendar socket this provider was given, if any — reuse this instead of calling useCalendarSocket() again. */
  socket: CalendarSocketLike | null;
};

const EMPTY: CalendarSummary = {
  todayItems: [],
  upcoming24h: [],
  overdueTasks: [],
  approachingTasks: [],
  badgeCount: 0,
};

const CalendarNotificationContext = React.createContext<Ctx>({
  summary: null,
  badgeCount: 0,
  refresh: async () => {},
  socket: null,
});

export function useCalendarNotifications() {
  return React.useContext(CalendarNotificationContext);
}

const POLL_INTERVAL_MS = 60_000;

const REFRESH_EVENTS = [
  "calendar:created",
  "calendar:updated",
  "calendar:deleted",
  "calendar:reminder",
  "notification:new",
] as const;

export function CalendarNotificationProvider({
  children,
  socket,
}: {
  children: React.ReactNode;
  /** Optional connected socket.io client (same singleton the calendar uses). */
  socket?: CalendarSocketLike | null;
}) {
  const [summary, setSummary] = React.useState<CalendarSummary | null>(null);

  const refresh = React.useCallback(async () => {
    try {
      const res = await apiClient.get("/api/calendar/notifications-summary");
      const data = res.data;
      setSummary({
        todayItems: data?.todayItems || [],
        upcoming24h: data?.upcoming24h || [],
        overdueTasks: data?.overdueTasks || [],
        approachingTasks: data?.approachingTasks || [],
        badgeCount: data?.badgeCount || 0,
      });
    } catch {
      /* keep the last known summary; polling self-heals */
    }
  }, []);

  React.useEffect(() => {
    refresh();
    const interval = setInterval(refresh, POLL_INTERVAL_MS);

    const onEvent = () => refresh();
    REFRESH_EVENTS.forEach((e) => socket?.on(e, onEvent));

    return () => {
      clearInterval(interval);
      REFRESH_EVENTS.forEach((e) => socket?.off(e, onEvent));
    };
  }, [refresh, socket]);

  const value = React.useMemo<Ctx>(
    () => ({
      summary: summary ?? EMPTY,
      badgeCount: summary?.badgeCount ?? 0,
      refresh,
      socket: socket ?? null,
    }),
    [summary, refresh, socket],
  );

  return (
    <CalendarNotificationContext.Provider value={value}>
      {children}
    </CalendarNotificationContext.Provider>
  );
}