"use client";

import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/lib/readable-toast";
import { AlertTriangle, Check, CheckCheck, ImageIcon, ImagePlus, Loader2, Lock, LockOpen, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AttachmentLightbox, type LightboxAttachment } from "@/components/chat/AttachmentLightbox";
import { useAuth } from "@/providers/AuthProvider";
import { initializeSocket } from "@/lib/socket.client";
import { createRetrySafeId } from "@/lib/client-request-id";
import { userErrorMessage } from "@/lib/user-error";
import { cn } from "@/lib/utils";
import {
  SHIPMENT_CHAT_EVENTS,
  eventIsFor,
  getShipmentChatPage,
  markShipmentChatRead,
  sendShipmentChatMessage,
  sendShipmentChatPhotos,
  setLoadCustomerChatClosed,
  type ShipmentChatMessage,
  type ShipmentChatSocketEvent,
  type ShipmentChatSource,
} from "@/lib/api/shipmentChat";
import {
  CHAT_FALLBACK_REFRESH_MS,
  CHAT_PHOTO_ACCEPT,
  MAX_CHAT_MESSAGE_LENGTH,
  chatDayKey,
  chatDayLabel,
  chatTime,
  chatZoneNote,
  checkChatPhotos,
  closesAtLine,
  mergeChatMessages,
  newestMessageAt,
} from "@/lib/shipment-chat";

// ─── Shipment chat ────────────────────────────────────────────────────────────
// One private conversation about a shipment: the customer with the driver
// carrying their car, or with the load's dispatcher (decided 2026-11-05). The
// same panel serves all three people; the server decides who may read and
// send, and explains a closed chat in plain English.

export const shipmentChatQueryKey = (source: ShipmentChatSource) =>
  source.side === "customer" ? ["shipment-chat", "customer", source.shipmentId, source.kind] : ["shipment-chat", "load", source.loadId];

const prefersEnterToSend = () =>
  typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(pointer: fine)").matches;

