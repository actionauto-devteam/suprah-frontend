"use client";

import * as React from "react";
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChevronLeft, ChevronRight, TrendingDown, TrendingUp } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { SupplyEntry, SupplyResponse } from "@/types/suprah-radar";
import {
  CHART_COLORS,
  ChartTooltip,
  EmptyState,
  formatNumber,
  LoadingRows,
  Panel,
  useChartTheme,
} from "./shared";

const PAGE_SIZE = 5;

function SupplyRow({
  entry,
  tone,
  onSelectModel,
}: {
  entry: SupplyEntry;
  tone: "low" | "high";
  onSelectModel: (target: { make: string; model: string }) => void;
}) {
  const theme = useChartTheme();
  const color = tone === "low" ? CHART_COLORS.primary : CHART_COLORS.danger;

  return (
    <li className="flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-center sm:gap-4 sm:px-4">
      <button
        type="button"
        onClick={() => onSelectModel({ make: entry.make, model: entry.model })}
        className="min-w-0 text-left transition-colors hover:text-primary sm:w-52"
      >
        <p className="truncate text-[13px] font-medium">
          {entry.make} {entry.model}
        </p>
        <p className="text-[11px] text-muted-foreground">
          Currently {formatNumber(entry.current)}, usually {formatNumber(entry.usual)}
          {entry.yours > 0 && <span className="ml-1 text-primary">· you hold {entry.yours}</span>}
        </p>
      </button>
      <div className="h-16 min-w-0 flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={entry.series} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
            <XAxis
              dataKey="label"
              stroke={theme.axis}
              fontSize={9}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
              minTickGap={8}
            />
            <YAxis stroke={theme.axis} fontSize={9} tickLine={false} axisLine={false} width={34} />
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
            <Bar dataKey="value" name="Listed" radius={[2, 2, 0, 0]}>
              {entry.series.map((_, i) => (
                <Cell key={i} fill={color} fillOpacity={i === entry.series.length - 1 ? 1 : 0.55} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <span
        className={cn(
          "shrink-0 self-start rounded-md px-1.5 py-0.5 text-[11px] font-semibold tabular-nums sm:self-center",
          tone === "low"
            ? "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400"
            : "bg-rose-500/12 text-rose-600 dark:text-rose-400",
        )}
      >
        {entry.changePct > 0 ? "+" : ""}
        {entry.changePct}%
      </span>
    </li>
  );
}

function SupplyPanel({
  title,
  hint,
  entries,
  tone,
  icon: Icon,
  onSelectModel,
}: {
  title: string;
  hint: string;
  entries: SupplyEntry[];
  tone: "low" | "high";
  icon: typeof TrendingDown;
  onSelectModel: (target: { make: string; model: string }) => void;
}) {
  const [page, setPage] = React.useState(1);
  const totalPages = Math.max(1, Math.ceil(entries.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const rows = entries.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <Panel className="flex flex-col overflow-hidden">
      <div className="border-b px-4 py-3">
        <p className="flex items-center gap-1.5 text-sm font-semibold">
          <Icon
            className={cn(
              "size-4 shrink-0",
              tone === "low" ? "text-emerald-500" : "text-rose-500",
            )}
          />
          {title}
        </p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p>
      </div>

      {rows.length === 0 ? (
        <p className="px-4 py-8 text-center text-xs text-muted-foreground">
          No models are meaningfully off their usual level right now.
        </p>
      ) : (
        <ul className="divide-y">
          {rows.map((entry) => (
            <SupplyRow key={entry.id} entry={entry} tone={tone} onSelectModel={onSelectModel} />
          ))}
        </ul>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 border-t px-4 py-2">
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={safePage === 1}
            aria-label="Previous page"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <span className="text-[11px] tabular-nums text-muted-foreground">
            {safePage} / {totalPages}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={safePage === totalPages}
            aria-label="Next page"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      )}
    </Panel>
  );
}

export function SupplyBoards({
  data,
  loading,
  onSelectModel,
}: {
  data?: SupplyResponse;
  loading?: boolean;
  onSelectModel: (target: { make: string; model: string }) => void;
}) {
  if (loading) {
    return (
      <div className="grid gap-3 xl:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <Panel key={i} className="p-4">
            <LoadingRows rows={5} height="h-16" />
          </Panel>
        ))}
      </div>
    );
  }

  if (!data || (!data.low.length && !data.high.length)) {
    return (
      <EmptyState
        icon={TrendingDown}
        title="Not enough history yet"
        description="Measured against each model weekly average."
      />
    );
  }

  return (
    <div className="grid gap-3 xl:grid-cols-2">
      <SupplyPanel
        title="Current low supply"
        hint="Below the usual count for this market"
        entries={data.low}
        tone="low"
        icon={TrendingDown}
        onSelectModel={onSelectModel}
      />
      <SupplyPanel
        title="Current high supply"
        hint="Above the usual count for this market"
        entries={data.high}
        tone="high"
        icon={TrendingUp}
        onSelectModel={onSelectModel}
      />
    </div>
  );
}
