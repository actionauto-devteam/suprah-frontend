"use client";

import * as React from "react";
import { Lightbulb, ListChecks, Radio, Trophy, Users2 } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  useMarketLeaderboards,
  useMarketOpportunities,
  useMarketOverview,
  useRecommendations,
  type MarketFilters,
} from "@/hooks/useSuprahRadar";

import { Leaderboards } from "../Leaderboards";
import { MarketSignals } from "../MarketSignals";
import type { ModelTarget } from "../ModelDetailSheet";
import { OpportunityEngine } from "../OpportunityEngine";
import { Recommendations } from "../Recommendations";
import { SectionShell } from "../shared";
import { StoreHeader } from "../StoreHeader";
import { YourStanding } from "../YourStanding";

export function WeeklyInsightsTab({
  filters,
  competitorsOnly,
  onCompetitorsOnlyChange,
  onSelectDealer,
  onSelectModel,
  onManageCompetitors,
  onOpenBoard,
}: {
  filters: MarketFilters;
  competitorsOnly: boolean;
  onCompetitorsOnlyChange: (value: boolean) => void;
  onSelectDealer: (id: string) => void;
  onSelectModel: (target: ModelTarget) => void;
  onManageCompetitors: () => void;
  onOpenBoard: () => void;
}) {
  const overview = useMarketOverview(filters);
  const leaderboards = useMarketLeaderboards(filters, 10, competitorsOnly);
  const recommendations = useRecommendations(filters, 90);
  const opportunities = useMarketOpportunities(filters);

  const watchedCount = leaderboards.data?.watchedCount ?? 0;

  return (
    <div className="space-y-8">
      <StoreHeader
        store={overview.data?.store}
        scope={overview.data?.scope}
        market={overview.data?.market}
        days={filters.days}
        loading={overview.isLoading}
        onManageCompetitors={onManageCompetitors}
      />

      <SectionShell title="Your standing" description="Tap any rank to open the full board" icon={Trophy}>
        <YourStanding
          you={overview.data?.you}
          privateMetrics={overview.data?.private}
          market={overview.data?.market}
          loading={overview.isLoading}
          onOpenBoard={onOpenBoard}
        />
      </SectionShell>

      <SectionShell
        title="Leaderboard"
        description="Tap a dealership to open its profile"
        icon={Users2}
        actions={
          <div className="inline-flex items-center gap-1 rounded-lg border bg-card p-1">
            {[
              { value: false, label: "All market" },
              { value: true, label: "My competitors" },
            ].map((option) => (
              <button
                key={String(option.value)}
                type="button"
                onClick={() => onCompetitorsOnlyChange(option.value)}
                disabled={option.value && watchedCount === 0}
                className={cn(
                  "rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                  competitorsOnly === option.value
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted",
                )}
              >
                {option.label}
                {option.value && watchedCount > 0 ? ` (${watchedCount})` : ""}
              </button>
            ))}
          </div>
        }
      >
        <Leaderboards
          boards={leaderboards.data?.boards}
          loading={leaderboards.isLoading}
          onSelectDealer={onSelectDealer}
        />
      </SectionShell>

      <SectionShell title="Market signals" description="Who moved since the prior period" icon={Radio}>
        <MarketSignals
          signals={overview.data?.signals}
          loading={overview.isLoading}
          onSelectDealer={onSelectDealer}
        />
      </SectionShell>

      <SectionShell title="My recommendations" description="From your own 90-day history" icon={ListChecks}>
        <Recommendations
          data={recommendations.data}
          loading={recommendations.isLoading}
          onSelectModel={onSelectModel}
        />
      </SectionShell>

      <SectionShell title="Opportunities" description="Unit-level calls against market comps" icon={Lightbulb}>
        <OpportunityEngine
          data={opportunities.data}
          loading={opportunities.isLoading}
          onSelectModel={onSelectModel}
        />
      </SectionShell>
    </div>
  );
}
