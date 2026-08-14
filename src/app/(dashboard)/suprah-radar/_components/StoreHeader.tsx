"use client";

import * as React from "react";
import { Building2, CalendarRange, Globe, MapPin, Users2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { resolveImageUrl } from "@/lib/utils";
import type { MarketScope, MarketSummary, StoreProfile } from "@/types/suprah-radar";
import { formatNumber, Panel } from "./shared";

export function StoreHeader({
  store,
  scope,
  market,
  days,
  loading,
  onManageCompetitors,
}: {
  store?: StoreProfile | null;
  scope?: MarketScope;
  market?: MarketSummary;
  days: number;
  loading?: boolean;
  onManageCompetitors: () => void;
}) {
  if (loading) {
    return <Skeleton className="h-28 w-full" />;
  }

  const logo = resolveImageUrl(store?.logoUrl);
  const address = [store?.address, store?.city, store?.state, store?.zip]
    .filter(Boolean)
    .join(", ");

  return (
    <Panel className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        {logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logo}
            alt=""
            className="size-12 shrink-0 rounded-lg object-cover ring-1 ring-border"
          />
        ) : (
          <span className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-border">
            <Building2 className="size-6" />
          </span>
        )}
        <div className="min-w-0">
          <h2 className="truncate text-lg font-semibold tracking-tight sm:text-xl">
            {store?.name ?? "Your dealership"}
          </h2>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground sm:text-xs">
            {address && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="size-3" />
                {address}
              </span>
            )}
            {store?.website && (
              <a
                href={`https://${store.website}`}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="inline-flex items-center gap-1 text-primary hover:underline"
              >
                <Globe className="size-3" />
                {store.website}
              </a>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="rounded-lg border bg-background/60 px-3 py-2">
          <p className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
            <Users2 className="size-3" /> Benchmarked against
          </p>
          <p className="text-sm font-semibold tabular-nums">
            {formatNumber(market?.totalDealers)} dealers · {scope?.label ?? "market"}
          </p>
          {!!market?.dormantDealers && (
            <p className="text-[10px] text-muted-foreground">
              {formatNumber(market.dealers)} with live listings
            </p>
          )}
        </div>
        <div className="rounded-lg border bg-background/60 px-3 py-2">
          <p className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
            <CalendarRange className="size-3" /> Period
          </p>
          <p className="text-sm font-semibold tabular-nums">Last {days} days</p>
        </div>
        <Button variant="outline" size="sm" className="h-11" onClick={onManageCompetitors}>
          Manage competitors
        </Button>
      </div>
    </Panel>
  );
}
