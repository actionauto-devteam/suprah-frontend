import { apiClient } from "@/lib/api-client"

export type AutomationStatus = "draft" | "test" | "active" | "inactive"
export type AudienceFieldType = "boolean" | "text" | "choice" | "tags"
export type AutomationRepeatMode = "every_time" | "once_per_days"
export type AutomationStepType =
  | "send_review_invitation"
  | "send_message"
  | "send_appointment_confirmation"
  | "send_email"
  | "send_notification"
  | "assign_team_member"
  | "unassign_team_member"
  | "send_ai_follow_up"
  | "create_task"
  | "update_lead_status"
  | "wait"
  | "branch"

export interface AutomationFilter {
  field: string
  operator: string
  value: string | null
}

export interface AudienceField {
  key: string
  label: string
  type: AudienceFieldType
  help?: string
  choices?: Array<{ value: string; label: string }>
}

export interface AutomationTrigger {
  source: string
  event: string | null
  date: string | null
  time: string | null
  filters: AutomationFilter[]
  repeat: { mode: AutomationRepeatMode; days: number | null; per: string[] }
  sendingHours: "sending_hours" | "any_time"
  stopOnReply: boolean
  cancelFirstOnReply: boolean
  aiContinuesOnReply: boolean
  stopOnFailure: boolean
}

export interface AutomationStep {
  id: string
  type: AutomationStepType
  config: Record<string, unknown>
}

export interface BranchPath {
  id: string
  filters: AutomationFilter[]
  repeat: AutomationTrigger["repeat"]
  steps: AutomationStep[]
}

export interface BranchConfig {
  timing: StepTiming
  paths: BranchPath[]
  else: { doNothing: boolean; steps: AutomationStep[] }
}

export interface AutomationAlerts {
  enabled: boolean
  condition: "min_events" | "percentage_drop"
  minEvents: number
  days: number
  dropPercent: number
  userIds: string[]
  lastAlertAt: string | null
}

export interface Automation {
  id: string
  name: string
  locations: { mode: "all" | "specific"; ids: string[] }
  trigger: AutomationTrigger | null
  steps: AutomationStep[]
  status: AutomationStatus
  statusChangedAt?: string | null
  tags: string[]
  alerts?: AutomationAlerts
  createdBy: { userId: string; name: string }
  updatedBy: { userId: string; name: string }
  createdAt: string
  updatedAt: string
}

export interface AutomationSource {
  key: string
  label: string
  groups: Array<{ label: string; events: Array<{ key: string; label: string; connected?: boolean }> }>
}

export interface AutomationOptions {
  sources: AutomationSource[]
  audienceFields: AudienceField[]
  audienceOperators: Record<AudienceFieldType, Array<{ value: string; label: string }>>
  actions: Array<{ key: AutomationStepType; label: string; group: string; connected?: boolean }>
  engineEnabled: boolean
  variables: Array<{ key: string; label: string }>
  locations: Array<{ id: string; name: string }>
  team: Array<{ id: string; name: string; email?: string; role: string }>
  agentName: string
  canEdit: boolean
}

export type AutomationDraft = Pick<Automation, "name" | "locations" | "trigger" | "steps">

export const AUTOMATION_STATUS_LABELS: Record<AutomationStatus, string> = {
  draft: "Draft",
  test: "Test mode",
  active: "Active",
  inactive: "Inactive",
}

export const AUTOMATION_STATUS_STYLES: Record<AutomationStatus, string> = {
  draft: "border-zinc-300 bg-zinc-50 text-zinc-600 dark:border-zinc-500/40 dark:bg-zinc-400/10 dark:text-zinc-300",
  test: "border-sky-300 bg-sky-50 text-sky-700 dark:border-sky-400/40 dark:bg-sky-400/10 dark:text-sky-300",
  active: "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-400/40 dark:bg-emerald-400/10 dark:text-emerald-300",
  inactive: "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-400/40 dark:bg-amber-400/10 dark:text-amber-300",
}

export const VALUELESS_OPERATORS = new Set(["is_true", "is_false", "present", "not_present"])

export type StepTiming = { when: "on" | "after" | "before"; amount: number | null; unit: "minutes" | "hours" | "days" | null }

export const TIMED_STEP_TYPES = new Set<AutomationStepType>(["send_message", "send_review_invitation", "send_appointment_confirmation", "send_email", "send_ai_follow_up"])
export const ASSIGNABLE_STEP_TYPES = new Set<AutomationStepType>(["send_message", "send_review_invitation", "send_appointment_confirmation", "send_email"])
export const FUTURE_TIME_EVENTS = new Set(["appointment_booked", "appointment_confirmed", "appointment_rescheduled"])
export const AI_AGENT_ASSIGNEE = "ai_agent"
export const ON_TRIGGER: StepTiming = { when: "on", amount: null, unit: null }
export const MAX_STEPS = 20
export const MAX_TOTAL_STEPS = 60
export const MAX_BRANCH_DEPTH = 3
export const MAX_BRANCH_PATHS = 5

