import * as React from "react";
import { cn } from "@/lib/utils";
import { APPOINTMENT_STATUS_CONFIG } from "@/lib/appointmentStatus";

export interface AppointmentStatusPillTab {
  key: string; // "all" (or any other non-status grouping key) or a real AppointmentStatus value
  label: string;
  count?: number;
}

interface AppointmentStatusPillsProps {
  tabs: readonly AppointmentStatusPillTab[];
  active: string;
  onChange: (key: string) => void;
  className?: string;
}

export const AppointmentStatusPills = React.memo(
  ({ tabs, active, onChange, className }: AppointmentStatusPillsProps) => {
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
          const config =
            APPOINTMENT_STATUS_CONFIG[tab.key as keyof typeof APPOINTMENT_STATUS_CONFIG];

          return (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onChange(tab.key)}
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-semibold tracking-wide transition-colors",
                isActive
                  ? config
                    ? cn(config.pill, "ring-1 ring-inset ring-current/20")
                    : "bg-foreground/10 text-foreground border-foreground/25 ring-1 ring-inset ring-current/10"
                  : "border-border/60 text-muted-foreground bg-transparent hover:bg-muted/60"
              )}
            >
              {config ? <span className={cn("h-1.5 w-1.5 rounded-full", config.dot)} /> : null}
              {tab.label}
              {typeof tab.count === "number" ? (
                <span
                  className={cn(
                    "ml-0.5 rounded-full px-1.5 text-[10px] leading-4",
                    isActive ? "bg-current/15" : "bg-muted"
                  )}
                >
                  {tab.count}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    );
  }
);

AppointmentStatusPills.displayName = "AppointmentStatusPills";
