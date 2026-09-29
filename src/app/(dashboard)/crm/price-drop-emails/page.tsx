"use client"

import * as React from "react"
import { Loader2, TrendingDown } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { apiClient } from "@/lib/api-client"
import { useAuth } from "@/providers/AuthProvider"
import { cn } from "@/lib/utils"
import { fmtLongDateTimeMDT } from "@/lib/timezone"

const STATUS_TABS = ["ALL", "sent", "skipped", "failed"] as const
type StatusTab = (typeof STATUS_TABS)[number]

interface PriceDropLog {
  id: string
  vehicleLabel: string
  leadEmail: string
  previousPrice: number
  newPrice: number
  matchMethod: "vin" | "stock" | "fuzzy"
  status: "sent" | "skipped" | "failed"
  skippedReason?: string
  failureReason?: string
  sentAt?: string
  createdAt: string
}

function getErrorMessage(error: unknown, fallback: string) {
  return (error as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback
}

const STATUS_STYLE: Record<PriceDropLog["status"], string> = {
  sent: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  failed: "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300",
  skipped: "border-muted-foreground/30 bg-muted text-muted-foreground",
}

function formatPrice(value: number) {
  return `$${Math.round(value).toLocaleString("en-US")}`
}

function LogRow({ log }: { log: PriceDropLog }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold">{log.vehicleLabel}</h3>
            <Badge variant="outline" className={cn("capitalize", STATUS_STYLE[log.status])}>
              {log.status}
            </Badge>
            <Badge variant="outline" className="text-[10px] uppercase">
              {log.matchMethod} match
            </Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {log.leadEmail} · <span className="line-through">{formatPrice(log.previousPrice)}</span>{" "}
            <span className="font-semibold text-foreground">{formatPrice(log.newPrice)}</span>
          </p>
          {log.status === "failed" && log.failureReason && (
            <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">Failed: {log.failureReason}</p>
          )}
          {log.status === "skipped" && log.skippedReason && (
            <p className="mt-1.5 text-xs text-muted-foreground">Skipped: {log.skippedReason}</p>
          )}
          <p className="mt-1.5 text-[11px] text-muted-foreground">
            {fmtLongDateTimeMDT(log.sentAt || log.createdAt)}
          </p>
        </div>
      </div>
    </div>
  )
}

export default function PriceDropEmailsPage() {
  const { getToken } = useAuth()

  const [tab, setTab] = React.useState<StatusTab>("ALL")
  const [logs, setLogs] = React.useState<PriceDropLog[]>([])
  const [counts, setCounts] = React.useState<Record<string, number>>({})
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState("")

  const loadLogs = React.useCallback(async () => {
    try {
      const t = await getToken()
      const res = await apiClient.get("/api/crm/price-drop-emails", {
        params: tab === "ALL" ? {} : { status: tab },
        headers: { Authorization: `Bearer ${t}` },
      })
      const data = res.data?.data || res.data
      setLogs(data?.data || [])
      setCounts(data?.counts || {})
    } catch (err) {
      setError(getErrorMessage(err, "Could not load price drop emails."))
    } finally {
      setLoading(false)
    }
  }, [getToken, tab])

  React.useEffect(() => {
    setLoading(true)
    void loadLogs()
    const interval = window.setInterval(() => void loadLogs(), 15000)
    return () => window.clearInterval(interval)
  }, [loadLogs])

  return (
    <div className="mx-auto max-w-3xl space-y-5 p-4 sm:p-6">
      <div>
        <h1 className="flex items-center gap-2 text-lg font-semibold">
          <TrendingDown className="h-5 w-5 text-emerald-500" />
          Price Drop Emails
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Automated emails to leads when the vehicle they asked about gets a price cut.
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {STATUS_TABS.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setTab(value)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-semibold capitalize transition-colors",
              tab === value ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground",
            )}
          >
            {value === "ALL" ? "All" : value} ({counts[value] ?? 0})
          </button>
        ))}
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : logs.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">Nothing here yet.</p>
      ) : (
        <div className="space-y-3">
          {logs.map((log) => (
            <LogRow key={log.id} log={log} />
          ))}
        </div>
      )}
    </div>
  )
}
