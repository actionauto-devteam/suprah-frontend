"use client";

import * as React from "react";
import { BarChart3, Columns3 } from "lucide-react";

import { cn } from "@/lib/utils";
import { useWatchlist, type MarketFilters } from "@/hooks/useSuprahRadar";

import { CompareTable } from "../CompareTable";
import { PerformanceBoards } from "../PerformanceBoards";
import { SectionShell } from "../shared";

export function DealerPerformanceTab({
  filters,
  competitorsOnly,
  onCompetitorsOnlyChange,
  compareIds,
  onCompareChange,
  onSelectDealer,
}: {
  filters: MarketFilters;
  competitorsOnly: boolean;
  onCompetitorsOnlyChange: (value: boolean) => void;
  compareIds: string[];
  onCompareChange: (ids: string[]) => void;
  onSelectDealer: (id: string) => void;
}) {
  const { data: watchlist } = useWatchlist(filters);
  const watchedCount = watchlist?.watches?.length ?? 0;

  return (
    <div className="space-y-8">
      <SectionShell
        title="Dealer performance"
        description="Every dealership in scope, ranked"
        icon={BarChart3}
        actions={
          <div className="inline-flex items-center gap-1 rounded-lg border bg-card p-1">
            {[
              { value: false, label: "All dealers" },
              { value: true, label: "My competitors" },
            ].map((option) => (
              <button
                key={String(option.value)}
                type="button"
                onClick={() => onCompetitorsOnlyChange(option.value)}
                disabled={option.value && watchedCount === 0}
                className={cn(
                  "rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                  competitorsOnly === option.value
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted",
                )}
              >
                {option.label}
                {option.value && watchedCount > 0 ? ` (${watchedCount})` : ""}
              </button>
            ))}
          </div>
        }
      >
        <PerformanceBoards
          filters={filters}
          competitorsOnly={competitorsOnly}
          onSelectDealer={onSelectDealer}
        />
      </SectionShell>

      <SectionShell
        title="Head to head"
        description="Your store against your competitors"
        icon={Columns3}
      >
        <CompareTable
          filters={filters}
          compareIds={compareIds}
          onCompareChange={onCompareChange}
        />
      </SectionShell>
    </div>
  );
}
