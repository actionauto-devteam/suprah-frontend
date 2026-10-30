"use client"

import * as React from "react"
import Link from "next/link"
import { BookOpen, ChevronLeft, ChevronRight, History, Loader2, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { trainingErrorMessage, trainingRequest, useImportBatch, useImportItem } from "@/hooks/useAiTraining"
import {
  CONTENT_STATUS_LABELS,
  IMPORT_GROUPS,
  IMPORT_STATUSES,
  IMPORT_STATUS_LABELS,
  IMPORT_TYPE_LABELS,
  KNOWLEDGE_IMPORT_LABELS,
  KNOWLEDGE_IMPORT_TONES,
  SOURCE_STATUS_NOTE,
  locationLabelText,
  targetLabel,
  type ImportBatch,
  type ImportBatchPage,
  type ImportItem,
  type ImportOriginalFields,
  type KnowledgeImportState,
  type KnowledgeSaveResult,
} from "@/lib/aiTrainingImport"
import { HubCard, HubState, formatHubDate } from "./ShadowStatusBadge"
import { ImportGroupBadge } from "./PodiumImportSheet"

const FORMAT_LABELS: Record<string, string> = { csv: "CSV file", json: "JSON file", paste: "Pasted text", manual: "Single item" }

const KNOWLEDGE_SUMMARY_ORDER: KnowledgeImportState[] = ["saved", "ready", "needs_contact_verification", "needs_attention", "newer_saved", "knowledge_base_off"]

function KnowledgeSection({ getToken, batchId, knowledge, onSaved }: {
  getToken: () => Promise<string | null>
  batchId: string
  knowledge: { enabled: boolean; counts: Partial<Record<KnowledgeImportState, number>> }
  onSaved: () => void
}) {
  const [saving, setSaving] = React.useState(false)
  const ready = knowledge.counts.ready || 0
  const contacts = knowledge.counts.needs_contact_verification || 0
  const save = async () => {
    setSaving(true)
    try {
      const result = await trainingRequest<KnowledgeSaveResult>(getToken, "post", `/api/crm/ai-training/imports/${batchId}/knowledge`, {})
      const done = (result.created || 0) + (result.updated || 0)
      if (done) toast.success(`Saved ${done} item${done === 1 ? "" : "s"} to the Knowledge Base as draft${done === 1 ? "" : "s"}`)
      else toast.info("Nothing new was saved", { description: "Check the rows below to see what each item needs." })
      onSaved()
    } catch (err) {
      toast.error("Could not save to the Knowledge Base", { description: trainingErrorMessage(err, "Please try again.") })
    } finally {
      setSaving(false)
    }
  }
  return (
    <section aria-labelledby="import-knowledge" className="space-y-2 rounded-xl border border-border/50 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <BookOpen className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
        <h3 id="import-knowledge" className="text-xs font-bold">Knowledge Base</h3>
        <Link href="/crm/settings/ai-agent?tab=knowledge" className="ml-auto text-[11px] font-semibold text-primary hover:underline">Open Knowledge Base</Link>
      </div>
      <ul className="flex flex-wrap gap-1.5">
        {KNOWLEDGE_SUMMARY_ORDER.filter((state) => knowledge.counts[state]).map((state) => (
          <li key={state} className={`rounded-full border border-border/60 px-2 py-0.5 text-[10px] font-medium ${KNOWLEDGE_IMPORT_TONES[state]}`}>
            {KNOWLEDGE_IMPORT_LABELS[state]} · {knowledge.counts[state]}
          </li>
        ))}
      </ul>
      {contacts > 0 && (
        <p className="text-[11px] text-muted-foreground">
          Add the missing phone numbers, emails or websites in Knowledge Base → Verified contacts &amp; programs, then come back and save.
        </p>
      )}
      {ready > 0 && (
        <Button size="sm" className="h-8" disabled={saving} onClick={() => void save()}>
          {saving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
          Save {ready} ready item{ready === 1 ? "" : "s"} to the Knowledge Base
        </Button>
      )}
    </section>
  )
}

function countsSummary(batch: ImportBatch): Array<{ label: string; count: number }> {
  return IMPORT_GROUPS.map((group) => ({
    label: group.label,
    count: group.statuses.reduce((sum, status) => sum + (batch.statusCounts[status] || 0), 0),
  })).filter((entry) => entry.count > 0)
}

export function ImportHistoryPanel({ history, page, onPage, onOpen }: {
  history: { data: ImportBatchPage | null; loading: boolean; error: string | null; errorStatus: number | null; reload: () => void }
  page: number
  onPage: (page: number) => void
  onOpen: (batchId: string) => void
}) {
  const turnedOff = history.errorStatus === 409
  return (
    <HubCard
      title="Imports"
      description="Every import is recorded here with what happened to each row. Nothing imported is active."
      icon={<History className="h-4 w-4 text-primary" />}
    >
      {turnedOff ? (
        <p role="status" className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-700 dark:text-amber-300">{history.error}</p>
      ) : (
        <HubState
          loading={history.loading}
          error={history.error}
          onRetry={history.reload}
          empty={history.data && !history.data.batches.length ? "No imports yet. Use Import to bring in questions, answers and rules." : false}
        >
          {history.data && (
            <>
              <ul aria-label="Import history" className="space-y-2">
                {history.data.batches.map((batch) => (
                  <li key={batch.id}>
                    <button type="button" onClick={() => onOpen(batch.id)}
                      className="w-full rounded-xl border border-border/40 p-3 text-left transition-colors hover:bg-muted/40 focus-visible:outline-2 focus-visible:outline-primary"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-semibold">Import #{batch.batchNumber}</span>
                        <span className="text-[10px] text-muted-foreground">{FORMAT_LABELS[batch.format] || batch.format}{batch.fileName ? ` · ${batch.fileName}` : ""}</span>
                        <span className="ml-auto text-[10px] text-muted-foreground">{formatHubDate(batch.createdAt)}</span>
                      </div>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {batch.rowCount} row{batch.rowCount === 1 ? "" : "s"} · by {batch.createdByName || "Team member"} · {batch.proposalsCreated} draft{batch.proposalsCreated === 1 ? "" : "s"} created, {batch.proposalsUpdated} updated
                      </p>
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {countsSummary(batch).map((entry) => (
                          <span key={entry.label} className="rounded-full border border-border/60 px-2 py-0.5 text-[10px] text-muted-foreground">{entry.label} · {entry.count}</span>
                        ))}
                        {batch.purgedAt && <span className="rounded-full border border-slate-300 px-2 py-0.5 text-[10px] text-muted-foreground">Originals removed</span>}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
              <div className="mt-4 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                <span>{history.data.total} import{history.data.total === 1 ? "" : "s"} · page {history.data.page} of {history.data.totalPages}</span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="h-8" disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Previous imports page"><ChevronLeft className="h-3.5 w-3.5" /></Button>
                  <Button variant="outline" size="sm" className="h-8" disabled={page >= history.data.totalPages} onClick={() => onPage(page + 1)} aria-label="Next imports page"><ChevronRight className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
            </>
          )}
        </HubState>
      )}
    </HubCard>
  )
}

function OriginalFields({ fields }: { fields: ImportOriginalFields }) {
  const rows: Array<[string, unknown]> = [
    ["Question or trigger", fields.triggerOrQuestion],
    ["Answer or instruction", fields.answerOrInstruction],
    ["Podium location", fields.location],
    ["Podium status", fields.sourceStatus === "on" ? "On" : fields.sourceStatus === "off" ? "Off" : undefined],
    ["Podium reference", fields.sourceRef],
    ["Topic", fields.topic],
    ["Notes", fields.notes],
  ]
  return (
    <dl className="space-y-1 text-[11px]">
      {rows.filter(([, value]) => value).map(([label, value]) => (
        <div key={label}>
          <dt className="font-semibold">{label}</dt>
          <dd className="whitespace-pre-wrap break-words text-muted-foreground">{String(value)}</dd>
        </div>
      ))}
    </dl>
  )
}

function ItemDetail({ getToken, batchId, item, onOpenProposal }: {
  getToken: () => Promise<string | null>
  batchId: string
  item: ImportItem
  onOpenProposal: (id: string) => void
}) {
  const detail = useImportItem(getToken, batchId, item.id)
  return (
    <div className="mt-2 space-y-2 rounded-lg border border-border/40 bg-muted/20 p-2">
      <HubState loading={detail.loading} error={detail.error} onRetry={detail.reload}>
        {detail.data && (
          <>
            <p className="text-[11px] text-muted-foreground">{CONTENT_STATUS_LABELS[detail.data.item.contentStatus]}{detail.data.item.purgedAt ? ` on ${formatHubDate(detail.data.item.purgedAt)}` : ""}{detail.data.original ? ` · kept until ${formatHubDate(detail.data.original.expiresAt)}` : ""}</p>
            {detail.data.original ? <OriginalFields fields={detail.data.original.fields} /> : null}
            {detail.data.linkedProposal && (
              <Button size="sm" variant="outline" className="h-7" onClick={() => onOpenProposal(detail.data!.linkedProposal!.id)}>
                Open draft: {detail.data.linkedProposal.title}
              </Button>
            )}
          </>
        )}
      </HubState>
    </div>
  )
}

export function ImportBatchDrawer({ batchId, getToken, onClose, onOpenProposal, onChanged }: {
  batchId: string | null
  getToken: () => Promise<string | null>
  onClose: () => void
  onOpenProposal: (id: string) => void
  onChanged: () => void
}) {
  const [status, setStatus] = React.useState("")
  const [page, setPage] = React.useState(1)
  const [openItem, setOpenItem] = React.useState<string | null>(null)
  const [purgeOpen, setPurgeOpen] = React.useState(false)
  const [phrase, setPhrase] = React.useState("")
  const [purging, setPurging] = React.useState(false)
  const detail = useImportBatch(getToken, batchId, { status: status || undefined, page })
  const batch = detail.data?.batch

  React.useEffect(() => {
    setStatus("")
    setPage(1)
    setOpenItem(null)
  }, [batchId])

  const expected = batch ? `PURGE BATCH ${batch.batchNumber}` : ""

  const purge = async () => {
    if (!batch) return
    setPurging(true)
    try {
      const result = await trainingRequest<{ purged: number }>(getToken, "post", `/api/crm/ai-training/imports/${batch.id}/purge-content`, { confirmation: phrase })
      toast.success(result.purged ? `Removed ${result.purged} stored original${result.purged === 1 ? "" : "s"}` : "Nothing left to remove")
      setPurgeOpen(false)
      setPhrase("")
      detail.reload()
      onChanged()
    } catch (err) {
      toast.error("Could not remove the originals", { description: trainingErrorMessage(err, "Please try again.") })
    } finally {
      setPurging(false)
    }
  }

  return (
    <>
      <Sheet open={Boolean(batchId)} onOpenChange={(open) => !open && onClose()}>
        <SheetContent side="right" className="w-full overflow-y-auto p-0 sm:max-w-2xl">
          <SheetHeader className="border-b border-border/40 px-4 py-4 sm:px-6">
            <SheetTitle className="pr-10 text-base">{batch ? `Import #${batch.batchNumber}` : "Import"}</SheetTitle>
            <SheetDescription className="text-xs">What happened to each row. Nothing imported is active; drafts wait for a manager to review them.</SheetDescription>
          </SheetHeader>
          <div className="space-y-5 px-4 py-5 sm:px-6">
            <HubState loading={detail.loading && !detail.data} error={detail.error} onRetry={detail.reload}>
              {batch && detail.data && (
                <>
                  <dl className="grid gap-2 text-[11px] sm:grid-cols-2">
                    <div><dt className="font-semibold">Imported</dt><dd className="text-muted-foreground">{formatHubDate(batch.createdAt)} by {batch.createdByName || "Team member"}</dd></div>
                    <div><dt className="font-semibold">Source</dt><dd className="break-words text-muted-foreground">{FORMAT_LABELS[batch.format] || batch.format}{batch.fileName ? ` · ${batch.fileName}` : batch.fileNameWithheld ? " · file name withheld" : ""}</dd></div>
                    <div><dt className="font-semibold">Rows</dt><dd className="text-muted-foreground">{batch.rowCount} · {batch.mode === "initial" ? "first import" : "update"}{batch.fullSnapshot ? " · full snapshot" : ""}</dd></div>
                    <div><dt className="font-semibold">Drafts</dt><dd className="text-muted-foreground">{batch.proposalsCreated} created · {batch.proposalsUpdated} updated</dd></div>
                    <div><dt className="font-semibold">Confirmation</dt><dd className="text-muted-foreground">Personal details removed, confirmed by {batch.attestation?.byName || "the importer"}</dd></div>
                    <div><dt className="font-semibold">Stored originals</dt><dd className="text-muted-foreground">{batch.storedOriginals}{batch.purgedAt ? ` · removed ${formatHubDate(batch.purgedAt)}` : ""}</dd></div>
                  </dl>
                  {batch.locationMappings.length > 0 && (
                    <div className="text-[11px]">
                      <p className="font-semibold">Locations</p>
                      <ul className="ml-4 list-disc text-muted-foreground">
                        {batch.locationMappings.map((mapping) => (
                          <li key={mapping.sourceLabel}>{locationLabelText(mapping.sourceLabel)} → {mapping.scope === "all" ? "All locations" : mapping.locationCode}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {detail.data.knowledge && batchId && (
                    <KnowledgeSection getToken={getToken} batchId={batchId} knowledge={detail.data.knowledge} onSaved={() => { detail.reload(); onChanged() }} />
                  )}
                  {detail.data.missingFromSnapshot.length > 0 && (
                    <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-2 text-[11px]">
                      <p className="font-semibold">Missing from this full snapshot ({batch.missingFromSnapshotCount})</p>
                      <ul className="ml-4 list-disc text-muted-foreground">{detail.data.missingFromSnapshot.slice(0, 20).map((entry) => <li key={entry.itemId}>{entry.title || "Untitled"}</li>)}</ul>
                    </div>
                  )}

                  <section aria-labelledby="import-items" className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 id="import-items" className="text-xs font-bold">Rows</h3>
                      <label className="sr-only" htmlFor="import-item-status">Row status</label>
                      <select id="import-item-status" className="ml-auto h-8 rounded-lg border border-input bg-background px-2 text-xs" value={status}
                        onChange={(event) => { setStatus(event.target.value); setPage(1); setOpenItem(null) }}
                      >
                        <option value="">All rows</option>
                        {IMPORT_STATUSES.filter((value) => batch.statusCounts[value]).map((value) => (
                          <option key={value} value={value}>{IMPORT_STATUS_LABELS[value]} · {batch.statusCounts[value]}</option>
                        ))}
                      </select>
                    </div>
                    <ul aria-label="Imported rows" className="space-y-2">
                      {detail.data.items.map((item) => (
                        <li key={item.id} className="rounded-xl border border-border/40 p-3">
                          <button type="button" className="w-full text-left" aria-expanded={openItem === item.id} onClick={() => setOpenItem(openItem === item.id ? null : item.id)}>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-[10px] font-semibold text-muted-foreground">Row {item.rowNumber}</span>
                              <span className="text-[10px] text-muted-foreground">{IMPORT_TYPE_LABELS[item.type] || item.type}</span>
                              <ImportGroupBadge status={item.status} />
                              {item.sourceStatus && <span className="rounded-full border border-border/60 px-2 py-0.5 text-[10px] text-muted-foreground" title={SOURCE_STATUS_NOTE}>Podium: {item.sourceStatus === "on" ? "On" : "Off"}</span>}
                            </div>
                            <p className="mt-1 break-words text-xs font-semibold">{item.title || (item.status === "blocked_privacy" ? "Hidden because it may contain personal details" : "Untitled")}</p>
                            <p className="mt-0.5 text-[11px] text-muted-foreground">
                              {item.knowledge ? KNOWLEDGE_IMPORT_LABELS[item.knowledge.state] : targetLabel(item.target)} · {item.locationScope.kind === "all" ? "All locations" : item.locationScope.kind === "location" ? item.locationScope.locationCode : "No location"}
                              {item.sourceRef ? ` · ${item.sourceRef}` : ""}
                            </p>
                            {item.knowledge && item.knowledge.state !== "saved" && (
                              <p className={`mt-0.5 text-[11px] ${KNOWLEDGE_IMPORT_TONES[item.knowledge.state]}`}>{item.knowledge.message}</p>
                            )}
                          </button>
                          {openItem === item.id && batchId && <ItemDetail getToken={getToken} batchId={batchId} item={item} onOpenProposal={onOpenProposal} />}
                        </li>
                      ))}
                    </ul>
                    {detail.data.totalPages > 1 && (
                      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                        <span>Page {detail.data.page} of {detail.data.totalPages}</span>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" className="h-8" disabled={page <= 1} onClick={() => setPage(page - 1)} aria-label="Previous rows page"><ChevronLeft className="h-3.5 w-3.5" /></Button>
                          <Button variant="outline" size="sm" className="h-8" disabled={page >= detail.data.totalPages} onClick={() => setPage(page + 1)} aria-label="Next rows page"><ChevronRight className="h-3.5 w-3.5" /></Button>
                        </div>
                      </div>
                    )}
                  </section>

                  {batch.canPurge && (
                    <section aria-labelledby="import-purge" className="space-y-2 rounded-xl border border-red-500/30 bg-red-500/5 p-3">
                      <h3 id="import-purge" className="text-xs font-bold text-red-700 dark:text-red-300">Remove stored originals</h3>
                      <p className="text-[11px] text-muted-foreground">Deletes the original Podium text kept for this import before it expires on its own. Drafts, row records and history stay.</p>
                      <Button size="sm" variant="outline" className="h-8 border-red-300 text-red-700 dark:text-red-300" disabled={!batch.storedOriginals} onClick={() => setPurgeOpen(true)}>
                        <Trash2 className="mr-1 h-3.5 w-3.5" /> Remove originals
                      </Button>
                    </section>
                  )}
                </>
              )}
            </HubState>
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={purgeOpen} onOpenChange={(open) => { setPurgeOpen(open); if (!open) setPhrase("") }}>
        <DialogContent className="w-[calc(100vw-1rem)] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Remove stored originals?</DialogTitle>
            <DialogDescription>This can&apos;t be undone. Type <span className="font-mono font-semibold">{expected}</span> to confirm.</DialogDescription>
          </DialogHeader>
          <Input aria-label="Confirmation phrase" value={phrase} onChange={(event) => setPhrase(event.target.value)} autoComplete="off" />
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setPurgeOpen(false)} disabled={purging}>Cancel</Button>
            <Button variant="destructive" onClick={() => void purge()} disabled={phrase.trim() !== expected || purging}>
              {purging && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />} Remove originals
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export function ImportOriginSection({ getToken, origin }: {
  getToken: () => Promise<string | null>
  origin: { batchId: string; itemId?: string; previousPolicyId?: string }
}) {
  const detail = useImportItem(getToken, origin.batchId, origin.itemId || null)
  return (
    <section aria-labelledby="proposal-origin" className="space-y-2 rounded-xl border border-border/50 p-3">
      <h3 id="proposal-origin" className="text-xs font-bold">Imported from Podium</h3>
      <HubState loading={detail.loading} error={detail.error} onRetry={detail.reload}>
        {detail.data && (
          <div className="space-y-2 text-[11px]">
            <p className="text-muted-foreground">
              Import #{detail.data.batch.batchNumber} · {formatHubDate(detail.data.batch.createdAt)} · by {detail.data.batch.createdByName || "Team member"} · row {detail.data.item.rowNumber}
            </p>
            <dl className="grid gap-1.5 sm:grid-cols-2">
              <div><dt className="font-semibold">Podium reference</dt><dd className="break-words text-muted-foreground">{detail.data.item.sourceRef || "—"}</dd></div>
              <div><dt className="font-semibold">Podium location</dt><dd className="break-words text-muted-foreground">{locationLabelText(detail.data.item.sourceLocationLabel)} → {detail.data.item.locationScope.kind === "all" ? "All locations" : detail.data.item.locationScope.locationCode || "—"}</dd></div>
              <div><dt className="font-semibold">Podium status</dt><dd className="text-muted-foreground">{detail.data.item.sourceStatus === "on" ? "On" : detail.data.item.sourceStatus === "off" ? "Off" : "Not recorded"}</dd></div>
              <div><dt className="font-semibold">Fingerprint</dt><dd className="font-mono text-muted-foreground">{detail.data.item.fingerprint.slice(0, 12)}</dd></div>
            </dl>
            <p className="text-muted-foreground">{SOURCE_STATUS_NOTE}</p>
            {origin.previousPolicyId && <p className="text-muted-foreground">This draft replaces an earlier imported proposal that was already in review or decided.</p>}
            {detail.data.original ? (
              <div className="rounded-lg border border-dashed border-border/60 p-2">
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Original from Podium</p>
                <OriginalFields fields={detail.data.original.fields} />
              </div>
            ) : (
              <p className="text-muted-foreground">{CONTENT_STATUS_LABELS[detail.data.item.contentStatus]}{detail.data.item.purgedAt ? ` on ${formatHubDate(detail.data.item.purgedAt)}` : ""}.</p>
            )}
          </div>
        )}
      </HubState>
    </section>
  )
}
