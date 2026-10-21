export const TRAINING_STATUSES = [
  "in_review",
  "changes_requested",
  "approved",
  "rejected",
  "withdrawn",
  "draft",
  "published_shadow",
  "published_live",
  "retired",
] as const
export type TrainingStatus = (typeof TRAINING_STATUSES)[number]

export const TRAINING_STATUS_LABELS: Record<TrainingStatus, string> = {
  draft: "Draft",
  in_review: "Waiting for review",
  changes_requested: "Changes requested",
  approved: "Approved · not active yet",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
  published_shadow: "Active in Shadow Training",
  published_live: "Active live",
  retired: "Retired",
}

export const TRAINING_STATUS_STYLES: Record<TrainingStatus, string> = {
  draft: "border-slate-300 bg-slate-50 text-slate-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300",
  in_review: "border-sky-300 bg-sky-50 text-sky-700 dark:border-sky-400/40 dark:bg-sky-400/10 dark:text-sky-300",
  changes_requested: "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-400/40 dark:bg-amber-400/10 dark:text-amber-300",
  approved: "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-400/40 dark:bg-emerald-400/10 dark:text-emerald-300",
  rejected: "border-red-300 bg-red-50 text-red-700 dark:border-red-400/40 dark:bg-red-400/10 dark:text-red-300",
  withdrawn: "border-slate-300 bg-slate-100 text-slate-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300",
  published_shadow: "border-violet-300 bg-violet-50 text-violet-700 dark:border-violet-400/40 dark:bg-violet-400/10 dark:text-violet-300",
  published_live: "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-400/40 dark:bg-emerald-400/10 dark:text-emerald-300",
  retired: "border-slate-300 bg-slate-100 text-slate-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300",
}

export const TRAINING_SOURCE_LABELS: Record<string, string> = {
  coaching_submission: "From Coach your AI",
  manual: "Written in Settings",
  draft_evaluation: "From a draft rating",
  train_alex: "From Train Alex",
}

export const TRAINING_AUDIT_LABELS: Record<string, string> = {
  proposal_drafted: "Draft created",
  draft_saved: "Draft saved",
  review_edited: "Edited during review",
  integrity_repaired: "Repaired by the integrity check",
  proposal_submitted: "Submitted for review",
  proposal_revised: "Revised and resubmitted",
  proposal_withdrawn: "Withdrawn",
  proposal_changes_requested: "Changes requested",
  proposal_approved: "Approved",
  proposal_rejected: "Rejected",
}

export const DRAFT_RATINGS = [
  { value: "good", label: "Good" },
  { value: "needs_edit", label: "Needs edits" },
  { value: "wrong", label: "Wrong" },
  { value: "unsafe", label: "Unsafe" },
] as const
export type DraftRating = (typeof DRAFT_RATINGS)[number]["value"]

export const DRAFT_RATING_TAGS = [
  { value: "wrong_facts", label: "Wrong facts" },
  { value: "missed_question", label: "Missed a question" },
  { value: "should_escalate", label: "Should hand off" },
  { value: "tone", label: "Tone" },
  { value: "too_long", label: "Too long" },
  { value: "unsafe_claim", label: "Unsafe claim" },
  { value: "other", label: "Other" },
] as const

export interface TrainingStatusInfo {
  globalEnabled: boolean
  orgEnabled: boolean
  enabled: boolean
  role: "rep" | "manager" | "admin"
  canReview: boolean
  canManageSettings: boolean
  pendingReviewCount?: number
}

export const TRAINING_RULE_CATEGORIES = [
  { value: "scenario_response", label: "Customer scenario" },
  { value: "behavior", label: "Behavior" },
  { value: "escalation", label: "Escalation" },
  { value: "tone", label: "Tone" },
] as const

export const TRAINING_RULE_HANDLING = [
  { value: "ai_handles", label: "Alex answers", description: "Only after the mandatory safety checks pass." },
  { value: "ask_clarifying", label: "Alex asks clarifying questions first", description: "Alex asks the follow-up questions before answering." },
  { value: "escalate", label: "Alex hands off to a person", description: "Alex does not answer; staff take over." },
] as const
export type TrainingRuleHandling = (typeof TRAINING_RULE_HANDLING)[number]["value"]

export const TRAINING_RULE_CHANNELS = [
  { value: "sms", label: "SMS" },
  { value: "webchat", label: "Website chat" },
  { value: "email", label: "Email" },
] as const
export type TrainingRuleChannel = (typeof TRAINING_RULE_CHANNELS)[number]["value"]

