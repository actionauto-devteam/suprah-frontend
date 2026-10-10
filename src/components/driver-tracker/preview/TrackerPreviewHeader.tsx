"use client";

import { AlertTriangle, MapPinned, SatelliteDish } from "lucide-react";
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
  onOpenDrivers: () => void;
  onOpenLoads: () => void;
}

/**
 * Phone header for Driver Tracker (deck slide 10) in the Suprah branded panel
 * the desktop header uses, with tappable fleet numbers like the Driver
 * Portal's number cards.
 */
export function TrackerPreviewHeader({
  freshCount,
  totalDrivers,
  activeDrivers,
  onRoute,
  assignedLoads,
  loading,
  attentionCount,
  onShowAttention,
  onOpenDrivers,
  onOpenLoads,
}: TrackerPreviewHeaderProps) {
  const stats = [
    { label: "Drivers", value: totalDrivers, className: "text-[var(--mp-ink)]", hint: "All tracked drivers", onClick: onOpenDrivers },
    { label: "Active", value: activeDrivers, className: "text-[var(--mp-mint)]", hint: "Currently dispatch active", onClick: onOpenDrivers },
    { label: "On route", value: onRoute, className: "text-[var(--mp-ink)]", hint: "Delivering loads", onClick: onOpenDrivers },
    { label: "Loads", value: assignedLoads, className: "text-[var(--mp-purple)]", hint: "Currently assigned loads", onClick: onOpenLoads },
  ];
  const fresh = freshCount > 0;

  return (
    <header className="space-y-2 pt-1 md:hidden">
      <div className={cn(previewStyles.brandPanel, "p-4")}>
        <div className="flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-emerald-500/25 bg-emerald-500/10">
            <MapPinned className="size-5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className={previewStyles.brandEyebrow}>Suprah Driver Operations</p>
            <h1 className="mt-0.5 text-[22px] font-black uppercase leading-none tracking-tight text-[var(--mp-ink)] min-[390px]:text-2xl">
              Driver <span className="text-emerald-700 dark:text-emerald-300">Tracker</span>
            </h1>
          </div>
        </div>
        <p className="mt-2 text-[13px] leading-relaxed text-[var(--mp-muted)]">
          Real-time driver tracking, load assignment, and fleet management
        </p>
        <span
          className={cn(
            "mt-3 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold uppercase",
            fresh
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
              : "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400",
          )}
        >
          <SatelliteDish className="size-3.5" aria-hidden="true" />
          {loading ? "…" : freshCount} fresh GPS
        </span>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {stats.map((stat) => (
          <button
            key={stat.label}
            type="button"
            title={stat.hint}
            onClick={stat.onClick}
            aria-label={`${stat.label}: ${loading ? "loading" : stat.value}. ${stat.hint}. Open ${stat.onClick === onOpenLoads ? "Loads" : "Drivers"}`}
            className={cn(
              previewStyles.tile,
              "flex min-w-0 flex-col items-start gap-1.5 rounded-2xl border border-[var(--mp-hairline)] bg-[var(--mp-surface)] px-2 py-2.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mp-mint)] min-[390px]:px-3",
            )}
          >
            <span className={cn(previewStyles.mono, "break-all text-xl font-semibold leading-none min-[390px]:text-[22px]", stat.className)}>
              {loading ? "…" : stat.value}
            </span>
            <span className="text-xs leading-tight text-[var(--mp-muted)] min-[390px]:text-[13px]">{stat.label}</span>
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={onShowAttention}
        className={cn(
          "flex min-h-11 w-full items-center justify-between gap-2 rounded-2xl border px-4 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mp-mint)]",
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
