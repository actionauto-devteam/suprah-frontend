"use client"

import * as React from "react"
import { ChevronDown, Clock3 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { AI_AGENT_ASSIGNEE, ON_TRIGGER, timingLabel, type AutomationOptions, type StepTiming } from "@/lib/crmAutomations"

const FIELD_CLASS = "h-9 w-full rounded-lg border border-input bg-background px-2.5 text-sm disabled:opacity-60"
const LIMITS: Record<string, number> = { minutes: 1440, hours: 720, days: 365 }

export function AssignToSelect({ stepId, value, options, readOnly, onChange }: {
  stepId: string
  value: string | null
  options: AutomationOptions
  readOnly: boolean
  onChange: (value: string | null) => void
}) {
  return (
    <div className="space-y-1">
      <label htmlFor={`step-${stepId}-assign`} className="text-xs font-semibold">
        Assign to <span className="font-normal text-muted-foreground">(optional)</span>
      </label>
      <select id={`step-${stepId}-assign`} className={FIELD_CLASS} value={value || ""} disabled={readOnly} onChange={(event) => onChange(event.target.value || null)}>
        <option value="">No assignment</option>
        <option value={AI_AGENT_ASSIGNEE}>{options.agentName} (AI agent)</option>
        {options.team.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}
      </select>
    </div>
  )
}

export function TimingEditor({ stepId, index, timing, allowBefore, readOnly, onChange }: {
  stepId: string
  index: number
  timing: StepTiming
  allowBefore: boolean
  readOnly: boolean
  onChange: (timing: StepTiming) => void
}) {
  const [open, setOpen] = React.useState(false)
  const [draft, setDraft] = React.useState<StepTiming>(timing)
  const needsAmount = draft.when !== "on"
  const unit = draft.unit || "minutes"
  const amountValid = !needsAmount || (Number.isInteger(draft.amount) && (draft.amount || 0) >= 1 && (draft.amount || 0) <= LIMITS[unit])
  const beforeBlocked = draft.when === "before" && !allowBefore
  const ready = amountValid && !beforeBlocked

  return (
    <div className="flex min-w-0 items-center gap-2">
      <Clock3 className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      <Popover
        open={open}
        onOpenChange={(next) => {
          if (next) setDraft(timing)
          setOpen(next)
        }}
      >
        <PopoverTrigger disabled={readOnly} aria-label={`Edit timing for step ${index + 1}`} className="min-w-0">
          <span className={cn("inline-flex max-w-full items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold", !allowBefore && timing.when === "before" ? "border-red-400/60 bg-red-500/10 text-red-700 dark:text-red-300" : "border-primary/30 bg-primary/10 text-primary")}>
            <span className="truncate">{timingLabel(timing)}</span>
            {!readOnly && <ChevronDown className="h-3 w-3 shrink-0" aria-hidden="true" />}
          </span>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-80 max-w-[calc(100vw-2rem)] p-0">
          <div className="flex items-center gap-2 border-b border-border/40 px-4 py-3">
            <Clock3 className="h-4 w-4 text-primary" aria-hidden="true" />
            <p className="text-sm font-bold">Edit timing rules</p>
          </div>
          <div className="space-y-2 px-4 py-3">
            <label htmlFor={`step-${stepId}-when`} className="sr-only">When to deliver</label>
            <select
              id={`step-${stepId}-when`}
              className={FIELD_CLASS}
              value={draft.when}
              onChange={(event) => {
                const when = event.target.value as StepTiming["when"]
                setDraft(when === "on" ? ON_TRIGGER : { when, amount: draft.amount || 1, unit: draft.unit || "hours" })
              }}
            >
              <option value="before" disabled={!allowBefore}>Deliver before trigger{allowBefore ? "" : " (appointment or date triggers only)"}</option>
              <option value="on">Deliver on trigger</option>
              <option value="after">Deliver after trigger</option>
            </select>
            {needsAmount && (
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={1}
                  aria-label="How long"
                  value={draft.amount ?? ""}
                  onChange={(event) => setDraft((current) => ({ ...current, amount: event.target.value === "" ? null : Math.round(Number(event.target.value)) }))}
                  className="h-9 w-20 text-sm"
                />
                <label htmlFor={`step-${stepId}-unit`} className="sr-only">Unit</label>
                <select id={`step-${stepId}-unit`} className={FIELD_CLASS} value={unit} onChange={(event) => setDraft((current) => ({ ...current, unit: event.target.value as StepTiming["unit"] }))}>
                  <option value="minutes">minutes</option>
                  <option value="hours">hours</option>
                  <option value="days">days</option>
                </select>
                <span className="shrink-0 text-xs text-muted-foreground">{draft.when === "before" ? "before" : "after"}</span>
              </div>
            )}
            {!amountValid && <p className="text-[11px] text-red-600 dark:text-red-400">Enter 1 to {LIMITS[unit]} {unit}.</p>}
            {beforeBlocked && <p className="text-[11px] text-red-600 dark:text-red-400">Before only works with appointment or On a Date triggers.</p>}
          </div>
          <div className="flex justify-end gap-2 border-t border-border/40 px-4 py-3">
            <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              type="button"
              size="sm"
              disabled={!ready}
              onClick={() => {
                onChange(draft.when === "on" ? ON_TRIGGER : { when: draft.when, amount: draft.amount, unit })
                setOpen(false)
              }}
            >
              Done
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
