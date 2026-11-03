"use client"

import * as React from "react"
import Link from "next/link"
import { ChevronDown, ChevronLeft, ChevronRight, FlaskConical, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"
import {
  ENGINE_OFF_NOTE,
  LOG_STATUS_LABELS,
  RUN_STATUS_LABELS,
  RUN_STATUS_STYLES,
  automationError,
  automationRequest,
  formatAutomationDate,
  type Automation,
  type AutomationActivityPage,
  type AutomationOptions,
  type AutomationRunStatus,
} from "@/lib/crmAutomations"
import { HubState } from "../ShadowStatusBadge"

type GetToken = () => Promise<string | null>

const SELECT_CLASS = "h-9 w-full rounded-lg border border-input bg-background px-2.5 text-xs sm:w-auto"
const STATUS_ORDER: AutomationRunStatus[] = ["completed", "waiting", "running", "stopped", "failed", "filtered"]

export function AutomationMonitor({ getToken, automations, options }: {
  getToken: GetToken
  automations: Automation[]
  options: AutomationOptions | null
}) {
  const [testMode, setTestMode] = React.useState(false)
  const [automation, setAutomation] = React.useState("")
  const [status, setStatus] = React.useState("")
  const [page, setPage] = React.useState(1)
  const [data, setData] = React.useState<AutomationActivityPage | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [open, setOpen] = React.useState<string | null>(null)

  const load = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ mode: testMode ? "test" : "live", page: String(page) })
      if (automation) params.set("automation", automation)
      if (status) params.set("status", status)
      setData(await automationRequest<AutomationActivityPage>(getToken, "get", `/activity?${params.toString()}`))
    } catch (err) {
      setError(automationError(err, "Could not load the automation activity"))
    } finally {
      setLoading(false)
    }
  }, [automation, getToken, page, status, testMode])

  React.useEffect(() => {
    void load()
  }, [load])

  const stepLabel = (type: string) => options?.actions.find((action) => action.key === type)?.label || (type === "wait" ? "Wait" : type)

  return (
    <div className="space-y-4">
      {data && !data.engineEnabled && (
        <p role="status" className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-800 dark:text-amber-200">{ENGINE_OFF_NOTE}</p>
      )}
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <label htmlFor="automation-monitor-automation" className="sr-only">Automation</label>
        <select id="automation-monitor-automation" className={SELECT_CLASS} value={automation} onChange={(event) => { setAutomation(event.target.value); setPage(1) }}>
          <option value="">All automations</option>
          {automations.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
        <label htmlFor="automation-monitor-status" className="sr-only">Status</label>
        <select id="automation-monitor-status" className={SELECT_CLASS} value={status} onChange={(event) => { setStatus(event.target.value); setPage(1) }}>
          <option value="">All statuses</option>
          {STATUS_ORDER.map((value) => <option key={value} value={value}>{RUN_STATUS_LABELS[value]}</option>)}
        </select>
        <label className="flex items-center gap-2 text-xs font-semibold">
          <Switch checked={testMode} onCheckedChange={(checked) => { setTestMode(Boolean(checked)); setPage(1) }} aria-label="Test mode" />
          <FlaskConical className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
          Test mode
        </label>
        <Button type="button" variant="outline" size="sm" className="h-9 sm:ml-auto" onClick={() => void load()} disabled={loading}>
          <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      <HubState loading={loading && !data} error={data ? null : error} onRetry={load}>
        {data && (
          <div className={cn("space-y-3", loading && "opacity-60")} aria-busy={loading}>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Totals">
              {STATUS_ORDER.map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={status === value}
                  onClick={() => { setStatus(status === value ? "" : value); setPage(1) }}
                  className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold", RUN_STATUS_STYLES[value], status === value && "ring-2 ring-primary/40")}
                >
                  {RUN_STATUS_LABELS[value]}
                  <span className="tabular-nums">{data.counts[value] || 0}</span>
                </button>
              ))}
            </div>
            {testMode && <p className="text-[11px] text-muted-foreground">Test mode shows what automations in Test Mode would have done. Nothing was sent and no lead was changed.</p>}
            {data.items.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border/60 p-6 text-center text-xs text-muted-foreground">
                {testMode ? "No test activity yet. Set an automation to Test Mode to see what it would do." : "No automation activity yet."}
              </p>
            ) : (
              <ul className="divide-y divide-border/30 rounded-xl border border-border/40" aria-label="Automation activity">
                {data.items.map((run) => {
                  const expanded = open === run.id
                  const last = run.log[run.log.length - 1]
                  return (
                    <li key={run.id} className="px-3 py-2.5 text-xs">
                      <div className="flex flex-col gap-1.5 md:grid md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)_6rem_minmax(0,1.4fr)_9rem_1.5rem] md:items-center md:gap-3">
                        <div className="min-w-0">
                          {run.contact.leadId
                            ? <Link href={`/crm/leads?leadId=${encodeURIComponent(run.contact.leadId)}`} className="block truncate font-semibold hover:underline">{run.contact.name || "Unknown contact"}</Link>
                            : <p className="truncate font-semibold">{run.contact.name || "Unknown contact"}</p>}
                          <p className="truncate text-[11px] text-muted-foreground">{run.contact.phone || run.contact.email || "—"}</p>
                        </div>
                        <p className="min-w-0 truncate font-medium">{run.automationName}</p>
                        <span className={cn("inline-flex w-fit items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold", RUN_STATUS_STYLES[run.status])}>{RUN_STATUS_LABELS[run.status]}</span>
                        <p className="min-w-0 text-[11px] text-muted-foreground md:line-clamp-2">
                          {run.reason || (run.status === "waiting" && run.nextRunAt ? `Next step ${formatAutomationDate(run.nextRunAt)}` : last ? `${stepLabel(last.type)}: ${LOG_STATUS_LABELS[last.status]}` : "—")}
                        </p>
                        <p className="text-[11px] tabular-nums text-muted-foreground">{formatAutomationDate(run.createdAt)}</p>
                        {run.log.length > 0 ? (
                          <button type="button" onClick={() => setOpen(expanded ? null : run.id)} aria-expanded={expanded} aria-label={`Show steps for ${run.contact.name || "this contact"}`} className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-muted">
                            <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", expanded && "rotate-180")} />
                          </button>
                        ) : <span />}
                      </div>
                      {expanded && (
                        <ol className="mt-2 space-y-1 rounded-lg bg-muted/40 p-2">
                          {run.log.map((entry, index) => (
                            <li key={index} className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                              <span className="font-semibold">{stepLabel(entry.type)}</span>
                              <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{LOG_STATUS_LABELS[entry.status]}</span>
                              <span className="min-w-0 flex-1 break-words text-[11px] text-muted-foreground">{entry.detail}</span>
                              <span className="text-[10px] tabular-nums text-muted-foreground">{formatAutomationDate(entry.at)}</span>
                            </li>
                          ))}
                        </ol>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
            <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
              <span>Page {data.page} of {data.pages} · {data.total} run{data.total === 1 ? "" : "s"}</span>
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" className="h-7" disabled={data.page <= 1} onClick={() => setPage(data.page - 1)} aria-label="Previous page"><ChevronLeft className="h-3.5 w-3.5" /></Button>
                <Button type="button" variant="outline" size="sm" className="h-7" disabled={data.page >= data.pages} onClick={() => setPage(data.page + 1)} aria-label="Next page"><ChevronRight className="h-3.5 w-3.5" /></Button>
              </div>
            </div>
          </div>
        )}
      </HubState>
    </div>
  )
}
