"use client";

import * as React from "react";
import {
  CheckCheck,
  ChevronLeft,
  FileText,
  Info,
  Loader2,
  Paperclip,
  Route,
  Send,
  ShieldCheck,
  Smile,
  Truck,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { AttachmentLightbox, type LightboxAttachment } from "@/components/chat/AttachmentLightbox";
import {
  AttachmentView,
  ConversationDetailsPanel,
  SystemEventCard,
  type ConversationDetailsTab,
  type ConversationDetailsSearchResult,
  type DispatchChatContext,
  type DispatchChatMessage,
  type DispatchChatSystemEvent,
} from "@/components/dispatch-chat/DispatchChatDialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/api-client";
import { initializeSocket } from "@/lib/socket.client";
import { resolveImageUrl } from "@/lib/utils";
import { useAuth, useUser } from "@/providers/AuthProvider";

export type InlineDispatchDriver = {
  id: string;
  name: string;
  email?: string;
  avatar?: string | null;
  status: string;
  isSharing: boolean;
  activeLoadCount: number;
  shipments: Array<{
    id: string;
    trackingNumber: string;
    status: string;
    origin: string;
    destination: string;
    vehicleCount: number;
  }>;
};

type ArchiveSnapshot = {
  messages: DispatchChatMessage[];
  systemEvents: DispatchChatSystemEvent[];
  truncated: boolean;
};

type ThreadSnapshot = {
  threadId: string | null;
  messages: DispatchChatMessage[];
  systemEvents: DispatchChatSystemEvent[];
  context: DispatchChatContext | null;
};

const EMOJIS = [
  "👍", "✅", "🚚", "📍", "🛣️", "⏱️", "🙏", "👌",
  "👋", "🙂", "😊", "😂", "😅", "😎", "🤝", "💪",
  "⚠️", "📦", "🔧", "🅿️", "⛽", "📞", "💬", "❤️",
];

function initials(name: string) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "DR";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
}

function avatarSrc(raw: string | null | undefined) {
  const value = String(raw ?? "").trim();
  if (!value || value.endsWith("/placeholder-avatar.png")) return undefined;
  if (/^https?:\/\//i.test(value) || value.startsWith("data:") || value.startsWith("blob:")) {
    return value;
  }
  return resolveImageUrl(value) || undefined;
}

function statusLabel(status: string) {
  switch (status) {
    case "on-route": return "On Route";
    case "on-break": return "On Break";
    case "waiting": return "Waiting";
    case "idle": return "Idle";
    default: return "Offline";
  }
}

function mergeMessage(
  current: DispatchChatMessage[],
  incoming: DispatchChatMessage,
): DispatchChatMessage[] {
  const existing = current.find((item) => item.id === incoming.id);
  if (existing) {
    return current
      .map((item) => (item.id === incoming.id ? { ...item, ...incoming } : item))
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }
  return [...current, incoming].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
}

