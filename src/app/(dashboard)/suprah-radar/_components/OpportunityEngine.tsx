"use client";

import * as React from "react";
import Link from "next/link";
import { Clock4, Lightbulb, ShoppingCart, Tag } from "lucide-react";

import { cn } from "@/lib/utils";
import type {
  AcquireOpportunity,
  AgedOpportunity,
  OpportunitiesResponse,
  RepriceOpportunity,
} from "@/types/suprah-radar";
import { EmptyState, formatCurrency, formatNumber, LoadingRows, Panel } from "./shared";

type ModelTarget = { make: string; model: string };

function Column({
  title,
  subtitle,
  icon: Icon,
  tone,
  count,
  children,
}: {
  title: string;
  subtitle: string;
  icon: typeof Tag;
  tone: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <Panel className="flex flex-col overflow-hidden">
      <div className="border-b px-4 py-3">
        <p className="flex items-center gap-1.5 text-sm font-semibold">
          <Icon className={cn("size-4 shrink-0", tone)} />
          <span className="truncate">{title}</span>
          <span className="ml-auto rounded-md bg-muted px-1.5 py-0.5 text-[11px] tabular-nums text-muted-foreground">
            {count}
          </span>
        </p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">{subtitle}</p>
      </div>
      <div className="flex-1">{children}</div>
    </Panel>
  );
}

function AcquireRow({
  item,
  onSelectModel,
}: {
  item: AcquireOpportunity;
  onSelectModel: (target: ModelTarget) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelectModel({ make: item.make, model: item.model })}
      className="flex w-full items-start justify-between gap-3 px-4 py-2.5 text-left transition-colors hover:bg-muted/60"
    >
      <span className="min-w-0">
        <span className="block truncate text-[13px] font-medium">
          {item.make} {item.model}
        </span>
        <span className="block text-[11px] text-muted-foreground">
          {formatNumber(item.sold)} sold · {formatNumber(item.active)} listed ·{" "}
          {item.avgDaysToSell ? `${formatNumber(item.avgDaysToSell)}d turn` : "turn n/a"}
        </span>
      </span>
      <span className="shrink-0 text-right">
        <span className="block text-[13px] font-semibold tabular-nums">
          {formatCurrency(item.avgPrice, true)}
        </span>
        <span
          className={cn(
            "block text-[10px] font-medium uppercase tracking-wide",
            item.yours === 0 ? "text-rose-600 dark:text-rose-400" : "text-muted-foreground",
          )}
        >
          {item.yours === 0 ? "gap in stock" : `you hold ${item.yours}`}
        </span>
      </span>
    </button>
  );
}

function RepriceRow({ item }: { item: RepriceOpportunity }) {
  const above = item.direction === "above";
  return (
    <Link
      href={`/inventory?search=${encodeURIComponent(item.vin)}`}
      className="flex items-start justify-between gap-3 px-4 py-2.5 transition-colors hover:bg-muted/60"
    >
      <div className="min-w-0">
        <p className="truncate text-[13px] font-medium">
          {item.year} {item.make} {item.model}
        </p>
        <p className="text-[11px] text-muted-foreground">
          {formatCurrency(item.yourPrice)} vs {formatCurrency(item.marketPrice)} market ·{" "}
          {item.cohort} comps
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p
          className={cn(
            "text-[13px] font-semibold tabular-nums",
            above ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400",
          )}
        >
          {above ? "+" : ""}
          {item.gapPct}%
        </p>
        <p className="text-[10px] text-muted-foreground">
          target {formatCurrency(item.suggestedPrice, true)}
        </p>
      </div>
    </Link>
  );
}

function AgedRow({ item }: { item: AgedOpportunity }) {
  return (
    <Link
      href={`/inventory?search=${encodeURIComponent(item.vin)}`}
      className="flex items-start justify-between gap-3 px-4 py-2.5 transition-colors hover:bg-muted/60"
    >
      <div className="min-w-0">
        <p className="truncate text-[13px] font-medium">
          {item.year} {item.make} {item.model}
        </p>
        <p className="text-[11px] text-muted-foreground">
          {formatCurrency(item.yourPrice, true)} · market turns in {formatNumber(item.marketTurn)}d
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-[13px] font-semibold tabular-nums text-amber-600 dark:text-amber-400">
          {formatNumber(item.ageDays)}d
        </p>
        <p className="text-[10px] text-muted-foreground">+{formatNumber(item.overBy)}d over</p>
      </div>
    </Link>
  );
}

export function OpportunityEngine({
  data,
  loading,
  onSelectModel,
}: {
  data?: OpportunitiesResponse;
  loading?: boolean;
  onSelectModel: (target: ModelTarget) => void;
}) {
  if (loading) {
    return (
      <div className="grid gap-3 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Panel key={i} className="p-4">
            <LoadingRows rows={5} height="h-11" />
          </Panel>
        ))}
      </div>
    );
  }

  if (!data) {
    return (
      <EmptyState
        icon={Lightbulb}
        title="No recommendations yet"
        description="Needs live inventory in scope."
      />
    );
  }

  const empty = (label: string) => (
    <p className="px-4 py-6 text-center text-xs text-muted-foreground">{label}</p>
  );

  return (
    <div className="grid gap-3 lg:grid-cols-3">
      <Column
        title="Buy next"
        subtitle="High demand, you are light"
        icon={ShoppingCart}
        tone="text-emerald-500"
        count={data.acquire.length}
      >
        {data.acquire.length ? (
          <div className="divide-y">
            {data.acquire.map((item) => (
              <AcquireRow key={item.id} item={item} onSelectModel={onSelectModel} />
            ))}
          </div>
        ) : (
          empty("No clear gaps in this market.")
        )}
      </Column>

      <Column
        title="Reprice"
        subtitle="Off the market band"
        icon={Tag}
        tone="text-violet-500"
        count={data.reprice.length}
      >
        {data.reprice.length ? (
          <div className="divide-y">
            {data.reprice.map((item) => (
              <RepriceRow key={item.id} item={item} />
            ))}
          </div>
        ) : (
          empty("Everything is inside the market band.")
        )}
      </Column>

      <Column
        title="Age alerts"
        subtitle="Past the market turn time"
        icon={Clock4}
        tone="text-amber-500"
        count={data.aged.length}
      >
        {data.aged.length ? (
          <div className="divide-y">
            {data.aged.map((item) => (
              <AgedRow key={item.id} item={item} />
            ))}
          </div>
        ) : (
          empty("Nothing is past its turn time.")
        )}
      </Column>

      <p className="text-[11px] text-muted-foreground lg:col-span-3">
        {formatNumber(data.scanned)} of your units compared against same year, make and model
        listings with 3+ comps. Tap a unit to open it in inventory.
      </p>
    </div>
  );
}
