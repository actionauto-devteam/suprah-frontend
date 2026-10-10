"use client";

import * as React from "react";
import { Package, Plus, RefreshCw, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { previewStyles } from "@/components/mobile-preview/MobilePreviewScope";
import type { TransportationView } from "@/components/transportation/TransportationMobileFilters";

interface TransportationPreviewHeaderProps {
  activeView: TransportationView;
  total: number;
  vehiclesAvailable: number;
  refreshing: boolean;
  searchQuery: string;
  searchPlaceholder: string;
  onSearchChange: (value: string) => void;
  onCreateLoad: () => void;
  onNewQuote: () => void;
  onRefresh: () => void;
}

/** Phone header for Transportation (deck slide 8): title, live count, actions, search. */
export function TransportationPreviewHeader({
  activeView,
  total,
  vehiclesAvailable,
  refreshing,
  searchQuery,
  searchPlaceholder,
  onSearchChange,
  onCreateLoad,
  onNewQuote,
  onRefresh,
}: TransportationPreviewHeaderProps) {
  const unit = activeView === "drafts" ? "quote" : "load";

  return (
    <header className="px-4 pb-3 pt-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1
            id="transportation-preview-title"
            className="text-[26px] font-bold leading-tight tracking-tight text-[var(--mp-ink)]"
          >
            Transportation
          </h1>
          <p
            className={cn(
              previewStyles.mono,
              "mt-1 flex items-center gap-1.5 text-[11px] uppercase tracking-[0.16em] text-[var(--mp-muted)]",
            )}
          >
            <span className="relative flex size-1.5 shrink-0" aria-hidden="true">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-[var(--mp-mint)] opacity-60 motion-reduce:animate-none" />
              <span className="relative inline-flex size-1.5 rounded-full bg-[var(--mp-mint)]" />
            </span>
            <span className="truncate">
              Transport operations · {total} {unit}
              {total === 1 ? "" : "s"}
            </span>
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshing}
            aria-label="Refresh transportation data"
            title="Refresh"
            className="flex size-11 items-center justify-center rounded-full border border-[var(--mp-hairline)] bg-[var(--mp-surface)] text-[var(--mp-muted)] transition-colors hover:text-[var(--mp-ink)] disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mp-mint)]"
          >
            <RefreshCw className={cn("size-4", refreshing && "animate-spin")} />
          </button>
          <button
            type="button"
            onClick={onCreateLoad}
            className="flex min-h-11 items-center gap-1.5 rounded-full bg-[var(--mp-mint)] px-4 text-[15px] font-semibold text-[var(--mp-on-accent)] shadow-sm transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mp-mint)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--mp-bg)]"
          >
            <Plus className="size-4" aria-hidden="true" />
            New load
          </button>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onNewQuote}
          className="flex min-h-11 items-center gap-1.5 rounded-full border border-[var(--mp-hairline)] bg-[var(--mp-surface)] px-3.5 text-sm font-semibold text-[var(--mp-ink)] transition-colors hover:border-[var(--mp-mint)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mp-mint)]"
        >
          <Plus className="size-3.5 text-[var(--mp-mint)]" aria-hidden="true" />
          New quote
        </button>
        {vehiclesAvailable > 0 ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--mp-hairline)] px-3 py-1.5 text-xs font-medium text-[var(--mp-muted)]">
            <Package className="size-3.5 text-[var(--mp-mint)]" aria-hidden="true" />
            {vehiclesAvailable} vehicle{vehiclesAvailable === 1 ? "" : "s"} available
          </span>
        ) : null}
      </div>

      <label className="relative mt-3 block">
        <span className="sr-only">Search transportation</span>
        <Search
          className="pointer-events-none absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-[var(--mp-muted)]"
          aria-hidden="true"
        />
        <input
          type="search"
          value={searchQuery}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={searchPlaceholder}
          className="h-12 w-full rounded-2xl border border-[var(--mp-hairline)] bg-[var(--mp-surface)] pl-11 pr-4 text-[15px] text-[var(--mp-ink)] placeholder:text-[var(--mp-muted)] outline-none transition-colors focus:border-[var(--mp-mint)] focus:ring-2 focus:ring-[var(--mp-mint)]/30"
        />
      </label>
    </header>
  );
}
