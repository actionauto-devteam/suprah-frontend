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

type ProjectSocketLike = {
  connected?: boolean;
  on: (event: string, callback: (...args: any[]) => void) => void;
  off: (event: string, callback: (...args: any[]) => void) => void;
};

type ProjectNotificationSocketPayload = {
  _id?: string;
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
   * Shared authenticated Socket.IO client. The backend joins the same socket
   * to a dedicated crm-user:{CrmUser._id} room, so Project Management can use
   * its CrmUser identity without replacing/re-authenticating the singleton
   * main-app socket.
   */
  socket?: ProjectSocketLike | null;
}) {
  const [unreadCount, setUnreadCount] = React.useState(0);
  const mountedRef = React.useRef(false);
  const seenRealtimeIdsRef = React.useRef<Set<string>>(new Set());

  const refresh = React.useCallback(async () => {
    try {
      const res = await apiClient.get("/api/crm/projects/notifications/count");
      const count = res.data?.data?.count;
      if (mountedRef.current && typeof count === "number") {
        setUnreadCount(count);
      }
    } catch {
      // REST is the reconciliation fallback. If the user is temporarily
      // offline or unauthenticated, preserve the last known badge count.
    }
  }, []);

  const markAllRead = React.useCallback(async () => {
    try {
      await apiClient.post("/api/crm/projects/notifications/read", {});
      if (mountedRef.current) {
        setUnreadCount(0);
        seenRealtimeIdsRef.current.clear();
      }
    } catch {
      // Best-effort. The next socket reconnect / poll will reconcile state.
    }
  }, []);

  React.useEffect(() => {
    mountedRef.current = true;
    void refresh();

    const interval = window.setInterval(() => {
      void refresh();
    }, POLL_INTERVAL_MS);

    const onNotification = (payload?: ProjectNotificationSocketPayload) => {
      const notificationId = String(payload?._id ?? "").trim();

      // Socket.IO's multi-room union already de-duplicates sockets, but keep a
      // client-side id guard too so retries or duplicated server emissions can
      // never inflate the badge.
      if (notificationId) {
        if (seenRealtimeIdsRef.current.has(notificationId)) return;
        seenRealtimeIdsRef.current.add(notificationId);
      }

      setUnreadCount((count) => count + 1);

      // Reconcile against MongoDB after the instant local bump. This protects
      // against missed events and keeps multiple tabs/devices authoritative.
      void refresh();
    };

    const onConnect = () => {
      // Socket.IO reconnects automatically. Any notifications created while
      // disconnected are recovered immediately rather than waiting 60 seconds.
      seenRealtimeIdsRef.current.clear();
      void refresh();
    };

    socket?.on("pm:notification", onNotification);
    socket?.on("connect", onConnect);

    return () => {
      mountedRef.current = false;
      window.clearInterval(interval);
      socket?.off("pm:notification", onNotification);
      socket?.off("connect", onConnect);
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