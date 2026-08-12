"use client";

import * as React from "react";
import {
  AlertTriangle,
  BellRing,
  CheckCheck,
  Download,
  FileText,
  Image as ImageIcon,
  Loader2,
  MessageSquare,
  Paperclip,
  Route,
  Send,
  ShieldCheck,
  Smile,
  Truck,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { apiClient } from "@/lib/api-client";
import { resolveImageUrl } from "@/lib/utils";
import { useAuth, useUser } from "@/providers/AuthProvider";
import { initializeSocket } from "@/lib/socket.client";
import { toast } from "sonner";

export interface DispatchChatAttachment {
  url: string;
  originalName: string;
  mimeType: string;
  size: number;
}

export interface DispatchChatMessage {
  id: string;
  driverId: string;
  sender: {
    id: string;
    name: string;
    email?: string;
    role?: string;
  };
  senderRole: "driver" | "dispatcher";
  messageType?: "message" | "system";
  systemEvent?: {
    type?: string;
    title?: string;
    message?: string;
    metadata?: Record<string, any>;
  } | null;
  content: string;
  attachments: DispatchChatAttachment[];
  readBy: string[];
  createdAt: string;
  updatedAt?: string;
}

export interface DispatchChatSystemEvent {
  id: string;
  kind: "alert" | "notification";
  notificationType: string;
  title: string;
  message: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

interface DispatchChatContext {
  driver: {
    id: string;
    name: string;
    email?: string;
    avatar?: string | null;
  };
  dispatcher: {
    id: string | null;
    name: string;
    email?: string;
    avatar?: string | null;
  };
  loads: Array<{
    id: string;
    loadNumber: string;
    status: string;
    vehicleCount: number;
    origin?: string;
    destination?: string;
    pickupDate?: string | null;
  }>;
}

interface DispatchChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  driverId: string | null | undefined;
  participantName?: string;
  onUnreadChange?: (count: number) => void;
}

const EMOJIS = [
  "👍",
  "✅",
  "🚚",
  "📍",
  "🛣️",
  "⏱️",
  "🙏",
  "👌",
  "👋",
  "🙂",
  "😊",
  "😂",
  "😅",
  "😎",
  "🤝",
  "💪",
  "⚠️",
  "📦",
  "🔧",
  "🅿️",
  "⛽",
  "📞",
  "💬",
  "❤️",
];

const RELEVANT_NOTIFICATION_TYPES = new Set([
  "driver_dispatch_alert",
  "driver_assigned",
  "driver_request_approved",
  "driver_request_rejected",
  "driver_tracker_geofence_alert",
  "driver_tracker_offline_alert",
  "driver_tracker_place_visit",
  "proof_submitted",
  "delivery_confirmed",
]);

function mergeMessage(
  current: DispatchChatMessage[],
  incoming: DispatchChatMessage,
): DispatchChatMessage[] {
  if (current.some((message) => message.id === incoming.id)) return current;
  return [...current, incoming].sort(
    (a, b) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
}

function mergeSystemEvent(
  current: DispatchChatSystemEvent[],
  incoming: DispatchChatSystemEvent,
): DispatchChatSystemEvent[] {
  if (current.some((event) => event.id === incoming.id)) {
    return current.map((event) =>
      event.id === incoming.id ? { ...event, ...incoming } : event,
    );
  }

  return [...current, incoming].sort(
    (a, b) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
}

function nameInitials(name: string) {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) return "US";
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`
    .toUpperCase();
}

function participantAvatarSrc(
  raw: string | null | undefined,
): string | undefined {
  const value = String(raw ?? "").trim();
  if (!value) return undefined;

  // AuthProvider uses this as a synthetic fallback. It is not a real profile
  // picture, so Dispatch Chat should show the person's name initials instead.
  if (
    value === "/placeholder-avatar.png" ||
    value.endsWith("/placeholder-avatar.png")
  ) {
    return undefined;
  }

  if (
    /^https?:\/\//i.test(value) ||
    value.startsWith("data:") ||
    value.startsWith("blob:")
  ) {
    return value;
  }

  return resolveImageUrl(value) || undefined;
}

function bytesLabel(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "File";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function normalizeNotification(
  notification: any,
): DispatchChatSystemEvent | null {
  if (!notification) return null;

  const type = String(
    notification.notificationType ?? notification.type ?? "",
  );
  if (!RELEVANT_NOTIFICATION_TYPES.has(type)) return null;

  const rawId =
    notification.id ??
    notification._id ??
    notification.alertId ??
    `${type}:${notification.createdAt ?? Date.now()}`;

  const isAlert =
    type === "driver_dispatch_alert" ||
    type.includes("alert") ||
    type.includes("geofence") ||
    type.includes("offline");

  return {
    id: String(rawId).startsWith("notification:")
      ? String(rawId)
      : `notification:${String(rawId)}`,
    kind: isAlert ? "alert" : "notification",
    notificationType: type,
    title: notification.title || (isAlert ? "Dispatch Alert" : "Update"),
    message: notification.message || "",
    metadata: notification.metadata ?? {},
    createdAt: notification.createdAt || new Date().toISOString(),
  };
}

function AttachmentView({
  attachment,
  mine,
}: {
  attachment: DispatchChatAttachment;
  mine: boolean;
}) {
  const isImage = attachment.mimeType?.startsWith("image/");
  const isVideo = attachment.mimeType?.startsWith("video/");

  if (isImage) {
    return (
      <a
        href={attachment.url}
        target="_blank"
        rel="noreferrer"
        className="mt-2 block overflow-hidden rounded-xl border border-white/15 bg-black/10"
      >
        <img
          src={attachment.url}
          alt={attachment.originalName}
          className="max-h-64 w-full object-cover"
        />
        <div
          className={`flex items-center justify-between gap-2 px-3 py-2 text-[10px] ${
            mine ? "text-emerald-50/90" : "text-muted-foreground"
          }`}
        >
          <span className="min-w-0 flex-1 break-all text-left [overflow-wrap:anywhere]">{attachment.originalName}</span>
          <span className="shrink-0">{bytesLabel(attachment.size)}</span>
        </div>
      </a>
    );
  }

  if (isVideo) {
    return (
      <div className="mt-2 overflow-hidden rounded-xl border border-white/15 bg-black/10">
        <video
          src={attachment.url}
          controls
          preload="metadata"
          className="max-h-72 w-full bg-black"
        />
        <div
          className={`flex items-center justify-between gap-2 px-3 py-2 text-[10px] ${
            mine ? "text-emerald-50/90" : "text-muted-foreground"
          }`}
        >
          <span className="min-w-0 flex-1 break-all text-left [overflow-wrap:anywhere]">{attachment.originalName}</span>
          <span className="shrink-0">{bytesLabel(attachment.size)}</span>
        </div>
      </div>
    );
  }

  return (
    <a
      href={attachment.url}
      target="_blank"
      rel="noreferrer"
      className={`mt-2 flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors ${
        mine
          ? "border-white/15 bg-white/10 hover:bg-white/15"
          : "border-border/60 bg-background/70 hover:bg-muted/60"
      }`}
    >
      <div
        className={`size-9 rounded-lg flex items-center justify-center shrink-0 ${
          mine ? "bg-white/15" : "bg-emerald-500/10"
        }`}
      >
        <FileText
          className={`size-4 ${
            mine ? "text-white" : "text-emerald-600 dark:text-emerald-400"
          }`}
        />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold break-all [overflow-wrap:anywhere]">
          {attachment.originalName}
        </p>
        <p
          className={`text-[10px] ${
            mine ? "text-emerald-50/75" : "text-muted-foreground"
          }`}
        >
          {bytesLabel(attachment.size)}
        </p>
      </div>
      <Download className="size-4 shrink-0 opacity-70" />
    </a>
  );
}

function SystemEventCard({ event }: { event: DispatchChatSystemEvent }) {
  const isAlert = event.kind === "alert";
  const response = event.metadata?.response;
  const destination = event.metadata?.destinationName;
  const loadNumber = event.metadata?.loadNumber;
  const isLocationSilence =
    event.notificationType === "driver_tracker_offline_alert";
  const minutesWithoutLocation =
    event.metadata?.minutesWithoutLocation;
  const loadNumbers = Array.isArray(event.metadata?.loadNumbers)
    ? event.metadata.loadNumbers
    : [];

  return (
    <div className="flex w-full justify-center py-1">
      <div
        className={`w-full max-w-xl rounded-2xl border px-4 py-3 text-center ${
          isAlert
            ? "border-amber-400/50 bg-amber-500/10 shadow-[0_0_0_1px_rgba(245,158,11,0.08)]"
            : "border-emerald-500/30 bg-emerald-500/[0.07]"
        }`}
      >
        <div className="flex items-center justify-center gap-2">
          {isAlert ? (
            <AlertTriangle className="size-4 text-amber-500" />
          ) : (
            <BellRing className="size-4 text-emerald-500" />
          )}
          <span
            className={`text-[10px] font-black uppercase tracking-[0.18em] ${
              isAlert
                ? "text-amber-600 dark:text-amber-400"
                : "text-emerald-600 dark:text-emerald-400"
            }`}
          >
            {isLocationSilence
              ? "GPS Safety Alert"
              : isAlert
                ? "Dispatch Alert"
                : "Operational Update"}
          </span>
        </div>

        <p className="mt-1.5 text-sm font-black text-foreground">
          {event.title}
        </p>
        {event.message && (
          <p className="mx-auto mt-1 max-w-lg break-words text-xs leading-relaxed text-muted-foreground [overflow-wrap:anywhere]">
            {event.message}
          </p>
        )}

        {isLocationSilence && (
          <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5">
            {Number.isFinite(Number(minutesWithoutLocation)) && (
              <span className="rounded-full border border-red-500/30 bg-red-500/10 px-2 py-1 text-[10px] font-black text-red-700 dark:text-red-300">
                No GPS for {Number(minutesWithoutLocation)} min
              </span>
            )}
            {loadNumbers.map((number: string) => (
              <span
                key={number}
                className="rounded-full border border-border/60 bg-background/70 px-2 py-1 text-[10px] font-semibold"
              >
                Load {number}
              </span>
            ))}
          </div>
        )}

        {(destination || loadNumber || (response && response !== "pending")) && (
          <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5">
            {destination && (
              <span className="rounded-full border border-amber-500/25 bg-amber-500/10 px-2 py-1 text-[10px] font-semibold text-amber-700 dark:text-amber-300">
                Destination: {destination}
              </span>
            )}
            {loadNumber && (
              <span className="rounded-full border border-border/60 bg-background/60 px-2 py-1 text-[10px] font-semibold">
                Load {loadNumber}
              </span>
            )}
            {response && response !== "pending" && (
              <span className="rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2 py-1 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
                Driver: {String(response).replace(/_/g, " ")}
              </span>
            )}
          </div>
        )}

        <p className="mt-2 text-[9px] font-medium text-muted-foreground/70">
          {new Date(event.createdAt).toLocaleString([], {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </div>
    </div>
  );
}

export function DispatchChatDialog({
  open,
  onOpenChange,
  driverId,
  participantName,
  onUnreadChange,
}: DispatchChatDialogProps) {
  const { getToken, isSignedIn } = useAuth();
  const { user } = useUser();
  const [messages, setMessages] = React.useState<DispatchChatMessage[]>([]);
  const [systemEvents, setSystemEvents] = React.useState<
    DispatchChatSystemEvent[]
  >([]);
  const [threadContext, setThreadContext] =
    React.useState<DispatchChatContext | null>(null);
  const [draft, setDraft] = React.useState("");
  const [selectedFiles, setSelectedFiles] = React.useState<File[]>([]);
  const [emojiOpen, setEmojiOpen] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isSending, setIsSending] = React.useState(false);
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [isLatestPositionReady, setIsLatestPositionReady] =
    React.useState(false);
  const timelineScrollRef = React.useRef<HTMLDivElement | null>(null);
  const timelineContentRef = React.useRef<HTMLDivElement | null>(null);
  const latestPositionFrameRef = React.useRef<number | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const openRef = React.useRef(open);

  React.useEffect(() => {
    openRef.current = open;
  }, [open]);

  React.useEffect(() => {
    if (open) {
      setIsLatestPositionReady(false);
    }
  }, [driverId, open]);

  const currentUserId = user?.id ?? null;
  const currentUserIsDriver = user?.role === "driver";

  const updateUnread = React.useCallback((count: number) => {
    setUnreadCount(Math.max(0, count));
  }, []);

  // Synchronize the sidebar/header unread badge only after this component's
  // own unread state has committed. This avoids cross-component setState
  // during render/update processing.
  React.useEffect(() => {
    onUnreadChange?.(unreadCount);
  }, [unreadCount, onUnreadChange]);

  const markRead = React.useCallback(async () => {
    if (!driverId || !isSignedIn) return;
    try {
      const token = await getToken();
      if (!token) return;
      await apiClient.post(
        `/api/driver-tracking/dispatch-chat/${encodeURIComponent(driverId)}/read`,
        {},
        { headers: { Authorization: `Bearer ${token}` } },
      );
      updateUnread(0);
    } catch {
      // A temporary read-state failure must not prevent the user from chatting.
    }
  }, [driverId, getToken, isSignedIn, updateUnread]);

  const fetchUnread = React.useCallback(async () => {
    if (!driverId || !isSignedIn) return;
    try {
      const token = await getToken();
      if (!token) return;
      const response = await apiClient.get(
        `/api/driver-tracking/dispatch-chat/${encodeURIComponent(driverId)}/unread`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      updateUnread(Number(response.data?.data?.unreadCount ?? 0));
    } catch {
      updateUnread(0);
    }
  }, [driverId, getToken, isSignedIn, updateUnread]);

  const fetchMessages = React.useCallback(async () => {
    if (!driverId || !isSignedIn) return;
    setIsLoading(true);
    try {
      const token = await getToken();
      if (!token) return;

      const response = await apiClient.get(
        `/api/driver-tracking/dispatch-chat/${encodeURIComponent(driverId)}/messages`,
        {
          headers: { Authorization: `Bearer ${token}` },
          params: { limit: 100 },
        },
      );

      const payload = response.data?.data ?? {};
      setMessages(
        Array.isArray(payload.messages) ? payload.messages : [],
      );
      setSystemEvents(
        Array.isArray(payload.systemEvents) ? payload.systemEvents : [],
      );
      setThreadContext(payload.context ?? null);
      updateUnread(Number(payload.unreadCount ?? 0));
      await markRead();
    } catch (error: any) {
      toast.error(
        error.response?.data?.message ||
          error.message ||
          "Could not load Suprah Dispatch Chat",
      );
    } finally {
      setIsLoading(false);
    }
  }, [driverId, getToken, isSignedIn, markRead, updateUnread]);

  React.useEffect(() => {
    if (!driverId) {
      setMessages([]);
      setSystemEvents([]);
      setThreadContext(null);
      updateUnread(0);
      return;
    }
    void fetchUnread();
  }, [driverId, fetchUnread, updateUnread]);

  React.useEffect(() => {
    if (!open || !driverId) return;
    void fetchMessages();
  }, [open, driverId, fetchMessages]);

  React.useEffect(() => {
    if (!driverId || !isSignedIn) return;

    let cancelled = false;
    let socket: ReturnType<typeof initializeSocket> | null = null;

    const connect = async () => {
      const token = await getToken();
      if (!token || cancelled) return;

      socket = initializeSocket(token);

      const onMessage = (message: DispatchChatMessage) => {
        if (!message || message.driverId !== driverId) return;

        setMessages((previous) => mergeMessage(previous, message));

        const isMine = message.sender?.id === currentUserId;
        if (isMine) return;

        if (openRef.current) {
          void markRead();
        } else {
          setUnreadCount((previous) => previous + 1);
        }
      };

      const onRead = (payload: {
        driverId?: string;
        readerId?: string;
      }) => {
        if (payload?.driverId !== driverId || !payload.readerId) return;
        setMessages((previous) =>
          previous.map((message) =>
            message.readBy.includes(payload.readerId!)
              ? message
              : {
                  ...message,
                  readBy: [...message.readBy, payload.readerId!],
                },
          ),
        );
      };

      const onNotificationNew = (notification: any) => {
        const targetDriverId =
          notification?.userId ??
          notification?.metadata?.driverId ??
          notification?.driverId;

        if (String(targetDriverId || "") !== String(driverId)) return;

        const event = normalizeNotification(notification);
        if (!event) return;
        setSystemEvents((previous) =>
          mergeSystemEvent(previous, event),
        );
      };

      const onDispatchAlert = (payload: any) => {
        const targetDriverId =
          payload?.driverId ?? payload?.metadata?.driverId ?? driverId;
        if (String(targetDriverId) !== String(driverId)) return;

        const event = normalizeNotification({
          ...payload,
          _id: payload?.alertId,
          type: "driver_dispatch_alert",
        });
        if (!event) return;
        setSystemEvents((previous) =>
          mergeSystemEvent(previous, event),
        );
      };

      socket.on("dispatch-chat:message", onMessage);
      socket.on("dispatch-chat:read", onRead);
      socket.on("notification:new", onNotificationNew);
      socket.on("notification:updated", onNotificationNew);
      socket.on("driver:dispatch_alert", onDispatchAlert);
      socket.on("driver:dispatch_alert_sent", onDispatchAlert);

      return () => {
        socket?.off("dispatch-chat:message", onMessage);
        socket?.off("dispatch-chat:read", onRead);
        socket?.off("notification:new", onNotificationNew);
        socket?.off("notification:updated", onNotificationNew);
        socket?.off("driver:dispatch_alert", onDispatchAlert);
        socket?.off("driver:dispatch_alert_sent", onDispatchAlert);
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
    driverId,
    isSignedIn,
    getToken,
    currentUserId,
    markRead,
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
      (a, b) =>
        new Date(a.createdAt).getTime() -
        new Date(b.createdAt).getTime(),
    );
  }, [messages, systemEvents]);

  // The conversation is rendered in normal chronological order
  // (oldest -> newest). On every open/thread load, keep the timeline hidden
  // until the ACTUAL scroll container has been verified at its bottom.
  const scrollToLatest = React.useCallback(() => {
    const viewport = timelineScrollRef.current;
    if (!viewport) return false;

    const maxScrollTop = Math.max(
      0,
      viewport.scrollHeight - viewport.clientHeight,
    );

    // Assign directly as well as through scrollTo so this works consistently
    // across Chromium and nested Radix dialog scrolling contexts.
    viewport.scrollTo({
      top: maxScrollTop,
      behavior: "auto",
    });
    viewport.scrollTop = maxScrollTop;

    const distanceFromBottom =
      viewport.scrollHeight -
      viewport.clientHeight -
      viewport.scrollTop;

    return Math.abs(distanceFromBottom) <= 2;
  }, []);

  React.useLayoutEffect(() => {
    if (!open || isLoading) return;

    // Empty thread has no scroll positioning work.
    if (timeline.length === 0) {
      setIsLatestPositionReady(true);
      return;
    }

    let cancelled = false;
    let attempts = 0;

    const placeAtLatest = () => {
      if (cancelled) return;

      const reachedLatest = scrollToLatest();
      attempts += 1;

      if (reachedLatest) {
        // Reveal one frame AFTER the final scroll assignment so the user never
        // sees the old/top position flash first.
        latestPositionFrameRef.current =
          window.requestAnimationFrame(() => {
            if (cancelled) return;
            scrollToLatest();
            setIsLatestPositionReady(true);
          });
        return;
      }

      // Retry while Radix/dialog/content layout is still settling.
      if (attempts < 30) {
        latestPositionFrameRef.current =
          window.requestAnimationFrame(placeAtLatest);
        return;
      }

      // Extremely defensive fallback: do not leave the conversation invisible
      // forever, but make one final hard bottom assignment before revealing.
      scrollToLatest();
      setIsLatestPositionReady(true);
    };

    // Start after two animation frames so the dialog viewport has its final
    // height before calculating scrollHeight/clientHeight.
    latestPositionFrameRef.current =
      window.requestAnimationFrame(() => {
        latestPositionFrameRef.current =
          window.requestAnimationFrame(placeAtLatest);
      });

    return () => {
      cancelled = true;
      if (latestPositionFrameRef.current !== null) {
        window.cancelAnimationFrame(
          latestPositionFrameRef.current,
        );
        latestPositionFrameRef.current = null;
      }
    };
  }, [
    driverId,
    isLoading,
    open,
    scrollToLatest,
    timeline.length,
  ]);

  // Keep the open conversation at its newest activity when timeline data
  // changes (new message, GPS alert, dispatch response, etc.).
  React.useEffect(() => {
    if (!open || isLoading || !isLatestPositionReady) return;

    const frame = window.requestAnimationFrame(scrollToLatest);
    return () => window.cancelAnimationFrame(frame);
  }, [
    isLatestPositionReady,
    isLoading,
    open,
    scrollToLatest,
    timeline,
  ]);

  // Images, videos, attachments, fonts and system cards can change the history
  // height after the initial render. ResizeObserver keeps the currently-open
  // conversation pinned to the newest item instead of letting those late size
  // changes leave the viewport above the bottom.
  React.useEffect(() => {
    if (
      !open ||
      isLoading ||
      typeof ResizeObserver === "undefined"
    ) {
      return;
    }

    const content = timelineContentRef.current;
    if (!content) return;

    const observer = new ResizeObserver(() => {
      scrollToLatest();
    });

    observer.observe(content);

    return () => observer.disconnect();
  }, [
    isLoading,
    open,
    scrollToLatest,
  ]);

  const submitMessage = React.useCallback(async () => {
    const content = draft.trim();
    if ((!content && selectedFiles.length === 0) || !driverId || isSending) {
      return;
    }

    setIsSending(true);
    try {
      const token = await getToken();
      if (!token) throw new Error("Authentication is unavailable");

      let message: DispatchChatMessage | undefined;

      if (selectedFiles.length > 0) {
        const form = new FormData();
        selectedFiles.forEach((file) => form.append("files", file));
        if (content) form.append("content", content);

        const response = await apiClient.post(
          `/api/driver-tracking/dispatch-chat/${encodeURIComponent(driverId)}/attachments`,
          form,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );
        message = response.data?.data as DispatchChatMessage | undefined;
      } else {
        const response = await apiClient.post(
          `/api/driver-tracking/dispatch-chat/${encodeURIComponent(driverId)}/messages`,
          { content },
          { headers: { Authorization: `Bearer ${token}` } },
        );
        message = response.data?.data as DispatchChatMessage | undefined;
      }

      if (message?.id) {
        setMessages((previous) => mergeMessage(previous, message!));
      }

      setDraft("");
      setSelectedFiles([]);
      setEmojiOpen(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (error: any) {
      toast.error(
        error.response?.data?.message ||
          error.message ||
          "Could not send Dispatch Chat message",
      );
    } finally {
      setIsSending(false);
    }
  }, [
    draft,
    selectedFiles,
    driverId,
    getToken,
    isSending,
  ]);

  const primaryLoad = threadContext?.loads?.[0] ?? null;
  const extraLoadCount = Math.max(
    0,
    (threadContext?.loads?.length ?? 0) - 1,
  );

  const dispatcherName =
    threadContext?.dispatcher?.name || "Dispatch Team";
  const driverName =
    threadContext?.driver?.name ||
    participantName ||
    "Driver";

  const currentAccountAvatar = participantAvatarSrc(user?.imageUrl);

  const dispatcherAvatar = participantAvatarSrc(
    threadContext?.dispatcher?.avatar,
  );
  const driverAvatar = participantAvatarSrc(
    threadContext?.driver?.avatar,
  );

  const dispatcherAvatarSrc =
    dispatcherAvatar ||
    (String(threadContext?.dispatcher?.id || "") ===
    String(currentUserId || "")
      ? currentAccountAvatar
      : undefined);

  const driverAvatarSrc =
    driverAvatar ||
    (String(threadContext?.driver?.id || "") ===
    String(currentUserId || "")
      ? currentAccountAvatar
      : undefined);

  const dispatcherInitials = nameInitials(dispatcherName);
  const driverInitials = nameInitials(driverName);

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        onOpenChange(nextOpen);
        if (nextOpen) void markRead();
        if (!nextOpen) setEmojiOpen(false);
      }}
    >
      <DialogContent
        onOpenAutoFocus={(event) => {
          // Prevent Radix autofocus from scrolling the freshly-opened dialog
          // toward its first focusable element before latest-position setup.
          event.preventDefault();
        }}
        className="flex h-[calc(100dvh-1rem)] max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] flex-col gap-0 overflow-hidden border-border/70 p-0 shadow-2xl sm:h-[calc(100dvh-2rem)] sm:max-h-[780px] sm:w-[92vw] sm:max-w-[56rem] lg:w-[86vw] lg:max-w-[64rem]"
      >
        <DialogHeader className="relative shrink-0 border-b border-border/60 bg-gradient-to-b from-emerald-500/[0.08] to-background px-3 py-4 text-center sm:px-6 sm:py-5">
          <div className="mx-auto flex size-11 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <MessageSquare className="size-5" />
          </div>

          <DialogTitle className="mt-2 text-center text-xl font-black tracking-tight">
            Suprah Dispatch Chat
          </DialogTitle>

          <DialogDescription className="mx-auto mt-1 flex max-w-xl items-center justify-center gap-1.5 text-center text-xs">
            <ShieldCheck className="size-3.5 shrink-0 text-emerald-500" />
            Private operational communication. Isolated from Suprah Space.
          </DialogDescription>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-background/80 px-3 py-2">
              <Avatar className="size-9 shrink-0 border border-emerald-500/20">
                {dispatcherAvatarSrc && (
                  <AvatarImage
                    src={dispatcherAvatarSrc}
                    alt={dispatcherName}
                    className="object-cover"
                  />
                )}
                <AvatarFallback className="bg-emerald-500/10 text-[11px] font-black text-emerald-600 dark:text-emerald-400">
                  {dispatcherInitials}
                </AvatarFallback>
              </Avatar>

              <div className="min-w-0 text-left leading-tight">
                <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                  Dispatcher
                </p>
                <p className="max-w-full break-words text-left text-xs font-black [overflow-wrap:anywhere]">
                  {dispatcherName}
                </p>
              </div>
            </div>

            <span className="text-xs font-black text-muted-foreground/50">
              ↔
            </span>

            <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-background/80 px-3 py-2">
              <Avatar className="size-9 shrink-0 border border-emerald-500/20">
                {driverAvatarSrc && (
                  <AvatarImage
                    src={driverAvatarSrc}
                    alt={driverName}
                    className="object-cover"
                  />
                )}
                <AvatarFallback className="bg-emerald-500/10 text-[11px] font-black text-emerald-600 dark:text-emerald-400">
                  {driverInitials}
                </AvatarFallback>
              </Avatar>

              <div className="min-w-0 text-left leading-tight">
                <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                  Driver
                </p>
                <p className="max-w-full break-words text-left text-xs font-black [overflow-wrap:anywhere]">
                  {driverName}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-3 flex justify-center">
            {primaryLoad ? (
              <div className="flex w-full max-w-2xl flex-wrap items-center justify-center gap-x-2 gap-y-1 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-center text-[10px] font-semibold">
                <Truck className="size-3.5 text-emerald-500" />
                <span className="font-black">
                  Load {primaryLoad.loadNumber}
                </span>
                <span className="text-muted-foreground">
                  {primaryLoad.status}
                </span>
                {(primaryLoad.origin || primaryLoad.destination) && (
                  <>
                    <span className="text-muted-foreground/40">•</span>
                    <Route className="size-3 text-muted-foreground" />
                    <span className="min-w-0 break-words text-center text-muted-foreground [overflow-wrap:anywhere]">
                      {primaryLoad.origin || "Origin"} →{" "}
                      {primaryLoad.destination || "Destination"}
                    </span>
                  </>
                )}
                {extraLoadCount > 0 && (
                  <span className="rounded-full bg-background/70 px-1.5 py-0.5 font-black">
                    +{extraLoadCount} more
                  </span>
                )}
              </div>
            ) : (
              <div className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/40 px-3 py-1.5 text-[10px] font-semibold text-muted-foreground">
                <Truck className="size-3.5" />
                No active load currently assigned
              </div>
            )}
          </div>
        </DialogHeader>

        <div
          ref={timelineScrollRef}
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-background px-3 py-4 [overflow-anchor:none] sm:px-5"
        >
          {isLoading ? (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              <Loader2 className="mr-2 size-5 animate-spin" />
              <span className="text-sm">Loading Dispatch Chat…</span>
            </div>
          ) : timeline.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center px-6 text-center">
              <div className="mb-3 flex size-12 items-center justify-center rounded-2xl bg-emerald-500/10">
                <MessageSquare className="size-6 text-emerald-500" />
              </div>
              <p className="text-sm font-black">Start the dispatch conversation</p>
              <p className="mt-1 max-w-md text-xs leading-relaxed text-muted-foreground">
                Messages, shared files, dispatch alerts, and relevant driver
                operational updates will appear here in one private timeline.
              </p>
            </div>
          ) : (
            <div
              ref={timelineContentRef}
              className={`w-full space-y-3 ${
                isLatestPositionReady ? "opacity-100" : "opacity-0"
              }`}
              aria-busy={!isLatestPositionReady}
            >
              {timeline.map((item) => {
                if (item.itemType === "event") {
                  return (
                    <SystemEventCard
                      key={item.id}
                      event={item.event}
                    />
                  );
                }

                const message = item.message;

                if (
                  message.messageType === "system" &&
                  message.systemEvent
                ) {
                  return (
                    <SystemEventCard
                      key={item.id}
                      event={{
                        id: `chat-system:${message.id}`,
                        kind: "notification",
                        notificationType:
                          message.systemEvent.type ||
                          "dispatch_chat_system_event",
                        title:
                          message.systemEvent.title ||
                          "Dispatch Update",
                        message:
                          message.systemEvent.message ||
                          message.content ||
                          "Dispatch activity updated.",
                        metadata:
                          message.systemEvent.metadata ?? {},
                        createdAt: message.createdAt,
                      }}
                    />
                  );
                }

                const mine = message.sender.id === currentUserId;
                const senderLabel =
                  message.senderRole === "driver"
                    ? message.sender.name || "Driver"
                    : message.sender.name || "Dispatch";

                return (
                  <div
                    key={item.id}
                    className={`flex ${
                      mine ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`flex max-w-[88%] sm:max-w-[78%] flex-col ${
                        mine ? "items-end" : "items-start"
                      }`}
                    >
                      <div className="mb-1 flex items-center gap-1.5 px-1 text-[10px] font-semibold text-muted-foreground">
                        {mine ? "You" : senderLabel}
                        {!mine && (
                          <span className="rounded-full bg-muted px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide">
                            {message.senderRole === "driver"
                              ? "Driver"
                              : "Dispatch"}
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

                        {(message.attachments ?? []).map(
                          (attachment, index) => (
                            <AttachmentView
                              key={`${message.id}:${index}:${attachment.originalName}`}
                              attachment={attachment}
                              mine={mine}
                            />
                          ),
                        )}
                      </div>

                      <div className="mt-1 flex items-center gap-1 px-1 text-[9px] text-muted-foreground/70">
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

        <div className="relative shrink-0 border-t border-border/60 bg-muted/[0.14] p-3 sm:p-4">
          {selectedFiles.length > 0 && (
            <div className="mb-2 flex max-h-28 flex-wrap gap-1.5 overflow-y-auto pr-1">
              {selectedFiles.map((file, index) => (
                <div
                  key={`${file.name}:${file.size}:${index}`}
                  className="flex w-full min-w-0 items-start gap-2 rounded-lg border border-border/60 bg-background px-2.5 py-1.5 sm:w-auto sm:max-w-full"
                >
                  {file.type.startsWith("image/") ? (
                    <ImageIcon className="size-3.5 shrink-0 text-emerald-500" />
                  ) : (
                    <FileText className="size-3.5 shrink-0 text-emerald-500" />
                  )}
                  <span className="min-w-0 max-w-full break-all text-[10px] font-semibold [overflow-wrap:anywhere]">
                    {file.name}
                  </span>
                  <span className="text-[9px] text-muted-foreground">
                    {bytesLabel(file.size)}
                  </span>
                  <button
                    type="button"
                    aria-label={`Remove ${file.name}`}
                    className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                    onClick={() =>
                      setSelectedFiles((current) =>
                        current.filter((_, fileIndex) => fileIndex !== index),
                      )
                    }
                  >
                    <X className="size-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {emojiOpen && (
            <div className="absolute bottom-[calc(100%-4px)] left-12 z-20 mb-2 w-64 rounded-2xl border border-border bg-popover p-2 shadow-xl">
              <p className="px-1 pb-1.5 text-[9px] font-black uppercase tracking-[0.16em] text-muted-foreground">
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
            className="hidden"
            onChange={(event) => {
              const incoming = Array.from(event.target.files ?? []);
              if (!incoming.length) return;

              setSelectedFiles((current) => {
                const next = [...current, ...incoming].slice(0, 5);
                if (current.length + incoming.length > 5) {
                  toast.error("You can attach up to 5 files at once");
                }
                return next;
              });
            }}
          />

          <div className="flex items-end gap-2">
            <div className="flex shrink-0 items-center gap-1">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-11 w-11 rounded-xl"
                aria-label="Attach files"
                onClick={() => fileInputRef.current?.click()}
              >
                <Paperclip className="size-4" />
              </Button>

              <Button
                type="button"
                variant={emojiOpen ? "secondary" : "outline"}
                size="icon"
                className="h-11 w-11 rounded-xl"
                aria-label="Add emoji"
                onClick={() => setEmojiOpen((current) => !current)}
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
              placeholder={
                currentUserIsDriver
                  ? "Message your dispatch team…"
                  : `Message ${driverName}…`
              }
              maxLength={4000}
              rows={2}
              className="min-h-[44px] min-w-0 max-h-32 w-full flex-1 resize-y rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />

            <Button
              type="button"
              onClick={() => void submitMessage()}
              disabled={
                (!draft.trim() && selectedFiles.length === 0) ||
                isSending ||
                !driverId
              }
              className="h-11 px-4 gap-2 shrink-0"
            >
              {isSending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
              <span className="hidden sm:inline">Send</span>
            </Button>
          </div>

          <div className="mt-1.5 flex flex-wrap items-center justify-between gap-1 text-[10px] text-muted-foreground">
            <span>
              Enter to send · Shift+Enter for new line · Up to 5 files, 25 MB each
            </span>
            <span>{draft.length}/4000</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}