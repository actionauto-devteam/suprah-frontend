"use client";

import * as React from "react";
import { ShieldCheck } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ShipmentChatPanel } from "@/components/shipment-chat/ShipmentChatPanel";
import type { ShipmentChatKind, ShipmentChatSource } from "@/lib/api/shipmentChat";

// The shipment chat in a side panel: full screen on phones, a panel on the
// right on larger screens, so the conversation always has room.

export type ShipmentChatSheetTarget =
  | { side: "customer"; shipmentId: string; kind: ShipmentChatKind }
  | { side: "load"; loadId: string };

export interface ShipmentChatSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: ShipmentChatSheetTarget;
  /** The other person's name. */
  title: string;
  /** Who they are: "Your driver · 2019 Peterbilt 389", "Customer · 2021 Camry · Load L-1001". */
  subtitle?: string;
  onActivity?: () => void;
}

export function ShipmentChatSheet({ open, onOpenChange, target, title, subtitle, onActivity }: ShipmentChatSheetProps) {
  const shipmentId = target.side === "customer" ? target.shipmentId : "";
  const kind = target.side === "customer" ? target.kind : "driver";
  const loadId = target.side === "load" ? target.loadId : "";
  // Built from plain values so the chat doesn't reconnect on every render.
  const side = target.side;
  const source = React.useMemo<ShipmentChatSource>(
    () => (side === "customer" ? { side: "customer", shipmentId, kind } : { side: "load", loadId }),
    [side, shipmentId, kind, loadId],
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="h-dvh w-full max-w-full gap-0 p-0 sm:max-w-md">
        <SheetHeader className="border-b border-border/40 pb-3">
          <SheetTitle className="break-words text-base font-black">{title}</SheetTitle>
          {subtitle && <SheetDescription className="break-words text-xs">{subtitle}</SheetDescription>}
          <p className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
            <ShieldCheck className="size-3.5 shrink-0" aria-hidden="true" />
            Private chat through Suprah AI. Only the two of you can read it.
          </p>
        </SheetHeader>
        {open && <ShipmentChatPanel source={source} fallbackName={title} onActivity={onActivity} />}
      </SheetContent>
    </Sheet>
  );
}
