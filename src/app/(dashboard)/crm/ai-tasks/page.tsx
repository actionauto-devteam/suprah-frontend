"use client"

import * as React from "react"
import { Bot, Check, ChevronLeft, ChevronRight, Loader2, Play, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { apiClient } from "@/lib/api-client"
import { useAuth } from "@/providers/AuthProvider"
import { fmtLongDateTimeMDT } from "@/lib/timezone"
import { TechnicalRecoveryDialog } from "@/components/crm/TechnicalRecoveryDialog"

type TaskKindFilter = "all" | "customer" | "technical"

const PAGE_SIZE = 25

function kindFromUrl(): TaskKindFilter {
  if (typeof window === "undefined") return "all"
  const value = new URLSearchParams(window.location.search).get("kind")
  return value === "customer" || value === "technical" ? value : "all"
}

const KIND_FILTERS: Array<{ key: TaskKindFilter; label: string }> = [
  { key: "all", label: "All" },
  { key: "customer", label: "Customer requests" },
  { key: "technical", label: "Technical" },
]

interface AiAgentTask {
  id: string
  leadId: string
  channel: "webchat" | "sms" | "email"
  question: string
  waitingSince: string
  attentionKind?: "customer" | "technical"
  notificationsSuppressedAt?: string
  assigneeIds?: Array<{ _id: string; fullName?: string; name?: string; email?: string }>
}

function getErrorMessage(error: unknown, fallback: string) {
  return (error as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback
}

function assigneeLabel(task: AiAgentTask): string {
  const assignee = task.assigneeIds?.[0]
  if (!assignee) return "Unassigned"
  return assignee.fullName || assignee.name || assignee.email || "Unassigned"
}

function TaskRow({ task, onAction, onRecover, busy }: {
  task: AiAgentTask
  onAction: (id: string, action: "resolve" | "dismiss") => void
  onRecover: (id: string) => void
  busy: boolean
}) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Bot className="h-4 w-4 text-fuchsia-500" />
            <Badge variant="outline" className="uppercase">
              {task.channel}
            </Badge>
            {task.attentionKind === "technical" && (
              <Badge variant="outline" className="border-zinc-300 bg-zinc-50 text-zinc-700 dark:border-zinc-500/40 dark:bg-zinc-400/10 dark:text-zinc-300">
                Technical
              </Badge>
            )}
            <span className="text-xs text-muted-foreground">→ {assigneeLabel(task)}</span>
          </div>
          <p className="mt-1.5 max-w-xl text-sm">{task.question}</p>
          <a href={`/crm/leads?leadId=${task.leadId}`} className="mt-1.5 inline-block text-xs text-primary hover:underline">
            Open lead
          </a>
          <p className="mt-1 text-[11px] text-muted-foreground">Waiting since {fmtLongDateTimeMDT(task.waitingSince)}</p>
          {task.notificationsSuppressedAt && (
            <p className="mt-0.5 text-[11px] text-muted-foreground">Training mode: no staff notification was sent.</p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {task.attentionKind === "technical" && (
            <button
              type="button"
              onClick={() => onRecover(task.id)}
              disabled={busy}
              className="flex h-8 items-center gap-1 rounded-lg border px-2.5 text-xs font-medium transition hover:bg-muted disabled:opacity-50"
              title="Resume after technical failure"
            >
              <Play className="h-3.5 w-3.5" />
              Resume
            </button>
          )}
          <button
            type="button"
            onClick={() => onAction(task.id, "resolve")}
            disabled={busy}
            className="flex h-8 w-8 items-center justify-center rounded-lg border text-emerald-600 transition hover:bg-emerald-500/10 disabled:opacity-50"
            title="Mark resolved"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={() => onAction(task.id, "dismiss")}
            disabled={busy}
            className="flex h-8 w-8 items-center justify-center rounded-lg border text-muted-foreground transition hover:bg-muted disabled:opacity-50"
            title="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AiTasksPage() {
  const { getToken } = useAuth()
  const [tasks, setTasks] = React.useState<AiAgentTask[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState("")
  const [busyId, setBusyId] = React.useState("")
  const [agentName, setAgentName] = React.useState("Alex")
  const [kind, setKind] = React.useState<TaskKindFilter>("all")
  const [page, setPage] = React.useState(1)
  const [total, setTotal] = React.useState(0)
  const [totalPages, setTotalPages] = React.useState(1)
  const [recoverTaskId, setRecoverTaskId] = React.useState<string | null>(null)

  React.useEffect(() => {
    const initial = kindFromUrl()
    if (initial !== "all") setKind(initial)
  }, [])

  React.useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const t = await getToken()
        const res = await apiClient.get("/api/crm/org-settings", { headers: { Authorization: `Bearer ${t}` } })
        const data = res.data?.data || res.data
        if (!cancelled && data?.aiAgentName) setAgentName(data.aiAgentName)
      } catch {
        // Keep the "Alex" fallback if settings can't be loaded.
      }
    })()
    return () => { cancelled = true }
  }, [getToken])

  const requestRef = React.useRef(0)

  const loadTasks = React.useCallback(async () => {
    const requestId = ++requestRef.current
    try {
      const t = await getToken()
      const res = await apiClient.get("/api/crm/ai-agent-tasks", {
        params: { status: "pending", page, limit: PAGE_SIZE, ...(kind === "all" ? {} : { kind }) },
        headers: { Authorization: `Bearer ${t}` },
      })
      if (requestRef.current !== requestId) return
      const data = res.data?.data || res.data
      setTasks(data?.data || [])
      setTotal(Number(data?.total) || 0)
      setTotalPages(Math.max(1, Number(data?.totalPages) || 1))
      if (data?.page && data.page !== page) setPage(data.page)
    } catch (err) {
      if (requestRef.current !== requestId) return
      setError(getErrorMessage(err, "Could not load AI agent tasks."))
    } finally {
      if (requestRef.current === requestId) setLoading(false)
    }
  }, [getToken, kind, page])

  React.useEffect(() => {
    void loadTasks()
    const interval = window.setInterval(() => void loadTasks(), 15000)
    return () => window.clearInterval(interval)
  }, [loadTasks])

  const handleAction = async (id: string, action: "resolve" | "dismiss") => {
    setBusyId(id)
    try {
      const t = await getToken()
      await apiClient.post(`/api/crm/ai-agent-tasks/${id}/${action}`, {}, { headers: { Authorization: `Bearer ${t}` } })
      setTasks((prev) => prev.filter((task) => task.id !== id))
      void loadTasks()
    } catch (err) {
      setError(getErrorMessage(err, "Could not update this task."))
    } finally {
      setBusyId("")
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5 p-4 sm:p-6">
      <div>
        <h1 className="flex items-center gap-2 text-lg font-semibold">
          <Bot className="h-5 w-5 text-fuchsia-500" />
          AI Agent Tasks
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Things {agentName} flagged for a human to follow up on, newest first.
        </p>
      </div>

      <div className="flex gap-1.5 overflow-x-auto" role="tablist" aria-label="Task type">
        {KIND_FILTERS.map((filter) => (
          <button
            key={filter.key}
            type="button"
            role="tab"
            aria-selected={kind === filter.key}
            onClick={() => { setLoading(true); setPage(1); setKind(filter.key) }}
            className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition ${
              kind === filter.key ? "border-primary bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-muted"
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : tasks.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">Nothing waiting on you right now.</p>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => (
            <TaskRow key={task.id} task={task} onAction={handleAction} onRecover={setRecoverTaskId} busy={busyId === task.id} />
          ))}
        </div>
      )}

      {!loading && total > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>
            Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => { setLoading(true); setPage((current) => Math.max(1, current - 1)) }}
              disabled={page <= 1}
              className="flex h-8 w-8 items-center justify-center rounded-lg border transition hover:bg-muted disabled:opacity-40"
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span>Page {page} of {totalPages}</span>
            <button
              type="button"
              onClick={() => { setLoading(true); setPage((current) => Math.min(totalPages, current + 1)) }}
              disabled={page >= totalPages}
              className="flex h-8 w-8 items-center justify-center rounded-lg border transition hover:bg-muted disabled:opacity-40"
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <TechnicalRecoveryDialog
        taskId={recoverTaskId}
        agentName={agentName}
        onOpenChange={(open) => { if (!open) setRecoverTaskId(null) }}
        onRecovered={(id) => {
          setTasks((prev) => prev.filter((task) => task.id !== id))
          void loadTasks()
        }}
      />
    </div>
  )
}
