"use client"

import * as React from "react"
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { Table2 } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  MONITOR_GROUP_LABELS,
  MONITOR_STATUS_LABELS,
  MONITOR_STATUS_ORDER,
  calendarDate,
  type AutomationActivitySummary,
  type MonitorGroup,
  type MonitorStatus,
} from "@/lib/crmAutomations"

const COLOR_VARS = "[--mon-sent:#16a34a] [--mon-processed:#1592c4] [--mon-scheduled:#6a4fd6] [--mon-filtered:#eda100] [--mon-failed:#d6334f] dark:[--mon-sent:#2a9d3f] dark:[--mon-processed:#1aa0c8] dark:[--mon-scheduled:#8a6af0] dark:[--mon-filtered:#c48600] dark:[--mon-failed:#ea4f6e]"

export const SERIES_COLOR: Record<MonitorStatus, string> = {
  message_sent: "var(--mon-sent)",
  processed: "var(--mon-processed)",
  scheduled: "var(--mon-scheduled)",
  filtered: "var(--mon-filtered)",
  failed: "var(--mon-failed)",
}

const STACK_ORDER = [...MONITOR_STATUS_ORDER].reverse()
const SHORT: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" }
const LONG: Intl.DateTimeFormatOptions = { month: "long", day: "numeric", year: "numeric" }

type Row = { key: string; label: string; title: string; total: number } & Record<MonitorStatus, number>

function bucketText(from: string, to: string, group: MonitorGroup): { label: string; title: string } {
  if (group === "month") return { label: calendarDate(from, { month: "short", year: "numeric" }), title: calendarDate(from, { month: "long", year: "numeric" }) }
  if (group === "week" && from !== to) {
    return { label: `${calendarDate(from, SHORT)} – ${calendarDate(to, SHORT)}`, title: `${calendarDate(from, { month: "long", day: "numeric" })} – ${calendarDate(to, LONG)}` }
  }
  return { label: calendarDate(from, SHORT), title: calendarDate(from, LONG) }
}

