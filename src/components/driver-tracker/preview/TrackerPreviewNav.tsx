"use client";

import { cn } from "@/lib/utils";
import type { TrackerMobileView } from "@/hooks/useTrackerMobileNavigation";

const VIEWS: { key: TrackerMobileView; label: string }[] = [
  { key: "map", label: "Map" },
  { key: "drivers", label: "Drivers" },
  { key: "loads", label: "Loads" },
];

interface TrackerPreviewNavProps {
  view: TrackerMobileView;
  onViewChange: (view: TrackerMobileView) => void;
  /** Shown while a driver is selected and the map view is not open. */
  selectedDriverName?: string | null;
  onOpenSelectedDriver?: () => void;
  onViewSelectedOnMap?: () => void;
}

/** Map · Drivers · Loads, plus the selected-driver shortcut (same as today). */
export function TrackerPreviewNav({
  view,
  onViewChange,
  selectedDriverName,
  onOpenSelectedDriver,
  onViewSelectedOnMap,
}: TrackerPreviewNavProps) {
  return (
    <>
      <nav
        aria-label="Driver Tracker views"
        className="grid grid-cols-3 gap-1 rounded-2xl border border-[var(--mp-hairline)] bg-[var(--mp-surface)] p-1"
      >
        {VIEWS.map((item) => {
          const active = view === item.key;
          return (
            <button
              key={item.key}
              type="button"
              aria-pressed={active}
              aria-controls={`tracker-${item.key}-view`}
              onClick={() => onViewChange(item.key)}
              className={cn(
                "min-h-11 rounded-xl px-2 text-[15px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mp-mint)]",
                active
                  ? "bg-[var(--mp-surface-2)] text-[var(--mp-ink)] shadow-sm"
                  : "text-[var(--mp-muted)] hover:text-[var(--mp-ink)]",
              )}
            >
              {item.label}
            </button>
          );
        })}
      </nav>
      {selectedDriverName && view !== "map" ? (
        <div className="mt-2 flex min-w-0 items-center gap-2">
          <button
            type="button"
            onClick={onOpenSelectedDriver}
            className="min-h-11 min-w-0 flex-1 rounded-xl px-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mp-mint)]"
          >
            <span className="block text-xs text-[var(--mp-muted)]">Selected driver · Open workspace</span>
            <span className="block truncate text-sm font-semibold text-[var(--mp-ink)]">{selectedDriverName}</span>
          </button>
          <button
            type="button"
            onClick={onViewSelectedOnMap}
            className="min-h-11 shrink-0 rounded-xl border border-[var(--mp-hairline)] px-3 text-xs font-semibold text-[var(--mp-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mp-mint)]"
          >
            View map
          </button>
        </div>
      ) : null}
    </>
  );
}
