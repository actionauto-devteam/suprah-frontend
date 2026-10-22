export const KB_KINDS = ["faq", "business_info"] as const
export type KbKind = (typeof KB_KINDS)[number]

export const KB_KIND_LABELS: Record<KbKind, string> = {
  faq: "FAQ",
  business_info: "Business information",
}

export const KB_TOPICS = [
  "hours", "address_directions", "contact", "departments", "test_drives", "appointments", "documents_required",
  "trade_in_process", "financing_process", "delivery_shipping", "service", "warranty", "general",
] as const
export type KbTopic = (typeof KB_TOPICS)[number]

export const KB_TOPIC_LABELS: Record<KbTopic, string> = {
  hours: "Hours",
  address_directions: "Address & directions",
  contact: "Contact",
  departments: "Departments",
  test_drives: "Test drives",
  appointments: "Appointments",
  documents_required: "Documents to bring",
  trade_in_process: "Trade-in process",
  financing_process: "Financing process",
  delivery_shipping: "Delivery & shipping",
  service: "Service",
  warranty: "Warranty",
  general: "General",
}

export const KB_STATUSES = ["draft", "in_review", "changes_requested", "approved", "rejected"] as const
export type KbStatusValue = (typeof KB_STATUSES)[number]

export const KB_STATUS_LABELS: Record<KbStatusValue, string> = {
  draft: "Draft",
  in_review: "Waiting for review",
  changes_requested: "Changes requested",
  approved: "Approved",
  rejected: "Rejected",
}

export const KB_LIFECYCLES = ["active", "disabled", "archived"] as const
export type KbLifecycle = (typeof KB_LIFECYCLES)[number]

export const KB_CHANNELS = ["sms", "webchat", "email"] as const
export type KbChannel = (typeof KB_CHANNELS)[number]
export const KB_CHANNEL_LABELS: Record<KbChannel, string> = { sms: "SMS", webchat: "Webchat", email: "Email" }

export type KbApprovalState = "not_approved" | "valid" | "partial" | "suspended" | "invalidated" | "disabled" | "archived"

export const KB_INVALIDATION_LABELS: Record<string, string> = {
  detail_changed: "A verified contact or program this answer uses was changed.",
  detail_revoked: "A verified contact or program this answer uses was revoked.",
  detail_archived: "A verified contact or program this answer uses was archived.",
  entry_restored: "The entry was restored from the archive, so it needs a fresh review.",
}

export const KB_AUDIT_LABELS: Record<string, string> = {
  entry_created: "Draft created",
  version_saved: "New version saved",
  entry_submitted: "Submitted for review",
  changes_requested: "Changes requested",
  entry_approved: "Approved",
  entry_rejected: "Rejected",
  entry_disabled: "Disabled",
  entry_enabled: "Turned back on",
  entry_archived: "Archived",
  entry_restored: "Restored for review",
  approval_invalidated: "Approval invalidated",
  location_suspended: "Location suspended",
  knowledge_base_enabled: "Knowledge Base turned on",
  knowledge_base_disabled: "Knowledge Base turned off",
  detail_proposed: "Verified detail proposed",
  detail_updated: "Verified detail changed",
  detail_approved: "Verified detail approved",
  detail_reapproved: "Verified detail re-approved for a location",
  detail_revoked: "Verified detail revoked",
  detail_archived: "Verified detail archived",
  detail_location_suspended: "Verified detail suspended at a location",
}

export const VERIFIED_DETAIL_KINDS = ["phone", "email", "website", "program"] as const
export type VerifiedDetailKind = (typeof VERIFIED_DETAIL_KINDS)[number]
export const VERIFIED_DETAIL_KIND_LABELS: Record<VerifiedDetailKind, string> = {
  phone: "Phone number",
  email: "Email address",
  website: "Website",
  program: "Discount program",
}

export const VERIFIED_DETAIL_STATUSES = ["pending", "approved", "revoked", "archived"] as const
export type VerifiedDetailStatus = (typeof VERIFIED_DETAIL_STATUSES)[number]
export const VERIFIED_DETAIL_STATUS_LABELS: Record<VerifiedDetailStatus, string> = {
  pending: "Waiting for approval",
  approved: "Approved",
  revoked: "Revoked",
  archived: "Archived",
}

export const VERIFIED_PROGRAM_TYPES = ["military", "first_responder", "educator", "healthcare", "college_graduate", "loyalty", "other"] as const
export type VerifiedProgramType = (typeof VERIFIED_PROGRAM_TYPES)[number]
export const VERIFIED_PROGRAM_TYPE_LABELS: Record<VerifiedProgramType, string> = {
  military: "Military",
  first_responder: "First responders",
  educator: "Educators",
  healthcare: "Healthcare workers",
  college_graduate: "College graduates",
  loyalty: "Loyalty",
  other: "Other",
}

