"use client"

import * as React from "react"
import { AlertTriangle, Loader2, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { apiClient } from "@/lib/api-client"
import { useAuth } from "@/providers/AuthProvider"
import { cn } from "@/lib/utils"
import { fmtLongDateTimeMDT } from "@/lib/timezone"

const STATUS_TABS = ["ALL", "blocked", "sent", "failed", "skipped"] as const
type StatusTab = (typeof STATUS_TABS)[number]

interface ReengagementLog {
  id: string
  vehicleLabel: string
  leadVehicleLabel?: string
  leadName: string
  leadPhone: string
  finalMessage?: string
  status: "blocked" | "sent" | "failed" | "skipped"
  blockedReason?: string
  classifierVerdict?: "SAFE" | "UNSAFE" | "ERROR"
  failureReason?: string
  sentAt?: string
  createdAt: string
}

function getErrorMessage(error: unknown, fallback: string) {
  return (
    (error as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback
  )
}

const STATUS_STYLE: Record<ReengagementLog["status"], string> = {
  blocked: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  sent: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  failed: "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300",
  skipped: "border-muted-foreground/30 bg-muted text-muted-foreground",
}

function LogRow({ log, onSendAnyway, busy }: { log: ReengagementLog; onSendAnyway: (id: string) => void; busy: boolean }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold">{log.leadName}</h3>
            <Badge variant="outline" className={cn("capitalize", STATUS_STYLE[log.status])}>
              {log.status}
            </Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Matched: {log.vehicleLabel}
            {log.leadVehicleLabel ? ` · Previously asked about: ${log.leadVehicleLabel}` : ""}
          </p>
          {log.finalMessage && (
            <p className="mt-2 max-w-xl rounded-lg bg-muted/50 p-2 text-xs">{log.finalMessage}</p>
          )}
          {log.status === "blocked" && log.blockedReason && (
            <p className="mt-1.5 flex items-start gap-1.5 text-xs text-amber-600 dark:text-amber-400">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              Blocked: {log.blockedReason}
              {log.classifierVerdict ? ` (safety check: ${log.classifierVerdict})` : ""}
            </p>
          )}
          {log.status === "failed" && log.failureReason && (
            <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">Failed: {log.failureReason}</p>
          )}
          {log.status === "skipped" && log.failureReason && (
            <p className="mt-1.5 text-xs text-muted-foreground">Skipped: {log.failureReason}</p>
          )}
          <p className="mt-1.5 text-[11px] text-muted-foreground">
            {log.leadPhone} · {fmtLongDateTimeMDT(log.sentAt || log.createdAt)}
          </p>
        </div>
        {log.status === "blocked" && (
          <Button size="sm" variant="outline" disabled={busy} onClick={() => onSendAnyway(log.id)}>
            {busy ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
            Send anyway
          </Button>
        )}
      </div>
    </div>
  )
}

export default function VehicleReengagementPage() {
  const { getToken } = useAuth()

  const [tab, setTab] = React.useState<StatusTab>("blocked")
  const [logs, setLogs] = React.useState<ReengagementLog[]>([])
  const [counts, setCounts] = React.useState<Record<string, number>>({})
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState("")
  const [busyId, setBusyId] = React.useState("")

  const loadLogs = React.useCallback(async () => {
    try {
      const t = await getToken()
      const res = await apiClient.get("/api/crm/vehicle-reengagement", {
        params: tab === "ALL" ? {} : { status: tab },
        headers: { Authorization: `Bearer ${t}` },
      })
      const data = res.data?.data || res.data
      setLogs(data?.data || [])
      setCounts(data?.counts || {})
    } catch (err) {
      setError(getErrorMessage(err, "Could not load re-engagement messages."))
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

  const handleSendAnyway = async (id: string) => {
    setBusyId(id)
    setError("")
    try {
      const t = await getToken()
      await apiClient.post(
        `/api/crm/vehicle-reengagement/${id}/send-anyway`,
        {},
        { headers: { Authorization: `Bearer ${t}` } },
      )
      await loadLogs()
    } catch (err) {
      setError(getErrorMessage(err, "Could not send this message."))
    } finally {
      setBusyId("")
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5 p-4 sm:p-6">
      <div>
        <h1 className="flex items-center gap-2 text-lg font-semibold">
          <RefreshCw className="h-5 w-5 text-emerald-500" />
          Vehicle Re-engagement
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          AI-drafted texts to past leads when a matching vehicle arrives. Blocked messages need a human before they go out.
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
            <LogRow key={log.id} log={log} onSendAnyway={handleSendAnyway} busy={busyId === log.id} />
          ))}
        </div>
      )}
    </div>
  )
}
