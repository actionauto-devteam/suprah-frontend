"use client"

import * as React from "react"
import { Bot, Check, Loader2, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { apiClient } from "@/lib/api-client"
import { useAuth } from "@/providers/AuthProvider"
import { fmtLongDateTimeMDT } from "@/lib/timezone"

interface AiAgentTask {
  id: string
  leadId: string
  channel: "webchat" | "sms"
  question: string
  waitingSince: string
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

function TaskRow({ task, onAction, busy }: { task: AiAgentTask; onAction: (id: string, action: "resolve" | "dismiss") => void; busy: boolean }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Bot className="h-4 w-4 text-fuchsia-500" />
            <Badge variant="outline" className="uppercase">
              {task.channel}
            </Badge>
            <span className="text-xs text-muted-foreground">→ {assigneeLabel(task)}</span>
          </div>
          <p className="mt-1.5 max-w-xl text-sm">{task.question}</p>
          <a href={`/crm/leads?leadId=${task.leadId}`} className="mt-1.5 inline-block text-xs text-primary hover:underline">
            Open lead
          </a>
          <p className="mt-1 text-[11px] text-muted-foreground">Waiting since {fmtLongDateTimeMDT(task.waitingSince)}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
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

  const loadTasks = React.useCallback(async () => {
    try {
      const t = await getToken()
      const res = await apiClient.get("/api/crm/ai-agent-tasks", {
        params: { status: "pending" },
        headers: { Authorization: `Bearer ${t}` },
      })
      const data = res.data?.data || res.data
      setTasks(data?.data || [])
    } catch (err) {
      setError(getErrorMessage(err, "Could not load AI agent tasks."))
    } finally {
      setLoading(false)
    }
  }, [getToken])

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
          Things Alex flagged for a human to follow up on, oldest first.
        </p>
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
            <TaskRow key={task.id} task={task} onAction={handleAction} busy={busyId === task.id} />
          ))}
        </div>
      )}
    </div>
  )
}
