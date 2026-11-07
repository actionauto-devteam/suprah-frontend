"use client"

import * as React from "react"
import Link from "next/link"
import { toast } from "sonner"
import { ChevronDown, ChevronLeft, ChevronRight, Download, FlaskConical, Info, Loader2, RefreshCw, RotateCcw, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"
import {
  ENGINE_OFF_NOTE,
  LOG_STATUS_LABELS,
  LOG_STATUS_STYLES,
  MONITOR_RANGE_LABELS,
  MONITOR_STATUS_HELP,
  MONITOR_STATUS_LABELS,
  MONITOR_STATUS_ORDER,
  MONITOR_STATUS_STYLES,
  automationDownload,
  automationError,
  automationRequest,
  formatAutomationDate,
  type Automation,
  type AutomationActivityPage,
  type AutomationActivitySummary,
  type AutomationLogPage,
  type AutomationOptions,
  type MonitorGroup,
  type MonitorRange,
  type MonitorStatus,
} from "@/lib/crmAutomations"
import { HubState } from "../ShadowStatusBadge"
import { AutomationExportDialog } from "./AutomationExportDialog"
import { MonitorChart } from "./AutomationMonitorChart"
import { ReengagementChart } from "./AutomationReengagementChart"

type GetToken = () => Promise<string | null>
type Tab = "events" | "logs"

const SELECT_CLASS = "h-9 w-full rounded-lg border border-input bg-background px-2.5 text-xs sm:w-auto"
const HEAD_CLASS = "hidden px-3 py-2 text-[11px] font-semibold text-muted-foreground md:grid md:items-center md:gap-3"
const EVENT_COLUMNS = "md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_7rem_minmax(0,1.3fr)_5rem_8.5rem_1.5rem]"
const LOG_COLUMNS = "md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_5.5rem_minmax(0,1.6fr)_8.5rem]"
const SEARCH_PARAM: Record<Tab, string> = { events: "q", logs: "name" }

function Pager({ page, pages, total, noun, onPage }: { page: number; pages: number; total: number; noun: string; onPage: (page: number) => void }) {
  return (
    <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
      <span>Page {page} of {pages} · {total.toLocaleString()} {noun}{total === 1 ? "" : "s"}</span>
      <div className="flex gap-2">
        <Button type="button" variant="outline" size="sm" className="h-7" disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Previous page"><ChevronLeft className="h-3.5 w-3.5" /></Button>
        <Button type="button" variant="outline" size="sm" className="h-7" disabled={page >= pages} onClick={() => onPage(page + 1)} aria-label="Next page"><ChevronRight className="h-3.5 w-3.5" /></Button>
      </div>
    </div>
  )
}

function ContactCell({ contact }: { contact: AutomationActivityPage["items"][number]["contact"] }) {
  const name = contact.name?.trim()
  const reach = contact.email || contact.phone
  const label = name || reach || "Unknown contact"
  const className = cn("block truncate", name ? "font-semibold" : "text-muted-foreground")
  return (
    <div className="min-w-0">
      {contact.leadId
        ? <Link href={`/crm/leads?leadId=${encodeURIComponent(contact.leadId)}`} className={cn(className, "hover:underline")}>{label}</Link>
        : <p className={className}>{label}</p>}
      {name && reach && <p className="truncate text-[11px] text-muted-foreground">{reach}</p>}
    </div>
  )
}

function EmptyList({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex flex-col items-center px-4 py-10 text-center">
      <Info className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
      <p className="mt-3 text-sm font-semibold">{title}</p>
      <p className="mt-1 max-w-md text-[11px] text-muted-foreground">{body}</p>
    </div>
  )
}

export function AutomationMonitor({ getToken, automations, options }: {
  getToken: GetToken
  automations: Automation[]
  options: AutomationOptions | null
}) {
  const [testMode, setTestMode] = React.useState(false)
  const [automation, setAutomation] = React.useState("")
  const [tag, setTag] = React.useState("")
  const [status, setStatus] = React.useState<MonitorStatus | "">("")
  const [range, setRange] = React.useState<MonitorRange>("month_to_date")
  const [group, setGroup] = React.useState<MonitorGroup>("day")
  const [tab, setTab] = React.useState<Tab>("events")
  const [queries, setQueries] = React.useState<Record<Tab, string>>({ events: "", logs: "" })
  const [searches, setSearches] = React.useState<Record<Tab, string>>({ events: "", logs: "" })
  const [page, setPage] = React.useState(1)
  const [summary, setSummary] = React.useState<AutomationActivitySummary | null>(null)
  const [summaryLoading, setSummaryLoading] = React.useState(true)
  const [summaryError, setSummaryError] = React.useState<string | null>(null)
  const [events, setEvents] = React.useState<AutomationActivityPage | null>(null)
  const [logs, setLogs] = React.useState<AutomationLogPage | null>(null)
  const [listLoading, setListLoading] = React.useState(true)
  const [listError, setListError] = React.useState<string | null>(null)
  const [open, setOpen] = React.useState<string | null>(null)
  const [exporting, setExporting] = React.useState(false)
  const [exportOpen, setExportOpen] = React.useState(false)
  const [retrying, setRetrying] = React.useState<string | null>(null)

  const tags = React.useMemo(() => Array.from(new Set(automations.flatMap((item) => item.tags || []))).sort((a, b) => a.localeCompare(b)), [automations])

  const query = queries[tab]
  const search = searches[tab]

  React.useEffect(() => {
    const timer = window.setTimeout(() => {
      const next = query.trim()
      if (next === search) return
      setSearches((current) => ({ ...current, [tab]: next }))
      setPage(1)
    }, 300)
    return () => window.clearTimeout(timer)
  }, [query, search, tab])

  const filters = React.useMemo(() => {
    const params = new URLSearchParams({ mode: testMode ? "test" : "live", range })
    if (automation) params.set("automation", automation)
    if (tag) params.set("tag", tag)
    return params
  }, [automation, range, tag, testMode])

  const loadSummary = React.useCallback(async () => {
    setSummaryLoading(true)
    setSummaryError(null)
    try {
      const params = new URLSearchParams(filters)
      params.set("group", group)
      setSummary(await automationRequest<AutomationActivitySummary>(getToken, "get", `/activity/summary?${params.toString()}`))
    } catch (err) {
      setSummaryError(automationError(err, "Could not load the automation totals"))
    } finally {
      setSummaryLoading(false)
    }
  }, [filters, getToken, group])

  const loadList = React.useCallback(async () => {
    setListLoading(true)
    setListError(null)
    try {
      const params = new URLSearchParams(filters)
      params.set("page", String(page))
      if (status) params.set("status", status)
      if (search) params.set(SEARCH_PARAM[tab], search)
      if (tab === "events") setEvents(await automationRequest<AutomationActivityPage>(getToken, "get", `/activity?${params.toString()}`))
      else setLogs(await automationRequest<AutomationLogPage>(getToken, "get", `/activity/logs?${params.toString()}`))
    } catch (err) {
      setListError(automationError(err, tab === "events" ? "Could not load the automation events" : "Could not load the automation logs"))
    } finally {
      setListLoading(false)
    }
  }, [filters, getToken, page, search, status, tab])

  React.useEffect(() => {
    void loadSummary()
  }, [loadSummary])

  React.useEffect(() => {
    void loadList()
  }, [loadList])

  const refresh = () => {
    void loadSummary()
    void loadList()
  }

  const exportQuery = React.useMemo(() => {
    const params = new URLSearchParams(filters)
    params.delete("range")
    params.set("view", tab)
    if (status) params.set("status", status)
    if (search) params.set(SEARCH_PARAM[tab], search)
    return params.toString()
  }, [filters, search, status, tab])

  const exportCsv = async (from: string, to: string) => {
    setExporting(true)
    try {
      const params = new URLSearchParams(exportQuery)
      params.set("from", from)
      params.set("to", to)
      const { blob, filename } = await automationDownload(getToken, `/activity/export?${params.toString()}`)
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
      toast.success(`Downloaded ${filename}`)
      setExportOpen(false)
    } catch (err) {
      toast.error(automationError(err, "Could not export the automation activity"))
    } finally {
      setExporting(false)
    }
  }

  const retry = async (runId: string) => {
    setRetrying(runId)
    try {
      await automationRequest(getToken, "post", `/runs/${encodeURIComponent(runId)}/retry`)
      toast.success("Retry started. The failed steps run again within a minute.")
      refresh()
    } catch (err) {
      toast.error(automationError(err, "Could not retry this event"))
    } finally {
      setRetrying(null)
    }
  }

  const stepLabel = (type: string) => options?.actions.find((action) => action.key === type)?.label || (type === "wait" ? "Wait" : type === "retry" ? "Retry" : type)
  const resetPage = <T,>(setter: (value: T) => void) => (value: T) => {
    setter(value)
    setPage(1)
  }
  const list = tab === "events" ? events : logs
  const noun = tab === "events" ? "events" : "logs"
  const emptyBody = search
    ? `Nothing matches "${search}" in the selected filters and date range.`
    : testMode
      ? `There are no Test Mode ${noun} for the selected filters and date range. Set an automation to Test Mode to see what it would do.`
      : `There are no automation ${noun} for the selected filters and date range. Try a wider date range.`

  return (
    <div className="space-y-4">
      {summary && !summary.engineEnabled && (
        <p role="status" className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-800 dark:text-amber-200">{ENGINE_OFF_NOTE}</p>
      )}

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <label htmlFor="automation-monitor-status" className="sr-only">Status</label>
        <select id="automation-monitor-status" className={SELECT_CLASS} value={status} onChange={(event) => resetPage(setStatus)(event.target.value as MonitorStatus | "")}>
          <option value="">All Statuses</option>
          {MONITOR_STATUS_ORDER.map((value) => <option key={value} value={value}>{MONITOR_STATUS_LABELS[value]}</option>)}
        </select>
        <label htmlFor="automation-monitor-automation" className="sr-only">Automation</label>
        <select id="automation-monitor-automation" className={SELECT_CLASS} value={automation} onChange={(event) => resetPage(setAutomation)(event.target.value)}>
          <option value="">All automations</option>
          {automations.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
        <label htmlFor="automation-monitor-tag" className="sr-only">Tag</label>
        <select id="automation-monitor-tag" className={SELECT_CLASS} value={tag} onChange={(event) => resetPage(setTag)(event.target.value)}>
          <option value="">All tags</option>
          {tags.map((value) => <option key={value} value={value}>{value}</option>)}
        </select>
        <label htmlFor="automation-monitor-range" className="sr-only">Date range</label>
        <select id="automation-monitor-range" className={SELECT_CLASS} value={range} onChange={(event) => resetPage(setRange)(event.target.value as MonitorRange)}>
          {(Object.keys(MONITOR_RANGE_LABELS) as MonitorRange[]).map((value) => <option key={value} value={value}>{MONITOR_RANGE_LABELS[value]}</option>)}
        </select>
        <label className="flex items-center gap-2 text-xs font-semibold">
          <Switch checked={testMode} onCheckedChange={(checked) => resetPage(setTestMode)(Boolean(checked))} aria-label="Test mode" />
          <FlaskConical className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
          Test Mode
        </label>
        <div className="flex gap-2 sm:ml-auto">
          <Button type="button" variant="outline" size="sm" className="h-9 w-9 p-0" onClick={refresh} disabled={summaryLoading || listLoading} aria-label="Refresh">
            <RefreshCw className={cn("h-3.5 w-3.5", (summaryLoading || listLoading) && "animate-spin")} />
          </Button>
          <Button type="button" size="sm" className="h-9 flex-1 sm:flex-none" onClick={() => setExportOpen(true)} disabled={exporting}>
            {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
            Export as CSV
          </Button>
        </div>
      </div>

      <HubState loading={summaryLoading && !summary} error={summary ? null : summaryError} onRetry={loadSummary}>
        {summary && <MonitorChart summary={summary} group={group} loading={summaryLoading} onGroupChange={setGroup} />}
      </HubState>

      <details className="group text-xs">
        <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Learn what the statuses on these events mean.</summary>
        <dl className="mt-2 grid gap-2 rounded-xl border border-border/40 p-3 sm:grid-cols-2">
          {MONITOR_STATUS_ORDER.map((value) => (
            <div key={value}>
              <dt className="font-semibold">{MONITOR_STATUS_LABELS[value]}</dt>
              <dd className="text-[11px] text-muted-foreground">{MONITOR_STATUS_HELP[value]}</dd>
            </div>
          ))}
        </dl>
      </details>

      <div role="tablist" aria-label="Activity views" className="flex gap-1 border-b border-border/50">
        {(["events", "logs"] as Tab[]).map((value) => (
          <button
            key={value}
            type="button"
            role="tab"
            id={`automation-monitor-tab-${value}`}
            aria-selected={tab === value}
            aria-controls="automation-monitor-panel"
            onClick={() => {
              setTab(value)
              setPage(1)
              setOpen(null)
            }}
            className={cn("-mb-px border-b-2 px-3 py-2 text-sm font-semibold transition-colors", tab === value ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground")}
          >
            {value === "events" ? "Events" : "Logs"}
          </button>
        ))}
      </div>

      <div id="automation-monitor-panel" role="tabpanel" aria-labelledby={`automation-monitor-tab-${tab}`} className="space-y-3">
        {tab === "events" ? (
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input type="search" value={query} onChange={(event) => setQueries((current) => ({ ...current, events: event.target.value }))} placeholder="Search customer name, phone number, and email" aria-label="Search customer name, phone number, and email" maxLength={80} className="h-10 rounded-full pl-9 text-sm" />
          </div>
        ) : (
          <div className="relative sm:max-w-xs">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input type="search" value={query} onChange={(event) => setQueries((current) => ({ ...current, logs: event.target.value }))} placeholder="Search by automation name" aria-label="Search by automation name" maxLength={80} className="h-9 pl-8 text-sm" />
          </div>
        )}
        {testMode && <p className="text-[11px] text-muted-foreground">Test Mode shows what automations in Test Mode would have done. Nothing was sent and no lead was changed.</p>}

        <HubState loading={listLoading && !list} error={list ? null : listError} onRetry={loadList}>
          {list && (
            <div className={cn("space-y-3 transition-opacity", listLoading && "opacity-60")} aria-busy={listLoading}>
              {list.items.length === 0 ? (
                <EmptyList title={`No ${noun} found`} body={emptyBody} />
              ) : tab === "events" && events ? (
                <div className="rounded-xl border border-border/40">
                  <div className={cn(HEAD_CLASS, EVENT_COLUMNS)} aria-hidden="true">
                    <span>Contact</span><span>Automation</span><span>Status</span><span>Reason</span><span>Channel</span><span>Created At</span><span />
                  </div>
                  <ul className="divide-y divide-border/30 md:border-t md:border-border/30" aria-label="Automation events">
                    {events.items.map((run) => {
                      const expanded = open === run.id
                      return (
                        <li key={run.id} className="px-3 py-2.5 text-xs">
                          <div className={cn("flex flex-col gap-1.5 md:grid md:items-center md:gap-3", EVENT_COLUMNS)}>
                            <ContactCell contact={run.contact} />
                            <div className="min-w-0">
                              <p className="truncate font-medium">{run.automationName}</p>
                              {run.step && <p className="truncate text-[11px] text-muted-foreground">{run.step}</p>}
                            </div>
                            <span className={cn("inline-flex w-fit items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold", MONITOR_STATUS_STYLES[run.display])}>{MONITOR_STATUS_LABELS[run.display]}</span>
                            <div className="min-w-0">
                              <p className="text-[11px] text-muted-foreground md:line-clamp-2">
                                {run.reason || (run.display === "scheduled" && run.nextRunAt ? `Next step ${formatAutomationDate(run.nextRunAt)}` : "—")}
                              </p>
                              {run.retryable && options?.canEdit && (
                                <Button type="button" variant="outline" size="sm" className="mt-1 h-7 gap-1 px-2 text-[11px]" disabled={retrying === run.id} onClick={() => void retry(run.id)} aria-label={`Retry the failed steps for ${run.contact.name || "this contact"}`}>
                                  {retrying === run.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCcw className="h-3 w-3" />}
                                  Retry
                                </Button>
                              )}
                            </div>
                            <p className="text-[11px] text-muted-foreground"><span className="md:hidden">Channel: </span>{run.channel || "—"}</p>
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
                </div>
              ) : logs ? (
                <div className="rounded-xl border border-border/40">
                  <div className={cn(HEAD_CLASS, LOG_COLUMNS)} aria-hidden="true">
                    <span>Contact</span><span>Automation</span><span>Step</span><span>Result</span><span>Detail</span><span>Time</span>
                  </div>
                  <ul className="divide-y divide-border/30 md:border-t md:border-border/30" aria-label="Automation logs">
                    {logs.items.map((entry) => (
                      <li key={entry.id} className={cn("flex flex-col gap-1.5 px-3 py-2.5 text-xs md:grid md:items-center md:gap-3", LOG_COLUMNS)}>
                        <ContactCell contact={entry.contact} />
                        <p className="min-w-0 truncate font-medium">{entry.automationName}</p>
                        <p className="min-w-0 truncate">{entry.step}{entry.channel && <span className="text-muted-foreground"> · {entry.channel}</span>}</p>
                        <span className={cn("inline-flex w-fit items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold", LOG_STATUS_STYLES[entry.status])}>{LOG_STATUS_LABELS[entry.status]}</span>
                        <p className="min-w-0 break-words text-[11px] text-muted-foreground md:line-clamp-2">{entry.detail || "—"}</p>
                        <p className="text-[11px] tabular-nums text-muted-foreground">{formatAutomationDate(entry.at)}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              <Pager page={list.page} pages={list.pages} total={list.total} noun={tab === "events" ? "event" : "log"} onPage={setPage} />
            </div>
          )}
        </HubState>
      </div>

      <ReengagementChart getToken={getToken} />

      {exportOpen && (
        <AutomationExportDialog
          view={tab}
          query={exportQuery}
          defaultFrom={summary?.range.from}
          defaultTo={summary?.range.to}
          exporting={exporting}
          getToken={getToken}
          onClose={() => setExportOpen(false)}
          onExport={(from, to) => void exportCsv(from, to)}
        />
      )}
    </div>
  )
}