export function allowsBeforeTrigger(trigger: AutomationTrigger | null): boolean {
  return Boolean(trigger && (trigger.source === "on_a_date" || FUTURE_TIME_EVENTS.has(String(trigger.event))))
}

export function stepTiming(config: Record<string, unknown>): StepTiming {
  const timing = config.timing as StepTiming | undefined
  return timing && timing.when ? timing : ON_TRIGGER
}

export function timingLabel(timing: StepTiming): string {
  if (timing.when === "on" || !timing.amount || !timing.unit) return "Immediately after the trigger"
  const unit = timing.amount === 1 ? timing.unit.slice(0, -1) : timing.unit
  return `${timing.amount} ${unit} ${timing.when === "before" ? "before" : "after"} the trigger`
}

export function filterComplete(filter: AutomationFilter): boolean {
  if (!filter.field || !filter.operator) return false
  return VALUELESS_OPERATORS.has(filter.operator) || Boolean(filter.value?.trim())
}

export function describeFilter(filter: AutomationFilter, options: Pick<AutomationOptions, "audienceFields" | "audienceOperators">): string {
  const field = options.audienceFields.find((item) => item.key === filter.field)
  if (!field) return "Unknown filter"
  const operator = options.audienceOperators[field.type]?.find((item) => item.value === filter.operator)?.label || filter.operator
  if (VALUELESS_OPERATORS.has(filter.operator)) return `${field.label} ${operator}`
  const value = field.choices?.find((choice) => choice.value === filter.value)?.label || filter.value || ""
  return `${field.label} ${operator} ${value}`
}

export function audienceSummary(filters: AutomationFilter[], options: Pick<AutomationOptions, "audienceFields" | "audienceOperators">): string {
  if (!filters.length) return "All contacts"
  if (filters.length === 1) return describeFilter(filters[0], options)
  return `${filters.length} filters`
}

export const STEP_HELP: Record<AutomationStepType, string> = {
  send_review_invitation: "Text the customer your review link.",
  send_message: "Text the customer. \"Reply STOP to opt out.\" is added at the end if it is missing.",
  send_appointment_confirmation: "Text the customer their next appointment and ask them to confirm.",
  send_email: "Email the customer.",
  send_notification: "Notify people on your team in Suprah.",
  assign_team_member: "Give the lead to a team member.",
  unassign_team_member: "Take the lead off the team member it is assigned to.",
  send_ai_follow_up: "The AI agent writes and sends a follow-up text.",
  create_task: "Add a task for your team on this lead.",
  update_lead_status: "Change the lead's status.",
  wait: "Pause before the next step.",
  branch: "Only the first condition that matches will be executed.",
}

export const NEW_TRIGGER_DEFAULTS: Omit<AutomationTrigger, "source" | "event"> = {
  date: null,
  time: null,
  filters: [],
  repeat: { mode: "once_per_days", days: 365, per: ["customer_phone"] },
  sendingHours: "sending_hours",
  stopOnReply: true,
  cancelFirstOnReply: true,
  aiContinuesOnReply: false,
  stopOnFailure: false,
}

export function repeatLabel(repeat: AutomationTrigger["repeat"]): string {
  if (repeat.mode === "every_time") return "Every time"
  return `Once per ${repeat.days || 365} day${repeat.days === 1 ? "" : "s"}`
}

