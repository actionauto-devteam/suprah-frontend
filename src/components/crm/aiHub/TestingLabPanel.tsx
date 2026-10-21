"use client"

import * as React from "react"
import { AlertTriangle, ChevronLeft, ChevronRight, FlaskConical, History, Plus, ShieldAlert } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useLabRuns, useLabScenarios, useLabStatus, useTrainingStatus } from "@/hooks/useAiTraining"
import { TRAINING_RULE_CHANNELS } from "@/lib/aiTraining"
import { LAB_CHANNEL_LABELS, LAB_FICTIONAL_NOTICE, LAB_METHODS, labHandlingLabel, type LabScenario } from "@/lib/aiTrainingLab"
import { HubCard, HubState, formatHubDate } from "./ShadowStatusBadge"
import { LabResultDrawer, LabRunList } from "./LabResultView"
import { LabRunSheet, type LabRunTarget } from "./LabRunSheet"
import { LabScenarioDrawer } from "./LabScenarioDrawer"
import { LabScenarioEditor, type LabScenarioEditorTarget } from "./LabScenarioEditor"

type GetToken = () => Promise<string | null>

function Pager({ page, totalPages, onPage, label }: { page: number; totalPages: number; onPage: (page: number) => void; label: string }) {
  return (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" className="h-8" disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label={`Previous ${label} page`}><ChevronLeft className="h-3.5 w-3.5" /></Button>
      <Button variant="outline" size="sm" className="h-8" disabled={page >= totalPages} onClick={() => onPage(page + 1)} aria-label={`Next ${label} page`}><ChevronRight className="h-3.5 w-3.5" /></Button>
    </div>
  )
}

