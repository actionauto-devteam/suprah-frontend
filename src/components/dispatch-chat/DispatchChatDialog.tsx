"use client";

import * as React from "react";
import {
  AlertTriangle,
  BellRing,
  CheckCheck,
  Download,
  FileText,
  Image as ImageIcon,
  Info,
  Loader2,
  Menu,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  Paperclip,
  Route,
  Search,
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
import { AttachmentLightbox, type LightboxAttachment } from "@/components/chat/AttachmentLightbox";

export interface DispatchChatAttachment {
  url: string;
  originalName: string;
  mimeType: string;
  size: number;
}

export interface DispatchChatMessage {
  id: string;
  threadId?: string | null;
  dispatcherId?: string | null;
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

export interface DispatchChatContext {
  threadId?: string;
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

export interface DispatchChatThreadSummary {
  id: string;
  dispatcher: {
    id: string;
    name: string;
    email?: string;
    avatar?: string | null;
    isActive?: boolean;
  };
  driver: {
    id: string;
    name: string;
    email?: string;
    avatar?: string | null;
    isActive?: boolean;
  };
  unreadCount: number;
  lastMessageAt?: string | null;
  lastMessagePreview?: string;
  lastMessageType?: "message" | "system" | null;
}

interface DispatchChatThreadCacheEntry {
  messages: DispatchChatMessage[];
  systemEvents: DispatchChatSystemEvent[];
  context: DispatchChatContext | null;
  unreadCount: number;
  loadedAt: number;
}

interface DispatchChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  driverId: string | null | undefined;
  participantName?: string;
  onUnreadChange?: (count: number) => void;
  // Optional server-authorized thread seed used by contextual entry points
  // such as Available Loads → Message Creator. Existing callers can omit it.
  initialThread?: DispatchChatThreadSummary | null;
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

// These events are persisted as exact dispatcher↔driver private-thread system
// messages. Their generic Notification copies are user-wide and must never be
// merged into whichever private conversation happens to be open.
const PRIVATE_THREAD_SYSTEM_ONLY_NOTIFICATION_TYPES = new Set([
  "driver_assigned",
  "driver_request_approved",
  "driver_request_rejected",
]);

// These operational notifications may still appear in Dispatch Chat for
// compatibility, but ONLY when their payload proves ownership of the exact
// dispatcher↔driver conversation. Ambiguous notifications stay in the normal
// Notification Center instead of being guessed into a private chat.
const EXPLICIT_THREAD_SCOPED_NOTIFICATION_TYPES = new Set([
  "driver_tracker_geofence_alert",
  "driver_tracker_place_visit",
  "proof_submitted",
  "delivery_confirmed",
]);

const RELEVANT_NOTIFICATION_TYPES = new Set([
  "driver_dispatch_alert",
  "driver_tracker_offline_alert",
  ...EXPLICIT_THREAD_SCOPED_NOTIFICATION_TYPES,
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

export function AttachmentView({
  attachment,
  mine,
  onOpenMedia,
}: {
  attachment: DispatchChatAttachment;
  mine: boolean;
  onOpenMedia: (attachment: LightboxAttachment) => void;
}) {
  const isImage = attachment.mimeType?.startsWith("image/");
  const isVideo = attachment.mimeType?.startsWith("video/");

  if (isImage) {
    return (
      <button
        type="button"
        onClick={() =>
          onOpenMedia({ src: attachment.url, type: "image", name: attachment.originalName })
        }
        className="mt-2 block w-full overflow-hidden rounded-xl border border-white/15 bg-black/10 text-left"
      >
        <img
          src={attachment.url}
          alt={attachment.originalName}
          className="max-h-52 max-w-full object-contain"
        />
        <div
          className={`flex items-center justify-between gap-2 px-3 py-2 text-[10px] ${mine ? "text-emerald-50/90" : "text-muted-foreground"
            }`}
        >
          <span className="min-w-0 flex-1 break-all text-left wrap-anywhere">{attachment.originalName}</span>
          <span className="shrink-0">{bytesLabel(attachment.size)}</span>
        </div>
      </button>
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
          className={`flex items-center justify-between gap-2 px-3 py-2 text-[10px] ${mine ? "text-emerald-50/90" : "text-muted-foreground"
            }`}
        >
          <span className="min-w-0 flex-1 break-all text-left wrap-anywhere">{attachment.originalName}</span>
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
      className={`mt-2 flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors ${mine
          ? "border-white/15 bg-white/10 hover:bg-white/15"
          : "border-border/60 bg-background/70 hover:bg-muted/60"
        }`}
    >
      <div
        className={`size-9 rounded-lg flex items-center justify-center shrink-0 ${mine ? "bg-white/15" : "bg-emerald-500/10"
          }`}
      >
        <FileText
          className={`size-4 ${mine ? "text-white" : "text-emerald-600 dark:text-emerald-400"
            }`}
        />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold break-all wrap-anywhere">
          {attachment.originalName}
        </p>
        <p
          className={`text-[10px] ${mine ? "text-emerald-50/75" : "text-muted-foreground"
            }`}
        >
          {bytesLabel(attachment.size)}
        </p>
      </div>
      <Download className="size-4 shrink-0 opacity-70" />
    </a>
  );
}

export function SystemEventCard({ event }: { event: DispatchChatSystemEvent }) {
  const isAlert = event.kind === "alert";
  const response = event.metadata?.response;
  const destination = event.metadata?.destinationName;
  const destinationType = event.metadata?.destinationType;
  const dispatchAddress = String(event.metadata?.address ?? "").trim();
  const dispatcherMessage = String(
    event.metadata?.dispatcherMessage ?? "",
  ).trim();
  const loadNumber = event.metadata?.loadNumber;
  const isDispatchAlert =
    event.notificationType === "driver_dispatch_alert";
  const isLocationSilence =
    event.notificationType === "driver_tracker_offline_alert";
  const isStatusRequestApproved =
    event.notificationType === "driver_status_request_approved";
  const isStatusRequestRejected =
    event.notificationType === "driver_status_request_rejected";
  const isStatusRequestDecision =
    isStatusRequestApproved || isStatusRequestRejected;
  const awaitingReassignment =
    Boolean(event.metadata?.awaitingReassignment);
  const requestedStatusLabel = String(
    event.metadata?.requestedStatusLabel ??
      (event.metadata?.requestedStatus === "maintenance"
        ? "In Shop"
        : event.metadata?.requestedStatus === "on_leave"
          ? "On Leave"
          : "Status Change"),
  );
  const decisionReason = String(
    event.metadata?.decisionReason ?? "",
  ).trim();
  const activeLoadCount = Math.max(
    0,
    Number(event.metadata?.activeLoadCount ?? 0),
  );
  const minutesWithoutLocation =
    event.metadata?.minutesWithoutLocation;
  const loadNumbers = Array.isArray(event.metadata?.loadNumbers)
    ? event.metadata.loadNumbers
    : [];

  const destinationTypeLabel =
    destinationType === "specific-shop"
      ? "Specific Shop"
      : destinationType === "carshop"
        ? "Carshop"
        : destinationType === "site"
          ? "Site"
          : destinationType
            ? String(destinationType)
            : "";

  return (
    <div className="flex w-full justify-center py-1">
      <div
        className={`w-full max-w-xl rounded-2xl border px-4 py-3 text-center ${
          isStatusRequestRejected
            ? "border-red-500/45 bg-red-500/[0.08] shadow-[0_0_0_1px_rgba(239,68,68,0.06)]"
            : isStatusRequestApproved
              ? awaitingReassignment
                ? "border-amber-400/45 bg-amber-500/[0.08] shadow-[0_0_0_1px_rgba(245,158,11,0.06)]"
                : "border-emerald-500/35 bg-emerald-500/[0.07]"
              : isAlert
                ? "border-amber-400/50 bg-amber-500/10 shadow-[0_0_0_1px_rgba(245,158,11,0.08)]"
                : "border-emerald-500/35 bg-emerald-500/[0.07]"
        }`}
      >
        <div className="flex items-center justify-center gap-2">
          {isStatusRequestRejected ? (
            <AlertTriangle className="size-4 text-red-500" />
          ) : isStatusRequestApproved ? (
            <CheckCheck
              className={`size-4 ${
                awaitingReassignment
                  ? "text-amber-500"
                  : "text-emerald-500"
              }`}
            />
          ) : isAlert ? (
            <AlertTriangle className="size-4 text-amber-500" />
          ) : (
            <BellRing className="size-4 text-emerald-500" />
          )}
          <span
            className={`text-[11px] font-black uppercase tracking-[0.18em] ${
              isStatusRequestRejected
                ? "text-red-600 dark:text-red-400"
                : isStatusRequestApproved && awaitingReassignment
                  ? "text-amber-600 dark:text-amber-400"
                  : isStatusRequestApproved
                    ? "text-emerald-600 dark:text-emerald-400"
                    : isAlert
                      ? "text-amber-600 dark:text-amber-400"
                      : "text-emerald-600 dark:text-emerald-400"
            }`}
          >
            {isStatusRequestDecision
              ? "Dispatch Decision"
              : isLocationSilence
                ? "GPS Safety Alert"
                : isAlert
                  ? "Dispatch Alert"
                  : "Operational Update"}
          </span>
        </div>

        <p className="mt-1.5 break-words text-[15px] font-black text-foreground [overflow-wrap:anywhere]">
          {event.title}
        </p>
        {event.message && !isDispatchAlert && !isStatusRequestDecision && (
          <p className="mx-auto mt-1 max-w-lg break-words text-[12.5px] leading-relaxed text-muted-foreground [overflow-wrap:anywhere]">
            {event.message}
          </p>
        )}

        {isDispatchAlert && (
          <div className="mx-auto mt-3 w-full max-w-lg rounded-xl border border-amber-500/20 bg-background/55 p-3 text-left">
            <div className="space-y-2.5">
              <div>
                <p className="text-[10.5px] font-black uppercase tracking-[0.14em] text-muted-foreground">
                  Destination
                </p>
                <p className="mt-0.5 break-words text-[12.5px] font-semibold text-foreground [overflow-wrap:anywhere]">
                  {destination || "Not provided"}
                </p>
                {destinationTypeLabel && (
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    Type: {destinationTypeLabel}
                  </p>
                )}
              </div>

              <div>
                <p className="text-[10.5px] font-black uppercase tracking-[0.14em] text-muted-foreground">
                  Address / Directions
                </p>
                <p className="mt-0.5 whitespace-pre-wrap break-words text-[12.5px] leading-relaxed text-foreground [overflow-wrap:anywhere]">
                  {dispatchAddress || "No address or directions provided."}
                </p>
              </div>

              <div>
                <p className="text-[10.5px] font-black uppercase tracking-[0.14em] text-muted-foreground">
                  Message
                </p>
                <p className="mt-0.5 whitespace-pre-wrap break-words text-[12.5px] leading-relaxed text-foreground [overflow-wrap:anywhere]">
                  {dispatcherMessage || "No additional instruction provided."}
                </p>
              </div>
            </div>
          </div>
        )}

        {isStatusRequestDecision && (
          <div
            className={`mx-auto mt-3 w-full max-w-lg rounded-xl border p-3 text-left ${
              isStatusRequestRejected
                ? "border-red-500/20 bg-background/55"
                : awaitingReassignment
                  ? "border-amber-500/20 bg-background/55"
                  : "border-emerald-500/20 bg-background/55"
            }`}
          >
            <div className="space-y-2.5">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div>
                  <p className="text-[10.5px] font-black uppercase tracking-[0.14em] text-muted-foreground">
                    Request
                  </p>
                  <p className="mt-0.5 text-[12.5px] font-semibold text-foreground">
                    {requestedStatusLabel}
                  </p>
                </div>

                <div>
                  <p className="text-[10.5px] font-black uppercase tracking-[0.14em] text-muted-foreground">
                    Decision
                  </p>
                  <p
                    className={`mt-0.5 text-[12.5px] font-black ${
                      isStatusRequestRejected
                        ? "text-red-600 dark:text-red-400"
                        : awaitingReassignment
                          ? "text-amber-700 dark:text-amber-400"
                          : "text-emerald-700 dark:text-emerald-400"
                    }`}
                  >
                    {isStatusRequestRejected
                      ? "Not Approved"
                      : awaitingReassignment
                        ? "Approved — Reassignment Required"
                        : "Approved"}
                  </p>
                </div>
              </div>

              {awaitingReassignment && (
                <div>
                  <p className="text-[10.5px] font-black uppercase tracking-[0.14em] text-muted-foreground">
                    Next Step
                  </p>
                  <p className="mt-0.5 text-[12.5px] leading-relaxed text-foreground">
                    Dispatch is clearing or reassigning{" "}
                    {activeLoadCount || "your"} active load
                    {activeLoadCount === 1 ? "" : "s"}. Your requested
                    Dispatch Status will apply automatically after those
                    loads are cleared.
                  </p>
                </div>
              )}

              {decisionReason && (
                <div>
                  <p className="text-[10.5px] font-black uppercase tracking-[0.14em] text-muted-foreground">
                    Reason
                  </p>
                  <p className="mt-0.5 whitespace-pre-wrap break-words text-[12.5px] leading-relaxed text-foreground [overflow-wrap:anywhere]">
                    {decisionReason}
                  </p>
                </div>
              )}

              {event.message && (
                <div>
                  <p className="text-[10.5px] font-black uppercase tracking-[0.14em] text-muted-foreground">
                    Message
                  </p>
                  <p className="mt-0.5 whitespace-pre-wrap break-words text-[12.5px] leading-relaxed text-muted-foreground [overflow-wrap:anywhere]">
                    {event.message}
                  </p>
                </div>
              )}
            </div>

            {loadNumbers.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {loadNumbers.map((number: string) => (
                  <span
                    key={number}
                    className="max-w-full whitespace-normal break-all rounded-full border border-border/60 bg-background/70 px-2 py-1 text-center text-[11px] font-semibold [overflow-wrap:anywhere]"
                  >
                    Load {number}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {isLocationSilence && (
          <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5">
            {Number.isFinite(Number(minutesWithoutLocation)) && (
              <span className="rounded-full border border-red-500/30 bg-red-500/10 px-2 py-1 text-[11px] font-black text-red-700 dark:text-red-300">
                No GPS for {Number(minutesWithoutLocation)} min
              </span>
            )}
            {loadNumbers.map((number: string) => (
              <span
                key={number}
                className="max-w-full whitespace-normal break-all rounded-full border border-border/60 bg-background/70 px-2 py-1 text-center text-[11px] font-semibold [overflow-wrap:anywhere]"
              >
                Load {number}
              </span>
            ))}
          </div>
        )}

        {(destination || loadNumber || (response && response !== "pending")) && (
          <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5">
            {destination && (
              <span className="max-w-full whitespace-normal break-words rounded-full border border-amber-500/25 bg-amber-500/10 px-2 py-1 text-center text-[11px] font-semibold text-amber-700 [overflow-wrap:anywhere] dark:text-amber-300">
                Destination: {destination}
              </span>
            )}
            {loadNumber && (
              <span className="max-w-full whitespace-normal break-all rounded-full border border-border/60 bg-background/60 px-2 py-1 text-center text-[11px] font-semibold [overflow-wrap:anywhere]">
                Load {loadNumber}
              </span>
            )}
            {response && response !== "pending" && (
              <span className="rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2 py-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                Driver: {String(response).replace(/_/g, " ")}
              </span>
            )}
          </div>
        )}

        <p className="mt-2 text-[10.5px] font-medium text-muted-foreground/70">
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


export type ConversationDetailsTab = "search" | "media" | "files";

export type ConversationDetailsSearchResult = {
  id: string;
  author: string;
  createdAt: string;
  body: string;
  attachments: DispatchChatAttachment[];
};

type ConversationAttachmentItem = {
  attachment: DispatchChatAttachment;
  message: DispatchChatMessage;
};

function DispatcherConversationList({
  threads,
  selectedThreadId,
  loading,
  collapsed,
  onToggleCollapsed,
  onSelect,
  onCloseMobile,
  mobile = false,
}: {
  threads: DispatchChatThreadSummary[];
  selectedThreadId: string | null;
  loading: boolean;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onSelect: (thread: DispatchChatThreadSummary) => void;
  onCloseMobile?: () => void;
  mobile?: boolean;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col bg-muted/[0.12]">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border/60 px-2.5 py-2.5">
        {!collapsed && (
          <div className="min-w-0 px-1">
            <p className="truncate text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground">
              Conversations
            </p>
            <p className="truncate text-[9px] text-muted-foreground/70">
              Private by dispatcher
            </p>
          </div>
        )}
        <div className={`flex items-center gap-1 ${collapsed ? "mx-auto" : ""}`}>
          {loading && <Loader2 className="size-3.5 animate-spin text-emerald-500" />}
          {mobile ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={onCloseMobile}
              aria-label="Close dispatcher conversations"
            >
              <X className="size-4" />
            </Button>
          ) : (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={onToggleCollapsed}
              aria-label={collapsed ? "Expand dispatcher conversations" : "Collapse dispatcher conversations"}
            >
              {collapsed ? <ChevronRight className="size-4" /> : <ChevronLeft className="size-4" />}
            </Button>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2 [scrollbar-width:thin]">
        {threads.length > 0 ? (
          <div className="space-y-1.5">
            {threads.map((thread) => {
              const selected = thread.id === selectedThreadId;
              const avatar = participantAvatarSrc(thread.dispatcher.avatar);
              return (
                <button
                  key={thread.id}
                  type="button"
                  title={collapsed ? thread.dispatcher.name || "Dispatcher" : undefined}
                  onClick={() => onSelect(thread)}
                  className={`relative flex w-full items-center rounded-xl border text-left transition-all ${
                    collapsed
                      ? "justify-center px-1.5 py-2"
                      : "gap-2 px-2.5 py-2.5"
                  } ${
                    selected
                      ? "border-emerald-500/40 bg-emerald-500/10 shadow-sm"
                      : "border-transparent hover:border-border/70 hover:bg-background/70"
                  }`}
                >
                  <div className="relative shrink-0">
                    <Avatar className="size-9 border border-border/60">
                      {avatar && (
                        <AvatarImage src={avatar} alt={thread.dispatcher.name} className="object-cover" />
                      )}
                      <AvatarFallback className="bg-emerald-500/10 text-[10px] font-black text-emerald-600 dark:text-emerald-400">
                        {nameInitials(thread.dispatcher.name)}
                      </AvatarFallback>
                    </Avatar>
                    {collapsed && thread.unreadCount > 0 && (
                      <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-600 px-1 text-[8px] font-black text-white">
                        {thread.unreadCount > 9 ? "9+" : thread.unreadCount}
                      </span>
                    )}
                  </div>

                  {!collapsed && (
                    <div className="min-w-0 flex-1">
                      <div className="flex min-w-0 items-center gap-1.5">
                        <p className="truncate text-xs font-black">
                          {thread.dispatcher.name || "Dispatcher"}
                        </p>
                        {thread.dispatcher.isActive === false && (
                          <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[8px] font-bold uppercase text-muted-foreground">
                            Inactive
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 line-clamp-2 text-[9px] leading-snug text-muted-foreground">
                        {thread.lastMessagePreview || "Private conversation"}
                      </p>
                    </div>
                  )}

                  {!collapsed && thread.unreadCount > 0 && (
                    <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-emerald-600 px-1 text-[9px] font-black text-white">
                      {thread.unreadCount > 99 ? "99+" : thread.unreadCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ) : (
          <div className={`rounded-xl border border-dashed border-border/70 px-2 py-3 text-center text-[10px] text-muted-foreground ${collapsed ? "hidden" : "block"}`}>
            No dispatcher conversations yet.
          </div>
        )}
      </div>
    </div>
  );
}

export function ConversationDetailsPanel({
  counterpartName,
  counterpartRole,
  messages,
  systemEvents,
  loading,
  truncated,
  tab,
  onTabChange,
  query,
  onQueryChange,
  onSearchResultSelect,
  onClose,
}: {
  counterpartName: string;
  counterpartRole: "Driver" | "Dispatcher";
  messages: DispatchChatMessage[];
  systemEvents: DispatchChatSystemEvent[];
  loading: boolean;
  truncated: boolean;
  tab: ConversationDetailsTab;
  onTabChange: (tab: ConversationDetailsTab) => void;
  query: string;
  onQueryChange: (value: string) => void;
  onSearchResultSelect?: (
    result: ConversationDetailsSearchResult,
  ) => void | Promise<void>;
  onClose: () => void;
}) {
  const attachmentItems = React.useMemo<ConversationAttachmentItem[]>(
    () =>
      messages.flatMap((message) =>
        (message.attachments ?? []).map((attachment) => ({ attachment, message })),
      ),
    [messages],
  );

  const mediaItems = React.useMemo(
    () =>
      attachmentItems.filter(({ attachment }) =>
        attachment.mimeType?.startsWith("image/") || attachment.mimeType?.startsWith("video/"),
      ),
    [attachmentItems],
  );

  const fileItems = React.useMemo(
    () =>
      attachmentItems.filter(({ attachment }) =>
        !attachment.mimeType?.startsWith("image/") && !attachment.mimeType?.startsWith("video/"),
      ),
    [attachmentItems],
  );

  const normalizedQuery = query.trim().toLowerCase();
  const searchResults = React.useMemo(() => {
    if (!normalizedQuery) return [];

    const messageRows = messages
      .filter((message) => {
        const systemTitle = message.systemEvent?.title ?? "";
        const systemMessage = message.systemEvent?.message ?? "";
        const attachmentNames = (message.attachments ?? [])
          .map((attachment) => attachment.originalName)
          .join(" ");
        return [
          message.content,
          message.sender?.name,
          systemTitle,
          systemMessage,
          attachmentNames,
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);
      })
      .map((message) => ({
        id: `message:${message.id}`,
        author: message.sender?.name || (message.senderRole === "driver" ? "Driver" : "Dispatch"),
        createdAt: message.createdAt,
        body: message.content || message.systemEvent?.message || message.systemEvent?.title || "Attachment",
        attachments: message.attachments ?? [],
      }));

    const eventRows = systemEvents
      .filter((event) =>
        [event.title, event.message, event.notificationType]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery),
      )
      .map((event) => ({
        id: `event:${event.id}`,
        author: "Dispatch update",
        createdAt: event.createdAt,
        body: [event.title, event.message].filter(Boolean).join(" — "),
        attachments: [] as DispatchChatAttachment[],
      }));

    return ([...messageRows, ...eventRows] as ConversationDetailsSearchResult[]).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }, [messages, normalizedQuery, systemEvents]);

  return (
    <div className="flex h-full min-h-0 flex-col" style={{ background: "var(--bg-base)" }}>
      <div className="shrink-0 border-b border-border/60 px-4 py-3" style={{ background: "var(--bg-elevated)" }}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-black">Conversation Details</p>
            <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
              {counterpartRole}: {counterpartName}
            </p>
          </div>
          <Button type="button" variant="ghost" size="icon" className="size-8 shrink-0" onClick={onClose} aria-label="Close conversation details">
            <X className="size-4" />
          </Button>
        </div>
      </div>

      <div className="shrink-0 border-b border-border/60 p-2" style={{ background: "var(--bg-base)" }}>
        <div className="grid grid-cols-3 gap-1 rounded-xl border border-border/50 p-1" style={{ background: "var(--bg-elevated)" }}>
          {([
            ["search", "Search", Search],
            ["media", `Media ${mediaItems.length}`, ImageIcon],
            ["files", `Files ${fileItems.length}`, FileText],
          ] as const).map(([key, label, Icon]) => (
            <button
              key={key}
              type="button"
              onClick={() => onTabChange(key)}
              className={`flex min-w-0 items-center justify-center gap-1 rounded-lg px-2 py-2 text-[10px] font-bold transition-colors ${
                tab === key
                  ? "border border-border/60 text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              style={{
                background:
                  tab === key
                    ? "var(--bg-base)"
                    : "transparent",
              }}
            >
              <Icon className="size-3.5 shrink-0" />
              <span className="truncate">{label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 [scrollbar-width:thin]">
        {loading ? (
          <div className="flex h-32 items-center justify-center text-xs text-muted-foreground">
            <Loader2 className="mr-2 size-4 animate-spin" /> Loading conversation history…
          </div>
        ) : tab === "search" ? (
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(event) => onQueryChange(event.target.value)}
                placeholder="Search messages or filenames…"
                className="h-10 w-full rounded-xl border border-border/70 pl-9 pr-3 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
                style={{ background: "var(--bg-elevated)" }}
              />
            </div>

            {!normalizedQuery ? (
              <div className="rounded-xl border border-dashed border-border/70 px-3 py-5 text-center text-[10px] leading-relaxed text-muted-foreground">
                Search message text, system updates, sender names, or attachment filenames in this private conversation.
              </div>
            ) : searchResults.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border/70 px-3 py-5 text-center text-[10px] text-muted-foreground">
                No matching conversation text found.
              </div>
            ) : (
              <div className="space-y-2">
                {searchResults.map((result) => (
                  <button
                    key={result.id}
                    type="button"
                    onClick={() => {
                      void onSearchResultSelect?.(result);
                    }}
                    className="w-full rounded-xl border border-border/60 p-3 text-left transition-colors hover:border-emerald-500/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/45"
                    style={{ background: "var(--bg-elevated)" }}
                    title="Open this result in the conversation"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-[10px] font-black">{result.author}</p>
                      <p className="shrink-0 text-[9px] text-muted-foreground">
                        {new Date(result.createdAt).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                    <p className="mt-1 line-clamp-4 whitespace-pre-wrap break-words text-[11px] leading-relaxed text-muted-foreground [overflow-wrap:anywhere]">
                      {result.body}
                    </p>
                    {result.attachments.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {result.attachments.map((attachment, index) => (
                          <span
                            key={`${result.id}:${index}`}
                            className="max-w-full truncate rounded-md border border-border/50 px-1.5 py-0.5 text-[9px] text-muted-foreground"
                            style={{ background: "var(--bg-base)" }}
                          >
                            {attachment.originalName}
                          </span>
                        ))}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : tab === "media" ? (
          mediaItems.length > 0 ? (
            <div className="grid grid-cols-2 gap-2">
              {mediaItems.map(({ attachment, message }, index) => (
                <a
                  key={`${message.id}:${attachment.originalName}:${index}`}
                  href={attachment.url}
                  target="_blank"
                  rel="noreferrer"
                  className="group overflow-hidden rounded-xl border border-border/60"
                  style={{ background: "var(--bg-elevated)" }}
                >
                  {attachment.mimeType?.startsWith("image/") ? (
                    <img src={attachment.url} alt={attachment.originalName} className="aspect-square w-full object-cover transition-transform group-hover:scale-[1.02]" />
                  ) : (
                    <video src={attachment.url} preload="metadata" className="aspect-square w-full bg-black object-cover" />
                  )}
                  <div className="p-2">
                    <p className="truncate text-[9px] font-bold">{attachment.originalName}</p>
                    <p className="mt-0.5 text-[8px] text-muted-foreground">{new Date(message.createdAt).toLocaleDateString()}</p>
                  </div>
                </a>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border/70 px-3 py-5 text-center text-[10px] text-muted-foreground">
              No images or videos have been shared in this conversation.
            </div>
          )
        ) : fileItems.length > 0 ? (
          <div className="space-y-2">
            {fileItems.map(({ attachment, message }, index) => (
              <a
                key={`${message.id}:${attachment.originalName}:${index}`}
                href={attachment.url}
                target="_blank"
                rel="noreferrer"
                className="flex min-w-0 items-center gap-3 rounded-xl border border-border/60 p-3 transition-colors hover:border-emerald-500/25"
                style={{ background: "var(--bg-elevated)" }}
              >
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <FileText className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[10px] font-black">{attachment.originalName}</p>
                  <p className="mt-0.5 text-[9px] text-muted-foreground">
                    {bytesLabel(attachment.size)} · {new Date(message.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <Download className="size-3.5 shrink-0 text-muted-foreground" />
              </a>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border/70 px-3 py-5 text-center text-[10px] text-muted-foreground">
            No files have been shared in this conversation.
          </div>
        )}

        {truncated && (
          <div className="mt-3 rounded-xl border border-amber-500/25 bg-amber-500/[0.06] px-3 py-2 text-[9px] leading-relaxed text-amber-700 dark:text-amber-300">
            This conversation is very large. Search currently covers the most recent 2,000 messages to keep the dialog responsive.
          </div>
        )}
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
  initialThread,
}: DispatchChatDialogProps) {
  const { getToken, isSignedIn } = useAuth();
  const { user } = useUser();
  const [messages, setMessages] = React.useState<DispatchChatMessage[]>([]);
  const [systemEvents, setSystemEvents] = React.useState<
    DispatchChatSystemEvent[]
  >([]);
  const [threadContext, setThreadContext] =
    React.useState<DispatchChatContext | null>(null);
  const [threads, setThreads] = React.useState<DispatchChatThreadSummary[]>([]);
  const [selectedThreadId, setSelectedThreadId] = React.useState<string | null>(null);
  const [threadsLoading, setThreadsLoading] = React.useState(false);
  const [draft, setDraft] = React.useState("");
  const [selectedFiles, setSelectedFiles] = React.useState<File[]>([]);
  const [emojiOpen, setEmojiOpen] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [historyState, setHistoryState] = React.useState<
    "loading" | "ready" | "error"
  >("loading");
  const [isSending, setIsSending] = React.useState(false);
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [conversationDrawerCollapsed, setConversationDrawerCollapsed] = React.useState(false);
  const [conversationDrawerMobileOpen, setConversationDrawerMobileOpen] = React.useState(false);
  const [detailsOpen, setDetailsOpen] = React.useState(false);
  const [detailsTab, setDetailsTab] = React.useState<ConversationDetailsTab>("search");
  const [detailsQuery, setDetailsQuery] = React.useState("");
  const [detailsMessages, setDetailsMessages] = React.useState<DispatchChatMessage[]>([]);
  const [detailsSystemEvents, setDetailsSystemEvents] = React.useState<DispatchChatSystemEvent[]>([]);
  const [detailsLoading, setDetailsLoading] = React.useState(false);
  const [detailsTruncated, setDetailsTruncated] = React.useState(false);
  const [isLatestPositionReady, setIsLatestPositionReady] =
    React.useState(false);
  const [lightboxAttachment, setLightboxAttachment] =
    React.useState<LightboxAttachment | null>(null);
  const [highlightedTimelineItemId, setHighlightedTimelineItemId] =
    React.useState<string | null>(null);
  const searchJumpActiveRef = React.useRef(false);
  const searchJumpClearTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const timelineScrollRef = React.useRef<HTMLDivElement | null>(null);
  const timelineContentRef = React.useRef<HTMLDivElement | null>(null);
  const latestPositionFrameRef = React.useRef<number | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const openRef = React.useRef(open);
  const selectedThreadIdRef = React.useRef<string | null>(selectedThreadId);
  const threadCacheRef = React.useRef<Map<string, DispatchChatThreadCacheEntry>>(
    new Map(),
  );
  const detailsArchiveCacheRef = React.useRef<Map<string, { messages: DispatchChatMessage[]; systemEvents: DispatchChatSystemEvent[]; truncated: boolean }>>(
    new Map(),
  );
  const detailsRequestKeyRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    openRef.current = open;
  }, [open]);

  React.useEffect(() => {
    return () => {
      if (searchJumpClearTimerRef.current) {
        clearTimeout(searchJumpClearTimerRef.current);
      }
    };
  }, []);

  React.useEffect(() => {
    selectedThreadIdRef.current = selectedThreadId;
  }, [selectedThreadId]);

  React.useEffect(() => {
    if (open) {
      setIsLatestPositionReady(false);
    }
  }, [driverId, open]);

  const currentUserId = user?.id ?? null;
  const currentUserIsDriver = user?.role === "driver";
  const activeThreadId = currentUserIsDriver
    ? selectedThreadId
    : threadContext?.threadId ?? null;
  const selectedThread = React.useMemo(
    () => threads.find((thread) => thread.id === selectedThreadId) ?? null,
    [threads, selectedThreadId],
  );
  const staffConversationCacheKey =
    !currentUserIsDriver && driverId ? `staff:${String(driverId)}` : null;

  const updateUnread = React.useCallback((count: number) => {
    setUnreadCount(Math.max(0, count));
  }, []);

  const applyThreadCache = React.useCallback(
    (entry: DispatchChatThreadCacheEntry) => {
      setMessages(entry.messages);
      setSystemEvents(entry.systemEvents);
      setThreadContext(entry.context);
      updateUnread(entry.unreadCount);
      setHistoryState("ready");
      // Re-run the existing verified "open at latest" positioning for the
      // newly selected cached thread. The thread content itself is available
      // immediately, so no loading screen is required.
      setIsLatestPositionReady(false);
    },
    [updateUnread],
  );

  const cacheThreadSnapshot = React.useCallback(
    (
      threadId: string,
      snapshot: Omit<DispatchChatThreadCacheEntry, "loadedAt">,
    ) => {
      threadCacheRef.current.set(threadId, {
        ...snapshot,
        loadedAt: Date.now(),
      });
    },
    [],
  );

  const selectDispatcherThread = React.useCallback(
    (thread: DispatchChatThreadSummary) => {
      if (thread.id === selectedThreadIdRef.current) {
        setConversationDrawerMobileOpen(false);
        return;
      }

      // Update the race guard synchronously before React commits state so an
      // older request cannot overwrite the newly selected private thread.
      selectedThreadIdRef.current = thread.id;
      setSelectedThreadId(thread.id);

      const cached = threadCacheRef.current.get(thread.id);
      if (cached) {
        applyThreadCache(cached);
        setIsLoading(false);
      } else {
        setMessages([]);
        setSystemEvents([]);
        setThreadContext(null);
        setHistoryState("loading");
        setIsLoading(true);
        setIsLatestPositionReady(false);
      }

      setDraft("");
      setSelectedFiles([]);
      setEmojiOpen(false);
      setDetailsQuery("");
      setDetailsTab("search");
      setConversationDrawerMobileOpen(false);
    },
    [applyThreadCache],
  );

  // Synchronize the sidebar/header unread badge only after this component's
  // own unread state has committed. This avoids cross-component setState
  // during render/update processing.
  React.useEffect(() => {
    onUnreadChange?.(unreadCount);
  }, [unreadCount, onUnreadChange]);

  const fetchThreads = React.useCallback(async () => {
    if (!currentUserIsDriver || !isSignedIn) return;
    setThreadsLoading(true);
    try {
      const token = await getToken();
      if (!token) return;
      const response = await apiClient.get(
        "/api/driver-tracking/dispatch-chat/threads",
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const nextThreads = Array.isArray(response.data?.data?.threads)
        ? (response.data.data.threads as DispatchChatThreadSummary[])
        : [];
      setThreads((currentThreads) => {
        const selectedId = selectedThreadIdRef.current;
        const selectedSeed = selectedId
          ? currentThreads.find((thread) => thread.id === selectedId) ?? null
          : null;

        // A newly opened load-creator thread has lastMessageAt=null until the
        // first message, so /threads intentionally does not list it yet. Keep
        // that exact server-authorized seed locally instead of replacing it
        // with an unrelated older dispatcher conversation.
        if (
          selectedSeed &&
          !nextThreads.some((thread) => thread.id === selectedSeed.id)
        ) {
          return [selectedSeed, ...nextThreads];
        }
        return nextThreads;
      });
      setSelectedThreadId((current) => {
        if (current) return current;
        const nextId = nextThreads[0]?.id ?? null;
        selectedThreadIdRef.current = nextId;
        return nextId;
      });
    } catch (error: any) {
      toast.error(
        error.response?.data?.message ||
          error.message ||
          "Could not load dispatcher conversations",
      );
    } finally {
      setThreadsLoading(false);
    }
  }, [currentUserIsDriver, getToken, isSignedIn]);

  const markRead = React.useCallback(async () => {
    if (!driverId || !isSignedIn) return;
    const threadId = currentUserIsDriver
      ? selectedThreadId
      : threadContext?.threadId ?? null;
    if (currentUserIsDriver && !threadId) return;

    try {
      const token = await getToken();
      if (!token) return;
      await apiClient.post(
        `/api/driver-tracking/dispatch-chat/${encodeURIComponent(driverId)}/read`,
        threadId ? { threadId } : {},
        { headers: { Authorization: `Bearer ${token}` } },
      );
      updateUnread(0);
      if (threadId) {
        const cachedEntry = threadCacheRef.current.get(threadId);
        if (cachedEntry) {
          threadCacheRef.current.set(threadId, {
            ...cachedEntry,
            unreadCount: 0,
          });
        }

        setThreads((current) =>
          current.map((thread) =>
            thread.id === threadId
              ? { ...thread, unreadCount: 0 }
              : thread,
          ),
        );
      }
    } catch {
      // A temporary read-state failure must not prevent the user from chatting.
    }
  }, [
    currentUserIsDriver,
    driverId,
    getToken,
    isSignedIn,
    selectedThreadId,
    threadContext?.threadId,
    updateUnread,
  ]);

  const fetchUnread = React.useCallback(async () => {
    if (!driverId || !isSignedIn) return;
    const threadId = currentUserIsDriver
      ? selectedThreadId
      : threadContext?.threadId ?? null;
    if (currentUserIsDriver && !threadId) {
      updateUnread(0);
      return;
    }

    try {
      const token = await getToken();
      if (!token) return;
      const response = await apiClient.get(
        `/api/driver-tracking/dispatch-chat/${encodeURIComponent(driverId)}/unread`,
        {
          headers: { Authorization: `Bearer ${token}` },
          params: threadId ? { threadId } : undefined,
        },
      );
      updateUnread(Number(response.data?.data?.unreadCount ?? 0));
    } catch {
      updateUnread(0);
    }
  }, [
    currentUserIsDriver,
    driverId,
    getToken,
    isSignedIn,
    selectedThreadId,
    threadContext?.threadId,
    updateUnread,
  ]);

  const fetchMessages = React.useCallback(async () => {
    if (!driverId || !isSignedIn) return;

    const requestedThreadId = currentUserIsDriver
      ? selectedThreadId
      : null;

    if (currentUserIsDriver && !requestedThreadId) {
      setMessages([]);
      setSystemEvents([]);
      setThreadContext(null);
      updateUnread(0);
      setHistoryState("ready");
      setIsLoading(false);
      setIsLatestPositionReady(true);
      return;
    }

    // Reopening a dispatcher tab that has already been loaded should feel
    // instant. Render ONLY that exact thread's cached snapshot, then refresh it
    // in the background. Never keep the previous dispatcher's visible messages
    // while a different thread is being selected.
    const requestedCacheKey = currentUserIsDriver
      ? requestedThreadId
      : staffConversationCacheKey;
    const cached = requestedCacheKey
      ? threadCacheRef.current.get(requestedCacheKey) ?? null
      : null;

    setHistoryState("loading");

    if (cached) {
      applyThreadCache(cached);
      setIsLoading(false);
    } else {
      setIsLoading(true);
      setIsLatestPositionReady(false);
    }

    try {
      const token = await getToken();
      if (!token) return;

      const response = await apiClient.get(
        `/api/driver-tracking/dispatch-chat/${encodeURIComponent(driverId)}/messages`,
        {
          headers: { Authorization: `Bearer ${token}` },
          params: {
            limit: 100,
            ...(requestedThreadId
              ? { threadId: requestedThreadId }
              : {}),
          },
        },
      );

      const payload = response.data?.data ?? {};
      const nextMessages = Array.isArray(payload.messages)
        ? (payload.messages as DispatchChatMessage[])
        : [];
      const nextContext = (payload.context ?? null) as DispatchChatContext | null;
      const historyDispatcherId = String(
        nextContext?.dispatcher?.id ?? payload.thread?.dispatcherId ?? "",
      );
      const nextSystemEvents = Array.isArray(payload.systemEvents)
        ? (payload.systemEvents as DispatchChatSystemEvent[]).filter((event) => {
            const eventType = String(event?.notificationType ?? "");

            if (PRIVATE_THREAD_SYSTEM_ONLY_NOTIFICATION_TYPES.has(eventType)) {
              return false;
            }

            if (EXPLICIT_THREAD_SCOPED_NOTIFICATION_TYPES.has(eventType)) {
              const metadata = event?.metadata ?? {};
              const ownerDispatcherId = String(
                metadata?.dispatcherId ??
                  metadata?.dispatchOwnerId ??
                  metadata?.sentByUserId ??
                  "",
              );
              const explicitDriverId = String(metadata?.driverId ?? "");

              // Defense in depth: even if an older backend accidentally returns
              // a generic operational notification, do not render it unless its
              // metadata proves ownership of this exact private conversation.
              if (
                !historyDispatcherId ||
                !ownerDispatcherId ||
                ownerDispatcherId !== historyDispatcherId
              ) {
                return false;
              }
              if (explicitDriverId && explicitDriverId !== String(driverId)) {
                return false;
              }
            }

            return true;
          })
        : [];
      const nextUnread = Math.max(
        0,
        Number(payload.unreadCount ?? 0),
      );

      const resolvedThreadId =
        payload.thread?.id ??
        payload.context?.threadId ??
        requestedThreadId ??
        null;
      const normalizedResolvedThreadId = resolvedThreadId
        ? String(resolvedThreadId)
        : null;

      if (normalizedResolvedThreadId) {
        const snapshot = {
          messages: nextMessages,
          systemEvents: nextSystemEvents,
          context: nextContext,
          unreadCount: nextUnread,
        };

        // Drivers cache by exact private thread. Dispatch caches by the selected
        // driver because each signed-in dispatcher has exactly one private
        // thread with that driver. This makes reopening a conversation instant
        // without mixing histories between drivers or dispatcher accounts.
        if (currentUserIsDriver) {
          cacheThreadSnapshot(normalizedResolvedThreadId, snapshot);
        } else if (staffConversationCacheKey) {
          cacheThreadSnapshot(staffConversationCacheKey, snapshot);
        }
      }

      // A response for Dispatcher A must never overwrite Dispatcher B after a
      // fast tab switch. The backend already enforces thread membership; this
      // is the UI race-condition guard for overlapping network requests.
      const isStillSelected =
        !currentUserIsDriver ||
        (normalizedResolvedThreadId !== null &&
          String(selectedThreadIdRef.current ?? "") ===
            normalizedResolvedThreadId);

      if (!isStillSelected) {
        return;
      }

      setMessages(nextMessages);
      setSystemEvents(nextSystemEvents);
      setThreadContext(nextContext);
      updateUnread(nextUnread);
      setHistoryState("ready");

      // The conversation is ready as soon as the history GET completes.
      // Do not keep the full-screen chat loader visible while a separate
      // mark-read request makes another network round trip.
      //
      // IMPORTANT: do NOT reset isLatestPositionReady here. For a cached
      // conversation, a background refresh can return the same number of
      // timeline items. Resetting readiness to false in that situation used to
      // leave the already-loaded history permanently opacity-0 because none of
      // the positioning effect dependencies necessarily changed. A newly
      // selected/uncached thread was already prepared as not-ready before the
      // request, and isLoading/timeline changes will run the positioning effect.
      setIsLoading(false);

      if (
        currentUserIsDriver &&
        normalizedResolvedThreadId &&
        normalizedResolvedThreadId !== selectedThreadId
      ) {
        selectedThreadIdRef.current = normalizedResolvedThreadId;
        setSelectedThreadId(normalizedResolvedThreadId);
      }

      // Mark only the exact private dispatcher↔driver thread that is STILL
      // selected, but keep this secondary write off the critical render path.
      // The user sees the conversation immediately after the history GET; the
      // read receipt completes quietly in the background.
      if (!currentUserIsDriver || normalizedResolvedThreadId) {
        const readBody = normalizedResolvedThreadId
          ? { threadId: normalizedResolvedThreadId }
          : {};

        if (
          !currentUserIsDriver ||
          String(selectedThreadIdRef.current ?? "") ===
            String(normalizedResolvedThreadId ?? "")
        ) {
          updateUnread(0);
        }

        if (normalizedResolvedThreadId) {
          const cacheKeys = currentUserIsDriver
            ? [normalizedResolvedThreadId]
            : [staffConversationCacheKey].filter(Boolean) as string[];

          for (const cacheKey of cacheKeys) {
            const cachedEntry = threadCacheRef.current.get(cacheKey);
            if (cachedEntry) {
              threadCacheRef.current.set(cacheKey, {
                ...cachedEntry,
                unreadCount: 0,
              });
            }
          }

          setThreads((current) =>
            current.map((thread) =>
              thread.id === normalizedResolvedThreadId
                ? { ...thread, unreadCount: 0 }
                : thread,
            ),
          );
        }

        void apiClient
          .post(
            `/api/driver-tracking/dispatch-chat/${encodeURIComponent(driverId)}/read`,
            readBody,
            { headers: { Authorization: `Bearer ${token}` } },
          )
          .catch(() => {
            // A temporary read-state failure must never block or hide chat
            // history. The next unread refresh/socket event will reconcile it.
          });
      }
    } catch (error: any) {
      const requestIsStillCurrent =
        !currentUserIsDriver ||
        String(selectedThreadIdRef.current ?? "") ===
          String(requestedThreadId ?? "");

      if (requestIsStillCurrent) {
        setHistoryState("error");
      }

      if (requestIsStillCurrent && !cached) {
        toast.error(
          error.response?.data?.message ||
            error.message ||
            "Could not load Suprah Dispatch Chat",
        );
      }
    } finally {
      const requestIsStillCurrent =
        !currentUserIsDriver ||
        String(selectedThreadIdRef.current ?? "") ===
          String(requestedThreadId ?? "");

      if (requestIsStillCurrent) {
        setIsLoading(false);
      }
    }
  }, [
    applyThreadCache,
    cacheThreadSnapshot,
    currentUserIsDriver,
    driverId,
    getToken,
    isSignedIn,
    selectedThreadId,
    staffConversationCacheKey,
    updateUnread,
  ]);

  const fetchConversationArchive = React.useCallback(async () => {
    if (!driverId || !activeThreadId || !isSignedIn) {
      setDetailsMessages([]);
      setDetailsSystemEvents([]);
      setDetailsLoading(false);
      setDetailsTruncated(false);
      return;
    }

    const conversationKey = `${driverId}:${activeThreadId}`;
    detailsRequestKeyRef.current = conversationKey;
    const cached = detailsArchiveCacheRef.current.get(conversationKey);
    if (cached) {
      setDetailsMessages(cached.messages);
      setDetailsSystemEvents(cached.systemEvents);
      setDetailsTruncated(cached.truncated);
      setDetailsLoading(false);
    } else {
      setDetailsLoading(true);
      setDetailsMessages([]);
      setDetailsSystemEvents([]);
      setDetailsTruncated(false);
    }

    try {
      const token = await getToken();
      if (!token) return;

      const messageMap = new Map<string, DispatchChatMessage>();
      const systemEventMap = new Map<string, DispatchChatSystemEvent>();
      let before: string | undefined;
      let hasMore = true;
      let pages = 0;
      const maxPages = 20;

      while (hasMore && pages < maxPages) {
        const response = await apiClient.get(
          `/api/driver-tracking/dispatch-chat/${encodeURIComponent(driverId)}/messages`,
          {
            headers: { Authorization: `Bearer ${token}` },
            params: {
              limit: 100,
              threadId: activeThreadId,
              ...(before ? { before } : {}),
            },
          },
        );

        const payload = response.data?.data ?? {};
        const pageMessages = Array.isArray(payload.messages)
          ? (payload.messages as DispatchChatMessage[])
          : [];

        for (const message of pageMessages) {
          messageMap.set(message.id, message);
        }
        const pageSystemEvents = Array.isArray(payload.systemEvents)
          ? (payload.systemEvents as DispatchChatSystemEvent[])
          : [];
        for (const event of pageSystemEvents) {
          systemEventMap.set(event.id, event);
        }

        hasMore = Boolean(payload.hasMore);
        pages += 1;

        const oldestCreatedAt = pageMessages[0]?.createdAt;
        if (!hasMore || !oldestCreatedAt || pageMessages.length === 0) break;
        before = oldestCreatedAt;
      }

      const nextMessages = [...messageMap.values()].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );
      const nextSystemEvents = [...systemEventMap.values()].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );
      const truncated = hasMore && pages >= maxPages;

      detailsArchiveCacheRef.current.set(conversationKey, {
        messages: nextMessages,
        systemEvents: nextSystemEvents,
        truncated,
      });

      if (detailsRequestKeyRef.current !== conversationKey) return;
      setDetailsMessages(nextMessages);
      setDetailsSystemEvents(nextSystemEvents);
      setDetailsTruncated(truncated);
    } catch (error: any) {
      if (detailsRequestKeyRef.current !== conversationKey || cached) return;
      toast.error(
        error.response?.data?.message ||
          error.message ||
          "Could not load conversation details",
      );
    } finally {
      if (detailsRequestKeyRef.current === conversationKey) {
        setDetailsLoading(false);
      }
    }
  }, [activeThreadId, driverId, getToken, isSignedIn]);

  React.useEffect(() => {
    if (!detailsOpen || !activeThreadId) return;
    setDetailsQuery("");
    setDetailsTab("search");
    void fetchConversationArchive();
  }, [activeThreadId, detailsOpen, fetchConversationArchive]);

  React.useEffect(() => {
    if (!detailsOpen || !activeThreadId || messages.length === 0) return;
    setDetailsMessages((current) => {
      const map = new Map<string, DispatchChatMessage>(
        current.map((message) => [message.id, message]),
      );
      for (const message of messages) map.set(message.id, message);
      return [...map.values()].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );
    });
  }, [activeThreadId, detailsOpen, messages]);

  React.useEffect(() => {
    if (!detailsOpen || !activeThreadId || systemEvents.length === 0) return;
    setDetailsSystemEvents((current) => {
      const map = new Map<string, DispatchChatSystemEvent>(
        current.map((event) => [event.id, event]),
      );
      for (const event of systemEvents) map.set(event.id, event);
      return [...map.values()].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );
    });
  }, [activeThreadId, detailsOpen, systemEvents]);

  React.useEffect(() => {
    if (!driverId) {
      setMessages([]);
      setSystemEvents([]);
      setThreadContext(null);
      setThreads([]);
      setSelectedThreadId(null);
      selectedThreadIdRef.current = null;
      threadCacheRef.current.clear();
      detailsArchiveCacheRef.current.clear();
      detailsRequestKeyRef.current = null;
      setDetailsMessages([]);
      setDetailsSystemEvents([]);
      setDetailsOpen(false);
      setConversationDrawerMobileOpen(false);
      updateUnread(0);
      return;
    }

    if (!currentUserIsDriver) {
      void fetchUnread();
    }
  }, [
    currentUserIsDriver,
    driverId,
    fetchUnread,
    updateUnread,
  ]);

  React.useEffect(() => {
    if (
      !open ||
      !driverId ||
      !currentUserIsDriver ||
      !initialThread?.id
    ) {
      return;
    }

    const seedId = String(initialThread.id);
    setThreads((current) => [
      initialThread,
      ...current.filter((thread) => thread.id !== seedId),
    ]);
    selectedThreadIdRef.current = seedId;
    setSelectedThreadId(seedId);

    // Privacy first: never flash the previously selected dispatcher's content
    // while the requested load-creator thread is being loaded.
    setMessages([]);
    setSystemEvents([]);
    setThreadContext(null);
    setHistoryState("loading");
    updateUnread(Math.max(0, Number(initialThread.unreadCount ?? 0)));
    setIsLatestPositionReady(false);
  }, [
    currentUserIsDriver,
    driverId,
    initialThread,
    open,
    updateUnread,
  ]);

  React.useEffect(() => {
    if (!open || !driverId || !currentUserIsDriver) return;
    void fetchThreads();
  }, [open, driverId, currentUserIsDriver, fetchThreads]);

  React.useEffect(() => {
    if (!open || !driverId) return;

    if (currentUserIsDriver) {
      if (!selectedThreadId) {
        setMessages([]);
        setSystemEvents([]);
        setThreadContext(null);
        setIsLatestPositionReady(true);
        return;
      }

      const cached = threadCacheRef.current.get(selectedThreadId);
      if (cached) {
        applyThreadCache(cached);
        setIsLoading(false);
      } else {
        // Privacy first: if this dispatcher has never been loaded in this
        // dialog session, clear the prior dispatcher immediately instead of
        // flashing the previous conversation during the network request.
        setMessages([]);
        setSystemEvents([]);
        setThreadContext(null);
        setHistoryState("loading");
      }
    } else if (staffConversationCacheKey) {
      const cached = threadCacheRef.current.get(staffConversationCacheKey);
      if (cached) {
        applyThreadCache(cached);
        setIsLoading(false);
      } else {
        // Never flash another driver's private thread while Dispatch switches
        // between drivers. Only the exact driver-scoped cache may render.
        setMessages([]);
        setSystemEvents([]);
        setThreadContext(null);
        setHistoryState("loading");
      }
    }

    void fetchMessages();
  }, [
    open,
    driverId,
    currentUserIsDriver,
    selectedThreadId,
    fetchMessages,
    applyThreadCache,
    staffConversationCacheKey,
  ]);

  React.useEffect(() => {
    if (!driverId || !isSignedIn) return;

    let cancelled = false;
    let socket: ReturnType<typeof initializeSocket> | null = null;

    const connect = async () => {
      const token = await getToken();
      if (!token || cancelled) return;

      socket = initializeSocket(token);

      const onMessage = (message: DispatchChatMessage) => {
        if (!message || String(message.driverId) !== String(driverId)) return;

        // Defense in depth for staff: the backend already emits only to the two
        // thread participants, but never render a message tagged for a different
        // dispatcher even if a malformed socket payload is received.
        if (
          !currentUserIsDriver &&
          message.dispatcherId &&
          String(message.dispatcherId) !== String(currentUserId)
        ) {
          return;
        }

        if (currentUserIsDriver) {
          void fetchThreads();

          if (message.threadId) {
            const messageThreadId = String(message.threadId);
            const cachedEntry =
              threadCacheRef.current.get(messageThreadId);

            if (cachedEntry) {
              threadCacheRef.current.set(messageThreadId, {
                ...cachedEntry,
                messages: mergeMessage(
                  cachedEntry.messages,
                  message,
                ),
              });
            }
          }

          if (
            !message.threadId ||
            String(message.threadId) !== String(selectedThreadId ?? "")
          ) {
            return;
          }
        } else if (
          activeThreadId &&
          message.threadId &&
          String(message.threadId) !== String(activeThreadId)
        ) {
          return;
        }

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
        threadId?: string;
        dispatcherId?: string;
        driverId?: string;
        readerId?: string;
      }) => {
        if (
          String(payload?.driverId ?? "") !== String(driverId) ||
          !payload.readerId
        ) {
          return;
        }

        if (currentUserIsDriver) {
          void fetchThreads();

          if (payload.threadId) {
            const readThreadId = String(payload.threadId);
            const cachedEntry =
              threadCacheRef.current.get(readThreadId);

            if (cachedEntry) {
              threadCacheRef.current.set(readThreadId, {
                ...cachedEntry,
                messages: cachedEntry.messages.map((message) =>
                  message.readBy.includes(payload.readerId!)
                    ? message
                    : {
                        ...message,
                        readBy: [
                          ...message.readBy,
                          payload.readerId!,
                        ],
                      },
                ),
                unreadCount:
                  String(payload.readerId) ===
                  String(currentUserId)
                    ? 0
                    : cachedEntry.unreadCount,
              });
            }
          }
        }

        if (
          payload.threadId &&
          activeThreadId &&
          String(payload.threadId) !== String(activeThreadId)
        ) {
          return;
        }

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

        if (String(payload.readerId) === String(currentUserId)) {
          updateUnread(0);
        }
      };

      const onNotificationNew = (notification: any) => {
        const notificationType = String(
          notification?.notificationType ?? notification?.type ?? "",
        );

        // Manual Dispatch Alerts now arrive as persisted private-thread system
        // messages. Ignore the notification copy here to prevent duplicates.
        if (notificationType === "driver_dispatch_alert") return;

        // Load assignment/reassignment notifications are driver-wide
        // Notification records. The chat version is already persisted as an
        // exact dispatcher↔driver system message with threadId/dispatcherId.
        // Never inject the generic copy into whichever dispatcher tab happens
        // to be open.
        if (
          PRIVATE_THREAD_SYSTEM_ONLY_NOTIFICATION_TYPES.has(
            notificationType,
          )
        ) {
          return;
        }

        const metadata = notification?.metadata ?? {};
        const notificationRecipientId = String(
          notification?.userId ?? notification?.recipientId ?? "",
        );
        const targetDriverId = String(
          metadata?.driverId ?? notification?.driverId ?? notification?.userId ?? "",
        );

        if (String(targetDriverId) !== String(driverId)) return;

        if (notificationType === "driver_tracker_offline_alert") {
          // GPS safety alerts are dispatcher-only. They may appear only inside
          // the exact private thread for the dispatcher who owns the accepted
          // load(s); the driver and other dispatchers must never render them.
          if (currentUserIsDriver) return;
          const alertDispatcherId = String(metadata?.dispatcherId ?? "");
          if (
            !alertDispatcherId ||
            alertDispatcherId !== String(currentUserId ?? "")
          ) {
            return;
          }
        }

        if (
          EXPLICIT_THREAD_SCOPED_NOTIFICATION_TYPES.has(notificationType)
        ) {
          if (currentUserIsDriver) {
            // A notification addressed to the driver still needs explicit
            // dispatcher ownership before it can be placed into one of the
            // driver's private dispatcher tabs.
            const selectedDispatcherId = String(
              threadContext?.dispatcher?.id ??
                selectedThread?.dispatcher?.id ??
                "",
            );
            const ownerDispatcherId = String(
              metadata?.dispatcherId ??
                metadata?.dispatchOwnerId ??
                metadata?.sentByUserId ??
                "",
            );

            if (
              !selectedDispatcherId ||
              !ownerDispatcherId ||
              ownerDispatcherId !== selectedDispatcherId
            ) {
              return;
            }
          } else {
            // For Dispatch, the Notification record itself must be addressed to
            // this signed-in dispatcher and identify the driver whose private
            // chat is open. This prevents another dispatcher's notification
            // from appearing just because both users belong to the same org.
            if (
              !notificationRecipientId ||
              notificationRecipientId !== String(currentUserId ?? "")
            ) {
              return;
            }

            const explicitDriverId = String(metadata?.driverId ?? "");
            if (!explicitDriverId || explicitDriverId !== String(driverId)) {
              return;
            }
          }
        }

        const event = normalizeNotification(notification);
        if (!event) return;
        setSystemEvents((previous) =>
          mergeSystemEvent(previous, event),
        );
      };

      socket.on("dispatch-chat:message", onMessage);
      socket.on("dispatch-chat:read", onRead);
      socket.on("notification:new", onNotificationNew);
      socket.on("notification:updated", onNotificationNew);

      return () => {
        socket?.off("dispatch-chat:message", onMessage);
        socket?.off("dispatch-chat:read", onRead);
        socket?.off("notification:new", onNotificationNew);
        socket?.off("notification:updated", onNotificationNew);
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
    activeThreadId,
    currentUserId,
    currentUserIsDriver,
    driverId,
    fetchThreads,
    getToken,
    isSignedIn,
    markRead,
    selectedThread?.dispatcher?.id,
    selectedThreadId,
    threadContext?.dispatcher?.id,
    updateUnread,
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

    if (searchJumpActiveRef.current) {
      setIsLatestPositionReady(true);
      return;
    }

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
    activeThreadId,
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
    if (searchJumpActiveRef.current) return;

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
      if (searchJumpActiveRef.current) return;
      scrollToLatest();
    });

    observer.observe(content);

    return () => observer.disconnect();
  }, [
    isLoading,
    open,
    scrollToLatest,
  ]);

  const jumpToConversationSearchResult = React.useCallback(
    async (result: ConversationDetailsSearchResult) => {
      if (!driverId || !activeThreadId || !isSignedIn) return;

      const targetItemId = result.id;
      searchJumpActiveRef.current = true;
      setHighlightedTimelineItemId(targetItemId);
      setIsLatestPositionReady(true);

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
            `/api/driver-tracking/dispatch-chat/${encodeURIComponent(driverId)}/messages`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
              params: {
                limit: 100,
                threadId: activeThreadId,
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

            return [...map.values()].sort(
              (a, b) =>
                new Date(a.createdAt).getTime() -
                new Date(b.createdAt).getTime(),
            );
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

            return [...map.values()].sort(
              (a, b) =>
                new Date(a.createdAt).getTime() -
                new Date(b.createdAt).getTime(),
            );
          });
        } catch {
          toast.error(
            "Could not load that part of the conversation.",
          );
        }
      }

      // Close Details so the target is visible on both desktop and mobile.
      setDetailsOpen(false);

      // Give React/layout two frames to merge an older history window before
      // locating the exact bubble/system event.
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          document
            .getElementById(
              `dispatch-chat-timeline-${targetItemId}`,
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
      activeThreadId,
      driverId,
      getToken,
      isSignedIn,
      messages,
      systemEvents,
    ],
  );

  const submitMessage = React.useCallback(async () => {
    const content = draft.trim();
    const requestThreadId = currentUserIsDriver
      ? selectedThreadId
      : activeThreadId;

    if (
      (!content && selectedFiles.length === 0) ||
      !driverId ||
      isSending ||
      (currentUserIsDriver && !requestThreadId)
    ) {
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
        if (requestThreadId) form.append("threadId", requestThreadId);

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
          {
            content,
            ...(requestThreadId ? { threadId: requestThreadId } : {}),
          },
          { headers: { Authorization: `Bearer ${token}` } },
        );
        message = response.data?.data as DispatchChatMessage | undefined;
      }

      if (message?.id) {
        setMessages((previous) => mergeMessage(previous, message!));
      }

      if (currentUserIsDriver) {
        void fetchThreads();
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
    activeThreadId,
    currentUserIsDriver,
    draft,
    selectedFiles,
    selectedThreadId,
    driverId,
    fetchThreads,
    getToken,
    isSending,
  ]);

  const primaryLoad = threadContext?.loads?.[0] ?? null;
  const extraLoadCount = Math.max(
    0,
    (threadContext?.loads?.length ?? 0) - 1,
  );

  const dispatcherName =
    threadContext?.dispatcher?.name ||
    selectedThread?.dispatcher?.name ||
    (currentUserIsDriver ? "Select a dispatcher" : "Dispatcher");
  const driverName =
    threadContext?.driver?.name ||
    selectedThread?.driver?.name ||
    participantName ||
    "Driver";

  const currentAccountAvatar = participantAvatarSrc(user?.imageUrl);

  const dispatcherAvatar = participantAvatarSrc(
    threadContext?.dispatcher?.avatar ?? selectedThread?.dispatcher?.avatar,
  );
  const driverAvatar = participantAvatarSrc(
    threadContext?.driver?.avatar ?? selectedThread?.driver?.avatar,
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

  const counterpartName = currentUserIsDriver ? dispatcherName : driverName;
  const counterpartRole: "Driver" | "Dispatcher" = currentUserIsDriver
    ? "Dispatcher"
    : "Driver";
  const counterpartAvatarSrc = currentUserIsDriver
    ? dispatcherAvatarSrc
    : driverAvatarSrc;
  const counterpartInitials = nameInitials(counterpartName);
  const selectedDispatcherIsActive =
    selectedThread?.dispatcher?.isActive !== false;
  const canCompose =
    !currentUserIsDriver ||
    (Boolean(selectedThreadId) && selectedDispatcherIsActive);

  return (
    <>
      <Dialog
        open={open}
      onOpenChange={(nextOpen) => {
        onOpenChange(nextOpen);
        if (nextOpen) void markRead();
        if (!nextOpen) {
          setEmojiOpen(false);
          setDetailsOpen(false);
          setConversationDrawerMobileOpen(false);
        }
      }}
    >
      <DialogContent
        onOpenAutoFocus={(event) => {
          // Prevent Radix autofocus from scrolling the freshly-opened dialog
          // toward its first focusable element before latest-position setup.
          event.preventDefault();
        }}
        className="flex h-[calc(100dvh-1rem)] max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] flex-col gap-0 overflow-hidden border-border/70 p-0 shadow-2xl duration-300 ease-out data-[state=closed]:duration-200 data-[state=closed]:ease-in motion-reduce:duration-0 sm:h-[calc(100dvh-2rem)] sm:max-h-[820px] sm:w-[94vw] sm:max-w-[94vw] lg:w-[92vw] lg:max-w-[76rem] xl:max-w-[82rem]"
        overlayClassName="bg-black/70 backdrop-blur-[3px] duration-300 ease-out data-[state=closed]:duration-200 data-[state=closed]:ease-in motion-reduce:duration-0"
      >
        <DialogHeader className="relative shrink-0 border-b border-border/60 bg-gradient-to-r from-emerald-500/[0.07] via-background to-background px-3 py-2.5 pr-11 sm:px-4 sm:py-3 sm:pr-12">
          <div className="flex min-w-0 items-center gap-2.5">
            {currentUserIsDriver && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-9 shrink-0 md:hidden"
                onClick={() => setConversationDrawerMobileOpen(true)}
                aria-label="Open dispatcher conversations"
              >
                <Menu className="size-4" />
              </Button>
            )}

            <Avatar className="size-10 shrink-0 border border-emerald-500/25">
              {counterpartAvatarSrc && (
                <AvatarImage
                  src={counterpartAvatarSrc}
                  alt={counterpartName}
                  className="object-cover"
                />
              )}
              <AvatarFallback className="bg-emerald-500/10 text-[11px] font-black text-emerald-600 dark:text-emerald-400">
                {counterpartInitials}
              </AvatarFallback>
            </Avatar>

            <div className="min-w-0 flex-1 text-left">
              <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
                <DialogTitle className="truncate text-sm font-black tracking-tight sm:text-base">
                  Suprah Dispatch Chat
                </DialogTitle>
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/[0.07] px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
                  <ShieldCheck className="size-2.5" /> Private
                </span>
              </div>

              <div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[10px]">
                <span className="truncate font-black text-foreground">
                  {counterpartName}
                </span>
                <span className="text-muted-foreground">· {counterpartRole}</span>
                {currentUserIsDriver && selectedThread?.dispatcher?.isActive === false && (
                  <span className="rounded-full bg-muted px-1.5 py-0.5 text-[8px] font-bold uppercase text-muted-foreground">
                    Inactive
                  </span>
                )}
              </div>

              <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[9px] text-muted-foreground">
                {primaryLoad ? (
                  <>
                    <Truck className="size-3 shrink-0 text-emerald-500" />
                    <span className="shrink-0 font-bold text-foreground">
                      {primaryLoad.loadNumber}
                    </span>
                    <span className="shrink-0">· {primaryLoad.status}</span>
                    {(primaryLoad.origin || primaryLoad.destination) && (
                      <>
                        <span className="hidden shrink-0 text-muted-foreground/40 sm:inline">·</span>
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
              className="mr-1 h-9 shrink-0 gap-1.5 px-2.5 text-[10px] font-bold sm:mr-0 sm:px-3"
              disabled={!activeThreadId}
              onClick={() => setDetailsOpen((current) => !current)}
              aria-label="Open conversation details"
            >
              <Info className="size-3.5" />
              <span className="hidden sm:inline">Details</span>
            </Button>
          </div>
          <DialogDescription className="sr-only">
            Private operational communication between this driver and dispatcher, isolated from Suprah Space.
          </DialogDescription>
        </DialogHeader>

        <div className="relative flex min-h-0 flex-1 overflow-hidden">
          {currentUserIsDriver && (
            <aside
              className={`hidden min-h-0 shrink-0 border-r border-border/60 transition-[width] duration-200 md:block ${
                conversationDrawerCollapsed ? "w-16" : "w-60"
              }`}
            >
              <DispatcherConversationList
                threads={threads}
                selectedThreadId={selectedThreadId}
                loading={threadsLoading}
                collapsed={conversationDrawerCollapsed}
                onToggleCollapsed={() => setConversationDrawerCollapsed((current) => !current)}
                onSelect={selectDispatcherThread}
              />
            </aside>
          )}

          {currentUserIsDriver && conversationDrawerMobileOpen && (
            <>
              <button
                type="button"
                className="absolute inset-0 z-30 bg-black/45 md:hidden"
                onClick={() => setConversationDrawerMobileOpen(false)}
                aria-label="Close dispatcher conversations"
              />
              <aside className="absolute inset-y-0 left-0 z-40 w-[min(82vw,18rem)] border-r border-border/70 bg-background shadow-2xl md:hidden">
                <DispatcherConversationList
                  threads={threads}
                  selectedThreadId={selectedThreadId}
                  loading={threadsLoading}
                  collapsed={false}
                  onToggleCollapsed={() => undefined}
                  onSelect={selectDispatcherThread}
                  onCloseMobile={() => setConversationDrawerMobileOpen(false)}
                  mobile
                />
              </aside>
            </>
          )}

          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div
          ref={timelineScrollRef}
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-background px-3 py-4 [overflow-anchor:none] sm:px-5"
        >
          {currentUserIsDriver && !selectedThreadId ? (
            <div className="flex h-full flex-col items-center justify-center px-6 text-center">
              <div className="mb-3 flex size-12 items-center justify-center rounded-2xl bg-emerald-500/10">
                <MessageSquare className="size-6 text-emerald-500" />
              </div>
              <p className="text-sm font-black">Select a dispatcher conversation</p>
              <p className="mt-1 max-w-md text-xs leading-relaxed text-muted-foreground">
                Your Dispatch Chat is separated by dispatcher so messages never mix between different dispatcher conversations.
              </p>
            </div>
          ) : isLoading && timeline.length === 0 ? (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              <Loader2 className="mr-2 size-5 animate-spin" />
              <span className="text-sm">Loading Dispatch Chat…</span>
            </div>
          ) : historyState === "error" && timeline.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center px-6 text-center">
              <div className="mb-3 flex size-12 items-center justify-center rounded-2xl bg-muted">
                <MessageSquare className="size-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-black">Conversation is still unavailable</p>
              <p className="mt-1 max-w-md text-xs leading-relaxed text-muted-foreground">
                We couldn&apos;t confirm this private conversation&apos;s history yet.
                Reopen or refresh Dispatch Chat to try again.
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
                <MessageSquare className="size-6 text-emerald-500" />
              </div>
              <p className="text-sm font-black">Start the dispatch conversation</p>
              <p className="mt-1 max-w-md text-xs leading-relaxed text-muted-foreground">
                Messages, shared files, Dispatch Alerts, and relevant driver
                operational updates will appear only in this dispatcher-driver conversation.
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
                  const highlighted =
                    highlightedTimelineItemId === item.id;

                  return (
                    <div
                      key={item.id}
                      id={`dispatch-chat-timeline-${item.id}`}
                      className={`rounded-2xl transition-[box-shadow,background-color] duration-200 ${
                        highlighted
                          ? "bg-emerald-500/[0.06] ring-2 ring-emerald-500/55 ring-offset-2 ring-offset-transparent"
                          : ""
                      }`}
                    >
                      <SystemEventCard
                        event={item.event}
                      />
                    </div>
                  );
                }

                const message = item.message;

                if (
                  message.messageType === "system" &&
                  message.systemEvent
                ) {
                  const highlighted =
                    highlightedTimelineItemId === item.id;

                  return (
                    <div
                      key={item.id}
                      id={`dispatch-chat-timeline-${item.id}`}
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
                    </div>
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
                    id={`dispatch-chat-timeline-${item.id}`}
                    className={`flex rounded-xl transition-[box-shadow,background-color] duration-200 ${
                      mine ? "justify-end" : "justify-start"
                    } ${
                      highlightedTimelineItemId === item.id
                        ? "bg-emerald-500/[0.06] ring-2 ring-emerald-500/55 ring-offset-2 ring-offset-transparent"
                        : ""
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
                              onOpenMedia={setLightboxAttachment}
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

        <div
          className="relative shrink-0 border-t border-border/60 p-3 sm:p-4"
          style={{ background: "var(--bg-elevated)" }}
        >
          {selectedFiles.length > 0 && (
            <div className="mb-2 flex max-h-28 flex-wrap gap-1.5 overflow-y-auto pr-1">
              {selectedFiles.map((file, index) => (
                <div
                  key={`${file.name}:${file.size}:${index}`}
                  className="flex w-full min-w-0 items-start gap-2 rounded-lg border border-border/60 px-2.5 py-1.5 sm:w-auto sm:max-w-full"
                  style={{ background: "var(--bg-base)" }}
                >
                  {file.type.startsWith("image/") ? (
                    <ImageIcon className="size-3.5 shrink-0 text-emerald-500" />
                  ) : (
                    <FileText className="size-3.5 shrink-0 text-emerald-500" />
                  )}
                  <span className="min-w-0 max-w-full break-all text-[10px] font-semibold [overflow-wrap:anywhere]">
                    {file.name}
                  </span>
                  <span className="shrink-0 text-[9px] text-muted-foreground">
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
            <div
              className="absolute bottom-[calc(100%-4px)] left-0 z-20 mb-2 w-[min(16rem,calc(100vw-1.5rem))] rounded-2xl border border-border p-2 shadow-xl sm:left-12"
              style={{ background: "var(--bg-elevated)" }}
            >
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

          <div className="flex min-w-0 items-end gap-2">
            <div className="flex shrink-0 items-center gap-1">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-11 w-11 rounded-xl"
                aria-label="Attach files"
                disabled={!canCompose}
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
                disabled={!canCompose}
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
                  ? selectedThread
                    ? selectedDispatcherIsActive
                      ? `Message ${selectedThread.dispatcher.name || "dispatcher"}…`
                      : "This dispatcher is inactive. Conversation history remains available."
                    : "Select a dispatcher conversation…"
                  : `Message ${driverName}…`
              }
              disabled={!canCompose}
              maxLength={4000}
              rows={2}
              className="min-h-[44px] min-w-0 max-h-32 w-full flex-1 resize-y rounded-xl border border-border/70 px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              style={{ background: "var(--bg-base)" }}
            />

            <Button
              type="button"
              onClick={() => void submitMessage()}
              disabled={
                (!draft.trim() && selectedFiles.length === 0) ||
                isSending ||
                !driverId ||
                !canCompose
              }
              className="h-11 shrink-0 gap-2 px-3 sm:px-4"
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

          </div>

          {detailsOpen && activeThreadId && (
            <aside className="hidden min-h-0 w-80 shrink-0 border-l border-border/60 xl:block">
              <ConversationDetailsPanel
                counterpartName={counterpartName}
                counterpartRole={counterpartRole}
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

          {detailsOpen && activeThreadId && (
            <>
              <button
                type="button"
                className="absolute inset-0 z-40 bg-black/35 xl:hidden"
                onClick={() => setDetailsOpen(false)}
                aria-label="Close conversation details"
              />
              <aside className="absolute inset-y-0 right-0 z-50 w-full border-l border-border/70 bg-background shadow-2xl sm:w-[22rem] xl:hidden">
                <ConversationDetailsPanel
                  counterpartName={counterpartName}
                  counterpartRole={counterpartRole}
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
        </div>
      </DialogContent>
      </Dialog>
      <AttachmentLightbox
        attachment={lightboxAttachment}
        onClose={() => setLightboxAttachment(null)}
      />
    </>
  );
}