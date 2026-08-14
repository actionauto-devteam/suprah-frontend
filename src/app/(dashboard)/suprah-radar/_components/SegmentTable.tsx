"use client";

import * as React from "react";
import { ArrowUpDown, Boxes, Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { Segment } from "@/types/suprah-radar";
import {
  EmptyState,
  formatCurrency,
  formatNumber,
  formatPercent,
  LoadingRows,
  Panel,
} from "./shared";

type SortKey = "sold" | "active" | "avgDaysToSell" | "avgPrice" | "demandIndex";

const COLUMNS: { key: SortKey; label: string; align: string }[] = [
  { key: "active", label: "Live supply", align: "text-right" },
  { key: "sold", label: "Sold", align: "text-right" },
  { key: "demandIndex", label: "Demand", align: "text-right" },
  { key: "avgDaysToSell", label: "Days to sell", align: "text-right" },
  { key: "avgPrice", label: "Avg price", align: "text-right" },
];

function TemperatureBadge({ temperature }: { temperature: Segment["temperature"] }) {
  const map = {
    hot: { label: "Hot", cls: "bg-rose-500/12 text-rose-600 dark:text-rose-400" },
    balanced: { label: "Balanced", cls: "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400" },
    cold: { label: "Oversupplied", cls: "bg-slate-500/12 text-slate-600 dark:text-slate-300" },
  }[temperature];
  return (
    <span className={cn("rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide", map.cls)}>
      {map.label}
    </span>
  );
}

export function SegmentTable({
  segments,
  loading,
  onSelectModel,
}: {
  segments?: Segment[];
  loading?: boolean;
  onSelectModel: (target: { make: string; model: string }) => void;
}) {
  const [query, setQuery] = React.useState("");
  const [sort, setSort] = React.useState<SortKey>("sold");
  const [asc, setAsc] = React.useState(false);

  const rows = React.useMemo(() => {
    const term = query.trim().toLowerCase();
    const filtered = (segments ?? []).filter(
      (s) =>
        !term ||
        `${s.make} ${s.model}`.toLowerCase().includes(term),
    );
    return [...filtered].sort((a, b) => {
      const av = Number(a[sort]) || 0;
      const bv = Number(b[sort]) || 0;
      return asc ? av - bv : bv - av;
    });
  }, [segments, query, sort, asc]);

  const toggleSort = (key: SortKey) => {
    if (key === sort) {
      setAsc((v) => !v);
      return;
    }
    setSort(key);
    setAsc(key === "avgDaysToSell");
  };

  if (loading) {
    return (
      <Panel className="p-4">
        <LoadingRows rows={8} height="h-9" />
      </Panel>
    );
  }

  if (!segments?.length) {
    return (
      <EmptyState
        icon={Boxes}
        title="No model data"
        description="Widen the scope or period."
      />
    );
  }

  return (
    <Panel className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b p-3">
        <div className="relative w-full sm:w-64">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter models…"
            className="h-9 pl-8 text-sm"
            aria-label="Filter models"
          />
        </div>
        <p className="text-[11px] text-muted-foreground">
          {rows.length} of {segments.length} model lines
        </p>
      </div>

      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-180 text-sm">
          <thead>
            <tr className="border-b bg-muted/40 text-[11px] uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-2 text-left font-medium">Model</th>
              {COLUMNS.map((col) => (
                <th key={col.key} className={cn("px-4 py-2 font-medium", col.align)}>
                  <button
                    type="button"
                    onClick={() => toggleSort(col.key)}
                    className={cn(
                      "inline-flex items-center gap-1 transition-colors hover:text-foreground",
                      sort === col.key && "text-foreground",
                    )}
                  >
                    {col.label}
                    <ArrowUpDown className="size-3" />
                  </button>
                </th>
              ))}
              <th className="px-4 py-2 text-right font-medium">You</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((s) => (
              <tr
                key={s.id}
                onClick={() => onSelectModel({ make: s.make, model: s.model })}
                className={cn(
                  "cursor-pointer transition-colors hover:bg-muted/40",
                  s.yours > 0 && "bg-primary/5",
                )}
              >
                <td className="px-4 py-2.5">
                  <p className="truncate font-medium">
                    {s.make} {s.model}
                  </p>
                  <p className="text-[11px] text-muted-foreground">{s.dealers} dealers</p>
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums">{formatNumber(s.active)}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{formatNumber(s.sold)}</td>
                <td className="px-4 py-2.5 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <span className="tabular-nums">{s.demandIndex}</span>
                    <TemperatureBadge temperature={s.temperature} />
                  </div>
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums">
                  {s.avgDaysToSell ? `${formatNumber(s.avgDaysToSell)} d` : "—"}
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums">{formatCurrency(s.avgPrice, true)}</td>
                <td className="px-4 py-2.5 text-right">
                  <span
                    className={cn(
                      "tabular-nums",
                      s.yours > 0 ? "font-semibold text-primary" : "text-muted-foreground",
                    )}
                  >
                    {s.yours}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="divide-y md:hidden">
        {rows.map((s) => (
          <li
            key={s.id}
            onClick={() => onSelectModel({ make: s.make, model: s.model })}
            className={cn("cursor-pointer space-y-2 p-3", s.yours > 0 && "bg-primary/5")}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {s.make} {s.model}
                </p>
                <p className="text-[11px] text-muted-foreground">{s.dealers} dealers</p>
              </div>
              <TemperatureBadge temperature={s.temperature} />
            </div>
            <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Supply</dt>
                <dd className="tabular-nums">{formatNumber(s.active)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Sold</dt>
                <dd className="tabular-nums">{formatNumber(s.sold)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Days to sell</dt>
                <dd className="tabular-nums">{s.avgDaysToSell ? `${formatNumber(s.avgDaysToSell)} d` : "—"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Avg price</dt>
                <dd className="tabular-nums">{formatCurrency(s.avgPrice, true)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Sell-through</dt>
                <dd className="tabular-nums">{formatPercent(s.sellThrough, 1)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">You stock</dt>
                <dd className={cn("tabular-nums", s.yours > 0 && "font-semibold text-primary")}>{s.yours}</dd>
              </div>
            </dl>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
