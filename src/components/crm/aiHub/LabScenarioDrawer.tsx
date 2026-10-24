"use client"

import * as React from "react"
import { Archive, ArchiveRestore, FlaskConical, Loader2, Pencil } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { trainingErrorMessage, trainingRequest, useLabRuns, useLabScenario } from "@/hooks/useAiTraining"
import { LAB_CHANNEL_LABELS, LAB_REVISION_ACTIONS, LAB_TURN_AUTHORS, labHandlingLabel, type LabScenario } from "@/lib/aiTrainingLab"
import { HubState, formatHubDate } from "./ShadowStatusBadge"
import { LabRunList } from "./LabResultView"

type GetToken = () => Promise<string | null>

function List({ label, items }: { label: string; items: string[] }) {
  if (!items.length) return null
  return (
    <div className="text-xs">
      <p className="font-semibold">{label}</p>
      <ul className="ml-4 list-disc text-muted-foreground">
        {items.map((item, index) => <li key={index} className="break-words">{item}</li>)}
      </ul>
    </div>
  )
}

export function LabScenarioDrawer({ scenarioId, getToken, refreshKey, onClose, onEdit, onTest, onOpenResult, onChanged }: {
  scenarioId: string | null
  getToken: GetToken
  refreshKey?: number
  onClose: () => void
  onEdit: (scenario: LabScenario) => void
  onTest: (scenario: { id: string; title: string }) => void
  onOpenResult: (runId: string) => void
  onChanged: () => void
}) {
  const { data, setData, loading, error, reload } = useLabScenario(getToken, scenarioId)
  const runs = useLabRuns(getToken, { scenarioId: scenarioId || undefined, limit: 5 }, Boolean(scenarioId))
  const [busy, setBusy] = React.useState(false)
  const reloadRuns = runs.reload

  React.useEffect(() => {
    if (refreshKey) {
      reload()
      reloadRuns()
    }
  }, [refreshKey, reload, reloadRuns])

  const scenario = data?.scenario

  const toggleArchive = async () => {
    if (!scenario) return
    setBusy(true)
    try {
      const action = scenario.archived ? "restore" : "archive"
      const result = await trainingRequest<{ scenario: LabScenario }>(getToken, "post", `/api/crm/ai-training/lab/scenarios/${scenario.id}/${action}`, { expectedRevision: scenario.revision })
      toast.success(scenario.archived ? "Scenario restored" : "Scenario archived")
      setData((current) => (current ? { ...current, scenario: result.scenario } : current))
      reload()
      onChanged()
    } catch (err) {
      toast.error("Could not change the scenario", { description: trainingErrorMessage(err, "Please try again.") })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet open={Boolean(scenarioId)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full overflow-y-auto p-0 sm:max-w-xl">
        <SheetHeader className="border-b border-border/40 px-4 py-4 sm:px-6">
          <SheetTitle className="pr-10 text-base">Scenario</SheetTitle>
          <SheetDescription className="text-xs">A made-up situation shared with your organization. Every change is kept in the history.</SheetDescription>
        </SheetHeader>
        <div className="space-y-5 px-4 py-5 sm:px-6">
          <HubState loading={loading} error={error} onRetry={reload}>
            {scenario && data && (
              <>
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="min-w-0 flex-1 break-words text-sm font-semibold">{scenario.title}</h3>
                    {scenario.archived && <span className="rounded-full border border-slate-300 bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300">Archived</span>}
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {LAB_CHANNEL_LABELS[scenario.channel] || scenario.channel} · revision {scenario.revision} · by {scenario.createdBy?.name || "Team member"}{scenario.isMine ? " (you)" : ""}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {!scenario.archived && (
                    <Button size="sm" onClick={() => onTest({ id: scenario.id, title: scenario.title })}>
                      <FlaskConical className="mr-1 h-3.5 w-3.5" /> Test a proposal
                    </Button>
                  )}
                  {scenario.canManage && !scenario.archived && (
                    <Button size="sm" variant="outline" onClick={() => onEdit(scenario)} disabled={busy}>
                      <Pencil className="mr-1 h-3.5 w-3.5" /> Edit
                    </Button>
                  )}
                  {scenario.canManage && (
                    <Button size="sm" variant="ghost" onClick={toggleArchive} disabled={busy}>
                      {busy ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : scenario.archived ? <ArchiveRestore className="mr-1 h-3.5 w-3.5" /> : <Archive className="mr-1 h-3.5 w-3.5" />}
                      {scenario.archived ? "Restore" : "Archive"}
                    </Button>
                  )}
                </div>
                {!scenario.canManage && <p className="text-[11px] text-muted-foreground">Only the author or a manager can edit this scenario.</p>}

                <section aria-label="Conversation" className="space-y-2 rounded-xl border border-border/50 bg-muted/20 p-3 text-xs">
                  {(scenario.customerName || scenario.vehicleInterest) && (
                    <p className="text-[11px] text-muted-foreground">
                      {[scenario.customerName, scenario.vehicleInterest].filter(Boolean).join(" · ")}
                    </p>
                  )}
                  {scenario.turns.map((turn, index) => (
                    <p key={index} className="break-words">
                      <span className="font-semibold">{LAB_TURN_AUTHORS.find((option) => option.value === turn.from)?.label || turn.from}:</span> {turn.body}
                    </p>
                  ))}
                  <p className="break-words rounded-lg border border-border/50 bg-background p-2"><span className="font-semibold">Customer (tested):</span> {scenario.message}</p>
                  {(scenario.flags.hasUpcomingAppointment || scenario.flags.previouslyOptedOut) && (
                    <p className="text-[11px] text-muted-foreground">
                      {[scenario.flags.hasUpcomingAppointment && "Has an upcoming appointment", scenario.flags.previouslyOptedOut && "Opted out of SMS earlier"].filter(Boolean).join(" · ")}
                    </p>
                  )}
                </section>

                <section aria-label="Expectation" className="space-y-2">
                  <p className="text-xs"><span className="font-semibold">Should happen:</span> {labHandlingLabel(scenario.expectation.handling)}</p>
                  <List label="AI Agent must ask" items={scenario.expectation.mustAsk} />
                  <List label="Reply must include" items={scenario.expectation.mustInclude} />
                  <List label="Reply must avoid" items={scenario.expectation.mustAvoid} />
                  {scenario.expectation.notes && <p className="break-words text-[11px] text-muted-foreground">Notes: {scenario.expectation.notes}</p>}
                  {scenario.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {scenario.tags.map((tag) => <span key={tag} className="rounded-full border border-border/60 px-2 py-0.5 text-[10px] text-muted-foreground">{tag}</span>)}
                    </div>
                  )}
                </section>

                <section aria-labelledby="scenario-results" className="space-y-2">
                  <h3 id="scenario-results" className="text-xs font-bold">Recent results</h3>
                  <HubState
                    loading={runs.loading}
                    error={runs.error}
                    onRetry={runs.reload}
                    empty={runs.data && !runs.data.runs.length ? "No results you can see for this scenario yet." : false}
                  >
                    {runs.data && <LabRunList runs={runs.data.runs} onOpen={onOpenResult} />}
                  </HubState>
                </section>

                <section aria-labelledby="scenario-history" className="space-y-2">
                  <h3 id="scenario-history" className="text-xs font-bold">History</h3>
                  <ol className="space-y-1.5">
                    {data.revisions.map((revision) => (
                      <li key={revision.revision} className="text-[11px] text-muted-foreground">
                        <span className="font-semibold text-foreground">Revision {revision.revision} · {LAB_REVISION_ACTIONS[revision.action] || revision.action}</span>
                        {" · "}{revision.createdByName || "Team member"}{" · "}{formatHubDate(revision.createdAt)}
                        {revision.changeNote ? ` — ${revision.changeNote}` : ""}
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
