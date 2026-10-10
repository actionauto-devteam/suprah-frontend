"use client";

import * as React from "react";
import { SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { LOAD_STATUS_ORDER, loadStatusTone, quoteStatusTone } from "@/lib/load-status-tone";
import type { LoadStats } from "@/lib/api/loads";
import { previewStyles, previewTone } from "@/components/mobile-preview/MobilePreviewScope";
import type { TransportationView } from "@/components/transportation/TransportationMobileFilters";

const QUOTE_STATUSES = [
  { key: "pending", label: "Pending" },
  { key: "accepted", label: "Accepted" },
  { key: "booked", label: "Booked" },
  { key: "rejected", label: "Rejected" },
] as const;

interface TransportationPreviewStatusChipsProps {
  activeTab: TransportationView;
  selectedStatus: string;
  onStatusChange: (status: string) => void;
  selectedQuoteStatus: string;
  onQuoteStatusChange: (status: string) => void;
  stats: LoadStats;
  boardStats?: LoadStats;
  quoteStats?: Record<string, number>;
  filterCount: number;
  filtersOpen: boolean;
  onToggleFilters: () => void;
}

function Chip({
  label,
  count,
  active,
  tone,
  strike,
  onSelect,
}: {
  label: string;
  count: number;
  active: boolean;
  tone: ReturnType<typeof previewTone> | null;
  strike?: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      className={cn(
        "flex min-h-11 shrink-0 items-center gap-2 rounded-full border px-4 text-[15px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mp-mint)]",
        active
          ? "border-transparent bg-[var(--mp-mint)] text-[var(--mp-on-accent)]"
          : "border-[var(--mp-hairline)] bg-[var(--mp-surface)] text-[var(--mp-ink)]",
        !active && count === 0 && "text-[var(--mp-muted)]",
      )}
    >
      {tone && !active ? (
        <span className={cn("size-2 rounded-full", tone.tone, tone.fill)} aria-hidden="true" />
      ) : null}
      <span className={cn(strike && "line-through decoration-1")}>{label}</span>
      <span
        className={cn(
          previewStyles.mono,
          "text-sm",
          active ? "text-[var(--mp-on-accent)]" : "text-[var(--mp-muted)]",
        )}
      >
        {count}
      </span>
    </button>
  );
}

/**
 * Status chips with live counts (deck slide 8). Same statuses and counts as
 * today's Status panel; the Filters chip opens the origin/destination/visibility
 * filters.
 */
export function TransportationPreviewStatusChips({
  activeTab,
  selectedStatus,
  onStatusChange,
  selectedQuoteStatus,
  onQuoteStatusChange,
  stats,
  boardStats,
  quoteStats,
  filterCount,
  filtersOpen,
  onToggleFilters,
}: TransportationPreviewStatusChipsProps) {
  const isQuotes = activeTab === "drafts";
  const currentStats = (
    activeTab === "load-board" ? boardStats || stats : stats
  ) as unknown as Record<string, number | undefined>;
  const total = Number(isQuotes ? quoteStats?.all ?? 0 : currentStats.all ?? 0);

  return (
    <div className="pt-3">
      <div
        role="group"
        aria-label={isQuotes ? "Quote status" : "Load status"}
        className={cn(previewStyles.hideScrollbar, "flex gap-2 overflow-x-auto px-4 pb-1")}
      >
        <button
          type="button"
          onClick={onToggleFilters}
          aria-expanded={filtersOpen}
          aria-controls="transportation-preview-filters"
          className={cn(
            "flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-[15px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mp-mint)]",
            filtersOpen || filterCount > 0
              ? "border-[var(--mp-mint)] text-[var(--mp-ink)]"
              : "border-[var(--mp-hairline)] text-[var(--mp-muted)]",
            "bg-[var(--mp-surface)]",
          )}
        >
          <SlidersHorizontal className="size-4" aria-hidden="true" />
          Filters
          {filterCount > 0 ? (
            <span className={cn(previewStyles.mono, "text-sm text-[var(--mp-mint)]")}>{filterCount}</span>
          ) : null}
        </button>

        {isQuotes ? (
          <>
            <Chip
              label="All"
              count={total}
              active={selectedQuoteStatus === "all"}
              tone={null}
              onSelect={() => onQuoteStatusChange("all")}
            />
            {QUOTE_STATUSES.map(({ key, label }) => (
              <Chip
                key={key}
                label={label}
                count={Number(quoteStats?.[key] ?? 0)}
                active={selectedQuoteStatus === key}
                tone={previewTone(quoteStatusTone(key))}
                onSelect={() => onQuoteStatusChange(key)}
              />
            ))}
          </>
        ) : (
          <>
            <Chip
              label="All"
              count={total}
              active={selectedStatus === "all"}
              tone={null}
              onSelect={() => onStatusChange("all")}
            />
            {LOAD_STATUS_ORDER.map((status) => (
              <Chip
                key={status}
                label={status}
                count={Number(currentStats[status] ?? 0)}
                active={selectedStatus === status}
                tone={previewTone(loadStatusTone(status))}
                strike={status === "Cancelled"}
                onSelect={() => onStatusChange(status)}
              />
            ))}
          </>
        )}
      </div>
      {activeTab === "load-board" ? (
        <p className="px-4 pt-1 text-xs text-[var(--mp-muted)]">
          Board counts show vehicles, not loads.
        </p>
      ) : null}
    </div>
  );
}
