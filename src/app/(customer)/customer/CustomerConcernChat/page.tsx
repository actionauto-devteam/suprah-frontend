"use client";

import * as React from "react";
import {
  MessageCircle,
  X,
  Send,
  Paperclip,
  Loader2,
  CheckCheck,
  Check,
  ChevronDown,
  FileText,
  Download,
  Mic,
  StopCircle,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { useUser } from "@/providers/AuthProvider";
import { cn } from "@/lib/utils";

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

interface ConcernConversation {
  _id: string;
  name: string;
  metadata: {
    type: string;
    customerUserId: string;
    resolved?: boolean;
  };
  lastMessageAt?: string;
}

type Mode = "page" | "float";

// ─── Constants ───────────────────────────────────────────────────────────────

const MAX_FILE_SIZE = 25 * 1024 * 1024;
const MAX_FILES = 5;

function fmtTime(d: string) {
  return new Date(d).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
function fmtSize(b: number) {
  return b < 1048576 ? `${(b / 1024).toFixed(1)} KB` : `${(b / 1048576).toFixed(1)} MB`;
}
function ini(name: string) {
  return (name || "?")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// ─── Message bubble ───────────────────────────────────────────────────────────

function MessageBubble({
  message,
  customerUserId,
}: {
  message: ConcernMessage;
  customerUserId: string;
}) {
  const isOwn = message.metadata?.isCustomerMessage === true ||
    message.sender?._id === customerUserId;
  const senderName = isOwn
    ? "You"
    : message.metadata?.crmUserName || message.sender?.fullName || "Support";

  return (
    <div className={cn("flex gap-2.5 px-4 py-1", isOwn && "flex-row-reverse")}>
      {/* Avatar */}
      <div
        className={cn(
          "h-7 w-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-bold text-white",
          isOwn ? "bg-emerald-600" : "bg-violet-600"
        )}
      >
        {ini(senderName)}
      </div>

      <div className={cn("flex flex-col gap-1 max-w-[75%]", isOwn && "items-end")}>
        <span className="px-0.5 text-[11px] font-medium text-muted-foreground">
          {senderName}
          {!isOwn && message.metadata?.crmUserRole && (
            <span className="ml-1 opacity-60">· {message.metadata.crmUserRole}</span>
          )}
        </span>

        {/* Text content */}
        {message.content && (
          <div
            className={cn(
              "rounded-2xl px-3.5 py-2 text-sm leading-relaxed break-words",
              isOwn
                ? "bg-emerald-600 text-white rounded-tr-sm"
                : "bg-muted text-foreground rounded-tl-sm border border-border/40"
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
                  style={{ maxWidth: 220 }}
                >
                  <img
                    src={att.url}
                    alt={att.originalName}
                    className="rounded-xl object-cover hover:opacity-90 transition-opacity"
                    style={{ maxHeight: 180, maxWidth: 220, display: "block" }}
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
                    isOwn
                      ? "bg-emerald-700/50 border border-white/10"
                      : "bg-muted border border-border/40"
                  )}
                  style={{ maxWidth: 220 }}
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
        <div className={cn("flex items-center gap-1 px-0.5", isOwn && "flex-row-reverse")}>
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
      </div>
    </div>
  );
}

// ─── Date separator ───────────────────────────────────────────────────────────

function DateSep({ date }: { date: string }) {
  const d = new Date(date);
  const now = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / 86400000);
  const label =
    diff === 0 ? "Today" : diff === 1 ? "Yesterday" : d.toLocaleDateString([], { month: "short", day: "numeric" });
  return (
    <div className="flex items-center gap-3 my-4 px-4">
      <div className="flex-1 h-px bg-border/40" />
      <span className="text-[10px] text-muted-foreground/60 bg-muted px-2 py-0.5 rounded-full border border-border/30">
        {label}
      </span>
      <div className="flex-1 h-px bg-border/40" />
    </div>
  );
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
}

// ─── Pending file preview ─────────────────────────────────────────────────────

function PendingFileItem({ file, onRemove }: { file: File; onRemove: () => void }) {
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
      className="relative flex flex-col rounded-lg overflow-hidden shrink-0 border border-border/40"
      style={{ width: 64, background: "var(--muted)" }}
    >
      {preview ? (
        <img src={preview} alt={file.name} className="w-full object-cover" style={{ height: 48 }} />
      ) : (
        <div className="flex items-center justify-center" style={{ height: 48 }}>
          <FileText className="h-5 w-5 text-muted-foreground" />
        </div>
      )}
      <div className="px-1 py-0.5">
        <p className="truncate text-[9px] text-muted-foreground font-medium">{file.name}</p>
      </div>
      <button
        onClick={onRemove}
        className="absolute top-0.5 right-0.5 h-4 w-4 rounded-full bg-background/80 border border-border/50 flex items-center justify-center"
      >
        <X className="h-2.5 w-2.5" />
      </button>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function CustomerConcernChat({ mode = "page" }: { mode?: Mode }) {
  const { user } = useUser();
  const [open, setOpen] = React.useState(mode === "page");
  const [conversation, setConversation] = React.useState<ConcernConversation | null>(null);
  const [messages, setMessages] = React.useState<ConcernMessage[]>([]);
  const [input, setInput] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [hasMore, setHasMore] = React.useState(false);
  const [pendingFiles, setPendingFiles] = React.useState<File[]>([]);
  const [notice, setNotice] = React.useState<{ kind: "error" | "info"; text: string } | null>(null);
  const [unread, setUnread] = React.useState(0);

  const endRef = React.useRef<HTMLDivElement>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);
  const noticeTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const showNotice = (kind: "error" | "info", text: string) => {
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    setNotice({ kind, text });
    noticeTimer.current = setTimeout(() => setNotice(null), 3500);
  };

  // Get auth token (adjust to your token storage approach)
  const getToken = () =>
    typeof window !== "undefined" ? localStorage.getItem("customer_token") || "" : "";

  // ── Init conversation ──
  const init = React.useCallback(async () => {
    setLoading(true);
    try {
      const token = getToken();
      const r = await apiClient.get("/api/customer-concern/init", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setConversation(r.data?.data || null);
    } catch {
      showNotice("error", "Could not connect to support. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Fetch messages ──
  const fetchMessages = React.useCallback(
    async (before?: string) => {
      const token = getToken();
      const params: any = { limit: 40 };
      if (before) params.before = before;
      const r = await apiClient.get("/api/customer-concern/messages", {
        headers: { Authorization: `Bearer ${token}` },
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
    []
  );

  // ── Open handler ──
  React.useEffect(() => {
    if (open && !conversation) {
      init().then(() => fetchMessages());
    } else if (open && conversation) {
      fetchMessages();
    }
  }, [open]); // eslint-disable-line

  // ── Scroll to bottom ──
  React.useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  // ── Socket: real-time updates ──
  React.useEffect(() => {
    // Attach to the socket exposed globally by the customer app if available.
    // Adjust to your actual socket setup.
    const socketCandidates = ["__customerSocket", "__socket", "_socket"];
    let socket: any = null;
    for (const key of socketCandidates) {
      if ((window as any)[key]?.on) { socket = (window as any)[key]; break; }
    }
    if (!socket) return;

    const onReply = ({ message }: { conversationId: string; message: ConcernMessage }) => {
      setMessages((p) => {
        if (p.find((m) => m._id === message._id)) return p;
        return [...p, message];
      });
      if (!open) setUnread((n) => n + 1);
    };
    socket.on("concern:reply", onReply);
    socket.on("message:new", ({ message }: any) => {
      setMessages((p) => {
        if (p.find((m) => m._id === message._id)) return p;
        return [...p, message];
      });
    });
    return () => {
      socket.off("concern:reply", onReply);
    };
  }, [open]);

  // ── Send message ──
  const handleSend = async () => {
    if (sending) return;
    const hasText = Boolean(input.trim());
    const hasFiles = pendingFiles.length > 0;
    if (!hasText && !hasFiles) return;

    const token = getToken();
    setSending(true);
    const content = input.trim();
    setInput("");

    try {
      if (hasFiles) {
        const fd = new FormData();
        pendingFiles.forEach((f) => fd.append("files", f));
        if (content) fd.append("content", content);
        const r = await apiClient.post("/api/customer-concern/upload", fd, {
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" },
        });
        if (r.data?.data) {
          setMessages((p) =>
            p.find((m) => m._id === r.data.data._id) ? p : [...p, r.data.data]
          );
        }
        setPendingFiles([]);
      } else {
        const r = await apiClient.post(
          "/api/customer-concern/messages",
          { content },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (r.data?.data) {
          setMessages((p) =>
            p.find((m) => m._id === r.data.data._id) ? p : [...p, r.data.data]
          );
        }
      }
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
    if (loadingMore || !hasMore || messages.length === 0) return;
    setLoadingMore(true);
    await fetchMessages(messages[0].createdAt).catch(() => {});
    setLoadingMore(false);
  };

  // ── Resolved state banner ──
  const isResolved = conversation?.metadata?.resolved;

  // ─────────────────── Floating trigger (mode="float") ───────────────────────
  if (mode === "float") {
    return (
      <>
        {/* Floating button */}
        {!open && (
          <button
            onClick={() => { setOpen(true); setUnread(0); }}
            className={cn(
              "fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg flex items-center justify-center",
              "bg-emerald-600 hover:bg-emerald-700 text-white transition-all"
            )}
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

        {/* Floating panel */}
        {open && (
          <div
            className={cn(
              "fixed bottom-6 right-6 z-50 w-[360px] rounded-2xl shadow-2xl border border-border/50",
              "bg-background flex flex-col overflow-hidden"
            )}
            style={{ height: 520 }}
          >
            <ChatHeader
              onClose={() => setOpen(false)}
              isResolved={!!isResolved}
            />
            <ChatBody
              messages={messages}
              loading={loading}
              loadingMore={loadingMore}
              hasMore={hasMore}
              onLoadMore={loadMore}
              customerUserId={user?.id || ""}
              endRef={endRef}
            />
            <ChatInput
              input={input}
              onInput={setInput}
              onSend={handleSend}
              sending={sending}
              pendingFiles={pendingFiles}
              onFileSelect={handleFileSelect}
              onRemoveFile={(i) => setPendingFiles((p) => p.filter((_, idx) => idx !== i))}
              fileRef={fileRef}
              notice={notice}
              disabled={!!isResolved}
            />
          </div>
        )}
      </>
    );
  }

  // ─────────────────── Full page (mode="page") ───────────────────────────────
  return (
    <div className="flex flex-col h-full min-h-0 rounded-2xl border border-border/50 bg-background overflow-hidden">
      <ChatHeader isResolved={!!isResolved} />
      <ChatBody
        messages={messages}
        loading={loading}
        loadingMore={loadingMore}
        hasMore={hasMore}
        onLoadMore={loadMore}
        customerUserId={user?.id || ""}
        endRef={endRef}
      />
      <ChatInput
        input={input}
        onInput={setInput}
        onSend={handleSend}
        sending={sending}
        pendingFiles={pendingFiles}
        onFileSelect={handleFileSelect}
        onRemoveFile={(i) => setPendingFiles((p) => p.filter((_, idx) => idx !== i))}
        fileRef={fileRef}
        notice={notice}
        disabled={!!isResolved}
      />
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ChatHeader({
  onClose,
  isResolved,
}: {
  onClose?: () => void;
  isResolved: boolean;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-border/50 bg-card shrink-0">
      <div className="h-8 w-8 rounded-full bg-emerald-600/10 border border-emerald-600/20 flex items-center justify-center">
        <MessageCircle className="h-4 w-4 text-emerald-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm leading-none">Support Chat</p>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          {isResolved ? (
            <span className="text-emerald-600">✓ Resolved</span>
          ) : (
            "Our team typically replies within a few hours"
          )}
        </p>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="h-7 w-7 rounded-lg flex items-center justify-center hover:bg-muted transition-colors"
        >
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </button>
      )}
    </div>
  );
}

function ChatBody({
  messages,
  loading,
  loadingMore,
  hasMore,
  onLoadMore,
  customerUserId,
  endRef,
}: {
  messages: ConcernMessage[];
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  customerUserId: string;
  endRef: React.RefObject<HTMLDivElement | null>;
}) {
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div
      className="flex-1 overflow-y-auto py-3 space-y-0.5"
      style={{ scrollbarWidth: "thin" }}
    >
      {hasMore && (
        <div className="flex justify-center pb-2">
          <button
            onClick={onLoadMore}
            className="text-[11px] text-muted-foreground px-3 py-1 rounded-full bg-muted/50 hover:bg-muted transition-colors"
          >
            {loadingMore ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "↑ Load earlier"}
          </button>
        </div>
      )}

      {messages.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full gap-3 py-12 px-6 text-center">
          <div className="h-12 w-12 rounded-2xl bg-emerald-600/10 border border-emerald-600/20 flex items-center justify-center">
            <MessageCircle className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <p className="font-semibold text-sm">How can we help?</p>
            <p className="text-xs text-muted-foreground mt-1">
              Send us a message and our support team will get back to you.
            </p>
          </div>
        </div>
      ) : (
        <>
          {messages.map((msg, i) => {
            const prev = messages[i - 1];
            const showDate = !prev || fmtDate(msg.createdAt) !== fmtDate(prev.createdAt);
            return (
              <React.Fragment key={msg._id}>
                {showDate && <DateSep date={msg.createdAt} />}
                <MessageBubble message={msg} customerUserId={customerUserId} />
              </React.Fragment>
            );
          })}
        </>
      )}
      <div ref={endRef} />
    </div>
  );
}

function ChatInput({
  input,
  onInput,
  onSend,
  sending,
  pendingFiles,
  onFileSelect,
  onRemoveFile,
  fileRef,
  notice,
  disabled,
}: {
  input: string;
  onInput: (v: string) => void;
  onSend: () => void;
  sending: boolean;
  pendingFiles: File[];
  onFileSelect: (f: FileList | null) => void;
  onRemoveFile: (i: number) => void;
  fileRef: React.RefObject<HTMLInputElement | null>;
  notice: { kind: "error" | "info"; text: string } | null;
  disabled?: boolean;
}) {
  if (disabled) {
    return (
      <div className="shrink-0 px-4 py-3 border-t border-border/50 text-center">
        <p className="text-xs text-muted-foreground">
          This concern has been resolved. Contact support to reopen.
        </p>
      </div>
    );
  }

  return (
    <div className="shrink-0 px-3 pb-3 pt-2 space-y-1.5 border-t border-border/50">
      {/* Pending files */}
      {pendingFiles.length > 0 && (
        <div className="flex gap-1.5 overflow-x-auto pb-0.5">
          {pendingFiles.map((f, i) => (
            <PendingFileItem key={i} file={f} onRemove={() => onRemoveFile(i)} />
          ))}
        </div>
      )}

      {/* Notice */}
      {notice && (
        <p
          className={cn(
            "text-[11px] px-1",
            notice.kind === "error" ? "text-destructive" : "text-muted-foreground"
          )}
        >
          {notice.text}
        </p>
      )}

      <div className="flex items-end gap-2 rounded-xl border border-border/60 bg-muted/30 px-3 py-2 focus-within:border-emerald-500/50 focus-within:ring-2 focus-within:ring-emerald-500/20 transition-all">
        <textarea
          value={input}
          onChange={(e) => onInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSend(); }
          }}
          placeholder="Type a message…"
          rows={1}
          className="flex-1 resize-none bg-transparent text-sm focus:outline-none min-h-[28px] max-h-28 py-0.5 placeholder:text-muted-foreground/50"
          style={{ lineHeight: "1.55" }}
        />
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => fileRef.current?.click()}
            className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
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
            onChange={(e) => { onFileSelect(e.target.files); e.currentTarget.value = ""; }}
          />
          <button
            onClick={onSend}
            disabled={(!input.trim() && pendingFiles.length === 0) || sending}
            className={cn(
              "h-7 w-7 rounded-lg flex items-center justify-center transition-all",
              input.trim() || pendingFiles.length > 0
                ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                : "bg-muted text-muted-foreground/40 cursor-not-allowed"
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
}

// ─── Default export: full page wrapper ───────────────────────────────────────

export default function CustomerSupportPage() {
  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="shrink-0">
        <h1 className="text-2xl font-bold tracking-tight">Support</h1>
        <p className="text-muted-foreground mt-1">
          Send a message to our team — we&apos;ll get back to you as soon as possible.
        </p>
      </div>
      <div className="flex-1 min-h-0" style={{ minHeight: 480 }}>
        <CustomerConcernChat mode="page" />
      </div>
    </div>
  );
}