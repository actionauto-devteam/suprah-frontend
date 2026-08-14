"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight, Coins, Car, Timer, Trophy } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useDealerPerformance, type MarketFilters } from "@/hooks/useSuprahRadar";
import type { PerformanceBoardKey } from "@/types/suprah-radar";
import {
  Delta,
  formatCurrency,
  formatNumber,
  LoadingRows,
  ordinal,
  Panel,
  RankBadge,
} from "./shared";

const BOARDS: { key: PerformanceBoardKey; icon: typeof Trophy; tone: string }[] = [
  { key: "active", icon: Trophy, tone: "text-amber-500" },
  { key: "turn", icon: Timer, tone: "text-emerald-500" },
  { key: "value", icon: Coins, tone: "text-violet-500" },
  { key: "cars", icon: Car, tone: "text-blue-500" },
];

function formatBoardValue(value: number, unit: string) {
  if (unit === "currency") return formatCurrency(value, true);
  if (unit === "days") return `${formatNumber(value)} days`;
  if (unit === "sold") return `${formatNumber(value, true)} sold`;
  return formatNumber(value, true);
}

function BoardCard({
  boardKey,
  icon: Icon,
  tone,
  filters,
  competitorsOnly,
  onSelectDealer,
}: {
  boardKey: PerformanceBoardKey;
  icon: typeof Trophy;
  tone: string;
  filters: MarketFilters;
  competitorsOnly: boolean;
  onSelectDealer: (id: string) => void;
}) {
  const [page, setPage] = React.useState(1);
  const { data, isLoading } = useDealerPerformance(
    filters,
    boardKey,
    page,
    competitorsOnly,
  );

  React.useEffect(() => {
    setPage(1);
  }, [filters, competitorsOnly]);

  const totalPages = data?.totalPages ?? 1;
  const current = data?.page ?? page;

  return (
    <Panel className="flex flex-col overflow-hidden">
      <div className="flex items-start justify-between gap-2 border-b px-4 py-3">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-sm font-semibold">
            <Icon className={cn("size-4 shrink-0", tone)} />
            <span className="truncate">{data?.label ?? "Loading"}</span>
          </p>
          <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
            {data?.hint ?? ""}
            {data?.total ? ` · ${formatNumber(data.total)} ranked` : ""}
          </p>
        </div>
        {data?.yourRank && (
          <span className="shrink-0 rounded-md bg-primary/10 px-2 py-1 text-[11px] font-semibold text-primary">
            You: {ordinal(data.yourRank)}
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="p-3">
          <LoadingRows rows={10} height="h-8" />
        </div>
      ) : !data?.rows.length ? (
        <p className="px-4 py-8 text-center text-xs text-muted-foreground">
          Nothing ranked yet.
        </p>
      ) : (
        <ul className="divide-y">
          {data.rows.map((row) => (
            <li key={row.id}>
              <button
                type="button"
                onClick={() => onSelectDealer(row.id)}
                className={cn(
                  "flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-muted/60 sm:px-4",
                  row.isYou && "bg-primary/5",
                )}
              >
                <RankBadge rank={row.rank} isYou={row.isYou} />
                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      "truncate text-xs font-medium sm:text-[13px]",
                      row.isYou && "text-primary",
                    )}
                  >
                    {row.name}
                    {row.isYou && <span className="ml-1.5 text-[10px] uppercase">you</span>}
                  </p>
                  <p className="truncate text-[10px] text-muted-foreground">
                    {row.hasListings
                      ? [row.city, row.state].filter(Boolean).join(", ") || "—"
                      : "No listings"}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-xs font-semibold tabular-nums sm:text-[13px]">
                    {formatBoardValue(row.value, data.unit)}
                  </p>
                  {boardKey === "active" && <Delta value={row.momentum} className="text-[10px]" />}
                </div>
              </button>
            </li>
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
            disabled={current <= 1}
            aria-label="Previous page"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <span className="text-[11px] tabular-nums text-muted-foreground">
            {current} / {totalPages}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={current >= totalPages}
            aria-label="Next page"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      )}
    </Panel>
  );
}

export function PerformanceBoards({
  filters,
  competitorsOnly,
  onSelectDealer,
}: {
  filters: MarketFilters;
  competitorsOnly: boolean;
  onSelectDealer: (id: string) => void;
}) {
  return (
    <div className="grid gap-3 xl:grid-cols-2">
      {BOARDS.map((board) => (
        <BoardCard
          key={board.key}
          boardKey={board.key}
          icon={board.icon}
          tone={board.tone}
          filters={filters}
          competitorsOnly={competitorsOnly}
          onSelectDealer={onSelectDealer}
        />
      ))}
    </div>
  );
}
