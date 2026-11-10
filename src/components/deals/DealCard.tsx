"use client";

import * as React from "react";
import { Lock } from "lucide-react";
import { DEAL_STAGE_STYLES, formatMoney, type Deal } from "@/lib/api/afterSale";
import { fmtDateMDT } from "@/lib/timezone";
import { cn } from "@/lib/utils";

export function DealCard({ deal, onOpen, showStage = false }: { deal: Deal; onOpen: (deal: Deal) => void; showStage?: boolean }) {
  return (
    <button
      type="button"
      onClick={() => onOpen(deal)}
      className="w-full min-w-0 space-y-1 rounded-lg border bg-card p-3 text-left shadow-xs transition hover:border-emerald-500/50 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40"
      data-testid="deal-card"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 wrap-break-word text-sm font-semibold">{deal.title}</p>
        {showStage && <span className={cn("shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium", DEAL_STAGE_STYLES[deal.stage])}>{deal.stageLabel}</span>}
      </div>
      {deal.vehicle.label && <p className="wrap-break-word text-xs text-muted-foreground">{deal.vehicle.label}</p>}
      <p className="text-sm">
        {deal.amountsVisible ? (
          <span className="font-semibold">{formatMoney(deal.amount)}</span>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Lock className="h-3 w-3" />
            Amount hidden
          </span>
        )}
        {deal.amountsVisible && deal.offers.length > 0 && (
          <span className="text-xs text-muted-foreground">
            {" "}
            · {deal.offers.length} {deal.offers.length === 1 ? "offer" : "offers"}
          </span>
        )}
      </p>
      <p className="wrap-break-word text-[11px] text-muted-foreground">
        {deal.assignedName || "No owner"} · Updated {fmtDateMDT(deal.updatedAt)}
      </p>
    </button>
  );
}
