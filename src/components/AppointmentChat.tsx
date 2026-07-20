"use client";

import * as React from "react";
import { MDT_TZ, isTodayMDT, isYesterdayMDT } from "@/lib/timezone";
import {
  MessageSquare, Send, Reply, Pencil, Trash2, X, CornerDownRight,
  Loader2, Wifi, WifiOff, ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useDashboardChat, type ChatMessage } from "@/hooks/useDashboardChat";
import { linkifyText } from "@/lib/chatFormat";

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

// Deterministic accent per author so messages are easy to scan.
const AVATAR_TONES = [
  "bg-blue-500/15 text-blue-700 dark:text-blue-400",
  "bg-violet-500/15 text-violet-700 dark:text-violet-400",
  "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  "bg-teal-500/15 text-teal-700 dark:text-teal-400",
  "bg-pink-500/15 text-pink-700 dark:text-pink-400",
];
function toneFor(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 997;
  return AVATAR_TONES[h % AVATAR_TONES.length];
}

function stamp(iso: string) {
  const dt = new Date(iso);
  const time24 = dt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: MDT_TZ });
  if (isTodayMDT(dt)) return time24;
  if (isYesterdayMDT(dt)) return `Yesterday ${time24}`;
  const datePart = dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: MDT_TZ });
  return `${datePart} · ${time24}`;
}

// ─── Single message ─────────────────────────────────────────────────────────

