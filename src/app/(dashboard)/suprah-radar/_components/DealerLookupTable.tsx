"use client";

import * as React from "react";
import { Building2, Columns3, ExternalLink, Eye, Search, Star, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn, resolveImageUrl } from "@/lib/utils";
import {
  useDealerSearch,
  useToggleWatch,
  useWatchlist,
  type MarketFilters,
} from "@/hooks/useSuprahRadar";
import { COMPARE_LIMIT } from "./CompareTable";
import { Delta, formatCurrency, formatNumber, LoadingRows, Panel } from "./shared";

function DealerAvatar({ name, logoUrl }: { name: string; logoUrl?: string }) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
  const src = resolveImageUrl(logoUrl);
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt=""
        className="size-8 shrink-0 rounded-md object-cover ring-1 ring-border"
        loading="lazy"
      />
    );
  }
  return (
    <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-[11px] font-semibold text-muted-foreground ring-1 ring-border">
      {initials || "?"}
    </span>
  );
}

export function DealerLookupTable({
  filters,
  compareIds,
  onCompareChange,
  onOpenProfile,
}: {
  filters: MarketFilters;
  compareIds: string[];
  onCompareChange: (ids: string[]) => void;
  onOpenProfile: (id: string) => void;
}) {
  const [term, setTerm] = React.useState("");
  const [debounced, setDebounced] = React.useState("");
  const { data: results, isLoading } = useDealerSearch(debounced, true);
  const { data: watchlist } = useWatchlist(filters);
  const toggleWatch = useToggleWatch();

  React.useEffect(() => {
    const id = setTimeout(() => setDebounced(term.trim()), 350);
    return () => clearTimeout(id);
  }, [term]);

  const watchedIds = React.useMemo(
    () => new Set((watchlist?.watches ?? []).map((w) => String(w.targetOrganizationId))),
    [watchlist],
  );

  const toggleCompare = (id: string) => {
    if (compareIds.includes(id)) {
      onCompareChange(compareIds.filter((c) => c !== id));
      return;
    }
    if (compareIds.length >= COMPARE_LIMIT) {
      toast.info(`Compare holds up to ${COMPARE_LIMIT} dealerships.`);
      return;
    }
    onCompareChange([...compareIds, id]);
  };

  const handleWatch = (id: string, watched: boolean) => {
    toggleWatch.mutate(
      { dealerId: id, watched },
      {
        onSuccess: () => toast.success(watched ? "Removed from watchlist" : "Added to watchlist"),
        onError: () => toast.error("Could not update the watchlist"),
      },
    );
  };

  const rows = results ?? [];

  return (
    <div className="grid gap-3 xl:grid-cols-4">
      <Panel className="overflow-hidden xl:col-span-3">
        <div className="border-b p-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="Search dealerships by name, website, city, state or ZIP…"
              className="h-9 pl-8 text-sm"
              aria-label="Search dealerships"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="p-3">
            <LoadingRows rows={8} height="h-12" />
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-14 text-center">
            <Building2 className="size-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              No dealerships matched that search.
            </p>
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-190 text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-[11px] uppercase tracking-wider text-muted-foreground">
                    <th className="px-4 py-2 text-left font-medium">Dealership name</th>
                    <th className="px-4 py-2 text-left font-medium">Address</th>
                    <th className="px-4 py-2 text-left font-medium">Website</th>
                    <th className="px-4 py-2 text-right font-medium">Inventory</th>
                    <th className="px-4 py-2 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {rows.map((dealer) => {
                    const watched = watchedIds.has(dealer.id) || dealer.watched;
                    const selected = compareIds.includes(dealer.id);
                    return (
                      <tr
                        key={dealer.id}
                        className={cn("transition-colors hover:bg-muted/40", dealer.isYou && "bg-primary/5")}
                      >
                        <td className="px-4 py-2.5">
                          <button
                            type="button"
                            onClick={() => onOpenProfile(dealer.id)}
                            className="flex items-center gap-2 text-left"
                          >
                            <DealerAvatar name={dealer.name} logoUrl={dealer.logoUrl} />
                            <span className="min-w-0">
                              <span
                                className={cn(
                                  "block truncate font-medium",
                                  dealer.isYou && "text-primary",
                                )}
                              >
                                {dealer.name}
                              </span>
                              <span className="block truncate text-[11px] text-muted-foreground">
                                {formatCurrency(dealer.avgPrice, true)} avg list
                              </span>
                            </span>
                          </button>
                        </td>
                        <td className="px-4 py-2.5 text-[13px] text-muted-foreground">
                          {[dealer.address, dealer.city, dealer.state, dealer.zip]
                            .filter(Boolean)
                            .join(", ") || "—"}
                        </td>
                        <td className="px-4 py-2.5 text-[13px]">
                          {dealer.website ? (
                            <a
                              href={`https://${dealer.website}`}
                              target="_blank"
                              rel="noopener noreferrer nofollow"
                              className="inline-flex items-center gap-1 text-primary hover:underline"
                            >
                              {dealer.website}
                              <ExternalLink className="size-3" />
                            </a>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums">
                          {formatNumber(dealer.active)}
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8"
                              aria-label={watched ? "Remove from watchlist" : "Add to watchlist"}
                              onClick={() => handleWatch(dealer.id, watched)}
                              disabled={dealer.isYou || toggleWatch.isPending}
                            >
                              <Star
                                className={cn(
                                  "size-4",
                                  watched ? "fill-amber-400 text-amber-500" : "text-muted-foreground",
                                )}
                              />
                            </Button>
                            <Button
                              variant={selected ? "default" : "ghost"}
                              size="icon"
                              className="size-8"
                              aria-label={selected ? "Remove from comparison" : "Add to comparison"}
                              onClick={() => toggleCompare(dealer.id)}
                            >
                              <Columns3 className="size-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <ul className="divide-y md:hidden">
              {rows.map((dealer) => {
                const watched = watchedIds.has(dealer.id) || dealer.watched;
                const selected = compareIds.includes(dealer.id);
                return (
                  <li
                    key={dealer.id}
                    className={cn("space-y-2 p-3", dealer.isYou && "bg-primary/5")}
                  >
                    <button
                      type="button"
                      onClick={() => onOpenProfile(dealer.id)}
                      className="flex w-full items-center gap-2 text-left"
                    >
                      <DealerAvatar name={dealer.name} logoUrl={dealer.logoUrl} />
                      <span className="min-w-0 flex-1">
                        <span
                          className={cn(
                            "block truncate text-sm font-medium",
                            dealer.isYou && "text-primary",
                          )}
                        >
                          {dealer.name}
                        </span>
                        <span className="block truncate text-[11px] text-muted-foreground">
                          {[dealer.city, dealer.state].filter(Boolean).join(", ") || "—"} ·{" "}
                          {formatNumber(dealer.active)} units
                        </span>
                      </span>
                    </button>
                    {dealer.website && (
                      <a
                        href={`https://${dealer.website}`}
                        target="_blank"
                        rel="noopener noreferrer nofollow"
                        className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
                      >
                        {dealer.website}
                        <ExternalLink className="size-3" />
                      </a>
                    )}
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 flex-1"
                        onClick={() => handleWatch(dealer.id, watched)}
                        disabled={dealer.isYou || toggleWatch.isPending}
                      >
                        <Star
                          className={cn("size-3.5", watched && "fill-amber-400 text-amber-500")}
                        />
                        {watched ? "Watching" : "Watch"}
                      </Button>
                      <Button
                        variant={selected ? "default" : "outline"}
                        size="sm"
                        className="h-8 flex-1"
                        onClick={() => toggleCompare(dealer.id)}
                      >
                        <Columns3 className="size-3.5" />
                        {selected ? "In compare" : "Compare"}
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </Panel>

      <Panel className="overflow-hidden">
        <div className="border-b px-4 py-3">
          <p className="flex items-center gap-1.5 text-sm font-semibold">
            <Eye className="size-4 text-primary" /> Your competitors
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Watched dealerships drive the competitor filter on the leaderboards
          </p>
        </div>
        {(watchlist?.dealers?.length ?? 0) === 0 ? (
          <p className="px-4 py-8 text-center text-xs text-muted-foreground">
            Star a dealership to track it here.
          </p>
        ) : (
          <ul className="divide-y">
            {watchlist!.dealers.map((dealer) => (
              <li key={dealer.id} className="flex items-center gap-2 px-3 py-2">
                <button
                  type="button"
                  onClick={() => onOpenProfile(dealer.id)}
                  className="min-w-0 flex-1 text-left"
                >
                  <p className="truncate text-xs font-medium">{dealer.name}</p>
                  <p className="truncate text-[10px] text-muted-foreground">
                    {formatNumber(dealer.active)} live · {formatNumber(dealer.sold)} sold
                  </p>
                </button>
                <Delta value={dealer.momentum} className="shrink-0" />
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 shrink-0"
                  aria-label="Remove from watchlist"
                  onClick={() => handleWatch(dealer.id, true)}
                >
                  <X className="size-3.5" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
