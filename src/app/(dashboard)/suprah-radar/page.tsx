"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { BarChart3, LineChart, Radar, Search, Trophy } from "lucide-react";

import { cn } from "@/lib/utils";
import { defaultFilters, useMarketOverview, type MarketFilters } from "@/hooks/useSuprahRadar";

import { ScopeBar } from "./_components/ScopeBar";
import { ConnectionNotice, TabFallback } from "./_components/shared";
import type { ModelTarget } from "./_components/ModelDetailSheet";
import { WeeklyInsightsTab } from "./_components/tabs/WeeklyInsightsTab";

const MarketReportTab = dynamic(
  () => import("./_components/tabs/MarketReportTab").then((m) => m.MarketReportTab),
  { loading: () => <TabFallback /> },
);
const DealerPerformanceTab = dynamic(
  () => import("./_components/tabs/DealerPerformanceTab").then((m) => m.DealerPerformanceTab),
  { loading: () => <TabFallback /> },
);
const DealerLookupTab = dynamic(
  () => import("./_components/tabs/DealerLookupTab").then((m) => m.DealerLookupTab),
  { loading: () => <TabFallback /> },
);
const DealerProfileSheet = dynamic(
  () => import("./_components/DealerProfileSheet").then((m) => m.DealerProfileSheet),
);
const ModelDetailSheet = dynamic(
  () => import("./_components/ModelDetailSheet").then((m) => m.ModelDetailSheet),
);

const STORAGE_KEY = "suprah-radar-filters";

type TabId = "insights" | "market" | "performance" | "lookup";

const TABS: { id: TabId; label: string; icon: typeof BarChart3 }[] = [
  { id: "insights", label: "Weekly Insights", icon: Trophy },
  { id: "market", label: "Market Report", icon: LineChart },
  { id: "performance", label: "Dealer Performance", icon: BarChart3 },
  { id: "lookup", label: "Dealer Lookup", icon: Search },
];

const TAB_IDS = TABS.map((t) => t.id);

function readStoredFilters(): MarketFilters {
  if (typeof window === "undefined") return defaultFilters;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultFilters;
    const parsed = JSON.parse(raw) as Partial<MarketFilters>;
    return {
      scope: parsed.scope === "state" || parsed.scope === "metro" ? parsed.scope : "national",
      state: typeof parsed.state === "string" ? parsed.state : undefined,
      city: typeof parsed.city === "string" ? parsed.city : undefined,
      condition:
        parsed.condition === "new" || parsed.condition === "used" ? parsed.condition : "all",
      days: [7, 30, 90, 180, 365].includes(Number(parsed.days)) ? Number(parsed.days) : 30,
    };
  } catch {
    return defaultFilters;
  }
}

