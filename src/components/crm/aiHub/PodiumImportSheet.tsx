"use client"

import * as React from "react"
import Link from "next/link"
import { AlertTriangle, CheckCircle2, Download, FileUp, Info, Loader2, Plus, RefreshCw, Trash2, XCircle } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"
import { apiClient } from "@/lib/api-client"
import { trainingErrorMessage, trainingRequest } from "@/hooks/useAiTraining"
import { useCrmLocations } from "@/hooks/useCrmLocations"
import { TRAINING_RULE_CHANNELS } from "@/lib/aiTraining"
import type { CrmLocation } from "@/lib/crmLocations"
import {
  ALL_LOCATIONS_LABEL,
  IMPORT_GROUPS,
  IMPORT_GROUP_STYLES,
  IMPORT_HANDLING_OPTIONS,
  IMPORT_MAX_BYTES,
  IMPORT_SOURCE_TYPES,
  IMPORT_STATUS_LABELS,
  IMPORT_TYPE_LABELS,
  KNOWLEDGE_TOPIC_OPTIONS,
  PASTE_FORMAT_HELP,
  PASTE_PLACEHOLDER,
  SOURCE_STATUS_NOTE,
  downloadText,
  emptyManualItem,
  groupOf,
  knowledgeGroupDescription,
  locationLabelText,
  manualItemToRow,
  targetLabel,
  type BusinessContact,
  type ImportBatchDetail,
  type ImportGroup,
  type ImportIssue,
  type ImportPreview,
  type ImportPreviewRow,
  type ImportTemplate,
  type ManualImportItem,
} from "@/lib/aiTrainingImport"

type SourceTab = "file" | "paste" | "manual"
type Step = "source" | "review" | "done"

interface LoadedFile {
  name: string
  format: "csv" | "json"
  content: string
  size: number
}

const SELECT_CLASS = "h-9 w-full rounded-lg border border-input bg-background px-2.5 text-xs"
const FIELD_LABEL = "text-[11px] font-semibold"

function issueTone(severity: ImportIssue["severity"]) {
  if (severity === "error") return "text-red-700 dark:text-red-300"
  if (severity === "warning") return "text-amber-700 dark:text-amber-300"
  return "text-muted-foreground"
}

function IssueIcon({ severity }: { severity: ImportIssue["severity"] }) {
  if (severity === "error") return <XCircle className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
  if (severity === "warning") return <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
  return <Info className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
}

export function ImportGroupBadge({ status }: { status: string }) {
  const group = groupOf(status)
  return (
    <span className={cn("inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold", IMPORT_GROUP_STYLES[group])}>
      {IMPORT_STATUS_LABELS[status as keyof typeof IMPORT_STATUS_LABELS] || status}
    </span>
  )
}

function locationText(row: ImportPreviewRow): string {
  const label = row.location.label === undefined ? "Hidden" : locationLabelText(row.location.label)
  if (row.location.scope === "none") return `${label} → needs a location`
  if (row.location.scope === "all") return `${label} → All locations`
  return `${label} → ${row.location.locationName || row.location.locationCode}${row.location.via === "alias" ? " (matched by its other names)" : ""}`
}

