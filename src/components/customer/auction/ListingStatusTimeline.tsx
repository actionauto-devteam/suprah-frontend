"use client";

import { CheckCircle2, Clock, Hourglass } from "lucide-react";
import { AuctionListing, STATUS_META } from "@/lib/api/auctionListings";
import { cn } from "@/lib/utils";

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Denver",
  });

export function ListingStatusTimeline({ listing }: { listing: AuctionListing }) {
  const events = listing.statusHistory ?? [];

  return (
    <div className="space-y-0">
      {events.map((event, i) => {
        const meta = STATUS_META[event.status];
        const isLast = i === events.length - 1 && listing.status !== "UNDER_REVIEW";
        return (
          <div key={`${event.status}-${event.at}`} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-full", meta.badgeClass)}>
                <CheckCircle2 className="h-3.5 w-3.5" />
              </div>
              {!isLast && <div className="w-px flex-1 bg-border/60 my-1" />}
            </div>
            <div className={cn("min-w-0 flex-1", !isLast && "pb-4")}>
              <p className="text-xs font-bold text-foreground">{meta.label}</p>
              {event.note && <p className="text-xs text-muted-foreground">{event.note}</p>}
              <p className="text-[10px] text-muted-foreground/70 tabular-nums">{formatDate(event.at)}</p>
            </div>
          </div>
        );
      })}

      {listing.status === "UNDER_REVIEW" && (
        <div className="flex gap-3">
          <div className="flex flex-col items-center">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <Hourglass className="h-3.5 w-3.5 animate-pulse" />
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-foreground">Dealership Decision</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Dealership review is a work in progress — your listing will stay under review for now. We&apos;ll notify you once a decision is made.
            </p>
            <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
              <Clock className="h-3 w-3" />
              Pending
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
