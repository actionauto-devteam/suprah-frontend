"use client";

import * as React from "react";
import { FileText, Globe, Truck } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TransportationView } from "@/components/transportation/TransportationMobileFilters";

interface TransportationMobileViewSwitcherProps {
  activeView: TransportationView;
  onViewChange: (view: TransportationView) => void;
}

const VIEWS = [
  { key: "shipments", label: "My Loads", icon: Truck },
  { key: "drafts", label: "Quotes", icon: FileText },
  { key: "load-board", label: "Board", icon: Globe },
] as const;

export function TransportationMobileViewSwitcher({
  activeView,
  onViewChange,
}: TransportationMobileViewSwitcherProps) {
  return (
    <div
      role="tablist"
      aria-label="Transportation views"
      className="md:hidden grid grid-cols-3 gap-1 rounded-xl border border-border/50 bg-background/60 p-1"
    >
      {VIEWS.map(({ key, label, icon: Icon }) => {
        const active = activeView === key;

        return (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onViewChange(key)}
            className={cn(
              "flex h-12 min-w-0 touch-manipulation flex-col items-center justify-center gap-1 rounded-lg border px-2 transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50",
              active
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : "border-transparent text-muted-foreground hover:bg-muted/50 hover:text-foreground",
            )}
          >
            <Icon className="size-3.5 shrink-0" />
            <span className="truncate text-[11px] font-black uppercase tracking-[0.06em] leading-none">
              {label}
            </span>
          </button>
        );
      })}
    </div>
  );
}