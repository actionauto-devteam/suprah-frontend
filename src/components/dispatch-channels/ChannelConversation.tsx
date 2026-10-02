"use client";

import * as React from "react";
import {
  ArrowLeft,
  Info,
  FileText,
  Hash,
  Image as ImageIcon,
  Loader2,
  Lock,
  MoreHorizontal,
  Paperclip,
  Pencil,
  Send,
  Smile,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { initializeSocket } from "@/lib/socket.client";
import { createRetrySafeId } from "@/lib/client-request-id";
import { userErrorMessage } from "@/lib/user-error";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/AuthProvider";
import {
  dispatchChannelsApi,
  type ChannelDetail,
  type ChannelMessage,
} from "@/lib/api/dispatch-channels";
import { PersonAvatar, personLabel } from "@/components/dispatch-channels/channel-people";
import { ChannelMembersSheet, ChannelPeopleManager } from "@/components/dispatch-channels/ChannelMembersSheet";
import { ChannelLetterAvatar } from "@/components/dispatch-channels/ChannelLetterAvatar";
import { ChatDetailsPanel, type ChatDetailsMessage, type ChatDetailsTab } from "@/components/dispatch-chat/ChatDetailsPanel";
import { AttachmentView } from "@/components/dispatch-chat/DispatchChatDialog";
import { SupraStyleComposer } from "@/components/dispatch-chat/SupraStyleComposer";
import { AttachmentLightbox, type LightboxAttachment } from "@/components/chat/AttachmentLightbox";

const MAX_MESSAGE_LENGTH = 4000;
// Within this distance of the bottom, new messages keep the view scrolled down.
const NEAR_BOTTOM_PX = 120;
// Same limits the server checks (private Dispatch Chat rules).
const MAX_FILES = 5;
const MAX_FILE_BYTES = 25 * 1024 * 1024;
const ACCEPTED_FILES = ".jpg,.jpeg,.png,.gif,.webp,.pdf,.txt,.csv,.docx,.xlsx,.pptx,.zip,.mp4,.mov,.webm";
// Same quick emotes as private Dispatch Chat.
const EMOJIS = [
  "👍", "✅", "🚚", "📍", "🛣️", "⏱️", "🙏", "👌",
  "👋", "🙂", "😊", "😂", "😅", "😎", "🤝", "💪",
  "⚠️", "📦", "🔧", "🅿️", "⛽", "📞", "💬", "❤️",
];
// Dispatch Chat surfaces. Suprah Mail defines these colors; elsewhere (the
// driver portal) the app's own background and card colors are used.
const SURFACE_BASE = "var(--bg-base, var(--background))";
const SURFACE_RAISED = "var(--bg-elevated, var(--card))";

function messageTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function sizeLabel(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const httpStatus = (error: unknown) => (error as { response?: { status?: number } } | null)?.response?.status;

function mergeMessages(current: ChannelMessage[], incoming: ChannelMessage[]) {
  const byId = new Map(current.map((message) => [message.id, message]));
  for (const message of incoming) byId.set(message.id, message);
  return [...byId.values()].sort((a, b) =>
    a.createdAt === b.createdAt ? a.id.localeCompare(b.id) : a.createdAt.localeCompare(b.createdAt),
  );
}

// Details (Media, Files, Search) look through at most this many recent messages.
const DETAILS_HISTORY_LIMIT = 2000;
const DETAILS_PAGE_SIZE = 100;

function viewerRoleLabel(channel: ChannelDetail) {
  if (channel.isCreator) return "You created this channel";
  return channel.myRole === "admin" ? "You're an administrator" : "You're a member";
}

/** One channel's messages, composer and people panel. */
export function ChannelConversation({
  channelId,
  onBack,
  variant = "classic",
  onGone,
  className,
}: {
  channelId: string;
  onBack?: () => void;
  /**
   * "supraspace" (the driver's Dispatch Chat page): Suprah Space's message box
   * and a Details view (Members, Media, Files, Search) instead of the people panel.
   */
  variant?: "classic" | "supraspace";
  /** The viewer left or was removed, or the channel isn't available. */
  onGone: () => void;
  className?: string;
}) {
  const { getToken, userId } = useAuth();
  const viewerId = String(userId ?? "");
  const [channel, setChannel] = React.useState<ChannelDetail | null>(null);
  const [messages, setMessages] = React.useState<ChannelMessage[]>([]);
  const [hasMore, setHasMore] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [loadingOlder, setLoadingOlder] = React.useState(false);
  const [draft, setDraft] = React.useState("");
  const [files, setFiles] = React.useState<File[]>([]);
  const [sending, setSending] = React.useState(false);
  const [emojiOpen, setEmojiOpen] = React.useState(false);
  const [membersOpen, setMembersOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<{ id: string; text: string } | null>(null);
  const [savingEdit, setSavingEdit] = React.useState(false);
  const [confirmDelete, setConfirmDelete] = React.useState<ChannelMessage | null>(null);
  const [deleting, setDeleting] = React.useState(false);
  const [lightbox, setLightbox] = React.useState<LightboxAttachment | null>(null);
  const [detailsOpen, setDetailsOpen] = React.useState(false);
  const [detailsTab, setDetailsTab] = React.useState<ChatDetailsTab>("members");
  const [detailsQuery, setDetailsQuery] = React.useState("");
  const [history, setHistory] = React.useState<{ messages: ChannelMessage[]; truncated: boolean } | null>(null);
  const [historyLoading, setHistoryLoading] = React.useState(false);
  const [highlightId, setHighlightId] = React.useState<string | null>(null);
  const historyRequest = React.useRef(0);
  const scrollRef = React.useRef<HTMLDivElement | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const stickToBottom = React.useRef(true);
  const retryIds = React.useRef(createRetrySafeId());
  const onGoneRef = React.useRef(onGone);

  React.useEffect(() => {
    onGoneRef.current = onGone;
  }, [onGone]);

  const scrollToBottom = React.useCallback(() => {
    window.requestAnimationFrame(() => {
      const element = scrollRef.current;
      if (element) element.scrollTop = element.scrollHeight;
    });
  }, []);

  // Marks read only up to the newest message actually shown.
  const markShownRead = React.useCallback(
    (shown: ChannelMessage[]) => {
      const newest = shown[shown.length - 1];
      if (!newest || document.visibilityState !== "visible") return;
      void dispatchChannelsApi.markRead(getToken, channelId, newest.createdAt).catch(() => undefined);
    },
    [channelId, getToken],
  );

  const reloadChannel = React.useCallback(async () => {
    try {
      setChannel(await dispatchChannelsApi.get(getToken, channelId));
    } catch (error) {
      if (httpStatus(error) === 404) {
        toast.error("You're no longer in this channel.");
        onGoneRef.current();
      }
    }
  }, [channelId, getToken]);

  // First load.
  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [detail, page] = await Promise.all([
          dispatchChannelsApi.get(getToken, channelId),
          dispatchChannelsApi.messages(getToken, channelId),
        ]);
        if (cancelled) return;
        setChannel(detail);
        setMessages(page.messages);
        setHasMore(page.hasMore);
        stickToBottom.current = true;
        scrollToBottom();
        markShownRead(page.messages);
      } catch (error) {
        if (cancelled) return;
        toast.error(userErrorMessage(error, "open the channel"));
        if (httpStatus(error) === 404) onGoneRef.current();
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [channelId, getToken, markShownRead, scrollToBottom]);

  // Live messages and changes for this channel.
  React.useEffect(() => {
    let cancelled = false;
    let socket: ReturnType<typeof initializeSocket> | null = null;
    const onMessage = (payload: { channelId?: string; message?: ChannelMessage }) => {
      if (cancelled || payload?.channelId !== channelId || !payload.message) return;
      const incoming = payload.message;
      setMessages((current) => mergeMessages(current, [incoming]));
      if (stickToBottom.current) {
        scrollToBottom();
        markShownRead([incoming]);
      }
    };
    // An edit or delete: replace the message in place, no scrolling.
    const onMessageUpdated = (payload: { channelId?: string; message?: ChannelMessage }) => {
      if (cancelled || payload?.channelId !== channelId || !payload.message) return;
      const changed = payload.message;
      setMessages((current) => (current.some((message) => message.id === changed.id) ? mergeMessages(current, [changed]) : current));
    };
    const onUpdated = (payload: { channelId?: string }) => {
      if (!cancelled && payload?.channelId === channelId) void reloadChannel();
    };
    const onRemoved = (payload: { channelId?: string }) => {
      if (cancelled || payload?.channelId !== channelId) return;
      toast.message("You're no longer in this channel.");
      onGoneRef.current();
    };
    void (async () => {
      const token = await getToken();
      if (!token || cancelled) return;
      socket = initializeSocket(token);
      socket.on("dispatch-channel:message", onMessage);
      socket.on("dispatch-channel:message-updated", onMessageUpdated);
      socket.on("dispatch-channel:updated", onUpdated);
      socket.on("dispatch-channel:removed", onRemoved);
    })();
    return () => {
      cancelled = true;
      socket?.off("dispatch-channel:message", onMessage);
      socket?.off("dispatch-channel:message-updated", onMessageUpdated);
      socket?.off("dispatch-channel:updated", onUpdated);
      socket?.off("dispatch-channel:removed", onRemoved);
    };
  }, [channelId, getToken, markShownRead, reloadChannel, scrollToBottom]);

  // Details: the channel's recent history, newest pages first.
  const loadHistory = async () => {
    const request = ++historyRequest.current;
    setHistoryLoading(true);
    try {
      let collected: ChannelMessage[] = [];
      let before: { createdAt: string; id: string } | undefined;
      let more = true;
      while (more && collected.length < DETAILS_HISTORY_LIMIT) {
        const page = await dispatchChannelsApi.messages(getToken, channelId, before, DETAILS_PAGE_SIZE);
        if (request !== historyRequest.current) return;
        collected = mergeMessages(collected, page.messages);
        const oldest = page.messages[0];
        more = page.hasMore && Boolean(oldest);
        before = oldest ? { createdAt: oldest.createdAt, id: oldest.id } : undefined;
      }
      setHistory({ messages: collected, truncated: more });
    } catch (error) {
      if (request === historyRequest.current) toast.error(userErrorMessage(error, "load this channel's photos and files"));
    } finally {
      if (request === historyRequest.current) setHistoryLoading(false);
    }
  };

  const openDetails = () => {
    setDetailsOpen(true);
    void loadHistory();
  };

  const detailsMessages = React.useMemo<ChatDetailsMessage[]>(() => {
    if (!detailsOpen) return [];
    return mergeMessages(history?.messages ?? [], messages)
      .filter((message) => !message.deletedAt)
      .map((message) => ({
        id: message.id,
        author: message.messageType === "system" ? "Channel update" : message.sender.id === viewerId ? "You" : message.sender.name,
        createdAt: message.createdAt,
        text: message.content,
        attachments: message.attachments,
      }));
  }, [detailsOpen, history, messages, viewerId]);

  // A search result: show it in the conversation, loading the messages in between if needed.
  const showInConversation = (target: ChatDetailsMessage) => {
    setDetailsOpen(false);
    stickToBottom.current = false;
    if (history && !messages.some((message) => message.id === target.id)) {
      setMessages((current) => mergeMessages(current, history.messages.filter((message) => message.createdAt >= target.createdAt)));
      setHasMore(history.truncated || history.messages.some((message) => message.createdAt < target.createdAt));
    }
    setHighlightId(target.id);
  };

  React.useEffect(() => {
    if (!highlightId) return;
    const frame = window.requestAnimationFrame(() => {
      const row = scrollRef.current?.querySelector(`[data-channel-message-id="${CSS.escape(highlightId)}"]`);
      row?.scrollIntoView({ block: "center", behavior: "smooth" });
    });
    const timer = window.setTimeout(() => setHighlightId(null), 2500);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, [highlightId]);

  const loadOlder = async () => {
    const oldest = messages[0];
    if (!oldest || loadingOlder) return;
    const element = scrollRef.current;
    const previousHeight = element?.scrollHeight ?? 0;
    setLoadingOlder(true);
    try {
      const page = await dispatchChannelsApi.messages(getToken, channelId, { createdAt: oldest.createdAt, id: oldest.id });
      setMessages((current) => mergeMessages(current, page.messages));
      setHasMore(page.hasMore);
      window.requestAnimationFrame(() => {
        if (element) element.scrollTop = element.scrollHeight - previousHeight;
      });
    } catch (error) {
      toast.error(userErrorMessage(error, "load earlier messages"));
    } finally {
      setLoadingOlder(false);
    }
  };

  const addFiles = (incoming: File[]) => {
    const tooBig = incoming.filter((file) => file.size > MAX_FILE_BYTES);
    if (tooBig.length) toast.error(`${tooBig[0].name} is larger than 25 MB, so it can't be sent.`);
    const next = [...files, ...incoming.filter((file) => file.size <= MAX_FILE_BYTES)];
    if (next.length > MAX_FILES) toast.error(`You can send up to ${MAX_FILES} files at once.`);
    setFiles(next.slice(0, MAX_FILES));
  };

  const send = async () => {
    const content = draft.trim();
    if ((!content && !files.length) || sending) return;
    setSending(true);
    try {
      const retryKey = `${content}|${files.map((file) => `${file.name}:${file.size}:${file.lastModified}`).join(",")}`;
      const clientMessageId = retryIds.current.idFor(retryKey);
      const message = files.length
        ? await dispatchChannelsApi.sendFiles(getToken, channelId, files, content, clientMessageId)
        : await dispatchChannelsApi.send(getToken, channelId, content, clientMessageId);
      retryIds.current.clear();
      setDraft("");
      setFiles([]);
      setEmojiOpen(false);
      stickToBottom.current = true;
      setMessages((current) => mergeMessages(current, [message]));
      scrollToBottom();
    } catch (error) {
      toast.error(userErrorMessage(error, files.length ? "send your files" : "send your message"));
    } finally {
      setSending(false);
    }
  };

  const saveEdit = async () => {
    if (!editing || savingEdit) return;
    const original = messages.find((message) => message.id === editing.id);
    const text = editing.text.trim();
    if (!original) {
      setEditing(null);
      return;
    }
    if (!text && !original.attachments.length) {
      toast.error("A message can't be empty. Delete it instead.");
      return;
    }
    setSavingEdit(true);
    try {
      const updated = await dispatchChannelsApi.editMessage(getToken, channelId, editing.id, text);
      setMessages((current) => mergeMessages(current, [updated]));
      setEditing(null);
    } catch (error) {
      toast.error(userErrorMessage(error, "save your change"));
    } finally {
      setSavingEdit(false);
    }
  };

  const deleteMessage = async () => {
    if (!confirmDelete || deleting) return;
    setDeleting(true);
    try {
      const updated = await dispatchChannelsApi.deleteMessage(getToken, channelId, confirmDelete.id);
      setMessages((current) => mergeMessages(current, [updated]));
      if (editing?.id === confirmDelete.id) setEditing(null);
      setConfirmDelete(null);
    } catch (error) {
      toast.error(userErrorMessage(error, "delete the message"));
    } finally {
      setDeleting(false);
    }
  };

  const onScroll = () => {
    const element = scrollRef.current;
    if (!element) return;
    const nearBottom = element.scrollHeight - element.scrollTop - element.clientHeight < NEAR_BOTTOM_PX;
    if (nearBottom && !stickToBottom.current) markShownRead(messages);
    stickToBottom.current = nearBottom;
  };

  const closed = channel?.status === "closed";
  const viewerIsAdmin = channel?.myRole === "admin";
  const confirmingOther = confirmDelete ? confirmDelete.sender.id !== viewerId : false;
  const canCompose = !loading && Boolean(channel) && !closed;
  const composerPlaceholder = files.length
    ? "Add a message (optional)…"
    : `Message ${channel?.name ? `#${channel.name}` : "the channel"}…`;

  const filesPreview = files.length > 0 ? (
    <div className="mb-2 flex max-h-28 flex-wrap gap-1.5 overflow-y-auto pr-1">
      {files.map((file, index) => (
        <div
          key={`${file.name}:${file.size}:${index}`}
          className="flex w-full min-w-0 items-start gap-2 rounded-lg border border-border/60 px-2.5 py-1.5 sm:w-auto sm:max-w-full"
          style={{ background: SURFACE_BASE }}
        >
          {file.type.startsWith("image/") ? (
            <ImageIcon className="size-3.5 shrink-0 text-emerald-500" />
          ) : (
            <FileText className="size-3.5 shrink-0 text-emerald-500" />
          )}
          <span className="min-w-0 max-w-full break-all text-[11px] font-semibold [overflow-wrap:anywhere]">{file.name}</span>
          <span className="shrink-0 text-[10px] text-muted-foreground">{sizeLabel(file.size)}</span>
          <button
            type="button"
            aria-label={`Remove ${file.name}`}
            className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            onClick={() => setFiles((current) => current.filter((_, fileIndex) => fileIndex !== index))}
            disabled={sending}
          >
            <X className="size-3" />
          </button>
        </div>
      ))}
    </div>
  ) : null;

  return (
    <div className={cn("relative flex min-h-0 min-w-0 flex-1 flex-col", className)} style={{ background: SURFACE_BASE }}>
      <header className="relative shrink-0 border-b border-border/60 bg-gradient-to-r from-emerald-500/[0.07] via-background to-background px-3 py-2.5 sm:px-4 sm:py-3">
        <div className="flex min-w-0 items-center gap-2.5">
          {onBack && (
            <Button type="button" size="icon" variant="ghost" className="size-9 shrink-0" onClick={onBack} aria-label="Back to channels">
              <ArrowLeft className="size-4" />
            </Button>
          )}

          {variant === "supraspace" ? (
            <ChannelLetterAvatar name={channel?.name ?? ""} closed={closed} className="size-10 text-base" />
          ) : (
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full border border-emerald-500/25 bg-emerald-500/10">
              {closed ? (
                <Lock className="size-4 text-muted-foreground" />
              ) : (
                <Hash className="size-4 text-emerald-600 dark:text-emerald-400" />
              )}
            </span>
          )}

          <div className="min-w-0 flex-1 text-left">
            <p className="text-[9px] font-extrabold uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-400">
              Suprah AI · Dispatch Channel
            </p>
            <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
              <h2 className="truncate text-sm font-black tracking-tight sm:text-base">{channel?.name ?? "Channel"}</h2>
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/[0.07] px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
                <Users className="size-2.5" /> Group
              </span>
              {closed && (
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-border/60 bg-muted px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide text-muted-foreground">
                  <Lock className="size-2.5" /> Closed
                </span>
              )}
            </div>
            <div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[10px] text-muted-foreground">
              {channel ? (
                <>
                  <span className="shrink-0 font-black text-foreground">
                    {channel.memberCount} {channel.memberCount === 1 ? "person" : "people"}
                  </span>
                  <span className="shrink-0">· {viewerRoleLabel(channel)}</span>
                  {channel.pendingSuggestionCount > 0 && (
                    <span className="shrink-0 rounded-full bg-amber-500/10 px-1.5 py-0.5 font-bold text-amber-700 dark:text-amber-300">
                      {channel.pendingSuggestionCount} waiting for approval
                    </span>
                  )}
                </>
              ) : (
                <span>Loading…</span>
              )}
            </div>
            {channel?.description && (
              <p className="mt-0.5 truncate text-[10px] text-muted-foreground">{channel.description}</p>
            )}
          </div>

          {variant === "supraspace" ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className={cn("size-9 shrink-0 text-muted-foreground hover:text-foreground", detailsOpen && "bg-muted text-foreground")}
              onClick={openDetails}
              disabled={!channel}
              aria-label="Channel details"
              title="Details"
            >
              <Info className="size-[18px]" />
            </Button>
          ) : (
            <Button
              type="button"
              variant={membersOpen ? "secondary" : "outline"}
              size="sm"
              className="h-9 shrink-0 gap-1.5 px-2.5 text-[10px] font-bold sm:px-3"
              onClick={() => setMembersOpen(true)}
              disabled={!channel}
              aria-label="Open people in this channel"
            >
              <Users className="size-3.5" />
              <span className="hidden sm:inline">People</span>
            </Button>
          )}
        </div>
      </header>

      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4 sm:px-5"
        style={{ background: SURFACE_BASE }}
      >
        {loading ? (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <Loader2 className="mr-2 size-5 animate-spin" />
            <span className="text-sm">Loading channel…</span>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center px-6 text-center">
            <div className="mb-3 flex size-12 items-center justify-center rounded-2xl bg-emerald-500/10">
              <Hash className="size-6 text-emerald-500" />
            </div>
            <p className="text-sm font-black">Start the channel conversation</p>
            <p className="mt-1 max-w-md text-xs leading-relaxed text-muted-foreground">
              Messages, photos and files you send here are shared with everyone in this channel.
            </p>
          </div>
        ) : (
          <div className="w-full space-y-3">
            {hasMore && (
              <div className="flex justify-center">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 rounded-full text-[10px] font-bold"
                  onClick={() => void loadOlder()}
                  disabled={loadingOlder}
                >
                  {loadingOlder ? <Loader2 className="size-3 animate-spin" /> : "Load earlier messages"}
                </Button>
              </div>
            )}
            {messages.map((message) => {
              if (message.messageType === "system") {
                return (
                  <div
                    key={message.id}
                    data-channel-message-id={message.id}
                    className={cn("flex justify-center px-4", highlightId === message.id && "rounded-full ring-2 ring-emerald-500/60")}
                  >
                    <p className="max-w-full rounded-full border border-emerald-500/20 bg-emerald-500/[0.06] px-3 py-1 text-center text-[10.5px] font-medium text-emerald-800 dark:text-emerald-200">
                      {message.content}
                      <span className="text-emerald-700/60 dark:text-emerald-300/60"> · {messageTime(message.createdAt)}</span>
                    </p>
                  </div>
                );
              }
              const mine = message.sender.id === viewerId;
              const deleted = Boolean(message.deletedAt);
              const isEditing = editing?.id === message.id;
              // Edit: your own messages in an open channel. Delete: your own, or anyone's as an administrator.
              const canEdit = mine && !deleted && !closed;
              const canDelete = !deleted && (mine || viewerIsAdmin);
              return (
                <div
                  key={message.id}
                  data-channel-message-id={message.id}
                  className={cn(
                    "group flex items-end gap-2 rounded-2xl transition-shadow",
                    mine ? "justify-end" : "justify-start",
                    highlightId === message.id && "ring-2 ring-emerald-500/60 ring-offset-4 ring-offset-background",
                  )}
                >
                  {!mine && <PersonAvatar person={message.sender} className="mb-5 size-8 border-emerald-500/20" />}
                  <div className={cn("flex min-w-0 max-w-[88%] flex-col sm:max-w-[78%]", mine ? "items-end" : "items-start")}>
                    <div className="mb-1 flex min-w-0 items-center gap-1.5 px-1 text-[10px] font-semibold text-muted-foreground">
                      <span className="truncate">{mine ? "You" : message.sender.name}</span>
                      {!mine && (
                        <span className="shrink-0 truncate rounded-full bg-muted px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide">
                          {personLabel(message.sender)}
                        </span>
                      )}
                    </div>

                    <div className={cn("flex max-w-full items-start gap-1", mine && "flex-row-reverse")}>
                      {deleted ? (
                        <div className="rounded-2xl border border-dashed border-border/70 px-3.5 py-2 text-xs italic text-muted-foreground">
                          {message.deletedByAdmin ? "Removed by a channel administrator" : "This message was deleted"}
                        </div>
                      ) : isEditing ? (
                        <div
                          className="w-[min(28rem,70vw)] space-y-1.5 rounded-2xl border border-emerald-500/30 p-2 shadow-sm"
                          style={{ background: SURFACE_RAISED }}
                        >
                          <textarea
                            autoFocus
                            value={editing.text}
                            maxLength={MAX_MESSAGE_LENGTH}
                            rows={2}
                            className="max-h-40 min-h-14 w-full resize-y rounded-xl border border-border/70 px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            style={{ background: SURFACE_BASE }}
                            onChange={(event) => setEditing({ id: message.id, text: event.target.value })}
                            onKeyDown={(event) => {
                              if (event.key === "Enter" && !event.shiftKey) {
                                event.preventDefault();
                                void saveEdit();
                              }
                              if (event.key === "Escape") setEditing(null);
                            }}
                          />
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] text-muted-foreground">Enter to save · Esc to cancel</span>
                            <div className="flex gap-1.5">
                              <Button type="button" size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditing(null)} disabled={savingEdit}>
                                Cancel
                              </Button>
                              <Button type="button" size="sm" className="h-7 text-xs" onClick={() => void saveEdit()} disabled={savingEdit}>
                                {savingEdit ? <Loader2 className="size-3 animate-spin" /> : "Save"}
                              </Button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div
                          className={
                            mine
                              ? "min-w-28 max-w-full rounded-2xl rounded-br-md bg-emerald-600 px-3.5 py-2.5 text-left text-sm text-white shadow-sm"
                              : "min-w-28 max-w-full rounded-2xl rounded-bl-md border border-border/60 bg-muted/40 px-3.5 py-2.5 text-left text-sm shadow-sm"
                          }
                        >
                          {message.content && (
                            <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{message.content}</p>
                          )}
                          {message.attachments.map((attachment, index) => (
                            <AttachmentView
                              key={`${message.id}:${index}:${attachment.originalName}`}
                              attachment={attachment}
                              mine={mine}
                              onOpenMedia={setLightbox}
                            />
                          ))}
                        </div>
                      )}
                      {(canEdit || canDelete) && !isEditing && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="size-7 shrink-0 text-muted-foreground opacity-100 md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100 data-[state=open]:opacity-100"
                              aria-label="Message options"
                            >
                              <MoreHorizontal className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align={mine ? "end" : "start"} className="w-40">
                            {canEdit && (
                              <DropdownMenuItem onSelect={() => setEditing({ id: message.id, text: message.content })}>
                                <Pencil className="mr-2 size-3.5" /> Edit
                              </DropdownMenuItem>
                            )}
                            {canDelete && (
                              <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => setConfirmDelete(message)}>
                                <Trash2 className="mr-2 size-3.5" /> Delete
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>

                    <div className="mt-1 flex items-center gap-1 px-1 text-[10px] text-muted-foreground/80">
                      {messageTime(message.createdAt)}
                      {message.editedAt && !deleted && (
                        <>
                          <span>·</span>
                          <span>Edited</span>
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

      <footer
        className={cn(
          "relative z-10 shrink-0 border-t border-border/60",
          variant === "supraspace" && !closed ? "px-3 py-2 sm:px-4 md:py-3" : "p-3 sm:p-4",
        )}
        style={{ background: SURFACE_RAISED }}
      >
        {closed ? (
          <div
            className="flex items-center justify-center gap-2 rounded-xl border border-border/60 px-3 py-3 text-xs text-muted-foreground"
            style={{ background: SURFACE_BASE }}
          >
            <Lock className="size-3.5" /> This channel is closed. You can still read its history.
          </div>
        ) : variant === "supraspace" ? (
          <SupraStyleComposer
            draft={draft}
            onDraftChange={setDraft}
            onSubmit={() => void send()}
            placeholder={composerPlaceholder}
            disabled={!canCompose}
            sending={sending}
            canSend={canCompose && !sending && (Boolean(draft.trim()) || files.length > 0)}
            maxLength={MAX_MESSAGE_LENGTH}
            emojis={EMOJIS}
            onFiles={addFiles}
            fileAccept={ACCEPTED_FILES}
            attachDisabled={!canCompose || sending || files.length >= MAX_FILES}
            attachments={filesPreview}
          />
        ) : (
          <>
            {filesPreview}

            {emojiOpen && (
              <div
                className="absolute bottom-[calc(100%-4px)] left-3 z-20 mb-2 w-[min(16rem,calc(100%-1.5rem))] rounded-2xl border border-border p-2 shadow-xl"
                style={{ background: SURFACE_RAISED }}
              >
                <p className="px-1 pb-1.5 text-[9px] font-black uppercase tracking-[0.16em] text-muted-foreground">Quick emotes</p>
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
              accept={ACCEPTED_FILES}
              className="hidden"
              onChange={(event) => {
                addFiles(Array.from(event.target.files ?? []));
                event.target.value = "";
              }}
            />

            <div className="flex min-w-0 items-end gap-2">
              <div className="flex shrink-0 items-center gap-1">
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  className="h-11 w-11 rounded-xl"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={!canCompose || sending || files.length >= MAX_FILES}
                  aria-label="Attach photos or files"
                >
                  <Paperclip className="size-4" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant={emojiOpen ? "secondary" : "outline"}
                  className="h-11 w-11 rounded-xl"
                  onClick={() => setEmojiOpen((current) => !current)}
                  disabled={!canCompose}
                  aria-label="Add emoji"
                >
                  <Smile className="size-4" />
                </Button>
              </div>

              <textarea
                value={draft}
                maxLength={MAX_MESSAGE_LENGTH}
                rows={2}
                placeholder={composerPlaceholder}
                className="min-h-[44px] min-w-0 max-h-32 w-full flex-1 resize-y rounded-xl border border-border/70 px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                style={{ background: SURFACE_BASE }}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void send();
                  }
                }}
                disabled={!canCompose}
              />

              <Button
                type="button"
                className="h-11 shrink-0 gap-2 px-3 sm:px-4"
                onClick={() => void send()}
                disabled={!canCompose || sending || (!draft.trim() && !files.length)}
              >
                {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                <span className="hidden sm:inline">Send</span>
              </Button>
            </div>

            <div className="mt-1.5 flex flex-wrap items-center justify-between gap-1 text-[10px] text-muted-foreground">
              <span>Enter to send · Shift+Enter for new line · Up to 5 files, 25 MB each</span>
              <span>{draft.length}/4000</span>
            </div>
          </>
        )}
      </footer>

      {variant === "supraspace" && detailsOpen && channel && (
        <div className="absolute inset-0 z-30">
          <ChatDetailsPanel
            onClose={() => setDetailsOpen(false)}
            avatar={<ChannelLetterAvatar name={channel.name} closed={closed} className="size-[88px] rounded-2xl text-4xl" />}
            name={channel.name}
            subtitle={`${channel.memberCount} ${channel.memberCount === 1 ? "member" : "members"}${closed ? " · Closed" : ""}`}
            description={channel.description || undefined}
            members={
              <ChannelPeopleManager
                layout="details"
                channel={channel}
                viewerId={viewerId}
                onChanged={setChannel}
                onLeft={() => onGoneRef.current()}
              />
            }
            messages={detailsMessages}
            loading={historyLoading && !history}
            truncated={Boolean(history?.truncated)}
            tab={detailsTab}
            onTabChange={setDetailsTab}
            query={detailsQuery}
            onQueryChange={setDetailsQuery}
            onSearchResultSelect={showInConversation}
          />
        </div>
      )}

      {channel && (
        <ChannelMembersSheet
          open={membersOpen}
          onOpenChange={setMembersOpen}
          channel={channel}
          viewerId={viewerId}
          onChanged={setChannel}
          onGone={() => onGoneRef.current()}
        />
      )}

      <AlertDialog open={confirmDelete !== null} onOpenChange={(open) => !open && !deleting && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this message?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmingOther
                ? `Everyone in the channel will see that an administrator removed ${confirmDelete?.sender.name ?? "this person"}'s message. Its text and files are deleted for good.`
                : "Everyone in the channel will see that a message was deleted. Its text and files are deleted for good."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void deleteMessage();
              }}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AttachmentLightbox attachment={lightbox} onClose={() => setLightbox(null)} />
    </div>
  );
}
