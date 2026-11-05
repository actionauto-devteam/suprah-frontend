"use client";

import * as React from "react";
import { Headset, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CustomerShipment, CustomerShipmentChat } from "@/lib/api/customerQuoteRequests";
import type { ShipmentChatKind } from "@/lib/api/shipmentChat";
import { unreadLabel } from "@/lib/shipment-chat";

// My Shipments: "Message driver" and "Message dispatcher" on a booked
// shipment, with new-message counts. A chat that can't be opened yet says
// when it will, and what to do meanwhile.

function ChatButton({
  kind,
  chat,
  onOpen,
}: {
  kind: ShipmentChatKind;
  chat: CustomerShipmentChat;
  onOpen: (kind: ShipmentChatKind) => void;
}) {
  const unread = unreadLabel(chat.unread);
  const who = kind === "driver" ? "driver" : "dispatcher";
  const Icon = kind === "driver" ? MessageCircle : Headset;
  const label = chat.open ? `Message ${who}` : `${kind === "driver" ? "Driver" : "Dispatcher"} chat (closed)`;
  return (
    <Button
      type="button"
      variant="outline"
      onClick={() => onOpen(kind)}
      disabled={!chat.readable}
      className="h-10 w-full justify-center gap-2 rounded-xl text-sm font-semibold sm:w-auto"
      aria-label={`${label}${unread ? ` (${unread})` : ""}`}
    >
      <Icon className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
      <span className="truncate">{label}</span>
      {unread && (
        <span className="shrink-0 rounded-full bg-emerald-600 px-2 py-0.5 text-[11px] font-bold text-white" aria-hidden="true">
          {unread}
        </span>
      )}
    </Button>
  );
}

export function ShipmentChatButtons({ entry, onOpen }: { entry: CustomerShipment; onOpen: (kind: ShipmentChatKind) => void }) {
  const chats = entry.chats;
  if (!chats) return null;
  // What to do about a chat that can't be opened yet (one line each, at most two).
  const notes = [chats.driver, chats.dispatcher].filter((chat) => !chat.readable && chat.note).map((chat) => chat.note as string);
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2 sm:flex sm:flex-wrap">
        <ChatButton kind="driver" chat={chats.driver} onOpen={onOpen} />
        <ChatButton kind="dispatcher" chat={chats.dispatcher} onOpen={onOpen} />
      </div>
      {[...new Set(notes)].map((note) => (
        <p key={note} className="text-xs text-muted-foreground">
          {note}
        </p>
      ))}
    </div>
  );
}
