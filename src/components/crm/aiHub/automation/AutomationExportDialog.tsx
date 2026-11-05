"use client"

import * as React from "react"
import { Download, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { automationError, automationRequest, automationToday, type AutomationExportCount } from "@/lib/crmAutomations"

type GetToken = () => Promise<string | null>

const LABEL_CLASS = "block text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground"

function dateProblem(from: string, to: string, today: string): string | null {
  if (!from || !to) return "Pick a start date and an end date."
  if (from > to) return "The start date must be on or before the end date."
  if (to > today) return "The end date cannot be after today."
  return null
}

export function AutomationExportDialog({ view, query, defaultFrom, defaultTo, exporting, getToken, onClose, onExport }: {
  view: "events" | "logs"
  query: string
  defaultFrom?: string
  defaultTo?: string
  exporting: boolean
  getToken: GetToken
  onClose: () => void
  onExport: (from: string, to: string) => void
}) {
  const [today] = React.useState(automationToday)
  const [from, setFrom] = React.useState(() => defaultFrom || today)
  const [to, setTo] = React.useState(() => defaultTo || today)
  const [count, setCount] = React.useState<AutomationExportCount | null>(null)
  const [counting, setCounting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const problem = dateProblem(from, to, today)

  React.useEffect(() => {
    setError(null)
    if (problem) {
      setCount(null)
      setCounting(false)
      return
    }
    let cancelled = false
    setCounting(true)
    const timer = window.setTimeout(async () => {
      try {
        const params = new URLSearchParams(query)
        params.set("from", from)
        params.set("to", to)
        const next = await automationRequest<AutomationExportCount>(getToken, "get", `/activity/export/count?${params.toString()}`)
        if (!cancelled) setCount(next)
      } catch (err) {
        if (!cancelled) {
          setCount(null)
          setError(automationError(err, "Could not count the rows to export"))
        }
      } finally {
        if (!cancelled) setCounting(false)
      }
    }, 250)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [from, getToken, problem, query, to])

  const rows = count?.rows ?? 0
  const message = problem || error
  const canExport = !message && !counting && !exporting && rows > 0
  const label = exporting
    ? "Exporting…"
    : counting
      ? "Counting rows…"
      : count && !message
        ? `Export ${rows.toLocaleString()} ${rows === 1 ? "row" : "rows"}`
        : "Export"

  return (
    <Dialog open onOpenChange={(open) => !open && !exporting && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Export CSV</DialogTitle>
          <DialogDescription>
            Downloads the {view === "events" ? "Events" : "Logs"} list for the dates you pick, using the filters set on this page. Dates and times are in Mountain Time.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="automation-export-from" className={LABEL_CLASS}>Start date</label>
              <Input id="automation-export-from" type="date" value={from} max={to && to < today ? to : today} disabled={exporting} onChange={(event) => setFrom(event.target.value)} className="h-10 text-sm" />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="automation-export-to" className={LABEL_CLASS}>End date</label>
              <Input id="automation-export-to" type="date" value={to} min={from || undefined} max={today} disabled={exporting} onChange={(event) => setTo(event.target.value)} className="h-10 text-sm" />
            </div>
          </div>
          {message ? (
            <p role="alert" className="text-xs text-red-600 dark:text-red-400">{message}</p>
          ) : count && !counting && count.total === 0 ? (
            <p role="status" className="text-xs text-muted-foreground">Nothing to export for these dates.</p>
          ) : count && !counting && count.total > count.limit ? (
            <p role="status" className="text-xs text-amber-700 dark:text-amber-300">
              These dates have {count.total.toLocaleString()} rows. One file can hold the newest {count.limit.toLocaleString()}, so pick fewer days to get them all.
            </p>
          ) : null}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={exporting}>Cancel</Button>
          <Button type="button" onClick={() => onExport(from, to)} disabled={!canExport}>
            {counting || exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            {label}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