function SuprahRadarView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const initialTab = (() => {
    const raw = searchParams.get("tab") as TabId | null;
    return raw && TAB_IDS.includes(raw) ? raw : "insights";
  })();

  const [tab, setTab] = React.useState<TabId>(initialTab);
  const [filters, setFilters] = React.useState<MarketFilters>(defaultFilters);
  const [compareIds, setCompareIds] = React.useState<string[]>([]);
  const [profileId, setProfileId] = React.useState<string | null>(null);
  const [modelTarget, setModelTarget] = React.useState<ModelTarget | null>(null);
  const [sheetsUsed, setSheetsUsed] = React.useState({ dealer: false, model: false });
  const [competitorsOnly, setCompetitorsOnly] = React.useState(false);

  React.useEffect(() => {
    setFilters(readStoredFilters());
  }, []);

  React.useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
    } catch {
      /* storage unavailable */
    }
  }, [filters]);

  const overview = useMarketOverview(filters);

  React.useEffect(() => {
    const resolved = overview.data?.scope;
    if (!resolved) return;
    setFilters((prev) => {
      if (prev.scope === "state" && !prev.state && resolved.state) {
        return { ...prev, state: resolved.state };
      }
      if (prev.scope === "metro" && !prev.city && resolved.city) {
        return { ...prev, city: resolved.city, state: resolved.state };
      }
      return prev;
    });
  }, [overview.data?.scope]);

  const changeTab = React.useCallback(
    (next: TabId) => {
      setTab(next);
      const params = new URLSearchParams(Array.from(searchParams.entries()));
      params.set("tab", next);
      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [router, searchParams],
  );

  const handleRefresh = React.useCallback(() => {
    queryClient.invalidateQueries({
      predicate: (query) => String(query.queryKey[0]).startsWith("market-iq"),
    });
  }, [queryClient]);

  const refreshing =
    queryClient.isFetching({
      predicate: (query) => String(query.queryKey[0]).startsWith("market-iq"),
    }) > 0;

  const openDealer = React.useCallback((id: string) => {
    setSheetsUsed((prev) => (prev.dealer ? prev : { ...prev, dealer: true }));
    setModelTarget(null);
    setProfileId(id);
  }, []);

  const openModel = React.useCallback((target: ModelTarget) => {
    setSheetsUsed((prev) => (prev.model ? prev : { ...prev, model: true }));
    setProfileId(null);
    setModelTarget(target);
  }, []);

  return (
    <div className="mx-auto w-full max-w-400 space-y-6 px-3 pb-16 pt-4 sm:px-4 sm:pt-6">
      <header className="space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <Radar className="size-5 text-primary" />
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Suprah Radar</h1>
          <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
            Market intelligence
          </span>
        </div>
        <p className="max-w-3xl text-xs text-muted-foreground sm:text-sm">
          Where your store ranks against every dealership on Suprah, and what to do about it.
        </p>
      </header>

      <div className="sticky top-0 z-30 -mx-3 border-b bg-background/85 px-3 backdrop-blur supports-backdrop-filter:bg-background/60 sm:-mx-4 sm:px-4">
        <nav
          className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          aria-label="Suprah Radar sections"
        >
          <ul className="flex w-max items-center gap-1" role="tablist">
            {TABS.map((item) => {
              const active = tab === item.id;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => changeTab(item.id)}
                    className={cn(
                      "relative flex items-center gap-1.5 whitespace-nowrap px-3 py-3 text-xs font-medium uppercase tracking-wide transition-colors sm:text-[13px]",
                      active ? "text-primary" : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <item.icon className="size-4" />
                    {item.label}
                    {active && (
                      <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-primary" />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>

      {overview.isError && (
        <ConnectionNotice hasCachedData={!!overview.data} onRetry={handleRefresh} />
      )}

      <ScopeBar
        filters={filters}
        onChange={setFilters}
        onRefresh={handleRefresh}
        refreshing={refreshing}
        scopeLabel={overview.data?.scope?.label}
        updatedAt={overview.dataUpdatedAt}
      />

      {tab === "insights" && (
        <WeeklyInsightsTab
          filters={filters}
          competitorsOnly={competitorsOnly}
          onCompetitorsOnlyChange={setCompetitorsOnly}
          onSelectDealer={openDealer}
          onSelectModel={openModel}
          onManageCompetitors={() => changeTab("lookup")}
          onOpenBoard={() => changeTab("performance")}
        />
      )}

      {tab === "market" && (
        <MarketReportTab
          filters={filters}
          onSelectModel={openModel}
          onJumpToTab={(next) => changeTab(next)}
        />
      )}

      {tab === "performance" && (
        <DealerPerformanceTab
          filters={filters}
          competitorsOnly={competitorsOnly}
          onCompetitorsOnlyChange={setCompetitorsOnly}
          compareIds={compareIds}
          onCompareChange={setCompareIds}
          onSelectDealer={openDealer}
        />
      )}

      {tab === "lookup" && (
        <DealerLookupTab
          filters={filters}
          compareIds={compareIds}
          onCompareChange={setCompareIds}
          onSelectDealer={openDealer}
        />
      )}

      {sheetsUsed.dealer && (
      <DealerProfileSheet
        dealerId={profileId}
        filters={filters}
        onOpenChange={(open) => !open && setProfileId(null)}
        onSelectModel={openModel}
      />
      )}

      {sheetsUsed.model && (
      <ModelDetailSheet
        target={modelTarget}
        filters={filters}
        onOpenChange={(open) => !open && setModelTarget(null)}
        onSelectDealer={openDealer}
      />
      )}
    </div>
  );
}

export default function SuprahRadarPage() {
  return (
    <React.Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="size-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      }
    >
      <SuprahRadarView />
    </React.Suspense>
  );
}
