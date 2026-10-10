"use client";

import { cn } from "@/lib/utils";
import type { TransportationView } from "@/components/transportation/TransportationMobileFilters";

const VIEWS: { key: TransportationView; label: string }[] = [
  { key: "shipments", label: "My loads" },
  { key: "drafts", label: "Quotes" },
  { key: "load-board", label: "Board" },
];

/** Segmented control: My loads · Quotes · Board (same views as today). */
export function TransportationPreviewViewSwitcher({
  activeView,
  onViewChange,
}: {
  activeView: TransportationView;
  onViewChange: (view: TransportationView) => void;
}) {
  return (
    <nav
      aria-label="Transportation views"
      className="mx-4 grid grid-cols-3 gap-1 rounded-2xl border border-[var(--mp-hairline)] bg-[var(--mp-surface)] p-1"
    >
      {VIEWS.map(({ key, label }) => {
        const active = activeView === key;
        return (
          <button
            key={key}
            type="button"
            aria-pressed={active}
            onClick={() => onViewChange(key)}
            className={cn(
              "min-h-11 rounded-xl px-2 text-[15px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mp-mint)]",
              active
                ? "bg-[var(--mp-surface-2)] text-[var(--mp-ink)] shadow-sm"
                : "text-[var(--mp-muted)] hover:text-[var(--mp-ink)]",
            )}
          >
            {label}
          </button>
        );
      })}
    </nav>
  );
}
