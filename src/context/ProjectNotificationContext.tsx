"use client";

import * as React from "react";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/providers/AuthProvider";

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
  const { isLoaded, isSignedIn, authIndeterminate, userId, orgId } = useAuth();
  const ready = isLoaded && isSignedIn && !authIndeterminate;
  const generationRef = React.useRef(0);
  const requestRef = React.useRef<{ generation: number; rerun: boolean; promise: Promise<void> } | null>(null);

  React.useEffect(() => {
    setUnreadCount(0);
    seenRealtimeIdsRef.current.clear();
  }, [userId, orgId]);

  const refresh = React.useCallback(async (reconcile = false) => {
    if (!ready) return;
    const generation = generationRef.current;
    const existing = requestRef.current;
    if (existing?.generation === generation) {
      if (reconcile) existing.rerun = true;
      return existing.promise;
    }
    const task = { generation, rerun: false, promise: Promise.resolve() };
    task.promise = (async () => {
      do {
        task.rerun = false;
        try {
          const res = await apiClient.get("/api/crm/projects/notifications/count");
          const count = res.data?.data?.count;
          if (mountedRef.current && generation === generationRef.current && typeof count === "number") {
            setUnreadCount(count);
          }
        } catch {
          // REST is the reconciliation fallback. If the user is temporarily
          // offline or unauthenticated, preserve the last known badge count.
        }
      } while (task.rerun && generation === generationRef.current);
    })().finally(() => {
      if (requestRef.current === task) requestRef.current = null;
    });
    requestRef.current = task;
    return task.promise;
  }, [ready, userId, orgId]);

  const markAllRead = React.useCallback(async () => {
    if (!ready) return;
    const generation = generationRef.current;
    try {
      await apiClient.post("/api/crm/projects/notifications/read", {});
      if (mountedRef.current && generation === generationRef.current) {
        // A pre-write count response must not restore the old unread badge.
        ++generationRef.current;
        requestRef.current = null;
        setUnreadCount(0);
        seenRealtimeIdsRef.current.clear();
      }
    } catch {
      // Best-effort. The next socket reconnect / poll will reconcile state.
    }
  }, [ready, userId, orgId]);

  React.useEffect(() => {
    ++generationRef.current;
    if (!ready) return;
    mountedRef.current = true;
    void refresh();

    const interval = window.setInterval(() => {
      void refresh();
    }, POLL_INTERVAL_MS);

    return () => {
      ++generationRef.current;
      requestRef.current = null;
      mountedRef.current = false;
      window.clearInterval(interval);
    };
  }, [ready, refresh]);

  React.useEffect(() => {
    if (!ready) return;

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
      void refresh(true);
    };

    const onConnect = () => {
      // Socket.IO reconnects automatically. Any notifications created while
      // disconnected are recovered immediately rather than waiting 60 seconds.
      seenRealtimeIdsRef.current.clear();
      void refresh(true);
    };

    socket?.on("pm:notification", onNotification);
    socket?.on("connect", onConnect);

    return () => {
      socket?.off("pm:notification", onNotification);
      socket?.off("connect", onConnect);
    };
  }, [ready, refresh, socket]);

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