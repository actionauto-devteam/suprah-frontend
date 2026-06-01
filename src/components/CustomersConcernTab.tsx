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
  Users,
  ChevronRight,
  X,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/providers/AuthProvider";
import { format, isToday, isYesterday } from "date-fns";

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

const MAX_FILES = 5;
const MAX_FILE_SIZE = 25 * 1024 * 1024;

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
      <div className="flex-1 h-px bg-border/40" />
      <span className="text-[10px] font-medium text-muted-foreground/60 bg-muted px-2.5 py-0.5 rounded-full border border-border/30">
        {label}
      </span>
      <div className="flex-1 h-px bg-border/40" />
    </div>
  );
}

function fmtDate(d: string) {
  return format(new Date(d), "MMM d, yyyy");
}

// ─── Message bubble (CRM view) ────────────────────────────────────────────────

function ConcernBubble({
  message,
  crmUserId,
}: {
  message: ConcernMessage;
  crmUserId: string;
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
    <div
      className={cn(
        "flex gap-2.5 px-5 py-1",
        isOwn && !isCustomer && "flex-row-reverse"
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          "h-7 w-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-bold text-white",
          isCustomer ? "bg-blue-600" : isOwn ? "bg-violet-600" : "bg-teal-600"
        )}
      >
        {ini(senderName)}
      </div>

      <div
        className={cn(
          "flex flex-col gap-0.5 max-w-[72%]",
          (isOwn && !isCustomer) && "items-end"
        )}
      >
        {/* Sender label */}
        <div className="flex items-center gap-1.5 px-0.5">
          <span className="text-[11px] font-medium text-muted-foreground">
            {senderName}
          </span>
          {isCustomer && (
            <Badge variant="outline" className="h-4 px-1.5 text-[9px] border-blue-500/30 text-blue-600 bg-blue-500/5">
              Customer
            </Badge>
          )}
          {roleTag && (
            <Badge variant="outline" className="h-4 px-1.5 text-[9px]">
              {roleTag}
            </Badge>
          )}
        </div>

        {/* Text bubble */}
        {message.content && (
          <div
            className={cn(
              "rounded-2xl px-3.5 py-2 text-sm leading-relaxed break-words",
              isCustomer
                ? "bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40 text-foreground rounded-tl-sm"
                : isOwn
                ? "bg-violet-600 text-white rounded-tr-sm"
                : "bg-muted border border-border/40 text-foreground rounded-tl-sm"
            )}
          >
            {message.content}
          </div>
        )}

        {/* Attachments */}
        {message.attachments?.length > 0 && (
          <div className="flex flex-col gap-1.5 mt-0.5">
            {message.attachments
              .filter((a) => a.mimeType?.startsWith("image/"))
              .map((att, i) => (
                <a
                  key={i}
                  href={att.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block rounded-xl overflow-hidden"
                  style={{ maxWidth: 240 }}
                >
                  <img
                    src={att.url}
                    alt={att.originalName}
                    className="rounded-xl object-cover hover:opacity-90 transition-opacity"
                    style={{ maxHeight: 200, maxWidth: 240, display: "block" }}
                  />
                </a>
              ))}
            {message.attachments
              .filter((a) => !a.mimeType?.startsWith("image/"))
              .map((att, i) => (
                <a
                  key={i}
                  href={att.url}
                  download={att.originalName}
                  className={cn(
                    "flex items-center gap-2.5 rounded-xl px-3 py-2 no-underline transition-opacity hover:opacity-80",
                    isCustomer
                      ? "bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40"
                      : "bg-muted border border-border/40"
                  )}
                  style={{ maxWidth: 260 }}
                >
                  <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium truncate">{att.originalName}</p>
                    <p className="text-[10px] opacity-50">{fmtSize(att.size)}</p>
                  </div>
                  <Download className="h-3 w-3 shrink-0 opacity-50" />
                </a>
              ))}
          </div>
        )}

        {/* Meta */}
        <div
          className={cn(
            "flex items-center gap-1 px-0.5",
            (isOwn && !isCustomer) && "flex-row-reverse"
          )}
        >
          <span className="text-[10px] text-muted-foreground/50 tabular-nums">
            {fmtFull(message.createdAt)}
          </span>
          {!isCustomer && isOwn &&
            (message.readBy?.length > 1 ? (
              <CheckCheck className="h-3 w-3 text-violet-500" />
            ) : (
              <Check className="h-3 w-3 text-muted-foreground/40" />
            ))}
        </div>
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
    (conv.lastMessage ? "📎 Attachment" : "No messages yet");
  const senderPrefix =
    conv.lastMessage?.metadata?.isCustomerMessage === false
      ? "You: "
      : "";

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-start gap-3 px-3 py-3 text-left rounded-xl transition-all relative",
        isActive
          ? "bg-primary/8 ring-1 ring-primary/20"
          : "hover:bg-muted/60"
      )}
    >
      {/* Active indicator */}
      {isActive && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-8 bg-primary rounded-r" />
      )}

      {/* Avatar */}
      <div
        className={cn(
          "h-9 w-9 rounded-full flex items-center justify-center shrink-0 text-xs font-bold text-white mt-0.5",
          isResolved ? "bg-muted-foreground/40" : "bg-blue-600"
        )}
      >
        {ini(conv.metadata?.customerName || conv.name)}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-1">
          <p
            className={cn(
              "text-sm font-semibold truncate flex-1",
              conv.unreadCount > 0 && "font-bold"
            )}
          >
            {conv.metadata?.customerName || conv.name}
          </p>
          <div className="flex items-center gap-1.5 shrink-0">
            {conv.unreadCount > 0 && (
              <span className="h-4.5 min-w-4.5 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center px-1">
                {conv.unreadCount > 9 ? "9+" : conv.unreadCount}
              </span>
            )}
            <span className="text-[10px] text-muted-foreground/60 tabular-nums">
              {fmtRelative(conv.lastMessageAt)}
            </span>
          </div>
        </div>
        {conv.metadata?.customerEmail && (
          <p className="text-[11px] text-muted-foreground/60 truncate mt-0.5">
            {conv.metadata.customerEmail}
          </p>
        )}
        <p
          className={cn(
            "text-xs text-muted-foreground truncate mt-0.5",
            conv.unreadCount > 0 && "font-medium text-foreground/80"
          )}
        >
          {senderPrefix}{preview}
        </p>
        {isResolved && (
          <Badge
            variant="outline"
            className="mt-1 h-4 px-1.5 text-[9px] border-emerald-500/30 text-emerald-600 bg-emerald-500/5"
          >
            Resolved
          </Badge>
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
    <div className="relative flex flex-col rounded-lg overflow-hidden shrink-0 border border-border/40 bg-muted" style={{ width: 60 }}>
      {preview
        ? <img src={preview} alt={file.name} className="w-full object-cover" style={{ height: 44 }} />
        : <div className="flex items-center justify-center" style={{ height: 44 }}><FileText className="h-4 w-4 text-muted-foreground" /></div>}
      <p className="px-1 text-[9px] text-muted-foreground truncate">{file.name}</p>
      <button onClick={onRemove} className="absolute top-0.5 right-0.5 h-3.5 w-3.5 rounded-full bg-background/80 flex items-center justify-center"><X className="h-2 w-2" /></button>
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

  // ── Real-time socket ──
  React.useEffect(() => {
    const socket = (window as any).__socket || (window as any)._socket;
    if (!socket) return;

    const onMsg = ({ conversationId, message }: any) => {
      if (conversationId === activeId) {
        setMessages((p) => p.find((m) => m._id === message._id) ? p : [...p, message]);
      }
      queryClient.invalidateQueries({ queryKey: ["concern-conversations"] });
    };
    const onNew = () => queryClient.invalidateQueries({ queryKey: ["concern-conversations"] });
    const onResolved = ({ conversationId, resolved }: any) => {
      queryClient.invalidateQueries({ queryKey: ["concern-conversations"] });
    };

    socket.on("message:new", onMsg);
    socket.on("concern:new", onNew);
    socket.on("concern:message", onNew);
    socket.on("concern:resolved", onResolved);
    return () => {
      socket.off("message:new", onMsg);
      socket.off("concern:new", onNew);
      socket.off("concern:message", onNew);
      socket.off("concern:resolved", onResolved);
    };
  }, [activeId, queryClient]);

  // ── Send reply ──
  const handleSend = async () => {
    if (!activeId || sending) return;
    const hasText = Boolean(reply.trim());
    const hasFiles = pendingFiles.length > 0;
    if (!hasText && !hasFiles) return;

    const h = await getHeaders();
    setSending(true);
    const content = reply.trim();
    setReply("");
    setPendingFiles([]);

    try {
      const r = await apiClient.post(
        `/api/customer-concern/crm/conversations/${activeId}/reply`,
        {
          content,
          ...(hasFiles ? { attachments: [] } : {}), // Files handled separately below
        },
        h
      );
      if (r.data?.data) {
        setMessages((p) =>
          p.find((m) => m._id === r.data.data._id) ? p : [...p, r.data.data]
        );
      }
      queryClient.invalidateQueries({ queryKey: ["concern-conversations"] });
    } catch {
      setReply(content);
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
  // Adjust to your actual CRM auth context
  const crmUserId = React.useMemo(() => {
    try { return JSON.parse(atob(localStorage.getItem("crm_token")?.split(".")[1] || ""))?.sub || ""; }
    catch { return ""; }
  }, []);

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full min-h-0 overflow-hidden rounded-xl border border-border/50 bg-background">
      {/* ── Left: conversation list ── */}
      <div
        className={cn(
          "flex flex-col border-r border-border/50 shrink-0 overflow-hidden",
          activeId ? "hidden md:flex md:w-72 lg:w-80" : "w-full md:w-72 lg:w-80"
        )}
      >
        {/* List header */}
        <div className="p-3 space-y-2.5 border-b border-border/50 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <p className="font-semibold text-sm">Customer's Concerns</p>
              {totalUnread > 0 && (
                <Badge className="h-4.5 min-w-4.5 rounded-full text-[9px] font-bold px-1.5">
                  {totalUnread > 99 ? "99+" : totalUnread}
                </Badge>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => refetchConvs()}
              className="h-7 w-7 p-0"
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
              className="pl-8 h-8 text-xs bg-muted/40 border-border/40"
            />
          </div>

          {/* Filter pills */}
          <div className="flex gap-1">
            {(["open", "resolved", "all"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "flex-1 h-6 rounded-lg text-[11px] font-medium transition-all capitalize",
                  filter === f
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted/50 text-muted-foreground hover:text-foreground"
                )}
              >
                {f}
                {f === "open" && openCount > 0 && (
                  <span className="ml-1 opacity-70">· {openCount}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-0.5" style={{ scrollbarWidth: "thin" }}>
          {loadingConvs ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : filteredConvs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center px-4">
              <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center">
                <MessageCircle className="h-5 w-5 text-muted-foreground" />
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
            <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center">
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
            <div className="shrink-0 flex items-center gap-3 px-4 py-3 border-b border-border/50 bg-card">
              <button
                onClick={() => setActiveId(null)}
                className="md:hidden h-7 w-7 rounded-lg flex items-center justify-center hover:bg-muted"
              >
                <ChevronRight className="h-4 w-4 rotate-180" />
              </button>

              <div
                className="h-9 w-9 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0"
              >
                {ini(activeConv?.metadata?.customerName || "")}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-sm truncate">
                    {activeConv?.metadata?.customerName || "Customer"}
                  </p>
                  {activeConv?.metadata?.resolved && (
                    <Badge variant="outline" className="h-4 px-1.5 text-[9px] border-emerald-500/30 text-emerald-600 bg-emerald-500/5 shrink-0">
                      Resolved
                    </Badge>
                  )}
                </div>
                {activeConv?.metadata?.customerEmail && (
                  <p className="text-[11px] text-muted-foreground truncate">
                    {activeConv.metadata.customerEmail}
                  </p>
                )}
              </div>

              {/* Resolve / reopen button */}
              <div className="flex items-center gap-1.5 shrink-0">
                {activeConv?.metadata?.resolved ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleResolve(false)}
                        disabled={resolvingId === activeId}
                        className="h-7 px-2.5 text-xs gap-1.5 border-amber-500/30 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/20"
                      >
                        {resolvingId === activeId ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <RotateCcw className="h-3 w-3" />
                        )}
                        Reopen
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Reopen this concern</TooltipContent>
                  </Tooltip>
                ) : (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="sm"
                        onClick={() => handleResolve(true)}
                        disabled={resolvingId === activeId}
                        className="h-7 px-2.5 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700"
                      >
                        {resolvingId === activeId ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-3 w-3" />
                        )}
                        Resolve
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Mark as resolved</TooltipContent>
                  </Tooltip>
                )}

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                      <Users className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="text-xs">
                      <p className="font-medium mb-1">Handling team</p>
                      {activeConv?.members.map((m) => (
                        <p key={m._id} className="text-muted-foreground">{m.fullName}</p>
                      ))}
                    </div>
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 min-h-0 overflow-y-auto py-3 space-y-0.5" style={{ scrollbarWidth: "thin" }}>
              {hasMore && (
                <div className="flex justify-center pb-3">
                  <button
                    onClick={async () => {
                      if (loadingMsgs || !hasMore) return;
                      setLoadingMsgs(true);
                      await fetchMessages(activeId, messages[0]?.createdAt);
                      setLoadingMsgs(false);
                    }}
                    className="text-[11px] text-muted-foreground px-3 py-1 rounded-full bg-muted/50 hover:bg-muted transition-colors"
                  >
                    {loadingMsgs ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "↑ Load earlier"}
                  </button>
                </div>
              )}

              {loadingMsgs && messages.length === 0 ? (
                <div className="flex justify-center py-16">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3 text-center px-6">
                  <p className="text-sm font-medium">No messages yet</p>
                  <p className="text-xs text-muted-foreground">
                    The customer hasn't sent any messages in this conversation.
                  </p>
                </div>
              ) : (
                messages.map((msg, i) => {
                  const prev = messages[i - 1];
                  const showDate = !prev || fmtDate(msg.createdAt) !== fmtDate(prev.createdAt);
                  return (
                    <React.Fragment key={msg._id}>
                      {showDate && <DateSep date={msg.createdAt} />}
                      <ConcernBubble message={msg} crmUserId={crmUserId} />
                    </React.Fragment>
                  );
                })
              )}
              <div ref={endRef} />
            </div>

            {/* Reply input */}
            <div className="shrink-0 px-3 pb-3 pt-2 border-t border-border/50 space-y-1.5">
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
                <div className="flex items-center justify-center py-2.5 rounded-xl bg-muted/40 border border-border/30">
                  <p className="text-xs text-muted-foreground">
                    Concern is resolved.{" "}
                    <button onClick={() => handleResolve(false)} className="underline hover:text-foreground transition-colors">
                      Reopen to reply.
                    </button>
                  </p>
                </div>
              ) : (
                <div className="flex items-end gap-2 rounded-xl border border-border/60 bg-muted/20 px-3 py-2 focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                  <textarea
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
                    }}
                    placeholder="Reply to customer…"
                    rows={1}
                    className="flex-1 resize-none bg-transparent text-sm focus:outline-none min-h-[28px] max-h-28 py-0.5 placeholder:text-muted-foreground/50"
                    style={{ lineHeight: "1.55" }}
                  />
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => fileRef.current?.click()}
                      className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    >
                      <Paperclip className="h-4 w-4" />
                    </button>
                    <input ref={fileRef} type="file" multiple accept="*/*" className="sr-only"
                      onChange={(e) => { handleFileSelect(e.target.files); e.currentTarget.value = ""; }} />
                    <button
                      onClick={handleSend}
                      disabled={(!reply.trim() && pendingFiles.length === 0) || sending}
                      className={cn(
                        "h-7 w-7 rounded-lg flex items-center justify-center transition-all",
                        reply.trim() || pendingFiles.length > 0
                          ? "bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
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
    </div>
  );
}