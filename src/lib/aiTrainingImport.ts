export const IMPORT_SOURCE_TYPES = [
  { value: "faq", label: "FAQ", destination: "knowledge" },
  { value: "business_info", label: "Business information", destination: "knowledge" },
  { value: "rule", label: "Response rule", destination: "proposal" },
  { value: "escalation", label: "Escalation", destination: "proposal" },
  { value: "tone", label: "Tone", destination: "proposal" },
  { value: "template", label: "Template", destination: "reference" },
  { value: "automation", label: "Automation", destination: "reference" },
] as const
export type ImportSourceType = (typeof IMPORT_SOURCE_TYPES)[number]["value"]

export const IMPORT_TYPE_LABELS: Record<string, string> = {
  ...Object.fromEntries(IMPORT_SOURCE_TYPES.map((type) => [type.value, type.label])),
  example: "Example",
  unknown: "Unknown type",
}

export const KNOWLEDGE_TOPIC_OPTIONS = [
  { value: "general", label: "General" },
  { value: "hours", label: "Hours" },
  { value: "address_directions", label: "Address and directions" },
  { value: "contact", label: "Contact" },
  { value: "departments", label: "Departments" },
  { value: "test_drives", label: "Test drives" },
  { value: "appointments", label: "Appointments" },
  { value: "documents_required", label: "Documents required" },
  { value: "trade_in_process", label: "Trade-in process" },
  { value: "financing_process", label: "Financing process" },
  { value: "delivery_shipping", label: "Delivery and shipping" },
  { value: "service", label: "Service" },
  { value: "warranty", label: "Warranty" },
] as const

export const IMPORT_HANDLING_OPTIONS = [
  { value: "", label: "Decide during review" },
  { value: "ai_handles", label: "Alex answers" },
  { value: "ask_clarifying", label: "Alex asks clarifying questions first" },
  { value: "escalate", label: "Alex hands off to a person" },
] as const

export const SOURCE_STATUS_NOTE = "Podium's On/Off is kept as a note only. Nothing imported turns on in Suprah."
export const BLANK_LOCATION_LABEL = "(No location in Podium)"
export const IMPORT_MAX_BYTES = 256 * 1024

export const IMPORT_STATUSES = [
  "ready",
  "ready_with_warnings",
  "changed",
  "unchanged",
  "duplicate_in_file",
  "needs_location",
  "blocked_privacy",
  "blocked_guardrail",
  "blocked_safety_bypass",
  "invalid",
  "parked_knowledge",
  "reference_only",
  "unsupported",
] as const
export type ImportStatus = (typeof IMPORT_STATUSES)[number]

export const IMPORT_STATUS_LABELS: Record<ImportStatus, string> = {
  ready: "Ready",
  ready_with_warnings: "Ready with warnings",
  changed: "Changed since last import",
  unchanged: "Already imported, unchanged",
  duplicate_in_file: "Duplicate in this file",
  needs_location: "Needs a location",
  blocked_privacy: "Held: personal details",
  blocked_guardrail: "Held: pricing or promises",
  blocked_safety_bypass: "Held: safety rule",
  invalid: "Held: needs fixing",
  parked_knowledge: "Knowledge Base item",
  reference_only: "Reference only",
  unsupported: "Unsupported type, reference only",
}

export type ImportGroup = "proposal" | "knowledge" | "reference" | "skipped" | "held" | "location"

export const IMPORT_GROUPS: Array<{ value: ImportGroup; label: string; description: string; statuses: ImportStatus[] }> = [
  { value: "location", label: "Needs a location", description: "Choose a location or confirm All locations before saving.", statuses: ["needs_location"] },
  { value: "proposal", label: "Draft proposals", description: "Saved as draft training rules. A manager reviews them; nothing is active.", statuses: ["ready", "ready_with_warnings", "changed"] },
  { value: "knowledge", label: "Knowledge Base items", description: "FAQ and business information. They become Knowledge Base drafts for a manager to review. Not used by Alex.", statuses: ["parked_knowledge"] },
  { value: "reference", label: "Inactive references", description: "Templates, automations and other items kept for reference only.", statuses: ["reference_only", "unsupported"] },
  { value: "skipped", label: "Skipped", description: "Already imported with the same content, or repeated in this file.", statuses: ["unchanged", "duplicate_in_file"] },
  { value: "held", label: "Held back", description: "Not converted. Fix the issues and import these rows again.", statuses: ["blocked_privacy", "blocked_guardrail", "blocked_safety_bypass", "invalid"] },
]

