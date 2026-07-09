"use client";

import * as React from "react";
import { apiClient } from "@/lib/api-client";

type ProjectNotificationContextValue = {
  unreadCount: number;
  /** Re-fetch the unread count immediately (e.g. after opening the module). */
  refresh: () => Promise<void>;
  /** Mark everything read and zero the badge (called by the Projects page). */
  markAllRead: () => Promise<void>;
};

const ProjectNotificationContext =
  React.createContext<ProjectNotificationContextValue>({
    unreadCount: 0,
    refresh: async () => {},
    markAllRead: async () => {},
  });

export function useProjectNotifications() {
  return React.useContext(ProjectNotificationContext);
}

const POLL_INTERVAL_MS = 60_000;

export function ProjectNotificationProvider({
  children,
  socket,
}: {
  children: React.ReactNode;
  /**
   * Optional connected socket.io client (the same one used for time-clock /
   * feeds). When provided, `pm:notification` events bump the badge instantly.
   */
  socket?: { on: (e: string, cb: (...args: any[]) => void) => void; off: (e: string, cb: (...args: any[]) => void) => void } | null;
}) {
  const [unreadCount, setUnreadCount] = React.useState(0);
  const mountedRef = React.useRef(true);

  const refresh = React.useCallback(async () => {
    try {
      const res = await apiClient.get("/api/crm/projects/notifications/count");
      const count = res.data?.data?.count;
      if (mountedRef.current && typeof count === "number") {
        setUnreadCount(count);
      }
    } catch {
      // Unauthenticated or offline — leave the badge as-is.
    }
  }, []);

  const markAllRead = React.useCallback(async () => {
    try {
      await apiClient.post("/api/crm/projects/notifications/read", {});
      if (mountedRef.current) setUnreadCount(0);
    } catch {
      /* best-effort */
    }
  }, []);

  React.useEffect(() => {
    mountedRef.current = true;
    refresh();

    const interval = setInterval(refresh, POLL_INTERVAL_MS);

    const onNotification = () => setUnreadCount((c) => c + 1);
    socket?.on("pm:notification", onNotification);

    return () => {
      mountedRef.current = false;
      clearInterval(interval);
      socket?.off("pm:notification", onNotification);
    };
  }, [refresh, socket]);

  const value = React.useMemo(
    () => ({ unreadCount, refresh, markAllRead }),
    [unreadCount, refresh, markAllRead],
  );

  return (
    <ProjectNotificationContext.Provider value={value}>
      {children}
    </ProjectNotificationContext.Provider>
  );
}