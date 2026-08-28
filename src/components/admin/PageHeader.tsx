import React from "react";
import { ADMIN_EYEBROW_CLASS, ADMIN_HEADER_PANEL_CLASS } from "./theme";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  eyebrow: string;
  title: string;
  accent?: string;
  meta?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  eyebrow,
  title,
  accent,
  meta,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn(ADMIN_HEADER_PANEL_CLASS, className)}>
      <div className="absolute inset-x-0 top-0 h-0.5 bg-linear-to-r from-primary via-emerald-400 to-primary/0" />
      <div className="pointer-events-none absolute -top-10 -right-10 h-52 w-52 rounded-full bg-primary/6 blur-3xl" />

      <div className="relative px-4 sm:px-6 py-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 space-y-2">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
              </span>
              <span className={ADMIN_EYEBROW_CLASS}>{eyebrow}</span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black uppercase leading-none tracking-tight text-foreground">
              {title}{" "}
              {accent && <span className="text-primary">{accent}</span>}
            </h1>

            {meta && (
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                {meta}
              </div>
            )}
          </div>

          {actions && (
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {actions}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function PageHeaderPill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs font-bold tabular-nums text-foreground">
      {children}
    </span>
  );
}
