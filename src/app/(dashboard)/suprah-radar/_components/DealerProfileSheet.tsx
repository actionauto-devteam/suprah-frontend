"use client";

import * as React from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { ChevronRight, Star } from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  useDealerProfile,
  useToggleWatch,
  useWatchlist,
  type MarketFilters,
} from "@/hooks/useSuprahRadar";
import {
  CHART_COLORS,
  ChartTooltip,
  Delta,
  formatCurrency,
  formatNumber,
  formatPercent,
  ProgressMeter,
  useChartTheme,
} from "./shared";

const PIE_COLORS = [
  CHART_COLORS.primary,
  CHART_COLORS.market,
  CHART_COLORS.accent,
  CHART_COLORS.warn,
  "#06B6D4",
  CHART_COLORS.danger,
  "#4F46E5",
  CHART_COLORS.muted,
];

export function DealerProfileSheet({
  dealerId,
  filters,
  onOpenChange,
  onSelectModel,
}: {
  dealerId: string | null;
  filters: MarketFilters;
  onOpenChange: (open: boolean) => void;
  onSelectModel?: (target: { make: string; model: string }) => void;
}) {
  const theme = useChartTheme();
  const { data, isLoading } = useDealerProfile(dealerId, filters);
  const { data: watchlist } = useWatchlist(filters);
  const toggleWatch = useToggleWatch();

  const watched = React.useMemo(
    () => (watchlist?.watches ?? []).some((w) => String(w.targetOrganizationId) === dealerId),
    [watchlist, dealerId],
  );

  const metrics = data?.metrics;
  const totalMix = (data?.makeMix ?? []).reduce((sum, m) => sum + m.count, 0);
  const maxBand = Math.max(1, ...(data?.priceBands ?? []).map((b) => b.count));

  return (
    <Sheet open={!!dealerId} onOpenChange={onOpenChange}>
      <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-md">
        <SheetHeader className="border-b">
          <SheetTitle className="truncate pr-8">{data?.name ?? "Dealership"}</SheetTitle>
          <SheetDescription>
            {metrics
              ? `${[metrics.city, metrics.state].filter(Boolean).join(", ") || "Location unset"} · ${formatNumber(metrics.active)} live units`
              : "Public market profile"}
          </SheetDescription>
          {dealerId && !data?.isYou && (
            <Button
              variant={watched ? "secondary" : "outline"}
              size="sm"
              className="mt-2 w-fit"
              disabled={toggleWatch.isPending}
              onClick={() => toggleWatch.mutate({ dealerId, watched })}
            >
              <Star className={cn("size-3.5", watched && "fill-amber-400 text-amber-500")} />
              {watched ? "Watching" : "Watch dealership"}
            </Button>
          )}
        </SheetHeader>

        {isLoading || !data ? (
          <div className="space-y-3 p-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : (
          <div className="space-y-5 p-4">
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "Live inventory", value: formatNumber(metrics?.active) },
                { label: `Sold · ${filters.days}d`, value: formatNumber(data.period.sold) },
                { label: `Acquired · ${filters.days}d`, value: formatNumber(data.period.added) },
                { label: "Avg list price", value: formatCurrency(metrics?.avgPrice, true) },
                {
                  label: "Avg days on lot",
                  value: metrics?.avgDaysOnLot ? `${formatNumber(metrics.avgDaysOnLot)} d` : "—",
                },
                { label: "Sell-through", value: formatPercent(metrics?.sellThrough, 1) },
              ].map((tile) => (
                <div key={tile.label} className="rounded-lg border bg-card p-3">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    {tile.label}
                  </p>
                  <p className="mt-1 text-base font-semibold tabular-nums">{tile.value}</p>
                </div>
              ))}
            </div>

            <div className="rounded-lg border bg-card p-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">Sales momentum</p>
                <Delta value={metrics?.momentum ?? 0} />
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {formatNumber(metrics?.sold)} sold this period versus {formatNumber(metrics?.soldPrev)} in
                the prior one.
              </p>
              <div className="mt-3 space-y-2">
                <div>
                  <div className="flex justify-between text-[11px] text-muted-foreground">
                    <span>Fresh under 30 days</span>
                    <span className="tabular-nums">{formatPercent(metrics?.freshPct)}</span>
                  </div>
                  <ProgressMeter className="mt-1" value={metrics?.freshPct ?? 0} />
                </div>
                <div>
                  <div className="flex justify-between text-[11px] text-muted-foreground">
                    <span>Aged over 60 days</span>
                    <span className="tabular-nums">{formatPercent(metrics?.agedPct)}</span>
                  </div>
                  <ProgressMeter className="mt-1" value={metrics?.agedPct ?? 0} tone="warn" />
                </div>
              </div>
            </div>

            {data.topModels?.length > 0 && (
              <div className="rounded-lg border bg-card">
                <p className="border-b px-3 py-2 text-sm font-semibold">What they stock</p>
                <ul className="divide-y">
                  {data.topModels.map((entry) => (
                    <li key={`${entry.make}-${entry.model}`}>
                      <button
                        type="button"
                        onClick={() => onSelectModel?.({ make: entry.make, model: entry.model })}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-muted/60"
                      >
                        <span className="min-w-0 flex-1 truncate text-[13px] font-medium">
                          {entry.make} {entry.model}
                        </span>
                        <span className="shrink-0 text-[11px] text-muted-foreground">
                          {formatNumber(entry.active)} listed · {formatNumber(entry.sold)} sold
                        </span>
                        <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {data.makeMix.length > 0 && (
              <div className="rounded-lg border bg-card p-3">
                <p className="mb-2 text-sm font-semibold">Inventory mix</p>
                <div className="h-44 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data.makeMix}
                        dataKey="count"
                        nameKey="make"
                        innerRadius="52%"
                        outerRadius="82%"
                        paddingAngle={2}
                        stroke="none"
                      >
                        {data.makeMix.map((entry, index) => (
                          <Cell key={entry.make} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        content={({ active, payload }) => (
                          <ChartTooltip
                            active={active}
                            payload={payload as never}
                            label="Inventory mix"
                            theme={theme}
                            formatter={(v) => `${formatNumber(v)} units`}
                          />
                        )}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <ul className="mt-2 grid grid-cols-2 gap-1">
                  {data.makeMix.map((entry, index) => (
                    <li key={entry.make} className="flex items-center gap-1.5 text-[11px]">
                      <span
                        className="size-2 shrink-0 rounded-full"
                        style={{ background: PIE_COLORS[index % PIE_COLORS.length] }}
                      />
                      <span className="truncate">{entry.make}</span>
                      <span className="ml-auto tabular-nums text-muted-foreground">
                        {totalMix ? formatPercent((entry.count / totalMix) * 100) : "—"}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {data.priceBands.length > 0 && (
              <div className="rounded-lg border bg-card p-3">
                <p className="mb-3 text-sm font-semibold">Price bands</p>
                <ul className="space-y-2">
                  {data.priceBands.map((band) => (
                    <li key={band.label} className="space-y-1">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-muted-foreground">{band.label}</span>
                        <span className="tabular-nums">{formatNumber(band.count)}</span>
                      </div>
                      <ProgressMeter value={(band.count / maxBand) * 100} tone="market" />
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <p className="text-[11px] text-muted-foreground">
              Public listing data only. Cost, gross and customer data are never shared between
              dealerships.
            </p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
