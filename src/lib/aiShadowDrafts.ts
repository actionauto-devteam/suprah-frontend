import type { AiChannel } from "@/lib/aiOperatingModes"

export const SHADOW_DRAFT_STATUSES = [
  "ready",
  "needs_human",
  "blocked_safety",
  "skipped_attention",
  "skipped_technical",
  "skipped_cap",
  "failed",
  "interrupted",
  "generating",
  "claimed",
] as const
export type ShadowDraftStatus = (typeof SHADOW_DRAFT_STATUSES)[number]

export const SHADOW_DRAFT_STATUS_LABELS: Record<ShadowDraftStatus, string> = {
  ready: "Ready",
  needs_human: "Needs a person",
  blocked_safety: "Blocked by safety",
  skipped_attention: "Skipped: customer needs a person",
  skipped_technical: "Skipped: safety check unavailable",
  skipped_cap: "Skipped: daily limit",
  failed: "Failed",
  interrupted: "Interrupted",
  generating: "Generating",
  claimed: "Queued",
}

export const SHADOW_DRAFT_STATUS_STYLES: Record<ShadowDraftStatus, string> = {
  ready: "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-400/40 dark:bg-emerald-400/10 dark:text-emerald-300",
  needs_human: "border-sky-300 bg-sky-50 text-sky-700 dark:border-sky-400/40 dark:bg-sky-400/10 dark:text-sky-300",
  blocked_safety: "border-red-300 bg-red-50 text-red-700 dark:border-red-400/40 dark:bg-red-400/10 dark:text-red-300",
  skipped_attention: "border-violet-300 bg-violet-50 text-violet-700 dark:border-violet-400/40 dark:bg-violet-400/10 dark:text-violet-300",
  skipped_technical: "border-zinc-300 bg-zinc-50 text-zinc-700 dark:border-zinc-500/40 dark:bg-zinc-400/10 dark:text-zinc-300",
  skipped_cap: "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-400/40 dark:bg-amber-400/10 dark:text-amber-300",
  failed: "border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200",
  interrupted: "border-orange-300 bg-orange-50 text-orange-700 dark:border-orange-400/40 dark:bg-orange-400/10 dark:text-orange-300",
  generating: "border-slate-300 bg-slate-50 text-slate-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300",
  claimed: "border-slate-300 bg-slate-50 text-slate-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300",
}

export const SHADOW_CHANNEL_LABELS: Record<AiChannel, string> = {
  sms: "Text",
  email: "Email",
  webchat: "Website chat",
}

export interface ShadowDraftSummary {
  id: string
  channel: AiChannel
  status: ShadowDraftStatus
  statusReason?: string
  kind?: "reply" | "vehicle_clarification"
  lead: { id: string; name: string } | null
  preview?: string
  handoffReason?: string
  classifierVerdict?: "SAFE" | "UNSAFE" | "ERROR"
  deterministicOk?: boolean
  coachingVerdict?: string
  wouldHaveBeenCapped?: boolean
  aiModel?: string
  latencyMs?: number
  totalTokens?: number
  aiCallCount?: number
  inquiryReceivedAt?: string
  createdAt: string
  completedAt?: string
  expiresAt: string
}

export interface ShadowInquiryMessage {
  from: "customer" | "ai" | "staff"
  staffName?: string
  body: string
  at?: string
  isSource: boolean
}

export interface ShadowDraftDetail extends Omit<ShadowDraftSummary, "lead"> {
  draftText?: string
  deterministicReasons: string[]
  coachingRuleIds: string[]
  vehicleResolution?: string
  failureReason?: string
  modeAtClaim?: string
  promptTokens?: number
  completionTokens?: number
  usageDay?: string
  generationStartedAt?: string
  lead: { id: string; name: string; vehicle?: string; status?: string; source?: string } | null
  inquiry: { available: boolean; messages?: ShadowInquiryMessage[] }
}

export interface ShadowDraftPage {
  drafts: ShadowDraftSummary[]
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface ShadowUsageDay {
  day: string
  attempts: number
  drafts: number
  statuses: Partial<Record<ShadowDraftStatus, number>>
  averageLatencyMs: number | null
  tokensReported: number
  promptTokens: number | null
  completionTokens: number | null
  totalTokens: number | null
}

export interface ShadowUsageReport {
  timezone: string
  dailyLimit: number
  today: { day: string; used: number; limit: number }
  days: ShadowUsageDay[]
}

export interface AiChangeHistoryRow {
  id: string
  channel: AiChannel | "shadow_drafts"
  fromMode: string
  toMode: string
  fromSource?: string
  reason: string
  changedByName: string
  createdAt: string
}

export interface AiChangeHistoryPage {
  changes: AiChangeHistoryRow[]
  page: number
  limit: number
  total: number
  totalPages: number
}

export function canViewAiHub(role: string | undefined): boolean {
  return role === "admin" || role === "manager"
}

export function formatLatency(ms?: number | null): string {
  if (typeof ms !== "number") return "—"
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)} s` : `${ms} ms`
}

export function formatTokens(tokens?: number | null): string {
  return typeof tokens === "number" ? tokens.toLocaleString() : "Not reported"
}
