"use client";

import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  MessageCircle,
  Search,
  Loader2,
  Send,
  Paperclip,
  CheckCheck,
  Check,
  CheckCircle2,
  RotateCcw,
  FileText,
  Download,
  RefreshCw,
  History,
  ChevronRight,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/providers/AuthProvider";
import { useCrmToken } from "@/hooks/useCrmToken";
import { useSupraSpaceSocket } from "@/hooks/useSupraSpaceSocket";
import { format, isToday, isYesterday } from "date-fns";
import {
  AttachmentLightbox,
  type LightboxAttachment,
} from "@/components/chat/AttachmentLightbox";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ConcernConversation {
  _id: string;
  name: string;
  metadata: {
    customerUserId: string;
    customerName: string;
    customerEmail?: string;
    resolved?: boolean;
    resolvedAt?: string;
    caseNumber?: number | null;
    type: "customer_concern";
  };
  lastMessageAt?: string;
  lastMessage?: {
    _id: string;
    content: string;
    createdAt: string;
    sender?: { fullName: string; isCustomer?: boolean };
    metadata?: { isCustomerMessage?: boolean; customerName?: string };
  };
  unreadCount: number;
  members: Array<{ _id: string; fullName: string; avatar?: string; role: string }>;
}

interface ConcernMessage {
  _id: string;
  content: string;
  createdAt: string;
  type: string;
  attachments: Array<{
    url: string;
    originalName: string;
    mimeType: string;
    size: number;
  }>;
  readBy: string[];
  sender?: {
    _id: string;
    fullName: string;
    avatar?: string;
    isCustomer?: boolean;
  };
  metadata?: {
    isCustomerMessage?: boolean;
    customerName?: string;
    customerAvatar?: string;
    crmUserName?: string;
    crmUserRole?: string;
  };
}

