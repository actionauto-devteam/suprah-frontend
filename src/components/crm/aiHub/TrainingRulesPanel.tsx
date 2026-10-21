"use client"

import * as React from "react"
import { AlertTriangle, BookOpen, ChevronLeft, ChevronRight, GraduationCap, Loader2, Plus } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { apiClient } from "@/lib/api-client"
import { trainingErrorMessage, trainingRequest, useTrainingProposals, useTrainingStatus } from "@/hooks/useAiTraining"
import { TRAINING_RULE_HANDLING, TRAINING_SOURCE_LABELS, TRAINING_STATUS_LABELS, type TrainingStatus, type TrainingStatusInfo } from "@/lib/aiTraining"
import { HubCard, HubState, formatHubDate } from "./ShadowStatusBadge"
import { TrainingProposalDrawer, TrainingStatusBadge } from "./TrainingProposalDrawer"
import { TrainingRuleEditor, type TrainingRuleEditorTarget } from "./TrainingRuleEditor"
import { LabRunSheet, type LabRunTarget } from "./LabRunSheet"
import { LabResultDrawer } from "./LabResultView"

const FILTER_STATUSES: TrainingStatus[] = ["draft", "in_review", "changes_requested", "approved", "rejected", "withdrawn"]

interface LegacyRule {
  id: string
  instruction: string
  status: string
  createdByName?: string
  updatedAt?: string
  usageCount?: number
}

function LegacyCoaching({ getToken }: { getToken: () => Promise<string | null> }) {
  const [rules, setRules] = React.useState<LegacyRule[] | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const getTokenRef = React.useRef(getToken)

  React.useEffect(() => {
    getTokenRef.current = getToken
  }, [getToken])

  React.useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const token = await getTokenRef.current()
        const [active, disabled] = await Promise.all(["active", "disabled"].map((status) =>
          apiClient.get("/api/crm/ai-coaching", { headers: { Authorization: `Bearer ${token}` }, params: { status } })))
        const rows = [active, disabled].flatMap((res) => {
          const data = res.data?.data?.data || res.data?.data || []
          return Array.isArray(data) ? data : []
        })
        if (!cancelled) setRules(rows)
      } catch (err) {
        if (!cancelled) setError(trainingErrorMessage(err, "Could not load legacy coaching"))
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <HubCard
      title="Legacy coaching"
      description="Coaching saved before training proposals. Alex still uses the active ones. Read-only here; managers can disable them from the conversation Coach button."
      icon={<BookOpen className="h-4 w-4 text-primary" />}
    >
      <HubState loading={!rules && !error} error={error} empty={rules && !rules.length ? "No legacy coaching." : false}>
        <ul aria-label="Legacy coaching rules" className="space-y-2">
          {rules?.map((rule) => (
            <li key={rule.id} className="rounded-xl border border-border/40 p-3">
              <div className="mb-1 flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
                <span className={rule.status === "active"
                  ? "rounded-full border border-emerald-300 bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-700 dark:border-emerald-400/40 dark:bg-emerald-400/10 dark:text-emerald-300"
                  : "rounded-full border border-slate-300 bg-slate-100 px-2 py-0.5 font-semibold text-slate-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300"}
                >
                  {rule.status === "active" ? "Active · used by Alex" : "Disabled"}
                </span>
                <span>{rule.createdByName || "Team member"}</span>
                <span className="ml-auto">{formatHubDate(rule.updatedAt)}</span>
              </div>
              <p className="whitespace-pre-wrap break-words text-xs">{rule.instruction}</p>
            </li>
          ))}
        </ul>
      </HubState>
    </HubCard>
  )
}

