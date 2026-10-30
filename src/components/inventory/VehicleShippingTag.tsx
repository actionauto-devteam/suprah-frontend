"use client";

import Link from "next/link";
import { FileText, Truck } from "lucide-react";
import { cn } from "@/lib/utils";
import { loadStatusWords, type InventoryShippingState } from "@/lib/vehicle-shipping";

/**
 * Under an Inventory car (staff only): the live load it's already on, or the
 * shipping quote still waiting for it, so nobody ships the same car twice.
 */
export function VehicleShippingTag({ state, className }: { state: InventoryShippingState; className?: string }) {
  const base =
    "flex w-full min-w-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

  if (state.kind === "load") {
    const { load, moreLoads } = state;
    const status = loadStatusWords(load.status);
    return (
      <Link
        href={`/transportation/load/${encodeURIComponent(load._id)}`}
        className={cn(
          base,
          "border-amber-500/30 bg-amber-500/10 text-amber-900 hover:bg-amber-500/15 dark:text-amber-200",
          className,
        )}
        title="This car is already on a load. Open it before you create another."
      >
        <Truck className="size-3.5 shrink-0" aria-hidden="true" />
        <span className="min-w-0 truncate">
          On load <span className="font-semibold">{load.loadNumber}</span> · {status}
          {moreLoads > 0 ? ` (+${moreLoads} more)` : ""}
        </span>
      </Link>
    );
  }

  return (
    <Link
      href="/transportation?tab=drafts"
      className={cn(
        base,
        "border-sky-500/30 bg-sky-500/10 text-sky-900 hover:bg-sky-500/15 dark:text-sky-200",
        className,
      )}
      title="A shipping quote for this car is waiting. Find it under Quotes in Transportation."
    >
      <FileText className="size-3.5 shrink-0" aria-hidden="true" />
      <span className="min-w-0 truncate">
        {state.quote.status === "accepted" ? "Shipping quote accepted" : "Shipping quote waiting"}
      </span>
    </Link>
  );
}
