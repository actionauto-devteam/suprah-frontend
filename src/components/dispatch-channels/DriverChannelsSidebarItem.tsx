"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Hash } from "lucide-react";
import { SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { useUser } from "@/providers/AuthProvider";
import { useDispatchChannels } from "@/hooks/useDispatchChannels";

/** Driver menu entry for group channels, with their unread count. */
export function DriverChannelsSidebarItem() {
  const { user } = useUser();
  const pathname = usePathname();
  const { unreadTotal } = useDispatchChannels(user?.role === "driver");

  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild tooltip="Channels" isActive={pathname?.startsWith("/driver/channels")} className="relative">
        <Link href="/driver/channels">
          <Hash />
          <span className="min-w-0 flex-1 truncate">Channels</span>
          {unreadTotal > 0 && (
            <span
              aria-label={`${unreadTotal} unread channel message${unreadTotal === 1 ? "" : "s"}`}
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
