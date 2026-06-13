"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Tag, Plus, Hourglass, BadgeCheck, CircleDollarSign, CarFront, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  fetchListings,
  AuctionListing as AuctionListingType,
  ListingStatus,
  STATUS_META,
} from "@/lib/api/auctionListings";
import { ListingCard } from "@/components/customer/auction/ListingCard";
import { cn } from "@/lib/utils";

const SECTION_ORDER: ListingStatus[] = [
  "UNDER_REVIEW",
  "DRAFT",
  "APPROVED",
  "REJECTED",
  "SOLD",
  "WITHDRAWN",
];

export function AuctionListings() {
  const { data, isLoading } = useQuery({
    queryKey: ["auctionListings"],
    queryFn: () => fetchListings(),
  });

  const listings = data?.listings ?? [];
  const counts = data?.counts;
  const hasAny = (counts?.ALL ?? 0) > 0;

  const grouped = React.useMemo(() => {
    const map = new Map<ListingStatus, AuctionListingType[]>();
    for (const s of SECTION_ORDER) map.set(s, []);
    for (const listing of listings) map.get(listing.status)?.push(listing);
    return map;
  }, [listings]);

  return (
    <div className="flex min-h-full w-full flex-col space-y-4 sm:space-y-5">
      <div className="relative overflow-hidden rounded-2xl border border-border/40 bg-card dark:bg-zinc-900/60">
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-linear-to-r from-primary via-primary/70 to-primary/0" />
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-linear-to-l from-primary/8 to-transparent pointer-events-none" />
        <div className="absolute -top-10 -right-10 h-52 w-52 rounded-full bg-primary/6 blur-3xl pointer-events-none" />
        <div
          className="absolute right-4 top-1/2 -translate-y-1/2 text-[72px] sm:text-[96px] font-black text-primary/5 uppercase leading-none select-none pointer-events-none tracking-tight"
          aria-hidden
        >
          SELL
        </div>

        <div className="relative px-5 py-5 sm:px-7 sm:py-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-2.5 min-w-0">
              <div className="flex items-center gap-2">
                <Tag className="h-3 w-3 text-primary shrink-0" />
                <span className="text-[10px] font-black uppercase tracking-[0.25em] text-primary/80">
                  Auction Listing
                </span>
              </div>
              <h1 className="text-3xl xs:text-4xl sm:text-5xl font-black tracking-tight leading-none text-foreground uppercase">
                Sell Your <span className="text-primary">Car</span>
              </h1>
              <p className="max-w-md text-xs text-muted-foreground sm:text-sm">
                List your car for sale and get it approved by our team.
              </p>

              {/* Stats pills */}
              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                {isLoading ? (
                  <span className="inline-block h-7 w-24 rounded-full bg-muted animate-pulse" />
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs font-bold text-foreground tabular-nums">
                    <Tag className="h-3 w-3 text-primary shrink-0" />
                    {counts?.ALL ?? 0} {counts?.ALL === 1 ? "listing" : "listings"}
                  </span>
                )}

                {!isLoading && (counts?.UNDER_REVIEW ?? 0) > 0 && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/25 bg-amber-500/8 px-3 py-1 text-xs font-semibold text-amber-600 dark:text-amber-400 dark:bg-amber-500/12">
                    <Hourglass className="h-3 w-3 shrink-0" />
                    {counts?.UNDER_REVIEW} in review
                  </span>
                )}

                {!isLoading && (counts?.APPROVED ?? 0) > 0 && (
                  <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/8 px-3 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 dark:bg-emerald-500/12">
                    <BadgeCheck className="h-3 w-3 shrink-0" />
                    {counts?.APPROVED} approved
                  </span>
                )}

                {!isLoading && (counts?.SOLD ?? 0) > 0 && (
                  <span className="hidden sm:inline-flex items-center gap-1 rounded-full border border-blue-500/25 bg-blue-500/8 px-3 py-1 text-xs font-semibold text-blue-600 dark:text-blue-400 dark:bg-blue-500/12">
                    <CircleDollarSign className="h-3 w-3 shrink-0" />
                    {counts?.SOLD} sold
                  </span>
                )}
              </div>
            </div>
            <div className="shrink-0">
              <Link href="/customer/auction/new">
                <Button size="sm" className="gap-1.5 h-9 rounded-xl text-xs font-semibold">
                  <Plus className="h-3.5 w-3.5" />
                  New Listing
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 space-y-5">
        {isLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="rounded-2xl bg-muted animate-pulse dark:bg-zinc-900/60" style={{ aspectRatio: "5/4" }} />
            ))}
          </div>
        ) : !hasAny ? (
          <div className="relative overflow-hidden rounded-2xl border border-dashed border-primary/20 bg-primary/3 dark:bg-primary/5">
            <div className="absolute -right-12 -bottom-12 h-56 w-56 rounded-full bg-primary/6 blur-3xl pointer-events-none" />
            <div className="relative flex flex-col items-center gap-5 px-6 py-14 sm:py-20 text-center">
              <div className="relative">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 ring-1 ring-primary/20">
                  <CarFront className="h-9 w-9 text-primary/50" />
                </div>
                <div className="absolute -top-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-card border-2 border-primary/20">
                  <Sparkles className="h-3.5 w-3.5 text-primary/70" />
                </div>
              </div>
              <div className="space-y-2 max-w-xs">
                <h2 className="text-xl font-black text-foreground uppercase tracking-tight">
                  Sell your first car
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Create a listing with photos and details — our team reviews it, and once approved it goes up for sale in the shop.
                </p>
              </div>
              <Link href="/customer/auction/new">
                <Button className="gap-2 rounded-xl font-semibold h-10 px-5" size="sm">
                  <Plus className="h-4 w-4" />
                  Create Listing
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          SECTION_ORDER.map((status) => {
            const items = grouped.get(status) ?? [];
            if (items.length === 0) return null;
            const meta = STATUS_META[status];
            return (
              <section key={status} className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className={cn("h-2 w-2 rounded-full", meta.dotClass)} />
                  <h2 className="text-sm font-bold text-foreground uppercase tracking-wide">{meta.label}</h2>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground tabular-nums">
                    {items.length}
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                  {items.map((listing) => (
                    <ListingCard key={listing.id} listing={listing} />
                  ))}
                </div>
              </section>
            );
          })
        )}
      </div>
    </div>
  );
}