export interface KbAvailability {
  serverEnabled: boolean
  orgEnabled: boolean
  enabled: boolean
  canCreate: boolean
  canReview: boolean
  canManageSettings: boolean
  affectsAlex: boolean
}

export interface KbLocationScope {
  scope: "all" | "locations"
  locationIds: string[]
}

export interface KbLocation {
  id: string
  name: string
  code: string
  status: "active" | "archived"
}

export interface KbActorRef {
  name?: string
  role?: string
}

export interface KbApproval {
  version: number
  state: KbApprovalState
  valid: boolean
  needsReapproval: boolean
  invalidation?: { reason: string; at: string; by?: KbActorRef }
  scope?: KbLocationScope
  suspendedLocationIds: string[]
  activeSuspendedLocationIds: string[]
  dependencyCount: number
}

export interface KbEntrySummary {
  id: string
  kind: KbKind
  topic: KbTopic
  title: string
  question?: string
  channels: KbChannel[]
  locationScope: KbLocationScope
  status: KbStatusValue
  lifecycle: KbLifecycle
  currentVersion: number
  submittedVersion?: number
  approvedVersion?: number
  approval?: KbApproval
  source: { system: "manual" | "podium_import"; importBatchNumber?: number; sourceRef?: string; sourceLocationLabel?: string; sourceStatus?: "on" | "off" }
  createdBy?: KbActorRef
  isMine: boolean
  lastEditedBy?: KbActorRef
  submittedAt?: string
  lastReview?: { action: string; note?: string; by?: KbActorRef; at: string }
  approvedBy?: KbActorRef
  approvedAt?: string
  disabledAt?: string
  archivedAt?: string
  restoredAt?: string
  createdAt: string
  updatedAt: string
}

export interface KbContent {
  kind: KbKind
  topic: KbTopic
  title: string
  question?: string
  answer: string
  channels: KbChannel[]
  locationScope: KbLocationScope
}

export interface KbVersion {
  version: number
  content: KbContent
  changeNote?: string
  createdBy?: KbActorRef
  createdAt: string
}

export interface KbIssue {
  field: string
  code: string
  message: string
  entryIds?: string[]
  detailId?: string
}

export interface KbEntryDetail {
  entry: KbEntrySummary
  current: KbVersion | null
  approved?: KbVersion
  check: { errors: KbIssue[]; warnings: KbIssue[] }
  duplicates: Array<{ id: string; status: KbStatusValue; lifecycle: KbLifecycle }>
  conflicts: string[]
  permissions: {
    canEdit: boolean
    canSubmit: boolean
    canReview: boolean
    canDisable: boolean
    canEnable: boolean
    canArchive: boolean
    canRestore: boolean
  }
}

export interface KbEntryPage {
  items: KbEntrySummary[]
  page: number
  limit: number
  total: number
}

export interface KbVersionSummary {
  version: number
  changeNote?: string
  createdBy?: KbActorRef
  createdAt: string
  isCurrent: boolean
  isApproved: boolean
}

export interface KbAuditRow {
  id: string
  entryId?: string
  detailId?: string
  locationId?: string
  action: string
  version?: number
  fromStatus?: string
  toStatus?: string
  fromLifecycle?: string
  toLifecycle?: string
  note?: string
  actor?: KbActorRef
  createdAt: string
}

export interface KbAuditPage {
  items: KbAuditRow[]
  page: number
  limit: number
  total: number
}

export interface VerifiedDetail {
  id: string
  kind: VerifiedDetailKind
  value: string
  label?: string
  programType?: VerifiedProgramType
  locationScope: KbLocationScope
  status: VerifiedDetailStatus
  revision: number
  proposedBy?: KbActorRef
  approvedBy?: KbActorRef
  approvedAt?: string
  revokedAt?: string
  archivedAt?: string
  suspendedLocationIds: string[]
  needsReapproval: boolean
  reapprovedAt?: string
  updatedAt: string
}

export interface VerifiedDetailView {
  detail: VerifiedDetail
  revisions: Array<{ revision: number; value: string; label?: string; programType?: VerifiedProgramType; locationScope: KbLocationScope; createdBy?: KbActorRef; createdAt: string }>
  dependentEntries: Array<{ id: string; status: KbStatusValue; lifecycle: KbLifecycle; invalidated: boolean }>
  history: Array<{ action: string; version?: number; fromStatus?: string; toStatus?: string; note?: string; actor?: KbActorRef; createdAt: string }>
}

export type KbTone = "slate" | "sky" | "amber" | "emerald" | "red" | "violet"

