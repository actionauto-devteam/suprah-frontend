"use client"

import * as React from "react"
import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"
import { trainingErrorMessage, trainingRequest, useTrainingProposal } from "@/hooks/useAiTraining"
import {
  TRAINING_RULE_CHANNELS,
  ruleFromVersion,
  TRAINING_AUDIT_LABELS,
  TRAINING_SOURCE_LABELS,
  TRAINING_STATUS_LABELS,
  TRAINING_STATUS_STYLES,
  type TrainingProposalDetail,
  type TrainingStatus,
  type TrainingStatusInfo,
} from "@/lib/aiTraining"
import { HubState, formatHubDate } from "./ShadowStatusBadge"
import type { TrainingRuleEditorTarget } from "./TrainingRuleEditor"
import { ProposalTestsSection } from "./LabResultView"

export function TrainingStatusBadge({ status }: { status: TrainingStatus }) {
  return (
    <span className={cn("inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold", TRAINING_STATUS_STYLES[status] || TRAINING_STATUS_STYLES.draft)}>
      {TRAINING_STATUS_LABELS[status] || status}
    </span>
  )
}

type Action = "approve" | "request-changes" | "reject" | "withdraw" | "revise" | "submit"

const ACTION_LABELS: Record<Action, string> = {
  approve: "Approve",
  "request-changes": "Request changes",
  reject: "Reject",
  withdraw: "Withdraw",
  revise: "Resubmit",
  submit: "Submit for review",
}

