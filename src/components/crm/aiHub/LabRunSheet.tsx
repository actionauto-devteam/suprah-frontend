"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight, Info, Loader2, Search, ShieldAlert, X } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"
import { trainingErrorMessage, trainingRequest, useLabScenarios, useTrainingProposal, useTrainingProposalOptions } from "@/hooks/useAiTraining"
import { TRAINING_STATUS_LABELS, type TrainingStatus } from "@/lib/aiTraining"
import {
  LAB_CHANNEL_LABELS,
  LAB_FICTIONAL_NOTICE,
  LAB_SCENARIO_LIMITS as L,
  labHandlingLabel,
  type LabIssue,
  type LabRun,
  type LabRunMode,
} from "@/lib/aiTrainingLab"
import { HubState } from "./ShadowStatusBadge"
import { LabResultView, LabVerdictBadge } from "./LabResultView"

export interface LabRunTarget {
  policyId?: string
  version?: number
  scenarios?: Array<{ id: string; title: string }>
}

type GetToken = () => Promise<string | null>

const PICKER_PAGE_SIZE = 10

function useDebouncedText(value: string, delay = 300) {
  const [debounced, setDebounced] = React.useState(value)
  React.useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value.trim()), delay)
    return () => window.clearTimeout(timer)
  }, [value, delay])
  return debounced
}

function PickerSearch({ id, label, value, onChange, placeholder }: { id: string; label: string; value: string; onChange: (value: string) => void; placeholder: string }) {
  return (
    <div className="relative">
      <label htmlFor={id} className="sr-only">{label}</label>
      <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
      <Input id={id} type="search" value={value} maxLength={100} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="h-9 pl-8 text-sm" />
    </div>
  )
}

function PickerPager({ page, totalPages, total, noun, onPage }: { page: number; totalPages: number; total: number; noun: string; onPage: (page: number) => void }) {
  return (
    <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
      <span>{total} {noun}{total === 1 ? "" : "s"} · page {page} of {totalPages}</span>
      <div className="flex gap-2">
        <Button type="button" variant="outline" size="sm" className="h-7" disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label={`Previous ${noun} page`}><ChevronLeft className="h-3.5 w-3.5" /></Button>
        <Button type="button" variant="outline" size="sm" className="h-7" disabled={page >= totalPages} onClick={() => onPage(page + 1)} aria-label={`Next ${noun} page`}><ChevronRight className="h-3.5 w-3.5" /></Button>
      </div>
    </div>
  )
}

