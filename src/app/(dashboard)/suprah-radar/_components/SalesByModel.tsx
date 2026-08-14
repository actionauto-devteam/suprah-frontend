"use client";

import * as React from "react";
import { Gauge, Timer, TrendingUp } from "lucide-react";

import { cn } from "@/lib/utils";
import type { Segment } from "@/types/suprah-radar";
import {
  EmptyState,
  formatCurrency,
  formatNumber,
  LoadingRows,
  Panel,
  ProgressMeter,
} from "./shared";

function RankedModels({
  title,
  hint,
  icon: Icon,
  tone,
  rows,
  valueOf,
  formatValue,
  meterOf,
  onSelectModel,
}: {
  title: string;
  hint: string;
  icon: typeof TrendingUp;
  tone: string;
  rows: Segment[];
  valueOf: (s: Segment) => number;
  formatValue: (s: Segment) => string;
  meterOf: (s: Segment, max: number) => number;
  onSelectModel: (target: { make: string; model: string }) => void;
}) {
  const max = Math.max(1, ...rows.map(valueOf));

  return (
    <Panel className="overflow-hidden">
      <div className="border-b px-4 py-3">
        <p className="flex items-center gap-1.5 text-sm font-semibold">
          <Icon className={cn("size-4 shrink-0", tone)} />
          {title}
        </p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p>
      </div>

      {rows.length === 0 ? (
        <p className="px-4 py-8 text-center text-xs text-muted-foreground">
          Not enough sales in this market yet.
        </p>
      ) : (
        <ul className="divide-y">
          {rows.map((row, index) => (
            <li key={row.id}>
              <button
                type="button"
                onClick={() => onSelectModel({ make: row.make, model: row.model })}
                className={cn(
                  "w-full px-3 py-2.5 text-left transition-colors hover:bg-muted/60 sm:px-4",
                  row.yours > 0 && "bg-primary/5",
                )}
              >
              <div className="flex items-center gap-2.5">
                <span className="w-5 shrink-0 text-[11px] tabular-nums text-muted-foreground">
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium">
                    {row.make} {row.model}
                  </p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {formatNumber(row.active)} listed · {formatCurrency(row.avgPrice, true)} avg
                    {row.yours > 0 && <span className="text-primary"> · you hold {row.yours}</span>}
                  </p>
                </div>
                <span className="shrink-0 text-[13px] font-semibold tabular-nums">
                  {formatValue(row)}
                </span>
              </div>
              <ProgressMeter className="mt-2" value={meterOf(row, max)} tone="market" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

export function SalesByModel({
  segments,
  loading,
  onSelectModel,
}: {
  segments?: Segment[];
  loading?: boolean;
  onSelectModel: (target: { make: string; model: string }) => void;
}) {
  const { topSelling, fastestTurn } = React.useMemo(() => {
    const all = segments ?? [];
    return {
      topSelling: [...all].filter((s) => s.sold > 0).sort((a, b) => b.sold - a.sold).slice(0, 10),
      fastestTurn: [...all]
        .filter((s) => s.avgDaysToSell > 0 && s.sold >= 2)
        .sort((a, b) => a.avgDaysToSell - b.avgDaysToSell)
        .slice(0, 10),
    };
  }, [segments]);

  if (loading) {
    return (
      <div className="grid gap-3 xl:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <Panel key={i} className="p-4">
            <LoadingRows rows={6} height="h-11" />
          </Panel>
        ))}
      </div>
    );
  }

  if (!segments?.length) {
    return (
      <EmptyState
        icon={Gauge}
        title="No model sales data"
        description="Widen the scope or period."
      />
    );
  }

  return (
    <div className="grid gap-3 xl:grid-cols-2">
      <RankedModels
        title="Highest selling"
        hint="Most sold in the period"
        icon={TrendingUp}
        tone="text-emerald-500"
        rows={topSelling}
        onSelectModel={onSelectModel}
        valueOf={(s) => s.sold}
        formatValue={(s) => `${formatNumber(s.sold)} sold`}
        meterOf={(s, max) => (s.sold / max) * 100}
      />
      <RankedModels
        title="Lowest days on lot"
        hint="Quickest to sell"
        icon={Timer}
        tone="text-blue-500"
        rows={fastestTurn}
        onSelectModel={onSelectModel}
        valueOf={(s) => s.avgDaysToSell}
        formatValue={(s) => `${formatNumber(s.avgDaysToSell)} d`}
        meterOf={(s, max) => 100 - (s.avgDaysToSell / max) * 100 + 8}
      />
    </div>
  );
}