export function DispatchChatInlinePane({
  driver,
  onBack,
  onUnreadRefresh,
  refreshSignal = 0,
}: {
  driver: InlineDispatchDriver;
  onBack?: () => void;
  onUnreadRefresh?: () => void | Promise<void>;
  refreshSignal?: number;
}) {
  const { getToken, isSignedIn } = useAuth();
  const { user } = useUser();
  const currentUserId = user?.id ?? null;

  const [messages, setMessages] = React.useState<DispatchChatMessage[]>([]);
  const [systemEvents, setSystemEvents] = React.useState<DispatchChatSystemEvent[]>([]);
  const [context, setContext] = React.useState<DispatchChatContext | null>(null);
  const [threadId, setThreadId] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [historyState, setHistoryState] = React.useState<
    "loading" | "ready" | "error"
  >("loading");
  const [draft, setDraft] = React.useState("");
  const [files, setFiles] = React.useState<File[]>([]);
  const [sending, setSending] = React.useState(false);
  const [emojiOpen, setEmojiOpen] = React.useState(false);
  const [detailsOpen, setDetailsOpen] = React.useState(false);
  const [detailsTab, setDetailsTab] = React.useState<ConversationDetailsTab>("search");
  const [detailsQuery, setDetailsQuery] = React.useState("");
  const [detailsMessages, setDetailsMessages] = React.useState<DispatchChatMessage[]>([]);
  const [detailsSystemEvents, setDetailsSystemEvents] = React.useState<DispatchChatSystemEvent[]>([]);
  const [detailsLoading, setDetailsLoading] = React.useState(false);
  const [detailsTruncated, setDetailsTruncated] = React.useState(false);
  const [lightboxAttachment, setLightboxAttachment] = React.useState<LightboxAttachment | null>(null);
  const [highlightedTimelineItemId, setHighlightedTimelineItemId] =
    React.useState<string | null>(null);

  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const searchJumpActiveRef = React.useRef(false);
  const searchJumpClearTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const timelineRef = React.useRef<HTMLDivElement | null>(null);
  const requestGenerationRef = React.useRef(0);
  const manualRefreshSignalRef = React.useRef(refreshSignal);
  const activeDriverRef = React.useRef(driver.id);
  const threadIdRef = React.useRef<string | null>(null);
  const threadOwnerRef = React.useRef<{ driverId: string; threadId: string | null }>({
    driverId: driver.id,
    threadId: null,
  });
  const threadCacheRef = React.useRef<Map<string, ThreadSnapshot>>(new Map());
  const archiveCacheRef = React.useRef<Map<string, ArchiveSnapshot>>(new Map());

  React.useEffect(() => {
    activeDriverRef.current = driver.id;
  }, [driver.id]);

  React.useEffect(() => {
    return () => {
      if (searchJumpClearTimerRef.current) {
        clearTimeout(searchJumpClearTimerRef.current);
      }
    };
  }, []);

  React.useEffect(() => {
    threadIdRef.current = threadId;
  }, [threadId]);

  const cacheSnapshot = React.useCallback((snapshot: ThreadSnapshot) => {
    threadCacheRef.current.set(driver.id, snapshot);
  }, [driver.id]);

  const markRead = React.useCallback(async (resolvedThreadId?: string | null) => {
    if (!isSignedIn || !driver.id) return;
    try {
      const token = await getToken();
      if (!token) return;
      const id = resolvedThreadId ?? threadIdRef.current;
      await apiClient.post(
        `/api/driver-tracking/dispatch-chat/${encodeURIComponent(driver.id)}/read`,
        id ? { threadId: id } : {},
        { headers: { Authorization: `Bearer ${token}` } },
      );
      void onUnreadRefresh?.();
    } catch {
      // Keep the conversation usable. Realtime/next refresh reconciles read state.
    }
  }, [driver.id, getToken, isSignedIn, onUnreadRefresh]);

  const fetchMessages = React.useCallback(async (silent = false) => {
    if (!isSignedIn || !driver.id) return;

    const generation = ++requestGenerationRef.current;
    setHistoryState("loading");
    if (!silent) setLoading(true);

    try {
      const token = await getToken();
      if (!token) throw new Error("Your session is not available.");

      const response = await apiClient.get(
        `/api/driver-tracking/dispatch-chat/${encodeURIComponent(driver.id)}/messages`,
        {
          headers: { Authorization: `Bearer ${token}` },
          params: { limit: 100 },
        },
      );

      if (generation !== requestGenerationRef.current || activeDriverRef.current !== driver.id) return;

      const payload = response.data?.data ?? {};
      const nextThreadId = String(payload.thread?.id ?? payload.context?.threadId ?? "") || null;
      const nextMessages = Array.isArray(payload.messages)
        ? payload.messages as DispatchChatMessage[]
        : [];
      const nextEvents = Array.isArray(payload.systemEvents)
        ? payload.systemEvents as DispatchChatSystemEvent[]
        : [];
      const nextContext = (payload.context ?? null) as DispatchChatContext | null;

      threadIdRef.current = nextThreadId;
      threadOwnerRef.current = {
        driverId: driver.id,
        threadId: nextThreadId,
      };
      setThreadId(nextThreadId);
      setMessages(nextMessages);
      setSystemEvents(nextEvents);
      setContext(nextContext);
      setHistoryState("ready");
      cacheSnapshot({
        threadId: nextThreadId,
        messages: nextMessages,
        systemEvents: nextEvents,
        context: nextContext,
      });

      if (nextThreadId) void markRead(nextThreadId);
    } catch (error: any) {
      if (
        generation === requestGenerationRef.current &&
        activeDriverRef.current === driver.id
      ) {
        setHistoryState("error");
      }

      if (!silent && generation === requestGenerationRef.current) {
        toast.error(
          error?.response?.data?.message ||
          error?.message ||
          "Could not load Suprah Dispatch Chat",
        );
      }
    } finally {
      if (generation === requestGenerationRef.current) setLoading(false);
    }
  }, [cacheSnapshot, driver.id, getToken, isSignedIn, markRead]);

  React.useEffect(() => {
    requestGenerationRef.current += 1;
    setDraft("");
    setFiles([]);
    setEmojiOpen(false);
    setDetailsOpen(false);
    setDetailsQuery("");
    setDetailsTab("search");

    const cached = threadCacheRef.current.get(driver.id);
    if (cached) {
      threadIdRef.current = cached.threadId;
      threadOwnerRef.current = {
        driverId: driver.id,
        threadId: cached.threadId,
      };
      setThreadId(cached.threadId);
      setMessages(cached.messages);
      setSystemEvents(cached.systemEvents);
      setContext(cached.context);
      setHistoryState("ready");
      setLoading(false);
    } else {
      threadIdRef.current = null;
      threadOwnerRef.current = {
        driverId: driver.id,
        threadId: null,
      };
      setThreadId(null);
      setMessages([]);
      setSystemEvents([]);
      setContext(null);
      setHistoryState("loading");
      setLoading(true);
    }

    void fetchMessages(Boolean(cached));
  }, [driver.id, fetchMessages]);

  // Header Refresh must include the actually opened private conversation, not
  // only the surrounding driver directory/thread metadata.
  React.useEffect(() => {
    if (
      refreshSignal ===
      manualRefreshSignalRef.current
    ) {
      return;
    }

    manualRefreshSignalRef.current =
      refreshSignal;

    void fetchMessages(true);
  }, [
    fetchMessages,
    refreshSignal,
  ]);

  React.useEffect(() => {
    if (!isSignedIn || !driver.id) return;

    let cancelled = false;
    let socket: ReturnType<typeof initializeSocket> | null = null;

    const connect = async () => {
      const token = await getToken();
      if (!token || cancelled) return;

      socket = initializeSocket(token);

      const onMessage = (message: DispatchChatMessage) => {
        if (!message || String(message.driverId) !== String(driver.id)) return;
        if (
          message.dispatcherId &&
          currentUserId &&
          String(message.dispatcherId) !== String(currentUserId)
        ) {
          return;
        }

        if (threadId && message.threadId && String(message.threadId) !== String(threadId)) {
          return;
        }

        if (!threadId && message.threadId) {
          void fetchMessages(true);
          return;
        }

        setMessages((current) => {
          const next = mergeMessage(current, message);
          const snapshot = threadCacheRef.current.get(driver.id);
          if (snapshot) {
            threadCacheRef.current.set(driver.id, { ...snapshot, messages: next });
          }
          return next;
        });

        if (String(message.sender?.id ?? "") !== String(currentUserId ?? "")) {
          void markRead(message.threadId ?? threadId);
        }
        void onUnreadRefresh?.();
      };

      const onRead = (payload: {
        threadId?: string;
        driverId?: string;
        readerId?: string;
      }) => {
        if (String(payload?.driverId ?? "") !== String(driver.id) || !payload.readerId) return;
        if (threadId && payload.threadId && String(payload.threadId) !== String(threadId)) return;

        setMessages((current) => {
          const next = current.map((message) =>
            message.readBy.includes(payload.readerId!)
              ? message
              : { ...message, readBy: [...message.readBy, payload.readerId!] },
          );
          const snapshot = threadCacheRef.current.get(driver.id);
          if (snapshot) {
            threadCacheRef.current.set(driver.id, { ...snapshot, messages: next });
          }
          return next;
        });
        void onUnreadRefresh?.();
      };

      const onNotification = (notification: any) => {
        const metadata = notification?.metadata ?? {};
        const relatedDriverId = String(
          metadata?.driverId ??
          notification?.driverId ??
          notification?.userId ??
          notification?.recipientId ??
          "",
        );
        if (relatedDriverId !== String(driver.id)) return;

        // Do not place raw Notification records directly into this private pane.
        // Refetch the exact server-authorized dispatcher↔driver timeline so the
        // backend remains the privacy/filtering source of truth.
        void fetchMessages(true);
      };

      socket.on("dispatch-chat:message", onMessage);
      socket.on("dispatch-chat:read", onRead);
      socket.on("notification:new", onNotification);
      socket.on("notification:updated", onNotification);

      return () => {
        socket?.off("dispatch-chat:message", onMessage);
        socket?.off("dispatch-chat:read", onRead);
        socket?.off("notification:new", onNotification);
        socket?.off("notification:updated", onNotification);
      };
    };

    let cleanup: (() => void) | undefined;
    void connect().then((fn) => {
      if (cancelled) {
        fn?.();
        return;
      }
      cleanup = fn;
    });

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [
    currentUserId,
    driver.id,
    fetchMessages,
    getToken,
    isSignedIn,
    markRead,
    onUnreadRefresh,
    threadId,
  ]);

  const timeline = React.useMemo(() => {
    const messageItems = messages.map((message) => ({
      itemType: "message" as const,
      id: `message:${message.id}`,
      createdAt: message.createdAt,
      message,
    }));
    const eventItems = systemEvents.map((event) => ({
      itemType: "event" as const,
      id: `event:${event.id}`,
      createdAt: event.createdAt,
      event,
    }));
    return [...messageItems, ...eventItems].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
  }, [messages, systemEvents]);

  React.useLayoutEffect(() => {
    if (searchJumpActiveRef.current) return;

    const viewport = timelineRef.current;
    if (!viewport) return;
    viewport.scrollTop = Math.max(0, viewport.scrollHeight - viewport.clientHeight);
  }, [driver.id, loading, timeline.length]);

  const fetchArchive = React.useCallback(async () => {
    if (!threadId || !driver.id || !isSignedIn) return;

    const threadOwner = threadOwnerRef.current;
    if (
      threadOwner.driverId !== driver.id ||
      threadOwner.threadId !== threadId
    ) {
      return;
    }

    const archiveDriverId = driver.id;
    const archiveThreadId = threadId;
    const cacheKey = `${archiveDriverId}:${archiveThreadId}`;
    const cached = archiveCacheRef.current.get(cacheKey);
    if (cached) {
      setDetailsMessages(cached.messages);
      setDetailsSystemEvents(cached.systemEvents);
      setDetailsTruncated(cached.truncated);
      setDetailsLoading(false);
      return;
    }

    setDetailsLoading(true);
    try {
      const token = await getToken();
      if (!token) return;

      const messageMap = new Map<string, DispatchChatMessage>();
      const eventMap = new Map<string, DispatchChatSystemEvent>();
      let before: string | undefined;
      let hasMore = true;
      let pages = 0;
      const maxPages = 20;

      while (hasMore && pages < maxPages) {
        const response = await apiClient.get(
          `/api/driver-tracking/dispatch-chat/${encodeURIComponent(archiveDriverId)}/messages`,
          {
            headers: { Authorization: `Bearer ${token}` },
            params: {
              limit: 100,
              threadId: archiveThreadId,
              ...(before ? { before } : {}),
            },
          },
        );

        const payload = response.data?.data ?? {};
        const pageMessages = Array.isArray(payload.messages)
          ? payload.messages as DispatchChatMessage[]
          : [];
        const pageEvents = Array.isArray(payload.systemEvents)
          ? payload.systemEvents as DispatchChatSystemEvent[]
          : [];

        pageMessages.forEach((item) => messageMap.set(item.id, item));
        pageEvents.forEach((item) => eventMap.set(item.id, item));

        hasMore = Boolean(payload.hasMore);
        pages += 1;
        const oldest = pageMessages[0]?.createdAt;
        if (!hasMore || !oldest || pageMessages.length === 0) break;
        before = oldest;
      }

      const archive: ArchiveSnapshot = {
        messages: [...messageMap.values()].sort(
          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        ),
        systemEvents: [...eventMap.values()].sort(
          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        ),
        truncated: hasMore && pages >= maxPages,
      };

      archiveCacheRef.current.set(cacheKey, archive);

      const currentOwner = threadOwnerRef.current;
      if (
        currentOwner.driverId !== archiveDriverId ||
        currentOwner.threadId !== archiveThreadId
      ) {
        return;
      }

      setDetailsMessages(archive.messages);
      setDetailsSystemEvents(archive.systemEvents);
      setDetailsTruncated(archive.truncated);
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ||
        error?.message ||
        "Could not load conversation details",
      );
    } finally {
      setDetailsLoading(false);
    }
  }, [driver.id, getToken, isSignedIn, threadId]);

  React.useEffect(() => {
    if (!detailsOpen || !threadId) return;
    setDetailsQuery("");
    setDetailsTab("search");
    void fetchArchive();
  }, [detailsOpen, fetchArchive, threadId]);

  React.useEffect(() => {
    if (!detailsOpen || messages.length === 0) return;
    setDetailsMessages((current) => {
      const map = new Map(current.map((message) => [message.id, message]));
      messages.forEach((message) => map.set(message.id, message));
      return [...map.values()].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );
    });
  }, [detailsOpen, messages]);

  const jumpToConversationSearchResult = React.useCallback(
    async (result: ConversationDetailsSearchResult) => {
      if (!threadId || !driver.id || !isSignedIn) return;

      const targetItemId = result.id;
      searchJumpActiveRef.current = true;
      setHighlightedTimelineItemId(targetItemId);

      if (searchJumpClearTimerRef.current) {
        clearTimeout(searchJumpClearTimerRef.current);
      }

      const targetExists =
        targetItemId.startsWith("message:")
          ? messages.some(
              (message) =>
                `message:${message.id}` === targetItemId,
            )
          : systemEvents.some(
              (event) =>
                `event:${event.id}` === targetItemId,
            );

      if (!targetExists) {
        try {
          const token = await getToken();
          if (!token) return;

          const targetTime =
            new Date(result.createdAt).getTime();
          const before = Number.isFinite(targetTime)
            ? new Date(targetTime + 1).toISOString()
            : undefined;

          const response = await apiClient.get(
            `/api/driver-tracking/dispatch-chat/${encodeURIComponent(driver.id)}/messages`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
              params: {
                limit: 100,
                threadId,
                ...(before ? { before } : {}),
              },
            },
          );

          const payload = response.data?.data ?? {};
          const windowMessages = Array.isArray(payload.messages)
            ? (payload.messages as DispatchChatMessage[])
            : [];
          const windowEvents = Array.isArray(payload.systemEvents)
            ? (payload.systemEvents as DispatchChatSystemEvent[])
            : [];

          setMessages((current) => {
            const map = new Map(
              current.map((message) => [
                message.id,
                message,
              ]),
            );

            for (const message of windowMessages) {
              map.set(message.id, message);
            }

            const next = [...map.values()].sort(
              (a, b) =>
                new Date(a.createdAt).getTime() -
                new Date(b.createdAt).getTime(),
            );

            const snapshot =
              threadCacheRef.current.get(driver.id);
            if (snapshot) {
              threadCacheRef.current.set(
                driver.id,
                {
                  ...snapshot,
                  messages: next,
                },
              );
            }

            return next;
          });

          setSystemEvents((current) => {
            const map = new Map(
              current.map((event) => [
                event.id,
                event,
              ]),
            );

            for (const event of windowEvents) {
              map.set(event.id, event);
            }

            const next = [...map.values()].sort(
              (a, b) =>
                new Date(a.createdAt).getTime() -
                new Date(b.createdAt).getTime(),
            );

            const snapshot =
              threadCacheRef.current.get(driver.id);
            if (snapshot) {
              threadCacheRef.current.set(
                driver.id,
                {
                  ...snapshot,
                  systemEvents: next,
                },
              );
            }

            return next;
          });
        } catch {
          toast.error(
            "Could not load that part of the conversation.",
          );
        }
      }

      setDetailsOpen(false);

      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          document
            .getElementById(
              `dispatch-chat-inline-timeline-${targetItemId}`,
            )
            ?.scrollIntoView({
              behavior: "smooth",
              block: "center",
            });

          searchJumpClearTimerRef.current =
            setTimeout(() => {
              setHighlightedTimelineItemId(null);
              searchJumpActiveRef.current = false;
            }, 2200);
        });
      });
    },
    [
      driver.id,
      getToken,
      isSignedIn,
      messages,
      systemEvents,
      threadId,
    ],
  );

  const submitMessage = React.useCallback(async () => {
    const content = draft.trim();
    if ((!content && files.length === 0) || !driver.id || sending || loading) return;

    setSending(true);
    try {
      const token = await getToken();
      if (!token) throw new Error("Authentication is unavailable");

      let message: DispatchChatMessage | undefined;

      if (files.length > 0) {
        const form = new FormData();
        files.forEach((file) => form.append("files", file));
        if (content) form.append("content", content);
        if (threadId) form.append("threadId", threadId);

        const response = await apiClient.post(
          `/api/driver-tracking/dispatch-chat/${encodeURIComponent(driver.id)}/attachments`,
          form,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        message = response.data?.data as DispatchChatMessage | undefined;
      } else {
        const response = await apiClient.post(
          `/api/driver-tracking/dispatch-chat/${encodeURIComponent(driver.id)}/messages`,
          { content, ...(threadId ? { threadId } : {}) },
          { headers: { Authorization: `Bearer ${token}` } },
        );
        message = response.data?.data as DispatchChatMessage | undefined;
      }

      if (message?.id) {
        setMessages((current) => {
          const next = mergeMessage(current, message!);
          const snapshot = threadCacheRef.current.get(driver.id);
          if (snapshot) {
            threadCacheRef.current.set(driver.id, { ...snapshot, messages: next });
          }
          return next;
        });
        if (!threadIdRef.current && message.threadId) {
          const resolvedThreadId = String(message.threadId);
          threadIdRef.current = resolvedThreadId;
          threadOwnerRef.current = {
            driverId: driver.id,
            threadId: resolvedThreadId,
          };
          setThreadId(resolvedThreadId);
        }
      }

      setDraft("");
      setFiles([]);
      setEmojiOpen(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
      void onUnreadRefresh?.();
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ||
        error?.message ||
        "Could not send Dispatch Chat message",
      );
    } finally {
      setSending(false);
    }
  }, [
    draft,
    driver.id,
    files,
    getToken,
    loading,
    onUnreadRefresh,
    sending,
    threadId,
  ]);

  const displayContextLoads = context?.loads?.length
    ? context.loads
    : driver.shipments.map((load) => ({
        id: load.id,
        loadNumber: load.trackingNumber,
        status: load.status,
        vehicleCount: load.vehicleCount,
        origin: load.origin,
        destination: load.destination,
        pickupDate: null,
      }));

  const primaryLoad = displayContextLoads[0] ?? null;
  const extraLoadCount = Math.max(0, displayContextLoads.length - 1);
  const resolvedDriverName = context?.driver?.name || driver.name;
  const resolvedAvatar = avatarSrc(context?.driver?.avatar ?? driver.avatar);

  return (
    <div className="relative flex min-h-0 min-w-0 flex-1 overflow-hidden" style={{ background: "var(--bg-base)" }}>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="flex min-w-0 shrink-0 items-center gap-2.5 border-b border-border/60 px-3 py-3 sm:px-4" style={{ background: "var(--bg-elevated)" }}>
          {onBack && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-9 shrink-0 lg:hidden"
              onClick={onBack}
              aria-label="Back to drivers"
            >
              <ChevronLeft className="size-4" />
            </Button>
          )}

          <Avatar className="size-9 shrink-0 border border-emerald-500/25">
            {resolvedAvatar && <AvatarImage src={resolvedAvatar} alt={resolvedDriverName} className="object-cover" />}
            <AvatarFallback className="bg-emerald-500/10 text-[10px] font-black text-emerald-600 dark:text-emerald-400">
              {initials(resolvedDriverName)}
            </AvatarFallback>
          </Avatar>

          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 flex-wrap items-center gap-1.5">
              <p className="truncate text-base font-black">{resolvedDriverName}</p>
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/[0.07] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
                <ShieldCheck className="size-2.5" /> Private
              </span>
              <span className="rounded-full border border-border/60 px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground">
                {statusLabel(driver.status)}
              </span>
            </div>

            <div className="mt-1 flex min-w-0 items-center gap-1.5 text-[11.5px] font-medium text-muted-foreground">
              {primaryLoad ? (
                <>
                  <Truck className="size-3 shrink-0 text-emerald-500" />
                  <span className="shrink-0 font-bold text-foreground">{primaryLoad.loadNumber || "Active load"}</span>
                  <span className="shrink-0">· {primaryLoad.status}</span>
                  {(primaryLoad.origin || primaryLoad.destination) && (
                    <>
                      <Route className="hidden size-3 shrink-0 sm:block" />
                      <span className="min-w-0 truncate">
                        {primaryLoad.origin || "Origin"} → {primaryLoad.destination || "Destination"}
                      </span>
                    </>
                  )}
                  {extraLoadCount > 0 && (
                    <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 font-bold">
                      +{extraLoadCount} load{extraLoadCount === 1 ? "" : "s"}
                    </span>
                  )}
                </>
              ) : (
                <>
                  <Truck className="size-3 shrink-0" />
                  <span>No active load currently assigned</span>
                </>
              )}
            </div>
          </div>

          <Button
            type="button"
            variant={detailsOpen ? "secondary" : "outline"}
            size="sm"
            className="h-9 shrink-0 gap-1.5 px-2.5 text-[11.5px] font-bold"
            disabled={!threadId}
            onClick={() => setDetailsOpen((current) => !current)}
          >
            <Info className="size-3.5" />
            <span className="hidden sm:inline">Details</span>
          </Button>
        </div>

        <div
          ref={timelineRef}
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4 sm:px-5" style={{ background: "var(--bg-base)" }}
        >
          {loading && timeline.length === 0 ? (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              <Loader2 className="mr-2 size-5 animate-spin" />
              <span className="text-sm">Loading Dispatch Chat…</span>
            </div>
          ) : historyState === "error" && timeline.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center px-6 text-center">
              <div className="mb-3 flex size-12 items-center justify-center rounded-2xl bg-muted">
                <Truck className="size-6 text-muted-foreground" />
              </div>
              <p className="text-[15px] font-black">Conversation is still unavailable</p>
              <p className="mt-1 max-w-md text-[12.5px] leading-relaxed text-muted-foreground">
                We couldn&apos;t confirm this driver&apos;s Dispatch Chat history yet.
                Reopen or refresh the conversation to try again.
              </p>
            </div>
          ) : historyState !== "ready" && timeline.length === 0 ? (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              <Loader2 className="mr-2 size-5 animate-spin" />
              <span className="text-sm">Checking conversation history…</span>
            </div>
          ) : historyState === "ready" && timeline.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center px-6 text-center">
              <div className="mb-3 flex size-12 items-center justify-center rounded-2xl bg-emerald-500/10">
                <Truck className="size-6 text-emerald-500" />
              </div>
              <p className="text-[15px] font-black">Start the dispatch conversation</p>
              <p className="mt-1 max-w-md text-[12.5px] leading-relaxed text-muted-foreground">
                Messages, files, Dispatch Alerts, and relevant operational updates stay inside this private dispatcher-driver thread.
              </p>
            </div>
          ) : (
            <div className="w-full space-y-3">
              {timeline.map((item) => {
                if (item.itemType === "event") {
                  const highlighted =
                    highlightedTimelineItemId === item.id;

                  return (
                    <div
                      key={item.id}
                      id={`dispatch-chat-inline-timeline-${item.id}`}
                      className={`rounded-2xl transition-[box-shadow,background-color] duration-200 ${
                        highlighted
                          ? "bg-emerald-500/[0.06] ring-2 ring-emerald-500/55 ring-offset-2 ring-offset-transparent"
                          : ""
                      }`}
                    >
                      <SystemEventCard event={item.event} />
                    </div>
                  );
                }

                const message = item.message;
                if (message.messageType === "system" && message.systemEvent) {
                  const highlighted =
                    highlightedTimelineItemId === item.id;

                  return (
                    <div
                      key={item.id}
                      id={`dispatch-chat-inline-timeline-${item.id}`}
                      className={`rounded-2xl transition-[box-shadow,background-color] duration-200 ${
                        highlighted
                          ? "bg-emerald-500/[0.06] ring-2 ring-emerald-500/55 ring-offset-2 ring-offset-transparent"
                          : ""
                      }`}
                    >
                    <SystemEventCard
                      event={{
                        id: `chat-system:${message.id}`,
                        kind:
                          message.systemEvent.type === "driver_dispatch_alert" ||
                          String(message.systemEvent.type || "").includes("offline") ||
                          String(message.systemEvent.type || "").includes("geofence")
                            ? "alert"
                            : "notification",
                        notificationType: message.systemEvent.type || "dispatch_chat_system_event",
                        title: message.systemEvent.title || "Dispatch Update",
                        message:
                          message.systemEvent.message ||
                          message.content ||
                          "Dispatch activity updated.",
                        metadata: message.systemEvent.metadata ?? {},
                        createdAt: message.createdAt,
                      }}
                    />
                    </div>
                  );
                }

                const mine = String(message.sender?.id ?? "") === String(currentUserId ?? "");
                return (
                  <div
                    key={item.id}
                    id={`dispatch-chat-inline-timeline-${item.id}`}
                    className={`flex rounded-xl transition-[box-shadow,background-color] duration-200 ${
                      mine ? "justify-end" : "justify-start"
                    } ${
                      highlightedTimelineItemId === item.id
                        ? "bg-emerald-500/[0.06] ring-2 ring-emerald-500/55 ring-offset-2 ring-offset-transparent"
                        : ""
                    }`}
                  >
                    <div className={`flex max-w-[88%] flex-col sm:max-w-[78%] ${mine ? "items-end" : "items-start"}`}>
                      <div className="mb-1 flex items-center gap-1.5 px-1 text-[11.5px] font-semibold text-muted-foreground">
                        {mine ? "You" : message.sender?.name || "Driver"}
                        {!mine && (
                          <span className="rounded-full bg-muted px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wide">
                            Driver
                          </span>
                        )}
                      </div>

                      <div
                        className={
                          mine
                            ? "min-w-28 rounded-2xl rounded-br-md bg-emerald-600 px-3.5 py-2.5 text-sm text-white shadow-sm"
                            : "min-w-28 rounded-2xl rounded-bl-md border border-border/60 bg-muted/40 px-3.5 py-2.5 text-sm shadow-sm"
                        }
                      >
                        {message.content && (
                          <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
                            {message.content}
                          </p>
                        )}
                        {(message.attachments ?? []).map((attachment, index) => (
                          <AttachmentView
                            key={`${message.id}:${index}:${attachment.originalName}`}
                            attachment={attachment}
                            mine={mine}
                            onOpenMedia={setLightboxAttachment}
                          />
                        ))}
                      </div>

                      <div className="mt-1 flex items-center gap-1 px-1 text-[10.5px] font-medium text-muted-foreground">
                        {new Date(message.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                        {mine && message.readBy.length > 1 && (
                          <>
                            <span>·</span>
                            <CheckCheck className="size-3 text-emerald-500" />
                            <span>Read</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="relative shrink-0 border-t border-border/60 p-3 sm:p-4" style={{ background: "var(--bg-elevated)" }}>
          {files.length > 0 && (
            <div className="mb-2 flex max-h-28 flex-wrap gap-1.5 overflow-y-auto pr-1">
              {files.map((file, index) => (
                <div
                  key={`${file.name}:${file.size}:${index}`}
                  className="flex w-full min-w-0 items-start gap-2 rounded-lg border border-border/60 px-2.5 py-1.5 sm:w-auto"
                  style={{ background: "var(--bg-base)" }}
                >
                  <FileText className="size-3.5 shrink-0 text-emerald-500" />
                  <span className="min-w-0 max-w-full break-all text-[11px] font-semibold">{file.name}</span>
                  <button
                    type="button"
                    className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                    onClick={() => setFiles((current) => current.filter((_, fileIndex) => fileIndex !== index))}
                    aria-label={`Remove ${file.name}`}
                  >
                    <X className="size-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {emojiOpen && (
            <div
              className="absolute bottom-[calc(100%-4px)] left-3 z-20 mb-2 w-[min(16rem,calc(100vw-1.5rem))] rounded-2xl border border-border p-2 shadow-xl"
              style={{ background: "var(--bg-elevated)" }}
            >
              <p className="px-1 pb-1.5 text-[10.5px] font-black uppercase tracking-[0.14em] text-muted-foreground">
                Quick emotes
              </p>
              <div className="grid grid-cols-8 gap-1">
                {EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    className="flex size-7 items-center justify-center rounded-lg text-base hover:bg-muted"
                    onClick={() => {
                      setDraft((current) => `${current}${emoji}`);
                      setEmojiOpen(false);
                    }}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            multiple
            hidden
            onChange={(event) => {
              const incoming = Array.from(event.target.files ?? []);
              if (!incoming.length) return;

              const oversized = incoming.find((file) => file.size > 25 * 1024 * 1024);
              if (oversized) {
                toast.error(`${oversized.name} exceeds 25 MB.`);
                event.target.value = "";
                return;
              }

              setFiles((current) => {
                const next = [...current, ...incoming].slice(0, 5);
                if (current.length + incoming.length > 5) {
                  toast.error("You can attach up to 5 files at once");
                }
                return next;
              });
              event.target.value = "";
            }}
          />

          <div className="flex min-w-0 items-end gap-2">
            <div className="flex shrink-0 items-center gap-1">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-11 w-11 rounded-xl"
                onClick={() => fileInputRef.current?.click()}
                disabled={loading}
                aria-label="Attach files"
              >
                <Paperclip className="size-4" />
              </Button>
              <Button
                type="button"
                variant={emojiOpen ? "secondary" : "outline"}
                size="icon"
                className="h-11 w-11 rounded-xl"
                onClick={() => setEmojiOpen((current) => !current)}
                disabled={loading}
                aria-label="Add emoji"
              >
                <Smile className="size-4" />
              </Button>
            </div>

            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void submitMessage();
                }
              }}
              placeholder={`Message ${resolvedDriverName}…`}
              disabled={loading}
              maxLength={4000}
              rows={2}
              className="min-h-[44px] min-w-0 max-h-32 w-full flex-1 resize-y rounded-xl border border-border/70 px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              style={{ background: "var(--bg-base)" }}
            />

            <Button
              type="button"
              onClick={() => void submitMessage()}
              disabled={loading || sending || (!draft.trim() && files.length === 0)}
              className="h-11 shrink-0 gap-2 px-3 sm:px-4"
            >
              {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              <span className="hidden sm:inline">Send</span>
            </Button>
          </div>

          <div className="mt-1.5 flex flex-wrap items-center justify-between gap-1 text-[11px] font-medium text-muted-foreground">
            <span>Enter to send · Shift+Enter for new line · Up to 5 files, 25 MB each</span>
            <span>{draft.length}/4000</span>
          </div>
        </div>
      </div>

      {detailsOpen && threadId && (
        <aside className="hidden min-h-0 w-80 shrink-0 border-l border-border/60 xl:block">
          <ConversationDetailsPanel
            counterpartName={resolvedDriverName}
            counterpartRole="Driver"
            messages={detailsMessages}
            systemEvents={detailsSystemEvents}
            loading={detailsLoading}
            truncated={detailsTruncated}
            tab={detailsTab}
            onTabChange={setDetailsTab}
            query={detailsQuery}
            onQueryChange={setDetailsQuery}
            onSearchResultSelect={jumpToConversationSearchResult}
            onClose={() => setDetailsOpen(false)}
          />
        </aside>
      )}

      {detailsOpen && threadId && (
        <>
          <button
            type="button"
            className="absolute inset-0 z-40 bg-black/35 xl:hidden"
            onClick={() => setDetailsOpen(false)}
            aria-label="Close conversation details"
          />
          <aside className="absolute inset-y-0 right-0 z-50 w-full border-l border-border/70 bg-background shadow-2xl sm:w-[22rem] xl:hidden">
            <ConversationDetailsPanel
              counterpartName={resolvedDriverName}
              counterpartRole="Driver"
              messages={detailsMessages}
              systemEvents={detailsSystemEvents}
              loading={detailsLoading}
              truncated={detailsTruncated}
              tab={detailsTab}
              onTabChange={setDetailsTab}
              query={detailsQuery}
              onQueryChange={setDetailsQuery}
              onClose={() => setDetailsOpen(false)}
            />
          </aside>
        </>
      )}

      <AttachmentLightbox
        attachment={lightboxAttachment}
        onClose={() => setLightboxAttachment(null)}
      />
    </div>
  );
}