"use client";

import * as React from "react";
import { ChevronRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export function ini(n?: string) {
  return (n || "U")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** Consistent glass card shell used across the redesigned dashboard widgets. */
export function Panel({
  title,
  icon: Icon,
  accent = "text-primary",
  action,
  onAction,
  children,
  className = "",
}: {
  title: string;
  icon: LucideIcon;
  accent?: string;
  action?: string;
  onAction?: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`relative flex h-full flex-col overflow-hidden rounded-3xl border border-border/40 bg-card/40 backdrop-blur-md shadow-sm ${className}`}
    >
      <div className="flex items-center justify-between gap-3 px-5 pt-4 pb-3 border-b border-border/20">
        <div className="flex items-center gap-2 min-w-0">
          <Icon className={`size-4 shrink-0 ${accent}`} />
          <h2 className="text-sm font-black tracking-tight truncate">{title}</h2>
        </div>
        {action && (
          <button
            onClick={onAction}
            className="flex items-center gap-1 text-[11px] font-bold text-muted-foreground/60 hover:text-primary transition-colors shrink-0"
          >
            {action}
            <ChevronRight className="size-3" />
          </button>
        )}
      </div>
      <div className="flex-1 p-5">{children}</div>
    </section>
  );
}

export function PanelSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3 animate-pulse">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-10 rounded-xl bg-muted/40" />
      ))}
    </div>
  );
}