export const IMPORT_GROUP_STYLES: Record<ImportGroup, string> = {
  location: "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-400/40 dark:bg-amber-400/10 dark:text-amber-200",
  proposal: "border-sky-300 bg-sky-50 text-sky-700 dark:border-sky-400/40 dark:bg-sky-400/10 dark:text-sky-300",
  knowledge: "border-violet-300 bg-violet-50 text-violet-700 dark:border-violet-400/40 dark:bg-violet-400/10 dark:text-violet-300",
  reference: "border-slate-300 bg-slate-50 text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300",
  skipped: "border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400",
  held: "border-red-300 bg-red-50 text-red-700 dark:border-red-400/40 dark:bg-red-400/10 dark:text-red-300",
}

export function groupOf(status: string): ImportGroup {
  return IMPORT_GROUPS.find((group) => (group.statuses as string[]).includes(status))?.value || "held"
}

export interface ImportMappedPayload {
  kind?: string
  topic?: string
  title?: string
  body?: string
  description?: string
  content?: { question?: string; answer?: string }
  [key: string]: unknown
}

export interface ImportOriginalFields {
  itemType?: string
  title?: string
  location?: string
  triggerOrQuestion?: string
  answerOrInstruction?: string
  sourceStatus?: "on" | "off"
  sourceRef?: string
  topic?: string
  notes?: string
  [key: string]: unknown
}

export interface ImportIssue {
  field: string
  code: string
  severity: "error" | "warning" | "info"
  message: string
}

export interface ImportTarget {
  kind: "none" | "proposal_created" | "proposal_version" | "proposal_linked" | "parked_knowledge" | "reference"
  policyId?: string
  policyStatus?: string
  policyVersion?: number
  version?: number
  previousPolicyId?: string
  previousItemId?: string
}

export interface ImportPreviewRow {
  rowNumber: number
  type: string
  status: ImportStatus
  title?: string
  snippet: string
  fingerprint: string
  sourceStatus?: "on" | "off"
  nameReviewed: boolean
  needsNameReview: boolean
  issues: ImportIssue[]
  location: { label?: string; scope: "all" | "location" | "none"; via: "mapping" | "alias" | "unmapped"; locationId?: string; locationCode?: string; locationName?: string }
  target: ImportTarget
  conflicts: Array<{ kind: "proposal" | "coaching"; id: string; title: string; score: number }>
  mapped?: {
    target: "training_proposal" | "knowledge_entry" | "reference"
    spec?: Record<string, unknown>
    preview?: { headline: string; handlingLabel: string; channels: string[]; sections: Array<{ label: string; items: string[] }> }
    payload?: ImportMappedPayload
  }
  contentWillBeStored: boolean
  retentionDays?: number
}

export type KnowledgeImportState = "saved" | "ready" | "needs_contact_verification" | "needs_attention" | "newer_saved" | "knowledge_base_off"

export interface KnowledgeImportStatus {
  state: KnowledgeImportState
  message: string
  entryId?: string
  entryStatus?: string
  entryLifecycle?: string
}

export interface KnowledgeSaveResult {
  enabled: boolean
  message?: string
  error?: string
  created?: number
  updated?: number
  counts?: Partial<Record<KnowledgeImportState, number>>
  results?: Array<KnowledgeImportStatus & { itemId: string; rowNumber: number; title?: string }>
}

