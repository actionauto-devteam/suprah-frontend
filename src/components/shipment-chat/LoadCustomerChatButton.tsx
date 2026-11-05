"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageCircle, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ShipmentChatSheet } from "@/components/shipment-chat/ShipmentChatSheet";
import { useAuth } from "@/providers/AuthProvider";
import { initializeSocket } from "@/lib/socket.client";
import { SHIPMENT_CHAT_EVENTS, getLoadCustomerChat, type ShipmentChatSocketEvent } from "@/lib/api/shipmentChat";
import { unreadLabel } from "@/lib/shipment-chat";
import { cn } from "@/lib/utils";

// "Message customer" on a load, for its driver (Driver Portal) and its
// dispatcher (Transportation). Shows only when a customer follows the load in
// the customer portal. Other staff see who handles the chat, never the
// messages. A notification link ending in ?chat=customer opens it.

export function LoadCustomerChatButton({ loadId, className }: { loadId: string; className?: string }) {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = React.useState(false);
  const queryKey = React.useMemo(() => ["load-customer-chat", loadId], [loadId]);

  const { data: chat } = useQuery({
    queryKey,
    queryFn: async () => getLoadCustomerChat(loadId, await getToken()),
    enabled: Boolean(loadId),
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
    // A load that isn't the viewer's anymore simply shows no button.
    retry: false,
  });

  const refresh = React.useCallback(() => {
    void queryClient.invalidateQueries({ queryKey });
  }, [queryClient, queryKey]);

  // New messages update the unread count right away.
  React.useEffect(() => {
    let active = true;
    let socket: ReturnType<typeof initializeSocket> | null = null;
    const onEvent = (event: ShipmentChatSocketEvent) => {
      if (event?.loadId === loadId) refresh();
    };
    void (async () => {
      const token = await getToken();
      if (!token || !active) return;
      socket = initializeSocket(token);
      socket.on(SHIPMENT_CHAT_EVENTS.message, onEvent);
      socket.on(SHIPMENT_CHAT_EVENTS.changed, onEvent);
    })();
    return () => {
      active = false;
      socket?.off(SHIPMENT_CHAT_EVENTS.message, onEvent);
      socket?.off(SHIPMENT_CHAT_EVENTS.changed, onEvent);
    };
  }, [getToken, loadId, refresh]);

  // Opened from a notification ("…?chat=customer"), also when it's tapped
  // while this load is already on screen.
  const searchParams = useSearchParams();
  const linkKey = searchParams?.get("chat") === "customer" ? searchParams.toString() : "";
  const handledLink = React.useRef("");
  React.useEffect(() => {
    if (!linkKey || handledLink.current === linkKey || !chat?.isParticipant) return;
    handledLink.current = linkKey;
    setOpen(true);
  }, [chat?.isParticipant, linkKey]);

  if (!chat?.available) return null;

  if (!chat.isParticipant) {
    if (!chat.handledBy) return null;
    return (
      <p className={cn("flex items-center gap-1.5 text-xs text-muted-foreground", className)}>
        <UserRound className="size-3.5 shrink-0" aria-hidden="true" />
        <span className="min-w-0 break-words">Customer chat: handled by {chat.handledBy}, this load&apos;s dispatcher.</span>
      </p>
    );
  }

  const unread = unreadLabel(chat.unread);
  const customerName = chat.withName || "Customer";
  const about = [chat.vehicleName, chat.loadNumber ? `Load ${chat.loadNumber}` : ""].filter(Boolean).join(" · ");

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={() => setOpen(true)}
        className={cn("h-11 w-full gap-2 rounded-xl font-semibold sm:w-auto", className)}
        aria-label={`Message ${customerName}, the customer${unread ? ` (${unread})` : ""}`}
      >
        <MessageCircle className="size-4 text-emerald-600" aria-hidden="true" />
        {chat.open ? "Message customer" : "Customer chat (closed)"}
        {unread && (
          <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[11px] font-bold text-white" aria-hidden="true">
            {unread}
          </span>
        )}
      </Button>
      <ShipmentChatSheet
        open={open}
        onOpenChange={setOpen}
        target={{ side: "load", loadId }}
        title={customerName}
        subtitle={about ? `Customer · ${about}` : "Customer"}
        onActivity={refresh}
      />
    </>
  );
}
