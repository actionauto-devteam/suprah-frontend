"use client"

import * as React from "react"
import { BarChart3 } from "lucide-react"
import { useShadowDraftUsage } from "@/hooks/useAiShadowDrafts"
import {
  SHADOW_DRAFT_STATUS_LABELS,
  formatLatency,
  formatTokens,
  type ShadowDraftStatus,
} from "@/lib/aiShadowDrafts"
import { HubCard, HubState, ShadowStatusBadge } from "./ShadowStatusBadge"

const RANGE_OPTIONS = [7, 14, 30] as const

function formatDay(day: string): string {
  const [year, month, date] = day.split("-").map(Number)
  if (!year || !month || !date) return day
  return new Date(Date.UTC(year, month - 1, date, 12)).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" })
}

export function AiUsagePanel({ getToken }: { getToken: () => Promise<string | null> }) {
  const [days, setDays] = React.useState<number>(7)
  const { data, loading, error, reload } = useShadowDraftUsage(getToken, days)
  const percent = data ? Math.min(100, Math.round((data.today.used / Math.max(1, data.today.limit)) * 100)) : 0

  return (
    <HubCard
      title="Usage"
      description="Draft attempts count against a daily limit that resets at midnight in your organization's timezone."
      icon={<BarChart3 className="h-4 w-4 text-primary" />}
      action={
        <div className="flex gap-1" role="group" aria-label="Date range">
          {RANGE_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setDays(option)}
              aria-pressed={days === option}
              className={days === option
                ? "rounded-lg border border-primary/40 bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary"
                : "rounded-lg border border-border/50 px-2.5 py-1 text-[11px] font-semibold text-muted-foreground hover:bg-muted/50"}
            >
              {option} days
            </button>
          ))}
        </div>
      }
    >
      <HubState loading={loading} error={error} onRetry={reload}>
        {data && (
          <div className="space-y-5">
            <div className="rounded-xl border border-border/40 p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-sm font-semibold">Today</p>
                <p className="text-[11px] text-muted-foreground">Timezone: {data.timezone}</p>
              </div>
              <p className="mt-1 text-2xl font-bold tabular-nums">
                {data.today.used} <span className="text-sm font-medium text-muted-foreground">/ {data.today.limit} draft attempts</span>
              </p>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={data.today.used} aria-valuemin={0} aria-valuemax={data.today.limit} aria-label="Daily draft attempts used">
                <div className={percent >= 100 ? "h-full bg-amber-500" : "h-full bg-primary"} style={{ width: `${percent}%` }} />
              </div>
              {percent >= 100 && <p className="mt-2 text-[11px] text-amber-700 dark:text-amber-300">Today&apos;s limit is reached. New messages are skipped until midnight.</p>}
            </div>

            <ul className="divide-y divide-border/40 rounded-xl border border-border/40">
              {data.days.map((day) => {
                const statuses = Object.entries(day.statuses).filter(([, count]) => (count || 0) > 0) as [ShadowDraftStatus, number][]
                return (
                  <li key={day.day} className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold">{formatDay(day.day)}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {day.attempts} attempt{day.attempts === 1 ? "" : "s"} · {day.drafts} record{day.drafts === 1 ? "" : "s"} · avg {formatLatency(day.averageLatencyMs)} · {formatTokens(day.totalTokens)}{typeof day.totalTokens === "number" ? " tokens" : ""}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {statuses.length ? statuses.map(([status, count]) => (
                        <span key={status} title={SHADOW_DRAFT_STATUS_LABELS[status]} className="inline-flex items-center gap-1">
                          <ShadowStatusBadge status={status} />
                          <span className="text-[10px] font-semibold tabular-nums text-muted-foreground">{count}</span>
                        </span>
                      )) : <span className="text-[11px] text-muted-foreground/70">No activity</span>}
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>
        )}
      </HubState>
    </HubCard>
  )
}
