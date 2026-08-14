"use client";

import * as React from "react";
import { Boxes, Gauge, LineChart, Layers, PieChart } from "lucide-react";

import {
  useMarketOverview,
  useMarketSegments,
  useMarketSupply,
  useMarketTrends,
  type MarketFilters,
} from "@/hooks/useSuprahRadar";

import { MarketPulse } from "../MarketPulse";
import type { ModelTarget } from "../ModelDetailSheet";
import { SalesByModel } from "../SalesByModel";
import { SectionShell } from "../shared";
import { SegmentTable } from "../SegmentTable";
import { SupplyBoards } from "../SupplyBoards";
import { TrendCharts } from "../TrendCharts";

export function MarketReportTab({
  filters,
  onSelectModel,
  onJumpToTab,
}: {
  filters: MarketFilters;
  onSelectModel: (target: ModelTarget) => void;
  onJumpToTab: (tab: "performance" | "lookup") => void;
}) {
  const overview = useMarketOverview(filters);
  const trends = useMarketTrends(filters);
  const supply = useMarketSupply(filters);
  const segments = useMarketSegments(filters);

  return (
    <div className="space-y-8">
      <SectionShell
        title={overview.data?.scope?.label ?? "Your region"}
        description={`Last ${filters.days} days`}
        icon={Gauge}
      >
        <MarketPulse
          market={overview.data?.market}
          days={filters.days}
          loading={overview.isLoading}
          onJumpToTab={onJumpToTab}
        />
      </SectionShell>

      <SectionShell title="Regional trends" description="Weekly, from stock-in and sold dates" icon={LineChart}>
        <TrendCharts
          series={trends.data?.series}
          priceByYear={trends.data?.priceByYear}
          loading={trends.isLoading}
        />
      </SectionShell>

      <SectionShell title="Inventory levels" description="Against each model's usual count" icon={Layers}>
        <SupplyBoards data={supply.data} loading={supply.isLoading} onSelectModel={onSelectModel} />
      </SectionShell>

      <SectionShell title="Sales by model" description="Tap a row for the full breakdown" icon={PieChart}>
        <SalesByModel
          segments={segments.data}
          loading={segments.isLoading}
          onSelectModel={onSelectModel}
        />
      </SectionShell>

      <SectionShell title="Model demand" description="Supply, demand and pricing per model line" icon={Boxes}>
        <SegmentTable
          segments={segments.data}
          loading={segments.isLoading}
          onSelectModel={onSelectModel}
        />
      </SectionShell>
    </div>
  );
}
