"use client";

import { AlertTriangle, SatelliteDish } from "lucide-react";
import { cn } from "@/lib/utils";
import { previewStyles } from "@/components/mobile-preview/MobilePreviewScope";

interface TrackerPreviewHeaderProps {
  /** Drivers whose location is fresh right now (same count as the map's Fresh GPS pill). */
  freshCount: number;
  totalDrivers: number;
  activeDrivers: number;
  onRoute: number;
  assignedLoads: number;
  loading: boolean;
  attentionCount: number;
  onShowAttention: () => void;
}

/** Phone header for Driver Tracker (deck slide 10): title, fresh GPS, fleet stats. */
export function TrackerPreviewHeader({
  freshCount,
  totalDrivers,
  activeDrivers,
  onRoute,
  assignedLoads,
  loading,
  attentionCount,
  onShowAttention,
}: TrackerPreviewHeaderProps) {
  const stats = [
    { label: "Drivers", value: totalDrivers, className: "text-[var(--mp-ink)]", title: "All tracked drivers" },
    { label: "Active", value: activeDrivers, className: "text-[var(--mp-mint)]", title: "Currently dispatch active" },
    { label: "On route", value: onRoute, className: "text-[var(--mp-ink)]", title: "Delivering loads" },
    { label: "Loads", value: assignedLoads, className: "text-[var(--mp-purple)]", title: "Currently assigned loads" },
  ];
  const fresh = freshCount > 0;

  return (
    <header className="pt-2 md:hidden">
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
        <div className="min-w-0">
          <h1 className="text-[22px] font-bold leading-tight tracking-tight text-[var(--mp-ink)] min-[390px]:text-[26px]">
            Driver Tracker
          </h1>
          <p className={cn(previewStyles.mono, "mt-1 text-[11px] uppercase tracking-[0.16em] text-[var(--mp-muted)]")}>
            Fleet operations · Live GPS
          </p>
        </div>
        <span
          className={cn(
            previewStyles.mono,
            "mt-1 flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs uppercase tracking-[0.08em]",
            fresh
              ? "border-[var(--mp-mint)]/40 bg-[var(--mp-mint)]/10 text-[var(--mp-mint)]"
              : "border-[var(--mp-amber)]/40 bg-[var(--mp-amber)]/10 text-[var(--mp-amber)]",
          )}
        >
          <SatelliteDish className="size-3.5" aria-hidden="true" />
          {loading ? "…" : freshCount} fresh GPS
        </span>
      </div>

      <dl className="mt-3 grid grid-cols-4 gap-2">
        {stats.map((stat) => (
          <div
            key={stat.label}
            title={stat.title}
            className="flex min-w-0 flex-col-reverse gap-1.5 rounded-2xl border border-[var(--mp-hairline)] bg-[var(--mp-surface)] px-2 py-2.5 min-[390px]:px-3"
          >
            {/* dt before dd for screen readers; shown number-first. */}
            <dt className="text-xs leading-tight text-[var(--mp-muted)] min-[390px]:text-[13px]">{stat.label}</dt>
            <dd className={cn(previewStyles.mono, "break-all text-xl font-semibold leading-none min-[390px]:text-[22px]", stat.className)}>
              {loading ? "…" : stat.value}
            </dd>
          </div>
        ))}
      </dl>

      <button
        type="button"
        onClick={onShowAttention}
        className={cn(
          "mt-2 flex min-h-11 w-full items-center justify-between gap-2 rounded-2xl border px-4 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mp-mint)]",
          attentionCount > 0
            ? "border-[var(--mp-amber)]/40 bg-[var(--mp-amber)]/10 text-[var(--mp-amber)]"
            : "border-[var(--mp-hairline)] bg-[var(--mp-surface)] text-[var(--mp-muted)]",
        )}
      >
        <span className="flex items-center gap-2">
          <AlertTriangle className="size-4" aria-hidden="true" />
          Needs attention
        </span>
        <span className={previewStyles.mono}>{loading ? "…" : attentionCount}</span>
      </button>
    </header>
  );
}
