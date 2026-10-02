"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Hash, Loader2, MessageSquare, Pin, Plus, RefreshCw, Search, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { userErrorMessage } from "@/lib/user-error";
import { useUser } from "@/providers/AuthProvider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useDispatchChannels } from "@/hooks/useDispatchChannels";
import { useDispatchChatUnread } from "@/hooks/useDispatchChatUnread";
import { useDriverDispatchInbox } from "@/hooks/useDriverDispatchInbox";
import { useHideDriverBottomNav } from "@/hooks/useDriverBottomNav";
import { ChannelConversation } from "@/components/dispatch-channels/ChannelConversation";
import { ChannelLetterAvatar } from "@/components/dispatch-channels/ChannelLetterAvatar";
import {
  DispatchChatDialog,
  nameInitials,
  participantAvatarSrc,
  type DispatchChatThreadSummary,
} from "@/components/dispatch-chat/DispatchChatDialog";
import { DriverInboxRow, InboxPill, InboxSection, inboxListTime } from "@/components/dispatch-chat/DriverInboxRow";
import { NewDispatchMessageDialog } from "@/components/dispatch-chat/NewDispatchMessageDialog";
import type { ChannelSummary } from "@/lib/api/dispatch-channels";
import type { DispatchContact } from "@/lib/api/driver-dispatch-inbox";

type Selection = { kind: "thread" | "channel"; id: string } | null;

type ThreadRow = {
  kind: "thread";
  key: string;
  threadId: string | null;
  thread?: DispatchChatThreadSummary;
  contact?: DispatchContact;
  /** Pinned automatically: the driver has this dispatcher's load right now. */
  auto: boolean;
  pinned: boolean;
};
type ChannelRow = { kind: "channel"; key: string; channel: ChannelSummary; pinned: boolean };
type Row = ThreadRow | ChannelRow;
type InboxFilter = "all" | "unread" | "read";
type FoldableSection = "direct" | "channels";

// The same quick filters as Suprah Space (it also has Mentions, which Dispatch Chat doesn't use).
const FILTERS: Array<{ key: InboxFilter; label: string }> = [
  { key: "all", label: "All" },
  { key: "unread", label: "Unread" },
  { key: "read", label: "Read" },
];

const rowUnread = (row: Row) => (row.kind === "channel" ? row.channel.unreadCount : row.thread?.unreadCount ?? 0);

const ignoreOpenChange = () => undefined;

function selectionFromLink(threadId: string | null, channelId: string | null): Selection {
  if (threadId) return { kind: "thread", id: threadId };
  if (channelId) return { kind: "channel", id: channelId };
  return null;
}

function DispatcherAvatar({ name, avatar }: { name: string; avatar?: string | null }) {
  const src = participantAvatarSrc(avatar);
  return (
    <Avatar className="size-9 shrink-0 border border-border/60">
      {src && <AvatarImage src={src} alt={name} className="object-cover" />}
      <AvatarFallback className="bg-emerald-500/10 text-[10px] font-black text-emerald-600 dark:text-emerald-400">
        {nameInitials(name)}
      </AvatarFallback>
    </Avatar>
  );
}

/**
 * The driver's Dispatch Chat: private conversations with dispatchers and group
 * channels in one place, like Suprah Space. The dispatcher of a load the
 * driver has now is pinned automatically; drivers pin anything else they want.
 */
