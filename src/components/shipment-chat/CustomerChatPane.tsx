"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ExternalLink, ShieldCheck, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ShipmentChatPanel } from "@/components/shipment-chat/ShipmentChatPanel";
import { useAuth } from "@/providers/AuthProvider";
import {
  getLoadCustomerChat,
  type CustomerChatInboxItem,
  type ShipmentChatSource,
} from "@/lib/api/shipmentChat";
import { customerChatAbout } from "@/lib/shipment-chat";

// A customer chat opened from Dispatch Chat's Customers section: the same
// private chat as "Message customer" on the load, with a link to the load.

export function CustomerChatPane({
  loadId,
  item,
  loadHref,
  onBack,
  onActivity,
}: {
  loadId: string;
  /** The row it was opened from, shown until the chat itself has loaded. */
  item?: CustomerChatInboxItem;
  /** The load page: the Driver Portal's for drivers, Transportation's for staff. */
  loadHref: string;
  onBack: () => void;
  /** After reading, sending or closing, so the list and badges refresh. */
  onActivity?: () => void;
}) {
  const { getToken } = useAuth();
  // Shared with the load page's "Message customer" button.
  const { data: chat } = useQuery({
    queryKey: ["load-customer-chat", loadId],
    queryFn: async () => getLoadCustomerChat(loadId, await getToken()),
    retry: false,
  });
  const source = React.useMemo<ShipmentChatSource>(() => ({ side: "load", loadId }), [loadId]);

  const name = chat?.withName || item?.customerName || "Customer";
  const about = customerChatAbout({
    vehicleName: chat?.vehicleName ?? item?.vehicleName ?? "",
    loadNumber: chat?.loadNumber ?? item?.loadNumber ?? "",
    dealerName: chat?.dealerName ?? item?.dealerName ?? "",
  });

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-background">
      <header className="shrink-0 border-b border-border/60 bg-gradient-to-r from-sky-500/[0.07] via-background to-background px-3 py-2.5 sm:px-4 sm:py-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <Button type="button" size="icon" variant="ghost" className="max-md:size-11 size-9 shrink-0" onClick={onBack} aria-label="Back to chats">
            <ArrowLeft className="size-4" />
          </Button>
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full border border-sky-500/25 bg-sky-500/10">
            <UserRound className="size-4 text-sky-700 dark:text-sky-300" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-sky-700 dark:text-sky-300">Customer</p>
            <h2 className="truncate text-sm font-black tracking-tight sm:text-base">{name}</h2>
            {about && <p className="truncate text-xs text-muted-foreground">{about}</p>}
          </div>
          <Button asChild variant="outline" size="sm" className="max-md:min-h-11 h-9 shrink-0 gap-1.5 rounded-xl text-xs font-semibold">
            <Link href={loadHref} aria-label={`Open load${chat?.loadNumber || item?.loadNumber ? ` ${chat?.loadNumber || item?.loadNumber}` : ""}`}>
              <ExternalLink className="size-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">Open load</span>
              <span className="sm:hidden">Load</span>
            </Link>
          </Button>
        </div>
        <p className="mt-2 flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
          <ShieldCheck className="size-3.5 shrink-0" aria-hidden="true" />
          Private chat through Suprah AI. Only the two of you can read it.
        </p>
      </header>
      <ShipmentChatPanel key={loadId} source={source} fallbackName={name} onActivity={onActivity} />
    </div>
  );
}
