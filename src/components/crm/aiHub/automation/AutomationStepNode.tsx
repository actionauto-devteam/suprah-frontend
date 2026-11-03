"use client"

import * as React from "react"
import { ArrowDown, ArrowUp, Bell, CalendarCheck, ClipboardList, Clock3, Flag, GitBranch, Mail, MessageSquare, Plus, Search, Sparkles, Star, UserMinus, UserPlus, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { ASSIGNABLE_STEP_TYPES, STEP_HELP, TIMED_STEP_TYPES, stepTiming, type AutomationOptions, type AutomationStep, type AutomationStepType } from "@/lib/crmAutomations"
import { AssignToSelect, TimingEditor } from "./AutomationStepTiming"
import { EmojiPicker, TemplatePicker } from "./AutomationMessageTools"

const FIELD_CLASS = "h-9 w-full rounded-lg border border-input bg-background px-2.5 text-sm disabled:opacity-60"
const MAX_MESSAGE = 1000
const MAX_NOTIFICATION = 300
const MAX_EMAIL_SUBJECT = 150
const MAX_EMAIL_BODY = 5000
const MAX_AI_INSTRUCTIONS = 500
const MAX_TASK = 300

export const STEP_ICONS: Record<AutomationStepType, React.ComponentType<{ className?: string }>> = {
  send_review_invitation: Star,
  send_message: MessageSquare,
  send_appointment_confirmation: CalendarCheck,
  send_email: Mail,
  send_notification: Bell,
  assign_team_member: UserPlus,
  unassign_team_member: UserMinus,
  send_ai_follow_up: Sparkles,
  create_task: ClipboardList,
  update_lead_status: Flag,
  wait: Clock3,
  branch: GitBranch,
}

function VariableText({ id, label, value, max, rows, readOnly, variables, tools, onChange }: {
  id: string
  label: string
  value: string
  max: number
  rows: number
  readOnly: boolean
  variables: AutomationOptions["variables"]
  tools?: boolean
  onChange: (value: string) => void
}) {
  const ref = React.useRef<HTMLTextAreaElement>(null)
  const insert = (token: string) => {
    const element = ref.current
    const start = element?.selectionStart ?? value.length
    const end = element?.selectionEnd ?? value.length
    const next = `${value.slice(0, start)}${token}${value.slice(end)}`.slice(0, max)
    onChange(next)
    requestAnimationFrame(() => {
      element?.focus()
      element?.setSelectionRange(start + token.length, start + token.length)
    })
  }
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-xs font-semibold">{label}</label>
      <Textarea id={id} ref={ref} rows={rows} maxLength={max} value={value} disabled={readOnly} onChange={(event) => onChange(event.target.value)} className="text-sm" />
      <div className="flex flex-wrap items-center justify-between gap-2">
        {!readOnly && (
          <div className="flex flex-wrap gap-1" aria-label="Insert a variable">
            {tools && (
              <span className="mr-1 flex items-center gap-0.5">
                <TemplatePicker onPick={insert} />
                <EmojiPicker onPick={insert} />
              </span>
            )}
            {variables.map((variable) => (
              <button key={variable.key} type="button" onClick={() => insert(`{${variable.key}}`)} className="rounded-md border border-border/60 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground">
                + {variable.label}
              </button>
            ))}
          </div>
        )}
        <span className="ml-auto text-[10px] tabular-nums text-muted-foreground">{value.length}/{max}</span>
      </div>
    </div>
  )
}

function RecipientsPicker({ stepId, config, options, readOnly, onChange }: {
  stepId: string
  config: Record<string, unknown>
  options: AutomationOptions
  readOnly: boolean
  onChange: (config: Record<string, unknown>) => void
}) {
  const recipients = String(config.recipients || "admins")
  const userIds = Array.isArray(config.userIds) ? (config.userIds as string[]) : []
  return (
    <>
      <div className="space-y-1">
        <label htmlFor={`step-${stepId}-recipients`} className="text-xs font-semibold">Who gets it</label>
        <select id={`step-${stepId}-recipients`} className={FIELD_CLASS} value={recipients} disabled={readOnly} onChange={(event) => onChange({ ...config, recipients: event.target.value })}>
          <option value="admins">All admins</option>
          <option value="assigned">The lead&apos;s assigned team member</option>
          <option value="people">Specific people</option>
        </select>
      </div>
      {recipients === "people" && (
        <fieldset className="space-y-1">
          <legend className="text-xs font-semibold">People</legend>
          <div className="max-h-40 space-y-0.5 overflow-y-auto rounded-lg border border-border/50 p-1">
            {options.team.map((member) => (
              <label key={member.id} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-xs hover:bg-muted/60">
                <input
                  type="checkbox"
                  checked={userIds.includes(member.id)}
                  disabled={readOnly}
                  onChange={(event) => onChange({ ...config, userIds: event.target.checked ? [...userIds, member.id] : userIds.filter((id) => id !== member.id) })}
                />
                <span className="flex-1 truncate">{member.name}</span>
                <span className="text-[10px] capitalize text-muted-foreground">{member.role}</span>
              </label>
            ))}
          </div>
        </fieldset>
      )}
    </>
  )
}