function DriverDispatchChatView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useUser();
  const isDriver = user?.role === "driver";
  const linkedThreadId = searchParams.get("threadId");
  const linkedChannelId = searchParams.get("channelId");

  const { channels, loading: channelsLoading, error: channelsError, unreadTotal: channelUnread, refresh: refreshChannels } =
    useDispatchChannels(isDriver);
  const { unreadTotal: chatUnread } = useDispatchChatUnread({ enabled: isDriver });
  const inbox = useDriverDispatchInbox(isDriver);
  const { setPinned, openFromLoad } = inbox;
  const unreadTotal = channelUnread + chatUnread;

  const [selection, setSelection] = React.useState<Selection>(() => selectionFromLink(linkedThreadId, linkedChannelId));
  // Like Suprah Space, an open conversation hides the phone's bottom navigation.
  useHideDriverBottomNav(selection !== null);
  const [query, setQuery] = React.useState("");
  const [filter, setFilter] = React.useState<InboxFilter>("all");
  const [folded, setFolded] = React.useState<Set<FoldableSection>>(() => new Set());
  const [newMessageOpen, setNewMessageOpen] = React.useState(false);
  const [openingLoadId, setOpeningLoadId] = React.useState<string | null>(null);

  // A notification link while the page is open selects that conversation.
  const linkKey = `${linkedThreadId ?? ""}|${linkedChannelId ?? ""}`;
  const [lastLink, setLastLink] = React.useState(linkKey);
  if (linkKey !== lastLink) {
    setLastLink(linkKey);
    const linked = selectionFromLink(linkedThreadId, linkedChannelId);
    if (linked) setSelection(linked);
  }

  const select = React.useCallback(
    (next: Selection) => {
      setSelection(next);
      const url = next
        ? `/driver/channels?${next.kind === "thread" ? "threadId" : "channelId"}=${encodeURIComponent(next.id)}`
        : "/driver/channels";
      router.replace(url, { scroll: false });
    },
    [router],
  );

  const openContact = React.useCallback(
    async (contact: DispatchContact) => {
      if (contact.threadId) {
        select({ kind: "thread", id: contact.threadId });
        setNewMessageOpen(false);
        return;
      }
      setOpeningLoadId(contact.load.id);
      try {
        const thread = await openFromLoad(contact.load.id);
        select({ kind: "thread", id: thread.id });
        setNewMessageOpen(false);
      } catch (caught) {
        toast.error(userErrorMessage(caught, "start this conversation"));
      } finally {
        setOpeningLoadId(null);
      }
    },
    [openFromLoad, select],
  );

  const sections = React.useMemo(() => {
    const threadById = new Map(inbox.threads.map((thread) => [thread.id, thread]));
    const channelById = new Map(channels.map((channel) => [channel.id, channel]));
    const contactByThread = new Map(
      inbox.contacts.filter((contact) => contact.threadId).map((contact) => [contact.threadId as string, contact]),
    );
    const manualPins = new Set(inbox.pins.map((pin) => `${pin.kind}:${pin.id}`));
    const used = new Set<string>();
    const pinned: Row[] = [];

    for (const contact of inbox.contacts) {
      if (!contact.current) continue;
      const key = contact.threadId ? `thread:${contact.threadId}` : `load:${contact.load.id}`;
      if (used.has(key)) continue;
      used.add(key);
      pinned.push({
        kind: "thread",
        key,
        threadId: contact.threadId,
        thread: contact.threadId ? threadById.get(contact.threadId) : undefined,
        contact,
        auto: true,
        pinned: true,
      });
    }
    for (const pin of inbox.pins) {
      const key = `${pin.kind}:${pin.id}`;
      if (used.has(key)) continue;
      if (pin.kind === "thread") {
        const thread = threadById.get(pin.id);
        const contact = contactByThread.get(pin.id);
        if (!thread && !contact) continue;
        used.add(key);
        pinned.push({ kind: "thread", key, threadId: pin.id, thread, contact, auto: false, pinned: true });
      } else {
        const channel = channelById.get(pin.id);
        if (!channel) continue;
        used.add(key);
        pinned.push({ kind: "channel", key, channel, pinned: true });
      }
    }

    const direct: Row[] = inbox.threads
      .filter((thread) => !used.has(`thread:${thread.id}`))
      .map((thread) => ({
        kind: "thread",
        key: `thread:${thread.id}`,
        threadId: thread.id,
        thread,
        contact: contactByThread.get(thread.id),
        auto: false,
        pinned: manualPins.has(`thread:${thread.id}`),
      }));
    // A conversation just started from New message has no messages yet, so the
    // server doesn't list it; show it while it's open.
    if (selection?.kind === "thread" && !used.has(`thread:${selection.id}`) && !threadById.has(selection.id)) {
      const contact = contactByThread.get(selection.id);
      if (contact) {
        direct.unshift({ kind: "thread", key: `thread:${selection.id}`, threadId: selection.id, contact, auto: false, pinned: false });
      }
    }

    const channelRows: Row[] = channels
      .filter((channel) => !used.has(`channel:${channel.id}`))
      .map((channel) => ({ kind: "channel", key: `channel:${channel.id}`, channel, pinned: false }));

    const needle = query.trim().toLowerCase();
    const matches = (row: Row) => {
      if (filter === "unread" && rowUnread(row) === 0) return false;
      if (filter === "read" && rowUnread(row) > 0) return false;
      if (!needle) return true;
      const text =
        row.kind === "channel"
          ? `${row.channel.name} ${row.channel.lastMessagePreview}`
          : `${row.thread?.dispatcher.name ?? row.contact?.dispatcher.name ?? ""} ${row.thread?.lastMessagePreview ?? ""} ${
              row.contact?.load.loadNumber ?? ""
            }`;
      return text.toLowerCase().includes(needle);
    };

    return {
      pinned: pinned.filter(matches),
      direct: direct.filter(matches),
      channels: channelRows.filter(matches),
      total: pinned.length + direct.length + channelRows.length,
    };
  }, [channels, filter, inbox.contacts, inbox.pins, inbox.threads, query, selection]);

  const renderRow = (row: Row) => {
    if (row.kind === "channel") {
      const { channel } = row;
      const closed = channel.status === "closed";
      return (
        <DriverInboxRow
          key={row.key}
          selected={selection?.kind === "channel" && selection.id === channel.id}
          onSelect={() => select({ kind: "channel", id: channel.id })}
          avatar={<ChannelLetterAvatar name={channel.name} closed={closed} className="size-9 text-sm" />}
          title={channel.name}
          chips={
            closed ? (
              <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground">Closed</span>
            ) : undefined
          }
          subtitle={channel.lastMessagePreview || channel.description || "No messages yet"}
          time={inboxListTime(channel.lastMessageAt)}
          unread={channel.unreadCount}
          pin={{ kind: "toggle", pinned: row.pinned, onToggle: () => void setPinned("channel", channel.id, !row.pinned) }}
        />
      );
    }

    const { thread, contact, threadId } = row;
    const name = thread?.dispatcher.name || contact?.dispatcher.name || "Dispatcher";
    const inactive = thread?.dispatcher.isActive === false;
    const subtitle =
      thread?.lastMessagePreview ||
      (contact ? `Message about ${contact.load.loadNumber} · ${contact.load.status}` : "Private conversation");
    return (
      <DriverInboxRow
        key={row.key}
        selected={Boolean(threadId) && selection?.kind === "thread" && selection.id === threadId}
        onSelect={() => (threadId ? select({ kind: "thread", id: threadId }) : contact && void openContact(contact))}
        busy={Boolean(contact) && openingLoadId === contact?.load.id}
        avatar={<DispatcherAvatar name={name} avatar={thread?.dispatcher.avatar ?? contact?.dispatcher.avatar} />}
        title={name}
        chips={
          inactive ? (
            <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-bold uppercase text-muted-foreground">Inactive</span>
          ) : row.auto ? (
            <span className="shrink-0 rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
              Current load
            </span>
          ) : null
        }
        subtitle={subtitle}
        time={inboxListTime(thread?.lastMessageAt)}
        unread={thread?.unreadCount ?? 0}
        pin={
          row.auto
            ? { kind: "load" }
            : threadId
              ? { kind: "toggle", pinned: row.pinned, onToggle: () => void setPinned("thread", threadId, !row.pinned) }
              : undefined
        }
      />
    );
  };

  const loading = inbox.loading && channelsLoading;
  const searching = query.trim().length > 0;
  const filtering = searching || filter !== "all";
  const nothingFound =
    filtering && sections.pinned.length === 0 && sections.direct.length === 0 && sections.channels.length === 0;
  const toggleSection = (key: FoldableSection) =>
    setFolded((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  // Fills the whole content area edge to edge, like Suprah Space. On larger
  // screens it also covers the area's bottom padding; on phones it stops above
  // the bottom bar.
  return (
    <div
      className="flex h-full min-h-[22rem] w-full min-w-0 flex-col overflow-hidden md:-mb-8 md:h-[calc(100%+2rem)]"
      style={{ background: "var(--bg-base, var(--background))" }}
    >
      {/* Page bar, like Suprah Space's. Hidden on phones while a chat is open. */}
      <div
        className={cn(
          "shrink-0 items-center gap-3 border-b border-border/60 px-4 py-2.5 sm:px-5",
          selection ? "hidden md:flex" : "flex",
        )}
        style={{ background: "var(--bg-elevated, var(--card))" }}
      >
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm shadow-emerald-600/30">
          <MessageSquare className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          {/* Inline size: the driver portal's stylesheet enlarges every page heading. */}
          <h1 className="truncate font-black tracking-tight" style={{ fontSize: 16, lineHeight: 1.25 }}>
            Dispatch <span className="text-emerald-600 dark:text-emerald-400">Chat</span>
          </h1>
          <p className="truncate text-[11px] text-muted-foreground">Private chats with dispatchers and your group channels</p>
        </div>
        {unreadTotal > 0 && (
          <span className="shrink-0 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
            {unreadTotal > 99 ? "99+" : unreadTotal} unread
          </span>
        )}
      </div>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <aside
          className={cn(
            "min-h-0 w-full flex-col border-border/60 md:flex md:w-72 md:shrink-0 md:border-r xl:w-80",
            selection ? "hidden" : "flex",
          )}
          style={{ background: "var(--bg-elevated, var(--card))" }}
        >
          <div className="shrink-0 space-y-3 px-4 pb-3 pt-4">
            <div className="flex items-center justify-between gap-2">
              <InboxPill>Messages</InboxPill>
              <button
                type="button"
                onClick={() => setNewMessageOpen(true)}
                title="Message the dispatcher of one of your loads"
                className="flex h-7 items-center gap-1.5 rounded-lg border border-emerald-500/25 bg-emerald-500/15 px-2.5 text-[11px] font-semibold text-emerald-700 transition-colors hover:bg-emerald-500/25 dark:text-emerald-300"
              >
                <Plus className="size-3" />
                New
              </button>
            </div>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search chats & channels…"
                aria-label="Search chats and channels"
                className="h-11 w-full rounded-xl border border-border/70 bg-background/60 pl-10 pr-9 text-base outline-none placeholder:text-muted-foreground/70 focus-visible:border-emerald-500/60 focus-visible:ring-[3px] focus-visible:ring-emerald-500/20 sm:text-sm [&::-webkit-search-cancel-button]:hidden"
              />
              {searching && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  aria-label="Clear search"
                  className="absolute right-2 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>
            <div className="flex gap-1.5 overflow-x-auto" role="group" aria-label="Show chats">
              {FILTERS.map((option) => {
                const active = filter === option.key;
                return (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => setFilter(option.key)}
                    aria-pressed={active}
                    className={cn(
                      "h-[26px] shrink-0 rounded-full border px-2.5 text-[10.5px] font-semibold leading-none transition-colors",
                      active
                        ? "border-emerald-600 bg-emerald-600 text-white"
                        : "border-border/70 bg-muted/40 text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="mx-4 h-px shrink-0 bg-border/60" />

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 pb-3 pt-1">
            {loading ? (
              <p className="flex items-center justify-center gap-2 py-12 text-xs text-muted-foreground">
                <Loader2 className="size-4 animate-spin text-emerald-500" /> Loading your chats…
              </p>
            ) : inbox.error && sections.total === 0 ? (
              <div className="p-3">
                <div className="rounded-xl border border-red-500/20 bg-red-500/[0.05] p-4 text-center">
                  <p className="text-xs font-bold text-red-600 dark:text-red-400">Could not load your chats</p>
                  <p className="mt-1 text-[10px] text-muted-foreground">{inbox.error}</p>
                  <Button type="button" variant="outline" size="sm" className="mt-3 h-8 gap-1.5 text-xs" onClick={() => void inbox.refresh()}>
                    <RefreshCw className="size-3.5" /> Try again
                  </Button>
                </div>
              </div>
            ) : sections.total === 0 ? (
              <div className="flex flex-col items-center px-6 py-12 text-center">
                <div className="mb-3 flex size-12 items-center justify-center rounded-2xl bg-emerald-500/10">
                  <MessageSquare className="size-6 text-emerald-500" />
                </div>
                <p className="text-sm font-black">No chats yet</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  Tap New to write to the dispatcher of your load. Channels a dispatcher adds you to show up here too.
                </p>
              </div>
            ) : nothingFound ? (
              <p className="px-4 py-10 text-center text-xs text-muted-foreground">
                {searching
                  ? `No chats or channels match “${query.trim()}”.`
                  : filter === "unread"
                    ? "You're all caught up. No unread chats."
                    : "No read chats yet."}
              </p>
            ) : (
              <>
                {sections.pinned.length > 0 && (
                  <InboxSection label="Pinned" icon={<Pin className="size-2.5" />}>
                    <div className="space-y-0.5">{sections.pinned.map(renderRow)}</div>
                  </InboxSection>
                )}
                {(!filtering || sections.direct.length > 0) && (
                  <InboxSection
                    label="Direct messages"
                    icon={<MessageSquare className="size-2.5" />}
                    collapsed={folded.has("direct")}
                    onToggle={() => toggleSection("direct")}
                  >
                    {sections.direct.length > 0 ? (
                      <div className="space-y-0.5">{sections.direct.map(renderRow)}</div>
                    ) : (
                      <p className="px-3 pb-2 text-[12px] leading-relaxed text-muted-foreground">
                        {sections.pinned.length > 0
                          ? "Other private chats with dispatchers show up here."
                          : "Private chats with dispatchers show up here."}
                      </p>
                    )}
                  </InboxSection>
                )}
                {(!filtering || sections.channels.length > 0) && (
                  <InboxSection
                    label="Channels"
                    icon={<Hash className="size-2.5" />}
                    collapsed={folded.has("channels")}
                    onToggle={() => toggleSection("channels")}
                  >
                    {sections.channels.length > 0 ? (
                      <div className="space-y-0.5">{sections.channels.map(renderRow)}</div>
                    ) : channelsError ? (
                      <p className="px-3 pb-2 text-[12px] leading-relaxed text-red-600 dark:text-red-400">
                        Couldn&apos;t load your channels. {channelsError}
                      </p>
                    ) : (
                      <p className="px-3 pb-2 text-[12px] leading-relaxed text-muted-foreground">
                        When a dispatcher adds you to a channel, it shows up here and you&apos;ll get a notification.
                      </p>
                    )}
                  </InboxSection>
                )}
              </>
            )}
          </div>
        </aside>

        <section
          className={cn("min-h-0 min-w-0 flex-1", selection ? "flex" : "hidden md:flex")}
          style={{ background: "var(--bg-base, var(--background))" }}
        >
          {selection?.kind === "thread" && user?.id ? (
            <DispatchChatDialog
              key={selection.id}
              embedded
              open
              onOpenChange={ignoreOpenChange}
              driverId={user.id}
              participantName="Dispatch"
              initialThreadId={selection.id}
              onBack={() => select(null)}
            />
          ) : selection?.kind === "channel" ? (
            <ChannelConversation
              key={selection.id}
              channelId={selection.id}
              variant="supraspace"
              onBack={() => select(null)}
              onGone={() => {
                select(null);
                void refreshChannels();
              }}
            />
          ) : (
            <div className="flex flex-1 items-center justify-center p-8 text-center">
              <div className="flex max-w-xs flex-col items-center">
                <div className="mb-3 flex size-12 items-center justify-center rounded-2xl bg-emerald-500/10">
                  <MessageSquare className="size-6 text-emerald-500" />
                </div>
                <p className="text-sm font-black">Select a chat</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  Choose a dispatcher or a channel to read and send messages, photos and files.
                </p>
              </div>
            </div>
          )}
        </section>
      </div>

      <NewDispatchMessageDialog
        open={newMessageOpen}
        onOpenChange={setNewMessageOpen}
        contacts={inbox.contacts}
        openingLoadId={openingLoadId}
        onChoose={(contact) => void openContact(contact)}
      />
    </div>
  );
}

export default function DriverDispatchChatPage() {
  return (
    <React.Suspense
      fallback={
        <p className="flex items-center justify-center gap-2 py-12 text-xs text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Loading your chats…
        </p>
      }
    >
      <DriverDispatchChatView />
    </React.Suspense>
  );
}
