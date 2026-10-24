"use client"

import * as React from "react"
import { AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight, FlaskConical, Lock, MinusCircle, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"
import { useLabRun, useLabRuns } from "@/hooks/useAiTraining"
import { TRAINING_STATUS_LABELS, type TrainingStatus } from "@/lib/aiTraining"
import {
  LAB_CHANNEL_LABELS,
  LAB_CHECK_GROUPS,
  LAB_CHECK_STATUS_LABELS,
  LAB_CHECK_STATUS_STYLES,
  LAB_METHODS,
  LAB_MODE_LABELS,
  LAB_VERDICTS,
  labRetentionLabel,
  type LabCheck,
  type LabCheckStatus,
  type LabRun,
  type LabVerdict,
} from "@/lib/aiTrainingLab"
import { HubState, formatHubDate } from "./ShadowStatusBadge"

type GetToken = () => Promise<string | null>

const STATUS_ICONS: Record<LabCheckStatus, React.ComponentType<{ className?: string }>> = {
  pass: CheckCircle2,
  fail: XCircle,
  warning: AlertTriangle,
  not_evaluated: MinusCircle,
}

export function LabVerdictBadge({ verdict, className }: { verdict: LabVerdict; className?: string }) {
  const info = LAB_VERDICTS[verdict] || LAB_VERDICTS.incomplete
  return (
    <span className={cn("inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold", info.style, className)}>
      {info.label}
    </span>
  )
}

function CheckRow({ check }: { check: LabCheck }) {
  const Icon = STATUS_ICONS[check.status] || MinusCircle
  const method = LAB_METHODS[check.method]
  return (
    <li className={cn("rounded-lg border border-border/50 p-2.5", check.optional && check.status === "not_evaluated" && "opacity-70")}>
      <div className="flex flex-wrap items-center gap-1.5">
        <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold", LAB_CHECK_STATUS_STYLES[check.status])}>
          <Icon className="h-3 w-3" /> {LAB_CHECK_STATUS_LABELS[check.status] || check.status}
        </span>
        <span className="min-w-0 flex-1 text-xs font-semibold">{check.label}</span>
        {method && (
          <span title={method.description} className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[10px]", method.style)}>
            {method.label}
          </span>
        )}
      </div>
      <p className="mt-1 break-words text-[11px] text-muted-foreground">{check.message}</p>
      {check.optional && check.status === "not_evaluated" && <p className="mt-0.5 text-[10px] text-muted-foreground/80">Optional here, so it does not make the result incomplete.</p>}
    </li>
  )
}

function Meta({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="break-words text-xs">{children}</dd>
    </div>
  )
}

export function LabResultView({ run }: { run: LabRun }) {
  const verdict = LAB_VERDICTS[run.verdict] || LAB_VERDICTS.incomplete
  const usedMethods = Array.from(new Set(run.checks.filter((check) => check.status !== "not_evaluated").map((check) => check.method)))
  const groups = LAB_CHECK_GROUPS
    .map((group) => ({ ...group, checks: run.checks.filter((check) => check.group === group.value) }))
    .filter((group) => group.checks.length)
  const otherChecks = run.checks.filter((check) => !LAB_CHECK_GROUPS.some((group) => group.value === check.group))

  return (
    <div className="space-y-4">
      <div className={cn("rounded-xl border p-3", verdict.style)}>
        <div className="flex flex-wrap items-center gap-2">
          <LabVerdictBadge verdict={run.verdict} />
          <span className="text-[11px]">
            {run.counts.pass} pass · {run.counts.fail} fail · {run.counts.warning} warning · {run.counts.notEvaluated} not checked
          </span>
        </div>
        <p className="mt-1.5 text-xs">{verdict.description}</p>
        {run.includesApproximate && (
          <p className="mt-1 text-[11px]">Some checks use approximate word matching or the local check, so treat them as hints, not proof.</p>
        )}
        <p className="mt-1 text-[11px]">Advisory only. This result does not approve, block or change anything.</p>
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-xl border border-border/50 bg-muted/20 p-3 sm:grid-cols-3">
        <Meta label="Proposal">{run.policyTitle} · version {run.policyVersion}</Meta>
        <Meta label="Proposal status then">{TRAINING_STATUS_LABELS[run.policyStatusAtRun as TrainingStatus] || run.policyStatusAtRun}</Meta>
        <Meta label="Scenario">{run.scenarioTitle || "Scenario"} · revision {run.scenarioRevision}</Meta>
        <Meta label="Channel">{LAB_CHANNEL_LABELS[run.channel] || run.channel}</Meta>
        <Meta label="Mode">{LAB_MODE_LABELS[run.mode] || run.mode}</Meta>
        <Meta label="Engine">{run.engineVersion}</Meta>
        <Meta label="Run by">{run.runByName || "Team member"}</Meta>
        <Meta label="When">{formatHubDate(run.createdAt)}</Meta>
        <Meta label="Record"><span className="inline-flex items-center gap-1"><Lock className="h-3 w-3" /> {labRetentionLabel(run.expiresAt)}</span></Meta>
      </dl>

      {run.scenarioSnapshot?.message && (
        <section aria-label="Scenario message" className="space-y-1 rounded-xl border border-border/50 p-3 text-xs">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Customer message</p>
          <p className="whitespace-pre-wrap break-words">{run.scenarioSnapshot.message}</p>
        </section>
      )}

      {run.reply?.text && (
        <section aria-label="Sample reply" className="space-y-1 rounded-xl border border-border/50 p-3 text-xs">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Sample reply · {run.reply.source === "rule_example" ? `rule example ${(run.reply.exampleIndex ?? 0) + 1}` : "written for this test"}
          </p>
          <p className="whitespace-pre-wrap break-words">{run.reply.text}</p>
          <p className="text-[10px] text-muted-foreground">This is the reply that was checked. The AI Agent did not write it.</p>
        </section>
      )}

      {[...groups, ...(otherChecks.length ? [{ value: "other", label: "Other checks", checks: otherChecks }] : [])].map((group) => (
        <section key={group.value} aria-label={group.label} className="space-y-2">
          <h3 className="text-xs font-bold">{group.label}</h3>
          <ul className="space-y-1.5">
            {group.checks.map((check) => <CheckRow key={check.id} check={check} />)}
          </ul>
        </section>
      ))}

      {usedMethods.length > 0 && (
        <section aria-label="How these checks work" className="space-y-1 rounded-xl border border-dashed border-border/60 p-3">
          <h3 className="text-[11px] font-bold">How these checks work</h3>
          <ul className="space-y-0.5 text-[11px] text-muted-foreground">
            {usedMethods.map((method) => LAB_METHODS[method] && (
              <li key={method}><span className="font-semibold text-foreground">{LAB_METHODS[method].label}:</span> {LAB_METHODS[method].description}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

export function LabResultDrawer({ runId, getToken, onClose }: { runId: string | null; getToken: GetToken; onClose: () => void }) {
  const { data, loading, error, reload } = useLabRun(getToken, runId)
  return (
    <Sheet open={Boolean(runId)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full overflow-y-auto p-0 sm:max-w-xl">
        <SheetHeader className="border-b border-border/40 px-4 py-4 sm:px-6">
          <SheetTitle className="pr-10 text-base">Test result</SheetTitle>
          <SheetDescription className="text-xs">Shown exactly as it was saved. Later edits to the proposal or scenario never change it.</SheetDescription>
        </SheetHeader>
        <div className="px-4 py-5 sm:px-6">
          <HubState loading={loading} error={error} onRetry={reload}>
            {data && <LabResultView run={data} />}
          </HubState>
        </div>
      </SheetContent>
    </Sheet>
  )
}

export function LabRunList({ runs, onOpen, showProposal = true }: { runs: LabRun[]; onOpen: (id: string) => void; showProposal?: boolean }) {
  return (
    <ul aria-label="Test results" className="space-y-2">
      {runs.map((run) => (
        <li key={run.id}>
          <button
            type="button"
            onClick={() => onOpen(run.id)}
            className="w-full rounded-xl border border-border/40 p-3 text-left transition-colors hover:bg-muted/40 focus-visible:outline-2 focus-visible:outline-primary"
          >
            <div className="flex flex-wrap items-center gap-2">
              <LabVerdictBadge verdict={run.verdict} />
              <span className="min-w-0 flex-1 truncate text-xs font-semibold">{run.scenarioTitle || "Scenario"}</span>
              <span className="text-[10px] text-muted-foreground">{formatHubDate(run.createdAt)}</span>
            </div>
            <p className="mt-1 truncate text-[11px] text-muted-foreground">
              {showProposal ? `${run.policyTitle} · v${run.policyVersion} · ` : `Version ${run.policyVersion} · `}
              {LAB_MODE_LABELS[run.mode] || run.mode} · {LAB_CHANNEL_LABELS[run.channel] || run.channel}
              {run.includesApproximate ? " · includes approximate checks" : ""}
            </p>
          </button>
        </li>
      ))}
    </ul>
  )
}

export function ProposalTestsSection({ getToken, policyId, currentVersion, refreshKey, onTest, onOpenResult }: {
  getToken: GetToken
  policyId: string
  currentVersion: number
  refreshKey?: number
  onTest: (policyId: string, version: number) => void
  onOpenResult: (runId: string) => void
}) {
  const [page, setPage] = React.useState(1)
  const runs = useLabRuns(getToken, { policyId, page, limit: 5 })
  const { reload } = runs

  React.useEffect(() => {
    setPage(1)
  }, [policyId])

  React.useEffect(() => {
    if (refreshKey) reload()
  }, [refreshKey, reload])

  return (
    <section aria-labelledby="proposal-tests" className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <h3 id="proposal-tests" className="text-xs font-bold">Tests</h3>
        <span className="text-[10px] text-muted-foreground">Advisory. Not required for approval.</span>
        <Button size="sm" variant="outline" className="ml-auto h-7" onClick={() => onTest(policyId, currentVersion)}>
          <FlaskConical className="mr-1 h-3.5 w-3.5" /> Test this version
        </Button>
      </div>
      <HubState
        loading={runs.loading}
        error={runs.error}
        onRetry={runs.reload}
        empty={runs.data && !runs.data.runs.length ? "No tests yet. Try this proposal against a made-up scenario." : false}
      >
        {runs.data && (
          <>
            <LabRunList runs={runs.data.runs} onOpen={onOpenResult} showProposal={false} />
            {runs.data.totalPages > 1 && (
              <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                <span>Page {runs.data.page} of {runs.data.totalPages}</span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="h-7" disabled={page <= 1} onClick={() => setPage(page - 1)} aria-label="Previous tests"><ChevronLeft className="h-3.5 w-3.5" /></Button>
                  <Button variant="outline" size="sm" className="h-7" disabled={page >= runs.data.totalPages} onClick={() => setPage(page + 1)} aria-label="More tests"><ChevronRight className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
            )}
          </>
        )}
      </HubState>
    </section>
  )
}