interface RelatedCase {
  _id: string;
  caseNumber?: number | null;
  resolved?: boolean;
  resolvedAt?: string | null;
  lastMessage?: string;
  lastMessageAt?: string;
  createdAt: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtRelative(d?: string) {
  if (!d) return "";
  const date = new Date(d);
  if (isToday(date)) return format(date, "h:mm a");
  if (isYesterday(date)) return "Yesterday";
  return format(date, "MMM d");
}

function fmtFull(d: string) {
  return format(new Date(d), "MMM d, yyyy · h:mm a");
}

function ini(name: string) {
  return (name || "?").split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

function fmtSize(b: number) {
  return b < 1048576 ? `${(b / 1024).toFixed(1)} KB` : `${(b / 1048576).toFixed(1)} MB`;
}

function caseTag(n?: number | null) {
  return n != null ? `CASE-${String(n).padStart(4, "0")}` : "CASE-NEW";
}

const MAX_FILES = 5;
const MAX_FILE_SIZE = 25 * 1024 * 1024;
const GROUP_GAP_MS = 3 * 60 * 1000;

function senderKey(m: ConcernMessage) {
  const isCustomer =
    m.metadata?.isCustomerMessage === true || m.sender?.isCustomer === true;
  return isCustomer ? "customer" : m.sender?._id || "crm";
}

function sameGroup(a?: ConcernMessage, b?: ConcernMessage) {
  if (!a || !b) return false;
  if (senderKey(a) !== senderKey(b)) return false;
  return Math.abs(new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) < GROUP_GAP_MS;
}

// ─── Squircle avatar (shared visual unit) ──────────────────────────────────────

function Squircle({
  label,
  tone = "neutral",
  size = "md",
  muted = false,
}: {
  label: string;
  tone?: "primary" | "neutral" | "chart2";
  size?: "sm" | "md" | "lg";
  muted?: boolean;
}) {
  const sizeCls = size === "lg" ? "h-11 w-11 text-sm" : size === "sm" ? "h-7 w-7 text-[10px]" : "h-9 w-9 text-xs";
  const toneCls = muted
    ? "bg-muted text-muted-foreground"
    : tone === "primary"
      ? "bg-primary text-primary-foreground"
      : tone === "chart2"
        ? "bg-chart-2 text-white"
        : "bg-foreground/85 text-background";
  return (
    <div className={cn("shrink-0 rounded-[10px] flex items-center justify-center font-bold tracking-tight", sizeCls, toneCls)}>
      {ini(label)}
    </div>
  );
}

// ─── Date separator ───────────────────────────────────────────────────────────

function DateSep({ date }: { date: string }) {
  const d = new Date(date);
  const label = isToday(d)
    ? "Today"
    : isYesterday(d)
      ? "Yesterday"
      : format(d, "EEEE, MMM d, yyyy");
  return (
    <div className="flex items-center gap-3 my-5 px-5">
      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 font-mono">
        {label}
      </span>
      <div className="flex-1 h-px bg-border" />
    </div>
  );
}

function fmtDate(d: string) {
  return format(new Date(d), "MMM d, yyyy");
}

// ─── Message row (transcript style, not chat-bubble) ───────────────────────────

function ConcernBubble({
  message,
  crmUserId,
  groupStart,
  groupEnd,
  onOpenMedia,
}: {
  message: ConcernMessage;
  crmUserId: string;
  groupStart: boolean;
  groupEnd: boolean;
  onOpenMedia: (att: LightboxAttachment) => void;
}) {
  const isCustomer =
    message.metadata?.isCustomerMessage === true ||
    message.sender?.isCustomer === true;
  const isOwn = !isCustomer && message.sender?._id === crmUserId;

  const senderName = isCustomer
    ? message.metadata?.customerName || message.sender?.fullName || "Customer"
    : message.metadata?.crmUserName || message.sender?.fullName || "Support";

  const roleTag =
    !isCustomer && (message.metadata?.crmUserRole || message.sender?.isCustomer === false)
      ? message.metadata?.crmUserRole || ""
      : "";

  return (
    <div className={cn("flex gap-3 px-5", groupStart ? "pt-3" : "pt-0.5")}>
      <div className="w-7 shrink-0">
        {groupStart && (
          <Squircle label={senderName} size="sm" tone={isCustomer ? "chart2" : "primary"} muted={!isCustomer && !isOwn} />
        )}
      </div>

      <div className="flex flex-col gap-1 min-w-0 flex-1 max-w-[80%]">
        {groupStart && (
          <div className="flex items-center gap-1.5">
            <span className="text-[12px] font-semibold text-foreground">{senderName}</span>
            {isCustomer ? (
              <span className="text-[9px] font-bold uppercase tracking-wide text-chart-2 font-mono">customer</span>
            ) : (
              roleTag && (
                <span className="text-[9px] font-bold uppercase tracking-wide text-muted-foreground font-mono">{roleTag}</span>
              )
            )}
          </div>
        )}

        {message.content && (
          <div
            className={cn(
              "rounded-r-lg rounded-l-[3px] border-l-[3px] px-3.5 py-2 text-sm leading-relaxed wrap-break-word",
              isCustomer
                ? "border-l-chart-2 bg-chart-2/6 text-foreground"
                : isOwn
                  ? "border-l-primary bg-primary/[0.07] text-foreground"
                  : "border-l-border bg-muted/50 text-foreground"
            )}
          >
            {message.content}
          </div>
        )}

        {message.attachments?.length > 0 && (
          <div className="flex flex-col gap-1.5">
            {message.attachments
              .filter((a) => a.mimeType?.startsWith("image/") || a.mimeType?.startsWith("video/"))
              .map((att, i) => {
                const isVideo = att.mimeType?.startsWith("video/");
                return (
                  <button
                    key={i}
                    onClick={() =>
                      onOpenMedia({ src: att.url, type: isVideo ? "video" : "image", name: att.originalName })
                    }
                    className="block rounded-lg overflow-hidden border border-border"
                    style={{ maxWidth: 240 }}
                  >
                    {isVideo ? (
                      <video
                        src={att.url}
                        className="object-cover hover:opacity-90 transition-opacity"
                        style={{ maxHeight: 200, maxWidth: 240, display: "block" }}
                      />
                    ) : (
                      <img
                        src={att.url}
                        alt={att.originalName}
                        className="object-cover hover:opacity-90 transition-opacity"
                        style={{ maxHeight: 200, maxWidth: 240, display: "block" }}
                      />
                    )}
                  </button>
                );
              })}
            {message.attachments
              .filter((a) => !a.mimeType?.startsWith("image/") && !a.mimeType?.startsWith("video/"))
              .map((att, i) => (
                <a
                  key={i}
                  href={att.url}
                  download={att.originalName}
                  className="flex items-center gap-2.5 rounded-lg border border-border bg-muted/40 px-3 py-2 no-underline transition-colors hover:bg-muted"
                  style={{ maxWidth: 260 }}
                >
                  <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium truncate">{att.originalName}</p>
                    <p className="text-[10px] text-muted-foreground/70 font-mono">{fmtSize(att.size)}</p>
                  </div>
                  <Download className="h-3 w-3 shrink-0 text-muted-foreground/60" />
                </a>
              ))}
          </div>
        )}

        {groupEnd && (
          <div className="flex items-center gap-1 px-0.5">
            <span className="text-[10px] text-muted-foreground/50 tabular-nums font-mono">
              {fmtFull(message.createdAt)}
            </span>
            {!isCustomer && isOwn &&
              (message.readBy?.length > 1 ? (
                <CheckCheck className="h-3 w-3 text-primary" />
              ) : (
                <Check className="h-3 w-3 text-muted-foreground/40" />
              ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Conversation list item ───────────────────────────────────────────────────

function ConversationItem({
  conv,
  isActive,
  onClick,
}: {
  conv: ConcernConversation;
  isActive: boolean;
  onClick: () => void;
}) {
  const isResolved = conv.metadata?.resolved;
  const preview =
    conv.lastMessage?.content?.slice(0, 80) ||
    (conv.lastMessage ? "Attachment" : "No messages yet");
  const senderPrefix =
    conv.lastMessage?.metadata?.isCustomerMessage === false
      ? "You: "
      : "";

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-start gap-3 px-3 py-3 text-left transition-colors relative border-l-[3px]",
        isActive ? "bg-primary/6 border-l-primary" : "border-l-transparent hover:bg-muted/50"
      )}
    >
      <Squircle label={conv.metadata?.customerName || conv.name} tone="chart2" muted={!!isResolved} />

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-1">
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <p className={cn("text-sm truncate", conv.unreadCount > 0 ? "font-bold text-foreground" : "font-semibold text-foreground/90")}>
              {conv.metadata?.customerName || conv.name}
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {conv.unreadCount > 0 && (
              <span className="h-4.5 min-w-4.5 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center px-1">
                {conv.unreadCount > 9 ? "9+" : conv.unreadCount}
              </span>
            )}
            <span className="text-[10px] text-muted-foreground/60 tabular-nums font-mono">
              {fmtRelative(conv.lastMessageAt)}
            </span>
          </div>
        </div>
        <p className="text-[10px] font-mono font-semibold tracking-wide text-muted-foreground/60 mt-0.5">
          {caseTag(conv.metadata?.caseNumber)}
        </p>
        <p
          className={cn(
            "text-xs text-muted-foreground truncate mt-0.5",
            conv.unreadCount > 0 && "font-medium text-foreground/80"
          )}
        >
          {senderPrefix}{preview}
        </p>
        {isResolved && (
          <span className="inline-block mt-1.5 text-[9px] font-bold uppercase tracking-wide text-primary font-mono">
            ✓ resolved
          </span>
        )}
      </div>
    </button>
  );
}

// ─── Pending file item ────────────────────────────────────────────────────────

function PendingFile({ file, onRemove }: { file: File; onRemove: () => void }) {
  const isImg = file.type.startsWith("image/");
  const [preview, setPreview] = React.useState<string | null>(null);
  React.useEffect(() => {
    if (isImg) { const u = URL.createObjectURL(file); setPreview(u); return () => URL.revokeObjectURL(u); }
  }, [file, isImg]);
  return (
    <div className="relative flex flex-col rounded-md overflow-hidden shrink-0 border border-border bg-muted" style={{ width: 60 }}>
      {preview
        ? <img src={preview} alt={file.name} className="w-full object-cover" style={{ height: 44 }} />
        : <div className="flex items-center justify-center" style={{ height: 44 }}><FileText className="h-4 w-4 text-muted-foreground" /></div>}
      <p className="px-1 text-[9px] text-muted-foreground truncate">{file.name}</p>
      <button onClick={onRemove} className="absolute top-0.5 right-0.5 h-3.5 w-3.5 rounded-full bg-background/90 flex items-center justify-center border border-border before:absolute before:-inset-2 before:content-['']"><X className="h-2 w-2" /></button>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function CustomersConcernTab() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  const [search, setSearch] = React.useState("");
  const [debSearch, setDebSearch] = React.useState("");
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const [filter, setFilter] = React.useState<"all" | "open" | "resolved">("open");

  const [messages, setMessages] = React.useState<ConcernMessage[]>([]);
  const [loadingMsgs, setLoadingMsgs] = React.useState(false);
  const [hasMore, setHasMore] = React.useState(false);

  const [reply, setReply] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [pendingFiles, setPendingFiles] = React.useState<File[]>([]);
  const [notice, setNotice] = React.useState<{ kind: "error" | "info"; text: string } | null>(null);
  const [resolvingId, setResolvingId] = React.useState<string | null>(null);
  const [lightbox, setLightbox] = React.useState<LightboxAttachment | null>(null);
  const [showHistory, setShowHistory] = React.useState(false);

  const endRef = React.useRef<HTMLDivElement>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);
  const noticeTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce search
  React.useEffect(() => {
    const t = setTimeout(() => setDebSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const showNotice = (kind: "error" | "info", text: string) => {
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    setNotice({ kind, text });
    noticeTimer.current = setTimeout(() => setNotice(null), 3500);
  };

  const getHeaders = React.useCallback(
    async () => ({ headers: { Authorization: `Bearer ${await getToken()}` } }),
    [getToken]
  );

  // ── Fetch all concern conversations ──
  const {
    data: conversations = [],
    isLoading: loadingConvs,
    refetch: refetchConvs,
  } = useQuery({
    queryKey: ["concern-conversations", debSearch],
    queryFn: async () => {
      const h = await getHeaders();
      const r = await apiClient.get("/api/customer-concern/crm/conversations", {
        ...h,
        params: debSearch ? { search: debSearch } : undefined,
      });
      return (r.data?.data || []) as ConcernConversation[];
    },
    refetchInterval: 15_000,
    staleTime: 10_000,
  });

  // Filtered list
  const filteredConvs = conversations.filter((c) => {
    if (filter === "open") return !c.metadata?.resolved;
    if (filter === "resolved") return !!c.metadata?.resolved;
    return true;
  });

  const totalUnread = conversations.reduce((n, c) => n + (c.unreadCount || 0), 0);
  const openCount = conversations.filter((c) => !c.metadata?.resolved).length;

  const activeConv = conversations.find((c) => c._id === activeId) || null;

  // ── Related cases for the active customer (history) ──
  const { data: relatedCases = [] } = useQuery({
    queryKey: ["concern-related-cases", activeId],
    queryFn: async () => {
      const h = await getHeaders();
      const r = await apiClient.get(
        `/api/customer-concern/crm/conversations/${activeId}/related`,
        h
      );
      return (r.data?.data || []) as RelatedCase[];
    },
    enabled: !!activeId,
    staleTime: 15_000,
  });

  React.useEffect(() => {
    setShowHistory(false);
  }, [activeId]);

  // ── Fetch messages for active conversation ──
  const fetchMessages = React.useCallback(
    async (id: string, before?: string) => {
      const h = await getHeaders();
      const params: any = { limit: 40 };
      if (before) params.before = before;
      const r = await apiClient.get(
        `/api/customer-concern/crm/conversations/${id}/messages`,
        { ...h, params }
      );
      const data: ConcernMessage[] = r.data?.data || [];
      if (before) {
        setMessages((p) => [...data, ...p]);
        setHasMore(data.length === 40);
      } else {
        setMessages(data);
        setHasMore(data.length === 40);
      }
    },
    [getHeaders]
  );

  React.useEffect(() => {
    if (!activeId) return;
    setLoadingMsgs(true);
    setMessages([]);
    fetchMessages(activeId)
      .finally(() => setLoadingMsgs(false));
  }, [activeId, fetchMessages]);

  React.useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  // ── Real-time socket (SupraSpace, authenticated via crm_token) ──
  const crmToken = useCrmToken();
  const { socket } = useSupraSpaceSocket(crmToken);

  React.useEffect(() => {
    if (!socket) return;

    const onMsg = ({ conversationId, message }: any) => {
      if (conversationId === activeId) {
        setMessages((p) => p.find((m) => m._id === message._id) ? p : [...p, message]);
      }
      queryClient.invalidateQueries({ queryKey: ["concern-conversations"] });
    };
    const onNew = () => queryClient.invalidateQueries({ queryKey: ["concern-conversations"] });
    const onResolved = () => queryClient.invalidateQueries({ queryKey: ["concern-conversations"] });

    socket.on("message:new", onMsg);
    socket.on("concern:new", onNew);
    socket.on("concern:resolved", onResolved);
    return () => {
      socket.off("message:new", onMsg);
      socket.off("concern:new", onNew);
      socket.off("concern:resolved", onResolved);
    };
  }, [socket, activeId, queryClient]);

  // ── Send reply ──
  const handleSend = async () => {
    if (!activeId || sending) return;
    const hasText = Boolean(reply.trim());
    const hasFiles = pendingFiles.length > 0;
    if (!hasText && !hasFiles) return;

    const h = await getHeaders();
    setSending(true);
    const content = reply.trim();
    const files = pendingFiles;
    setReply("");
    setPendingFiles([]);

    try {
      let r;
      if (hasFiles) {
        const formData = new FormData();
        if (content) formData.append("content", content);
        files.forEach((f) => formData.append("files", f));
        r = await apiClient.post(
          `/api/customer-concern/crm/conversations/${activeId}/reply-upload`,
          formData,
          h
        );
      } else {
        r = await apiClient.post(
          `/api/customer-concern/crm/conversations/${activeId}/reply`,
          { content },
          h
        );
      }
      if (r.data?.data) {
        setMessages((p) =>
          p.find((m) => m._id === r.data.data._id) ? p : [...p, r.data.data]
        );
      }
      queryClient.invalidateQueries({ queryKey: ["concern-conversations"] });
    } catch {
      setReply(content);
      setPendingFiles(files);
      showNotice("error", "Failed to send reply. Please try again.");
    } finally {
      setSending(false);
    }
  };

  // ── Resolve / reopen ──
  const handleResolve = async (resolved: boolean) => {
    if (!activeId) return;
    setResolvingId(activeId);
    try {
      const h = await getHeaders();
      await apiClient.patch(
        `/api/customer-concern/crm/conversations/${activeId}/resolve`,
        { resolved },
        h
      );
      queryClient.invalidateQueries({ queryKey: ["concern-conversations"] });
    } catch {
      showNotice("error", "Failed to update status.");
    } finally {
      setResolvingId(null);
    }
  };

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return;
    const selected = Array.from(files);
    if (pendingFiles.length + selected.length > MAX_FILES) {
      showNotice("error", `Up to ${MAX_FILES} files allowed.`);
      return;
    }
    for (const f of selected) {
      if (f.size > MAX_FILE_SIZE) { showNotice("error", `${f.name} exceeds 25 MB.`); return; }
    }
    setPendingFiles((p) => [...p, ...selected]);
  };

  // ── CRM user id (for own messages) ──
  const crmUserId = React.useMemo(() => {
    try { return JSON.parse(atob(localStorage.getItem("crm_token")?.split(".")[1] || ""))?.id || ""; }
    catch { return ""; }
  }, [crmToken]);

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full min-h-0 overflow-hidden border border-border bg-background">
      {/* ── Left: conversation list ── */}
      <div
        className={cn(
          "flex flex-col border-r border-border shrink-0 overflow-hidden",
          activeId ? "hidden md:flex md:w-72 lg:w-80" : "w-full md:w-72 lg:w-80"
        )}
      >
        {/* List header */}
        <div className="p-3 space-y-2.5 border-b border-border shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                <MessageCircle className="h-3.5 w-3.5 text-primary" />
              </div>
              <p className="font-bold text-sm tracking-tight">Concerns</p>
              {totalUnread > 0 && (
                <span className="h-4.5 min-w-4.5 rounded-full bg-primary text-primary-foreground text-[9px] font-bold px-1.5 flex items-center justify-center">
                  {totalUnread > 99 ? "99+" : totalUnread}
                </span>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => refetchConvs()}
              className="h-9 w-9 p-0 rounded-xl hover:bg-primary/10 hover:text-primary"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search customers…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-xs bg-muted/40 border-border rounded-xl focus-visible:ring-primary/30 focus-visible:border-primary/40"
            />
          </div>

          {/* Filter — underline style */}
          <div className="flex gap-3 border-b border-border -mb-px">
            {(["open", "resolved", "all"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "py-2 text-[11px] font-bold uppercase tracking-wide transition-colors border-b-2",
                  filter === f
                    ? "text-primary border-primary"
                    : "text-muted-foreground border-transparent hover:text-foreground"
                )}
              >
                {f}
                {f === "open" && openCount > 0 && (
                  <span className="ml-1 font-mono opacity-70">{openCount}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto divide-y divide-border/60" style={{ scrollbarWidth: "thin" }}>
          {loadingConvs ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : filteredConvs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center px-4">
              <div className="h-12 w-12 rounded-[10px] bg-muted flex items-center justify-center">
                <MessageCircle className="h-5 w-5 text-muted-foreground/50" />
              </div>
              <p className="text-xs text-muted-foreground">
                {search ? "No results found" : filter === "resolved" ? "No resolved concerns yet" : "No open concerns"}
              </p>
            </div>
          ) : (
            filteredConvs.map((conv) => (
              <ConversationItem
                key={conv._id}
                conv={conv}
                isActive={conv._id === activeId}
                onClick={() => setActiveId(conv._id)}
              />
            ))
          )}
        </div>
      </div>

      {/* ── Right: thread panel ── */}
      <div className={cn("flex flex-col flex-1 min-w-0 overflow-hidden", !activeId && "hidden md:flex")}>
        {!activeId ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-6">
            <div className="h-14 w-14 rounded-[12px] bg-muted flex items-center justify-center">
              <MessageCircle className="h-6 w-6 text-muted-foreground/50" />
            </div>
            <div>
              <p className="font-semibold text-sm">Select a concern</p>
              <p className="text-xs text-muted-foreground mt-1">
                Choose a customer conversation from the list to view and respond.
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Thread header */}
            <div className="shrink-0 flex items-center gap-3 px-4 py-3 border-b border-border bg-card">
              <button
                onClick={() => setActiveId(null)}
                className="md:hidden h-9 w-9 rounded-md flex items-center justify-center hover:bg-muted"
              >
                <ChevronRight className="h-4 w-4 rotate-180" />
              </button>

              <Squircle label={activeConv?.metadata?.customerName || ""} tone="chart2" size="lg" />

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-sm truncate">
                    {activeConv?.metadata?.customerName || "Customer"}
                  </p>
                  {activeConv?.metadata?.resolved && (
                    <span className="text-[9px] font-bold uppercase tracking-wide text-primary font-mono shrink-0">resolved</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-[10px] font-mono font-semibold tracking-wide text-muted-foreground/60">
                    {caseTag(activeConv?.metadata?.caseNumber)}
                  </p>
                  {activeConv?.metadata?.customerEmail && (
                    <p className="text-[11px] text-muted-foreground truncate">
                      · {activeConv.metadata.customerEmail}
                    </p>
                  )}
                </div>
              </div>

              {/* Resolve / reopen button */}
              <div className="flex items-center gap-1.5 shrink-0">
                {activeConv?.metadata?.resolved ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleResolve(false)}
                    disabled={resolvingId === activeId}
                    className="h-9 px-2.5 text-xs gap-1.5 rounded-xl"
                  >
                    {resolvingId === activeId ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <RotateCcw className="h-3 w-3" />
                    )}
                    Reopen
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => handleResolve(true)}
                    disabled={resolvingId === activeId}
                    className="h-9 px-2.5 text-xs gap-1.5 rounded-xl"
                  >
                    {resolvingId === activeId ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-3 w-3" />
                    )}
                    Resolve
                  </Button>
                )}

                <div className="relative">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowHistory((v) => !v)}
                    className={cn(
                      "h-9 px-2 text-xs gap-1.5 rounded-xl",
                      showHistory && "bg-muted"
                    )}
                  >
                    <History className="h-3.5 w-3.5 text-muted-foreground" />
                    History
                    {relatedCases.length > 0 && (
                      <span className="h-4 min-w-4 rounded-full bg-muted-foreground/20 text-[9px] font-bold flex items-center justify-center px-1">
                        {relatedCases.length}
                      </span>
                    )}
                  </Button>

                  {showHistory && (
                    <div className="absolute right-0 top-full mt-1.5 w-[calc(100vw-2rem)] sm:w-72 max-h-80 overflow-y-auto rounded-[10px] border border-border bg-popover shadow-lg z-20 p-1.5">
                      {relatedCases.length === 0 ? (
                        <p className="text-xs text-muted-foreground px-2.5 py-4 text-center">
                          No other cases for this customer.
                        </p>
                      ) : (
                        relatedCases.map((c) => (
                          <button
                            key={c._id}
                            onClick={() => { setActiveId(c._id); setShowHistory(false); }}
                            className="w-full flex flex-col gap-0.5 rounded-md px-2.5 py-2 text-left hover:bg-muted/60 transition-colors"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-mono font-bold">
                                {caseTag(c.caseNumber)}
                              </span>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <span className={cn("text-[9px] font-bold uppercase tracking-wide font-mono", c.resolved ? "text-primary" : "text-chart-2")}>
                                  {c.resolved ? "resolved" : "open"}
                                </span>
                                <span className="text-[10px] text-muted-foreground/60 tabular-nums font-mono">
                                  {fmtRelative(c.lastMessageAt || c.createdAt)}
                                </span>
                              </div>
                            </div>
                            <p className="text-[11px] text-muted-foreground truncate">
                              {c.lastMessage || "No messages yet"}
                            </p>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 min-h-0 overflow-y-auto py-3" style={{ scrollbarWidth: "thin" }}>
              {hasMore && (
                <div className="flex justify-center pb-3">
                  <button
                    onClick={async () => {
                      if (loadingMsgs || !hasMore) return;
                      setLoadingMsgs(true);
                      await fetchMessages(activeId, messages[0]?.createdAt);
                      setLoadingMsgs(false);
                    }}
                    className="text-[11px] font-mono text-muted-foreground px-3 py-1 rounded-full bg-muted/50 hover:bg-muted transition-colors"
                  >
                    {loadingMsgs ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "↑ load earlier"}
                  </button>
                </div>
              )}

              {loadingMsgs && messages.length === 0 ? (
                <div className="flex justify-center py-16">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3 text-center px-6">
                  <div className="h-12 w-12 rounded-[10px] bg-muted flex items-center justify-center">
                    <MessageCircle className="h-5 w-5 text-muted-foreground/50" />
                  </div>
                  <p className="text-sm font-medium">No messages yet</p>
                  <p className="text-xs text-muted-foreground">
                    The customer hasn't sent any messages in this conversation.
                  </p>
                </div>
              ) : (
                messages.map((msg, i) => {
                  const prev = messages[i - 1];
                  const next = messages[i + 1];
                  const showDate = !prev || fmtDate(msg.createdAt) !== fmtDate(prev.createdAt);
                  const groupStart = showDate || !sameGroup(prev, msg);
                  const groupEnd = !next || fmtDate(next.createdAt) !== fmtDate(msg.createdAt) || !sameGroup(msg, next);
                  return (
                    <React.Fragment key={msg._id}>
                      {showDate && <DateSep date={msg.createdAt} />}
                      <ConcernBubble
                        message={msg}
                        crmUserId={crmUserId}
                        groupStart={groupStart}
                        groupEnd={groupEnd}
                        onOpenMedia={setLightbox}
                      />
                    </React.Fragment>
                  );
                })
              )}
              <div ref={endRef} />
            </div>

            {/* Reply input */}
            <div className="shrink-0 px-3 pb-3 pt-2 border-t border-border space-y-1.5">
              {/* Pending files row */}
              {pendingFiles.length > 0 && (
                <div className="flex gap-1.5 overflow-x-auto pb-0.5">
                  {pendingFiles.map((f, i) => (
                    <PendingFile key={i} file={f} onRemove={() => setPendingFiles((p) => p.filter((_, idx) => idx !== i))} />
                  ))}
                </div>
              )}

              {/* Notice */}
              {notice && (
                <p className={cn("text-[11px] px-1", notice.kind === "error" ? "text-destructive" : "text-muted-foreground")}>
                  {notice.text}
                </p>
              )}

              {activeConv?.metadata?.resolved ? (
                <div className="flex items-center justify-center py-2.5 rounded-xl bg-muted/40 border border-border">
                  <p className="text-xs text-muted-foreground">
                    This case is resolved. Customer can start a new conversation anytime.{" "}
                    <button onClick={() => handleResolve(false)} className="underline hover:text-foreground transition-colors">
                      Reopen to reply.
                    </button>
                  </p>
                </div>
              ) : (
                <div className="flex items-end gap-2 rounded-[10px] border border-border bg-muted/20 px-3 py-2 focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/15 transition-all">
                  <textarea
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
                    }}
                    placeholder="Reply to customer…"
                    rows={1}
                    className="flex-1 resize-none bg-transparent text-sm focus:outline-none min-h-7 max-h-28 py-0.5 placeholder:text-muted-foreground/50"
                    style={{ lineHeight: "1.55" }}
                  />
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => fileRef.current?.click()}
                      className="h-9 w-9 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    >
                      <Paperclip className="h-4 w-4" />
                    </button>
                    <input ref={fileRef} type="file" multiple accept="*/*" className="sr-only"
                      onChange={(e) => { handleFileSelect(e.target.files); e.currentTarget.value = ""; }} />
                    <button
                      onClick={handleSend}
                      disabled={(!reply.trim() && pendingFiles.length === 0) || sending}
                      className={cn(
                        "h-9 w-9 rounded-xl flex items-center justify-center transition-all",
                        reply.trim() || pendingFiles.length > 0
                          ? "bg-primary hover:bg-primary/90 text-primary-foreground"
                          : "bg-muted text-muted-foreground/40 cursor-not-allowed"
                      )}
                    >
                      {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <AttachmentLightbox attachment={lightbox} onClose={() => setLightbox(null)} />
    </div>
  );
}
