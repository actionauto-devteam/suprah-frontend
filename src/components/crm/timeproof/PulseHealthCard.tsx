"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowRight, CheckCircle2, Gauge, TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { BAND_META, WORK_STATE_META, PRIORITY_META, formatDueLabel } from "@/lib/pulse360";
import { PulseRing } from "@/components/crm/pulse360/PulseRing";
import { usePulse360 } from "@/lib/pulse360-store";

/**
 * Suprah Pulse360 — TimeProof Clock card.
 *
 * Drops into the left column of timeproof-clock/page.tsx, directly under the
 * Share Location card. Reads the same singleton store as the popup, so it
 * needs no props, no fetch, and no token handling — it just renders whatever
 * Pulse360 currently believes.
 *
 * Placement rationale: the clock page is where someone already goes to think
 * about their shift, which makes it the natural home for "here is how your
 * shift is actually going" rather than burying it in a separate module.
 */
export function PulseHealthCard({ className }: { className?: string }) {
  const router = useRouter();
  const { health, alerts, nextActions, ready, enabled } = usePulse360();

  if (!enabled) return null;

  if (!ready || !health) {
    return (
      <div className={cn("w-full rounded-2xl border border-border/40 bg-card p-5", className)}>
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-violet-500/20 bg-violet-600/10">
            <Gauge className="h-4 w-4 text-violet-500" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-black tracking-tight">Pulse360</p>
            <p className="mt-0.5 text-[12px] text-muted-foreground/80">
              {ready ? "Your score appears after the next evaluation" : "Reading your pulse…"}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const bandMeta = BAND_META[health.band];
  const stateMeta = WORK_STATE_META[health.workState];
  const live = alerts.filter((a) => a.status !== "snoozed");
  const topAlert = live[0];
  const topAction = nextActions[0];

  return (
    <div className={cn("w-full overflow-hidden rounded-2xl border border-border/40 bg-card", className)}>
      <div className="flex items-center justify-between gap-3 px-5 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-violet-500/20 bg-violet-600/10">
            <Gauge className="h-4 w-4 text-violet-500" />
          </div>
          <div className="min-w-0 text-left">
            <p className="text-sm font-black tracking-tight text-foreground">Pulse360</p>
            <p className="mt-0.5 text-[12px] text-muted-foreground/80">
              Work health across your assignments
            </p>
          </div>
        </div>

        <span
          className={cn(
            "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-1 text-[11px] font-black uppercase tracking-widest",
            "border-border/40 bg-muted/20",
            stateMeta.text
          )}
        >
          <span
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              stateMeta.dot,
              health.workState === "working" && "animate-pulse motion-reduce:animate-none"
            )}
          />
          {stateMeta.label}
        </span>
      </div>

      <div className="flex items-center gap-4 border-t border-border/30 px-5 py-4">
        <PulseRing
          score={health.score}
          band={health.band}
          components={health.components}
          size={112}
          live={health.workState === "working"}
        />

        <div className="min-w-0 flex-1 space-y-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "rounded-full border px-2 py-0.5 text-[11px] font-black uppercase tracking-widest",
                bandMeta.pill,
                bandMeta.text
              )}
            >
              {bandMeta.label}
            </span>
            {health.delta !== 0 && (
              <span
                className={cn(
                  "inline-flex items-center gap-1 text-[12px] font-bold",
                  health.delta > 0 ? "text-emerald-500" : "text-orange-500"
                )}
              >
                {health.delta > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {health.delta > 0 ? "+" : ""}
                {health.delta}
              </span>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <p className="font-mono text-sm font-black tabular-nums text-foreground">{health.stats.openTasks}</p>
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/75">Open</p>
            </div>
            <div>
              <p
                className={cn(
                  "font-mono text-sm font-black tabular-nums",
                  health.stats.overdueTasks > 0 ? "text-red-500" : "text-emerald-500"
                )}
              >
                {health.stats.overdueTasks}
              </p>
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/75">Overdue</p>
            </div>
            <div>
              <p className="font-mono text-sm font-black tabular-nums text-emerald-500">
                {health.stats.completedInWindow}
              </p>
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/75">Done 14d</p>
            </div>
          </div>
        </div>
      </div>

      {topAlert && (
        <div className="border-t border-border/30 px-5 py-3">
          <div className="flex items-start gap-2.5">
            <AlertTriangle
              className={cn("mt-0.5 h-3.5 w-3.5 shrink-0", PRIORITY_META[topAlert.priority]?.text)}
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-bold text-foreground">{topAlert.title}</p>
              <p className="mt-0.5 line-clamp-2 text-[12px] leading-relaxed text-muted-foreground/85">
                {topAlert.reason}
              </p>
            </div>
            {live.length > 1 && (
              <span className="shrink-0 rounded-full border border-border/40 px-1.5 py-0.5 text-[11px] font-bold text-muted-foreground/80">
                +{live.length - 1}
              </span>
            )}
          </div>
        </div>
      )}

      {topAction ? (
        <button
          onClick={() => router.push(topAction.url)}
          className="flex w-full items-center gap-3 border-t border-border/30 bg-muted/10 px-5 py-3 text-left transition hover:bg-violet-500/5"
        >
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground/75">Do this next</p>
            <p className="mt-0.5 truncate text-[13px] font-bold text-foreground">{topAction.title}</p>
            <p className="mt-0.5 text-[12px] text-muted-foreground/80">
              {formatDueLabel(topAction.hoursUntilDue)}
              {topAction.projectName ? ` · ${topAction.projectName}` : ""}
            </p>
          </div>
          <ArrowRight className="h-3.5 w-3.5 shrink-0 text-violet-500/60" />
        </button>
      ) : (
        <div className="flex items-center gap-2.5 border-t border-border/30 bg-emerald-500/5 px-5 py-3">
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500/70" />
          <p className="text-[13px] font-semibold text-emerald-600 dark:text-emerald-400">
            Nothing outstanding on your assignments.
          </p>
        </div>
      )}

      <button
        onClick={() => router.push("/crm/pulse360")}
        className="flex w-full items-center justify-center gap-1.5 border-t border-border/30 py-2.5 text-[12px] font-bold text-muted-foreground/85 transition hover:bg-muted/20 hover:text-foreground"
      >
        Open Pulse360
        <ArrowRight className="h-3 w-3" />
      </button>
    </div>
  );
}

export default PulseHealthCard;