export const TRAINING_RULE_LIMITS = {
  title: 120,
  intent: 120,
  triggers: 8,
  trigger: 120,
  instruction: 800,
  questions: 5,
  question: 200,
  include: 8,
  avoid: 8,
  listItem: 200,
  escalationWhen: 300,
  handoffReason: 200,
  examples: 3,
  exampleMessage: 500,
  exampleReply: 600,
  changeNote: 300,
} as const

export interface TrainingRuleInput {
  title: string
  category: string
  channels: TrainingRuleChannel[]
  intent: string
  triggers: string[]
  handling: TrainingRuleHandling | ""
  instruction: string
  requiredQuestions: string[]
  mustInclude: string[]
  mustAvoid: string[]
  escalation: { when: string; handoffReason: string }
  examples: Array<{ customerMessage: string; idealReply: string }>
}

export interface TrainingRuleIssue {
  field: string
  code: string
  message: string
}

export interface TrainingRulePreview {
  headline: string
  handlingLabel: string
  channels: string[]
  safetyNotice: string
  activationNotice: string
  sections: Array<{ label: string; items: string[] }>
  examples: Array<{ customerMessage: string; idealReply: string; checks: Array<{ channel: TrainingRuleChannel; ok: boolean; reasons: string[] }> }>
}

export interface TrainingRuleEvaluation {
  errors: TrainingRuleIssue[]
  warnings: TrainingRuleIssue[]
  readyToSubmit: boolean
  preview: TrainingRulePreview
}

export interface TrainingProposalSummary {
  id: string
  title: string
  category: string
  channels: string[]
  status: TrainingStatus
  source: string
  currentVersion: number
  ruleFormat?: "instruction" | "structured_v1"
  submittedVersion?: number
  lastEditedByName?: string
  createdBy: { name: string; role: string } | null
  isMine: boolean
  submittedAt?: string
  lastReview?: { action: string; note?: string; byName?: string; at: string }
  approvedByName?: string
  approvedAt?: string
  createdAt: string
  updatedAt: string
  instruction?: string
  intent?: string
  handling?: TrainingRuleHandling
}

export interface TrainingProposalVersion {
  version: number
  createdByMe?: boolean
  spec: Partial<Omit<TrainingRuleInput, "escalation" | "handling">> & {
    instruction: string
    format?: "instruction" | "structured_v1"
    handling?: TrainingRuleHandling
    escalation?: { when?: string; handoffReason?: string }
  }
  originalAiMessageSnapshot?: string
  changeNote?: string
  createdByName?: string
  createdAt: string
}

export interface TrainingAuditEntry {
  id: string
  action: string
  version?: number
  fromStatus?: string
  toStatus?: string
  note?: string
  actorName?: string
  actorRole?: string
  createdAt: string
}

export interface TrainingProposalDetail extends TrainingProposalSummary {
  versions: TrainingProposalVersion[]
  audit: TrainingAuditEntry[]
  evaluation?: TrainingRuleEvaluation
  integrity?: { ok: boolean; issues: Array<{ code: string; severity: "critical" | "warning"; message: string }> }
}

export function emptyTrainingRule(): TrainingRuleInput {
  return {
    title: "",
    category: "scenario_response",
    channels: ["sms", "webchat"],
    intent: "",
    triggers: [],
    handling: "",
    instruction: "",
    requiredQuestions: [],
    mustInclude: [],
    mustAvoid: [],
    escalation: { when: "", handoffReason: "" },
    examples: [],
  }
}

export function ruleFromVersion(version: TrainingProposalVersion | undefined, fallback: Pick<TrainingProposalSummary, "title" | "category" | "channels">): TrainingRuleInput {
  const spec = version?.spec
  const category = spec?.category || fallback.category
  return {
    title: spec?.title || fallback.title || "",
    category: TRAINING_RULE_CATEGORIES.some((option) => option.value === category) ? category : "behavior",
    channels: ((spec?.channels || fallback.channels || []) as TrainingRuleChannel[]).filter((channel) => TRAINING_RULE_CHANNELS.some((option) => option.value === channel)),
    intent: spec?.intent || "",
    triggers: spec?.triggers || [],
    handling: spec?.handling || "",
    instruction: spec?.instruction || "",
    requiredQuestions: spec?.requiredQuestions || [],
    mustInclude: spec?.mustInclude || [],
    mustAvoid: spec?.mustAvoid || [],
    escalation: { when: spec?.escalation?.when || "", handoffReason: spec?.escalation?.handoffReason || "" },
    examples: spec?.examples || [],
  }
}

export interface TrainingProposalPage {
  proposals: TrainingProposalSummary[]
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface DraftEvaluation {
  id: string
  draftId: string
  rating: DraftRating
  correctedReply?: string
  reasonTags: string[]
  note?: string
  evaluatorName?: string
  isMine: boolean
  updatedAt: string
  expiresAt: string
}