export function TrainingProposalDrawer({ proposalId, status, getToken, onClose, onChanged, onEdit, refreshKey, onTestVersion, onOpenResult, testsRefreshKey }: {
  proposalId: string | null
  status: TrainingStatusInfo
  getToken: () => Promise<string | null>
  onClose: () => void
  onChanged: () => void
  onEdit: (target: TrainingRuleEditorTarget) => void
  refreshKey?: number
  onTestVersion?: (policyId: string, version: number) => void
  onOpenResult?: (runId: string) => void
  testsRefreshKey?: number
}) {
  const { data, setData, loading, error, reload } = useTrainingProposal(getToken, proposalId)
  const [note, setNote] = React.useState("")
  const [revision, setRevision] = React.useState("")
  const [busy, setBusy] = React.useState<Action | null>(null)

  React.useEffect(() => {
    if (refreshKey) reload()
  }, [refreshKey, reload])

  React.useEffect(() => {
    setNote("")
    setRevision(data?.versions?.[0]?.spec?.instruction || "")
  }, [data?.id, data?.currentVersion, data?.versions])

  const run = async (action: Action) => {
    if (!data) return
    setBusy(action)
    try {
      const body = action === "revise"
        ? { instruction: revision, changeNote: note || undefined }
        : { note: note || undefined, expectedVersion: data.currentVersion }
      const updated = await trainingRequest<TrainingProposalDetail>(getToken, "post", `/api/crm/ai-training/proposals/${data.id}/${action}`, body)
      setData(updated)
      toast.success(`${ACTION_LABELS[action]}: done`)
      onChanged()
    } catch (err) {
      toast.error(`${ACTION_LABELS[action]} failed`, { description: trainingErrorMessage(err, "Please try again.") })
    } finally {
      setBusy(null)
    }
  }

  const current = data?.versions?.[0]
  const structured = current?.spec?.format === "structured_v1"
  const isOpen = data?.status === "in_review"
  const canReview = status.canReview && isOpen
  const editedCurrent = Boolean(current?.createdByMe && !data?.isMine)
  const integrityProblem = data?.integrity?.ok === false
  const canApprove = canReview && !data?.isMine && !current?.createdByMe && !integrityProblem
  const canReject = status.canReview && (data?.status === "in_review" || data?.status === "changes_requested")
  const canWithdraw = Boolean(data && ["draft", "in_review", "changes_requested"].includes(data.status) && (data.isMine || status.canReview))
  const authorCanChange = Boolean(data?.isMine && (data.status === "changes_requested" || data.status === "draft"))
  const canRevise = authorCanChange && !structured
  const canSubmit = authorCanChange && structured && !integrityProblem
  const canEditRule = Boolean(data && (authorCanChange || canReview))

  const openEditor = () => {
    if (!data) return
    onEdit({
      mode: "edit",
      proposalId: data.id,
      expectedVersion: data.currentVersion,
      initial: ruleFromVersion(current, data),
      reviewEdit: !authorCanChange,
    })
  }

  return (
    <Sheet open={Boolean(proposalId)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto p-0">
        <SheetHeader className="border-b border-border/40 px-4 py-4 sm:px-6">
          <SheetTitle className="pr-10 text-base">Training proposal</SheetTitle>
          <SheetDescription className="text-xs">Proposals never change Alex until they are approved and published.</SheetDescription>
        </SheetHeader>
        <div className="space-y-5 px-4 pb-8 sm:px-6">
          <HubState loading={loading} error={error} onRetry={reload}>
            {data && (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <TrainingStatusBadge status={data.status} />
                  <span className="text-[11px] text-muted-foreground">{TRAINING_SOURCE_LABELS[data.source] || data.source}</span>
                  <span className="ml-auto text-[11px] text-muted-foreground">Version {data.currentVersion}</span>
                </div>
                {integrityProblem && (
                  <div role="alert" className="rounded-xl border border-red-500/30 bg-red-500/5 p-3 text-xs text-red-700 dark:text-red-300">
                    <p className="font-semibold">This proposal has a data problem and cannot be approved or submitted.</p>
                    <ul className="ml-4 mt-1 list-disc">
                      {data.integrity?.issues.filter((issue) => issue.severity === "critical").map((issue) => <li key={issue.code}>{issue.message}</li>)}
                    </ul>
                    <p className="mt-1">An admin can run the training integrity check to repair it.</p>
                  </div>
                )}
                <p className="text-[11px] text-muted-foreground">
                  By {data.createdBy?.name || "Team member"}{data.isMine ? " (you)" : ""} · {formatHubDate(data.submittedAt || data.createdAt)}
                </p>

                {structured && data.evaluation ? (
                  <section aria-labelledby="proposal-rule" className="space-y-2 rounded-xl border border-border/50 bg-muted/20 p-3">
                    <h3 id="proposal-rule" className="text-xs font-bold">Training rule</h3>
                    <p className="text-sm font-medium">{data.evaluation.preview.headline}</p>
                    <p className="text-[11px] text-muted-foreground">{data.evaluation.preview.channels.join(" · ")} · {data.evaluation.preview.handlingLabel}</p>
                    {data.evaluation.preview.sections.map((section) => (
                      <div key={section.label} className="text-xs">
                        <p className="font-semibold">{section.label}</p>
                        <ul className="ml-4 list-disc text-muted-foreground">
                          {section.items.map((item, index) => <li key={index} className="break-words">{item}</li>)}
                        </ul>
                      </div>
                    ))}
                    {data.evaluation.preview.examples.map((example, index) => (
                      <div key={index} className="space-y-1 rounded-lg border border-border/50 bg-background p-2 text-xs">
                        <p className="break-words"><span className="font-semibold">Customer:</span> {example.customerMessage}</p>
                        <p className="break-words"><span className="font-semibold">Alex:</span> {example.idealReply}</p>
                        <div className="flex flex-wrap gap-1.5">
                          {example.checks.map((check) => (
                            <span key={check.channel} className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px]",
                              check.ok ? "border-emerald-300 text-emerald-700 dark:text-emerald-300" : "border-amber-300 text-amber-700 dark:text-amber-300")}
                            >
                              {check.ok ? <CheckCircle2 className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
                              {TRAINING_RULE_CHANNELS.find((option) => option.value === check.channel)?.label}: {check.ok ? "passes safety checks" : `would be blocked (${check.reasons.join(", ")})`}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                    <p className="text-[11px] text-muted-foreground">{data.evaluation.preview.safetyNotice}</p>
                    {data.evaluation.warnings.length > 0 && (
                      <ul aria-label="Rule warnings" className="ml-4 list-disc text-[11px] text-amber-700 dark:text-amber-300">
                        {data.evaluation.warnings.map((issue, index) => <li key={index}>{issue.message}</li>)}
                      </ul>
                    )}
                    {data.evaluation.errors.length > 0 && (
                      <ul aria-label="Rule errors" className="ml-4 list-disc text-[11px] text-red-600 dark:text-red-400">
                        {data.evaluation.errors.map((issue, index) => <li key={index}>{issue.message}</li>)}
                      </ul>
                    )}
                  </section>
                ) : (
                <section aria-labelledby="proposal-instruction" className="space-y-2">
                  <h3 id="proposal-instruction" className="text-xs font-bold">Instruction for Alex</h3>
                  <p className="whitespace-pre-wrap break-words rounded-xl border border-border/50 bg-muted/20 p-3 text-sm">{current?.spec?.instruction}</p>
                  {current?.originalAiMessageSnapshot && (
                    <div className="rounded-xl border border-dashed border-border/60 p-3 text-xs text-muted-foreground">
                      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide">Alex reply this was about</p>
                      <p className="whitespace-pre-wrap break-words">{current.originalAiMessageSnapshot}</p>
                    </div>
                  )}
                </section>
                )}

                {data.lastReview?.note && (
                  <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-xs">
                    <p className="font-semibold">Reviewer note{data.lastReview.byName ? ` from ${data.lastReview.byName}` : ""}</p>
                    <p className="mt-1 whitespace-pre-wrap break-words">{data.lastReview.note}</p>
                  </div>
                )}

                {data.status === "approved" && (
                  <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3 text-xs text-emerald-700 dark:text-emerald-300">
                    Approved by {data.approvedByName || "a reviewer"}. It is not active yet. Publishing comes in a later release.
                  </p>
                )}

                {canRevise && (
                  <section aria-labelledby="proposal-revise" className="space-y-2">
                    <h3 id="proposal-revise" className="text-xs font-bold">Revise your instruction</h3>
                    <Textarea aria-label="Revised instruction" value={revision} onChange={(event) => setRevision(event.target.value)} maxLength={800} rows={4} className="resize-none" />
                  </section>
                )}

                {canEditRule && (
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={openEditor} disabled={Boolean(busy)}>
                      {canReview && !authorCanChange ? "Edit during review" : "Edit rule"}
                    </Button>
                    {canSubmit && <ActionButton action="submit" busy={busy} onClick={run} disabled={Boolean(data.evaluation && !data.evaluation.readyToSubmit)} />}
                  </div>
                )}

                {(canReview || canReject || canWithdraw || canRevise) && (
                  <section aria-labelledby="proposal-actions" className="space-y-2">
                    <h3 id="proposal-actions" className="text-xs font-bold">{canRevise ? "What changed (optional)" : "Note"}</h3>
                    <Textarea aria-label={canRevise ? "What changed" : "Review note"} value={note} onChange={(event) => setNote(event.target.value)} maxLength={500} rows={2} className="resize-none" placeholder={canReview ? "Required when requesting changes or rejecting" : undefined} />
                    <div className="flex flex-wrap gap-2">
                      {canRevise && <ActionButton action="revise" busy={busy} onClick={run} disabled={!revision.trim()} />}
                      {canApprove && <ActionButton action="approve" busy={busy} onClick={run} />}
                      {canReview && <ActionButton action="request-changes" busy={busy} onClick={run} variant="outline" disabled={!note.trim()} />}
                      {canReject && <ActionButton action="reject" busy={busy} onClick={run} variant="outline" disabled={!note.trim()} />}
                      {canWithdraw && <ActionButton action="withdraw" busy={busy} onClick={run} variant="ghost" />}
                    </div>
                    {canReview && data.isMine && <p className="text-[11px] text-muted-foreground">You wrote this proposal, so another manager or admin needs to approve it.</p>}
                    {canReview && editedCurrent && <p className="text-[11px] text-muted-foreground">You edited the current version, so another manager or admin needs to approve it.</p>}
                  </section>
                )}

                {onTestVersion && onOpenResult && (
                  <ProposalTestsSection
                    getToken={getToken}
                    policyId={data.id}
                    currentVersion={data.currentVersion}
                    refreshKey={testsRefreshKey}
                    onTest={onTestVersion}
                    onOpenResult={onOpenResult}
                  />
                )}

                {data.versions.length > 1 && (
                  <section aria-labelledby="proposal-versions" className="space-y-2">
                    <h3 id="proposal-versions" className="text-xs font-bold">Earlier versions</h3>
                    <ol className="space-y-2">
                      {data.versions.slice(1).map((version) => (
                        <li key={version.version} className="rounded-xl border border-border/40 p-3 text-xs">
                          <p className="mb-1 text-[10px] text-muted-foreground">Version {version.version} · {version.createdByName || "Team member"} · {formatHubDate(version.createdAt)}</p>
                          {version.spec.title && <p className="font-semibold">{version.spec.title}</p>}
                          <p className="whitespace-pre-wrap break-words">{version.spec.instruction}</p>
                          {version.changeNote && <p className="mt-1 text-[10px] text-muted-foreground">Note: {version.changeNote}</p>}
                        </li>
                      ))}
                    </ol>
                  </section>
                )}

                <section aria-labelledby="proposal-history" className="space-y-2">
                  <h3 id="proposal-history" className="text-xs font-bold">History</h3>
                  <ol className="space-y-1.5">
                    {data.audit.map((entry) => (
                      <li key={entry.id} className="text-[11px] text-muted-foreground">
                        <span className="font-semibold text-foreground">{TRAINING_AUDIT_LABELS[entry.action] || entry.action}</span>
                        {" · "}{entry.actorName || "Team member"}{" · "}{formatHubDate(entry.createdAt)}
                        {entry.note ? ` — ${entry.note}` : ""}
                      </li>
                    ))}
                  </ol>
                </section>
              </>
            )}
          </HubState>
        </div>
      </SheetContent>
    </Sheet>
  )
}

function ActionButton({ action, busy, onClick, variant, disabled }: {
  action: Action
  busy: Action | null
  onClick: (action: Action) => void
  variant?: "outline" | "ghost"
  disabled?: boolean
}) {
  return (
    <Button size="sm" variant={variant} disabled={Boolean(busy) || disabled} onClick={() => onClick(action)}>
      {busy === action ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : ACTION_LABELS[action]}
    </Button>
  )
}
