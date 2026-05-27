"use client";

import * as React from "react";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/providers/AuthProvider";
import {
  getDashboardSocket,
  disconnectDashboardSocket,
} from "@/lib/dashboardSocket";

export interface ChatReplyPreview {
  _id: string;
  authorName: string | null;
  content: string;
  isDeleted: boolean;
}

export interface ChatMessage {
  _id: string;
  organizationId?: string;
  content: string;
  createdBy: string;
  authorName: string;
  authorRole: string;
  replyTo: ChatReplyPreview | null;
  isEdited: boolean;
  editedAt?: string | null;
  isDeleted: boolean;
  createdAt: string;
  updatedAt?: string;
}

const POLL_INTERVAL_MS = 4000;
const SOCKET_GRACE_MS = 2500;

function sortByCreated(a: ChatMessage, b: ChatMessage) {
  return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
}

/**
 * Drives the dashboard chat. Returns the message list plus actions.
 *
 * Live strategy:
 *  - Initial page fetched over REST.
 *  - Socket.IO pushes chat:new / chat:update / chat:delete -> instant updates.
 *  - If the socket doesn't connect (server not wired yet), we poll the REST
 *    list endpoint every few seconds so the chat still feels live.
 */
export function useDashboardChat(currentUserId?: string) {
  const { getToken } = useAuth();

  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [hasMore, setHasMore] = React.useState(false);
  const [nextCursor, setNextCursor] = React.useState<string | null>(null);
  const [socketConnected, setSocketConnected] = React.useState(false);
  const [sending, setSending] = React.useState(false);

  const cursorRef = React.useRef<string | null>(null);

  const getHeaders = React.useCallback(async () => {
    const token = await getToken();
    return { headers: { Authorization: `Bearer ${token}` } };
  }, [getToken]);

  // Upsert helper: merges any message (by _id), keeps list sorted oldest→newest.
  const upsert = React.useCallback((incoming: ChatMessage | ChatMessage[]) => {
    setMessages((prev) => {
      const map = new Map(prev.map((m) => [m._id, m]));
      const list = Array.isArray(incoming) ? incoming : [incoming];
      for (const msg of list) {
        if (!msg?._id) continue;
        map.set(msg._id, { ...map.get(msg._id), ...msg });
      }
      return Array.from(map.values()).sort(sortByCreated);
    });
  }, []);

  // ── Initial load ────────────────────────────────────────────────────────────
  const loadInitial = React.useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const h = await getHeaders();
      const r = await apiClient.get("/api/appointments/dashboard/chat", {
        ...h,
        params: { limit: 50 },
      });
      const data = r.data?.data ?? r.data;
      const list: ChatMessage[] = data?.messages ?? [];
      // Backend returns newest-first; sort ascending for the scroll view.
      upsert([...list].reverse());
      setHasMore(!!data?.hasMore);
      setNextCursor(data?.nextCursor ?? null);
      cursorRef.current = data?.nextCursor ?? null;
    } catch (e: any) {
      setError(e?.message || "Failed to load chat");
    } finally {
      setIsLoading(false);
    }
  }, [getHeaders, upsert]);

  // ── Load older (pagination) ───────────────────────────────────────────────
  const loadMore = React.useCallback(async () => {
    if (!cursorRef.current) return;
    try {
      const h = await getHeaders();
      const r = await apiClient.get("/api/appointments/dashboard/chat", {
        ...h,
        params: { limit: 50, before: cursorRef.current },
      });
      const data = r.data?.data ?? r.data;
      const list: ChatMessage[] = data?.messages ?? [];
      upsert([...list].reverse());
      setHasMore(!!data?.hasMore);
      setNextCursor(data?.nextCursor ?? null);
      cursorRef.current = data?.nextCursor ?? null;
    } catch {
      /* non-fatal */
    }
  }, [getHeaders, upsert]);

  React.useEffect(() => {
    loadInitial();
  }, [loadInitial]);

  // ── Socket.IO live updates ────────────────────────────────────────────────
  React.useEffect(() => {
    let cancelled = false;
    let socket: ReturnType<typeof getDashboardSocket> | null = null;

    (async () => {
      try {
        const token = await getToken();
        if (cancelled || !token) return;
        socket = getDashboardSocket(token);

        socket.on("connect", () => !cancelled && setSocketConnected(true));
        socket.on("disconnect", () => !cancelled && setSocketConnected(false));
        socket.on("connect_error", () => !cancelled && setSocketConnected(false));

        socket.on("chat:new", (msg: ChatMessage) => upsert(msg));
        socket.on("chat:update", (msg: ChatMessage) => upsert(msg));
        socket.on("chat:delete", (msg: ChatMessage) => upsert(msg));
      } catch {
        if (!cancelled) setSocketConnected(false);
      }
    })();

    return () => {
      cancelled = true;
      disconnectDashboardSocket();
    };
  }, [getToken, upsert]);

  // ── Polling fallback (only while socket is NOT connected) ─────────────────
  React.useEffect(() => {
    // Give the socket a moment to connect before we start polling.
    let pollTimer: ReturnType<typeof setInterval> | null = null;
    const grace = setTimeout(() => {
      if (socketConnected) return;
      pollTimer = setInterval(async () => {
        try {
          const h = await getHeaders();
          const r = await apiClient.get("/api/appointments/dashboard/chat", {
            ...h,
            params: { limit: 50 },
          });
          const data = r.data?.data ?? r.data;
          upsert([...(data?.messages ?? [])].reverse());
        } catch {
          /* ignore transient poll errors */
        }
      }, POLL_INTERVAL_MS);
    }, SOCKET_GRACE_MS);

    return () => {
      clearTimeout(grace);
      if (pollTimer) clearInterval(pollTimer);
    };
  }, [socketConnected, getHeaders, upsert]);

  // ── Actions ───────────────────────────────────────────────────────────────
  const sendMessage = React.useCallback(
    async (content: string, replyTo?: string) => {
      const trimmed = content.trim();
      if (!trimmed) return;
      setSending(true);
      try {
        const h = await getHeaders();
        const r = await apiClient.post(
          "/api/appointments/dashboard/chat",
          { content: trimmed, replyTo },
          h,
        );
        const msg = r.data?.data ?? r.data;
        if (msg?._id) upsert(msg); // instant echo even if socket lags
      } finally {
        setSending(false);
      }
    },
    [getHeaders, upsert],
  );

  const editMessage = React.useCallback(
    async (id: string, content: string) => {
      const trimmed = content.trim();
      if (!trimmed) return;
      const h = await getHeaders();
      const r = await apiClient.patch(
        `/api/appointments/dashboard/chat/${id}`,
        { content: trimmed },
        h,
      );
      const msg = r.data?.data ?? r.data;
      if (msg?._id) upsert(msg);
    },
    [getHeaders, upsert],
  );

  const deleteMessage = React.useCallback(
    async (id: string) => {
      const h = await getHeaders();
      const r = await apiClient.delete(
        `/api/appointments/dashboard/chat/${id}`,
        h,
      );
      const msg = r.data?.data ?? r.data;
      if (msg?._id) upsert(msg);
    },
    [getHeaders, upsert],
  );

  return {
    messages,
    isLoading,
    error,
    hasMore,
    nextCursor,
    socketConnected,
    sending,
    currentUserId,
    sendMessage,
    editMessage,
    deleteMessage,
    loadMore,
    refetch: loadInitial,
  };
}