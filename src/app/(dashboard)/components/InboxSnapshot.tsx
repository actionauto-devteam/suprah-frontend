"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Inbox, MessageSquare, ClipboardList, Sparkles, Rss } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { useSupraSpaceMessenger } from "@/context/SupraSpaceMessengerContext";
import { useWhatsNew } from "@/context/WhatsNewContext";
import { useFeedBadge } from "@/lib/feed-notification-store";
import { Panel } from "./DashboardPanel";

/**
 * One place to see everything waiting for you across the app — SupraSpace,
 * Project tasks, What's New, and Feeds each have their own badge scattered
 * around the sidebar; this pulls them into a single glanceable tile.
 *
 * Project's unread count is fetched directly here rather than via
 * useProjectNotifications() — that context's Provider is never mounted
 * anywhere in the app, so the hook silently always returns 0.
 */
export function InboxSnapshot() {
  const router = useRouter();
  const { totalUnread: spaceUnread } = useSupraSpaceMessenger();
  const { unreadCount: whatsNewUnread } = useWhatsNew();
  const feedBadge = useFeedBadge();
  const [projectUnread, setProjectUnread] = React.useState(0);

  React.useEffect(() => {
    const controller = new AbortController();
    apiClient
      .get("/api/crm/projects/notifications/count", { signal: controller.signal })
      .then((res) => setProjectUnread(res.data?.data?.count ?? 0))
      .catch(() => {});
    return () => controller.abort();
  }, []);

  const items: { label: string; count: number; icon: LucideIcon; tone: string; href: string }[] = [
    { label: "SupraSpace", count: spaceUnread, icon: MessageSquare, tone: "text-blue-500 bg-blue-500/10 border-blue-500/20", href: "/crm/supra-space" },
    { label: "Project", count: projectUnread, icon: ClipboardList, tone: "text-violet-500 bg-violet-500/10 border-violet-500/20", href: "/project" },
    { label: "What's New", count: whatsNewUnread, icon: Sparkles, tone: "text-amber-500 bg-amber-500/10 border-amber-500/20", href: "/whats-new" },
    { label: "Feeds", count: feedBadge.total, icon: Rss, tone: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20", href: "/crm/feeds" },
  ];

  const totalUnread = items.reduce((acc, i) => acc + i.count, 0);

  return (
    <Panel title="Inbox" icon={Inbox} accent="text-primary">
      {totalUnread === 0 ? (
        <p className="text-xs text-muted-foreground/60 text-center py-6">You're caught up everywhere. 🎉</p>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {items.map((i) => (
            <button
              key={i.label}
              onClick={() => router.push(i.href)}
              className="relative flex flex-col items-start gap-2 rounded-2xl border border-border/30 bg-background/40 p-3 hover:border-border/60 transition-all text-left"
            >
              <div className={`flex size-7 items-center justify-center rounded-lg border ${i.tone}`}>
                <i.icon className="size-3.5" />
              </div>
              <span className="text-[10px] font-bold text-muted-foreground/70">{i.label}</span>
              {i.count > 0 && (
                <span className="absolute right-2.5 top-2.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-black text-white tabular-nums">
                  {i.count > 99 ? "99+" : i.count}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </Panel>
  );
}
