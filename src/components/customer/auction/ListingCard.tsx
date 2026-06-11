"use client";

import Link from "next/link";
import { CarFront, Gauge, Camera } from "lucide-react";
import {
  AuctionListing,
  getListingTitle,
  getListingPhoto,
  formatPrice,
} from "@/lib/api/auctionListings";
import { ListingStatusBadge } from "./ListingStatusBadge";
import { resolveImageUrl } from "@/lib/utils";

export function ListingCard({ listing }: { listing: AuctionListing }) {
  const photo = resolveImageUrl(getListingPhoto(listing));
  const price = formatPrice(listing.askingPrice);

  return (
    <Link
      href={`/customer/auction/${listing.id}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-border/40 bg-card dark:bg-zinc-900/60 transition-all hover:border-primary/30 hover:shadow-md"
    >
      <div className="relative aspect-video bg-muted overflow-hidden">
        {photo ? (
          <img
            src={photo}
            alt={getListingTitle(listing)}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 text-muted-foreground/40">
            <CarFront className="h-8 w-8" />
            <span className="text-[10px] font-semibold uppercase tracking-wider">No photos yet</span>
          </div>
        )}
        <div className="absolute left-2.5 top-2.5">
          <ListingStatusBadge status={listing.status} className="backdrop-blur-sm bg-background/80" />
        </div>
        {listing.photos.length > 0 && (
          <span className="absolute right-2.5 bottom-2.5 inline-flex items-center gap-1 rounded-full bg-background/80 backdrop-blur-sm px-2 py-0.5 text-[10px] font-semibold text-foreground tabular-nums">
            <Camera className="h-3 w-3" />
            {listing.photos.length}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-3.5">
        <p className="text-sm font-bold text-foreground truncate">{getListingTitle(listing)}</p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {listing.mileage ? (
            <span className="inline-flex items-center gap-1 tabular-nums">
              <Gauge className="h-3 w-3 shrink-0" />
              {listing.mileage.toLocaleString()} mi
            </span>
          ) : (
            <span>Mileage not set</span>
          )}
          {listing.trim && <span className="truncate">· {listing.trim}</span>}
        </div>
        <div className="mt-auto flex items-center justify-between pt-1.5">
          {price ? (
            <span className="text-base font-black text-foreground tabular-nums">{price}</span>
          ) : (
            <span className="text-xs font-semibold text-muted-foreground">Price not set</span>
          )}
          {listing.isNegotiable && price && (
            <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">Negotiable</span>
          )}
        </div>
      </div>
    </Link>
  );
}
