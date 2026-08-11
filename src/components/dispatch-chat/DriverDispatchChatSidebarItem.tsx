"use client";

import * as React from "react";
import { MessageSquare } from "lucide-react";
import {
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useUser } from "@/providers/AuthProvider";
import { DispatchChatDialog } from "@/components/dispatch-chat/DispatchChatDialog";

export function DriverDispatchChatSidebarItem() {
  const { user } = useUser();
  const [open, setOpen] = React.useState(false);
  const [unreadCount, setUnreadCount] = React.useState(0);

  const driverId = user?.id ?? null;

  return (
    <>
      <SidebarMenuItem>
        <SidebarMenuButton
          type="button"
          tooltip="Suprah Dispatch Chat"
          onClick={() => setOpen(true)}
          className="relative"
        >
          <MessageSquare />
          <span className="min-w-0 flex-1 truncate">
            Suprah Dispatch Chat
          </span>

          {unreadCount > 0 && (
            <span
              aria-label={`${unreadCount} unread message${unreadCount === 1 ? "" : "s"}`}
              className="ml-auto min-w-5 h-5 px-1 rounded-full bg-emerald-600 text-white text-[10px] font-black flex items-center justify-center group-data-[collapsible=icon]:hidden"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </SidebarMenuButton>
      </SidebarMenuItem>

      <DispatchChatDialog
        open={open}
        onOpenChange={setOpen}
        driverId={driverId}
        participantName="Dispatch Team"
        onUnreadChange={setUnreadCount}
      />
    </>
  );
}