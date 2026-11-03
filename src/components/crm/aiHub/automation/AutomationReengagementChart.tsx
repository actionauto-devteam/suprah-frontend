"use client"

import * as React from "react"
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { Loader2, Table2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { automationError, automationRequest, calendarDate, type ReengagementSummary } from "@/lib/crmAutomations"

type SeriesKey = "sent" | "engaged" | "booked"
type Row = { key: string; label: string; title: string } & Record<SeriesKey, number>

const COLOR_VARS = "[--re-sent:#2a78d6] [--re-engaged:#eb6834] [--re-booked:#1baf7a] dark:[--re-sent:#3987e5] dark:[--re-engaged:#d95926] dark:[--re-booked:#199e70]"
const SERIES: Array<{ key: SeriesKey; label: string; color: string }> = [
  { key: "sent", label: "Sent To", color: "var(--re-sent)" },
  { key: "engaged", label: "Engaged", color: "var(--re-engaged)" },
  { key: "booked", label: "Appointments Booked", color: "var(--re-booked)" },
]

function LineTooltip({ active, payload, focus, hidden }: {
  active?: boolean
  payload?: Array<{ payload?: Row }>
  focus: SeriesKey | null
  hidden: Set<SeriesKey>
}) {
  const row = payload?.[0]?.payload
  if (!active || !row) return null
  return (
    <div className="min-w-44 rounded-lg border border-border/60 bg-popover px-3 py-2.5 text-xs text-popover-foreground shadow-lg">
      <p className="mb-1.5 text-[11px] text-muted-foreground">{row.title}</p>
      <ul className="space-y-1">
        {SERIES.filter((series) => !hidden.has(series.key)).map((series) => (
          <li key={series.key} className={cn("flex items-center gap-2 transition-opacity", focus && focus !== series.key && "opacity-35")}>
            <span className="h-0.5 w-3 shrink-0 rounded-full" style={{ background: series.color }} aria-hidden="true" />
            <span className="flex-1 text-muted-foreground">{series.label}</span>
            <span className="font-semibold tabular-nums">{row[series.key].toLocaleString()}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function ReengagementChart({ getToken }: { getToken: () => Promise<string | null> }) {
  const [data, setData] = React.useState<ReengagementSummary | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [focus, setFocus] = React.useState<SeriesKey | null>(null)
  const [hidden, setHidden] = React.useState<Set<SeriesKey>>(() => new Set())
  const [table, setTable] = React.useState(false)

  React.useEffect(() => {
    let cancelled = false
    automationRequest<ReengagementSummary>(getToken, "get", "/activity/reengagement")
      .then((result) => {
        if (!cancelled) setData(result)
      })
      .catch((err) => {
        if (!cancelled) setError(automationError(err, "Could not load the re-engagement numbers"))
      })
    return () => {
      cancelled = true
    }
  }, [getToken])

  const rows: Row[] = (data?.days || []).map((day) => ({
    key: day.day,
    label: calendarDate(day.day, { month: "short", day: "numeric" }),
    title: calendarDate(day.day, { month: "long", day: "numeric", year: "numeric" }),
    sent: day.sent,
    engaged: day.engaged,
    booked: day.booked,
  }))
  const toggle = (key: SeriesKey) =>
    setHidden((current) => {
      const next = new Set(current)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })

  return (
    <section aria-labelledby="automation-reengagement-title" className={cn(COLOR_VARS, "rounded-xl border border-border/40 bg-card p-4")}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 id="automation-reengagement-title" className="text-sm font-bold">Vehicle Inventory Update Re-engagement</h3>
          <p className="text-[11px] text-muted-foreground">
            Last 30 days. People texted about a vehicle that matches what they wanted, and how many of them replied or booked an appointment within {data?.windowDays || 7} days.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setTable((value) => !value)}
          aria-pressed={table}
          aria-label="Show re-engagement as a table"
          className={cn("inline-flex h-8 items-center gap-1.5 rounded-lg border border-input px-2.5 text-xs font-medium hover:bg-muted", table && "bg-muted")}
        >
          <Table2 className="h-3.5 w-3.5" aria-hidden="true" />
          Table
        </button>
      </div>

      {error && !data ? (
        <p role="alert" className="mt-4 text-xs text-red-600 dark:text-red-400">{error}</p>
      ) : !data ? (
        <div className="flex h-56 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-label="Loading" /></div>
      ) : (
        <>
          {!data.enabled && (
            <p className="mt-2 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-1.5 text-[11px] text-amber-800 dark:text-amber-200">Vehicle re-engagement is turned off on this server, so no new texts go out.</p>
          )}
          {data.enabled && data.totals.sent === 0 && (
            <p className="mt-2 text-[11px] text-muted-foreground">No re-engagement texts in the last 30 days.</p>
          )}
          <div className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1" role="group" aria-label="Lines">
            {SERIES.map((series) => (
              <button
                key={series.key}
                type="button"
                aria-pressed={!hidden.has(series.key)}
                onClick={() => toggle(series.key)}
                onMouseEnter={() => setFocus(series.key)}
                onMouseLeave={() => setFocus(null)}
                onFocus={() => setFocus(series.key)}
                onBlur={() => setFocus(null)}
                className={cn("inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-xs transition-opacity hover:bg-muted/60", hidden.has(series.key) && "line-through opacity-50", focus && focus !== series.key && "opacity-35")}
              >
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: series.color }} aria-hidden="true" />
                {series.label}
                <span className="font-semibold tabular-nums">{data.totals[series.key].toLocaleString()}</span>
              </button>
            ))}
          </div>
          {table ? (
            <div className="mt-3 max-h-64 overflow-auto rounded-lg border border-border/40">
              <table className="w-full min-w-[26rem] text-left text-xs">
                <caption className="sr-only">Vehicle re-engagement by day</caption>
                <thead className="sticky top-0 bg-muted/80 text-[11px] text-muted-foreground backdrop-blur">
                  <tr>
                    <th scope="col" className="px-2.5 py-1.5 font-semibold">Day</th>
                    {SERIES.map((series) => <th key={series.key} scope="col" className="px-2.5 py-1.5 text-right font-semibold">{series.label}</th>)}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {rows.map((row) => (
                    <tr key={row.key}>
                      <th scope="row" className="px-2.5 py-1.5 font-medium">{row.label}</th>
                      {SERIES.map((series) => <td key={series.key} className="px-2.5 py-1.5 text-right tabular-nums">{row[series.key].toLocaleString()}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="mt-2 h-60 sm:h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} accessibilityLayer>
                  <CartesianGrid vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: "var(--border)" }} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} interval="preserveStartEnd" minTickGap={16} />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={36} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickFormatter={(value: number) => value.toLocaleString()} />
                  <Tooltip cursor={{ stroke: "var(--muted-foreground)", strokeWidth: 1 }} content={<LineTooltip focus={focus} hidden={hidden} />} />
                  {SERIES.filter((series) => !hidden.has(series.key)).map((series) => {
                    const dim = focus && focus !== series.key ? 0.2 : 1
                    return (
                      <Line
                        key={series.key}
                        type="linear"
                        dataKey={series.key}
                        name={series.label}
                        stroke={series.color}
                        strokeWidth={2}
                        strokeOpacity={dim}
                        dot={{ r: 4, fill: series.color, stroke: "var(--card)", strokeWidth: 2, fillOpacity: dim, strokeOpacity: dim }}
                        activeDot={{ r: 5, fill: series.color, stroke: "var(--card)", strokeWidth: 2 }}
                        isAnimationActive={false}
                      />
                    )
                  })}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}
    </section>
  )
}
