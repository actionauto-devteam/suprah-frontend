"use client";

import * as React from "react";
import { ArrowDownRight, ArrowUpRight, PackagePlus, Radio } from "lucide-react";

import { cn } from "@/lib/utils";
import type { MarketSignal } from "@/types/suprah-radar";
import { EmptyState, formatNumber, LoadingRows, Panel } from "./shared";

type Group = "gainer" | "decliner" | "stocking";

const GROUPS: { key: Group; label: string; icon: typeof Radio; tone: string }[] = [
  { key: "gainer", label: "Selling more", icon: ArrowUpRight, tone: "text-emerald-500" },
  { key: "decliner", label: "Selling less", icon: ArrowDownRight, tone: "text-rose-500" },
  { key: "stocking", label: "Stocking up", icon: PackagePlus, tone: "text-blue-500" },
];

export function MarketSignals({
  signals,
  loading,
  onSelectDealer,
}: {
  signals?: MarketSignal[];
  loading?: boolean;
  onSelectDealer: (id: string) => void;
}) {
  if (loading) {
    return (
      <div className="grid gap-3 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Panel key={i} className="p-4">
            <LoadingRows rows={4} height="h-9" />
          </Panel>
        ))}
      </div>
    );
  }

  if (!signals?.length) {
    return (
      <EmptyState
        icon={Radio}
        title="No movement yet"
        description="Appears when dealers gain or lose sales."
      />
    );
  }

  return (
    <div className="grid gap-3 lg:grid-cols-3">
      {GROUPS.map((group) => {
        const rows = signals.filter((s) => s.kind === group.key);
        return (
          <Panel key={group.key} className="overflow-hidden">
            <div className="border-b px-4 py-2.5">
              <p className="flex items-center gap-1.5 text-sm font-semibold">
                <group.icon className={cn("size-4 shrink-0", group.tone)} />
                {group.label}
              </p>
            </div>
            {rows.length === 0 ? (
              <p className="px-4 py-6 text-center text-xs text-muted-foreground">Nothing to flag.</p>
            ) : (
              <ul className="divide-y">
                {rows.map((signal) => (
                  <li key={signal.id}>
                    <button
                      type="button"
                      onClick={() => onSelectDealer(signal.dealerId)}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-muted/60 sm:px-4"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-medium">{signal.dealer}</span>
                        <span className="block truncate text-[11px] text-muted-foreground">
                          {signal.detail}
                        </span>
                      </span>
                      <span
                        className={cn(
                          "shrink-0 text-[13px] font-semibold tabular-nums",
                          group.key === "decliner"
                            ? "text-rose-600 dark:text-rose-400"
                            : "text-emerald-600 dark:text-emerald-400",
                        )}
                      >
                        {signal.change > 0 ? "+" : ""}
                        {formatNumber(signal.change)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        );
      })}
    </div>
  );
}