function PreviewRowCard({ row, knowledgeEnabled, onReviewNames }: { row: ImportPreviewRow; knowledgeEnabled: boolean; onReviewNames: (row: ImportPreviewRow) => void }) {
  const issues = row.issues
    .filter((issue, index, all) => all.findIndex((other) => other.severity === issue.severity && other.message === issue.message) === index)
    .sort((a, b) => ["error", "warning", "info"].indexOf(a.severity) - ["error", "warning", "info"].indexOf(b.severity))
  return (
    <li className="rounded-xl border border-border/40 p-3" aria-label={`Row ${row.rowNumber}`}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] font-semibold text-muted-foreground">Row {row.rowNumber}</span>
        <span className="text-[10px] text-muted-foreground">{IMPORT_TYPE_LABELS[row.type] || row.type}</span>
        <ImportGroupBadge status={row.status} />
        {row.sourceStatus && (
          <span className="rounded-full border border-border/60 px-2 py-0.5 text-[10px] text-muted-foreground" title={SOURCE_STATUS_NOTE}>
            Podium: {row.sourceStatus === "on" ? "On" : "Off"}
          </span>
        )}
      </div>
      <p className="mt-1.5 break-words text-xs font-semibold">{row.title || (row.status === "blocked_privacy" ? "Hidden because it may contain personal details" : "Untitled")}</p>
      {row.snippet && <p className="mt-0.5 line-clamp-2 break-words text-[11px] text-muted-foreground">{row.snippet}</p>}
      <p className="mt-1 text-[11px] text-muted-foreground">{locationText(row)}</p>
      <p className="mt-0.5 text-[11px] font-medium">{row.issues.some((issue) => issue.code === "knowledge_contact_unverified")
        ? "Kept until its contact is approved"
        : row.issues.some((issue) => issue.code === "knowledge_entry_inactive")
          ? "Kept; its Knowledge Base entry won't be changed"
          : targetLabel(row.target, knowledgeEnabled)}{row.target.kind === "proposal_linked" && row.target.policyStatus ? ` (the earlier one is ${row.target.policyStatus.replace(/_/g, " ")})` : ""}</p>
      {row.conflicts.length > 0 && (
        <p className="mt-0.5 text-[11px] text-amber-700 dark:text-amber-300">
          May overlap with: {row.conflicts.map((conflict) => `${conflict.title} (${conflict.kind === "coaching" ? "coaching note" : "proposal"})`).join(", ")}
        </p>
      )}
      {issues.length > 0 && (
        <ul aria-label={`Row ${row.rowNumber} checks`} className="mt-2 space-y-0.5">
          {issues.map((issue, index) => (
            <li key={`${issue.code}-${issue.field}-${index}`} className={cn("flex items-start gap-1.5 text-[11px]", issueTone(issue.severity))}>
              <IssueIcon severity={issue.severity} />
              <span className="break-words">{issue.message}</span>
            </li>
          ))}
        </ul>
      )}
      {row.needsNameReview && (
        <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-2 text-[11px] text-amber-800 dark:text-amber-200">
          <span className="min-w-0 flex-1">If every name in this example is made up, mark it as reviewed. Otherwise replace the names and import again.</span>
          <Button size="sm" variant="outline" className="h-7" onClick={() => onReviewNames(row)}>These names are made up</Button>
        </div>
      )}
      {row.mapped && (
        <details className="mt-2 rounded-lg border border-border/40 bg-muted/20 p-2 text-[11px]">
          <summary className="cursor-pointer font-semibold">What will be saved</summary>
          {row.mapped.target === "training_proposal" && row.mapped.preview ? (
            <div className="mt-1.5 space-y-1">
              <p className="font-medium">{row.mapped.preview.headline}</p>
              <p className="text-muted-foreground">{row.mapped.preview.channels.join(" · ")} · {row.mapped.preview.handlingLabel}</p>
              {row.mapped.preview.sections.map((section) => (
                <div key={section.label}>
                  <p className="font-semibold">{section.label}</p>
                  <ul className="ml-4 list-disc text-muted-foreground">{section.items.map((item, index) => <li key={index} className="break-words">{item}</li>)}</ul>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-1.5 space-y-1 break-words text-muted-foreground">
              {row.mapped.payload?.content?.question && <p><span className="font-semibold text-foreground">Question:</span> {row.mapped.payload.content.question}</p>}
              {row.mapped.payload?.content?.answer && <p className="whitespace-pre-wrap"><span className="font-semibold text-foreground">Answer:</span> {row.mapped.payload.content.answer}</p>}
              {row.mapped.payload?.body && <p className="whitespace-pre-wrap"><span className="font-semibold text-foreground">Text:</span> {row.mapped.payload.body}</p>}
              {row.mapped.payload?.description && <p className="whitespace-pre-wrap"><span className="font-semibold text-foreground">Description:</span> {row.mapped.payload.description}</p>}
              {row.mapped.payload?.topic && <p>Topic: {row.mapped.payload.topic}</p>}
            </div>
          )}
          {row.retentionDays && <p className="mt-1.5 text-muted-foreground">The original text is kept for {row.retentionDays} days.</p>}
        </details>
      )}
    </li>
  )
}

function ManualItemForm({ item, onChange, locations, locationsLoading }: {
  item: ManualImportItem
  onChange: (item: ManualImportItem) => void
  locations: CrmLocation[]
  locationsLoading: boolean
}) {
  const set = <K extends keyof ManualImportItem>(key: K, value: ManualImportItem[K]) => onChange({ ...item, [key]: value })
  const isRule = item.type === "rule" || item.type === "escalation" || item.type === "tone"
  const isKnowledge = item.type === "faq" || item.type === "business_info"
  const questionLabel = isKnowledge ? "Question" : item.type === "automation" ? "Trigger" : "What the customer says or asks"
  const answerLabel = isKnowledge ? "Answer" : item.type === "template" ? "Template text" : item.type === "automation" ? "What the automation does" : "How Alex should respond"
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="space-y-1">
        <label htmlFor="manual-type" className={FIELD_LABEL}>Source type</label>
        <select id="manual-type" className={SELECT_CLASS} value={item.type} onChange={(event) => set("type", event.target.value as ManualImportItem["type"])}>
          {IMPORT_SOURCE_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
        </select>
      </div>
      <div className="space-y-1">
        <label htmlFor="manual-title" className={FIELD_LABEL}>Title (optional)</label>
        <Input id="manual-title" value={item.title} maxLength={120} onChange={(event) => set("title", event.target.value)} />
      </div>
      <div className="space-y-1">
        <label htmlFor="manual-location" className={FIELD_LABEL}>Location</label>
        <select id="manual-location" className={SELECT_CLASS} value={item.locationChoice} onChange={(event) => set("locationChoice", event.target.value)}>
          <option value="">Choose…</option>
          <option value="all">All locations (organization-wide)</option>
          {locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}
        </select>
        {!locationsLoading && !locations.length && (
          <p className="text-[10px] text-muted-foreground">No locations yet. An admin can add them under <Link href="/crm/settings/locations" className="font-semibold text-primary hover:underline">Locations</Link>.</p>
        )}
      </div>
      <div className="space-y-1">
        <span id="manual-status-label" className={cn(FIELD_LABEL, "block")}>Status</span>
        <div className="flex h-9 items-center gap-2">
          <Switch
            id="manual-status"
            aria-labelledby="manual-status-label"
            checked={item.sourceStatus === "on"}
            onCheckedChange={(checked) => set("sourceStatus", checked ? "on" : "off")}
          />
          <span className="text-xs font-medium">{item.sourceStatus === "on" ? "On" : "Off"}</span>
        </div>
        <p className="text-[10px] text-muted-foreground">Same as Podium&apos;s &quot;Allow Podium AI to respond&quot;. Kept as a note only.</p>
      </div>
      {isKnowledge && (
        <div className="space-y-1">
          <label htmlFor="manual-topic" className={FIELD_LABEL}>Topic</label>
          <select id="manual-topic" className={SELECT_CLASS} value={item.topic} onChange={(event) => set("topic", event.target.value)}>
            {KNOWLEDGE_TOPIC_OPTIONS.map((topic) => <option key={topic.value} value={topic.value === "general" ? "" : topic.value}>{topic.label}</option>)}
          </select>
        </div>
      )}
      {isRule && (
        <div className="space-y-1">
          <label htmlFor="manual-handling" className={FIELD_LABEL}>How Alex handles it</label>
          <select id="manual-handling" className={SELECT_CLASS} value={item.handling} onChange={(event) => set("handling", event.target.value)}>
            {IMPORT_HANDLING_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </div>
      )}
      <fieldset className="space-y-1 sm:col-span-2">
        <legend className={FIELD_LABEL}>Channels</legend>
        <div className="flex flex-wrap gap-3">
          {TRAINING_RULE_CHANNELS.map((channel) => (
            <label key={channel.value} className="flex items-center gap-1.5 text-xs">
              <input
                type="checkbox"
                checked={item.channels.includes(channel.value)}
                onChange={(event) => set("channels", event.target.checked ? [...item.channels, channel.value] : item.channels.filter((value) => value !== channel.value))}
              />
              {channel.label}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="space-y-1 sm:col-span-2">
        <label htmlFor="manual-question" className={FIELD_LABEL}>{questionLabel}</label>
        <Textarea id="manual-question" rows={2} maxLength={300} value={item.triggerOrQuestion} onChange={(event) => set("triggerOrQuestion", event.target.value)} className="resize-y" />
        {isRule && <p className="text-[10px] text-muted-foreground">Separate several triggers with |</p>}
      </div>
      <div className="space-y-1 sm:col-span-2">
        <label htmlFor="manual-answer" className={FIELD_LABEL}>{answerLabel}</label>
        <Textarea id="manual-answer" rows={4} maxLength={1000} value={item.answerOrInstruction} onChange={(event) => set("answerOrInstruction", event.target.value)} className="resize-y" />
      </div>
      {isRule && (
        <>
          <div className="space-y-1">
            <label htmlFor="manual-escalation" className={FIELD_LABEL}>Hand off to a person when</label>
            <Input id="manual-escalation" value={item.escalationWhen} maxLength={300} onChange={(event) => set("escalationWhen", event.target.value)} />
          </div>
          <div className="space-y-1">
            <label htmlFor="manual-handoff" className={FIELD_LABEL}>Handoff reason for staff</label>
            <Input id="manual-handoff" value={item.handoffReason} maxLength={200} onChange={(event) => set("handoffReason", event.target.value)} />
          </div>
          <div className="space-y-1">
            <label htmlFor="manual-example-customer" className={FIELD_LABEL}>Example customer message (made up)</label>
            <Textarea id="manual-example-customer" rows={2} maxLength={500} value={item.exampleCustomer} onChange={(event) => set("exampleCustomer", event.target.value)} className="resize-y" />
          </div>
          <div className="space-y-1">
            <label htmlFor="manual-example-reply" className={FIELD_LABEL}>Ideal reply</label>
            <Textarea id="manual-example-reply" rows={2} maxLength={600} value={item.exampleReply} onChange={(event) => set("exampleReply", event.target.value)} className="resize-y" />
          </div>
        </>
      )}
      <div className="space-y-1">
        <label htmlFor="manual-ref" className={FIELD_LABEL}>Podium reference</label>
        <Input id="manual-ref" value={item.sourceRef} maxLength={120} placeholder="Page, section or ID" onChange={(event) => set("sourceRef", event.target.value)} />
      </div>
      <div className="space-y-1">
        <label htmlFor="manual-notes" className={FIELD_LABEL}>Notes for reviewers</label>
        <Input id="manual-notes" value={item.notes} maxLength={300} onChange={(event) => set("notes", event.target.value)} />
      </div>
    </div>
  )
}

export function PodiumImportSheet({ open, getToken, onClose, onSaved, onOpenBatch }: {
  open: boolean
  getToken: () => Promise<string | null>
  onClose: () => void
  onSaved: (detail: ImportBatchDetail) => void
  onOpenBatch: (batchId: string) => void
}) {
  const locations = useCrmLocations(getToken, "active", open)
  const [step, setStep] = React.useState<Step>("source")
  const [tab, setTab] = React.useState<SourceTab>("file")
  const [file, setFile] = React.useState<LoadedFile | null>(null)
  const [fileError, setFileError] = React.useState<string | null>(null)
  const [pasteText, setPasteText] = React.useState("")
  const [manual, setManual] = React.useState<ManualImportItem>(emptyManualItem)
  const [mode, setMode] = React.useState<"initial" | "incremental">("incremental")
  const [fullSnapshot, setFullSnapshot] = React.useState(false)
  const [contacts, setContacts] = React.useState<BusinessContact[]>([])
  const [mappings, setMappings] = React.useState<Record<string, string>>({})
  const [acks, setAcks] = React.useState<Array<{ rowNumber: number; fingerprint: string }>>([])
  const [preview, setPreview] = React.useState<ImportPreview | null>(null)
  const [previewing, setPreviewing] = React.useState(false)
  const [previewErrors, setPreviewErrors] = React.useState<ImportIssue[]>([])
  const [previewError, setPreviewError] = React.useState<string | null>(null)
  const [groupFilter, setGroupFilter] = React.useState<ImportGroup | "">("")
  const [attested, setAttested] = React.useState(false)
  const [saving, setSaving] = React.useState(false)
  const [result, setResult] = React.useState<ImportBatchDetail | null>(null)
  const [refreshPending, setRefreshPending] = React.useState(false)
  const fileInput = React.useRef<HTMLInputElement>(null)

  const reset = React.useCallback(() => {
    setStep("source")
    setFile(null)
    setFileError(null)
    setPasteText("")
    setManual(emptyManualItem())
    setMode("incremental")
    setFullSnapshot(false)
    setContacts([])
    setMappings({})
    setAcks([])
    setPreview(null)
    setPreviewErrors([])
    setPreviewError(null)
    setGroupFilter("")
    setAttested(false)
    setResult(null)
    if (fileInput.current) fileInput.current.value = ""
  }, [])

  const close = () => {
    reset()
    onClose()
  }

  const activeLocations = React.useMemo(() => (locations.data?.locations || []).filter((location) => location.status === "active"), [locations.data])
  const manualLocationLabel = manual.locationChoice === "all"
    ? ALL_LOCATIONS_LABEL
    : activeLocations.find((location) => location.id === manual.locationChoice)?.name || ""
  const manualMapping = React.useMemo<Record<string, string>>(
    () => (tab === "manual" && manual.locationChoice && manualLocationLabel ? { [manualLocationLabel]: manual.locationChoice } : {}),
    [tab, manual.locationChoice, manualLocationLabel],
  )

  const source = React.useMemo(() => {
    if (tab === "file") return file ? { format: file.format, fileName: file.name, content: file.content } : null
    if (tab === "paste") return pasteText.trim() ? { format: "paste", content: pasteText } : null
    return { format: "manual", items: [manualItemToRow(manual, manualLocationLabel)] }
  }, [tab, file, pasteText, manual, manualLocationLabel])

  React.useEffect(() => {
    setMappings({})
    setAcks([])
  }, [source])

  const options = React.useMemo(() => ({
    mode,
    fullSnapshot,
    businessContacts: contacts.filter((contact) => contact.value.trim()).map((contact) => ({ kind: contact.kind, value: contact.value.trim() })),
    locationMappings: Object.entries({ ...manualMapping, ...mappings }).filter(([, value]) => value).map(([label, value]) => ({ sourceLabel: label, locationId: value === "all" ? null : value })),
    nameAcknowledgements: acks,
  }), [mode, fullSnapshot, contacts, mappings, acks, manualMapping])

  const runPreview = React.useCallback(async () => {
    if (!source) return
    setPreviewing(true)
    setPreviewError(null)
    setPreviewErrors([])
    try {
      const data = await trainingRequest<ImportPreview>(getToken, "post", "/api/crm/ai-training/imports/preview", { source, options })
      setPreview(data)
      setStep("review")
      setAttested(false)
    } catch (err) {
      const errors = (err as { response?: { data?: { errors?: ImportIssue[] } } })?.response?.data?.errors
      setPreviewError(trainingErrorMessage(err, "The import could not be checked."))
      setPreviewErrors(Array.isArray(errors) ? errors : [])
    } finally {
      setPreviewing(false)
    }
  }, [getToken, source, options])

  const runPreviewRef = React.useRef(runPreview)
  React.useEffect(() => {
    runPreviewRef.current = runPreview
  }, [runPreview])

  React.useEffect(() => {
    if (!refreshPending) return
    setRefreshPending(false)
    void runPreviewRef.current()
  }, [refreshPending])

  const refresh = () => setRefreshPending(true)

  const readFile = (picked?: File) => {
    setFileError(null)
    setFile(null)
    if (!picked) return
    if (picked.size > IMPORT_MAX_BYTES) {
      setFileError(`Files can be at most ${Math.round(IMPORT_MAX_BYTES / 1024)} KB. Split it into smaller files.`)
      return
    }
    const format = /\.json$/i.test(picked.name) ? "json" : /\.csv$/i.test(picked.name) ? "csv" : null
    if (!format) {
      setFileError("Choose a .csv or .json file.")
      return
    }
    const reader = new FileReader()
    reader.onload = () => setFile({ name: picked.name, format, content: String(reader.result || ""), size: picked.size })
    reader.onerror = () => setFileError("The file could not be read.")
    reader.readAsText(picked, "utf-8")
  }

  const downloadTemplate = async (format: "csv" | "json") => {
    try {
      const token = await getToken()
      const res = await apiClient.get(`/api/crm/ai-training/imports/template?format=${format}`, { headers: { Authorization: `Bearer ${token}` } })
      const template = (res.data?.data || res.data) as ImportTemplate
      downloadText(template.fileName, template.content, format === "csv" ? "text/csv" : "application/json")
    } catch (err) {
      toast.error("Template download failed", { description: trainingErrorMessage(err, "Please try again.") })
    }
  }

  const save = async () => {
    if (!preview || !source) return
    setSaving(true)
    try {
      const detail = await trainingRequest<ImportBatchDetail>(getToken, "post", "/api/crm/ai-training/imports", { source, options, previewHash: preview.previewHash, attestation: true })
      setResult(detail)
      setStep("done")
      toast.success(`Import #${detail.batch.batchNumber} saved as drafts`)
      onSaved(detail)
    } catch (err) {
      const code = (err as { response?: { data?: { errors?: ImportIssue[] } } })?.response?.data?.errors?.[0]?.code
      if (code === "preview_stale" || code === "import_race") {
        toast.error("Something changed since the preview", { description: "The preview was refreshed. Check it again before saving." })
        refresh()
      } else {
        toast.error("The import was not saved", { description: trainingErrorMessage(err, "Please try again.") })
      }
    } finally {
      setSaving(false)
    }
  }

  const labels = React.useMemo(() => {
    const found = new Map<string, { label: string; rows: number; scope: string; via: string; locationId?: string }>()
    for (const row of preview?.rows || []) {
      if (row.location.label === undefined) continue
      const entry = found.get(row.location.label) || { label: row.location.label, rows: 0, scope: row.location.scope, via: row.location.via, locationId: row.location.locationId }
      entry.rows += 1
      found.set(row.location.label, entry)
    }
    return Array.from(found.values()).sort((a, b) => Number(b.scope === "none") - Number(a.scope === "none") || a.label.localeCompare(b.label))
  }, [preview])

  const groupCounts = React.useMemo(() => IMPORT_GROUPS.map((group) => ({
    ...group,
    count: group.statuses.reduce((sum, status) => sum + (preview?.counts?.[status] || 0), 0),
  })), [preview])

  const visibleRows = (preview?.rows || []).filter((row) => !groupFilter || groupOf(row.status) === groupFilter)

  return (
    <Sheet open={open} onOpenChange={(next) => !next && close()}>
      <SheetContent side="right" className="w-full overflow-y-auto p-0 sm:max-w-3xl">
        <SheetHeader className="border-b border-border/40 px-4 py-4 sm:px-6">
          <SheetTitle className="pr-10 text-base">Import from Podium</SheetTitle>
          <SheetDescription className="text-xs">Copy questions, answers and rules from Podium. Everything is checked first and saved as inactive drafts for review.</SheetDescription>
          <ol className="mt-2 flex flex-wrap gap-1.5 text-[10px]" aria-label="Import steps">
            {[["source", "1. Source"], ["review", "2. Check and map"], ["done", "3. Saved"]].map(([value, label]) => (
              <li key={value} aria-current={step === value ? "step" : undefined}
                className={cn("rounded-full border px-2 py-0.5", step === value ? "border-primary bg-primary/10 font-semibold text-primary" : "border-border/60 text-muted-foreground")}
              >
                {label}
              </li>
            ))}
          </ol>
        </SheetHeader>

        <div className="space-y-5 px-4 py-5 sm:px-6">
          {step === "source" && (
            <>
              <div role="tablist" aria-label="Import source" className="grid grid-cols-3 gap-1 rounded-xl border border-border/50 p-1">
                {([["file", "Upload file"], ["paste", "Paste text"], ["manual", "One item"]] as Array<[SourceTab, string]>).map(([value, label]) => (
                  <button key={value} type="button" role="tab" aria-selected={tab === value} onClick={() => setTab(value)}
                    className={cn("rounded-lg px-2 py-1.5 text-xs font-medium", tab === value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted/50")}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {tab === "file" && (
                <section className="space-y-3" aria-label="Upload file">
                  <div className="rounded-xl border border-dashed border-border/60 p-4 text-center">
                    <FileUp className="mx-auto h-5 w-5 text-muted-foreground" aria-hidden="true" />
                    <p className="mt-1 text-xs text-muted-foreground">CSV or JSON, up to {Math.round(IMPORT_MAX_BYTES / 1024)} KB and 200 rows.</p>
                    <input ref={fileInput} type="file" accept=".csv,.json,text/csv,application/json" aria-label="Import file" className="mx-auto mt-2 block max-w-full text-xs" onChange={(event) => readFile(event.target.files?.[0])} />
                    {file && <p className="mt-2 break-words text-xs font-medium">{file.name} · {Math.max(1, Math.round(file.size / 1024))} KB · {file.format.toUpperCase()}</p>}
                    {fileError && <p role="alert" className="mt-2 text-xs text-red-600 dark:text-red-400">{fileError}</p>}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span>Start from a template:</span>
                    <Button size="sm" variant="outline" className="h-7" onClick={() => void downloadTemplate("csv")}><Download className="mr-1 h-3 w-3" /> CSV template</Button>
                    <Button size="sm" variant="outline" className="h-7" onClick={() => void downloadTemplate("json")}><Download className="mr-1 h-3 w-3" /> JSON template</Button>
                  </div>
                </section>
              )}

              {tab === "paste" && (
                <section className="space-y-2" aria-label="Paste text">
                  <label htmlFor="import-paste" className={FIELD_LABEL}>Text copied from Podium</label>
                  <Textarea id="import-paste" rows={10} value={pasteText} onChange={(event) => setPasteText(event.target.value)} placeholder={PASTE_PLACEHOLDER} className="resize-y font-mono text-xs" />
                  <ul className="ml-4 list-disc space-y-0.5 text-[11px] text-muted-foreground">
                    {PASTE_FORMAT_HELP.map((line) => <li key={line}>{line}</li>)}
                  </ul>
                </section>
              )}

              {tab === "manual" && (
                <section aria-label="One item">
                  <ManualItemForm item={manual} onChange={setManual} locations={activeLocations} locationsLoading={locations.loading} />
                </section>
              )}

              <details className="rounded-xl border border-border/40 p-3 text-xs">
                <summary className="cursor-pointer font-semibold">Import options</summary>
                <div className="mt-3 space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <label htmlFor="import-mode" className={FIELD_LABEL}>Kind of import</label>
                      <select id="import-mode" className={SELECT_CLASS} value={mode} onChange={(event) => setMode(event.target.value as "initial" | "incremental")}>
                        <option value="incremental">Update (add new and changed items)</option>
                        <option value="initial">First import</option>
                      </select>
                    </div>
                    <label className="flex items-start gap-2 pt-5 text-xs">
                      <input type="checkbox" checked={fullSnapshot} onChange={(event) => setFullSnapshot(event.target.checked)} className="mt-0.5" />
                      <span>This is everything from Podium for these locations. List anything imported earlier that is missing now. Nothing is deleted.</span>
                    </label>
                  </div>
                  <div className="space-y-2">
                    <p className={FIELD_LABEL}>Dealership contact details</p>
                    <p className="text-[11px] text-muted-foreground">List the dealership&apos;s own phone numbers, emails or website so they aren&apos;t treated as personal details. Personal email providers are not accepted.</p>
                    {contacts.map((contact, index) => (
                      <div key={index} className="flex flex-col gap-2 sm:flex-row">
                        <select aria-label={`Contact ${index + 1} kind`} className={cn(SELECT_CLASS, "sm:w-36")} value={contact.kind}
                          onChange={(event) => setContacts(contacts.map((item, i) => (i === index ? { ...item, kind: event.target.value as BusinessContact["kind"] } : item)))}
                        >
                          <option value="phone">Phone</option>
                          <option value="email">Email</option>
                          <option value="domain">Website</option>
                        </select>
                        <Input aria-label={`Contact ${index + 1} value`} value={contact.value} maxLength={120}
                          onChange={(event) => setContacts(contacts.map((item, i) => (i === index ? { ...item, value: event.target.value } : item)))}
                        />
                        <Button size="sm" variant="ghost" className="h-9" aria-label={`Remove contact ${index + 1}`} onClick={() => setContacts(contacts.filter((_, i) => i !== index))}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                    {contacts.length < 10 && (
                      <Button size="sm" variant="outline" className="h-7" onClick={() => setContacts([...contacts, { kind: "phone", value: "" }])}>
                        <Plus className="mr-1 h-3 w-3" /> Add dealership contact
                      </Button>
                    )}
                  </div>
                </div>
              </details>

              {previewError && (
                <div role="alert" className="rounded-xl border border-red-500/30 bg-red-500/5 p-3 text-xs text-red-700 dark:text-red-300">
                  <p className="font-semibold">{previewError}</p>
                  {previewErrors.length > 1 && <ul className="ml-4 mt-1 list-disc">{previewErrors.slice(1).map((issue, index) => <li key={index}>{issue.message}</li>)}</ul>}
                </div>
              )}

              <div className="sticky bottom-0 -mx-4 flex flex-wrap justify-end gap-2 border-t border-border/40 bg-background px-4 py-3 sm:-mx-6 sm:px-6">
                <Button variant="ghost" onClick={close}>Cancel</Button>
                <Button onClick={() => void runPreview()} disabled={!source || previewing}>
                  {previewing && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />} Check import
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">Checking saves nothing.</p>
            </>
          )}

          {step === "review" && preview && (
            <>
              {preview.batchIssues.length > 0 && (
                <ul aria-label="File notes" className="space-y-1">
                  {preview.batchIssues.map((issue, index) => (
                    <li key={index} className={cn("flex items-start gap-1.5 text-[11px]", issueTone(issue.severity))}><IssueIcon severity={issue.severity} />{issue.message}</li>
                  ))}
                </ul>
              )}

              {labels.length > 0 && (
                <section aria-labelledby="import-locations" className="space-y-2 rounded-xl border border-border/50 p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 id="import-locations" className="text-xs font-bold">Locations</h3>
                    <Link href="/crm/settings/locations" className="ml-auto text-[11px] font-semibold text-primary hover:underline">Manage locations</Link>
                  </div>
                  <p className="text-[11px] text-muted-foreground">Map each Podium location to an approved dealership location, or confirm it applies to all locations. Rows with no Podium location always need a choice.</p>
                  {locations.error && <p role="alert" className="text-[11px] text-red-600 dark:text-red-400">{locations.error}</p>}
                  <ul className="space-y-2">
                    {labels.map((entry) => {
                      const value = mappings[entry.label] ?? (entry.scope === "all" ? "all" : entry.scope === "location" ? entry.locationId || "" : "")
                      const id = `import-map-${labels.indexOf(entry)}`
                      return (
                        <li key={entry.label} className="flex flex-col gap-1.5 sm:flex-row sm:items-center">
                          <label htmlFor={id} className="min-w-0 flex-1 text-xs">
                            <span className="font-semibold">{locationLabelText(entry.label)}</span>
                            <span className="text-muted-foreground"> · {entry.rows} row{entry.rows === 1 ? "" : "s"}</span>
                            {entry.via === "alias" && !mappings[entry.label] && <span className="block text-[10px] text-muted-foreground">Matched by a location&apos;s other names</span>}
                            {entry.scope === "none" && <span className="block text-[10px] font-semibold text-amber-700 dark:text-amber-300">Choose a location</span>}
                          </label>
                          <select id={id} aria-label={`Location for ${locationLabelText(entry.label)}`} className={cn(SELECT_CLASS, "sm:w-60")} value={value} disabled={previewing}
                            onChange={(event) => {
                              const next = { ...mappings }
                              if (event.target.value) next[entry.label] = event.target.value
                              else delete next[entry.label]
                              setMappings(next)
                              refresh()
                            }}
                          >
                            <option value="">Choose…</option>
                            <option value="all">All locations (organization-wide)</option>
                            {activeLocations.map((location) => <option key={location.id} value={location.id}>{location.name} ({location.code})</option>)}
                          </select>
                        </li>
                      )
                    })}
                  </ul>
                  {!locations.loading && !activeLocations.length && <p className="text-[11px] text-muted-foreground">No locations exist yet. An admin can add them under Locations, or you can choose All locations.</p>}
                </section>
              )}

              <section aria-labelledby="import-summary" className="space-y-2">
                <div className="flex items-center gap-2">
                  <h3 id="import-summary" className="text-xs font-bold">{preview.rowCount} row{preview.rowCount === 1 ? "" : "s"} checked</h3>
                  {previewing && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" aria-label="Updating" />}
                  <Button size="sm" variant="ghost" className="ml-auto h-7" onClick={refresh} disabled={previewing}><RefreshCw className="mr-1 h-3 w-3" /> Check again</Button>
                </div>
                <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter rows">
                  <button type="button" onClick={() => setGroupFilter("")} aria-pressed={groupFilter === ""}
                    className={cn("rounded-full border px-2.5 py-1 text-[11px]", groupFilter === "" ? "border-primary bg-primary/10 font-semibold text-primary" : "border-border/60")}
                  >
                    All rows · {preview.rowCount}
                  </button>
                  {groupCounts.filter((group) => group.count > 0).map((group) => (
                    <button key={group.value} type="button" onClick={() => setGroupFilter(group.value)} aria-pressed={groupFilter === group.value} title={group.description}
                      className={cn("rounded-full border px-2.5 py-1 text-[11px]", IMPORT_GROUP_STYLES[group.value], groupFilter === group.value && "ring-2 ring-primary/40")}
                    >
                      {group.label} · {group.count}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {groupFilter === "knowledge"
                    ? knowledgeGroupDescription(Boolean(preview.knowledgeBase?.enabled))
                    : groupFilter
                      ? IMPORT_GROUPS.find((group) => group.value === groupFilter)?.description
                      : preview.knowledgeBase?.enabled
                        ? "Rules become draft proposals in Training Rules. FAQ and business information become Knowledge Base drafts. A manager reviews everything; nothing becomes active."
                        : "Rules become draft proposals in Training Rules. FAQ and business information are kept until the Knowledge Base is turned on. Nothing becomes active."}
                </p>
                <ul aria-label="Import rows" className="space-y-2">
                  {visibleRows.map((row) => (
                    <PreviewRowCard key={row.rowNumber} row={row} knowledgeEnabled={Boolean(preview.knowledgeBase?.enabled)} onReviewNames={(target) => {
                      setAcks([...acks.filter((ack) => ack.rowNumber !== target.rowNumber), { rowNumber: target.rowNumber, fingerprint: target.fingerprint }])
                      refresh()
                    }} />
                  ))}
                </ul>
              </section>

              {preview.missingFromSnapshot.length > 0 && (
                <section aria-labelledby="import-missing" className="space-y-1 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-xs">
                  <h3 id="import-missing" className="font-bold">Imported earlier but missing from this file</h3>
                  <p className="text-[11px] text-muted-foreground">Nothing is deleted. Review these in Training Rules if they no longer apply.</p>
                  <ul className="ml-4 list-disc text-[11px]">
                    {preview.missingFromSnapshot.slice(0, 20).map((entry) => <li key={entry.itemId}>{entry.title || "Untitled"}{entry.batchNumber ? ` (import #${entry.batchNumber})` : ""}</li>)}
                  </ul>
                  {preview.missingFromSnapshot.length > 20 && <p className="text-[11px]">and {preview.missingFromSnapshot.length - 20} more</p>}
                </section>
              )}

              <section aria-labelledby="import-save" className="space-y-3 rounded-xl border border-border/50 p-3">
                <h3 id="import-save" className="text-xs font-bold">Save</h3>
                {preview.blocking.map((message) => (
                  <p key={message} role="alert" className="flex items-start gap-1.5 text-[11px] text-amber-700 dark:text-amber-300"><AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />{message}</p>
                ))}
                <label className="flex items-start gap-2 text-xs">
                  <input type="checkbox" checked={attested} onChange={(event) => setAttested(event.target.checked)} className="mt-0.5" />
                  <span>{preview.attestationText}</span>
                </label>
                <p className="text-[11px] text-muted-foreground">
                  Originals are kept {preview.retentionDays.converted} days for drafts, {preview.retentionDays.parked} days for Knowledge Base items and references, and {preview.retentionDays.rejected} days for held rows. Rows with personal details are never stored.
                </p>
                <div className="flex flex-wrap justify-end gap-2">
                  <Button variant="ghost" onClick={() => setStep("source")} disabled={saving}>Back</Button>
                  <Button onClick={() => void save()} disabled={!preview.canCommit || !attested || saving || previewing}>
                    {saving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />} Save as drafts
                  </Button>
                </div>
              </section>
            </>
          )}

          {step === "done" && result && (
            <section aria-labelledby="import-done" className="space-y-3">
              <div className="flex items-start gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3 text-xs text-emerald-800 dark:text-emerald-200">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <h3 id="import-done" className="font-bold">Import #{result.batch.batchNumber} saved</h3>
                  <p className="mt-1">Nothing is active. Rule drafts wait in Training Rules and Knowledge Base drafts wait in the Knowledge Base for a manager to review.</p>
                </div>
              </div>
              <ul className="grid gap-2 text-xs sm:grid-cols-2">
                <li className="rounded-lg border border-border/40 p-2">Draft proposals created: <span className="font-semibold">{result.batch.proposalsCreated}</span></li>
                <li className="rounded-lg border border-border/40 p-2">Drafts updated with a new version: <span className="font-semibold">{result.batch.proposalsUpdated}</span></li>
                {result.knowledgeSave?.enabled === false || !result.knowledgeSave ? (
                  <li className="rounded-lg border border-border/40 p-2">Knowledge Base items kept for later: <span className="font-semibold">{result.batch.statusCounts.parked_knowledge || 0}</span></li>
                ) : (
                  <li className="rounded-lg border border-border/40 p-2">Knowledge Base drafts created: <span className="font-semibold">{result.knowledgeSave.created || 0}</span>{result.knowledgeSave.updated ? <> · updated: <span className="font-semibold">{result.knowledgeSave.updated}</span></> : null}</li>
                )}
                <li className="rounded-lg border border-border/40 p-2">Inactive references: <span className="font-semibold">{(result.batch.statusCounts.reference_only || 0) + (result.batch.statusCounts.unsupported || 0)}</span></li>
                <li className="rounded-lg border border-border/40 p-2">Skipped: <span className="font-semibold">{(result.batch.statusCounts.unchanged || 0) + (result.batch.statusCounts.duplicate_in_file || 0)}</span></li>
                <li className="rounded-lg border border-border/40 p-2">Held back: <span className="font-semibold">{["blocked_privacy", "blocked_guardrail", "blocked_safety_bypass", "invalid"].reduce((sum, status) => sum + (result.batch.statusCounts[status as keyof typeof result.batch.statusCounts] || 0), 0)}</span></li>
              </ul>
              {(() => {
                const save = result.knowledgeSave
                const waiting = (save?.counts?.needs_contact_verification || 0) + (save?.counts?.needs_attention || 0)
                if (save?.error) return <p role="alert" className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-2 text-[11px] text-amber-800 dark:text-amber-200">{save.error}</p>
                if (save?.enabled === false && (result.batch.statusCounts.parked_knowledge || 0) > 0) return <p className="rounded-lg border border-border/40 p-2 text-[11px] text-muted-foreground">{save.message}</p>
                if (waiting > 0) {
                  return (
                    <p role="status" className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-2 text-[11px] text-amber-800 dark:text-amber-200">
                      {waiting} Knowledge Base item{waiting === 1 ? " needs" : "s need"} attention before {waiting === 1 ? "it" : "they"} can become {waiting === 1 ? "a draft" : "drafts"}. Open the import details to see what to do.
                    </p>
                  )
                }
                return null
              })()}
              <div className="flex flex-wrap justify-end gap-2">
                {(result.knowledgeSave?.created || 0) + (result.knowledgeSave?.updated || 0) > 0 && (
                  <Button variant="outline" asChild>
                    <Link href="/crm/settings/ai-agent?tab=knowledge" onClick={close}>Open Knowledge Base</Link>
                  </Button>
                )}
                <Button variant="outline" onClick={reset}>Import more</Button>
                <Button variant="outline" onClick={() => { const id = result.batch.id; close(); onOpenBatch(id) }}>Open import details</Button>
                <Button onClick={close}>Done</Button>
              </div>
            </section>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
