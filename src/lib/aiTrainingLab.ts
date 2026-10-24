import type { TrainingRuleChannel } from "@/lib/aiTraining"

export const LAB_SCENARIO_LIMITS = {
  titleMin: 3,
  title: 120,
  customerName: 60,
  vehicleInterest: 120,
  turns: 8,
  turnBody: 500,
  message: 500,
  listItems: 5,
  includeItems: 8,
  listItem: 200,
  notes: 300,
  tags: 8,
  tag: 40,
  reply: 1000,
  changeNote: 300,
  batchSize: 20,
} as const

export const LAB_EXPECTED_HANDLING = [
  { value: "ai_handles", label: "AI Agent answers", description: "The AI Agent should reply normally." },
  { value: "ask_clarifying", label: "AI Agent asks clarifying questions first", description: "The AI Agent should ask before answering." },
  { value: "escalate", label: "AI Agent hands off to a person", description: "The AI Agent should not answer; staff take over." },
  { value: "safety_stop", label: "Safety stop", description: "The AI Agent should stay quiet, for example after STOP." },
] as const
export type LabExpectedHandling = (typeof LAB_EXPECTED_HANDLING)[number]["value"]

export const LAB_TURN_AUTHORS = [
  { value: "customer", label: "Customer" },
  { value: "alex", label: "AI Agent" },
  { value: "staff", label: "Staff" },
] as const
export type LabTurnAuthor = (typeof LAB_TURN_AUTHORS)[number]["value"]

export const LAB_CHANNEL_LABELS: Record<string, string> = {
  sms: "SMS",
  webchat: "Website chat",
  email: "Email",
}

export type LabCheckStatus = "pass" | "fail" | "warning" | "not_evaluated"
export type LabCheckMethod = "deterministic" | "keyword_rule" | "existing_safety_filter" | "approximate" | "local_mock_screening"
export type LabVerdict = "failed" | "needs_review" | "incomplete" | "checks_passed"
export type LabRunMode = "rules_only" | "sample_reply"

export const LAB_CHECK_STATUS_LABELS: Record<LabCheckStatus, string> = {
  pass: "Pass",
  fail: "Fail",
  warning: "Warning",
  not_evaluated: "Not checked",
}

export const LAB_CHECK_STATUS_STYLES: Record<LabCheckStatus, string> = {
  pass: "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-400/40 dark:bg-emerald-400/10 dark:text-emerald-300",
  fail: "border-red-300 bg-red-50 text-red-700 dark:border-red-400/40 dark:bg-red-400/10 dark:text-red-300",
  warning: "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-400/40 dark:bg-amber-400/10 dark:text-amber-300",
  not_evaluated: "border-slate-300 bg-slate-100 text-slate-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300",
}

export const LAB_METHODS: Record<LabCheckMethod, { label: string; description: string; style: string }> = {
  deterministic: {
    label: "Exact check",
    description: "A fixed rule with a clear yes or no answer.",
    style: "border-sky-300 text-sky-700 dark:border-sky-400/40 dark:text-sky-300",
  },
  keyword_rule: {
    label: "Keyword rule",
    description: "Copies the live SMS keyword handling, such as STOP and YES.",
    style: "border-sky-300 text-sky-700 dark:border-sky-400/40 dark:text-sky-300",
  },
  existing_safety_filter: {
    label: "Existing safety filter",
    description: "The same filter that blocks real outgoing messages.",
    style: "border-sky-300 text-sky-700 dark:border-sky-400/40 dark:text-sky-300",
  },
  approximate: {
    label: "Approximate",
    description: "Word matching only. It is not proof of what the AI Agent would say.",
    style: "border-amber-300 text-amber-700 dark:border-amber-400/40 dark:text-amber-300",
  },
  local_mock_screening: {
    label: "Local check, not Gemini",
    description: "A simple local stand-in. The real attention screen uses Gemini and can decide differently.",
    style: "border-violet-300 text-violet-700 dark:border-violet-400/40 dark:text-violet-300",
  },
}

export const LAB_VERDICTS: Record<LabVerdict, { label: string; description: string; style: string }> = {
  failed: {
    label: "Failed checks",
    description: "At least one check failed.",
    style: LAB_CHECK_STATUS_STYLES.fail,
  },
  needs_review: {
    label: "Needs review",
    description: "Nothing failed, but some checks raised warnings that a person should look at.",
    style: LAB_CHECK_STATUS_STYLES.warning,
  },
  incomplete: {
    label: "Incomplete",
    description: "Some required checks could not run. This is not a pass.",
    style: LAB_CHECK_STATUS_STYLES.not_evaluated,
  },
  checks_passed: {
    label: "Checks passed",
    description: "Every check that ran passed. This does not prove what the AI Agent will say to a real customer.",
    style: LAB_CHECK_STATUS_STYLES.pass,
  },
}

