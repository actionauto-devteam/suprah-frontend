"use client"

import * as React from "react"
import { CalendarDays, ChevronDown, Plus, Settings2, X, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"
import {
  NEW_TRIGGER_DEFAULTS,
  eventLabel,
  type AutomationOptions,
  type AutomationSource,
  type AutomationTrigger,
} from "@/lib/crmAutomations"
import { AudienceEditor } from "./AutomationAudienceEditor"
import { RepeatEditor } from "./AutomationRepeatEditor"

const ADVANCED_TOGGLES: Array<{ key: "stopOnReply" | "cancelFirstOnReply" | "aiContinuesOnReply" | "stopOnFailure"; label: string }> = [
  { key: "stopOnReply", label: "Stop the automation if the contact replies by text or email" },
  { key: "cancelFirstOnReply", label: "Also cancel the first message if the contact replies" },
  { key: "aiContinuesOnReply", label: "If the lead replies, let the AI agent continue the conversation" },
  { key: "stopOnFailure", label: "Stop the automation if an action fails" },
]

const FIELD_CLASS = "h-9 w-full rounded-lg border border-input bg-background px-2.5 text-sm disabled:opacity-60"

export function TriggerChooser({ sources, initial, onCancel, onDone }: {
  sources: AutomationSource[]
  initial: AutomationTrigger | null
  onCancel: () => void
  onDone: (source: string, event: string | null) => void
}) {
  const [source, setSource] = React.useState(initial?.source || "")
  const [event, setEvent] = React.useState(initial?.event || "")
  const selected = sources.find((item) => item.key === source)
  const dateBased = Boolean(selected && selected.groups.length === 0)
  const ready = Boolean(selected && (dateBased || event))

  return (
    <div className="rounded-2xl border-2 border-primary/40 bg-card shadow-sm">
      <div className="flex items-center gap-2 border-b border-border/40 px-4 py-3">
        <Zap className="h-4 w-4 text-primary" aria-hidden="true" />
        <p className="text-sm font-bold">Choose a trigger</p>
      </div>
      <div className="space-y-3 px-4 py-3">
        <div className="space-y-1">
          <label htmlFor="automation-trigger-source" className="text-xs font-semibold">Source</label>
          <select
            id="automation-trigger-source"
            className={FIELD_CLASS}
            value={source}
            onChange={(change) => {
              setSource(change.target.value)
              setEvent("")
            }}
          >
            <option value="">Select a source</option>
            {sources.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}
          </select>
        </div>
        {dateBased ? (
          <p className="rounded-lg bg-muted/50 px-3 py-2 text-[11px] text-muted-foreground">Runs on a date you pick. You&apos;ll set the date and time after you click Done.</p>
        ) : (
          <div className="space-y-1">
            <label htmlFor="automation-trigger-event" className="text-xs font-semibold">Trigger</label>
            <select id="automation-trigger-event" className={FIELD_CLASS} value={event} disabled={!selected} onChange={(change) => setEvent(change.target.value)}>
              <option value="">Select an event</option>
              {selected?.groups.map((group) => (
                <optgroup key={group.label} label={group.label}>
                  {group.events.map((item) => <option key={item.key} value={item.key}>{item.label}{item.connected === false ? " (not live yet)" : ""}</option>)}
                </optgroup>
              ))}
            </select>
          </div>
        )}
      </div>
      <div className="flex justify-end gap-2 border-t border-border/40 px-4 py-3">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
        <Button type="button" size="sm" disabled={!ready} onClick={() => onDone(source, dateBased ? null : event)}>Done</Button>
      </div>
    </div>
  )
}

export function TriggerPlaceholder({ onChoose, disabled }: { onChoose: () => void; disabled?: boolean }) {
  return (
    <div className="rounded-2xl border-2 border-dashed border-border/70 p-3">
      <Button type="button" className="h-10 w-full" onClick={onChoose} disabled={disabled}>
        <Plus className="h-4 w-4" />
        Choose a trigger
      </Button>
    </div>
  )
}

export function TriggerCard({ trigger, sources, options, readOnly, onChange, onEdit, onRemove }: {
  trigger: AutomationTrigger
  sources: AutomationSource[]
  options: Pick<AutomationOptions, "audienceFields" | "audienceOperators">
  readOnly: boolean
  onChange: (next: AutomationTrigger) => void
  onEdit: () => void
  onRemove: () => void
}) {
  const [advanced, setAdvanced] = React.useState(false)
  const labels = eventLabel(sources, trigger)
  const dateBased = trigger.source === "on_a_date"
  const patch = (next: Partial<AutomationTrigger>) => onChange({ ...NEW_TRIGGER_DEFAULTS, ...trigger, ...next })

  return (
    <div className="rounded-2xl border border-border/60 bg-card shadow-sm">
      <div className="flex items-start gap-3 px-4 py-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary" aria-hidden="true">
          {dateBased ? <CalendarDays className="h-4 w-4" /> : <Zap className="h-4 w-4" />}
        </span>
        <button type="button" className="min-w-0 flex-1 text-left disabled:cursor-default" onClick={onEdit} disabled={readOnly}>
          <p className="text-sm font-bold">{labels?.title || "Unknown trigger"}</p>
          <p className="text-[11px] text-muted-foreground">via {labels?.source || trigger.source}</p>
        </button>
        {!readOnly && (
          <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={onRemove} aria-label="Remove trigger">
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {dateBased && (
        <div className="flex flex-wrap items-center gap-2 border-t border-border/40 px-4 py-3">
          <CalendarDays className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <span className="text-xs text-muted-foreground">Date:</span>
          <label htmlFor="automation-trigger-date" className="sr-only">Date</label>
          <Input id="automation-trigger-date" type="date" value={trigger.date || ""} disabled={readOnly} onChange={(event) => patch({ date: event.target.value || null })} className="h-8 w-auto text-xs" />
          <label htmlFor="automation-trigger-time" className="sr-only">Time</label>
          <Input id="automation-trigger-time" type="time" value={trigger.time || ""} disabled={readOnly} onChange={(event) => patch({ time: event.target.value || null })} className="h-8 w-auto text-xs" />
          <span className="text-[10px] text-muted-foreground">Mountain Time</span>
        </div>
      )}

      <AudienceEditor filters={trigger.filters || []} options={options} readOnly={readOnly} onChange={(filters) => patch({ filters })} />

      <RepeatEditor repeat={trigger.repeat} fields={options.audienceFields} readOnly={readOnly} onChange={(repeat) => patch({ repeat })} />

      <div className="border-t border-border/40">
        <button type="button" onClick={() => setAdvanced((value) => !value)} aria-expanded={advanced} className="flex w-full items-center gap-2 px-4 py-3 text-left">
          <Settings2 className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <span className="flex-1 text-xs text-muted-foreground">Advanced settings</span>
          <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", advanced && "rotate-180")} aria-hidden="true" />
        </button>
        {advanced && (
          <div className="space-y-3 px-4 pb-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label htmlFor="automation-sending-hours" className="text-xs font-semibold">Sending hours</label>
              <select
                id="automation-sending-hours"
                className="h-8 rounded-lg border border-input bg-background px-2 text-xs disabled:opacity-60"
                value={trigger.sendingHours}
                disabled={readOnly}
                onChange={(event) => patch({ sendingHours: event.target.value === "any_time" ? "any_time" : "sending_hours" })}
              >
                <option value="sending_hours">Send during sending hours</option>
                <option value="any_time">Send at any time</option>
              </select>
            </div>
            <p className="-mt-1 text-[11px] text-muted-foreground">Sending hours are 9 AM to 8 PM Mountain Time. Messages outside those hours wait until 9 AM.</p>
            {ADVANCED_TOGGLES.map((toggle) => {
              const blocked = toggle.key === "cancelFirstOnReply" && !trigger.stopOnReply
              return (
                <div key={toggle.key} className={cn("flex items-start justify-between gap-3", blocked && "opacity-50")}>
                  <label htmlFor={`automation-${toggle.key}`} className="text-xs font-semibold">{toggle.label}</label>
                  <Switch
                    id={`automation-${toggle.key}`}
                    checked={Boolean(trigger[toggle.key]) && !blocked}
                    disabled={readOnly || blocked}
                    onCheckedChange={(checked) => patch({ [toggle.key]: Boolean(checked) })}
                  />
                </div>
              )
            })}
            <p className="rounded-lg bg-muted/50 px-3 py-2 text-[11px] text-muted-foreground">People who replied STOP or are marked Do Not Contact are always skipped.</p>
          </div>
        )}
      </div>
    </div>
  )
}
