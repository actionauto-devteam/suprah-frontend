"use client"

import * as React from "react"
import { AlertTriangle, Loader2, ShieldAlert } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import {
  knowledgeErrorIssues,
  knowledgeErrorMessage,
  knowledgeErrorStatus,
  knowledgeRequest,
  useKnowledgeEntry,
  useKnowledgeEntryAudit,
  useKnowledgeVersion,
  useKnowledgeVersions,
} from "@/hooks/useAiKnowledgeBase"
import {
  KB_AUDIT_LABELS,
  KB_CHANNEL_LABELS,
  KB_INVALIDATION_LABELS,
  KB_KIND_LABELS,
  KB_STATUS_LABELS,
  KB_TOPIC_LABELS,
  approvalDisplay,
  entryDisplay,
  locationNameList,
  locationNames,
  type KbEntryDetail,
  type KbIssue,
  type KbLocation,
  type KbVersion,
} from "@/lib/aiKnowledgeBase"
import { HubState } from "@/components/crm/aiHub/ShadowStatusBadge"
import { KbBadge, KbIssueList, KbPill, formatKbDate } from "./KnowledgeShared"

function approvedVersionNote(state?: string): string {
  if (state === "valid") return "approved"
  if (state === "partial") return "approved, suspended at some locations"
  return "last approved, approval not valid now"
}

type KbAction = "submit" | "request-changes" | "approve" | "reject" | "disable" | "enable" | "archive" | "restore"

const ACTIONS: Record<KbAction, { label: string; done: string; note: "none" | "optional" | "required"; version: boolean; destructive?: boolean }> = {
  submit: { label: "Submit for review", done: "Submitted for review", note: "none", version: true },
  "request-changes": { label: "Request changes", done: "Changes requested", note: "required", version: true },
  approve: { label: "Approve", done: "Approved", note: "optional", version: true },
  reject: { label: "Reject", done: "Rejected", note: "required", version: true, destructive: true },
  disable: { label: "Disable", done: "Disabled", note: "optional", version: false, destructive: true },
  enable: { label: "Turn back on", done: "Turned back on", note: "optional", version: false },
  archive: { label: "Archive", done: "Archived", note: "optional", version: false, destructive: true },
  restore: { label: "Restore for review", done: "Restored for review", note: "optional", version: false },
}

function VersionContent({ version, locations, heading }: { version: KbVersion; locations: KbLocation[]; heading: string }) {
  const content = version.content
  return (
    <section aria-label={heading} className="space-y-2 rounded-xl border border-border/40 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-xs font-bold">{heading}</h3>
        <KbPill>Version {version.version}</KbPill>
        <span className="text-[10px] text-muted-foreground">{version.createdBy?.name || "Team member"} · {formatKbDate(version.createdAt)}</span>
      </div>
      <dl className="grid grid-cols-1 gap-x-4 gap-y-1.5 text-[11px] sm:grid-cols-[8rem_1fr]">
        <dt className="font-semibold text-muted-foreground">Topic</dt><dd>{KB_TOPIC_LABELS[content.topic] || content.topic}</dd>
        {content.question && (<><dt className="font-semibold text-muted-foreground">Question</dt><dd className="break-words">{content.question}</dd></>)}
        <dt className="font-semibold text-muted-foreground">Title</dt><dd className="break-words">{content.title}</dd>
        <dt className="font-semibold text-muted-foreground">Answer</dt><dd className="whitespace-pre-wrap break-words">{content.answer}</dd>
        <dt className="font-semibold text-muted-foreground">Channels</dt><dd>{content.channels.map((channel) => KB_CHANNEL_LABELS[channel] || channel).join(", ")}</dd>
        <dt className="font-semibold text-muted-foreground">Locations</dt><dd>{locationNames(content.locationScope, locations)}</dd>
      </dl>
      {version.changeNote && <p className="text-[11px] text-muted-foreground">Note: {version.changeNote}</p>}
    </section>
  )
}

