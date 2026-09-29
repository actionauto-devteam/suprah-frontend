"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Hash, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDispatchChannels } from "@/hooks/useDispatchChannels";
import { ChannelListRow } from "@/components/dispatch-channels/ChannelList";
import { ChannelConversation } from "@/components/dispatch-channels/ChannelConversation";

/**
 * The driver's group channels. Drivers join when a dispatcher or admin adds
 * them (or approves a suggestion); they can post, suggest people and leave.
 */
function DriverChannelsView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const linkedChannelId = searchParams.get("channelId");
  const { channels, loading, error, unreadTotal, refresh } = useDispatchChannels(true);
  const [selectedId, setSelectedId] = React.useState<string | null>(linkedChannelId);

  // A notification link while the page is open selects that channel.
  const [lastLink, setLastLink] = React.useState(linkedChannelId);
  if (linkedChannelId !== lastLink) {
    setLastLink(linkedChannelId);
    if (linkedChannelId) setSelectedId(linkedChannelId);
  }

  const select = (channelId: string | null) => {
    setSelectedId(channelId);
    router.replace(channelId ? `/driver/channels?channelId=${encodeURIComponent(channelId)}` : "/driver/channels", {
      scroll: false,
    });
  };

  return (
    <div className="mx-auto flex h-[calc(100dvh-8rem)] min-h-[28rem] w-full max-w-6xl overflow-hidden rounded-2xl border border-border/70 shadow-xl sm:h-[calc(100dvh-9rem)]">
      <aside
        className={cn(
          "min-h-0 w-full flex-col border-border/60 md:flex md:w-80 md:shrink-0 md:border-r",
          selectedId ? "hidden" : "flex",
        )}
        style={{ background: "var(--bg-elevated, var(--card))" }}
      >
        <div className="shrink-0 border-b border-border/60 bg-gradient-to-r from-emerald-500/[0.07] via-background to-background px-4 py-3">
          <div className="flex items-center gap-2.5">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full border border-emerald-500/25 bg-emerald-500/10">
              <Hash className="size-4 text-emerald-600 dark:text-emerald-400" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[9px] font-extrabold uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-400">
                Suprah AI
              </p>
              <h1 className="truncate text-sm font-black tracking-tight sm:text-base">Dispatch Channels</h1>
              <p className="truncate text-[10px] text-muted-foreground">Group chats with dispatch and other drivers</p>
            </div>
            {unreadTotal > 0 && (
              <span className="shrink-0 rounded-full bg-emerald-600 px-2 py-1 text-[9px] font-black text-white">
                {unreadTotal > 99 ? "99+" : unreadTotal} unread
              </span>
            )}
          </div>
        </div>
        <div className="min-h-0 flex-1 space-y-0.5 overflow-y-auto p-1.5">
          {loading ? (
            <p className="flex items-center justify-center gap-2 py-12 text-xs text-muted-foreground">
              <Loader2 className="size-4 animate-spin text-emerald-500" /> Loading channels…
            </p>
          ) : error ? (
            <div className="p-3">
              <div className="rounded-xl border border-red-500/20 bg-red-500/[0.05] p-4 text-center">
                <p className="text-xs font-bold text-red-600 dark:text-red-400">Could not load channels</p>
                <p className="mt-1 text-[10px] text-muted-foreground">{error}</p>
              </div>
            </div>
          ) : channels.length === 0 ? (
            <div className="flex flex-col items-center px-6 py-12 text-center">
              <div className="mb-3 flex size-12 items-center justify-center rounded-2xl bg-emerald-500/10">
                <Hash className="size-6 text-emerald-500" />
              </div>
              <p className="text-sm font-black">No channels yet</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                When a dispatcher adds you to a channel, it shows up here and you&apos;ll get a notification.
              </p>
            </div>
          ) : (
            channels.map((channel) => (
              <ChannelListRow
                key={channel.id}
                channel={channel}
                selected={channel.id === selectedId}
                onSelect={() => select(channel.id)}
              />
            ))
          )}
        </div>
      </aside>

      <section
        className={cn("min-h-0 min-w-0 flex-1", selectedId ? "flex" : "hidden md:flex")}
        style={{ background: "var(--bg-base, var(--background))" }}
      >
        {selectedId ? (
          <ChannelConversation
            key={selectedId}
            channelId={selectedId}
            onBack={() => select(null)}
            onGone={() => {
              select(null);
              void refresh();
            }}
          />
        ) : (
          <div className="flex flex-1 items-center justify-center p-8 text-center">
            <div className="flex max-w-xs flex-col items-center">
              <div className="mb-3 flex size-12 items-center justify-center rounded-2xl bg-emerald-500/10">
                <Hash className="size-6 text-emerald-500" />
              </div>
              <p className="text-sm font-black">Select a channel</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Choose a channel to read and send messages, photos and files.
              </p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

export default function DriverChannelsPage() {
  return (
    <React.Suspense
      fallback={
        <p className="flex items-center justify-center gap-2 py-12 text-xs text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Loading channels…
        </p>
      }
    >
      <DriverChannelsView />
    </React.Suspense>
  );
}