export function TestingLabPanel({ getToken }: { getToken: GetToken }) {
  const training = useTrainingStatus(getToken)
  const enabled = Boolean(training.data?.enabled)
  const lab = useLabStatus(getToken, enabled)
  const [archived, setArchived] = React.useState(false)
  const [channel, setChannel] = React.useState("")
  const [mine, setMine] = React.useState(false)
  const [scenarioPage, setScenarioPage] = React.useState(1)
  const [runPage, setRunPage] = React.useState(1)
  const scenarios = useLabScenarios(getToken, { archived, channel: channel || undefined, mine, page: scenarioPage }, enabled)
  const runs = useLabRuns(getToken, { page: runPage, limit: 10 }, enabled)
  const [editor, setEditor] = React.useState<LabScenarioEditorTarget | null>(null)
  const [openScenarioId, setOpenScenarioId] = React.useState<string | null>(null)
  const [runTarget, setRunTarget] = React.useState<LabRunTarget | null>(null)
  const [openRunId, setOpenRunId] = React.useState<string | null>(null)
  const [scenarioRefresh, setScenarioRefresh] = React.useState(0)

  const refreshLibrary = () => {
    scenarios.reload()
    lab.reload()
  }

  if (!training.data) {
    return <HubCard title="Testing Lab" icon={<FlaskConical className="h-4 w-4 text-primary" />}><HubState loading={training.loading} error={training.error} onRetry={training.reload}>{null}</HubState></HubCard>
  }

  if (!enabled) {
    return (
      <HubCard title="Testing Lab" icon={<FlaskConical className="h-4 w-4 text-primary" />}>
        <div role="status" className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-700 dark:text-amber-300">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>The Testing Lab is part of AI training, which is turned off{training.data.globalEnabled ? " for this organization" : " for this whole server"}.</span>
        </div>
      </HubCard>
    )
  }

  const status = lab.data
  const usedMethods = Object.values(LAB_METHODS)

  return (
    <div className="space-y-4">
      <HubCard
        title="Testing Lab"
        description={status?.canTestAllProposals
          ? "Try any training proposal in your organization against made-up customer scenarios. Checks run on this server without AI. Nothing is sent, and Alex does not change."
          : "Try your own training proposals against made-up customer scenarios. Checks run on this server without AI. Nothing is sent, and Alex does not change."}
        icon={<FlaskConical className="h-4 w-4 text-primary" />}
        action={(
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="outline" className="h-8" onClick={() => setEditor({ mode: "create" })}>
              <Plus className="mr-1 h-3.5 w-3.5" /> New scenario
            </Button>
            <Button size="sm" className="h-8" onClick={() => setRunTarget({})}>
              <FlaskConical className="mr-1 h-3.5 w-3.5" /> Run a test
            </Button>
          </div>
        )}
      >
        <div className="space-y-3">
          <div role="note" className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-[11px] text-amber-900 dark:text-amber-100">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
            <span><span className="font-semibold">Fictional data only.</span> {LAB_FICTIONAL_NOTICE}</span>
          </div>

          <details className="rounded-lg border border-border/50 p-3 text-[11px] text-muted-foreground">
            <summary className="cursor-pointer font-semibold text-foreground">How to read results</summary>
            <ul className="mt-2 space-y-1">
              <li>Results are advisory. They never approve, block or publish a rule, and they are not required for approval.</li>
              <li>A rules-only test is always incomplete, because no reply was checked. Incomplete is never a pass.</li>
              {usedMethods.map((method) => <li key={method.label}><span className="font-semibold text-foreground">{method.label}:</span> {method.description}</li>)}
              <li>AI simulation is not available yet, so no result shows what Alex would actually write.</li>
              {status && <li>Each result is saved exactly as it ran, can&apos;t be edited, and is deleted automatically after {status.retentionDays} days. Engine {status.engineVersion}.</li>}
            </ul>
          </details>

          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            <label className="sr-only" htmlFor="lab-filter-archived">Scenario state</label>
            <select id="lab-filter-archived" className="h-9 w-full rounded-lg border border-input bg-background px-2.5 text-xs sm:w-auto" value={archived ? "archived" : "active"}
              onChange={(event) => { setArchived(event.target.value === "archived"); setScenarioPage(1) }}
            >
              <option value="active">Active scenarios</option>
              <option value="archived">Archived scenarios</option>
            </select>
            <label className="sr-only" htmlFor="lab-filter-channel">Channel</label>
            <select id="lab-filter-channel" className="h-9 w-full rounded-lg border border-input bg-background px-2.5 text-xs sm:w-auto" value={channel}
              onChange={(event) => { setChannel(event.target.value); setScenarioPage(1) }}
            >
              <option value="">All channels</option>
              {TRAINING_RULE_CHANNELS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <input type="checkbox" checked={mine} onChange={(event) => { setMine(event.target.checked); setScenarioPage(1) }} />
              Only mine
            </label>
            {status && (
              <span className="text-[11px] text-muted-foreground sm:ml-auto">{status.scenarios.active} of {status.scenarios.activeLimit} active</span>
            )}
          </div>

          <HubState
            loading={scenarios.loading}
            error={scenarios.error}
            onRetry={scenarios.reload}
            empty={scenarios.data && !scenarios.data.scenarios.length
              ? (archived ? "No archived scenarios." : "No scenarios yet. Use New scenario to add a made-up customer situation.")
              : false}
          >
            {scenarios.data && (
              <>
                <ul aria-label="Scenarios" className="space-y-2">
                  {scenarios.data.scenarios.map((scenario: LabScenario) => (
                    <li key={scenario.id}>
                      <button
                        type="button"
                        onClick={() => setOpenScenarioId(scenario.id)}
                        className="w-full rounded-xl border border-border/40 p-3 text-left transition-colors hover:bg-muted/40 focus-visible:outline-2 focus-visible:outline-primary"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full border border-border/60 px-2 py-0.5 text-[10px] font-semibold">{LAB_CHANNEL_LABELS[scenario.channel] || scenario.channel}</span>
                          <span className="min-w-0 flex-1 truncate text-xs font-semibold">{scenario.title}</span>
                          <span className="text-[10px] text-muted-foreground">{formatHubDate(scenario.updatedAt)}</span>
                        </div>
                        <p className="mt-1.5 line-clamp-2 break-words text-xs text-muted-foreground">{scenario.message}</p>
                        <p className="mt-1 text-[10px] text-muted-foreground/80">
                          Expects {labHandlingLabel(scenario.expectation.handling)} · {scenario.createdBy?.name || "Team member"}{scenario.isMine ? " (you)" : ""} · revision {scenario.revision}
                        </p>
                      </button>
                    </li>
                  ))}
                </ul>
                <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span>{scenarios.data.total} scenario{scenarios.data.total === 1 ? "" : "s"} · page {scenarios.data.page} of {scenarios.data.totalPages}</span>
                  <Pager page={scenarioPage} totalPages={scenarios.data.totalPages} onPage={setScenarioPage} label="scenario" />
                </div>
              </>
            )}
          </HubState>
        </div>
      </HubCard>

      <HubCard
        title="Recent results"
        description={status?.canTestAllProposals ? "Results for every proposal in your organization." : "Results for your own proposals."}
        icon={<History className="h-4 w-4 text-primary" />}
      >
        <HubState
          loading={runs.loading}
          error={runs.error}
          onRetry={runs.reload}
          empty={runs.data && !runs.data.runs.length ? "No test results yet." : false}
        >
          {runs.data && (
            <>
              <LabRunList runs={runs.data.runs} onOpen={setOpenRunId} />
              <div className="mt-4 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                <span>{runs.data.total} result{runs.data.total === 1 ? "" : "s"} · page {runs.data.page} of {runs.data.totalPages}</span>
                <Pager page={runPage} totalPages={runs.data.totalPages} onPage={setRunPage} label="results" />
              </div>
            </>
          )}
        </HubState>
      </HubCard>

      <LabScenarioEditor
        target={editor}
        getToken={getToken}
        onClose={() => setEditor(null)}
        onSaved={(scenario) => {
          setEditor(null)
          refreshLibrary()
          setOpenScenarioId(scenario.id)
          setScenarioRefresh((key) => key + 1)
        }}
      />
      <LabScenarioDrawer
        scenarioId={openScenarioId}
        getToken={getToken}
        refreshKey={scenarioRefresh}
        onClose={() => setOpenScenarioId(null)}
        onEdit={(scenario) => setEditor({ mode: "edit", scenario })}
        onTest={(scenario) => setRunTarget({ scenarios: [scenario] })}
        onOpenResult={setOpenRunId}
        onChanged={refreshLibrary}
      />
      <LabRunSheet
        target={runTarget}
        getToken={getToken}
        onClose={() => setRunTarget(null)}
        onRan={() => {
          runs.reload()
          setScenarioRefresh((key) => key + 1)
        }}
      />
      <LabResultDrawer runId={openRunId} getToken={getToken} onClose={() => setOpenRunId(null)} />
    </div>
  )
}
