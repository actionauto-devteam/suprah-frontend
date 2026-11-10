"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Plus, RefreshCw, Search } from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import { DEAL_STAGE_LABELS, DEAL_STAGE_ORDER, afterSaleError, fetchDeals, formatMoney, type Deal, type DealStage } from "@/lib/api/afterSale";
import { cn } from "@/lib/utils";
import { DealCard } from "./DealCard";
import { DealDetailDialog } from "./DealDetailDialog";
import { NewDealDialog } from "./NewDealDialog";

function stageTotal(deals: Deal[]): string | null {
  if (!deals.length || deals.some((deal) => !deal.amountsVisible)) return null;
  const total = deals.reduce((sum, deal) => sum + (deal.amount || 0), 0);
  return total ? formatMoney(total) : null;
}

export function DealBoard() {
  const { getToken } = useAuth();
  const [search, setSearch] = React.useState("");
  const [debounced, setDebounced] = React.useState("");
  const [mine, setMine] = React.useState(false);
  const [stage, setStage] = React.useState<DealStage>("new");
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [creating, setCreating] = React.useState(false);

  React.useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  const query = useQuery({
    queryKey: ["crm-deals", "board", debounced, mine],
    queryFn: async () => fetchDeals(await getToken(), { search: debounced, mine }),
    staleTime: 10_000,
  });

  const items = React.useMemo(() => query.data?.items || [], [query.data]);
  const byStage = React.useMemo(() => {
    const map = new Map<DealStage, Deal[]>(DEAL_STAGE_ORDER.map((value) => [value, []]));
    items.forEach((deal) => map.get(deal.stage)?.push(deal));
    return map;
  }, [items]);
  const selected = items.find((deal) => deal.id === selectedId) || null;
  const openDeal = (deal: Deal) => setSelectedId(deal.id);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 flex-col gap-2 border-b px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center">
          <label className="relative block min-w-0 flex-1 sm:max-w-sm">
            <span className="sr-only">Search deals</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search customer, vehicle, VIN or stock"
              className="h-11 w-full min-w-0 rounded-lg border bg-background pl-9 pr-3 text-base outline-none focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/15 sm:h-10 sm:text-sm"
            />
          </label>
          <label className="flex min-h-10 items-center gap-2 text-sm">
            <input type="checkbox" checked={mine} onChange={(event) => setMine(event.target.checked)} className="h-4 w-4" />
            Only my deals
          </label>
        </div>
        <button type="button" onClick={() => setCreating(true)} className="inline-flex h-11 items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-700 sm:h-10">
          <Plus className="h-4 w-4" />
          New deal
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">
        {query.isLoading ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading deals…
          </p>
        ) : query.isError ? (
          <div role="alert" className="rounded-xl border bg-card p-4 text-center text-sm">
            <p>{afterSaleError(query.error, "Couldn't load the deals.")}</p>
            <button type="button" onClick={() => void query.refetch()} className="mt-2 inline-flex h-10 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium hover:bg-muted">
              <RefreshCw className="h-4 w-4" />
              Try again
            </button>
          </div>
        ) : (
          <>
            <div className="xl:hidden">
              <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-2" role="tablist" aria-label="Deal stages">
                {DEAL_STAGE_ORDER.map((value) => (
                  <button
                    key={value}
                    type="button"
                    role="tab"
                    aria-selected={stage === value}
                    onClick={() => setStage(value)}
                    className={cn(
                      "h-10 shrink-0 rounded-full border px-3 text-sm font-medium",
                      stage === value ? "border-emerald-600 bg-emerald-600 text-white" : "bg-card hover:bg-muted",
                    )}
                  >
                    {DEAL_STAGE_LABELS[value]} ({byStage.get(value)?.length || 0})
                  </button>
                ))}
              </div>
              <div className="space-y-2" role="tabpanel">
                {stageTotal(byStage.get(stage) || []) && <p className="text-xs text-muted-foreground">Total {stageTotal(byStage.get(stage) || [])}</p>}
                {(byStage.get(stage) || []).length ? (
                  (byStage.get(stage) || []).map((deal) => <DealCard key={deal.id} deal={deal} onOpen={openDeal} />)
                ) : (
                  <p className="rounded-lg border border-dashed px-3 py-6 text-center text-xs text-muted-foreground">No deals in {DEAL_STAGE_LABELS[stage]}.</p>
                )}
              </div>
            </div>

            <div className="hidden gap-3 xl:grid xl:grid-cols-6" data-testid="deal-columns">
              {DEAL_STAGE_ORDER.map((value) => {
                const deals = byStage.get(value) || [];
                const total = stageTotal(deals);
                return (
                  <section key={value} className="min-w-0 space-y-2 rounded-xl border bg-muted/30 p-2" aria-label={DEAL_STAGE_LABELS[value]}>
                    <header className="px-1">
                      <h2 className="text-sm font-semibold">
                        {DEAL_STAGE_LABELS[value]} <span className="font-normal text-muted-foreground">({deals.length})</span>
                      </h2>
                      {total && <p className="text-[11px] text-muted-foreground">Total {total}</p>}
                    </header>
                    {deals.length ? deals.map((deal) => <DealCard key={deal.id} deal={deal} onOpen={openDeal} />) : <p className="px-1 py-4 text-center text-[11px] text-muted-foreground">No deals</p>}
                  </section>
                );
              })}
            </div>
            {items.length === 0 && !debounced && !mine && (
              <p className="mt-4 text-center text-xs text-muted-foreground">No deals yet. Press New deal to start one from a lead, or add a Create a Deal step to an automation.</p>
            )}
          </>
        )}
      </div>

      <DealDetailDialog deal={selected} open={Boolean(selected)} onOpenChange={(open) => !open && setSelectedId(null)} team={query.data?.team || []} canAssign={Boolean(query.data?.canAssign)} />
      <NewDealDialog open={creating} onOpenChange={setCreating} team={query.data?.team || []} canAssign={Boolean(query.data?.canAssign)} />
    </div>
  );
}
