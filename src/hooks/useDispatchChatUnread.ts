"use client";

import * as React from "react";
import { apiClient } from "@/lib/api-client";
import { initializeSocket } from "@/lib/socket.client";
import { useAuth } from "@/providers/AuthProvider";

export function useDispatchChatUnread(options?: { enabled?: boolean }) {
  const enabled = options?.enabled ?? true;
  const { getToken, isSignedIn } = useAuth();
  const [unreadTotal, setUnreadTotal] = React.useState(0);
  const [isLoading, setIsLoading] = React.useState(false);

  const refresh = React.useCallback(async () => {
    if (!enabled || !isSignedIn) {
      setUnreadTotal(0);
      return;
    }

    setIsLoading(true);
    try {
      const token = await getToken();
      if (!token) return;
      const response = await apiClient.get(
        "/api/driver-tracking/dispatch-chat/unread-total",
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setUnreadTotal(
        Math.max(0, Number(response.data?.data?.unreadTotal ?? 0)),
      );
    } catch {
      // Keep the previous count during a temporary network/auth failure. The
      // next socket event or component mount will refresh it again.
    } finally {
      setIsLoading(false);
    }
  }, [enabled, getToken, isSignedIn]);

  React.useEffect(() => {
    if (!enabled || !isSignedIn) {
      setUnreadTotal(0);
      return;
    }

    void refresh();
  }, [enabled, isSignedIn, refresh]);

  React.useEffect(() => {
    if (!enabled || !isSignedIn) return;

    let cancelled = false;
    let socket: ReturnType<typeof initializeSocket> | null = null;
    let refreshTimer: ReturnType<typeof setTimeout> | null = null;

    const scheduleRefresh = () => {
      if (cancelled) return;
      if (refreshTimer) clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => {
        refreshTimer = null;
        void refresh();
      }, 80);
    };

    const connect = async () => {
      const token = await getToken();
      if (!token || cancelled) return;
      socket = initializeSocket(token);
      socket.on("dispatch-chat:message", scheduleRefresh);
      socket.on("dispatch-chat:read", scheduleRefresh);
      socket.on("connect", scheduleRefresh);
    };

    void connect();

    return () => {
      cancelled = true;
      if (refreshTimer) clearTimeout(refreshTimer);
      socket?.off("dispatch-chat:message", scheduleRefresh);
      socket?.off("dispatch-chat:read", scheduleRefresh);
      socket?.off("connect", scheduleRefresh);
    };
  }, [enabled, getToken, isSignedIn, refresh]);

  return { unreadTotal, isLoading, refresh };
}