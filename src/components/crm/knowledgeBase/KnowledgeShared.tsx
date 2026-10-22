"use client"

import * as React from "react"
import { AlertTriangle, Info } from "lucide-react"
import { cn } from "@/lib/utils"
import { KB_TONE_STYLES, kbFieldLabel, type KbDisplay, type KbIssue, type KbLocation, type KbLocationScope } from "@/lib/aiKnowledgeBase"

export function KbBadge({ display, className }: { display: KbDisplay; className?: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold", KB_TONE_STYLES[display.tone], className)}>
      {display.label}
    </span>
  )
}

export function KbPill({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full border border-border/50 bg-muted/30 px-2 py-0.5 text-[10px] font-medium text-muted-foreground", className)}>
      {children}
    </span>
  )
}

export function KbIssueList({ issues, title, tone = "error", id }: { issues: KbIssue[]; title?: string; tone?: "error" | "warning"; id?: string }) {
  if (!issues.length) return null
  const styles = tone === "error"
    ? "border-red-500/30 bg-red-500/5 text-red-800 dark:text-red-200"
    : "border-amber-500/30 bg-amber-500/5 text-amber-800 dark:text-amber-200"
  return (
    <div id={id} role={tone === "error" ? "alert" : "status"} className={cn("rounded-lg border p-3 text-[11px]", styles)}>
      <div className="flex items-start gap-2">
        {tone === "error" ? <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> : <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />}
        <div className="min-w-0 space-y-1">
          {title && <p className="font-semibold">{title}</p>}
          <ul className="space-y-0.5">
            {issues.map((issue, index) => (
              <li key={`${issue.field}-${issue.code}-${index}`}>
                <span className="font-semibold">{kbFieldLabel(issue.field)}:</span> {issue.message}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}

export function KbFieldErrors({ issues, id }: { issues: KbIssue[]; id?: string }) {
  if (!issues.length) return null
  return (
    <div id={id} className="space-y-0.5">
      {issues.map((issue, index) => <p key={index} className="text-[11px] text-red-600 dark:text-red-400">{issue.message}</p>)}
    </div>
  )
}

export function issuesFor(issues: KbIssue[], field: string): KbIssue[] {
  return issues.filter((issue) => issue.field === field || issue.field.startsWith(`${field}.`))
}

export function KbLocationPicker({ idPrefix, value, onChange, locations, disabled, issues }: {
  idPrefix: string
  value: { scope: "" | "all" | "locations"; locationIds: string[] }
  onChange: (next: { scope: "" | "all" | "locations"; locationIds: string[] }) => void
  locations: KbLocation[]
  disabled?: boolean
  issues: KbIssue[]
}) {
  const active = locations.filter((location) => location.status === "active")
  const selectedArchived = locations.filter((location) => location.status === "archived" && value.locationIds.includes(location.id))
  const toggle = (id: string, checked: boolean) => {
    const next = checked ? Array.from(new Set([...value.locationIds, id])) : value.locationIds.filter((item) => item !== id)
    onChange({ scope: "locations", locationIds: next })
  }
  const errorId = `${idPrefix}-locations-errors`
  return (
    <fieldset className="space-y-2" aria-describedby={issues.length ? errorId : undefined}>
      <legend className="text-xs font-semibold">Locations</legend>
      <p className="text-[11px] text-muted-foreground">Choose All Locations or the specific stores this applies to. Nothing is chosen for you.</p>
      <div className="flex flex-col gap-2 sm:flex-row sm:gap-4">
        <label className="flex items-center gap-2 text-xs">
          <input
            type="radio"
            name={`${idPrefix}-scope`}
            checked={value.scope === "all"}
            disabled={disabled}
            onChange={() => onChange({ scope: "all", locationIds: [] })}
          />
          All Locations
        </label>
        <label className="flex items-center gap-2 text-xs">
          <input
            type="radio"
            name={`${idPrefix}-scope`}
            checked={value.scope === "locations"}
            disabled={disabled || !active.length}
            onChange={() => onChange({ scope: "locations", locationIds: value.locationIds })}
          />
          Specific locations
        </label>
      </div>
      {value.scope === "locations" && (
        <div className="grid grid-cols-1 gap-1.5 rounded-lg border border-border/40 p-2 sm:grid-cols-2" role="group" aria-label="Specific locations">
          {active.map((location) => (
            <label key={location.id} className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={value.locationIds.includes(location.id)}
                disabled={disabled}
                onChange={(event) => toggle(location.id, event.target.checked)}
              />
              <span className="truncate">{location.name}</span>
            </label>
          ))}
          {selectedArchived.map((location) => (
            <label key={location.id} className="flex items-center gap-2 text-xs text-muted-foreground">
              <input type="checkbox" checked disabled={disabled} onChange={(event) => toggle(location.id, event.target.checked)} />
              <span className="truncate">{location.name} (archived, remove it)</span>
            </label>
          ))}
          {!active.length && <p className="text-[11px] text-muted-foreground">There are no active locations. Use All Locations, or ask an admin to add locations.</p>}
        </div>
      )}
      <KbFieldErrors id={errorId} issues={issues} />
    </fieldset>
  )
}

export function scopeFromPicker(value: { scope: "" | "all" | "locations"; locationIds: string[] }): KbLocationScope | undefined {
  if (value.scope === "all") return { scope: "all", locationIds: [] }
  if (value.scope === "locations") return { scope: "locations", locationIds: value.locationIds }
  return undefined
}

export function formatKbDate(value?: string | null): string {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  return date.toLocaleString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })
}
