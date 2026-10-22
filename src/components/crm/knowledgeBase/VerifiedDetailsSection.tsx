"use client"

import * as React from "react"
import { Loader2, Plus } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { HubState } from "@/components/crm/aiHub/ShadowStatusBadge"
import {
  knowledgeErrorIssues,
  knowledgeErrorMessage,
  knowledgeErrorStatus,
  knowledgeRequest,
  useVerifiedDetail,
  useVerifiedDetails,
} from "@/hooks/useAiKnowledgeBase"
import {
  KB_AUDIT_LABELS,
  VERIFIED_DETAIL_KIND_LABELS,
  VERIFIED_DETAIL_KINDS,
  VERIFIED_DETAIL_STATUS_LABELS,
  VERIFIED_DETAIL_STATUSES,
  VERIFIED_PROGRAM_TYPE_LABELS,
  VERIFIED_PROGRAM_TYPES,
  detailDisplay,
  locationNameList,
  locationNames,
  type KbIssue,
  type KbLocation,
  type VerifiedDetail,
  type VerifiedDetailKind,
  type VerifiedProgramType,
} from "@/lib/aiKnowledgeBase"
import { KbBadge, KbFieldErrors, KbIssueList, KbLocationPicker, KbPill, formatKbDate, issuesFor, scopeFromPicker } from "./KnowledgeShared"

type DetailEditorTarget = { mode: "create" } | { mode: "edit"; detail: VerifiedDetail }

const VALUE_HINTS: Record<VerifiedDetailKind, { label: string; placeholder: string }> = {
  phone: { label: "Phone number", placeholder: "(801) 555-0100" },
  email: { label: "Email address", placeholder: "sales@yourdealership.com" },
  website: { label: "Website", placeholder: "yourdealership.com" },
  program: { label: "Program name", placeholder: "Military Appreciation Program" },
}

