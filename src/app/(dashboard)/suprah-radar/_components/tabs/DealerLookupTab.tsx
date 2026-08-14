"use client";

import * as React from "react";
import { Columns3, Search } from "lucide-react";

import type { MarketFilters } from "@/hooks/useSuprahRadar";

import { CompareTable } from "../CompareTable";
import { DealerLookupTable } from "../DealerLookupTable";
import { SectionShell } from "../shared";

export function DealerLookupTab({
  filters,
  compareIds,
  onCompareChange,
  onSelectDealer,
}: {
  filters: MarketFilters;
  compareIds: string[];
  onCompareChange: (ids: string[]) => void;
  onSelectDealer: (id: string) => void;
}) {
  return (
    <div className="space-y-8">
      <SectionShell
        title="Find a dealership"
        description="By name, website, city, state or ZIP"
        icon={Search}
      >
        <DealerLookupTable
          filters={filters}
          compareIds={compareIds}
          onCompareChange={onCompareChange}
          onOpenProfile={onSelectDealer}
        />
      </SectionShell>

      <SectionShell
        title="Head to head"
        description="Side by side with your store"
        icon={Columns3}
      >
        <CompareTable
          filters={filters}
          compareIds={compareIds}
          onCompareChange={onCompareChange}
        />
      </SectionShell>
    </div>
  );
}
