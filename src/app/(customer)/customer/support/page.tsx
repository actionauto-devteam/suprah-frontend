"use client";

/**
 * CustomerConcernChat.tsx
 *
 * Customer-facing chat widget.
 *
 * Auth strategy: identical to the Aftermarket page — relies on the
 * AuthProvider's useAuth() hook (Clerk / your provider) to get a fresh
 * token. Never reads localStorage directly. The same token is used for
 * every API call, so logging in once on the customer account is sufficient
 * for every feature including this chat.
 */

import * as React from "react";
import {
  MessageCircle,
  X,
  Send,
  Paperclip,
  Loader2,
  CheckCheck,
  Check,
  FileText,
  Download,
  Headset,
  Plus,
  History,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { useAuth, useUser } from "@/providers/AuthProvider";
import { cn } from "@/lib/utils";
import { initializeSocket } from "@/lib/socket.client";
import type { Socket } from "socket.io-client";
import {
  AttachmentLightbox,
  type LightboxAttachment,
} from "@/components/chat/AttachmentLightbox";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ConcernMessage {
  _id: string;
  content: string;
  createdAt: string;
  sender: {
    _id: string;
    fullName: string;
    avatar?: string;
    isCustomer?: boolean;
  };
  type: string;
  attachments: Array<{
    url: string;
    originalName: string;
    mimeType: string;
    size: number;
  }>;
  readBy: string[];
  metadata?: {
    isCustomerMessage?: boolean;
    crmUserName?: string;
    crmUserRole?: string;
  };
}

interface ConcernCase {
  _id: string;
  caseNumber: number;
  resolved: boolean;
  resolvedAt: string | null;
  createdAt: string;
  lastMessage: string;
  lastMessageAt: string | null;
  unreadCount: number;
}

type Mode = "page" | "float";

const GROUP_GAP_MS = 3 * 60 * 1000;

function isOwnMessage(message: ConcernMessage) {
  return (
    message.metadata?.isCustomerMessage === true ||
    message.sender?.isCustomer === true
  );
}

function sameGroup(a: ConcernMessage | undefined, b: ConcernMessage | undefined) {
  if (!a || !b) return false;
  if (isOwnMessage(a) !== isOwnMessage(b)) return false;
  return (
    Math.abs(
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    ) < GROUP_GAP_MS
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MAX_FILE_SIZE = 25 * 1024 * 1024;
const MAX_FILES = 5;

function fmtTime(d: string) {
  return new Date(d).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}
function fmtSize(b: number) {
  return b < 1048576
    ? `${(b / 1024).toFixed(1)} KB`
    : `${(b / 1048576).toFixed(1)} MB`;
}
function fmtDate(d: string) {
  const date = new Date(d);
  const now = new Date();
  const diff = Math.floor((now.getTime() - date.getTime()) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}
function ini(name: string) {
  return (name || "?")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function cleanLegacyInquiryPayload(content: string) {
  return (content || "")
    .replace(/\r\n/g, "\n")
    .replace(/\^"/g, "")
    .replace(/\^/g, "")
    .replace(/\*\*/g, "")
    .replace(/[“”]/g, '"')
    .trim();
}

function formatSupportMessage(content: string) {
  const raw = cleanLegacyInquiryPayload(content);
  if (!raw) return "";

  const collapsed = raw.replace(/\s+/g, " ").trim();
  const inquiryLike =
    /product\s*inquiry|customer'?s\s*question|product\s*id|\bproduct\s*:/i.test(
      collapsed,
    );

  if (!inquiryLike) return raw;

  const productMatch = collapsed.match(
    /product\s*:\s*(.+?)(?=\s+(product\s*id|price|customer'?s\s*question|question)\s*:|$)/i,
  );
  const questionMatch = collapsed.match(
    /(?:customer'?s\s*question|question)\s*:\s*(.+)$/i,
  );

  const productName = productMatch?.[1]?.trim() || "Product";
  const questionText = questionMatch?.[1]?.trim() || "";

  if (!questionText) {
    return `Product inquiry\nProduct: ${productName}`;
  }

  return `Product inquiry\nProduct: ${productName}\nQuestion: ${questionText}`;
}

// ─── Date separator ───────────────────────────────────────────────────────────

function DateSep({ date }: { date: string }) {
  return (
    <div className="flex items-center gap-3 my-4 px-4">
      <div className="flex-1 h-px bg-border/40" />
      <span className="text-[10px] text-muted-foreground/60 bg-muted px-2 py-0.5 rounded-full border border-border/30">
        {fmtDate(date)}
      </span>
      <div className="flex-1 h-px bg-border/40" />
    </div>
  );
}

function fmtDateKey(d: string) {
  return new Date(d).toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ─── Message bubble ───────────────────────────────────────────────────────────

function MessageBubble({
  message,
  groupStart,
  groupEnd,
  ownName,
  ownAvatar,
  onOpenMedia,
}: {
  message: ConcernMessage;
  groupStart: boolean;
  groupEnd: boolean;
  ownName: string;
  ownAvatar?: string;
  onOpenMedia: (attachment: LightboxAttachment) => void;
}) {
  const isOwn = isOwnMessage(message);

  const senderName = isOwn ? ownName : "Suprah Support";
  const displayContent = formatSupportMessage(message.content || "");

  return (
    <div
      className={cn(
        "flex gap-2.5 px-4",
        isOwn && "flex-row-reverse",
        groupStart ? "pt-2" : "pt-0.5",
      )}
    >
      <div className="h-7.5 w-7.5 shrink-0">
        {groupStart &&
          (isOwn ? (
            ownAvatar ? (
              <img
                src={ownAvatar}
                alt={ownName}
                className="h-7.5 w-7.5 rounded-xl object-cover shadow-sm"
              />
            ) : (
              <div className="h-7.5 w-7.5 rounded-xl flex items-center justify-center text-[10px] font-bold text-white shadow-sm bg-linear-to-br from-emerald-500 to-emerald-700">
                {ini(ownName)}
              </div>
            )
          ) : (
            <img
              src="/favicon.png"
              alt="Suprah Support"
              className="h-7.5 w-7.5 rounded-xl object-cover shadow-sm border border-border/40"
            />
          ))}
      </div>

      <div
        className={cn(
          "flex flex-col gap-0.5 max-w-[75%]",
          isOwn && "items-end",
        )}
      >
        {groupStart && (
          <span className="text-[11px] font-medium text-muted-foreground px-0.5">
            {senderName}
          </span>
        )}

        {displayContent ? (
          <div
            className={cn(
              "rounded-2xl px-3.5 py-2 text-sm leading-relaxed wrap-break-word whitespace-pre-wrap shadow-sm",
              isOwn
                ? "bg-linear-to-br from-emerald-500 to-emerald-700 text-white rounded-tr-sm shadow-emerald-900/10"
                : "bg-muted text-foreground rounded-tl-sm border border-border/40",
            )}
          >
            {displayContent}
          </div>
        ) : null}

        {/* Image / video attachments */}
        {message.attachments
          ?.filter(
            (a) =>
              a.mimeType?.startsWith("image/") ||
              a.mimeType?.startsWith("video/"),
          )
          .map((att, i) => {
            const isVideo = att.mimeType?.startsWith("video/");
            return (
              <button
                key={i}
                type="button"
                onClick={() =>
                  onOpenMedia({
                    src: att.url,
                    type: isVideo ? "video" : "image",
                    name: att.originalName,
                  })
                }
                className="block rounded-xl overflow-hidden"
                style={{ maxWidth: 220 }}
              >
                {isVideo ? (
                  <video
                    src={att.url}
                    className="rounded-xl object-cover hover:opacity-90 transition-opacity"
                    style={{ maxHeight: 180, maxWidth: 220, display: "block" }}
                  />
                ) : (
                  <img
                    src={att.url}
                    alt={att.originalName}
                    className="rounded-xl object-cover hover:opacity-90 transition-opacity"
                    style={{ maxHeight: 180, maxWidth: 220, display: "block" }}
                  />
                )}
              </button>
            );
          })}

        {/* File attachments */}
        {message.attachments
          ?.filter(
            (a) =>
              !a.mimeType?.startsWith("image/") &&
              !a.mimeType?.startsWith("video/"),
          )
          .map((att, i) => (
            <a
              key={i}
              href={att.url}
              download={att.originalName}
              className={cn(
                "flex items-center gap-2.5 rounded-xl px-3 py-2 no-underline transition-opacity hover:opacity-80 shadow-sm",
                isOwn
                  ? "bg-white/15 border border-white/15"
                  : "bg-muted border border-border/40",
              )}
              style={{ maxWidth: 220 }}
            >
              <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium truncate">
                  {att.originalName}
                </p>
                <p className="text-[10px] opacity-50">{fmtSize(att.size)}</p>
              </div>
              <Download className="h-3 w-3 shrink-0 opacity-50" />
            </a>
          ))}

        {groupEnd && (
          <div
            className={cn(
              "flex items-center gap-1 px-0.5",
              isOwn && "flex-row-reverse",
            )}
          >
            <span className="text-[10px] text-muted-foreground/60 tabular-nums">
              {fmtTime(message.createdAt)}
            </span>
            {isOwn &&
              (message.readBy?.length > 0 ? (
                <CheckCheck className="h-3 w-3 text-emerald-500" />
              ) : (
                <Check className="h-3 w-3 text-muted-foreground/40" />
              ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Pending file preview ─────────────────────────────────────────────────────

function PendingFileItem({
  file,
  onRemove,
}: {
  file: File;
  onRemove: () => void;
}) {
  const isImg = file.type.startsWith("image/");
  const [preview, setPreview] = React.useState<string | null>(null);
  React.useEffect(() => {
    if (isImg) {
      const url = URL.createObjectURL(file);
      setPreview(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [file, isImg]);
  return (
    <div
      className="relative flex flex-col rounded-lg overflow-hidden shrink-0 border border-border/40 bg-muted"
      style={{ width: 64 }}
    >
      {preview ? (
        <img
          src={preview}
          alt={file.name}
          className="w-full object-cover"
          style={{ height: 48 }}
        />
      ) : (
        <div
          className="flex items-center justify-center"
          style={{ height: 48 }}
        >
          <FileText className="h-5 w-5 text-muted-foreground" />
        </div>
      )}
      <p className="px-1 py-0.5 text-[9px] text-muted-foreground truncate">
        {file.name}
      </p>
      <button
        onClick={onRemove}
        className="absolute top-0.5 right-0.5 h-4 w-4 rounded-full bg-background/80 border border-border/50 flex items-center justify-center"
      >
        <X className="h-2.5 w-2.5" />
      </button>
    </div>
  );
}

// ─── Conversation list panel ────────────────────────────────────────────────

function ConversationListPanel({
  cases,
  activeCaseId,
  onSelect,
  onNewCase,
  canStartNew,
  creatingCase,
  className,
}: {
  cases: ConcernCase[];
  activeCaseId: string | null;
  onSelect: (id: string) => void;
  onNewCase: () => void;
  canStartNew: boolean;
  creatingCase: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col min-h-0", className)}>
      <div className="flex items-center justify-between gap-2 px-3.5 py-3 border-b border-border/40 shrink-0">
        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
          Conversations
        </p>
        <button
          onClick={onNewCase}
          disabled={!canStartNew || creatingCase}
          title="Start a new conversation"
          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-violet-600 dark:text-violet-400 hover:bg-violet-500/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          {creatingCase ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Plus className="h-3 w-3" />
          )}
          New
        </button>
      </div>

      <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "thin" }}>
        {cases.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-xs text-muted-foreground">No conversations yet.</p>
            <button
              onClick={onNewCase}
              disabled={creatingCase}
              className="mt-2 text-xs font-semibold text-violet-600 dark:text-violet-400 hover:underline disabled:opacity-30"
            >
              Start one
            </button>
          </div>
        ) : (
          cases.map((c) => (
            <button
              key={c._id}
              onClick={() => onSelect(c._id)}
              className={cn(
                "flex w-full items-start gap-2 rounded-xl px-3 py-2.5 mx-2 my-0.5 text-left transition-colors hover:bg-muted/50",
                c._id === activeCaseId &&
                  "bg-violet-500/8 ring-1 ring-violet-500/20",
              )}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold">
                    Case #{c.caseNumber}
                  </span>
                  <span
                    className={cn(
                      "rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide",
                      c.resolved
                        ? "bg-muted text-muted-foreground"
                        : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
                    )}
                  >
                    {c.resolved ? "Resolved" : "Open"}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                  {c.lastMessage || "No messages yet"}
                </p>
                <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                  {c.lastMessageAt ? fmtDate(c.lastMessageAt) : fmtDate(c.createdAt)}
                </p>
              </div>
              {c.unreadCount > 0 && (
                <span className="h-4.5 min-w-4.5 rounded-full bg-linear-to-br from-violet-500 to-violet-700 text-white text-[10px] font-bold flex items-center justify-center px-1 shrink-0 mt-0.5">
                  {c.unreadCount > 9 ? "9+" : c.unreadCount}
                </span>
              )}
            </button>
          ))
        )}
      </div>
    </div>
  );
}

// ─── Chat header ──────────────────────────────────────────────────────────────

function ChatHeader({
  onClose,
  isResolved,
  caseNumber,
  cases,
  onNewCase,
  onOpenConversations,
  canStartNew,
  creatingCase,
  historyHiddenOnDesktop,
}: {
  onClose?: () => void;
  isResolved: boolean;
  caseNumber: number | null;
  cases: ConcernCase[];
  onNewCase: () => void;
  onOpenConversations: () => void;
  canStartNew: boolean;
  creatingCase: boolean;
  historyHiddenOnDesktop?: boolean;
}) {
  const totalUnread = cases.reduce((sum, c) => sum + (c.unreadCount || 0), 0);

  return (
    <div className="relative flex items-center gap-3 px-4 py-3.5 border-b border-border/50 bg-card/80 backdrop-blur-sm shrink-0">
      <div className="relative h-10 w-10 shrink-0 rounded-2xl bg-linear-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-lg shadow-emerald-900/20 dark:shadow-emerald-900/40">
        <MessageCircle className="h-4.5 w-4.5 text-white" />
        <div className="absolute inset-0 rounded-2xl ring-1 ring-emerald-400/30" />
        {!isResolved && (
          <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-card" />
          </span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="font-bold text-sm leading-none tracking-tight">Support Chat</p>
          {caseNumber != null && (
            <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground">
              Case #{caseNumber}
            </span>
          )}
        </div>
        <p className="text-[11px] text-muted-foreground mt-1">
          {isResolved ? (
            <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
              <CheckCheck className="h-3 w-3" /> Resolved
            </span>
          ) : (
            "Replies within a few hours"
          )}
        </p>
      </div>

      <button
        onClick={onNewCase}
        disabled={!canStartNew || creatingCase}
        title="Start a new conversation"
        className="h-8 w-8 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-30 disabled:cursor-not-allowed md:hidden"
      >
        {creatingCase ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Plus className="h-4 w-4" />
        )}
      </button>

      <button
        onClick={onOpenConversations}
        title="Conversations"
        className={cn(
          "relative h-8 w-8 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors",
          historyHiddenOnDesktop && "md:hidden",
        )}
      >
        <History className="h-4 w-4" />
        {totalUnread > 0 && (
          <span className="absolute -top-1 -right-1 h-3.5 min-w-3.5 rounded-full bg-violet-500 text-white text-[9px] font-bold flex items-center justify-center px-0.5">
            {totalUnread > 9 ? "9+" : totalUnread}
          </span>
        )}
      </button>

      {onClose && (
        <button
          onClick={onClose}
          className="h-8 w-8 rounded-xl flex items-center justify-center hover:bg-muted transition-colors"
        >
          <X className="h-4 w-4 text-muted-foreground" />
        </button>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

function CustomerConcernChat({ mode = "page" }: { mode?: Mode }) {
  // ── Auth — identical pattern to the Aftermarket page ──────────────────────
  // useAuth() gives us getToken(); useUser() gives us the current user id.
  // No localStorage, no manual token management.
  const { getToken } = useAuth();
  const { user } = useUser();

  const [open, setOpen] = React.useState(mode === "page");
  const [cases, setCases] = React.useState<ConcernCase[]>([]);
  const [activeCaseId, setActiveCaseId] = React.useState<string | null>(null);
  const [creatingCase, setCreatingCase] = React.useState(false);
  const [messages, setMessages] = React.useState<ConcernMessage[]>([]);
  const [input, setInput] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [hasMore, setHasMore] = React.useState(false);
  const [pendingFiles, setPendingFiles] = React.useState<File[]>([]);
  const [notice, setNotice] = React.useState<{
    kind: "error" | "info";
    text: string;
  } | null>(null);
  const [unread, setUnread] = React.useState(0);
  const [lightbox, setLightbox] = React.useState<LightboxAttachment | null>(null);
  const [mobileSheetOpen, setMobileSheetOpen] = React.useState(false);

  const endRef = React.useRef<HTMLDivElement>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);
  const noticeTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const showNotice = (kind: "error" | "info", text: string) => {
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    setNotice({ kind, text });
    noticeTimer.current = setTimeout(() => setNotice(null), 3500);
  };

  // Build auth headers — same pattern as aftermarket page's fetchAftermarketProducts
  const authHeaders = React.useCallback(async () => {
    const token = await getToken();
    return { Authorization: `Bearer ${token}` };
  }, [getToken]);

  // ── Fetch cases ─────────────────────────────────────────────────────────────

  const fetchCases = React.useCallback(async () => {
    const headers = await authHeaders();
    const r = await apiClient.get("/api/customer-concern/cases", { headers });
    const data: ConcernCase[] = r.data?.data || [];
    setCases(data);
    return data;
  }, [authHeaders]);

  // ── Fetch messages ─────────────────────────────────────────────────────────

  const fetchMessages = React.useCallback(
    async (conversationId: string, before?: string) => {
      const headers = await authHeaders();
      const params: any = { limit: 40, conversationId };
      if (before) params.before = before;
      const r = await apiClient.get("/api/customer-concern/messages", {
        headers,
        params,
      });
      const data: ConcernMessage[] = r.data?.data || [];
      if (before) {
        setMessages((p) => [...data, ...p]);
        setHasMore(data.length === 40);
      } else {
        setMessages(data);
        setHasMore(data.length === 40);
      }
    },
    [authHeaders],
  );

  // ── Load a specific case ────────────────────────────────────────────────────

  const loadCase = React.useCallback(
    async (caseId: string) => {
      setActiveCaseId(caseId);
      setMessages([]);
      setHasMore(false);
      setLoading(true);
      try {
        await fetchMessages(caseId);
        setCases((p) =>
          p.map((c) => (c._id === caseId ? { ...c, unreadCount: 0 } : c)),
        );
      } catch {
        showNotice("error", "Could not load this conversation.");
      } finally {
        setLoading(false);
      }
    },
    [fetchMessages],
  );

  // ── Start a new conversation ────────────────────────────────────────────────

  const handleNewCase = async () => {
    if (creatingCase) return;
    setCreatingCase(true);
    try {
      const headers = await authHeaders();
      const r = await apiClient.post(
        "/api/customer-concern/cases",
        {},
        { headers },
      );
      const newCase = r.data?.data;
      if (newCase?._id) {
        await fetchCases();
        await loadCase(newCase._id);
      }
    } catch {
      showNotice(
        "error",
        "Could not start a new conversation. Please try again.",
      );
    } finally {
      setCreatingCase(false);
    }
  };

  // ── Open: load cases + most recent case's messages ─────────────────────────

  React.useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetchCases()
      .then((data) => {
        if (data.length > 0) return loadCase(data[0]._id);
        setLoading(false);
      })
      .catch(() => {
        showNotice("error", "Could not connect to support. Please try again.");
        setLoading(false);
      });
    setUnread(0);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Scroll to bottom ───────────────────────────────────────────────────────

  React.useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  // ── Real-time: listen for CRM replies ─────────────────────────────────────

  React.useEffect(() => {
    let active = true;
    let socket: Socket | null = null;

    const onReply = ({
      conversationId,
      message,
    }: {
      conversationId: string;
      message: ConcernMessage;
    }) => {
      if (conversationId === activeCaseId) {
        setMessages((p) =>
          p.find((m) => m._id === message._id) ? p : [...p, message],
        );
        if (!open) setUnread((n) => n + 1);
      } else {
        setCases((p) =>
          p.map((c) =>
            c._id === conversationId
              ? {
                  ...c,
                  unreadCount: (c.unreadCount || 0) + 1,
                  lastMessage: message.content,
                  lastMessageAt: message.createdAt,
                }
              : c,
          ),
        );
        if (!open) setUnread((n) => n + 1);
      }
    };
    const onResolved = ({
      conversationId,
      resolved,
    }: {
      conversationId: string;
      resolved: boolean;
    }) => {
      setCases((p) =>
        p.map((c) => (c._id === conversationId ? { ...c, resolved } : c)),
      );
    };

    (async () => {
      const token = await getToken();
      if (!token || !active) return;
      socket = initializeSocket(token);
      socket.on("concern:reply", onReply);
      socket.on("concern:resolved", onResolved);
    })();

    return () => {
      active = false;
      socket?.off("concern:reply", onReply);
      socket?.off("concern:resolved", onResolved);
    };
  }, [open, getToken, activeCaseId]);

  // ── Send message ───────────────────────────────────────────────────────────

  const handleSend = async () => {
    if (sending || !activeCaseId) return;
    const hasText = Boolean(input.trim());
    const hasFiles = pendingFiles.length > 0;
    if (!hasText && !hasFiles) return;

    setSending(true);
    const content = input.trim();
    setInput("");

    try {
      const headers = await authHeaders();

      if (hasFiles) {
        const fd = new FormData();
        pendingFiles.forEach((f) => fd.append("files", f));
        if (content) fd.append("content", content);
        fd.append("conversationId", activeCaseId);
        const r = await apiClient.post("/api/customer-concern/upload", fd, {
          headers: { ...headers, "Content-Type": "multipart/form-data" },
        });
        if (r.data?.data) {
          setMessages((p) =>
            p.find((m) => m._id === r.data.data._id) ? p : [...p, r.data.data],
          );
        }
        setPendingFiles([]);
      } else {
        const r = await apiClient.post(
          "/api/customer-concern/messages",
          { content, conversationId: activeCaseId },
          { headers },
        );
        if (r.data?.data) {
          setMessages((p) =>
            p.find((m) => m._id === r.data.data._id) ? p : [...p, r.data.data],
          );
        }
      }
      setCases((p) =>
        p.map((c) =>
          c._id === activeCaseId
            ? { ...c, lastMessage: content, lastMessageAt: new Date().toISOString() }
            : c,
        ),
      );
    } catch {
      setInput(content);
      showNotice("error", "Failed to send message. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return;
    const selected = Array.from(files);
    if (pendingFiles.length + selected.length > MAX_FILES) {
      showNotice("error", `You can attach up to ${MAX_FILES} files.`);
      return;
    }
    for (const f of selected) {
      if (f.size > MAX_FILE_SIZE) {
        showNotice("error", `${f.name} exceeds 25 MB.`);
        return;
      }
    }
    setPendingFiles((p) => [...p, ...selected]);
  };

  const loadMore = async () => {
    if (loadingMore || !hasMore || messages.length === 0 || !activeCaseId) return;
    setLoadingMore(true);
    await fetchMessages(activeCaseId, messages[0].createdAt).catch(() => {});
    setLoadingMore(false);
  };

  const activeCase = cases.find((c) => c._id === activeCaseId) || null;
  const isResolved = !!activeCase?.resolved;
  const canStartNew = !activeCaseId || messages.length > 0;
  const ownName = user?.fullName || "You";
  const ownAvatar = user?.imageUrl;

  // ── Chat body ──────────────────────────────────────────────────────────────

  const chatBody = (
    <div
      className="flex-1 overflow-y-auto py-3 space-y-0.5"
      style={{ scrollbarWidth: "thin" }}
    >
      {hasMore && (
        <div className="flex justify-center pb-2">
          <button
            onClick={loadMore}
            className="text-[11px] text-muted-foreground px-3 py-1 rounded-full bg-muted/50 hover:bg-muted transition-colors"
          >
            {loadingMore ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              "↑ Load earlier"
            )}
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : !activeCaseId ? (
        <div className="flex flex-col items-start gap-3 px-5 sm:px-6 py-10 max-w-sm">
          <div className="h-9 w-9 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
            <MessageCircle className="h-4.5 w-4.5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <p className="font-bold text-sm">How can we help?</p>
            <p className="text-xs text-muted-foreground mt-1">
              Start a conversation and our team will get back to you.
            </p>
          </div>
          <button
            onClick={handleNewCase}
            disabled={creatingCase}
            className="inline-flex items-center gap-1.5 rounded-xl bg-linear-to-br from-emerald-500 to-emerald-700 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-emerald-900/20 hover:from-emerald-600 hover:to-emerald-800 transition-all disabled:opacity-60"
          >
            {creatingCase ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Plus className="h-3.5 w-3.5" />
            )}
            Start a conversation
          </button>
        </div>
      ) : messages.length === 0 ? (
        <div className="flex flex-col items-start gap-3 px-5 sm:px-6 py-10 max-w-sm">
          <div className="h-9 w-9 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
            <MessageCircle className="h-4.5 w-4.5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <p className="font-bold text-sm">How can we help?</p>
            <p className="text-xs text-muted-foreground mt-1">
              Send us a message and our team will get back to you.
            </p>
          </div>
        </div>
      ) : (
        messages.map((msg, i) => {
          const prev = messages[i - 1];
          const next = messages[i + 1];
          const showDate =
            !prev || fmtDateKey(msg.createdAt) !== fmtDateKey(prev.createdAt);
          const nextShowsDate =
            !next || fmtDateKey(msg.createdAt) !== fmtDateKey(next.createdAt);
          const groupStart = showDate || !sameGroup(prev, msg);
          const groupEnd = nextShowsDate || !sameGroup(msg, next);
          return (
            <React.Fragment key={msg._id}>
              {showDate && <DateSep date={msg.createdAt} />}
              <MessageBubble
                message={msg}
                groupStart={groupStart}
                groupEnd={groupEnd}
                ownName={ownName}
                ownAvatar={ownAvatar}
                onOpenMedia={setLightbox}
              />
            </React.Fragment>
          );
        })
      )}
      <div ref={endRef} />
    </div>
  );

  // ── Input bar ──────────────────────────────────────────────────────────────

  const inputBar = !activeCaseId ? null : isResolved ? (
    <div className="shrink-0 px-4 py-3 border-t border-border/50 text-center space-y-2">
      <p className="text-xs text-muted-foreground">
        This conversation is resolved.
      </p>
      <button
        onClick={handleNewCase}
        disabled={creatingCase}
        className="inline-flex items-center gap-1.5 rounded-xl bg-linear-to-br from-emerald-500 to-emerald-700 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm shadow-emerald-900/20 hover:from-emerald-600 hover:to-emerald-800 transition-all disabled:opacity-60"
      >
        {creatingCase ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Plus className="h-3.5 w-3.5" />
        )}
        Start a new conversation
      </button>
    </div>
  ) : (
    <div className="shrink-0 px-3 pb-3 pt-2 space-y-1.5 border-t border-border/50">
      {pendingFiles.length > 0 && (
        <div className="flex gap-1.5 overflow-x-auto pb-0.5">
          {pendingFiles.map((f, i) => (
            <PendingFileItem
              key={i}
              file={f}
              onRemove={() =>
                setPendingFiles((p) => p.filter((_, idx) => idx !== i))
              }
            />
          ))}
        </div>
      )}
      {notice && (
        <p
          className={cn(
            "text-[11px] px-1",
            notice.kind === "error"
              ? "text-destructive"
              : "text-muted-foreground",
          )}
        >
          {notice.text}
        </p>
      )}
      <div className="flex items-end gap-2 rounded-2xl border border-border/60 bg-muted/30 px-3 py-2 focus-within:border-emerald-500/50 focus-within:ring-2 focus-within:ring-emerald-500/20 transition-all">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="Type a message…"
          rows={1}
          className="flex-1 resize-none bg-transparent text-sm focus:outline-none min-h-7 max-h-28 py-0.5 placeholder:text-muted-foreground/50"
          style={{ lineHeight: "1.55" }}
        />
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => fileRef.current?.click()}
            className="h-7 w-7 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            title="Attach file"
          >
            <Paperclip className="h-4 w-4" />
          </button>
          <input
            ref={fileRef}
            type="file"
            multiple
            accept="*/*"
            className="sr-only"
            onChange={(e) => {
              handleFileSelect(e.target.files);
              e.currentTarget.value = "";
            }}
          />
          <button
            onClick={handleSend}
            disabled={(!input.trim() && pendingFiles.length === 0) || sending}
            className={cn(
              "h-7 w-7 rounded-xl flex items-center justify-center transition-all",
              input.trim() || pendingFiles.length > 0
                ? "bg-linear-to-br from-emerald-500 to-emerald-700 hover:from-emerald-600 hover:to-emerald-800 text-white shadow-sm shadow-emerald-900/20"
                : "bg-muted text-muted-foreground/40 cursor-not-allowed",
            )}
            title="Send"
          >
            {sending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );

  // ── Float mode ─────────────────────────────────────────────────────────────

  if (mode === "float") {
    return (
      <>
        {!open && (
          <button
            onClick={() => {
              setOpen(true);
              setUnread(0);
            }}
            className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg flex items-center justify-center bg-emerald-600 hover:bg-emerald-700 text-white transition-all"
            aria-label="Open support chat"
          >
            <MessageCircle className="h-6 w-6" />
            {unread > 0 && (
              <span className="absolute -top-1 -right-1 h-5 min-w-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center px-1">
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </button>
        )}

        {open && (
          <div
            className="fixed bottom-6 right-6 z-50 w-90 rounded-2xl shadow-2xl border border-border/50 bg-background flex flex-col overflow-hidden"
            style={{ height: 520 }}
          >
            <ChatHeader
              onClose={() => setOpen(false)}
              isResolved={isResolved}
              caseNumber={activeCase?.caseNumber ?? null}
              cases={cases}
              onNewCase={handleNewCase}
              onOpenConversations={() => setMobileSheetOpen(true)}
              canStartNew={canStartNew}
              creatingCase={creatingCase}
            />
            {chatBody}
            {inputBar}
          </div>
        )}
        <Sheet open={mobileSheetOpen} onOpenChange={setMobileSheetOpen}>
          <SheetContent side="left" className="w-[85vw] sm:w-80 p-0">
            <SheetHeader className="px-4 pt-4 pb-2 border-b border-border/40">
              <SheetTitle className="text-sm">Conversations</SheetTitle>
            </SheetHeader>
            <ConversationListPanel
              cases={cases}
              activeCaseId={activeCaseId}
              onSelect={(id) => {
                loadCase(id);
                setMobileSheetOpen(false);
              }}
              onNewCase={handleNewCase}
              canStartNew={canStartNew}
              creatingCase={creatingCase}
              className="flex-1"
            />
          </SheetContent>
        </Sheet>
        <AttachmentLightbox attachment={lightbox} onClose={() => setLightbox(null)} />
      </>
    );
  }

  // ── Page mode ──────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full min-h-0 gap-3">
      <ConversationListPanel
        cases={cases}
        activeCaseId={activeCaseId}
        onSelect={loadCase}
        onNewCase={handleNewCase}
        canStartNew={canStartNew}
        creatingCase={creatingCase}
        className="hidden md:flex w-70 lg:w-80 shrink-0 rounded-2xl border border-border/50 bg-card"
      />

      <div className="flex-1 min-w-0 flex flex-col rounded-2xl border border-border/50 bg-background overflow-hidden">
        <ChatHeader
          isResolved={isResolved}
          caseNumber={activeCase?.caseNumber ?? null}
          cases={cases}
          onNewCase={handleNewCase}
          onOpenConversations={() => setMobileSheetOpen(true)}
          canStartNew={canStartNew}
          creatingCase={creatingCase}
          historyHiddenOnDesktop
        />
        {chatBody}
        {inputBar}
      </div>

      <Sheet open={mobileSheetOpen} onOpenChange={setMobileSheetOpen}>
        <SheetContent side="left" className="w-[85vw] sm:w-80 p-0">
          <SheetHeader className="px-4 pt-4 pb-2 border-b border-border/40">
            <SheetTitle className="text-sm">Conversations</SheetTitle>
          </SheetHeader>
          <ConversationListPanel
            cases={cases}
            activeCaseId={activeCaseId}
            onSelect={(id) => {
              loadCase(id);
              setMobileSheetOpen(false);
            }}
            onNewCase={handleNewCase}
            canStartNew={canStartNew}
            creatingCase={creatingCase}
            className="flex-1"
          />
        </SheetContent>
      </Sheet>

      <AttachmentLightbox attachment={lightbox} onClose={() => setLightbox(null)} />
    </div>
  );
}

// ─── Default export: full-page wrapper ────────────────────────────────────────

export default function CustomerSupportPage() {
  return (
    <div className="flex h-[calc(100dvh-8rem)] flex-col gap-3">
      {/* ─── Page header ─────────────────────────────────────────────── */}
      <div className="shrink-0 flex items-center gap-3 rounded-2xl border border-border/50 bg-card px-4 py-3">
        <div className="h-9 w-9 rounded-xl bg-violet-500/10 flex items-center justify-center shrink-0">
          <Headset className="h-4.5 w-4.5 text-violet-500" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg sm:text-xl font-bold leading-tight">Support</h1>
          <p className="text-xs text-muted-foreground">We usually reply within a few hours.</p>
        </div>
        <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-violet-500/25 bg-violet-500/8 px-2.5 py-1 text-[11px] font-bold text-violet-600 dark:text-violet-400 shrink-0">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-60" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-violet-500" />
          </span>
          Team online
        </span>
      </div>

      {/* ─── Chat ─────────────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0">
        <CustomerConcernChat mode="page" />
      </div>
    </div>
  );
}