function ApprovalPanel({ detail, locations }: { detail: KbEntryDetail; locations: KbLocation[] }) {
  const entry = detail.entry
  const approval = entry.approval
  const display = approvalDisplay(approval)
  if (!approval || !display) {
    return (
      <div className="rounded-xl border border-border/40 bg-muted/20 p-3 text-[11px] text-muted-foreground">
        Not approved yet. Approved entries are still not used by the AI Agent until runtime publishing exists.
      </div>
    )
  }
  const suspendedNames = locationNameList(approval.activeSuspendedLocationIds, locations)
  const tone = approval.state === "valid" ? "border-emerald-500/30 bg-emerald-500/5" : approval.state === "invalidated" ? "border-red-500/30 bg-red-500/5" : "border-amber-500/30 bg-amber-500/5"
  return (
    <section aria-label="Approval" className={`space-y-1.5 rounded-xl border p-3 text-[11px] ${tone}`}>
      <div className="flex flex-wrap items-center gap-2">
        {approval.state === "valid" ? null : <ShieldAlert className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
        <KbBadge display={display} />
        <span className="text-muted-foreground">{approval.state === "valid" || approval.state === "partial" ? "Approved" : "Last approved as"} version {approval.version}{entry.approvedBy?.name ? ` by ${entry.approvedBy.name}` : ""}{entry.approvedAt ? ` · ${formatKbDate(entry.approvedAt)}` : ""}</span>
      </div>
      {display.note && <p>{display.note}</p>}
      {approval.invalidation && <p>Reason: {KB_INVALIDATION_LABELS[approval.invalidation.reason] || approval.invalidation.reason} ({formatKbDate(approval.invalidation.at)})</p>}
      {suspendedNames.length > 0 && <p>Suspended at: {suspendedNames.join(", ")}. A fresh review is needed before it applies there again.</p>}
      {approval.needsReapproval && <p className="font-semibold">Submit it for re-approval. Another manager or admin must approve it.</p>}
      <p className="text-muted-foreground">Knowledge Base content is not used by the AI Agent yet, even when approved.</p>
    </section>
  )
}

export function KnowledgeEntryDrawer({ entryId, getToken, locations, refreshKey = 0, onClose, onEdit, onChanged }: {
  entryId: string | null
  refreshKey?: number
  getToken: () => Promise<string | null>
  locations: KbLocation[]
  onClose: () => void
  onEdit: (detail: KbEntryDetail) => void
  onChanged: () => void
}) {
  const [refresh, setRefresh] = React.useState(0)
  const detail = useKnowledgeEntry(getToken, entryId, refresh + refreshKey)
  const versions = useKnowledgeVersions(getToken, entryId, refresh + refreshKey)
  const audit = useKnowledgeEntryAudit(getToken, entryId, refresh + refreshKey)
  const [viewing, setViewing] = React.useState<number | null>(null)
  const viewed = useKnowledgeVersion(getToken, entryId, viewing)
  const [pending, setPending] = React.useState<KbAction | null>(null)
  const [note, setNote] = React.useState("")
  const [busy, setBusy] = React.useState(false)
  const [actionIssues, setActionIssues] = React.useState<KbIssue[]>([])

  React.useEffect(() => {
    setPending(null)
    setNote("")
    setViewing(null)
    setActionIssues([])
  }, [entryId])

  const data = detail.data
  const entry = data?.entry

  const run = async (action: KbAction) => {
    if (!entry) return
    const config = ACTIONS[action]
    if (config.note === "required" && !note.trim()) {
      toast.error("Add a short note first")
      return
    }
    setBusy(true)
    setActionIssues([])
    try {
      const body: Record<string, unknown> = {}
      if (config.version) body.expectedVersion = entry.currentVersion
      if (note.trim()) body.note = note.trim()
      await knowledgeRequest(getToken, "post", `/entries/${entry.id}/${action}`, body)
      toast.success(config.done)
      setPending(null)
      setNote("")
      setRefresh((value) => value + 1)
      onChanged()
    } catch (err) {
      setActionIssues(knowledgeErrorIssues(err))
      toast.error(`${config.label} failed`, { description: knowledgeErrorMessage(err, "Please try again.") })
      if (knowledgeErrorStatus(err) === 409) setRefresh((value) => value + 1)
    } finally {
      setBusy(false)
    }
  }

  const permissions = data?.permissions
  const buttons: Array<{ action: KbAction; show: boolean; label?: string }> = entry && permissions ? [
    { action: "submit", show: permissions.canSubmit, label: entry.status === "approved" ? "Submit for re-approval" : undefined },
    { action: "approve", show: permissions.canReview },
    { action: "request-changes", show: permissions.canReview },
    { action: "reject", show: permissions.canReview || (entry.status === "changes_requested" && permissions.canDisable) },
    { action: "disable", show: permissions.canDisable },
    { action: "enable", show: permissions.canEnable },
    { action: "archive", show: permissions.canArchive },
    { action: "restore", show: permissions.canRestore },
  ] : []

  return (
    <Sheet open={Boolean(entryId)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full overflow-y-auto p-0 sm:max-w-2xl">
        <SheetHeader className="border-b border-border/40 px-4 py-4 sm:px-6">
          <SheetTitle className="pr-10 text-base">{entry ? entry.title : "Knowledge Base entry"}</SheetTitle>
          <SheetDescription className="text-xs">
            {entry ? `${KB_KIND_LABELS[entry.kind]} · ${KB_TOPIC_LABELS[entry.topic] || entry.topic} · ${locationNames(entry.locationScope, locations)}` : "Loading…"}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-5 px-4 py-5 sm:px-6">
          <HubState loading={detail.loading && !data} error={detail.error} onRetry={detail.reload}>
            {data && entry && (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <KbBadge display={entryDisplay(entry)} />
                  {entry.lifecycle !== "active" && entry.status !== "approved" && <KbPill>{KB_STATUS_LABELS[entry.status]}</KbPill>}
                  {entry.source.system === "podium_import" && <KbPill>Imported from Podium{entry.source.importBatchNumber ? `, import #${entry.source.importBatchNumber}` : ""}</KbPill>}
                  {entry.source.sourceStatus === "off" && <KbPill>Originally Off in Podium</KbPill>}
                  <span className="text-[10px] text-muted-foreground">By {entry.createdBy?.name || "Team member"} · updated {formatKbDate(entry.updatedAt)}</span>
                </div>

                <ApprovalPanel detail={data} locations={locations} />

                {entry.lastReview && (
                  <p className="rounded-lg border border-border/40 p-3 text-[11px]">
                    <span className="font-semibold">Last review:</span> {entry.lastReview.action.replace(/_/g, " ")} by {entry.lastReview.by?.name || "a reviewer"}
                    {entry.lastReview.note ? ` · “${entry.lastReview.note}”` : ""}
                  </p>
                )}

                <KbIssueList issues={data.check.errors} title="Fix these before it can be submitted or approved" />
                <KbIssueList issues={data.check.warnings} title="Check these" tone="warning" />
                <KbIssueList issues={actionIssues} title="The server refused this change" />

                {(data.conflicts.length > 0 || data.duplicates.length > 0) && (
                  <div role="status" className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-[11px] text-amber-800 dark:text-amber-200">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <div className="space-y-0.5">
                      {data.conflicts.length > 0 && <p>{data.conflicts.length} approved entr{data.conflicts.length === 1 ? "y already covers" : "ies already cover"} this for an overlapping location. Approval is blocked until it is disabled or the locations are narrowed.</p>}
                      {data.duplicates.length > 0 && <p>{data.duplicates.length} other entr{data.duplicates.length === 1 ? "y asks" : "ies ask"} the same thing for an overlapping location.</p>}
                    </div>
                  </div>
                )}

                {data.current && <VersionContent version={data.current} locations={locations} heading="Current version" />}
                {data.approved && (
                  <VersionContent
                    version={data.approved}
                    locations={locations}
                    heading={entry.approval?.state === "valid" ? "Approved version" : entry.approval?.state === "partial" ? "Approved version (suspended at some locations)" : "Last approved version (approval not valid now)"}
                  />
                )}

                {buttons.some((button) => button.show) || permissions?.canEdit ? (
                  <section aria-label="Actions" className="space-y-2 border-t border-border/40 pt-4">
                    <div className="flex flex-wrap gap-2">
                      {permissions?.canEdit && (
                        <Button size="sm" variant="outline" disabled={busy} onClick={() => onEdit(data)}>
                          {entry.status === "approved" ? "Edit (starts a revision)" : "Edit"}
                        </Button>
                      )}
                      {buttons.filter((button) => button.show).map((button) => (
                        <Button
                          key={button.action}
                          size="sm"
                          variant={button.action === "approve" || button.action === "submit" ? "default" : "outline"}
                          disabled={busy || (button.action === "approve" && entry.isMine)}
                          onClick={() => {
                            setNote("")
                            if (ACTIONS[button.action].note === "none") void run(button.action)
                            else setPending(button.action)
                          }}
                          title={button.action === "approve" && entry.isMine ? "You created this entry, so another manager or admin must approve it" : undefined}
                        >
                          {button.label || ACTIONS[button.action].label}
                        </Button>
                      ))}
                    </div>
                    {entry.isMine && permissions?.canReview && <p className="text-[11px] text-muted-foreground">You created this entry, so another manager or admin must approve it.</p>}
                    {pending && (
                      <div className="space-y-2 rounded-lg border border-border/40 p-3">
                        <label htmlFor="kb-action-note" className="text-xs font-semibold">
                          {ACTIONS[pending].label}: note{ACTIONS[pending].note === "required" ? "" : " (optional)"}
                        </label>
                        <Textarea id="kb-action-note" rows={2} maxLength={500} value={note} onChange={(event) => setNote(event.target.value)} disabled={busy} />
                        <div className="flex flex-wrap justify-end gap-2">
                          <Button size="sm" variant="outline" onClick={() => setPending(null)} disabled={busy}>Cancel</Button>
                          <Button size="sm" variant={ACTIONS[pending].destructive ? "destructive" : "default"} onClick={() => void run(pending)} disabled={busy}>
                            {busy && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />}
                            Confirm {ACTIONS[pending].label.toLowerCase()}
                          </Button>
                        </div>
                      </div>
                    )}
                  </section>
                ) : null}

                <section aria-labelledby="kb-versions" className="space-y-2">
                  <h3 id="kb-versions" className="text-xs font-bold">Version history</h3>
                  <p className="text-[11px] text-muted-foreground">Versions are permanent and can&apos;t be changed.</p>
                  <HubState loading={versions.loading && !versions.data} error={versions.error} onRetry={versions.reload}>
                    <ol className="space-y-1">
                      {(versions.data || []).map((row) => (
                        <li key={row.version}>
                          <button
                            type="button"
                            className="w-full rounded-lg border border-border/40 px-3 py-2 text-left text-[11px] hover:bg-muted/40 focus-visible:outline-2 focus-visible:outline-primary"
                            onClick={() => setViewing(viewing === row.version ? null : row.version)}
                            aria-expanded={viewing === row.version}
                          >
                            <span className="font-semibold">Version {row.version}</span>
                            {row.isCurrent && " · current"}
                            {row.isApproved && ` · ${approvedVersionNote(entry.approval?.state)}`}
                            {" · "}{row.createdBy?.name || "Team member"}{" · "}{formatKbDate(row.createdAt)}
                            {row.changeNote && <span className="block text-muted-foreground">{row.changeNote}</span>}
                          </button>
                          {viewing === row.version && (
                            <div className="mt-1">
                              <HubState loading={viewed.loading} error={viewed.error}>
                                {viewed.data && <VersionContent version={viewed.data} locations={locations} heading={`Version ${row.version}`} />}
                              </HubState>
                            </div>
                          )}
                        </li>
                      ))}
                    </ol>
                  </HubState>
                </section>

                <section aria-labelledby="kb-audit" className="space-y-2">
                  <h3 id="kb-audit" className="text-xs font-bold">History</h3>
                  <HubState loading={audit.loading && !audit.data} error={audit.error} onRetry={audit.reload}>
                    <ol className="space-y-1.5">
                      {(audit.data || []).map((row) => (
                        <li key={row.id} className="text-[11px] text-muted-foreground">
                          <span className="font-semibold text-foreground">{KB_AUDIT_LABELS[row.action] || row.action}</span>
                          {row.version ? ` · version ${row.version}` : ""}
                          {row.locationId ? ` · ${locationNameList([row.locationId], locations)[0]}` : ""}
                          {" · "}{row.actor?.name || "System"}{" · "}{formatKbDate(row.createdAt)}
                          {row.note && <span className="block">{KB_INVALIDATION_LABELS[row.note] || (row.note === "location_archived" ? "The location was archived." : row.note === "location_restored" ? "The location was restored." : row.note)}</span>}
                        </li>
                      ))}
                    </ol>
                  </HubState>
                </section>
              </>
            )}
          </HubState>
        </div>
      </SheetContent>
    </Sheet>
  )
}