export function LabRunSheet({ target, getToken, onClose, onRan }: {
  target: LabRunTarget | null
  getToken: GetToken
  onClose: () => void
  onRan: (runs: LabRun[]) => void
}) {
  const open = Boolean(target)
  const [chosen, setChosen] = React.useState<{ id: string; title: string; status?: string } | null>(null)
  const [proposalText, setProposalText] = React.useState("")
  const proposalQuery = useDebouncedText(proposalText)
  const [proposalPaging, setProposalPaging] = React.useState({ q: "", page: 1 })
  const proposalPage = proposalPaging.q === proposalQuery ? proposalPaging.page : 1
  const setProposalPage = (page: number) => setProposalPaging({ q: proposalQuery, page })
  const [scenarioText, setScenarioText] = React.useState("")
  const scenarioQuery = useDebouncedText(scenarioText)
  const [scenarioPaging, setScenarioPaging] = React.useState({ q: "", page: 1 })
  const scenarioPage = scenarioPaging.q === scenarioQuery ? scenarioPaging.page : 1
  const setScenarioPage = (page: number) => setScenarioPaging({ q: scenarioQuery, page })
  const [version, setVersion] = React.useState(0)
  const [selected, setSelected] = React.useState<Array<{ id: string; title: string }>>([])
  const [mode, setMode] = React.useState<LabRunMode>("rules_only")
  const [replySource, setReplySource] = React.useState<"written" | "rule_example">("written")
  const [replyText, setReplyText] = React.useState("")
  const [exampleIndex, setExampleIndex] = React.useState(0)
  const [issues, setIssues] = React.useState<LabIssue[]>([])
  const [busy, setBusy] = React.useState(false)
  const [results, setResults] = React.useState<LabRun[] | null>(null)
  const [expanded, setExpanded] = React.useState<string | null>(null)
  const policyId = chosen?.id || ""
  const proposals = useTrainingProposalOptions(getToken, { q: proposalQuery, page: proposalPage, limit: PICKER_PAGE_SIZE }, open && !chosen)
  const scenarios = useLabScenarios(getToken, { q: scenarioQuery, page: scenarioPage, limit: PICKER_PAGE_SIZE }, open)
  const proposal = useTrainingProposal(getToken, open && policyId ? policyId : null)

  React.useEffect(() => {
    if (!target) return
    setChosen(target.policyId ? { id: target.policyId, title: "" } : null)
    setVersion(target.version || 0)
    setSelected(target.scenarios || [])
    setProposalText("")
    setScenarioText("")
    setProposalPaging({ q: "", page: 1 })
    setScenarioPaging({ q: "", page: 1 })
    setMode("rules_only")
    setReplySource("written")
    setReplyText("")
    setExampleIndex(0)
    setIssues([])
    setResults(null)
    setExpanded(null)
  }, [target])

  React.useEffect(() => {
    if (proposal.data && chosen && proposal.data.id === chosen.id && (!chosen.title || !chosen.status)) {
      setChosen({ id: proposal.data.id, title: proposal.data.title, status: proposal.data.status })
    }
  }, [proposal.data, chosen])

  const versions = React.useMemo(() => proposal.data?.versions || [], [proposal.data])
  React.useEffect(() => {
    if (!proposal.data) return
    if (!versions.some((item) => item.version === version)) setVersion(proposal.data.currentVersion)
  }, [proposal.data, versions, version])

  const chosenVersion = versions.find((item) => item.version === version)
  const examples = React.useMemo(
    () => (chosenVersion?.spec?.examples || [])
      .map((example, index) => ({ index, idealReply: example.idealReply || "" }))
      .filter((example) => example.idealReply.trim()),
    [chosenVersion],
  )
  React.useEffect(() => {
    if (examples.length && !examples.some((example) => example.index === exampleIndex)) setExampleIndex(examples[0].index)
  }, [exampleIndex, examples])

  const toggleScenario = (option: { id: string; title: string }) => {
    setSelected((current) => {
      if (current.some((item) => item.id === option.id)) return current.filter((item) => item.id !== option.id)
      if (current.length >= L.batchSize) {
        toast.error(`Choose at most ${L.batchSize} scenarios at a time`)
        return current
      }
      return [...current, { id: option.id, title: option.title }]
    })
  }

  const chooseProposal = (option: { id: string; title: string; status: string }) => {
    setChosen(option)
    setVersion(0)
  }

  const replyReady = mode === "rules_only"
    || (replySource === "written" ? replyText.trim().length > 0 : examples.length > 0)
  const canRun = Boolean(policyId && version && selected.length && replyReady && !busy && chosenVersion)

  const run = async () => {
    if (!canRun) return
    setBusy(true)
    setIssues([])
    try {
      const reply = mode === "sample_reply"
        ? (replySource === "written" ? { source: "written", text: replyText } : { source: "rule_example", exampleIndex })
        : undefined
      const data = await trainingRequest<{ runs: LabRun[] }>(getToken, "post", "/api/crm/ai-training/lab/runs/batch", {
        policyId,
        version,
        scenarioIds: selected.map((item) => item.id),
        mode,
        ...(reply ? { reply } : {}),
      })
      setResults(data.runs)
      setExpanded(data.runs.length === 1 ? data.runs[0].id : null)
      onRan(data.runs)
    } catch (err) {
      const serverIssues = (err as { response?: { data?: { errors?: LabIssue[] } } })?.response?.data?.errors
      if (Array.isArray(serverIssues)) setIssues(serverIssues)
      toast.error("Test did not run", { description: trainingErrorMessage(err, "Please try again.") })
    } finally {
      setBusy(false)
    }
  }

  const proposalRows = proposals.data?.proposals || []
  const scenarioRows = scenarios.data?.scenarios || []

  return (
    <Sheet open={open} onOpenChange={(value) => !value && onClose()}>
      <SheetContent side="right" className="w-full overflow-y-auto p-0 sm:max-w-2xl">
        <SheetHeader className="border-b border-border/40 px-4 py-4 sm:px-6">
          <SheetTitle className="pr-10 text-base">Run a test</SheetTitle>
          <SheetDescription className="text-xs">
            Checks a training proposal against made-up scenarios on this server. No AI is used, nothing is sent and the AI Agent does not change.
          </SheetDescription>
        </SheetHeader>

        {results ? (
          <div className="space-y-4 px-4 py-5 sm:px-6">
            {results.length > 1 && (
              <ul aria-label="Batch results" className="space-y-2">
                {results.map((item) => (
                  <li key={item.id} className="rounded-xl border border-border/40">
                    <button type="button" onClick={() => setExpanded(expanded === item.id ? null : item.id)} className="flex w-full flex-wrap items-center gap-2 p-3 text-left">
                      <LabVerdictBadge verdict={item.verdict} />
                      <span className="min-w-0 flex-1 truncate text-xs font-semibold">{item.scenarioTitle || "Scenario"}</span>
                      <span className="text-[10px] text-muted-foreground">{expanded === item.id ? "Hide" : "Details"}</span>
                    </button>
                    {expanded === item.id && <div className="border-t border-border/40 p-3"><LabResultView run={item} /></div>}
                  </li>
                ))}
              </ul>
            )}
            {results.length === 1 && <LabResultView run={results[0]} />}
            <div className="sticky bottom-0 -mx-4 flex flex-wrap justify-end gap-2 border-t border-border/40 bg-background px-4 py-3 sm:-mx-6 sm:px-6">
              <Button variant="outline" onClick={() => setResults(null)}>Run another test</Button>
              <Button onClick={onClose}>Done</Button>
            </div>
          </div>
        ) : (
          <form className="space-y-5 px-4 py-5 sm:px-6" onSubmit={(event) => { event.preventDefault(); void run() }} aria-label="Run a test">
            <div className="flex items-start gap-2 rounded-lg border border-sky-500/30 bg-sky-500/5 p-3 text-[11px] text-sky-800 dark:text-sky-200">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>Results are advisory. They never approve, block or publish a rule. Each result is saved as it was, can&apos;t be edited, and is deleted automatically after one year. AI simulation is not available yet.</span>
            </div>

            <fieldset className="space-y-2">
              <legend className="text-xs font-semibold">Training proposal</legend>
              {chosen ? (
                <div className="flex flex-wrap items-center gap-2 rounded-xl border border-primary/40 bg-primary/5 p-2.5 text-xs">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold" data-testid="lab-chosen-proposal">{chosen.title || (proposal.loading ? "Loading…" : "Proposal")}</span>
                    {chosen.status && <span className="block text-[11px] text-muted-foreground">{TRAINING_STATUS_LABELS[chosen.status as TrainingStatus] || chosen.status}</span>}
                  </span>
                  <Button type="button" size="sm" variant="ghost" className="h-7" onClick={() => { setChosen(null); setVersion(0) }}>Change</Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <PickerSearch id="lab-run-proposal-search" label="Search proposals" value={proposalText} onChange={setProposalText} placeholder="Search proposals by title" />
                  <HubState
                    loading={proposals.loading}
                    error={proposals.error}
                    onRetry={proposals.reload}
                    empty={proposals.data && !proposalRows.length
                      ? (proposalQuery ? `No proposals match "${proposalQuery}".` : "There are no proposals you can test yet.")
                      : false}
                  >
                    {proposals.data && (
                      <>
                        <ul aria-label="Proposals" className="space-y-1.5 rounded-xl border border-border/50 p-2">
                          {proposalRows.map((option) => (
                            <li key={option.id}>
                              <button
                                type="button"
                                onClick={() => chooseProposal({ id: option.id, title: option.title, status: option.status })}
                                className="w-full rounded-lg p-2 text-left text-xs hover:bg-muted/40 focus-visible:outline-2 focus-visible:outline-primary"
                              >
                                <span className="block truncate font-semibold">{option.title}</span>
                                <span className="block truncate text-[11px] text-muted-foreground">
                                  {TRAINING_STATUS_LABELS[option.status] || option.status} · version {option.currentVersion} · {option.createdBy?.name || "Team member"}{option.isMine ? " (you)" : ""}
                                </span>
                              </button>
                            </li>
                          ))}
                        </ul>
                        <PickerPager page={proposals.data.page} totalPages={proposals.data.totalPages} total={proposals.data.total} noun="proposal" onPage={setProposalPage} />
                      </>
                    )}
                  </HubState>
                </div>
              )}
              {proposal.error && <p role="alert" className="text-[11px] text-red-600 dark:text-red-400">{proposal.error}</p>}
            </fieldset>

            <div className="space-y-1">
              <label htmlFor="lab-run-version" className="block text-xs font-semibold">Version</label>
              <select id="lab-run-version" className="h-9 w-full rounded-md border border-input bg-background px-2.5 text-sm sm:w-64" value={version || ""} disabled={!versions.length} onChange={(event) => setVersion(Number(event.target.value))}>
                {!versions.length && <option value="">{policyId && proposal.loading ? "Loading…" : "Choose a proposal first"}</option>}
                {versions.map((item) => (
                  <option key={item.version} value={item.version}>
                    Version {item.version}{item.version === proposal.data?.currentVersion ? " (current)" : ""}
                  </option>
                ))}
              </select>
              {chosenVersion && chosenVersion.spec?.format !== "structured_v1" && (
                <p className="text-[11px] text-amber-700 dark:text-amber-300">This version is a plain instruction, so handling checks cannot run and some results will be incomplete.</p>
              )}
            </div>

            <fieldset className="space-y-2">
              <legend className="text-xs font-semibold">Scenarios ({selected.length}/{L.batchSize})</legend>
              {selected.length > 0 && (
                <ul aria-label="Chosen scenarios" className="flex flex-wrap gap-1.5">
                  {selected.map((item) => (
                    <li key={item.id} className="inline-flex max-w-full items-center gap-1 rounded-full border border-primary/40 bg-primary/5 py-0.5 pl-2.5 pr-1 text-[11px]">
                      <span className="truncate">{item.title}</span>
                      <button type="button" onClick={() => toggleScenario(item)} className="rounded-full p-0.5 hover:bg-muted" aria-label={`Remove ${item.title}`}>
                        <X className="h-3 w-3" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <PickerSearch id="lab-run-scenario-search" label="Search scenarios" value={scenarioText} onChange={setScenarioText} placeholder="Search active scenarios by title" />
              <HubState
                loading={scenarios.loading}
                error={scenarios.error}
                onRetry={scenarios.reload}
                empty={scenarios.data && !scenarioRows.length
                  ? (scenarioQuery ? `No active scenarios match "${scenarioQuery}".` : "No active scenarios yet. Create one in the Testing Lab first.")
                  : false}
              >
                {scenarios.data && (
                  <>
                    <ul aria-label="Scenario options" className="space-y-1.5 rounded-xl border border-border/50 p-2">
                      {scenarioRows.map((option) => {
                        const isChosen = selected.some((item) => item.id === option.id)
                        return (
                          <li key={option.id}>
                            <label className={cn("flex cursor-pointer items-start gap-2 rounded-lg p-2 text-xs", isChosen ? "bg-primary/5" : "hover:bg-muted/40")}>
                              <input type="checkbox" className="mt-0.5" checked={isChosen} onChange={() => toggleScenario({ id: option.id, title: option.title })} />
                              <span className="min-w-0">
                                <span className="block truncate font-semibold">{option.title}</span>
                                <span className="block truncate text-[11px] text-muted-foreground">{LAB_CHANNEL_LABELS[option.channel] || option.channel} · expects {labHandlingLabel(option.expectation.handling)}</span>
                              </span>
                            </label>
                          </li>
                        )
                      })}
                    </ul>
                    <PickerPager page={scenarios.data.page} totalPages={scenarios.data.totalPages} total={scenarios.data.total} noun="scenario" onPage={setScenarioPage} />
                  </>
                )}
              </HubState>
            </fieldset>

            <fieldset className="space-y-2">
              <legend className="text-xs font-semibold">What to check</legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {([
                  { value: "rules_only", label: "Rules only", description: "Safety and rule-fit checks. Reply checks are skipped, so the result stays incomplete." },
                  { value: "sample_reply", label: "Rules and a sample reply", description: "Also checks a reply you write or one of the rule's examples." },
                ] as const).map((option) => (
                  <label key={option.value} className={cn("flex cursor-pointer items-start gap-2 rounded-lg border p-2.5 text-xs", mode === option.value ? "border-primary bg-primary/5" : "border-border/60")}>
                    <input type="radio" name="lab-run-mode" className="mt-0.5" checked={mode === option.value} onChange={() => setMode(option.value)} />
                    <span>
                      <span className="font-semibold">{option.label}</span>
                      <span className="block text-[11px] text-muted-foreground">{option.description}</span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            {mode === "sample_reply" && (
              <fieldset className="space-y-2">
                <legend className="text-xs font-semibold">Sample reply</legend>
                <div className="flex flex-wrap gap-3 text-xs">
                  <label className="flex items-center gap-1.5">
                    <input type="radio" name="lab-reply-source" checked={replySource === "written"} onChange={() => setReplySource("written")} /> Write a reply
                  </label>
                  <label className={cn("flex items-center gap-1.5", !examples.length && "opacity-50")}>
                    <input type="radio" name="lab-reply-source" disabled={!examples.length} checked={replySource === "rule_example"} onChange={() => setReplySource("rule_example")} /> Use a rule example
                  </label>
                </div>
                {replySource === "written" ? (
                  <>
                    <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-2.5 text-[11px] text-amber-800 dark:text-amber-200">
                      <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      <span>{LAB_FICTIONAL_NOTICE}</span>
                    </div>
                    <Textarea aria-label="Sample reply" rows={4} maxLength={L.reply} value={replyText} onChange={(event) => setReplyText(event.target.value)} className="resize-y" placeholder="Great question! How many people usually ride with you?" />
                    <p className="text-right text-[10px] text-muted-foreground">{replyText.length}/{L.reply}</p>
                    {selected.length > 1 && <p className="text-[11px] text-muted-foreground">The same reply is checked against every chosen scenario.</p>}
                  </>
                ) : (
                  <select aria-label="Rule example" className="h-9 w-full rounded-md border border-input bg-background px-2.5 text-sm" value={exampleIndex} onChange={(event) => setExampleIndex(Number(event.target.value))}>
                    {examples.map((example) => (
                      <option key={example.index} value={example.index}>Example {example.index + 1}: {example.idealReply.slice(0, 80)}</option>
                    ))}
                  </select>
                )}
                {issues.length > 0 && (
                  <ul role="alert" className="ml-4 list-disc text-[11px] text-red-600 dark:text-red-400">
                    {issues.map((issue, index) => <li key={index}>{issue.message}</li>)}
                  </ul>
                )}
              </fieldset>
            )}

            <div className="sticky bottom-0 -mx-4 flex flex-wrap justify-end gap-2 border-t border-border/40 bg-background px-4 py-3 sm:-mx-6 sm:px-6">
              <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button>
              <Button type="submit" disabled={!canRun}>
                {busy && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />} Run {selected.length > 1 ? `${selected.length} tests` : "test"}
              </Button>
            </div>
          </form>
        )}
      </SheetContent>
    </Sheet>
  )
}
