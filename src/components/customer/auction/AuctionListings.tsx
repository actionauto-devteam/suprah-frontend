"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Tag, Plus, Hourglass, BadgeCheck, CircleDollarSign, CarFront, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  fetchListings,
  ListingStatus,
  STATUS_META,
  ListingCounts,
} from "@/lib/api/auctionListings";
import { ListingCard } from "@/components/customer/auction/ListingCard";
import { cn } from "@/lib/utils";

type Filter = ListingStatus | "ALL";

const FILTERS: Filter[] = ["ALL", "DRAFT", "UNDER_REVIEW", "APPROVED", "REJECTED", "SOLD", "WITHDRAWN"];

const STAT_CARDS: { key: keyof ListingCounts; label: string; icon: React.ComponentType<{ className?: string }>; accent: string }[] = [
  { key: "ALL", label: "Total Listings", icon: Tag, accent: "text-primary" },
  { key: "UNDER_REVIEW", label: "Under Review", icon: Hourglass, accent: "text-amber-600 dark:text-amber-400" },
  { key: "APPROVED", label: "Approved", icon: BadgeCheck, accent: "text-emerald-600 dark:text-emerald-400" },
  { key: "SOLD", label: "Sold", icon: CircleDollarSign, accent: "text-blue-600 dark:text-blue-400" },
];

export function AuctionListings() {
  const [filter, setFilter] = React.useState<Filter>("ALL");

  const { data, isLoading } = useQuery({
    queryKey: ["auctionListings", filter],
    queryFn: () => fetchListings(filter === "ALL" ? undefined : filter),
  });

  const listings = data?.listings ?? [];
  const counts = data?.counts;
  const hasAny = (counts?.ALL ?? 0) > 0;

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
                List your car for sale. Once reviewed and approved by the dealership, it joins the shop inventory.
              </p>
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

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {STAT_CARDS.map((stat) => (
          <div
            key={stat.key}
            className="rounded-2xl border border-border/40 bg-card dark:bg-zinc-900/60 px-4 py-3.5"
          >
            <div className="flex items-center gap-2">
              <stat.icon className={cn("h-3.5 w-3.5 shrink-0", stat.accent)} />
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground truncate">
                {stat.label}
              </span>
            </div>
            {isLoading ? (
              <span className="mt-1 inline-block h-7 w-10 rounded bg-muted animate-pulse" />
            ) : (
              <p className="mt-1 text-2xl font-black tabular-nums text-foreground">{counts?.[stat.key] ?? 0}</p>
            )}
          </div>
        ))}
      </div>

      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5 -mx-1 px-1">
        {FILTERS.map((f) => {
          const count = f === "ALL" ? counts?.ALL : counts?.[f];
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "shrink-0 h-8 px-3.5 rounded-full text-xs font-semibold transition-all duration-150 flex items-center gap-1.5 tabular-nums",
                filter === f
                  ? "bg-foreground text-background shadow-sm"
                  : "bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80",
              )}
            >
              {f === "ALL" ? "All" : STATUS_META[f].label}
              {count != null && count > 0 && (
                <span
                  className={cn(
                    "rounded-full px-1.5 py-px text-[10px] font-bold",
                    filter === f ? "bg-background/20" : "bg-background/60",
                  )}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="flex-1 min-h-0">
        {isLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="rounded-2xl bg-muted animate-pulse dark:bg-zinc-900/60" style={{ aspectRatio: "5/4" }} />
            ))}
          </div>
        ) : listings.length === 0 ? (
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
                  {hasAny ? "Nothing here" : "Sell your first car"}
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {hasAny
                    ? "No listings match this filter. Try another status."
                    : "Create a listing with photos and details — our team reviews it, and once approved it goes up for sale in the shop."}
                </p>
              </div>
              {!hasAny && (
                <Link href="/customer/auction/new">
                  <Button className="gap-2 rounded-xl font-semibold h-10 px-5" size="sm">
                    <Plus className="h-4 w-4" />
                    Create Listing
                  </Button>
                </Link>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {listings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
