"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Handshake, Loader2, Plus, RefreshCw } from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import { afterSaleError, fetchDeals, type Deal } from "@/lib/api/afterSale";
import type { CustomerRelatedLead } from "@/lib/api/customerRecords";
import { DealCard } from "@/components/deals/DealCard";
import { DealDetailDialog } from "@/components/deals/DealDetailDialog";
import { NewDealDialog } from "@/components/deals/NewDealDialog";

export function CustomerDealsTab({ customerId, leads }: { customerId: string; leads: CustomerRelatedLead[] }) {
  const { getToken } = useAuth();
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [creating, setCreating] = React.useState(false);
  const query = useQuery({
    queryKey: ["crm-deals", "customer", customerId],
    queryFn: async () => fetchDeals(await getToken(), { customerId }),
    staleTime: 10_000,
  });
  const presetLeads = React.useMemo(
    () => leads.map((lead) => ({ id: lead.id, name: lead.name || "Lead", vehicle: lead.vehicle || "", status: lead.status })),
    [leads],
  );
  const items = query.data?.items || [];
  const selected = items.find((deal) => deal.id === selectedId) || null;

  return (
    <section className="rounded-xl border bg-card" aria-label="Deals">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-2.5">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <Handshake className="h-4 w-4 text-muted-foreground" />
          Deals ({items.length})
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/crm/deals" className="inline-flex h-10 items-center rounded-lg border px-3 text-sm font-medium hover:bg-muted sm:h-9">
            Deal Board
          </Link>
          <button
            type="button"
            onClick={() => setCreating(true)}
            disabled={!query.data}
            className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-45 sm:h-9"
          >
            <Plus className="h-4 w-4" />
            New deal
          </button>
        </div>
      </div>
      <div className="space-y-2 p-4">
        {query.isLoading ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading deals…
          </p>
        ) : query.isError ? (
          <div role="alert" className="text-center text-sm">
            <p>{afterSaleError(query.error, "Couldn't load the deals.")}</p>
            <button type="button" onClick={() => void query.refetch()} className="mt-2 inline-flex h-10 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium hover:bg-muted">
              <RefreshCw className="h-4 w-4" />
              Try again
            </button>
          </div>
        ) : items.length ? (
          <ul className="grid gap-2 sm:grid-cols-2">
            {items.map((deal: Deal) => (
              <li key={deal.id}>
                <DealCard deal={deal} onOpen={(item) => setSelectedId(item.id)} showStage />
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-lg border border-dashed px-3 py-4 text-center text-xs text-muted-foreground">No deals for this customer yet.</p>
        )}
      </div>
      <DealDetailDialog deal={selected} open={Boolean(selected)} onOpenChange={(open) => !open && setSelectedId(null)} team={query.data?.team || []} canAssign={Boolean(query.data?.canAssign)} />
      <NewDealDialog open={creating} onOpenChange={setCreating} team={query.data?.team || []} canAssign={Boolean(query.data?.canAssign)} presetLeads={presetLeads} />
    </section>
  );
}