function PhotoGrid({ message, onOpen }: { message: ShipmentChatMessage; onOpen: (attachment: LightboxAttachment) => void }) {
  if (message.photos.length === 0) return null;
  return (
    <div className={cn("grid gap-1", message.photos.length > 1 ? "grid-cols-2" : "grid-cols-1")}>
      {message.photos.map((photo, index) =>
        photo.available ? (
          <button
            key={`${message.id}-${index}`}
            type="button"
            onClick={() => onOpen({ src: photo.url, type: "image", name: photo.name })}
            className="overflow-hidden rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
            aria-label={`Open photo ${photo.name}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- a private photo behind a short-lived link */}
            <img src={photo.url} alt={photo.name} className="h-32 w-full object-cover sm:h-36" loading="lazy" />
          </button>
        ) : (
          <div
            key={`${message.id}-${index}`}
            className="flex h-24 items-center justify-center gap-1.5 rounded-xl bg-muted px-2 text-center text-xs text-muted-foreground"
          >
            <ImageIcon className="size-4 shrink-0" aria-hidden="true" />
            Photo unavailable right now
          </div>
        ),
      )}
    </div>
  );
}

function MessageBubble({ message, onOpenPhoto }: { message: ShipmentChatMessage; onOpenPhoto: (attachment: LightboxAttachment) => void }) {
  const time = chatTime(message.createdAt);
  return (
    <li className={cn("flex", message.mine ? "justify-end" : "justify-start")}>
      <div className={cn("max-w-[85%] space-y-1 sm:max-w-[75%]", message.mine && "items-end")}>
        {!message.mine && <p className="px-1 text-[11px] font-bold text-muted-foreground">{message.senderName}</p>}
        <div
          className={cn(
            "space-y-1.5 rounded-2xl px-3 py-2 text-sm",
            message.mine
              ? "rounded-br-md bg-emerald-600 text-white"
              : "rounded-bl-md border border-border/50 bg-card text-foreground dark:bg-zinc-900",
          )}
        >
          <PhotoGrid message={message} onOpen={onOpenPhoto} />
          {message.content && <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{message.content}</p>}
        </div>
        <p className={cn("flex items-center gap-1 px-1 text-[11px] text-muted-foreground", message.mine && "justify-end")}>
          <span>{time}</span>
          {message.mine &&
            (message.seen ? (
              <>
                <CheckCheck className="size-3.5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                <span className="sr-only">Read</span>
              </>
            ) : (
              <>
                <Check className="size-3.5" aria-hidden="true" />
                <span className="sr-only">Sent</span>
              </>
            ))}
        </p>
      </div>
    </li>
  );
}

export interface ShipmentChatPanelProps {
  source: ShipmentChatSource;
  /** Who the viewer is talking to, when it isn't known from the chat yet. */
  fallbackName?: string;
  /** Called after reading, sending or closing, so the page can refresh unread counts. */
  onActivity?: () => void;
}

export function ShipmentChatPanel({ source, fallbackName, onActivity }: ShipmentChatPanelProps) {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = React.useMemo(() => shipmentChatQueryKey(source), [source]);
  const sendIds = React.useRef(createRetrySafeId());
  const listRef = React.useRef<HTMLOListElement>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);
  const lastReadRef = React.useRef<string | null>(null);

  const [messages, setMessages] = React.useState<ShipmentChatMessage[]>([]);
  const [hasOlder, setHasOlder] = React.useState(false);
  const [loadingOlder, setLoadingOlder] = React.useState(false);
  const [draft, setDraft] = React.useState("");
  const [photos, setPhotos] = React.useState<File[]>([]);
  const [sending, setSending] = React.useState(false);
  const [sendError, setSendError] = React.useState<string | null>(null);
  const [lightbox, setLightbox] = React.useState<LightboxAttachment | null>(null);
  const [confirmClose, setConfirmClose] = React.useState(false);
  const [closing, setClosing] = React.useState(false);
  const inputRef = React.useRef<HTMLTextAreaElement>(null);

  // The message box grows with what's typed, up to about five lines.
  React.useLayoutEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    input.style.height = "auto";
    input.style.height = `${Math.min(input.scrollHeight, 128)}px`;
  }, [draft]);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey,
    queryFn: async () => getShipmentChatPage(source, await getToken()),
    // Live updates arrive by socket; this catches anything missed while offline.
    refetchInterval: CHAT_FALLBACK_REFRESH_MS,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    retry: 1,
  });
  const chat = data?.chat ?? null;

  // The latest page replaces that stretch of the conversation, keeping older
  // pages already loaded and anything that arrived live after it was fetched.
  const threadRef = React.useRef<string | null | undefined>(undefined);
  React.useEffect(() => {
    if (!data) return;
    // A different conversation (the load changed hands): show only its messages.
    if (threadRef.current !== data.chat?.threadId) {
      threadRef.current = data.chat?.threadId;
      setMessages(data.messages);
      setHasOlder(data.hasMore);
      return;
    }
    setMessages((previous) => {
      if (data.messages.length === 0) return previous;
      const from = new Date(data.messages[0].createdAt).getTime();
      const to = new Date(data.messages[data.messages.length - 1].createdAt).getTime();
      const kept = previous.filter((m) => {
        const at = new Date(m.createdAt).getTime();
        return at < from || at > to;
      });
      return mergeChatMessages(kept, data.messages);
    });
    setHasOlder((previous) => previous || data.hasMore);
  }, [data]);

  // Live updates for this chat only.
  React.useEffect(() => {
    let active = true;
    let socket: ReturnType<typeof initializeSocket> | null = null;
    const onMessage = (event: ShipmentChatSocketEvent) => {
      if (!eventIsFor(source, event) || !event.message) return;
      setMessages((previous) => mergeChatMessages(previous, [event.message as ShipmentChatMessage]));
    };
    const onRefresh = (event: ShipmentChatSocketEvent) => {
      if (eventIsFor(source, event)) void refetch();
    };
    const onConnect = () => void refetch();
    void (async () => {
      const token = await getToken();
      if (!token || !active) return;
      socket = initializeSocket(token);
      socket.on(SHIPMENT_CHAT_EVENTS.message, onMessage);
      socket.on(SHIPMENT_CHAT_EVENTS.read, onRefresh);
      socket.on(SHIPMENT_CHAT_EVENTS.changed, onRefresh);
      socket.on("connect", onConnect);
    })();
    return () => {
      active = false;
      socket?.off(SHIPMENT_CHAT_EVENTS.message, onMessage);
      socket?.off(SHIPMENT_CHAT_EVENTS.read, onRefresh);
      socket?.off(SHIPMENT_CHAT_EVENTS.changed, onRefresh);
      socket?.off("connect", onConnect);
    };
  }, [getToken, refetch, source]);

  // Keep the newest message in view.
  const newest = newestMessageAt(messages);
  React.useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [newest]);

  // Mark what's on screen as read, each time a message from the other person
  // arrives while the page is visible.
  const newestFromThem = React.useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i -= 1) if (!messages[i].mine) return messages[i].createdAt;
    return null;
  }, [messages]);
  const [pageVisible, setPageVisible] = React.useState(true);
  React.useEffect(() => {
    const update = () => setPageVisible(document.visibilityState === "visible");
    update();
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);
  React.useEffect(() => {
    if (!chat?.isParticipant || !newestFromThem || !pageVisible || lastReadRef.current === newestFromThem) return;
    lastReadRef.current = newestFromThem;
    void (async () => {
      try {
        await markShipmentChatRead(source, newestFromThem, await getToken());
        onActivity?.();
      } catch {
        // Unread counts catch up on the next refresh; reading still works.
        lastReadRef.current = null;
      }
    })();
  }, [chat?.isParticipant, getToken, newestFromThem, onActivity, pageVisible, source]);

  const loadOlder = async () => {
    const oldest = messages[0]?.createdAt;
    if (!oldest) return;
    setLoadingOlder(true);
    try {
      const page = await getShipmentChatPage(source, await getToken(), oldest);
      const list = listRef.current;
      const fromBottom = list ? list.scrollHeight - list.scrollTop : 0;
      setMessages((previous) => mergeChatMessages(page.messages, previous));
      setHasOlder(page.hasMore);
      requestAnimationFrame(() => {
        if (list) list.scrollTop = list.scrollHeight - fromBottom;
      });
    } catch (err) {
      toast.error(userErrorMessage(err, "load earlier messages"));
    } finally {
      setLoadingOlder(false);
    }
  };

  const choosePhotos = (files: FileList | null) => {
    const chosen = [...photos, ...Array.from(files ?? [])];
    const check = checkChatPhotos(chosen);
    if (!check.ok) {
      setSendError(check.error);
    } else {
      setSendError(null);
      setPhotos(chosen);
    }
    if (fileRef.current) fileRef.current.value = "";
  };

  const send = async () => {
    const content = draft.trim();
    if ((!content && photos.length === 0) || sending) return;
    if (content.length > MAX_CHAT_MESSAGE_LENGTH) {
      setSendError(`Messages can be up to ${MAX_CHAT_MESSAGE_LENGTH.toLocaleString("en-US")} characters. Shorten your message and try again.`);
      return;
    }
    setSending(true);
    setSendError(null);
    const clientMessageId = sendIds.current.idFor(`${content}|${photos.map((p) => `${p.name}:${p.size}`).join(",")}`);
    try {
      const token = await getToken();
      const message = photos.length
        ? await sendShipmentChatPhotos(source, { photos, content, clientMessageId }, token)
        : await sendShipmentChatMessage(source, { content, clientMessageId }, token);
      sendIds.current.clear();
      setDraft("");
      setPhotos([]);
      if (message?.id) setMessages((previous) => mergeChatMessages(previous, [message]));
      onActivity?.();
    } catch (err) {
      setSendError(userErrorMessage(err, "send your message"));
      // The chat may have closed or changed hands meanwhile.
      void refetch();
    } finally {
      setSending(false);
    }
  };

  const setClosed = async (close: boolean) => {
    if (source.side !== "load") return;
    setClosing(true);
    try {
      await setLoadCustomerChatClosed(source.loadId, close, await getToken());
      setConfirmClose(false);
      toast.success(close ? "Chat closed. The customer can still read it." : "Chat reopened. The customer can message you again.");
      await queryClient.invalidateQueries({ queryKey });
      onActivity?.();
    } catch (err) {
      toast.error(userErrorMessage(err, close ? "close this chat" : "reopen this chat"));
    } finally {
      setClosing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center gap-2 p-6 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin text-emerald-500" aria-hidden="true" />
        Loading messages…
      </div>
    );
  }

  if (isError || !chat) {
    return (
      <div role="alert" className="m-4 space-y-3 rounded-2xl border border-destructive/20 bg-destructive/5 p-4 text-sm">
        <p className="flex items-start gap-2 text-destructive">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span className="min-w-0 break-words">{userErrorMessage(error, "open this chat")}</span>
        </p>
        <Button type="button" variant="outline" size="sm" onClick={() => void refetch()} className="h-10 rounded-xl">
          Try again
        </Button>
      </div>
    );
  }

  const otherName = chat.withName || fallbackName || "them";
  const closesLine = chat.open ? closesAtLine(chat.closesAt) : "";
  let lastDay = "";

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {(chat.canClose || chat.canReopen) && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/40 px-4 py-2">
          <p className="min-w-0 text-xs text-muted-foreground">
            {chat.canClose ? "Close the chat once the customer has what they need." : "You closed this chat."}
          </p>
          {chat.canClose ? (
            <Button type="button" variant="outline" size="sm" onClick={() => setConfirmClose(true)} className="h-9 gap-1.5 rounded-xl text-xs">
              <Lock className="size-3.5" aria-hidden="true" />
              Close chat
            </Button>
          ) : (
            <Button type="button" variant="outline" size="sm" onClick={() => void setClosed(false)} disabled={closing} className="h-9 gap-1.5 rounded-xl text-xs">
              {closing ? <Loader2 className="size-3.5 animate-spin" aria-hidden="true" /> : <LockOpen className="size-3.5" aria-hidden="true" />}
              Reopen chat
            </Button>
          )}
        </div>
      )}

      <ol
        ref={listRef}
        role="log"
        aria-live="polite"
        aria-label={`Messages with ${otherName}`}
        className="min-h-0 flex-1 space-y-3 overflow-y-auto overflow-x-hidden overscroll-contain px-4 py-4"
      >
        {hasOlder && (
          <li className="flex justify-center">
            <Button type="button" variant="ghost" size="sm" onClick={() => void loadOlder()} disabled={loadingOlder} className="h-9 gap-1.5 rounded-xl text-xs">
              {loadingOlder && <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />}
              Show earlier messages
            </Button>
          </li>
        )}
        {chat.isParticipant && messages.length === 0 && (
          <li className="mx-auto max-w-xs py-8 text-center text-sm text-muted-foreground">
            {chat.open
              ? `No messages yet. Say hello: ${otherName} gets a notification when you send a message.`
              : "No messages in this chat."}
          </li>
        )}
        {messages.map((message) => {
          const day = chatDayKey(message.createdAt);
          const showDay = day !== lastDay;
          lastDay = day;
          return (
            <React.Fragment key={message.id}>
              {showDay && (
                <li className="flex justify-center" aria-hidden="true">
                  <span className="rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-semibold text-muted-foreground">
                    {chatDayLabel(message.createdAt)}
                  </span>
                </li>
              )}
              <MessageBubble message={message} onOpenPhoto={setLightbox} />
            </React.Fragment>
          );
        })}
      </ol>

      <div className="border-t border-border/40 bg-background px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
        {chat.note && (
          <p className="mb-2 flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-900 dark:text-amber-200">
            <Lock className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span className="min-w-0 break-words">{chat.note}</span>
          </p>
        )}
        {sendError && (
          <p role="alert" className="mb-2 flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span className="min-w-0 break-words">{sendError}</span>
          </p>
        )}

        {chat.open && (
          <>
            {photos.length > 0 && (
              <ul className="mb-2 flex flex-wrap gap-2" aria-label="Photos to send">
                {photos.map((photo, index) => (
                  <li key={`${photo.name}-${index}`} className="flex max-w-full items-center gap-1 rounded-full border border-border/60 bg-muted/40 py-1 pl-3 pr-1 text-xs">
                    <ImageIcon className="size-3.5 shrink-0 text-emerald-600" aria-hidden="true" />
                    <span className="max-w-40 truncate">{photo.name}</span>
                    <button
                      type="button"
                      onClick={() => setPhotos((list) => list.filter((_, i) => i !== index))}
                      className="flex size-7 items-center justify-center rounded-full hover:bg-muted"
                      aria-label={`Remove ${photo.name}`}
                    >
                      <X className="size-3.5" aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <form
              className="flex items-end gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                void send();
              }}
            >
              <input
                ref={fileRef}
                type="file"
                accept={CHAT_PHOTO_ACCEPT}
                multiple
                className="sr-only"
                tabIndex={-1}
                aria-hidden="true"
                onChange={(event) => choosePhotos(event.target.files)}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => fileRef.current?.click()}
                disabled={sending}
                className="size-11 shrink-0 rounded-xl"
                aria-label="Add photos"
              >
                <ImagePlus className="size-5" aria-hidden="true" />
              </Button>
              <label htmlFor={`chat-input-${queryKey.join("-")}`} className="sr-only">
                Message {otherName}
              </label>
              <textarea
                ref={inputRef}
                id={`chat-input-${queryKey.join("-")}`}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey && prefersEnterToSend()) {
                    event.preventDefault();
                    void send();
                  }
                }}
                rows={1}
                maxLength={MAX_CHAT_MESSAGE_LENGTH}
                placeholder={`Message ${otherName}`}
                className="max-h-32 min-h-11 flex-1 resize-none rounded-xl border border-input bg-background px-3 py-2.5 text-base outline-none focus-visible:border-emerald-500 focus-visible:ring-2 focus-visible:ring-emerald-500/30 sm:text-sm"
              />
              <Button
                type="submit"
                size="icon"
                disabled={sending || (!draft.trim() && photos.length === 0)}
                className="size-11 shrink-0 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700"
                aria-label="Send message"
              >
                {sending ? <Loader2 className="size-5 animate-spin" aria-hidden="true" /> : <Send className="size-5" aria-hidden="true" />}
              </Button>
            </form>
          </>
        )}
        <p className="mt-2 text-[11px] text-muted-foreground">
          {closesLine ? `${closesLine} ` : ""}
          {chatZoneNote()}
        </p>
      </div>

      <AttachmentLightbox attachment={lightbox} onClose={() => setLightbox(null)} />

      <AlertDialog open={confirmClose} onOpenChange={(next) => !closing && setConfirmClose(next)}>
        <AlertDialogContent className="max-h-[90dvh] overflow-y-auto">
          <AlertDialogHeader>
            <AlertDialogTitle>Close this chat with {otherName}?</AlertDialogTitle>
            <AlertDialogDescription>
              They can still read the conversation but can&apos;t send new messages. You can reopen it anytime.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={closing}>Keep it open</AlertDialogCancel>
            <Button type="button" onClick={() => void setClosed(true)} disabled={closing} className="gap-1.5">
              {closing && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
              Close chat
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