function TrainingSwitch({ status, getToken, onSaved }: { status: TrainingStatusInfo; getToken: () => Promise<string | null>; onSaved: () => void }) {
  const [saving, setSaving] = React.useState(false)
  const toggle = async (enabled: boolean) => {
    setSaving(true)
    try {
      await trainingRequest(getToken, "patch", "/api/crm/ai-training/settings", { enabled })
      toast.success(enabled ? "AI training turned on" : "AI training turned off")
      onSaved()
    } catch (err) {
      toast.error("Save failed", { description: trainingErrorMessage(err, "Please try again.") })
    } finally {
      setSaving(false)
    }
  }
  return (
    <div className="flex items-center gap-2">
      {saving && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
      <Switch checked={status.orgEnabled} disabled={!status.canManageSettings || saving} onCheckedChange={toggle} aria-label="AI training" />
    </div>
  )
}

export function TrainingRulesPanel({ getToken }: { getToken: () => Promise<string | null> }) {
  const status = useTrainingStatus(getToken)
  const info = status.data
  const [statusFilter, setStatusFilter] = React.useState("")
  const [mine, setMine] = React.useState(false)
  const [page, setPage] = React.useState(1)
  const [openId, setOpenId] = React.useState<string | null>(null)
  const [editor, setEditor] = React.useState<TrainingRuleEditorTarget | null>(null)
  const [drawerRefresh, setDrawerRefresh] = React.useState(0)
  const [runTarget, setRunTarget] = React.useState<LabRunTarget | null>(null)
  const [openRunId, setOpenRunId] = React.useState<string | null>(null)
  const [testsRefresh, setTestsRefresh] = React.useState(0)
  const proposals = useTrainingProposals(getToken, { status: statusFilter || undefined, mine, page }, Boolean(info?.enabled))

  if (!info) {
    return <HubCard title="Training rules" icon={<GraduationCap className="h-4 w-4 text-primary" />}><HubState loading={status.loading} error={status.error} onRetry={status.reload}>{null}</HubState></HubCard>
  }

  return (
    <div className="space-y-4">
      <HubCard
        title="Training rules"
        description={info.canReview
          ? "Training rules and coaching ideas from your team wait here for review. Nothing changes Alex until it is approved and published."
          : "Propose how Alex should handle common customer questions. A manager reviews them, and nothing changes Alex until it is approved and published."}
        icon={<GraduationCap className="h-4 w-4 text-primary" />}
        action={(
          <div className="flex items-center gap-3">
            {info.enabled && (
              <Button size="sm" className="h-8" onClick={() => setEditor({ mode: "create" })}>
                <Plus className="mr-1 h-3.5 w-3.5" /> New rule
              </Button>
            )}
            {info.canManageSettings && <TrainingSwitch status={info} getToken={getToken} onSaved={status.reload} />}
          </div>
        )}
      >
        {!info.enabled ? (
          <div role="status" className="space-y-2 text-xs text-muted-foreground">
            <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-amber-700 dark:text-amber-300">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>
                {!info.globalEnabled
                  ? "AI training is turned off for this whole server."
                  : "AI training is turned off for this organization."}
                {info.canManageSettings && info.globalEnabled ? " Use the switch above to turn it on." : ""}
              </span>
            </div>
            {info.canReview && Boolean(info.pendingReviewCount) && (
              <p>{info.pendingReviewCount} coaching idea{info.pendingReviewCount === 1 ? " is" : "s are"} waiting for review and will appear here once training is on. They are not changing Alex.</p>
            )}
          </div>
        ) : (
          <>
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
              <label className="sr-only" htmlFor="training-filter-status">Status</label>
              <select
                id="training-filter-status"
                className="h-9 w-full rounded-lg border border-input bg-background px-2.5 text-xs sm:w-auto"
                value={statusFilter}
                onChange={(event) => { setStatusFilter(event.target.value); setPage(1) }}
              >
                <option value="">All statuses</option>
                {FILTER_STATUSES.map((value) => <option key={value} value={value}>{TRAINING_STATUS_LABELS[value]}</option>)}
              </select>
              {info.canReview && (
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  <input type="checkbox" checked={mine} onChange={(event) => { setMine(event.target.checked); setPage(1) }} />
                  Only mine
                </label>
              )}
              {info.canReview && Boolean(info.pendingReviewCount) && (
                <span className="text-[11px] font-semibold text-sky-700 dark:text-sky-300 sm:ml-auto">{info.pendingReviewCount} waiting for review</span>
              )}
            </div>
            <HubState
              loading={proposals.loading}
              error={proposals.error}
              onRetry={proposals.reload}
              empty={proposals.data && !proposals.data.proposals.length
                ? (info.canReview ? "No proposals yet. Use New rule, or coaching from reps will show up here." : "You have not proposed any rules yet. Use New rule, or Coach your AI on an Alex reply.")
                : false}
            >
              {proposals.data && (
                <>
                  <ul aria-label="Training proposals" className="space-y-2">
                    {proposals.data.proposals.map((proposal) => (
                      <li key={proposal.id}>
                        <button
                          type="button"
                          onClick={() => setOpenId(proposal.id)}
                          className="w-full rounded-xl border border-border/40 p-3 text-left transition-colors hover:bg-muted/40 focus-visible:outline-2 focus-visible:outline-primary"
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <TrainingStatusBadge status={proposal.status} />
                            <span className="min-w-0 flex-1 truncate text-xs font-semibold">{proposal.title}</span>
                            <span className="text-[10px] text-muted-foreground">{formatHubDate(proposal.updatedAt)}</span>
                          </div>
                          {proposal.intent && (
                            <p className="mt-1.5 break-words text-xs">
                              When a customer {proposal.intent}
                              {proposal.handling ? ` · ${TRAINING_RULE_HANDLING.find((option) => option.value === proposal.handling)?.label}` : ""}
                            </p>
                          )}
                          <p className="mt-1.5 line-clamp-2 break-words text-xs text-muted-foreground">{proposal.instruction || proposal.title}</p>
                          <p className="mt-1 text-[10px] text-muted-foreground/80">
                            {proposal.createdBy?.name || "Team member"}{proposal.isMine ? " (you)" : ""} · {TRAINING_SOURCE_LABELS[proposal.source] || proposal.source}
                          </p>
                        </button>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-4 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span>{proposals.data.total} proposal{proposals.data.total === 1 ? "" : "s"} · page {proposals.data.page} of {proposals.data.totalPages}</span>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="h-8" disabled={page <= 1} onClick={() => setPage(page - 1)} aria-label="Previous page"><ChevronLeft className="h-3.5 w-3.5" /></Button>
                      <Button variant="outline" size="sm" className="h-8" disabled={page >= proposals.data.totalPages} onClick={() => setPage(page + 1)} aria-label="Next page"><ChevronRight className="h-3.5 w-3.5" /></Button>
                    </div>
                  </div>
                </>
              )}
            </HubState>
          </>
        )}
      </HubCard>

      {info.canReview && <LegacyCoaching getToken={getToken} />}

      {info.enabled && (
        <TrainingProposalDrawer
          proposalId={openId}
          status={info}
          getToken={getToken}
          onClose={() => setOpenId(null)}
          onChanged={() => { proposals.reload(); status.reload() }}
          onEdit={setEditor}
          refreshKey={drawerRefresh}
          onTestVersion={(policyId, version) => setRunTarget({ policyId, version })}
          onOpenResult={setOpenRunId}
          testsRefreshKey={testsRefresh}
        />
      )}

      {info.enabled && (
        <LabRunSheet
          target={runTarget}
          getToken={getToken}
          onClose={() => setRunTarget(null)}
          onRan={() => setTestsRefresh((key) => key + 1)}
        />
      )}

      {info.enabled && <LabResultDrawer runId={openRunId} getToken={getToken} onClose={() => setOpenRunId(null)} />}

      {info.enabled && (
        <TrainingRuleEditor
          target={editor}
          getToken={getToken}
          onClose={() => setEditor(null)}
          onSaved={(detail) => {
            setEditor(null)
            setOpenId(detail.id)
            setDrawerRefresh((key) => key + 1)
            proposals.reload()
            status.reload()
          }}
        />
      )}
    </div>
  )
}
