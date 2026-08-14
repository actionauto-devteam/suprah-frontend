"use client";

import * as React from "react";
import { Lock, Trophy } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type {
  MarketSummary,
  PrivateMetrics,
  RankKey,
  YourStanding as Standing,
} from "@/types/suprah-radar";
import {
  Delta,
  EmptyState,
  formatCurrency,
  formatNumber,
  formatPercent,
  ordinal,
  Panel,
  ProgressMeter,
} from "./shared";

const RANK_META: { key: RankKey; label: string; describe: (s: Standing) => string }[] = [
  { key: "sales", label: "Sales", describe: (s) => `${formatNumber(s.sold)} units sold` },
  { key: "acquisitions", label: "Acquisitions", describe: (s) => `${formatNumber(s.acquired)} units taken in` },
  { key: "turn", label: "Turn speed", describe: (s) => (s.avgDaysToSell ? `${formatNumber(s.avgDaysToSell)} days to sell` : "Not enough sales") },
  { key: "freshness", label: "Freshness", describe: (s) => `${formatPercent(s.freshPct)} under 30 days` },
  { key: "sellThrough", label: "Sell-through", describe: (s) => `${formatPercent(s.sellThrough, 1)} of stock moved` },
];

export function YourStanding({
  you,
  privateMetrics,
  market,
  loading,
  onOpenBoard,
}: {
  you?: Standing | null;
  privateMetrics?: PrivateMetrics;
  market?: MarketSummary;
  loading?: boolean;
  onOpenBoard?: () => void;
}) {
  if (loading) {
    return (
      <div className="grid gap-3 lg:grid-cols-3">
        <Skeleton className="h-52 lg:col-span-2" />
        <Skeleton className="h-52" />
      </div>
    );
  }

  if (!you) {
    return (
      <EmptyState
        icon={Trophy}
        title="Your store is not in this market yet"
        description="Add inventory with a dealer city and state, or switch scope to Nationwide."
      />
    );
  }

  return (
    <div className="grid gap-3 lg:grid-cols-3">
      <Panel className="p-4 lg:col-span-2">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{you.name}</p>
            <p className="text-xs text-muted-foreground">
              {[you.city, you.state].filter(Boolean).join(", ") || "Location unset"} ·{" "}
              {formatNumber(you.active)} live units
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-primary/10 px-2.5 py-1.5 text-xs font-medium text-primary">
            <Trophy className="size-3.5" />
            {ordinal(you.ranks.sales)} of {formatNumber(market?.totalDealers)} in sales
            {you.rankDelta !== 0 && (
              <span
                className={cn(
                  "tabular-nums",
                  you.rankDelta > 0
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-rose-600 dark:text-rose-400",
                )}
              >
                {you.rankDelta > 0 ? "▲" : "▼"}
                {Math.abs(you.rankDelta)}
              </span>
            )}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {RANK_META.map((meta) => {
            const rank = you.ranks[meta.key];
            const pct = you.percentiles[meta.key] ?? 0;
            return (
              <button
                type="button"
                key={meta.key}
                onClick={onOpenBoard}
                className="rounded-lg border bg-background/50 p-3 text-left transition-colors hover:border-primary/40 hover:bg-muted/40"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    {meta.label}
                  </span>
                  <span
                    className={cn(
                      "text-sm font-semibold tabular-nums",
                      rank && rank <= 3 ? "text-primary" : "",
                    )}
                  >
                    {ordinal(rank)}
                  </span>
                </div>
                <p className="mt-1 truncate text-[11px] text-muted-foreground">{meta.describe(you)}</p>
                <ProgressMeter
                  className="mt-2"
                  value={pct}
                  tone={pct >= 66 ? "primary" : pct >= 33 ? "warn" : "danger"}
                />
                <p className="mt-1 text-[10px] text-muted-foreground">
                  Ahead of {formatPercent(pct)} of dealers
                </p>
              </button>
            );
          })}

          <div className="rounded-lg border bg-background/50 p-3">
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Versus market
            </span>
            <dl className="mt-2 space-y-1.5 text-xs">
              <div className="flex items-center justify-between gap-2">
                <dt className="text-muted-foreground">List price</dt>
                <dd className="flex items-center gap-1.5 tabular-nums">
                  {formatCurrency(you.avgPrice, true)}
                  <Delta value={you.vsMarket.avgPrice} suffix="" />
                </dd>
              </div>
              <div className="flex items-center justify-between gap-2">
                <dt className="text-muted-foreground">Days on lot</dt>
                <dd className="flex items-center gap-1.5 tabular-nums">
                  {formatNumber(you.avgDaysOnLot)}d
                  <Delta value={you.vsMarket.avgDaysOnLot} suffix="d" invert />
                </dd>
              </div>
              <div className="flex items-center justify-between gap-2">
                <dt className="text-muted-foreground">Sell-through</dt>
                <dd className="flex items-center gap-1.5 tabular-nums">
                  {formatPercent(you.sellThrough, 1)}
                  <Delta value={you.vsMarket.sellThrough} />
                </dd>
              </div>
              <div className="flex items-center justify-between gap-2">
                <dt className="text-muted-foreground">Momentum</dt>
                <dd>
                  <Delta value={you.momentum} />
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </Panel>

      <Panel className="relative overflow-hidden p-4">
        <div className="mb-3 flex items-center gap-2">
          <Lock className="size-3.5 text-primary" />
          <p className="text-sm font-semibold">Private to your store</p>
        </div>
        <p className="mb-4 text-[11px] text-muted-foreground">
          Cost and gross never leave your store. Competitors only see public listing data.
        </p>
        <dl className="space-y-3">
          <div>
            <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Average front gross
            </dt>
            <dd className="text-xl font-semibold tabular-nums">
              {formatCurrency(privateMetrics?.avgGross)}
            </dd>
            <p className="text-[11px] text-muted-foreground">
              from {formatNumber(privateMetrics?.unitsWithCost)} costed sales
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Inventory cost
              </dt>
              <dd className="text-sm font-semibold tabular-nums">
                {formatCurrency(privateMetrics?.costBasis, true)}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Retail value
              </dt>
              <dd className="text-sm font-semibold tabular-nums">
                {formatCurrency(privateMetrics?.retailValue, true)}
              </dd>
            </div>
          </div>
          <div className="rounded-lg bg-primary/5 p-3">
            <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Gross on the ground
            </dt>
            <dd className="text-lg font-semibold tabular-nums text-primary">
              {formatCurrency(privateMetrics?.potentialGross, true)}
            </dd>
            <p className="text-[11px] text-muted-foreground">
              Retail value less cost across live inventory
            </p>
          </div>
        </dl>
      </Panel>
    </div>
  );
}