export const KNOWLEDGE_IMPORT_LABELS: Record<KnowledgeImportState, string> = {
  saved: "In the Knowledge Base",
  ready: "Ready for the Knowledge Base",
  needs_contact_verification: "Needs contact verification",
  needs_attention: "Needs attention",
  newer_saved: "Newer version in the Knowledge Base",
  knowledge_base_off: "Knowledge Base is off",
}

export const KNOWLEDGE_IMPORT_TONES: Record<KnowledgeImportState, string> = {
  saved: "text-emerald-700 dark:text-emerald-300",
  ready: "text-sky-700 dark:text-sky-300",
  needs_contact_verification: "text-amber-700 dark:text-amber-300",
  needs_attention: "text-amber-700 dark:text-amber-300",
  newer_saved: "text-muted-foreground",
  knowledge_base_off: "text-muted-foreground",
}

export function knowledgeGroupDescription(enabled: boolean): string {
  return enabled
    ? "FAQ and business information. Saving turns them into Knowledge Base drafts for a manager to review. Not used by Alex."
    : "FAQ and business information. The Knowledge Base is off, so they are kept here until an admin turns it on."
}

export interface ImportPreview {
  previewHash: string
  engineVersion: string
  format: string
  fileName?: string
  fileNameWithheld: boolean
  rowCount: number
  counts: Record<ImportStatus, number>
  canCommit: boolean
  knowledgeBase?: { enabled: boolean }
  blocking: string[]
  batchIssues: ImportIssue[]
  attestationText: string
  attestationVersion: string
  retentionDays: { converted: number; parked: number; rejected: number }
  locationMappings: Array<{ sourceLabel: string; scope: "all" | "location"; locationId?: string; locationCode?: string }>
  unmappedLabels: string[]
  missingFromSnapshot: Array<{ itemId: string; title?: string; batchNumber?: number }>
  rows: ImportPreviewRow[]
}

export interface ImportBatch {
  id: string
  batchNumber: number
  sourceSystem: string
  mode: "initial" | "incremental"
  fullSnapshot: boolean
  format: string
  fileName?: string
  fileNameWithheld: boolean
  rowCount: number
  statusCounts: Partial<Record<ImportStatus, number>>
  proposalsCreated: number
  proposalsUpdated: number
  locationMappings: Array<{ sourceLabel: string; scope: "all" | "location"; locationId?: string; locationCode?: string }>
  businessContacts: Array<{ kind: string; value: string }>
  attestation?: { version: string; byName?: string; at: string }
  retention: { convertedDays: number; parkedDays: number; rejectedDays: number }
  missingFromSnapshotCount: number
  engineVersion: string
  createdByName?: string
  createdAt: string
  storedOriginals: number
  purgedAt?: string
  canPurge: boolean
}

