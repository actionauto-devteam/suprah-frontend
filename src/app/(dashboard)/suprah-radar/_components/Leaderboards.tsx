"use client";

import * as React from "react";
import { Award, Flame, Gauge, Sparkles, Timer, Trophy } from "lucide-react";

import { cn } from "@/lib/utils";
import type { LeaderboardBoard, RankKey } from "@/types/suprah-radar";
import { EmptyState, formatNumber, LoadingRows, Panel, RankBadge } from "./shared";

const BOARD_META: Record<RankKey, { icon: typeof Trophy; tone: string }> = {
  sales: { icon: Trophy, tone: "text-amber-500" },
  acquisitions: { icon: Sparkles, tone: "text-violet-500" },
  turn: { icon: Timer, tone: "text-emerald-500" },
  freshness: { icon: Flame, tone: "text-orange-500" },
  sellThrough: { icon: Gauge, tone: "text-blue-500" },
};

function formatValue(value: number, unit: string) {
  if (unit === "%") return `${formatNumber(value, false)}%`;
  if (unit === "days") return `${formatNumber(value)} d`;
  return formatNumber(value, true);
}

function BoardCard({
  board,
  boardKey,
  onSelect,
}: {
  board: LeaderboardBoard;
  boardKey: RankKey;
  onSelect: (id: string) => void;
}) {
  const meta = BOARD_META[boardKey];
  const Icon = meta.icon;

  return (
    <Panel className="flex flex-col overflow-hidden">
      <div className="flex items-start justify-between gap-2 border-b px-4 py-3">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-sm font-semibold">
            <Icon className={cn("size-4 shrink-0", meta.tone)} />
            <span className="truncate">{board.label}</span>
          </p>
          <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
            {board.hint}
            {board.total ? ` · ${formatNumber(board.total)} ranked` : ""}
          </p>
        </div>
      </div>

      {board.rows.length === 0 ? (
        <div className="px-4 py-6">
          <p className="text-center text-xs text-muted-foreground">
            Nothing ranked yet.
          </p>
        </div>
      ) : (
        <ul className="divide-y">
          {board.rows.map((row) => (
            <li key={row.id}>
              <button
                type="button"
                onClick={() => onSelect(row.id)}
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
                  <p className="text-xs font-semibold tabular-nums sm:text-sm">
                    {formatValue(row.value, board.unit)}
                  </p>
                  {boardKey === "sales" && !!row.rankDelta && (
                    <p
                      className={cn(
                        "text-[10px] font-medium tabular-nums",
                        row.rankDelta > 0
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-rose-600 dark:text-rose-400",
                      )}
                    >
                      {row.rankDelta > 0 ? "▲" : "▼"}
                      {Math.abs(row.rankDelta)}
                    </p>
                  )}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

export function Leaderboards({
  boards,
  loading,
  onSelectDealer,
  order = ["sales", "acquisitions", "turn", "freshness", "sellThrough"],
}: {
  boards?: Record<RankKey, LeaderboardBoard>;
  loading?: boolean;
  onSelectDealer: (id: string) => void;
  order?: RankKey[];
}) {
  if (loading) {
    return (
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Panel key={i} className="p-4">
            <LoadingRows rows={6} height="h-8" />
          </Panel>
        ))}
      </div>
    );
  }

  if (!boards) {
    return (
      <EmptyState
        icon={Award}
        title="No leaderboard data"
        description="Appears once dealerships list or sell."
      />
    );
  }

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {order.map((key) =>
        boards[key] ? (
          <BoardCard key={key} boardKey={key} board={boards[key]} onSelect={onSelectDealer} />
        ) : null,
      )}
    </div>
  );
}