function ChartTooltip({ active, payload, focus, hidden }: {
  active?: boolean
  payload?: Array<{ payload?: Row }>
  focus: MonitorStatus | null
  hidden: Set<MonitorStatus>
}) {
  const row = payload?.[0]?.payload
  if (!active || !row) return null
  const shown = MONITOR_STATUS_ORDER.filter((status) => !hidden.has(status))
  const total = shown.reduce((sum, status) => sum + row[status], 0)
  return (
    <div className="min-w-48 rounded-lg border border-border/60 bg-popover px-3 py-2.5 text-xs text-popover-foreground shadow-lg">
      <p className="text-[11px] text-muted-foreground">{row.title}</p>
      <p className="mb-1.5 text-sm font-bold">{total.toLocaleString()} Automation{total === 1 ? "" : "s"}</p>
      <ul className="space-y-1">
        {shown.map((status) => (
          <li key={status} className={cn("flex items-center gap-2 transition-opacity", focus && focus !== status && "opacity-35")}>
            <span className="h-0.5 w-3 shrink-0 rounded-full" style={{ background: SERIES_COLOR[status] }} aria-hidden="true" />
            <span className="flex-1 text-muted-foreground">{MONITOR_STATUS_LABELS[status]}</span>
            <span className="font-semibold tabular-nums">{row[status].toLocaleString()}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function MonitorChart({ summary, group, loading, onGroupChange }: {
  summary: AutomationActivitySummary
  group: MonitorGroup
  loading: boolean
  onGroupChange: (group: MonitorGroup) => void
}) {
  const [focus, setFocus] = React.useState<MonitorStatus | null>(null)
  const [hidden, setHidden] = React.useState<Set<MonitorStatus>>(() => new Set())
  const [table, setTable] = React.useState(false)
  const rows: Row[] = summary.buckets.map((bucket) => ({ key: bucket.from, ...bucketText(bucket.from, bucket.to, summary.group), total: bucket.total, ...bucket.counts }))
  const visible = STACK_ORDER.filter((status) => !hidden.has(status))
  const top = visible[visible.length - 1]
  const { from, to } = summary.range
  const rangeText = from === to ? calendarDate(from, LONG) : `${calendarDate(from, LONG)} - ${calendarDate(to, LONG)}`
  const toggle = (status: MonitorStatus) =>
    setHidden((current) => {
      const next = new Set(current)
      if (next.has(status)) next.delete(status)
      else next.add(status)
      return next
    })

  return (
    <section
      aria-labelledby="automation-monitor-chart-title"
      aria-busy={loading}
      className={cn(COLOR_VARS, "grid overflow-hidden rounded-xl border border-border/40 bg-card transition-opacity lg:grid-cols-[minmax(0,1fr)_15rem]", loading && "opacity-60")}
    >
      <div className="min-w-0 p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 id="automation-monitor-chart-title" className="text-sm font-bold">Total Automations</h3>
            <p className="text-[11px] text-muted-foreground">{rangeText}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setTable((value) => !value)}
              aria-pressed={table}
              aria-label="Show Total Automations as a table"
              className={cn("inline-flex h-8 items-center gap-1.5 rounded-lg border border-input px-2.5 text-xs font-medium hover:bg-muted", table && "bg-muted")}
            >
              <Table2 className="h-3.5 w-3.5" aria-hidden="true" />
              Table
            </button>
            <label htmlFor="automation-monitor-group" className="sr-only">Group by</label>
            <select id="automation-monitor-group" value={group} onChange={(event) => onGroupChange(event.target.value as MonitorGroup)} className="h-8 rounded-lg border border-input bg-background px-2 text-xs">
              {(Object.keys(MONITOR_GROUP_LABELS) as MonitorGroup[]).map((value) => <option key={value} value={value}>{MONITOR_GROUP_LABELS[value]}</option>)}
            </select>
          </div>
        </div>

        {table ? (
          <div className="mt-3 max-h-64 overflow-auto rounded-lg border border-border/40">
            <table className="w-full min-w-[34rem] text-left text-xs">
              <caption className="sr-only">Automations by {group} and status</caption>
              <thead className="sticky top-0 bg-muted/80 text-[11px] text-muted-foreground backdrop-blur">
                <tr>
                  <th scope="col" className="px-2.5 py-1.5 font-semibold">{group === "day" ? "Day" : group === "week" ? "Week" : "Month"}</th>
                  {MONITOR_STATUS_ORDER.map((status) => <th key={status} scope="col" className="px-2.5 py-1.5 text-right font-semibold">{MONITOR_STATUS_LABELS[status]}</th>)}
                  <th scope="col" className="px-2.5 py-1.5 text-right font-semibold">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {rows.map((row) => (
                  <tr key={row.key}>
                    <th scope="row" className="px-2.5 py-1.5 font-medium">{row.label}</th>
                    {MONITOR_STATUS_ORDER.map((status) => <td key={status} className="px-2.5 py-1.5 text-right tabular-nums">{row[status].toLocaleString()}</td>)}
                    <td className="px-2.5 py-1.5 text-right font-semibold tabular-nums">{row.total.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="mt-3 h-56 sm:h-64" onMouseLeave={() => setFocus(null)}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rows} margin={{ top: 8, right: 4, bottom: 0, left: 0 }} accessibilityLayer>
                <CartesianGrid vertical={false} stroke="var(--border)" />
                <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: "var(--border)" }} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} minTickGap={12} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={44} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickFormatter={(value: number) => value.toLocaleString()} />
                <Tooltip cursor={{ fill: "var(--muted)", fillOpacity: 0.45 }} content={<ChartTooltip focus={focus} hidden={hidden} />} />
                {visible.map((status) => (
                  <Bar
                    key={status}
                    dataKey={status}
                    name={MONITOR_STATUS_LABELS[status]}
                    stackId="runs"
                    fill={SERIES_COLOR[status]}
                    fillOpacity={focus && focus !== status ? 0.25 : 1}
                    stroke="var(--card)"
                    strokeWidth={2}
                    maxBarSize={48}
                    radius={status === top ? [4, 4, 0, 0] : 0}
                    isAnimationActive={false}
                    onMouseEnter={() => setFocus(status)}
                    onMouseLeave={() => setFocus(null)}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <aside aria-label="Totals" className="border-t border-border/40 p-4 lg:border-l lg:border-t-0">
        <dl className="grid grid-cols-2 gap-3 lg:grid-cols-1">
          <div>
            <dt className="text-[11px] text-muted-foreground">Day to Date</dt>
            <dd className="text-2xl font-bold">{summary.dayToDate.toLocaleString()}</dd>
          </div>
          <div>
            <dt className="text-[11px] text-muted-foreground">Month to Date</dt>
            <dd className="text-2xl font-bold">{summary.monthToDate.toLocaleString()}</dd>
          </div>
        </dl>
        <ul aria-label="Statuses in this date range" className="mt-4 space-y-0.5">
          {MONITOR_STATUS_ORDER.map((status) => (
            <li
              key={status}
              onMouseEnter={() => setFocus(status)}
              onMouseLeave={() => setFocus(null)}
              className={cn("transition-opacity", focus && focus !== status && "opacity-35")}
            >
              <label className="flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1 text-xs hover:bg-muted/50">
                <input
                  type="checkbox"
                  checked={!hidden.has(status)}
                  onChange={() => toggle(status)}
                  onFocus={() => setFocus(status)}
                  onBlur={() => setFocus(null)}
                  style={{ accentColor: SERIES_COLOR[status] }}
                  className="h-3.5 w-3.5"
                />
                <span className="flex-1">{MONITOR_STATUS_LABELS[status]}</span>
                <span className="font-semibold tabular-nums">{summary.counts[status].toLocaleString()}</span>
              </label>
            </li>
          ))}
        </ul>
      </aside>
    </section>
  )
}