function MessageItem({
  msg, isOwn, canDelete, onReply, onEdit, onDelete,
}: {
  msg: ChatMessage;
  isOwn: boolean;
  canDelete: boolean;
  onReply: (m: ChatMessage) => void;
  onEdit: (m: ChatMessage) => void;
  onDelete: (m: ChatMessage) => void;
}) {
  if (msg.isDeleted) {
    return (
      <div className="flex items-start gap-2.5 px-1 py-1.5">
        <div className="size-7 shrink-0 rounded-full bg-muted" />
        <div className="flex-1 min-w-0 pt-0.5">
          <span className="text-[12px] italic text-muted-foreground/50">
            This message was deleted
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="group flex items-start gap-2.5 rounded-lg px-1 py-1.5 transition-colors hover:bg-muted/30">
      <div
        className={cn(
          "size-7 shrink-0 flex items-center justify-center rounded-full text-[10px] font-bold",
          toneFor(msg.createdBy),
        )}
      >
        {initials(msg.authorName)}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="text-[12.5px] font-semibold text-foreground truncate">
            {msg.authorName}
          </span>
          {msg.authorRole && (
            <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/60">
              {msg.authorRole}
            </span>
          )}
          <span className="text-[10.5px] text-muted-foreground/50">
            {stamp(msg.createdAt)}
          </span>
          {msg.isEdited && (
            <span className="text-[10px] text-muted-foreground/40 italic">(edited)</span>
          )}
        </div>

        {/* Quoted reply */}
        {msg.replyTo && (
          <div className="mt-1 flex items-start gap-1.5 rounded-md border-l-2 border-primary/40 bg-muted/40 px-2 py-1">
            <CornerDownRight size={11} className="mt-0.5 shrink-0 text-muted-foreground/50" />
            <div className="min-w-0">
              <span className="text-[10.5px] font-semibold text-muted-foreground">
                {msg.replyTo.authorName ?? "Unknown"}
              </span>
              <p className="text-[11px] text-muted-foreground/70 truncate">
                {msg.replyTo.isDeleted ? "Deleted message" : msg.replyTo.content}
              </p>
            </div>
          </div>
        )}

        <p className="mt-0.5 text-[13px] leading-relaxed text-foreground/90 whitespace-pre-wrap wrap-break-word">
          {linkifyText(msg.content)}
        </p>
      </div>

      {/* Hover actions */}
      <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
        <button
          onClick={() => onReply(msg)}
          className="flex size-6 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-primary transition-colors"
          aria-label="Reply"
          title="Reply"
        >
          <Reply size={13} strokeWidth={2} />
        </button>
        {isOwn && (
          <button
            onClick={() => onEdit(msg)}
            className="flex size-6 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-primary transition-colors"
            aria-label="Edit"
            title="Edit"
          >
            <Pencil size={12} strokeWidth={2} />
          </button>
        )}
        {canDelete && (
          <button
            onClick={() => onDelete(msg)}
            className="flex size-6 items-center justify-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
            aria-label="Delete"
            title="Delete"
          >
            <Trash2 size={12} strokeWidth={2} />
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Chat panel ──────────────────────────────────────────────────────────────

export function AppointmentChat({
  currentUserId,
  isAdmin,
}: {
  currentUserId?: string;
  isAdmin?: boolean;
}) {
  const {
    messages, isLoading, error, hasMore, socketConnected, sending,
    sendMessage, editMessage, deleteMessage, loadMore,
  } = useDashboardChat(currentUserId);

  const [draft, setDraft] = React.useState("");
  const [replyTarget, setReplyTarget] = React.useState<ChatMessage | null>(null);
  const [editTarget, setEditTarget] = React.useState<ChatMessage | null>(null);

  const scrollRef = React.useRef<HTMLDivElement>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const atBottomRef = React.useRef(true);

  // Track whether the user is scrolled to the bottom (so we don't yank them up).
  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    atBottomRef.current =
      el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  };

  // Auto-scroll on new messages only when already at the bottom.
  React.useEffect(() => {
    if (atBottomRef.current && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length]);

  const beginEdit = (m: ChatMessage) => {
    setEditTarget(m);
    setReplyTarget(null);
    setDraft(m.content);
    textareaRef.current?.focus();
  };
  const beginReply = (m: ChatMessage) => {
    setReplyTarget(m);
    setEditTarget(null);
    textareaRef.current?.focus();
  };
  const clearComposerState = () => {
    setDraft("");
    setReplyTarget(null);
    setEditTarget(null);
  };

  const handleSubmit = async () => {
    const text = draft.trim();
    if (!text) return;
    try {
      if (editTarget) {
        await editMessage(editTarget._id, text);
      } else {
        await sendMessage(text, replyTarget?._id);
      }
      clearComposerState();
    } catch (e) {
      console.error("Chat action failed:", e);
    }
  };

  const handleDelete = async (m: ChatMessage) => {
    try {
      await deleteMessage(m._id);
      if (editTarget?._id === m._id) clearComposerState();
    } catch (e) {
      console.error("Delete failed:", e);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === "Escape") clearComposerState();
  };

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border bg-card shadow-sm">
      {/* Section header */}
      <div className="flex items-center justify-between gap-2 px-5 py-3 border-b border-border bg-muted/20">
        <div className="flex items-center gap-2 text-[12px] font-semibold text-muted-foreground">
          <MessageSquare size={13} strokeWidth={2} className="text-primary" />
          <span>Team Chat</span>
          {messages.length > 0 && (
            <span className="rounded-full border bg-muted px-2 py-0.5 text-[11px] font-semibold">
              {messages.length}
            </span>
          )}
        </div>
        <span
          className={cn(
            "inline-flex items-center gap-1.5 text-[10.5px] font-semibold",
            socketConnected ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground/60",
          )}
          title={socketConnected ? "Live — updates instantly" : "Reconnecting / polling"}
        >
          {socketConnected ? <Wifi size={12} strokeWidth={2} /> : <WifiOff size={12} strokeWidth={2} />}
          {socketConnected ? "Live" : "Syncing"}
        </span>
      </div>

      {/* Error */}
      {error && (
        <div className="px-5 py-2.5 text-[12px] text-destructive bg-destructive/8 border-b border-destructive/20">
          {error}
        </div>
      )}

      {/* Message list */}
      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="flex-1 overflow-y-auto px-3 py-2 min-h-50 max-h-110 [scrollbar-width:thin] [scrollbar-color:hsl(var(--border))_transparent]"
      >
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-[13px] text-muted-foreground">
            <Loader2 size={15} strokeWidth={2} className="animate-spin" />
            Loading conversation…
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-center text-muted-foreground">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border bg-muted">
              <MessageSquare size={18} strokeWidth={1.5} />
            </div>
            <p className="text-[13px] font-medium text-foreground/70">No messages yet</p>
            <p className="text-[12px] text-muted-foreground/60">Start the conversation below.</p>
          </div>
        ) : (
          <>
            {hasMore && (
              <div className="flex justify-center py-1.5">
                <button
                  onClick={loadMore}
                  className="inline-flex items-center gap-1 rounded border border-border bg-muted/40 px-2.5 py-1 text-[11px] font-medium text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors"
                >
                  <ChevronUp size={11} strokeWidth={2} />
                  Load earlier messages
                </button>
              </div>
            )}
            <div className="space-y-0.5">
              {messages.map((m) => (
                <MessageItem
                  key={m._id}
                  msg={m}
                  isOwn={!!currentUserId && m.createdBy === currentUserId}
                  canDelete={
                    !m.isDeleted &&
                    (!!isAdmin || (!!currentUserId && m.createdBy === currentUserId))
                  }
                  onReply={beginReply}
                  onEdit={beginEdit}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Composer */}
      <div className="border-t border-border bg-muted/10 px-3 py-2.5">
        {(replyTarget || editTarget) && (
          <div className="mb-2 flex items-center justify-between gap-2 rounded-md border-l-2 border-primary/50 bg-muted/40 px-2.5 py-1.5">
            <div className="min-w-0 flex items-center gap-1.5 text-[11.5px]">
              {editTarget ? (
                <Pencil size={11} className="shrink-0 text-primary" />
              ) : (
                <Reply size={11} className="shrink-0 text-primary" />
              )}
              <span className="font-semibold text-muted-foreground">
                {editTarget ? "Editing message" : `Replying to ${replyTarget?.authorName}`}
              </span>
              {replyTarget && (
                <span className="truncate text-muted-foreground/60">
                  — {replyTarget.content}
                </span>
              )}
            </div>
            <button
              onClick={clearComposerState}
              className="shrink-0 text-muted-foreground hover:text-foreground"
              aria-label="Cancel"
            >
              <X size={13} strokeWidth={2} />
            </button>
          </div>
        )}

        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
            rows={1}
            maxLength={4000}
            placeholder="Write a message…  (Enter to send, Shift+Enter for new line)"
            className="flex-1 resize-none rounded-lg border border-border bg-background px-3 py-2 text-[13px] text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all max-h-28 min-h-9.5"
          />
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={sending || !draft.trim()}
            className="h-9.5 shrink-0 gap-1.5 bg-primary hover:bg-primary/90"
          >
            {sending ? (
              <Loader2 size={13} strokeWidth={2} className="animate-spin" />
            ) : (
              <Send size={13} strokeWidth={2} />
            )}
            <span className="hidden sm:inline">{editTarget ? "Save" : "Send"}</span>
          </Button>
        </div>
      </div>
    </div>
  );
}

export default AppointmentChat;