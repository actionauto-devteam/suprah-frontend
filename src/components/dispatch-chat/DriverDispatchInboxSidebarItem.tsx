"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageSquare } from "lucide-react";
import { SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { useUser } from "@/providers/AuthProvider";
import { useDispatchChannels } from "@/hooks/useDispatchChannels";
import { useDispatchChatUnread } from "@/hooks/useDispatchChatUnread";

/**
 * Driver menu entry for Messages (the driver's chats page): private chats with dispatchers and
 * customers, and group channels, on one page, with one unread count for all.
 */
export function DriverDispatchInboxSidebarItem({ onNavigate }: { onNavigate?: () => void }) {
  const { user } = useUser();
  const pathname = usePathname();
  const isDriver = user?.role === "driver";
  const { unreadTotal: channelUnread } = useDispatchChannels(isDriver);
  const { unreadTotal: chatUnread, customerChatUnread } = useDispatchChatUnread({ enabled: isDriver });
  const unreadTotal = channelUnread + chatUnread + customerChatUnread;

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        tooltip="Messages"
        isActive={pathname?.startsWith("/driver/channels")}
        className="relative"
      >
        <Link href="/driver/channels" onClick={onNavigate}>
          <MessageSquare />
          <span className="min-w-0 flex-1 truncate">Messages</span>
          {unreadTotal > 0 && (
            <span
              aria-label={`${unreadTotal} unread message${unreadTotal === 1 ? "" : "s"}`}
              className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-600 px-1 text-[10px] font-black text-white group-data-[collapsible=icon]:hidden"
            >
              {unreadTotal > 99 ? "99+" : unreadTotal}
            </span>
          )}
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}
