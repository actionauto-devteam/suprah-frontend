"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface LeadsActiveFilterChip {
  key: string;
  label: string;
  onRemove: () => void;
  className?: string;
}

export function LeadsActiveFilters({ chips, onClearAll }: { chips: LeadsActiveFilterChip[]; onClearAll: () => void }) {
  if (chips.length === 0) return null;
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-1.5" aria-label="Active filters">
      {chips.map((chip) => (
        <span
          key={chip.key}
          className={cn("inline-flex max-w-full min-w-0 items-center gap-1 rounded-full border py-0.5 pl-2.5 pr-1 text-[11px] font-medium", chip.className)}
          style={{ borderColor: "var(--border-1)", background: "var(--accent-muted)", color: "var(--accent-text)" }}
        >
          <span className="truncate">{chip.label}</span>
          <button
            type="button"
            onClick={chip.onRemove}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition hover:bg-black/5 dark:hover:bg-white/10"
            aria-label={`Remove filter ${chip.label}`}
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      <button
        type="button"
        onClick={onClearAll}
        className="min-h-8 rounded-full px-2 text-[11px] font-semibold"
        style={{ color: "var(--text-secondary)" }}
      >
        Clear all
      </button>
    </div>
  );
}