export const KB_TONE_STYLES: Record<KbTone, string> = {
  slate: "border-slate-300 bg-slate-50 text-slate-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300",
  sky: "border-sky-300 bg-sky-50 text-sky-700 dark:border-sky-400/40 dark:bg-sky-400/10 dark:text-sky-300",
  amber: "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-400/40 dark:bg-amber-400/10 dark:text-amber-300",
  emerald: "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-400/40 dark:bg-emerald-400/10 dark:text-emerald-300",
  red: "border-red-300 bg-red-50 text-red-700 dark:border-red-400/40 dark:bg-red-400/10 dark:text-red-300",
  violet: "border-violet-300 bg-violet-50 text-violet-700 dark:border-violet-400/40 dark:bg-violet-400/10 dark:text-violet-300",
}

export interface KbDisplay {
  label: string
  tone: KbTone
  note?: string
}

export function approvalDisplay(approval?: KbApproval): KbDisplay | null {
  if (!approval) return null
  switch (approval.state) {
    case "valid":
      return { label: "Approved", tone: "emerald", note: "Approved for every location it covers. Not used by Alex yet." }
    case "partial":
      return { label: "Approved · suspended at some locations", tone: "amber", note: "Not valid at the suspended locations until it is reviewed again." }
    case "suspended":
      return { label: "Approval suspended", tone: "amber", note: "Not valid at any location until it is reviewed again." }
    case "invalidated":
      return { label: "Needs re-approval", tone: "red", note: KB_INVALIDATION_LABELS[approval.invalidation?.reason || ""] || "This approval is no longer valid." }
    case "disabled":
      return { label: "Approval paused · disabled", tone: "slate", note: "Not valid while the entry is disabled." }
    case "archived":
      return { label: "Approval ended · archived", tone: "slate", note: "Not valid while the entry is archived." }
    default:
      return null
  }
}

export function entryDisplay(entry: Pick<KbEntrySummary, "status" | "lifecycle" | "approval">): KbDisplay {
  if (entry.lifecycle === "archived") return { label: "Archived", tone: "slate" }
  if (entry.lifecycle === "disabled") return { label: "Disabled", tone: "slate" }
  if (entry.status === "approved") return approvalDisplay(entry.approval) || { label: "Approved", tone: "emerald" }
  if (entry.status === "in_review") return { label: "Waiting for review", tone: "sky" }
  if (entry.status === "changes_requested") return { label: "Changes requested", tone: "amber" }
  if (entry.status === "rejected") return { label: "Rejected", tone: "red" }
  return { label: entry.approval ? "Draft revision" : "Draft", tone: "slate" }
}

export function detailDisplay(detail: Pick<VerifiedDetail, "status" | "needsReapproval" | "suspendedLocationIds" | "locationScope">): KbDisplay {
  if (detail.status === "approved") {
    const suspended = new Set(detail.suspendedLocationIds)
    const ids = detail.locationScope?.scope === "locations" ? detail.locationScope.locationIds : []
    if (ids.length > 0 && ids.every((id) => suspended.has(id))) return { label: "Approval suspended", tone: "amber" }
    if (detail.needsReapproval) return { label: "Approved · suspended at some locations", tone: "amber" }
    if (suspended.size) return { label: "Approved · suspended at archived locations", tone: "amber" }
    return { label: "Approved", tone: "emerald" }
  }
  if (detail.status === "pending") return { label: "Waiting for approval", tone: "sky" }
  if (detail.status === "revoked") return { label: "Revoked", tone: "red" }
  return { label: "Archived", tone: "slate" }
}

const FIELD_LABELS: Record<string, string> = {
  kind: "Type",
  topic: "Topic",
  title: "Title",
  question: "Question",
  answer: "Answer",
  channels: "Channels",
  locations: "Locations",
  "locations.scope": "Locations",
  "locations.locationIds": "Locations",
  changeNote: "Change note",
  expectedVersion: "Version",
  value: "Value",
  label: "Label",
  programType: "Program type",
  source: "Source",
}

export function kbFieldLabel(field: string): string {
  if (FIELD_LABELS[field]) return FIELD_LABELS[field]
  const location = /^locations\.locationIds\.(\d+)$/.exec(field)
  if (location) return `Location ${Number(location[1]) + 1}`
  const channel = /^channels\.(\d+)$/.exec(field)
  if (channel) return `Channel ${Number(channel[1]) + 1}`
  return field
}

export function locationNames(scope: KbLocationScope | undefined, locations: KbLocation[]): string {
  if (!scope) return "—"
  if (scope.scope === "all") return "All Locations"
  const byId = new Map(locations.map((location) => [location.id, location]))
  return scope.locationIds.map((id) => {
    const location = byId.get(id)
    if (!location) return "Unknown location"
    return location.status === "archived" ? `${location.name} (archived)` : location.name
  }).join(", ")
}

export function locationNameList(ids: string[], locations: KbLocation[]): string[] {
  const byId = new Map(locations.map((location) => [location.id, location]))
  return ids.map((id) => byId.get(id)?.name || "Unknown location")
}
