"use client";

import * as React from "react";
import { MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUser } from "@/providers/AuthProvider";
import { DispatchChatDialog } from "@/components/dispatch-chat/DispatchChatDialog";

export function DriverDispatchChatButton() {
  const { user } = useUser();
  const [open, setOpen] = React.useState(false);
  const [unreadCount, setUnreadCount] = React.useState(0);

  const driverId = user?.id ?? null;

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        aria-label={
          unreadCount > 0
            ? `Suprah Dispatch Chat, ${unreadCount} unread message${unreadCount === 1 ? "" : "s"}`
            : "Open Suprah Dispatch Chat"
        }
        className="relative h-10 w-10 rounded-xl border border-gray-200 dark:border-white/5 hover:bg-emerald-500/10"
        onClick={() => setOpen(true)}
      >
        <MessageSquare className="size-4.5" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 min-w-5 h-5 px-1 rounded-full bg-emerald-600 text-white text-[10px] font-black flex items-center justify-center border-2 border-background">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </Button>

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