export const LAB_CHECK_GROUPS: Array<{ value: string; label: string }> = [
  { value: "safety", label: "Safety checks" },
  { value: "rule", label: "Rule fit" },
  { value: "reply", label: "Sample reply" },
]

export const LAB_MODE_LABELS: Record<LabRunMode, string> = {
  rules_only: "Rules only",
  sample_reply: "Sample reply",
}

export const LAB_REVISION_ACTIONS: Record<string, string> = {
  created: "Created",
  edited: "Edited",
  archived: "Archived",
  restored: "Restored",
}

export const LAB_FICTIONAL_NOTICE = "Use made-up customers only. Do not copy names, phone numbers, emails, addresses, VINs or messages from real leads. Phone numbers must be in the 555-01xx range and emails must use example.com."

export interface LabIssue {
  field: string
  code: string
  message: string
}

export interface LabScenarioTurn {
  from: LabTurnAuthor
  body: string
}

export interface LabScenarioInput {
  title: string
  channel: TrainingRuleChannel
  customerName: string
  vehicleInterest: string
  turns: LabScenarioTurn[]
  message: string
  flags: { hasUpcomingAppointment: boolean; previouslyOptedOut: boolean }
  expectation: {
    handling: LabExpectedHandling | ""
    mustAsk: string[]
    mustInclude: string[]
    mustAvoid: string[]
    notes: string
  }
  tags: string[]
}

export interface LabScenario extends Omit<LabScenarioInput, "customerName" | "vehicleInterest" | "expectation"> {
  id: string
  customerName?: string
  vehicleInterest?: string
  expectation: Omit<LabScenarioInput["expectation"], "notes" | "handling"> & { handling: LabExpectedHandling; notes?: string }
  archived: boolean
  archivedAt?: string
  revision: number
  createdBy: { name: string; role: string } | null
  lastEditedByName?: string
  isMine: boolean
  canManage: boolean
  createdAt: string
  updatedAt: string
}

export interface LabScenarioRevision {
  revision: number
  action: string
  content: Partial<LabScenario>
  changeNote?: string
  createdByName?: string
  createdAt: string
}

export interface LabScenarioPage {
  scenarios: LabScenario[]
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface LabStatus {
  engineVersion: string
  retentionDays: number
  canTestAllProposals: boolean
  aiSimulationAvailable: boolean
  scenarios: { active: number; total: number; activeLimit: number }
}

export interface LabCheck {
  id: string
  group: string
  label: string
  status: LabCheckStatus
  method: LabCheckMethod
  message: string
  optional?: boolean
}

export interface LabRun {
  id: string
  policyId: string
  policyVersion: number
  policyStatusAtRun: string
  policyTitle: string
  ruleFormat: string
  scenarioId: string
  scenarioRevision: number
  scenarioTitle?: string
  scenarioSnapshot?: Partial<LabScenario>
  channel: string
  mode: LabRunMode
  reply?: { source: "written" | "rule_example"; exampleIndex?: number; text: string }
  engineVersion: string
  checks: LabCheck[]
  counts: { pass: number; fail: number; warning: number; notEvaluated: number }
  verdict: LabVerdict
  includesApproximate: boolean
  runByName?: string
  createdAt: string
  expiresAt: string
}

export interface LabRunPage {
  runs: LabRun[]
  page: number
  limit: number
  total: number
  totalPages: number
  retentionDays: number
}

export function emptyLabScenario(): LabScenarioInput {
  return {
    title: "",
    channel: "sms",
    customerName: "",
    vehicleInterest: "",
    turns: [],
    message: "",
    flags: { hasUpcomingAppointment: false, previouslyOptedOut: false },
    expectation: { handling: "", mustAsk: [], mustInclude: [], mustAvoid: [], notes: "" },
    tags: [],
  }
}

export function labScenarioToInput(scenario: LabScenario): LabScenarioInput {
  return {
    title: scenario.title,
    channel: scenario.channel,
    customerName: scenario.customerName || "",
    vehicleInterest: scenario.vehicleInterest || "",
    turns: scenario.turns.map((turn) => ({ ...turn })),
    message: scenario.message,
    flags: { ...scenario.flags },
    expectation: {
      handling: scenario.expectation.handling,
      mustAsk: [...scenario.expectation.mustAsk],
      mustInclude: [...scenario.expectation.mustInclude],
      mustAvoid: [...scenario.expectation.mustAvoid],
      notes: scenario.expectation.notes || "",
    },
    tags: [...scenario.tags],
  }
}

export function labRetentionLabel(expiresAt?: string): string {
  if (!expiresAt) return "Can't be edited"
  const date = new Date(expiresAt)
  if (Number.isNaN(date.getTime())) return "Can't be edited"
  return `Can't be edited · deleted automatically on ${date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`
}

export function labHandlingLabel(value?: string): string {
  return LAB_EXPECTED_HANDLING.find((option) => option.value === value)?.label || value || "—"
}
