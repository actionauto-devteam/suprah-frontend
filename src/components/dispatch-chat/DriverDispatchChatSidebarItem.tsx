"use client";

import * as React from "react";
import { MessageSquare } from "lucide-react";
import {
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useUser } from "@/providers/AuthProvider";
import { DispatchChatDialog } from "@/components/dispatch-chat/DispatchChatDialog";
import { useDispatchChatUnread } from "@/hooks/useDispatchChatUnread";

export function DriverDispatchChatSidebarItem() {
  const { user } = useUser();
  const [open, setOpen] = React.useState(false);
  const { unreadTotal, refresh } = useDispatchChatUnread({
    enabled: user?.role === "driver",
  });

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

          {unreadTotal > 0 && (
            <span
              aria-label={`${unreadTotal} unread message${unreadTotal === 1 ? "" : "s"}`}
              className="ml-auto min-w-5 h-5 px-1 rounded-full bg-emerald-600 text-white text-[10px] font-black flex items-center justify-center group-data-[collapsible=icon]:hidden"
            >
              {unreadTotal > 99 ? "99+" : unreadTotal}
            </span>
          )}
        </SidebarMenuButton>
      </SidebarMenuItem>

      <DispatchChatDialog
        open={open}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen);
          if (!nextOpen) void refresh();
        }}
        driverId={driverId}
        participantName="Dispatch"
      />
    </>
  );
}