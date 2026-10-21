"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import {
  SHADOW_DRAFT_STATUS_LABELS,
  SHADOW_DRAFT_STATUS_STYLES,
  type ShadowDraftStatus,
} from "@/lib/aiShadowDrafts"

export function ShadowStatusBadge({ status, className }: { status: ShadowDraftStatus; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold",
        SHADOW_DRAFT_STATUS_STYLES[status] || SHADOW_DRAFT_STATUS_STYLES.failed,
        className,
      )}
    >
      {SHADOW_DRAFT_STATUS_LABELS[status] || status}
    </span>
  )
}

export function formatHubDate(value?: string | null): string {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  return date.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
}

export function HubCard({ title, description, icon, action, children, className }: {
  title: string
  description?: string
  icon?: React.ReactNode
  action?: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <section className={cn("rounded-2xl border border-border/40 bg-card overflow-hidden", className)}>
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-4 border-b border-border/30 bg-muted/10">
        <div className="flex min-w-0 items-center gap-3">
          {icon && <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">{icon}</div>}
          <div className="min-w-0">
            <h2 className="text-sm font-bold truncate">{title}</h2>
            {description && <p className="text-[11px] text-muted-foreground/70 mt-0.5">{description}</p>}
          </div>
        </div>
        {action}
      </div>
      <div className="p-4 sm:p-6">{children}</div>
    </section>
  )
}

export function HubState({ loading, error, empty, onRetry, children }: {
  loading: boolean
  error: string | null
  empty?: string | false
  onRetry?: () => void
  children: React.ReactNode
}) {
  if (loading) {
    return (
      <div className="space-y-2" aria-busy="true" aria-live="polite">
        {[0, 1, 2].map((row) => <div key={row} className="h-12 rounded-xl bg-muted/50 animate-pulse" />)}
      </div>
    )
  }
  if (error) {
    return (
      <div role="alert" className="flex flex-wrap items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/5 p-3 text-xs text-red-700 dark:text-red-300">
        <span className="min-w-0 flex-1">{error}</span>
        {onRetry && (
          <button type="button" onClick={onRetry} className="rounded-lg border border-red-500/30 px-2.5 py-1 font-semibold hover:bg-red-500/10">
            Try again
          </button>
        )}
      </div>
    )
  }
  if (empty) return <p className="rounded-xl border border-dashed border-border/60 p-6 text-center text-xs text-muted-foreground">{empty}</p>
  return <>{children}</>
}