function newId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `step-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function newBranchPath(): BranchPath {
  return { id: newId(), filters: [], repeat: { ...NEW_TRIGGER_DEFAULTS.repeat }, steps: [] }
}

export function branchConfig(config: Record<string, unknown>): BranchConfig {
  const paths = Array.isArray(config.paths) ? (config.paths as BranchPath[]) : []
  const other = (config.else || {}) as Partial<BranchConfig["else"]>
  return {
    timing: stepTiming(config),
    paths: paths.map((path) => ({ ...path, filters: path.filters || [], repeat: path.repeat || { ...NEW_TRIGGER_DEFAULTS.repeat }, steps: path.steps || [] })),
    else: { doNothing: Boolean(other.doNothing), steps: Array.isArray(other.steps) ? other.steps : [] },
  }
}

export function countSteps(steps: AutomationStep[]): number {
  return steps.reduce((total, step) => {
    if (step.type !== "branch") return total + 1
    const branch = branchConfig(step.config)
    return total + 1 + branch.paths.reduce((sum, path) => sum + countSteps(path.steps), 0) + countSteps(branch.else.steps)
  }, 0)
}

export function newStep(type: AutomationStepType): AutomationStep {
  const step = baseStep(type)
  if (TIMED_STEP_TYPES.has(type) || type === "branch") step.config.timing = ON_TRIGGER
  if (ASSIGNABLE_STEP_TYPES.has(type)) step.config.assignTo = null
  return step
}

function baseStep(type: AutomationStepType): AutomationStep {
  const id = newId()
  const config: Record<AutomationStepType, Record<string, unknown>> = {
    send_review_invitation: {},
    send_message: { body: "" },
    send_appointment_confirmation: {},
    send_email: { subject: "", body: "" },
    send_notification: { recipients: "admins", userIds: [], message: "" },
    assign_team_member: { userId: "" },
    unassign_team_member: {},
    send_ai_follow_up: { instructions: "" },
    create_task: { recipients: "assigned", userIds: [], task: "" },
    update_lead_status: { status: "" },
    wait: { amount: 1, unit: "days" },
    branch: { paths: [newBranchPath()], else: { doNothing: false, steps: [] } },
  }
  return { id, type, config: config[type] }
}

export function eventLabel(sources: AutomationSource[], trigger: AutomationTrigger | null): { title: string; source: string } | null {
  if (!trigger) return null
  const source = sources.find((item) => item.key === trigger.source)
  if (!source) return null
  if (!source.groups.length) return { title: "On a date", source: source.label }
  const event = source.groups.flatMap((group) => group.events).find((item) => item.key === trigger.event)
  return event ? { title: event.label, source: source.label } : null
}

export function formatAutomationDate(value: string | null | undefined): string {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  return date.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: "America/Denver" })
}

export function automationError(err: unknown, fallback: string): string {
  return (err as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback
}

export async function automationRequest<T>(
  getToken: () => Promise<string | null>,
  method: "get" | "post" | "patch" | "delete",
  path: string,
  body?: unknown,
): Promise<T> {
  const token = await getToken()
  if (!token) throw new Error("Please sign in again")
  const headers = { Authorization: `Bearer ${token}` }
  const url = `/api/crm/automations${path}`
  const res = method === "get" || method === "delete"
    ? await apiClient[method](url, { headers })
    : await apiClient[method](url, body ?? {}, { headers })
  return (res.data?.data || res.data) as T
}

export type AutomationRunStatus = "filtered" | "waiting" | "running" | "completed" | "stopped" | "failed"

export interface AutomationRunRow {
  id: string
  automationId: string
  automationName: string
  mode: "live" | "test"
  event: string
  status: AutomationRunStatus
  reason: string | null
  contact: { leadId: string | null; name: string; firstName: string; phone: string; email: string }
  triggerAt: string
  nextRunAt: string | null
  createdAt: string
  log: Array<{ type: string; status: "sent" | "test" | "skipped" | "failed" | "done"; detail: string; at: string }>
}

export interface AutomationActivityPage {
  mode: "live" | "test"
  engineEnabled: boolean
  counts: Record<AutomationRunStatus, number>
  page: number
  pages: number
  total: number
  items: AutomationRunRow[]
}

export const RUN_STATUS_LABELS: Record<AutomationRunStatus, string> = {
  filtered: "Filtered",
  waiting: "Waiting",
  running: "Running",
  completed: "Completed",
  stopped: "Stopped",
  failed: "Failed",
}

export const RUN_STATUS_STYLES: Record<AutomationRunStatus, string> = {
  filtered: "border-zinc-300 bg-zinc-50 text-zinc-600 dark:border-zinc-500/40 dark:bg-zinc-400/10 dark:text-zinc-300",
  waiting: "border-sky-300 bg-sky-50 text-sky-700 dark:border-sky-400/40 dark:bg-sky-400/10 dark:text-sky-300",
  running: "border-sky-300 bg-sky-50 text-sky-700 dark:border-sky-400/40 dark:bg-sky-400/10 dark:text-sky-300",
  completed: "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-400/40 dark:bg-emerald-400/10 dark:text-emerald-300",
  stopped: "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-400/40 dark:bg-amber-400/10 dark:text-amber-300",
  failed: "border-red-300 bg-red-50 text-red-700 dark:border-red-400/40 dark:bg-red-400/10 dark:text-red-300",
}

export const LOG_STATUS_LABELS: Record<AutomationRunRow["log"][number]["status"], string> = {
  sent: "Sent",
  test: "Test only",
  skipped: "Skipped",
  failed: "Failed",
  done: "Done",
}

export const ENGINE_OFF_NOTE = "Automations are turned off on this server. You can turn them on here, but nothing runs until the server setting is switched on."

export interface DataSync {
  id: string
  type: "appointment"
  name: string
  status: "active" | "inactive"
  locations: { mode: "all" | "specific"; ids: string[] }
  setupComplete: boolean
  updatedAt: string
}

export const DATA_SYNC_TYPE_LABELS: Record<DataSync["type"], string> = {
  appointment: "Appointment sync",
}
