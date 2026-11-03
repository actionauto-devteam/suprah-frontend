"use client"

import * as React from "react"
import { ChevronDown, Repeat, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { repeatLabel, type AudienceField, type AutomationTrigger } from "@/lib/crmAutomations"

type RepeatValue = AutomationTrigger["repeat"]

function PerFieldsPicker({ fields, value, onChange }: { fields: AudienceField[]; value: string[]; onChange: (keys: string[]) => void }) {
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState("")
  const needle = query.trim().toLowerCase()
  const visible = fields.filter((field) => field.label.toLowerCase().includes(needle))
  const allChecked = fields.length > 0 && fields.every((field) => value.includes(field.key))
  const label = value.length === 0
    ? "Pick fields"
    : value.length === 1
      ? fields.find((field) => field.key === value[0])?.label || "1 field"
      : `${value.length} fields`

  return (
    <div className="min-w-0 flex-1">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-label="Count the limit per"
        className="flex h-8 w-full items-center justify-between gap-1 rounded-lg border border-input bg-background px-2 text-left text-xs font-semibold"
      >
        <span className="truncate">{label}</span>
        <ChevronDown className={cn("h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} aria-hidden="true" />
      </button>
      {open && (
        <div className="mt-1 rounded-lg border border-border/60 bg-popover p-1.5 shadow-md">
          <div className="relative">
            <label htmlFor="automation-repeat-search" className="sr-only">Search fields</label>
            <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input id="automation-repeat-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search" className="h-8 pl-7 text-xs" autoFocus />
          </div>
          <div className="mt-1 max-h-48 space-y-0.5 overflow-y-auto">
            <label className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs font-semibold hover:bg-muted/60">
              <input type="checkbox" checked={allChecked} onChange={(event) => onChange(event.target.checked ? fields.map((field) => field.key) : [])} />
              Select all
            </label>
            {visible.map((field) => (
              <label key={field.key} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-muted/60">
                <input
                  type="checkbox"
                  checked={value.includes(field.key)}
                  onChange={(event) => onChange(event.target.checked ? [...value, field.key] : value.filter((key) => key !== field.key))}
                />
                {field.label}
              </label>
            ))}
            {visible.length === 0 && <p className="px-2 py-2 text-xs text-muted-foreground">No fields match.</p>}
          </div>
        </div>
      )}
    </div>
  )
}

export function RepeatEditor({ repeat, fields, readOnly, onChange }: {
  repeat: RepeatValue
  fields: AudienceField[]
  readOnly: boolean
  onChange: (repeat: RepeatValue) => void
}) {
  const [open, setOpen] = React.useState(false)
  const [draft, setDraft] = React.useState<RepeatValue>(repeat)
  const limited = draft.mode === "once_per_days"
  const daysValid = Number.isInteger(draft.days) && (draft.days || 0) >= 1 && (draft.days || 0) <= 365
  const ready = !limited || (daysValid && draft.per.length > 0)
  const perLabel = repeat.mode === "once_per_days" && repeat.per.length
    ? ` per ${repeat.per.length === 1 ? fields.find((field) => field.key === repeat.per[0])?.label || "1 field" : `${repeat.per.length} fields`}`
    : ""

  return (
    <div className="flex min-w-0 items-center gap-2 border-t border-border/40 px-4 py-3">
      <Repeat className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      <span className="shrink-0 text-xs text-muted-foreground">Repeat:</span>
      <Popover
        open={open}
        onOpenChange={(next) => {
          if (next) setDraft({ ...repeat, per: repeat.per?.length ? repeat.per : ["customer_phone"], days: repeat.days ?? 365 })
          setOpen(next)
        }}
      >
        <PopoverTrigger disabled={readOnly} aria-label="Change repeat" className="min-w-0" title={`${repeatLabel(repeat)}${perLabel}`}>
          <span className={cn("inline-flex max-w-full items-center gap-1 rounded-full border border-border/70 bg-muted/60 px-2.5 py-0.5 text-xs font-semibold", !readOnly && "hover:bg-muted")}>
            <span className="truncate">{repeatLabel(repeat)}</span>
            {!readOnly && <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden="true" />}
          </span>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-[24rem] max-w-[calc(100vw-2rem)] p-0">
          <div className="flex items-center gap-2 border-b border-border/40 px-4 py-3">
            <Repeat className="h-4 w-4 text-primary" aria-hidden="true" />
            <p className="text-sm font-bold">Repeat</p>
          </div>
          <div role="radiogroup" aria-label="Repeat" className="space-y-2 px-4 py-3">
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input type="radio" name="automation-repeat" checked={draft.mode === "every_time"} onChange={() => setDraft((current) => ({ ...current, mode: "every_time" }))} />
              Repeat every time the trigger happens
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input type="radio" name="automation-repeat" checked={limited} onChange={() => setDraft((current) => ({ ...current, mode: "once_per_days" }))} />
              Repeat only once every
            </label>
            <div className={cn("flex items-start gap-2 pl-6", !limited && "pointer-events-none opacity-50")}>
              <Input
                type="number"
                min={1}
                max={365}
                aria-label="Days between repeats"
                value={draft.days ?? ""}
                disabled={!limited}
                onChange={(event) => setDraft((current) => ({ ...current, days: event.target.value === "" ? null : Math.round(Number(event.target.value)) }))}
                className="h-8 w-16 text-xs"
              />
              <span className="mt-1.5 shrink-0 text-xs text-muted-foreground">days per</span>
              <PerFieldsPicker fields={fields} value={draft.per} onChange={(per) => setDraft((current) => ({ ...current, per }))} />
            </div>
            {limited && !daysValid && <p className="pl-6 text-[11px] text-red-600 dark:text-red-400">Days must be between 1 and 365.</p>}
            {limited && draft.per.length === 0 && <p className="pl-6 text-[11px] text-red-600 dark:text-red-400">Pick at least one field.</p>}
          </div>
          <div className="flex justify-end gap-2 border-t border-border/40 px-4 py-3">
            <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              type="button"
              size="sm"
              disabled={!ready}
              onClick={() => {
                onChange(limited ? { mode: "once_per_days", days: draft.days, per: draft.per } : { mode: "every_time", days: null, per: [] })
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
