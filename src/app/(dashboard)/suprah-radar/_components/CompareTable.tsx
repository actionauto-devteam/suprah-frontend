"use client";

import * as React from "react";
import { Building2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useDealerComparison, type MarketFilters } from "@/hooks/useSuprahRadar";
import type { DealerRollup } from "@/types/suprah-radar";
import {
  Delta,
  EmptyState,
  formatCurrency,
  formatNumber,
  formatPercent,
  Panel,
} from "./shared";

export const COMPARE_LIMIT = 4;

const ROWS: { label: string; render: (d: DealerRollup) => React.ReactNode }[] = [
  { label: "Live inventory", render: (d) => formatNumber(d.active) },
  { label: "Inventory value", render: (d) => formatCurrency(d.inventoryValue, true) },
  { label: "Sold in period", render: (d) => formatNumber(d.sold) },
  { label: "Acquired in period", render: (d) => formatNumber(d.acquired) },
  { label: "Avg list price", render: (d) => formatCurrency(d.avgPrice, true) },
  { label: "Avg days on lot", render: (d) => (d.avgDaysOnLot ? `${formatNumber(d.avgDaysOnLot)} d` : "—") },
  { label: "Avg days to sell", render: (d) => (d.avgDaysToSell ? `${formatNumber(d.avgDaysToSell)} d` : "—") },
  { label: "Sell-through", render: (d) => formatPercent(d.sellThrough, 1) },
  { label: "Fresh under 30d", render: (d) => formatPercent(d.freshPct) },
  { label: "Aged over 60d", render: (d) => formatPercent(d.agedPct) },
  { label: "New / Used mix", render: (d) => `${formatNumber(d.newUnits)} / ${formatNumber(d.usedUnits)}` },
  { label: "Momentum", render: (d) => <Delta value={d.momentum} /> },
];

export function CompareTable({
  filters,
  compareIds,
  onCompareChange,
}: {
  filters: MarketFilters;
  compareIds: string[];
  onCompareChange: (ids: string[]) => void;
}) {
  const { data, isFetching } = useDealerComparison(compareIds, filters);

  return (
    <Panel className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
        <div>
          <p className="text-sm font-semibold">Head to head</p>
          <p className="text-[11px] text-muted-foreground">
            Compare up to {COMPARE_LIMIT} dealerships side by side
          </p>
        </div>
        {compareIds.length > 0 && (
          <Button variant="ghost" size="sm" onClick={() => onCompareChange([])}>
            Clear
          </Button>
        )}
      </div>

      {compareIds.length === 0 ? (
        <div className="p-4">
          <EmptyState
            icon={Building2}
            title="Nothing to compare yet"
            description="Use the compare button in Dealer Lookup."
          />
        </div>
      ) : isFetching && !data?.length ? (
        <div className="p-4">
          <Skeleton className="h-64 w-full" />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-130 text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="px-4 py-2 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  Metric
                </th>
                {(data ?? []).map((dealer) => (
                  <th key={dealer.id} className="px-3 py-2 text-right">
                    <span
                      className={cn(
                        "block truncate text-xs font-semibold",
                        dealer.isYou && "text-primary",
                      )}
                    >
                      {dealer.name}
                    </span>
                    <span className="block truncate text-[10px] font-normal text-muted-foreground">
                      {[dealer.city, dealer.state].filter(Boolean).join(", ") || "—"}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {ROWS.map((row) => (
                <tr key={row.label} className="transition-colors hover:bg-muted/40">
                  <td className="px-4 py-2 text-xs text-muted-foreground">{row.label}</td>
                  {(data ?? []).map((dealer) => (
                    <td
                      key={dealer.id}
                      className={cn(
                        "px-3 py-2 text-right text-xs tabular-nums",
                        dealer.isYou && "font-semibold text-primary",
                      )}
                    >
                      {row.render(dealer)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}