function DetailEditor({ target, locations, getToken, onClose, onSaved }: {
  target: DetailEditorTarget | null
  locations: KbLocation[]
  getToken: () => Promise<string | null>
  onClose: () => void
  onSaved: () => void
}) {
  const [kind, setKind] = React.useState<VerifiedDetailKind>("phone")
  const [value, setValue] = React.useState("")
  const [label, setLabel] = React.useState("")
  const [programType, setProgramType] = React.useState<VerifiedProgramType | "">("")
  const [scope, setScope] = React.useState<{ scope: "" | "all" | "locations"; locationIds: string[] }>({ scope: "", locationIds: [] })
  const [issues, setIssues] = React.useState<KbIssue[]>([])
  const [busy, setBusy] = React.useState(false)
  const editing = target?.mode === "edit" ? target.detail : null

  React.useEffect(() => {
    if (!target) return
    setIssues([])
    if (target.mode === "create") {
      setKind("phone")
      setValue("")
      setLabel("")
      setProgramType("")
      setScope({ scope: "", locationIds: [] })
    } else {
      setKind(target.detail.kind)
      setValue(target.detail.value)
      setLabel(target.detail.label || "")
      setProgramType(target.detail.programType || "")
      setScope({ scope: target.detail.locationScope.scope, locationIds: target.detail.locationScope.locationIds })
    }
  }, [target])

  const save = async () => {
    setBusy(true)
    setIssues([])
    const body: Record<string, unknown> = {
      kind,
      value,
      label: label.trim() || undefined,
      programType: kind === "program" ? programType || undefined : undefined,
      locations: scopeFromPicker(scope),
    }
    try {
      if (editing) await knowledgeRequest(getToken, "put", `/verified-details/${editing.id}`, { ...body, expectedRevision: editing.revision })
      else await knowledgeRequest(getToken, "post", "/verified-details", body)
      toast.success(editing ? "Change saved. It needs approval again." : "Proposed. Another manager or admin must approve it.")
      onSaved()
    } catch (err) {
      setIssues(knowledgeErrorIssues(err))
      toast.error("Could not save", { description: knowledgeErrorMessage(err, "Please try again.") })
    } finally {
      setBusy(false)
    }
  }

  const known = ["kind", "value", "label", "programType", "locations"]
  const other = issues.filter((issue) => !known.some((field) => issue.field === field || issue.field.startsWith(`${field}.`)))
  return (
    <Sheet open={Boolean(target)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full overflow-y-auto p-0 sm:max-w-lg">
        <SheetHeader className="border-b border-border/40 px-4 py-4 sm:px-6">
          <SheetTitle className="pr-10 text-base">{editing ? "Change verified detail" : "Propose a verified detail"}</SheetTitle>
          <SheetDescription className="text-xs">
            Dealership contact details and discount programs must be approved by a second manager or admin before Knowledge Base answers can use them.
          </SheetDescription>
        </SheetHeader>
        <form className="space-y-5 px-4 py-5 sm:px-6" onSubmit={(event) => { event.preventDefault(); void save() }} aria-label="Verified detail">
          {editing?.status === "approved" && (
            <p className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-[11px] text-amber-800 dark:text-amber-200">
              Saving a change sends it back for approval, and every approved answer that uses it will need re-approval.
            </p>
          )}
          <KbIssueList issues={other} title="Fix these before saving" />
          <div className="space-y-1">
            <label htmlFor="kb-detail-kind" className="text-xs font-semibold">Type</label>
            <select
              id="kb-detail-kind"
              className="h-9 w-full rounded-lg border border-input bg-background px-2.5 text-xs"
              value={kind}
              disabled={busy || Boolean(editing)}
              onChange={(event) => setKind(event.target.value as VerifiedDetailKind)}
            >
              {VERIFIED_DETAIL_KINDS.map((item) => <option key={item} value={item}>{VERIFIED_DETAIL_KIND_LABELS[item]}</option>)}
            </select>
            <KbFieldErrors issues={issuesFor(issues, "kind")} />
          </div>
          <div className="space-y-1">
            <label htmlFor="kb-detail-value" className="text-xs font-semibold">{VALUE_HINTS[kind].label}</label>
            {kind === "email" && <p className="text-[11px] text-muted-foreground">Each email address is approved on its own. An approved website does not approve its email addresses.</p>}
            {kind === "program" && <p className="text-[11px] text-muted-foreground">Use the program&apos;s specific name, without amounts. Answers may describe it but can&apos;t promise eligibility, amounts or stacking.</p>}
            <Input id="kb-detail-value" value={value} maxLength={200} disabled={busy} onChange={(event) => setValue(event.target.value)} placeholder={VALUE_HINTS[kind].placeholder} aria-invalid={issuesFor(issues, "value").length > 0} />
            <KbFieldErrors issues={issuesFor(issues, "value")} />
          </div>
          {kind === "program" && (
            <div className="space-y-1">
              <label htmlFor="kb-detail-program-type" className="text-xs font-semibold">Program type</label>
              <select
                id="kb-detail-program-type"
                className="h-9 w-full rounded-lg border border-input bg-background px-2.5 text-xs"
                value={programType}
                disabled={busy}
                onChange={(event) => setProgramType(event.target.value as VerifiedProgramType)}
              >
                <option value="">Choose a type</option>
                {VERIFIED_PROGRAM_TYPES.map((item) => <option key={item} value={item}>{VERIFIED_PROGRAM_TYPE_LABELS[item]}</option>)}
              </select>
              <KbFieldErrors issues={issuesFor(issues, "programType")} />
            </div>
          )}
          <div className="space-y-1">
            <label htmlFor="kb-detail-label" className="text-xs font-semibold">Label (optional)</label>
            <Input id="kb-detail-label" value={label} maxLength={80} disabled={busy} onChange={(event) => setLabel(event.target.value)} placeholder="Orem sales line" />
            <KbFieldErrors issues={issuesFor(issues, "label")} />
          </div>
          <KbLocationPicker idPrefix="kb-detail" value={scope} onChange={setScope} locations={locations} disabled={busy} issues={issuesFor(issues, "locations")} />
          <div className="flex flex-col-reverse gap-2 border-t border-border/40 pt-4 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={busy}>Cancel</Button>
            <Button type="submit" size="sm" disabled={busy || !value.trim()}>
              {busy && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />}
              {editing ? "Save and send for approval" : "Propose"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}

type DetailAction = "approve" | "reapprove" | "revoke" | "archive"
const DETAIL_ACTIONS: Record<DetailAction, { label: string; done: string; note: "none" | "optional" | "required"; destructive?: boolean }> = {
  approve: { label: "Approve", done: "Approved", note: "none" },
  reapprove: { label: "Re-approve for restored locations", done: "Re-approved", note: "none" },
  revoke: { label: "Revoke", done: "Revoked. Answers that used it now need re-approval.", note: "required", destructive: true },
  archive: { label: "Archive", done: "Archived", note: "optional", destructive: true },
}

function DetailSheet({ detailId, canReview, locations, getToken, onClose, onEdit, onChanged }: {
  detailId: string | null
  canReview: boolean
  locations: KbLocation[]
  getToken: () => Promise<string | null>
  onClose: () => void
  onEdit: (detail: VerifiedDetail) => void
  onChanged: () => void
}) {
  const [refresh, setRefresh] = React.useState(0)
  const view = useVerifiedDetail(getToken, detailId, refresh)
  const [pending, setPending] = React.useState<DetailAction | null>(null)
  const [note, setNote] = React.useState("")
  const [busy, setBusy] = React.useState(false)
  const detail = view.data?.detail

  React.useEffect(() => {
    setPending(null)
    setNote("")
  }, [detailId])

  const run = async (action: DetailAction) => {
    if (!detail) return
    if (DETAIL_ACTIONS[action].note === "required" && !note.trim()) {
      toast.error("Add a short note first")
      return
    }
    setBusy(true)
    try {
      await knowledgeRequest(getToken, "post", `/verified-details/${detail.id}/${action}`, { expectedRevision: detail.revision, ...(note.trim() ? { note: note.trim() } : {}) })
      toast.success(DETAIL_ACTIONS[action].done)
      setPending(null)
      setNote("")
      setRefresh((value) => value + 1)
      onChanged()
    } catch (err) {
      toast.error(`${DETAIL_ACTIONS[action].label} failed`, { description: knowledgeErrorMessage(err, "Please try again.") })
      if (knowledgeErrorStatus(err) === 409) setRefresh((value) => value + 1)
    } finally {
      setBusy(false)
    }
  }

  const actions: DetailAction[] = detail && canReview
    ? [
      ...(detail.status === "pending" ? ["approve" as const] : []),
      ...(detail.status === "approved" && detail.needsReapproval ? ["reapprove" as const] : []),
      ...(detail.status === "approved" ? ["revoke" as const] : []),
      ...(detail.status !== "archived" ? ["archive" as const] : []),
    ]
    : []

  return (
    <Sheet open={Boolean(detailId)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full overflow-y-auto p-0 sm:max-w-lg">
        <SheetHeader className="border-b border-border/40 px-4 py-4 sm:px-6">
          <SheetTitle className="pr-10 text-base break-words">{detail ? detail.value : "Verified detail"}</SheetTitle>
          <SheetDescription className="text-xs">{detail ? `${VERIFIED_DETAIL_KIND_LABELS[detail.kind]} · ${locationNames(detail.locationScope, locations)}` : "Loading…"}</SheetDescription>
        </SheetHeader>
        <div className="space-y-5 px-4 py-5 sm:px-6">
          <HubState loading={view.loading && !view.data} error={view.error} onRetry={view.reload}>
            {view.data && detail && (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <KbBadge display={detailDisplay(detail)} />
                  <KbPill>Revision {detail.revision}</KbPill>
                  {detail.programType && <KbPill>{VERIFIED_PROGRAM_TYPE_LABELS[detail.programType]}</KbPill>}
                </div>
                {detail.label && <p className="text-xs">{detail.label}</p>}
                <p className="text-[11px] text-muted-foreground">
                  Proposed by {detail.proposedBy?.name || "a manager"}{detail.approvedBy?.name ? ` · approved by ${detail.approvedBy.name}` : ""}
                </p>
                {detail.suspendedLocationIds.length > 0 && (
                  <p role="status" className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-[11px] text-amber-800 dark:text-amber-200">
                    Not valid at {locationNameList(detail.suspendedLocationIds, locations).join(", ")} because the location was archived or restored.
                    {detail.needsReapproval ? " A manager or admin who did not propose it can re-approve it there." : " It stays suspended while the location is archived."}
                  </p>
                )}
                {actions.length > 0 && (
                  <section aria-label="Actions" className="space-y-2">
                    <div className="flex flex-wrap gap-2">
                      {(detail.status === "pending" || detail.status === "approved") && (
                        <Button size="sm" variant="outline" disabled={busy} onClick={() => onEdit(detail)}>Change</Button>
                      )}
                      {actions.map((action) => (
                        <Button
                          key={action}
                          size="sm"
                          variant={action === "approve" || action === "reapprove" ? "default" : "outline"}
                          disabled={busy}
                          onClick={() => { setNote(""); if (DETAIL_ACTIONS[action].note === "none") void run(action); else setPending(action) }}
                        >
                          {DETAIL_ACTIONS[action].label}
                        </Button>
                      ))}
                    </div>
                    {pending && (
                      <div className="space-y-2 rounded-lg border border-border/40 p-3">
                        <label htmlFor="kb-detail-note" className="text-xs font-semibold">{DETAIL_ACTIONS[pending].label}: note{DETAIL_ACTIONS[pending].note === "required" ? "" : " (optional)"}</label>
                        <Textarea id="kb-detail-note" rows={2} maxLength={500} value={note} onChange={(event) => setNote(event.target.value)} disabled={busy} />
                        <div className="flex flex-wrap justify-end gap-2">
                          <Button size="sm" variant="outline" onClick={() => setPending(null)} disabled={busy}>Cancel</Button>
                          <Button size="sm" variant={DETAIL_ACTIONS[pending].destructive ? "destructive" : "default"} onClick={() => void run(pending)} disabled={busy}>
                            Confirm {DETAIL_ACTIONS[pending].label.toLowerCase()}
                          </Button>
                        </div>
                      </div>
                    )}
                  </section>
                )}
                {canReview && (
                  <>
                    <section aria-labelledby="kb-detail-dependents" className="space-y-1">
                      <h3 id="kb-detail-dependents" className="text-xs font-bold">Approved answers that use it</h3>
                      <p className="text-[11px] text-muted-foreground">
                        {view.data.dependentEntries.length
                          ? `${view.data.dependentEntries.length} entr${view.data.dependentEntries.length === 1 ? "y" : "ies"}, ${view.data.dependentEntries.filter((row) => row.invalidated).length} needing re-approval.`
                          : "None yet."}
                      </p>
                    </section>
                    <section aria-labelledby="kb-detail-revisions" className="space-y-1">
                      <h3 id="kb-detail-revisions" className="text-xs font-bold">Revisions</h3>
                      <ol className="space-y-1">
                        {view.data.revisions.map((row) => (
                          <li key={row.revision} className="text-[11px] text-muted-foreground">
                            <span className="font-semibold text-foreground">Revision {row.revision}</span> · {row.value}{row.label ? ` (${row.label})` : ""} · {locationNames(row.locationScope, locations)} · {row.createdBy?.name || "Team member"} · {formatKbDate(row.createdAt)}
                          </li>
                        ))}
                      </ol>
                    </section>
                    <section aria-labelledby="kb-detail-history" className="space-y-1">
                      <h3 id="kb-detail-history" className="text-xs font-bold">History</h3>
                      <ol className="space-y-1">
                        {view.data.history.map((row, index) => (
                          <li key={index} className="text-[11px] text-muted-foreground">
                            <span className="font-semibold text-foreground">{KB_AUDIT_LABELS[row.action] || row.action}</span>
                            {row.version ? ` · revision ${row.version}` : ""} · {row.actor?.name || "System"} · {formatKbDate(row.createdAt)}
                            {row.note && <span className="block">{row.note === "location_archived" ? "The location was archived." : row.note === "location_restored" ? "The location was restored." : row.note}</span>}
                          </li>
                        ))}
                      </ol>
                    </section>
                  </>
                )}
              </>
            )}
          </HubState>
        </div>
      </SheetContent>
    </Sheet>
  )
}

export function VerifiedDetailsSection({ getToken, canReview, locations }: {
  getToken: () => Promise<string | null>
  canReview: boolean
  locations: KbLocation[]
}) {
  const [kind, setKind] = React.useState("")
  const [status, setStatus] = React.useState("")
  const [refresh, setRefresh] = React.useState(0)
  const [openId, setOpenId] = React.useState<string | null>(null)
  const [editor, setEditor] = React.useState<DetailEditorTarget | null>(null)
  const list = useVerifiedDetails(getToken, { kind: kind || undefined, status: canReview ? status || undefined : undefined }, true, refresh)

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <label className="sr-only" htmlFor="kb-detail-filter-kind">Type</label>
        <select id="kb-detail-filter-kind" className="h-9 w-full rounded-lg border border-input bg-background px-2.5 text-xs sm:w-auto" value={kind} onChange={(event) => setKind(event.target.value)}>
          <option value="">All types</option>
          {VERIFIED_DETAIL_KINDS.map((item) => <option key={item} value={item}>{VERIFIED_DETAIL_KIND_LABELS[item]}</option>)}
        </select>
        {canReview && (
          <>
            <label className="sr-only" htmlFor="kb-detail-filter-status">Status</label>
            <select id="kb-detail-filter-status" className="h-9 w-full rounded-lg border border-input bg-background px-2.5 text-xs sm:w-auto" value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="">All except archived</option>
              {VERIFIED_DETAIL_STATUSES.map((item) => <option key={item} value={item}>{VERIFIED_DETAIL_STATUS_LABELS[item]}</option>)}
            </select>
            <Button size="sm" className="h-9 sm:ml-auto" onClick={() => setEditor({ mode: "create" })}>
              <Plus className="mr-1 h-3.5 w-3.5" /> Propose
            </Button>
          </>
        )}
      </div>
      {!canReview && <p className="text-[11px] text-muted-foreground">These are the approved dealership contacts and programs Knowledge Base answers may use. Managers and admins maintain this list.</p>}
      <HubState
        loading={list.loading && !list.data}
        error={list.error}
        onRetry={list.reload}
        empty={list.data && !list.data.length ? (canReview ? "No verified contacts or programs yet. Use Propose to add one." : "No approved contacts or programs yet.") : false}
      >
        <ul aria-label="Verified contacts and programs" className="space-y-2">
          {(list.data || []).map((detail) => (
            <li key={detail.id}>
              <button
                type="button"
                onClick={() => setOpenId(detail.id)}
                className="w-full rounded-xl border border-border/40 p-3 text-left transition-colors hover:bg-muted/40 focus-visible:outline-2 focus-visible:outline-primary"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <KbBadge display={detailDisplay(detail)} />
                  <KbPill>{VERIFIED_DETAIL_KIND_LABELS[detail.kind]}</KbPill>
                  <span className="min-w-0 flex-1 break-all text-xs font-semibold">{detail.value}</span>
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {detail.label ? `${detail.label} · ` : ""}{locationNames(detail.locationScope, locations)}
                  {detail.suspendedLocationIds.length ? ` · suspended at ${locationNameList(detail.suspendedLocationIds, locations).join(", ")}` : ""}
                </p>
              </button>
            </li>
          ))}
        </ul>
      </HubState>
      <DetailSheet
        detailId={openId}
        canReview={canReview}
        locations={locations}
        getToken={getToken}
        onClose={() => setOpenId(null)}
        onEdit={(detail) => setEditor({ mode: "edit", detail })}
        onChanged={() => setRefresh((value) => value + 1)}
      />
      <DetailEditor
        target={editor}
        locations={locations}
        getToken={getToken}
        onClose={() => setEditor(null)}
        onSaved={() => { setEditor(null); setRefresh((value) => value + 1); setOpenId(null) }}
      />
    </div>
  )
}
