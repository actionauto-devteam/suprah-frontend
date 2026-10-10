"use client";

import { ChevronUp } from "lucide-react";
import type { TransportationView } from "@/components/transportation/TransportationMobileFilters";

interface TransportationPreviewFilterPanelProps {
  activeTab: TransportationView;
  origin: string;
  destination: string;
  visibility: string;
  resultCount: number;
  onOriginChange: (value: string) => void;
  onDestinationChange: (value: string) => void;
  onVisibilityChange: (value: string) => void;
  onClearFilters: () => void;
  onClose: () => void;
}

const fieldClass =
  "h-11 w-full rounded-xl border border-[var(--mp-hairline)] bg-[var(--mp-bg)] px-3 text-[15px] text-[var(--mp-ink)] placeholder:text-[var(--mp-muted)] outline-none focus:border-[var(--mp-mint)] focus:ring-2 focus:ring-[var(--mp-mint)]/30";

const labelClass =
  "mb-1.5 block text-xs font-semibold uppercase tracking-[0.08em] text-[var(--mp-muted)]";

/** Origin, destination and visibility filters: the same fields as today's Filters panel. */
export function TransportationPreviewFilterPanel({
  activeTab,
  origin,
  destination,
  visibility,
  resultCount,
  onOriginChange,
  onDestinationChange,
  onVisibilityChange,
  onClearFilters,
  onClose,
}: TransportationPreviewFilterPanelProps) {
  const noun = activeTab === "drafts" ? "quotes" : "loads";

  return (
    <section
      id="transportation-preview-filters"
      aria-label="Transportation filters"
      className="mx-4 mt-2 overflow-hidden rounded-[18px] border border-[var(--mp-hairline)] bg-[var(--mp-surface)]"
    >
      <div className="flex items-center justify-between gap-3 border-b border-[var(--mp-hairline)] px-4 py-2">
        <div className="min-w-0">
          <p className="text-[15px] font-semibold text-[var(--mp-ink)]">Filters</p>
          <p className="text-xs text-[var(--mp-muted)]">
            {resultCount} {noun} match
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex min-h-11 items-center gap-1.5 rounded-xl px-3 text-sm text-[var(--mp-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mp-mint)]"
        >
          <ChevronUp className="size-4" aria-hidden="true" />
          Hide
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 p-4">
        <label className="min-w-0">
          <span className={labelClass}>Origin</span>
          <input
            value={origin}
            onChange={(event) => onOriginChange(event.target.value)}
            placeholder="All Origins"
            className={fieldClass}
          />
        </label>
        <label className="min-w-0">
          <span className={labelClass}>Destination</span>
          <input
            value={destination}
            onChange={(event) => onDestinationChange(event.target.value)}
            placeholder="All Destinations"
            className={fieldClass}
          />
        </label>
        {activeTab !== "drafts" ? (
          <label className="col-span-2 min-w-0">
            <span className={labelClass}>Visibility</span>
            <select
              value={visibility}
              onChange={(event) => onVisibilityChange(event.target.value)}
              className={fieldClass}
            >
              <option value="all">All</option>
              <option value="public">Public</option>
              <option value="private">Private</option>
            </select>
          </label>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-2 border-t border-[var(--mp-hairline)] px-4 py-3">
        <button
          type="button"
          onClick={onClearFilters}
          className="min-h-11 rounded-xl border border-[var(--mp-hairline)] text-sm font-semibold text-[var(--mp-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mp-mint)]"
        >
          Clear Filters
        </button>
        <button
          type="button"
          onClick={onClose}
          className="min-h-11 rounded-xl bg-[var(--mp-mint)] text-sm font-semibold text-[var(--mp-on-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mp-mint)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--mp-surface)]"
        >
          Show {resultCount}
        </button>
      </div>
    </section>
  );
}