function StepEditor({ step, options, readOnly, onChange }: {
  step: AutomationStep
  options: AutomationOptions
  readOnly: boolean
  onChange: (config: Record<string, unknown>) => void
}) {
  const config = step.config
  if (step.type === "send_message") {
    return (
      <VariableText id={`step-${step.id}-body`} label="Message" value={String(config.body || "")} max={MAX_MESSAGE} rows={4} readOnly={readOnly} variables={options.variables} tools onChange={(body) => onChange({ ...config, body })} />
    )
  }
  if (step.type === "send_review_invitation") {
    return <p className="text-xs text-muted-foreground">Texts the customer a thank-you with the review link saved in CRM Settings. If no link is saved, it asks how everything went instead.</p>
  }
  if (step.type === "send_notification") {
    return (
      <div className="space-y-3">
        <RecipientsPicker stepId={step.id} config={config} options={options} readOnly={readOnly} onChange={onChange} />
        <VariableText id={`step-${step.id}-message`} label="Notification" value={String(config.message || "")} max={MAX_NOTIFICATION} rows={2} readOnly={readOnly} variables={options.variables} onChange={(message) => onChange({ ...config, message })} />
      </div>
    )
  }
  if (step.type === "create_task") {
    return (
      <div className="space-y-3">
        <RecipientsPicker stepId={step.id} config={config} options={options} readOnly={readOnly} onChange={onChange} />
        <VariableText id={`step-${step.id}-task`} label="Task" value={String(config.task || "")} max={MAX_TASK} rows={2} readOnly={readOnly} variables={options.variables} onChange={(task) => onChange({ ...config, task })} />
      </div>
    )
  }
  if (step.type === "send_email") {
    return (
      <div className="space-y-3">
        <VariableText id={`step-${step.id}-subject`} label="Subject" value={String(config.subject || "")} max={MAX_EMAIL_SUBJECT} rows={1} readOnly={readOnly} variables={options.variables} onChange={(subject) => onChange({ ...config, subject })} />
        <VariableText id={`step-${step.id}-email`} label="Email" value={String(config.body || "")} max={MAX_EMAIL_BODY} rows={6} readOnly={readOnly} variables={options.variables} tools onChange={(body) => onChange({ ...config, body })} />
      </div>
    )
  }
  if (step.type === "send_appointment_confirmation") {
    return <p className="text-xs text-muted-foreground">Texts the time of the customer&apos;s next appointment and asks them to reply YES to confirm or CANCEL to change it. Skipped when they have no upcoming appointment.</p>
  }
  if (step.type === "unassign_team_member") {
    return <p className="text-xs text-muted-foreground">The lead goes back to unassigned.</p>
  }
  if (step.type === "send_ai_follow_up") {
    return (
      <div className="space-y-1.5">
        <p className="text-xs text-muted-foreground">The AI agent reads the conversation and writes the follow-up. It is checked by the safety review and only sends when the AI agent is Live for texts.</p>
        <label htmlFor={`step-${step.id}-instructions`} className="text-xs font-semibold">Instructions for the AI agent (optional)</label>
        <Textarea id={`step-${step.id}-instructions`} rows={3} maxLength={MAX_AI_INSTRUCTIONS} value={String(config.instructions || "")} disabled={readOnly} onChange={(event) => onChange({ ...config, instructions: event.target.value })} placeholder="For example: offer to book a new test drive time." className="text-sm" />
        <p className="text-right text-[10px] tabular-nums text-muted-foreground">{String(config.instructions || "").length}/{MAX_AI_INSTRUCTIONS}</p>
      </div>
    )
  }
  if (step.type === "update_lead_status") {
    const statuses = options.audienceFields.find((field) => field.key === "lead_status")?.choices || []
    return (
      <div className="space-y-1">
        <label htmlFor={`step-${step.id}-status`} className="text-xs font-semibold">New status</label>
        <select id={`step-${step.id}-status`} className={FIELD_CLASS} value={String(config.status || "")} disabled={readOnly} onChange={(event) => onChange({ ...config, status: event.target.value })}>
          <option value="">Pick a status</option>
          {statuses.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
        </select>
      </div>
    )
  }
  if (step.type === "assign_team_member") {
    return (
      <div className="space-y-1">
        <label htmlFor={`step-${step.id}-user`} className="text-xs font-semibold">Team member</label>
        <select id={`step-${step.id}-user`} className={FIELD_CLASS} value={String(config.userId || "")} disabled={readOnly} onChange={(event) => onChange({ ...config, userId: event.target.value })}>
          <option value="">Pick a team member</option>
          {options.team.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}
        </select>
      </div>
    )
  }
  return (
    <div className="flex items-end gap-2">
      <div className="w-24 space-y-1">
        <label htmlFor={`step-${step.id}-amount`} className="text-xs font-semibold">Wait</label>
        <Input
          id={`step-${step.id}-amount`}
          type="number"
          min={1}
          value={config.amount === "" || config.amount === undefined ? "" : Number(config.amount)}
          disabled={readOnly}
          onChange={(event) => onChange({ ...config, amount: event.target.value === "" ? "" : Math.max(1, Math.round(Number(event.target.value))) })}
          className="h-9 text-sm"
        />
      </div>
      <div className="flex-1 space-y-1">
        <label htmlFor={`step-${step.id}-unit`} className="sr-only">Unit</label>
        <select id={`step-${step.id}-unit`} className={FIELD_CLASS} value={String(config.unit || "days")} disabled={readOnly} onChange={(event) => onChange({ ...config, unit: event.target.value })}>
          <option value="minutes">minutes</option>
          <option value="hours">hours</option>
          <option value="days">days</option>
        </select>
      </div>
    </div>
  )
}

export function StepCard({ step, index, total, options, readOnly, allowBefore, onChange, onMove, onRemove }: {
  step: AutomationStep
  index: number
  total: number
  options: AutomationOptions
  readOnly: boolean
  allowBefore: boolean
  onChange: (config: Record<string, unknown>) => void
  onMove: (direction: -1 | 1) => void
  onRemove: () => void
}) {
  const Icon = STEP_ICONS[step.type] || MessageSquare
  const label = options.actions.find((action) => action.key === step.type)?.label || step.type
  return (
    <div className="rounded-2xl border border-border/60 bg-card shadow-sm">
      <div className="flex items-start gap-3 border-b border-border/40 px-4 py-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted text-foreground" aria-hidden="true">
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold"><span className="text-muted-foreground">{index + 1}.</span> {label}</p>
          <p className="text-[11px] text-muted-foreground">{STEP_HELP[step.type]}</p>
        </div>
        {!readOnly && (
          <div className="flex shrink-0 items-center">
            <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" disabled={index === 0} onClick={() => onMove(-1)} aria-label={`Move step ${index + 1} up`}><ArrowUp className="h-3.5 w-3.5" /></Button>
            <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" disabled={index === total - 1} onClick={() => onMove(1)} aria-label={`Move step ${index + 1} down`}><ArrowDown className="h-3.5 w-3.5" /></Button>
            <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={onRemove} aria-label={`Remove step ${index + 1}`}><X className="h-4 w-4" /></Button>
          </div>
        )}
      </div>
      <div className="space-y-3 px-4 py-3">
        <StepEditor step={step} options={options} readOnly={readOnly} onChange={onChange} />
        {ASSIGNABLE_STEP_TYPES.has(step.type) && (
          <AssignToSelect stepId={step.id} value={(step.config.assignTo as string | null) || null} options={options} readOnly={readOnly} onChange={(assignTo) => onChange({ ...step.config, assignTo })} />
        )}
        {TIMED_STEP_TYPES.has(step.type) && (
          <TimingEditor stepId={step.id} index={index} timing={stepTiming(step.config)} allowBefore={allowBefore} readOnly={readOnly} onChange={(timing) => onChange({ ...step.config, timing })} />
        )}
      </div>
    </div>
  )
}

export function StepPicker({ options, hide = [], label = "Add a step", onPick }: {
  options: AutomationOptions
  hide?: AutomationStepType[]
  label?: string
  onPick: (type: AutomationStepType) => void
}) {
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState("")
  const searchId = React.useId()
  const needle = query.trim().toLowerCase()
  const actions = options.actions.filter((action) => !hide.includes(action.key))
  const groups = Array.from(new Set(actions.map((action) => action.group)))
    .map((group) => ({ group, actions: actions.filter((action) => action.group === group && action.label.toLowerCase().includes(needle)) }))
    .filter((entry) => entry.actions.length > 0)

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-label={open ? "Close the step list" : label}
        className={cn("flex h-9 w-9 items-center justify-center rounded-full border-2 bg-card transition-colors", open ? "border-border text-muted-foreground" : "border-primary/50 text-primary hover:bg-primary/10")}
      >
        {open ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
      </button>
      {open && (
        <div className="w-full rounded-2xl border border-border/60 bg-card p-3 shadow-lg">
          <div className="relative">
            <label htmlFor={searchId} className="sr-only">Search actions</label>
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input id={searchId} type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search" className="h-9 pl-8 text-sm" autoFocus />
          </div>
          <div className="mt-2 max-h-72 space-y-2 overflow-y-auto">
            {groups.length === 0 && <p className="px-2 py-3 text-center text-xs text-muted-foreground">No actions match.</p>}
            {groups.map((entry) => (
              <div key={entry.group}>
                <p className="px-2 pb-1 pt-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{entry.group}</p>
                {entry.actions.map((action) => {
                  const Icon = STEP_ICONS[action.key] || MessageSquare
                  return (
                    <button
                      key={action.key}
                      type="button"
                      onClick={() => {
                        onPick(action.key)
                        setOpen(false)
                        setQuery("")
                      }}
                      className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left text-sm hover:bg-muted/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                    >
                      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                      <span className="flex-1">{action.label}</span>
                      {action.connected === false && <span className="text-[10px] text-muted-foreground">not live yet</span>}
                    </button>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
