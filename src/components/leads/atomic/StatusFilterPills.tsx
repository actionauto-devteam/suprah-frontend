import * as React from "react";
import { cn } from "@/lib/utils";
import { STATUS_CONFIG } from "./StatusPill";

export interface StatusFilterTab {
  key: string | null;
  label: string;
}

interface StatusFilterPillsProps {
  tabs: readonly StatusFilterTab[];
  active: string | null;
  onChange: (key: string | null) => void;
  counts?: Record<string, number>;
  className?: string;
}

export const StatusFilterPills = React.memo(
  ({ tabs, active, onChange, counts, className }: StatusFilterPillsProps) => {
    return (
      <div
        className={cn(
          "flex shrink-0 items-center gap-1.5 overflow-x-auto px-0.5 py-0.5 [scrollbar-width:thin]",
          className
        )}
        role="tablist"
        aria-label="Filter by status"
      >
        {tabs.map((tab) => {
          const isActive = active === tab.key;
          const config = tab.key ? STATUS_CONFIG[tab.key] : null;
          const count = tab.key ? counts?.[tab.key] : undefined;

          return (
            <button
              key={tab.label}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onChange(tab.key)}
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-semibold tracking-wide transition-colors",
                isActive
                  ? config
                    ? cn(config.bg, config.text, config.border, "ring-1 ring-inset ring-current/20")
                    : "bg-foreground/10 text-foreground border-foreground/25 ring-1 ring-inset ring-current/10"
                  : "border-border/60 text-muted-foreground bg-transparent hover:bg-muted/60"
              )}
            >
              {config ? (
                <span className={cn("h-1.5 w-1.5 rounded-full", config.dot)} />
              ) : null}
              {tab.label}
              {typeof count === "number" ? (
                <span
                  className={cn(
                    "ml-0.5 rounded-full px-1.5 text-[10px] leading-4",
                    isActive ? "bg-current/15" : "bg-muted"
                  )}
                >
                  {count}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    );
  }
);

StatusFilterPills.displayName = "StatusFilterPills";