export interface ImportBatchPage {
  batches: ImportBatch[]
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface ImportItem {
  id: string
  rowNumber: number
  type: string
  status: ImportStatus
  issueCodes: string[]
  title?: string
  sourceRef?: string
  sourceLocationLabel?: string
  sourceStatus?: "on" | "off"
  locationScope: { kind: "all" | "location" | "none"; locationId?: string; locationCode?: string }
  fingerprint: string
  keyRevision?: number
  target: ImportTarget
  retentionClass?: "converted" | "parked" | "rejected"
  contentExpiresAt?: string
  contentStatus: "stored" | "not_stored" | "purged" | "expired" | "removed"
  purgedAt?: string
  nameReviewedBy?: string
  knowledge?: KnowledgeImportStatus
  createdAt: string
}

export interface ImportBatchDetail {
  batch: ImportBatch
  knowledge?: { enabled: boolean; counts: Partial<Record<KnowledgeImportState, number>> }
  knowledgeSave?: KnowledgeSaveResult
  missingFromSnapshot: Array<{ itemId: string; title?: string }>
  items: ImportItem[]
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface ImportItemDetail {
  batch: { id: string; batchNumber: number; createdAt: string; createdByName?: string; format: string }
  item: ImportItem
  original?: { fields: ImportOriginalFields; mappedPayload?: Record<string, unknown>; expiresAt: string }
  linkedProposal?: { id: string; title: string; status: string; currentVersion: number }
}

export interface ImportTemplate {
  format: "csv" | "json"
  fileName: string
  content: string
  columns: Array<{ name: string; list: boolean; maxLength: number; maxItems?: number; description: string }>
}

export interface BusinessContact {
  kind: "phone" | "email" | "domain"
  value: string
}

export interface ManualImportItem {
  type: ImportSourceType
  title: string
  locationChoice: string
  sourceStatus: "on" | "off"
  channels: string[]
  triggerOrQuestion: string
  answerOrInstruction: string
  handling: string
  escalationWhen: string
  handoffReason: string
  exampleCustomer: string
  exampleReply: string
  topic: string
  sourceRef: string
  notes: string
}

export function emptyManualItem(): ManualImportItem {
  return {
    type: "faq", title: "", locationChoice: "", sourceStatus: "on", channels: [], triggerOrQuestion: "", answerOrInstruction: "",
    handling: "", escalationWhen: "", handoffReason: "", exampleCustomer: "", exampleReply: "", topic: "", sourceRef: "", notes: "",
  }
}

export const ALL_LOCATIONS_LABEL = "All locations"

export function manualItemToRow(item: ManualImportItem, locationLabel: string): Record<string, unknown> {
  const isRule = item.type === "rule" || item.type === "escalation" || item.type === "tone"
  const isKnowledge = item.type === "faq" || item.type === "business_info"
  const row: Record<string, unknown> = {
    type: item.type,
    title: item.title,
    location: locationLabel,
    source_status: item.sourceStatus,
    channels: item.channels,
    trigger_or_question: item.triggerOrQuestion,
    answer_or_instruction: item.answerOrInstruction,
    source_ref: item.sourceRef,
    notes: item.notes,
  }
  if (isRule) {
    Object.assign(row, {
      handling: item.handling,
      escalation_when: item.escalationWhen,
      handoff_reason: item.handoffReason,
      example_customer: item.exampleCustomer,
      example_reply: item.exampleReply,
    })
  }
  if (isKnowledge) row.topic = item.topic
  return Object.fromEntries(Object.entries(row).filter(([, value]) => (Array.isArray(value) ? value.length : value !== "")))
}

export function targetLabel(target: ImportTarget, knowledgeEnabled = false): string {
  switch (target.kind) {
    case "proposal_created": return "Creates a new draft proposal"
    case "proposal_version": return "Adds a new version to the earlier imported draft"
    case "proposal_linked": return "Creates a new draft linked to the earlier proposal"
    case "parked_knowledge": return knowledgeEnabled ? "Becomes a Knowledge Base draft for review" : "Kept until the Knowledge Base is turned on"
    case "reference": return "Kept as an inactive reference"
    default: return "Not saved"
  }
}

export const CONTENT_STATUS_LABELS: Record<ImportItem["contentStatus"], string> = {
  stored: "Original stored",
  not_stored: "Original not stored",
  purged: "Original removed by an admin",
  expired: "Original expired",
  removed: "Original no longer stored",
}

export const PASTE_FORMAT_HELP = [
  "Separate entries with a line of three dashes: ---",
  "Put labels such as Type:, Title:, Location:, Status:, Topic: and Q: first, and A: last.",
  "Everything after A: belongs to the answer, including blank lines and lines like \"Note:\".",
  "Entries with a Q: and no Type: are imported as FAQs.",
]

export const PASTE_PLACEHOLDER = "Type: faq\nLocation: (Podium location)\nStatus: On\nQ: (question from Podium)\nA: (answer from Podium)\n---\nType: rule\nTitle: (short title)\nQ: (what the customer asks)\nA: (how Alex should respond)"

export function downloadText(fileName: string, content: string, type: string): void {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const link = document.createElement("a")
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export function locationLabelText(label?: string): string {
  return label ? label : BLANK_LOCATION_LABEL
}
