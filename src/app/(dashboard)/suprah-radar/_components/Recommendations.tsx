"use client";

import * as React from "react";
import { AlertTriangle, ShoppingCart } from "lucide-react";

import { cn } from "@/lib/utils";
import type { Recommendation, RecommendationsResponse } from "@/types/suprah-radar";
import { EmptyState, formatCurrency, formatNumber, LoadingRows, Panel } from "./shared";

function RecommendationTable({
  title,
  hint,
  tone,
  icon: Icon,
  rows,
  emptyLabel,
  onSelectModel,
}: {
  title: string;
  hint: string;
  tone: string;
  icon: typeof ShoppingCart;
  rows: Recommendation[];
  emptyLabel: string;
  onSelectModel: (target: { make: string; model: string }) => void;
}) {
  return (
    <Panel className="overflow-hidden">
      <div className="border-b px-4 py-3">
        <p className="flex items-center gap-1.5 text-sm font-semibold">
          <Icon className={cn("size-4 shrink-0", tone)} />
          {title}
          <span className="ml-auto rounded-md bg-muted px-1.5 py-0.5 text-[11px] tabular-nums text-muted-foreground">
            {rows.length}
          </span>
        </p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p>
      </div>

      {rows.length === 0 ? (
        <p className="px-4 py-8 text-center text-xs text-muted-foreground">{emptyLabel}</p>
      ) : (
        <>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-160 text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="w-56 px-4 py-2 text-left font-medium">Vehicle</th>
                  <th className="px-4 py-2 text-left font-medium">Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.map((row) => (
                  <tr
                    key={row.id}
                    onClick={() => onSelectModel({ make: row.make, model: row.model })}
                    className="cursor-pointer align-top transition-colors hover:bg-muted/40"
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium">
                        {row.year} {row.make} {row.model}
                      </p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        {formatNumber(row.active)} in stock · {formatCurrency(row.avgPrice, true)} avg
                      </p>
                    </td>
                    <td className="px-4 py-3 text-[13px] text-muted-foreground">{row.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="divide-y md:hidden">
            {rows.map((row) => (
              <li
                key={row.id}
                onClick={() => onSelectModel({ make: row.make, model: row.model })}
                className="cursor-pointer space-y-1 p-3"
              >
                <p className="text-sm font-medium">
                  {row.year} {row.make} {row.model}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {formatNumber(row.active)} in stock · {formatCurrency(row.avgPrice, true)} avg
                </p>
                <p className="text-xs text-muted-foreground">{row.reason}</p>
              </li>
            ))}
          </ul>
        </>
      )}
    </Panel>
  );
}

export function Recommendations({
  data,
  loading,
  onSelectModel,
}: {
  data?: RecommendationsResponse;
  loading?: boolean;
  onSelectModel: (target: { make: string; model: string }) => void;
}) {
  if (loading) {
    return (
      <div className="space-y-3">
        <Panel className="p-4">
          <LoadingRows rows={5} height="h-12" />
        </Panel>
        <Panel className="p-4">
          <LoadingRows rows={4} height="h-12" />
        </Panel>
      </div>
    );
  }

  if (!data) {
    return (
      <EmptyState
        icon={ShoppingCart}
        title="No recommendations yet"
        description="From your own inventory and sales."
      />
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Last {data.days} days of your own data, checked against live market demand.
      </p>
      <RecommendationTable
        title="Vehicles to buy"
        hint="Proven in your own sales"
        tone="text-emerald-500"
        icon={ShoppingCart}
        rows={data.buy}
        onSelectModel={onSelectModel}
        emptyLabel="Not enough sales history yet."
      />
      <RecommendationTable
        title="Watch with caution"
        hint="Aging past the market turn time"
        tone="text-amber-500"
        icon={AlertTriangle}
        rows={data.caution}
        onSelectModel={onSelectModel}
        emptyLabel="Nothing is aging past the benchmark."
      />
    </div>
  );
}
