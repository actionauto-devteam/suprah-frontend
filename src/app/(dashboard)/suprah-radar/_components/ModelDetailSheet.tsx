"use client";

import * as React from "react";
import Link from "next/link";
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChevronRight, ExternalLink } from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useModelDetail, type MarketFilters } from "@/hooks/useSuprahRadar";
import {
  CHART_COLORS,
  ChartTooltip,
  formatCurrency,
  formatNumber,
  formatPercent,
  ProgressMeter,
  useChartTheme,
} from "./shared";

export interface ModelTarget {
  make: string;
  model: string;
}

export function ModelDetailSheet({
  target,
  filters,
  onOpenChange,
  onSelectDealer,
}: {
  target: ModelTarget | null;
  filters: MarketFilters;
  onOpenChange: (open: boolean) => void;
  onSelectDealer: (id: string) => void;
}) {
  const theme = useChartTheme();
  const { data, isLoading } = useModelDetail(target, filters);

  const maxBand = Math.max(1, ...(data?.priceBands ?? []).map((b) => b.count));
  const summary = data?.summary;

  return (
    <Sheet open={!!target} onOpenChange={onOpenChange}>
      <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-lg">
        <SheetHeader className="border-b">
          <SheetTitle className="truncate pr-8">
            {data ? `${data.make} ${data.model}` : `${target?.make ?? ""} ${target?.model ?? ""}`}
          </SheetTitle>
          <SheetDescription>
            {summary
              ? `${formatNumber(summary.dealers)} dealers · ${filters.days}-day window`
              : "Model breakdown"}
          </SheetDescription>
        </SheetHeader>

        {isLoading || !data ? (
          <div className="space-y-3 p-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : (
          <div className="space-y-5 p-4">
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "Listed", value: formatNumber(summary?.active) },
                { label: "Sold", value: formatNumber(summary?.sold) },
                { label: "Avg price", value: formatCurrency(summary?.avgPrice, true) },
                {
                  label: "Days to sell",
                  value: summary?.avgDaysToSell ? `${formatNumber(summary.avgDaysToSell)} d` : "—",
                },
                { label: "Sell-through", value: formatPercent(summary?.sellThrough, 1) },
                {
                  label: "Avg mileage",
                  value: summary?.avgMileage ? `${formatNumber(summary.avgMileage, true)} mi` : "—",
                },
              ].map((tile) => (
                <div key={tile.label} className="rounded-lg border bg-card p-3">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    {tile.label}
                  </p>
                  <p className="mt-1 text-base font-semibold tabular-nums">{tile.value}</p>
                </div>
              ))}
            </div>

            <div className="rounded-lg bg-primary/5 p-3">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Your position
              </p>
              <p className="mt-1 text-sm">
                <span className="font-semibold tabular-nums">{formatNumber(summary?.yours)}</span> in
                stock ·{" "}
                <span className="font-semibold tabular-nums">{formatNumber(summary?.yoursSold)}</span>{" "}
                sold this window
              </p>
            </div>

            {data.supplySeries.length > 0 && (
              <div className="rounded-lg border bg-card p-3">
                <p className="mb-2 text-sm font-semibold">Market supply</p>
                <div className="h-32 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.supplySeries} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                      <XAxis
                        dataKey="label"
                        stroke={theme.axis}
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis stroke={theme.axis} fontSize={10} tickLine={false} axisLine={false} width={34} />
                      <Tooltip
                        cursor={{ fill: theme.cursor }}
                        content={({ active, payload, label }) => (
                          <ChartTooltip
                            active={active}
                            payload={payload as never}
                            label={label as string}
                            theme={theme}
                            formatter={(v) => `${formatNumber(v)} listed`}
                          />
                        )}
                      />
                      <Bar dataKey="value" name="Listed" radius={[3, 3, 0, 0]}>
                        {data.supplySeries.map((_, i) => (
                          <Cell
                            key={i}
                            fill={CHART_COLORS.market}
                            fillOpacity={i === data.supplySeries.length - 1 ? 1 : 0.5}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {data.topDealers.length > 0 && (
              <div className="rounded-lg border bg-card">
                <p className="border-b px-3 py-2 text-sm font-semibold">Who stocks it</p>
                <ul className="divide-y">
                  {data.topDealers.map((dealer) => (
                    <li key={dealer.id}>
                      <button
                        type="button"
                        onClick={() => onSelectDealer(dealer.id)}
                        className={cn(
                          "flex w-full items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-muted/60",
                          dealer.isYou && "bg-primary/5",
                        )}
                      >
                        <span className="min-w-0 flex-1">
                          <span
                            className={cn(
                              "block truncate text-[13px] font-medium",
                              dealer.isYou && "text-primary",
                            )}
                          >
                            {dealer.name}
                          </span>
                          <span className="block text-[11px] text-muted-foreground">
                            {formatNumber(dealer.active)} listed · {formatNumber(dealer.sold)} sold
                          </span>
                        </span>
                        <span className="shrink-0 text-[13px] tabular-nums">
                          {formatCurrency(dealer.avgPrice, true)}
                        </span>
                        <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {data.byYear.length > 0 && (
              <div className="rounded-lg border bg-card">
                <p className="border-b px-3 py-2 text-sm font-semibold">By model year</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b bg-muted/40 text-[10px] uppercase tracking-wider text-muted-foreground">
                        <th className="px-3 py-1.5 text-left font-medium">Year</th>
                        <th className="px-3 py-1.5 text-right font-medium">Listed</th>
                        <th className="px-3 py-1.5 text-right font-medium">Sold</th>
                        <th className="px-3 py-1.5 text-right font-medium">Avg price</th>
                        <th className="px-3 py-1.5 text-right font-medium">You</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {data.byYear.map((row) => (
                        <tr key={row.year} className={cn(row.yours > 0 && "bg-primary/5")}>
                          <td className="px-3 py-1.5 font-medium">{row.year}</td>
                          <td className="px-3 py-1.5 text-right tabular-nums">
                            {formatNumber(row.active)}
                          </td>
                          <td className="px-3 py-1.5 text-right tabular-nums">
                            {formatNumber(row.sold)}
                          </td>
                          <td className="px-3 py-1.5 text-right tabular-nums">
                            {formatCurrency(row.avgPrice, true)}
                          </td>
                          <td
                            className={cn(
                              "px-3 py-1.5 text-right tabular-nums",
                              row.yours > 0 ? "font-semibold text-primary" : "text-muted-foreground",
                            )}
                          >
                            {row.yours}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
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

            {data.yourUnits.length > 0 && (
              <div className="rounded-lg border bg-card">
                <p className="border-b px-3 py-2 text-sm font-semibold">Your units</p>
                <ul className="divide-y">
                  {data.yourUnits.map((unit) => (
                    <li key={unit.id}>
                      <Link
                        href={`/inventory?search=${encodeURIComponent(unit.vin)}`}
                        className="flex items-center gap-2 px-3 py-2 transition-colors hover:bg-muted/60"
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13px] font-medium">
                            {unit.year} {unit.trim || data.model}
                          </span>
                          <span className="block text-[11px] text-muted-foreground">
                            {formatCurrency(unit.price, true)} ·{" "}
                            {formatNumber(unit.mileage, true)} mi · {formatNumber(unit.ageDays)} d
                          </span>
                        </span>
                        <ExternalLink className="size-3.5 shrink-0 text-muted-foreground" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
