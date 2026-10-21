"use client"

import * as React from "react"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { apiClient } from "@/lib/api-client"
import { useAuth } from "@/providers/AuthProvider"

interface RecoveryPreview {
  taskId: string
  leadId: string
  channel: "sms" | "webchat" | "email"
  reason: string
  canRecover: boolean
  eligible: boolean
  blockers: Array<{ code: string; message: string }>
  messagesSinceIncident: number | null
  requiresEmailThreadReview?: boolean
}

function errorMessage(error: unknown, fallback: string) {
  return (error as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback
}

function waitingText(preview: RecoveryPreview, agentName: string) {
  if (preview.messagesSinceIncident === null) {
    return `Suprah cannot see new email replies, so it has not checked this thread. Open the latest email thread and review it yourself. ${agentName} will not reply to the inquiry that failed the check.`
  }
  const count = preview.messagesSinceIncident
  return `${count} customer message${count === 1 ? "" : "s"} arrived since the check failed. ${agentName} will not reply to ${count === 1 ? "it" : "any of them"}.`
}

export function TechnicalRecoveryDialog({
  taskId,
  agentName,
  onOpenChange,
  onRecovered,
}: {
  taskId: string | null
  agentName: string
  onOpenChange: (open: boolean) => void
  onRecovered: (taskId: string) => void
}) {
  const { getToken } = useAuth()
  const [preview, setPreview] = React.useState<RecoveryPreview | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [submitting, setSubmitting] = React.useState(false)
  const [reviewed, setReviewed] = React.useState(false)
  const [error, setError] = React.useState("")

  const loadPreview = React.useCallback(async (id: string) => {
    setLoading(true)
    setReviewed(false)
    try {
      const t = await getToken()
      const res = await apiClient.get(`/api/crm/ai-agent-tasks/${id}/recovery`, { headers: { Authorization: `Bearer ${t}` } })
      setPreview(res.data?.data || res.data)
    } catch (err) {
      setPreview(null)
      setError(errorMessage(err, "Could not check this conversation."))
    } finally {
      setLoading(false)
    }
  }, [getToken])

  React.useEffect(() => {
    setError("")
    setPreview(null)
    if (taskId) void loadPreview(taskId)
  }, [taskId, loadPreview])

  const handleResume = async () => {
    if (!taskId || !preview) return
    setSubmitting(true)
    setError("")
    try {
      const t = await getToken()
      await apiClient.post(`/api/crm/ai-agent-tasks/${taskId}/recover`, {
        acknowledged: true,
        acknowledgedMessageCount: preview.messagesSinceIncident,
        ...(preview.requiresEmailThreadReview ? { emailThreadReviewed: true } : {}),
      }, { headers: { Authorization: `Bearer ${t}` } })
      onRecovered(taskId)
      onOpenChange(false)
    } catch (err) {
      setError(errorMessage(err, "Could not resume this conversation."))
      await loadPreview(taskId)
    } finally {
      setSubmitting(false)
    }
  }

  const ready = Boolean(preview?.canRecover && preview.eligible)

  return (
    <Dialog open={Boolean(taskId)} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-1rem)] sm:max-w-md max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Resume {agentName} after a technical failure</DialogTitle>
          <DialogDescription>
            {agentName} paused because its safety check could not run. Resuming lets {agentName} answer new messages only.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : preview ? (
          <div className="space-y-3 text-sm">
            <p className="rounded-lg border bg-muted/40 px-3 py-2">{preview.reason}</p>
            {!preview.canRecover && (
              <p className="text-amber-600 dark:text-amber-400">Only managers and admins can resume a conversation after a technical failure.</p>
            )}
            {preview.blockers.length > 0 ? (
              <ul className="list-disc space-y-1 pl-5 text-amber-600 dark:text-amber-400" aria-label="Why this cannot be resumed here">
                {preview.blockers.map((blocker) => <li key={blocker.code}>{blocker.message}</li>)}
              </ul>
            ) : (
              <p>{waitingText(preview, agentName)}</p>
            )}
            {ready && (
              <label className="flex items-start gap-2">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4"
                  checked={reviewed}
                  onChange={(event) => setReviewed(event.target.checked)}
                />
                <span>
                  {preview.requiresEmailThreadReview
                    ? "I opened the latest email thread, reviewed it myself, and someone will follow up on it."
                    : "I reviewed the messages in this conversation and someone will follow up on them."}
                </span>
              </label>
            )}
            <a href={`/crm/leads?leadId=${preview.leadId}`} className="inline-block text-xs text-primary hover:underline">
              Open lead
            </a>
          </div>
        ) : null}

        {error && <p className="text-sm text-red-500" role="alert">{error}</p>}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleResume} disabled={!ready || !reviewed || submitting}>
            {submitting && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
            Resume {agentName}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
