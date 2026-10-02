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
 * Driver menu entry for Dispatch Chat: private chats with dispatchers and
 * group channels on one page, with one unread count for both.
 */
export function DriverDispatchInboxSidebarItem({ onNavigate }: { onNavigate?: () => void }) {
  const { user } = useUser();
  const pathname = usePathname();
  const isDriver = user?.role === "driver";
  const { unreadTotal: channelUnread } = useDispatchChannels(isDriver);
  const { unreadTotal: chatUnread } = useDispatchChatUnread({ enabled: isDriver });
  const unreadTotal = channelUnread + chatUnread;

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        tooltip="Dispatch Chat"
        isActive={pathname?.startsWith("/driver/channels")}
        className="relative"
      >
        <Link href="/driver/channels" onClick={onNavigate}>
          <MessageSquare />
          <span className="min-w-0 flex-1 truncate">Dispatch Chat</span>
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
