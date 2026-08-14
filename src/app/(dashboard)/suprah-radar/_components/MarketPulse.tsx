"use client";

import * as React from "react";
import {
  Building2,
  CalendarClock,
  Car,
  DollarSign,
  Gauge,
  Timer,
} from "lucide-react";

import type { MarketSummary } from "@/types/suprah-radar";
import { formatCurrency, formatNumber, formatPercent, StatTile } from "./shared";

export function MarketPulse({
  market,
  days,
  loading,
  onJumpToTab,
}: {
  market?: MarketSummary;
  days: number;
  loading?: boolean;
  onJumpToTab?: (tab: "performance" | "lookup") => void;
}) {
  const tiles = [
    {
      label: "Dealers listing",
      value: formatNumber(market?.dealers),
      hint: market?.dormantDealers
        ? `${formatNumber(market.totalDealers)} on Suprah, ${formatNumber(market.dormantDealers)} with no stock`
        : `${formatNumber(market?.avgInventoryPerDealer)} avg units each`,
      icon: Building2,
      onClick: onJumpToTab ? () => onJumpToTab("lookup") : undefined,
    },
    {
      label: "Active listings",
      value: formatNumber(market?.activeListings, true),
      hint: `${formatNumber(market?.acquiredInPeriod)} acquired in ${days}d`,
      icon: Car,
      onClick: onJumpToTab ? () => onJumpToTab("performance") : undefined,
    },
    {
      label: `Sold · ${days}d`,
      value: formatNumber(market?.soldInPeriod, true),
      delta: market?.salesDelta,
      hint: `${formatNumber(market?.soldPrevPeriod)} prior period`,
      icon: Gauge,
      accent: "primary" as const,
      onClick: onJumpToTab ? () => onJumpToTab("performance") : undefined,
    },
    {
      label: "Avg list price",
      value: formatCurrency(market?.avgPrice, true),
      hint: "Mean of dealer averages",
      icon: DollarSign,
    },
    {
      label: "Avg days on lot",
      value: market?.avgDaysOnLot ? `${formatNumber(market.avgDaysOnLot)} d` : "—",
      hint: market?.avgDaysToSell ? `${formatNumber(market.avgDaysToSell)} d to sell` : "Live stock age",
      icon: Timer,
    },
    {
      label: "Sell-through",
      value: formatPercent(market?.sellThrough, 1),
      hint: market?.supplyDays ? `${formatNumber(market.supplyDays)} days of supply` : undefined,
      icon: CalendarClock,
      accent: (market && market.sellThrough < 15 ? "warn" : "default") as "warn" | "default",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      {tiles.map((tile) => (
        <StatTile key={tile.label} loading={loading} {...tile} />
      ))}
    </div>
  );
}
