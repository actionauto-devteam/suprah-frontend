"use client"

import * as React from "react"
import { ChevronDown, Plus, Search, Users, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import {
  VALUELESS_OPERATORS,
  audienceSummary,
  filterComplete,
  type AudienceField,
  type AutomationFilter,
  type AutomationOptions,
} from "@/lib/crmAutomations"

const FIELD_CLASS = "h-8 rounded-lg border border-input bg-background px-2 text-xs"
const MAX_FILTERS = 10

function FieldPicker({ fields, value, open, onToggle, onPick }: {
  fields: AudienceField[]
  value: string
  open: boolean
  onToggle: () => void
  onPick: (key: string) => void
}) {
  const [query, setQuery] = React.useState("")
  const current = fields.find((field) => field.key === value)
  const needle = query.trim().toLowerCase()
  const visible = fields.filter((field) => field.label.toLowerCase().includes(needle))
  return (
    <div className="min-w-0 flex-1">
      <button type="button" onClick={onToggle} aria-expanded={open} className={cn(FIELD_CLASS, "flex w-full items-center justify-between gap-1 text-left")}>
        <span className={cn("truncate", !current && "text-muted-foreground")}>{current?.label || "Select field"}</span>
        <ChevronDown className={cn("h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} aria-hidden="true" />
      </button>
      {open && (
        <div className="mt-1 rounded-lg border border-border/60 bg-popover p-1.5 shadow-md">
          <div className="relative">
            <label htmlFor="automation-field-search" className="sr-only">Search fields</label>
            <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input id="automation-field-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search fields..." className="h-8 pl-7 text-xs" autoFocus />
          </div>
          <ul className="mt-1 max-h-52 overflow-y-auto" role="listbox" aria-label="Fields">
            {visible.length === 0 && <li className="px-2 py-2 text-xs text-muted-foreground">No fields match.</li>}
            {visible.map((field) => (
              <li key={field.key} role="option" aria-selected={field.key === value}>
                <button
                  type="button"
                  onClick={() => {
                    onPick(field.key)
                    setQuery("")
                  }}
                  className={cn("w-full rounded-md px-2 py-1.5 text-left text-xs hover:bg-muted", field.key === value && "bg-muted font-semibold")}
                >
                  {field.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function ValueInput({ field, filter, index, onChange }: {
  field: AudienceField
  filter: AutomationFilter
  index: number
  onChange: (value: string) => void
}) {
  const id = `automation-filter-value-${index}`
  if (field.type === "choice") {
    return (
      <>
        <label htmlFor={id} className="sr-only">{field.label} value</label>
        <select id={id} className={cn(FIELD_CLASS, "w-full")} value={filter.value || ""} onChange={(event) => onChange(event.target.value)}>
          <option value="">Select {field.label.toLowerCase()}</option>
          {(field.choices || []).map((choice) => <option key={choice.value} value={choice.value}>{choice.label}</option>)}
        </select>
      </>
    )
  }
  return (
    <>
      <label htmlFor={id} className="sr-only">{field.label} value</label>
      <Input id={id} value={filter.value || ""} maxLength={120} onChange={(event) => onChange(event.target.value)} placeholder={field.type === "tags" ? "Tag" : "Value"} className="h-8 text-xs" />
    </>
  )
}

export function AudienceEditor({ filters, options, readOnly, onChange }: {
  filters: AutomationFilter[]
  options: Pick<AutomationOptions, "audienceFields" | "audienceOperators">
  readOnly: boolean
  onChange: (filters: AutomationFilter[]) => void
}) {
  const [open, setOpen] = React.useState(false)
  const [draft, setDraft] = React.useState<AutomationFilter[]>(filters)
  const [picking, setPicking] = React.useState<number | null>(null)
  const ready = draft.every(filterComplete)

  const openChange = (next: boolean) => {
    if (next) {
      setDraft(filters)
      setPicking(null)
    }
    setOpen(next)
  }
  const updateRow = (index: number, patch: Partial<AutomationFilter>) =>
    setDraft((current) => current.map((row, position) => (position === index ? { ...row, ...patch } : row)))

  return (
    <div className="flex min-w-0 items-center gap-2 border-t border-border/40 px-4 py-3">
      <Users className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      <span className="shrink-0 text-xs text-muted-foreground">Audience:</span>
      <Popover open={open} onOpenChange={openChange}>
        <PopoverTrigger disabled={readOnly} aria-label="Edit audience" className="min-w-0">
          <span className={cn("inline-flex max-w-full items-center gap-1 rounded-full border border-border/70 bg-muted/60 px-2.5 py-0.5 text-xs font-semibold", !readOnly && "hover:bg-muted")}>
            <span className="truncate">{audienceSummary(filters, options)}</span>
            {!readOnly && <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden="true" />}
          </span>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-[26rem] max-w-[calc(100vw-2rem)] p-0">
          <div className="flex items-center gap-2 border-b border-border/40 px-4 py-3">
            <Users className="h-4 w-4 text-primary" aria-hidden="true" />
            <p className="text-sm font-bold">Edit audience</p>
          </div>
          <div className="space-y-2 px-4 py-3">
            {draft.length === 0 && <p className="text-[11px] text-muted-foreground">No filters. The automation runs for all contacts.</p>}
            {draft.map((filter, index) => {
              const field = options.audienceFields.find((item) => item.key === filter.field)
              const operators = field ? options.audienceOperators[field.type] || [] : []
              const needsValue = Boolean(field && filter.operator && !VALUELESS_OPERATORS.has(filter.operator))
              return (
                <div key={index} className="space-y-1.5 rounded-lg border border-border/40 p-2">
                  <div className="flex items-start gap-2">
                    <Button type="button" variant="ghost" size="sm" className="h-8 w-8 shrink-0 p-0" onClick={() => {
                      setDraft((current) => current.filter((_, position) => position !== index))
                      setPicking(null)
                    }} aria-label={`Remove filter ${index + 1}`}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                    <span className="mt-2 w-9 shrink-0 text-xs text-muted-foreground">{index === 0 ? "When" : "and"}</span>
                    <FieldPicker
                      fields={options.audienceFields}
                      value={filter.field}
                      open={picking === index}
                      onToggle={() => setPicking((current) => (current === index ? null : index))}
                      onPick={(key) => {
                        updateRow(index, { field: key, operator: "", value: null })
                        setPicking(null)
                      }}
                    />
                  </div>
                  {field && (
                    <div className="flex flex-wrap items-center gap-2 pl-[4.25rem]">
                      <label htmlFor={`automation-filter-operator-${index}`} className="sr-only">Operation</label>
                      <select
                        id={`automation-filter-operator-${index}`}
                        className={cn(FIELD_CLASS, "min-w-32")}
                        value={filter.operator}
                        onChange={(event) => updateRow(index, { operator: event.target.value, value: VALUELESS_OPERATORS.has(event.target.value) ? null : filter.value })}
                      >
                        <option value="">Select operation</option>
                        {operators.map((operator) => <option key={operator.value} value={operator.value}>{operator.label}</option>)}
                      </select>
                      {needsValue && (
                        <div className="min-w-0 flex-1">
                          <ValueInput field={field} filter={filter} index={index} onChange={(value) => updateRow(index, { value })} />
                        </div>
                      )}
                    </div>
                  )}
                  {field?.help && <p className="pl-[4.25rem] text-[10px] text-muted-foreground">{field.help}</p>}
                </div>
              )
            })}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8"
              disabled={draft.length >= MAX_FILTERS || !ready}
              onClick={() => {
                setDraft((current) => [...current, { field: "", operator: "", value: null }])
                setPicking(draft.length)
              }}
            >
              <Plus className="h-3.5 w-3.5" />
              Add filter
            </Button>
          </div>
          <div className="flex justify-end gap-2 border-t border-border/40 px-4 py-3">
            <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              type="button"
              size="sm"
              disabled={!ready}
              onClick={() => {
                onChange(draft.map((filter) => ({ ...filter, value: VALUELESS_OPERATORS.has(filter.operator) ? null : filter.value?.trim() || null })))
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
