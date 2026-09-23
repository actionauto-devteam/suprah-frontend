"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Loader2, Megaphone, Send, Users, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { apiClient } from "@/lib/api-client"
import { useAuth } from "@/providers/AuthProvider"
import { cn } from "@/lib/utils"
import { fmtLongDateTimeMDT } from "@/lib/timezone"

const STATUS_OPTIONS = ["New", "Contacted", "Pending", "Appointment Set", "Closed"]
const OPT_OUT_LINE = "Reply STOP to opt out."
const MAX_MESSAGE_LENGTH = 1000

interface Campaign {
  _id: string
  name: string
  message: string
  audienceStatuses: string[]
  status: "queued" | "sending" | "completed" | "cancelled" | "failed"
  totalRecipients: number
  sentCount: number
  failedCount: number
  skippedCount: number
  createdByName: string
  createdAt: string
  completedAt?: string
}

function getErrorMessage(error: unknown, fallback: string) {
  return (
    (error as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback
  )
}

const STATUS_STYLE: Record<Campaign["status"], string> = {
  queued: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  sending: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  completed: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  cancelled: "border-muted-foreground/30 bg-muted text-muted-foreground",
  failed: "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300",
}

function CampaignRow({ campaign, onCancel, busy }: { campaign: Campaign; onCancel: (id: string) => void; busy: boolean }) {
  const progress = campaign.totalRecipients > 0
    ? Math.round(((campaign.sentCount + campaign.failedCount + campaign.skippedCount) / campaign.totalRecipients) * 100)
    : 0
  const canCancel = campaign.status === "queued" || campaign.status === "sending"

  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold">{campaign.name}</h3>
            <Badge variant="outline" className={cn("capitalize", STATUS_STYLE[campaign.status])}>
              {campaign.status}
            </Badge>
          </div>
          <p className="mt-1 line-clamp-2 max-w-xl text-xs text-muted-foreground">{campaign.message}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {campaign.createdByName} · {fmtLongDateTimeMDT(campaign.createdAt)}
            {campaign.audienceStatuses.length > 0 ? ` · ${campaign.audienceStatuses.join(", ")}` : " · All statuses"}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <div className="text-right text-xs">
            <p className="font-semibold">{campaign.sentCount}/{campaign.totalRecipients} sent</p>
            {campaign.failedCount > 0 && <p className="text-red-600 dark:text-red-400">{campaign.failedCount} failed</p>}
            {campaign.skippedCount > 0 && <p className="text-muted-foreground">{campaign.skippedCount} skipped (opted out)</p>}
          </div>
          {canCancel && (
            <Button size="sm" variant="outline" disabled={busy} onClick={() => onCancel(campaign._id)}>
              Cancel
            </Button>
          )}
        </div>
      </div>
      {(campaign.status === "queued" || campaign.status === "sending") && (
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
        </div>
      )}
    </div>
  )
}

export default function SmsCampaignsPage() {
  const router = useRouter()
  const { getToken } = useAuth()

  const [campaigns, setCampaigns] = React.useState<Campaign[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState("")
  const [busyId, setBusyId] = React.useState("")

  const [name, setName] = React.useState("")
  const [message, setMessage] = React.useState(`\n\n${OPT_OUT_LINE}`)
  const [statuses, setStatuses] = React.useState<string[]>([])
  const [audienceCount, setAudienceCount] = React.useState<number | null>(null)
  const [confirming, setConfirming] = React.useState(false)
  const [sending, setSending] = React.useState(false)
  const [formError, setFormError] = React.useState("")

  const loadCampaigns = React.useCallback(async () => {
    try {
      const t = await getToken()
      const res = await apiClient.get("/api/crm/sms-campaigns", { headers: { Authorization: `Bearer ${t}` } })
      const data = res.data?.data || res.data
      setCampaigns(data?.campaigns || [])
    } catch (err) {
      setError(getErrorMessage(err, "Could not load campaigns."))
    } finally {
      setLoading(false)
    }
  }, [getToken])

  React.useEffect(() => {
    void loadCampaigns()
    const interval = window.setInterval(() => void loadCampaigns(), 15000)
    return () => window.clearInterval(interval)
  }, [loadCampaigns])

  React.useEffect(() => {
    let cancelled = false
    const timer = window.setTimeout(async () => {
      try {
        const t = await getToken()
        const res = await apiClient.get("/api/crm/sms-campaigns/audience-count", {
          params: statuses.length > 0 ? { statuses: statuses.join(",") } : {},
          headers: { Authorization: `Bearer ${t}` },
        })
        if (cancelled) return
        const data = res.data?.data || res.data
        setAudienceCount(typeof data?.count === "number" ? data.count : null)
      } catch {
        if (!cancelled) setAudienceCount(null)
      }
    }, 300)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [statuses, getToken])

  const toggleStatus = (status: string) => {
    setStatuses((prev) => (prev.includes(status) ? prev.filter((value) => value !== status) : [...prev, status]))
  }

  const messageIncludesOptOut = message.toLowerCase().includes("stop")
  const canReview = name.trim().length > 0 && message.trim().length > 0 && messageIncludesOptOut

  const handleSend = async () => {
    setSending(true)
    setFormError("")
    try {
      const t = await getToken()
      await apiClient.post(
        "/api/crm/sms-campaigns",
        { name: name.trim(), message: message.trim(), statuses },
        { headers: { Authorization: `Bearer ${t}` } },
      )
      setName("")
      setMessage(`\n\n${OPT_OUT_LINE}`)
      setStatuses([])
      setConfirming(false)
      await loadCampaigns()
    } catch (err) {
      setFormError(getErrorMessage(err, "Could not send this campaign. Please try again."))
    } finally {
      setSending(false)
    }
  }

  const handleCancel = async (id: string) => {
    setBusyId(id)
    try {
      const t = await getToken()
      await apiClient.post(`/api/crm/sms-campaigns/${id}/cancel`, {}, { headers: { Authorization: `Bearer ${t}` } })
      await loadCampaigns()
    } catch (err) {
      setError(getErrorMessage(err, "Could not cancel this campaign."))
    } finally {
      setBusyId("")
    }
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push("/crm/leads")} aria-label="Back to leads">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-bold tracking-tight">SMS Campaigns</h1>
          </div>
        </div>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Send one text to a group of leads at once, by status. Opted-out numbers are skipped automatically, and
          messages send gradually in the background rather than all at once.
        </p>

        <section className="space-y-3 rounded-2xl border bg-card p-4 sm:p-6">
          <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">New campaign</h2>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold">Campaign name</label>
            <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. September Trade-In Push" maxLength={120} />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold">Audience</label>
            <p className="text-[11px] text-muted-foreground">Leave all unchecked to include every status.</p>
            <div className="flex flex-wrap gap-2 pt-1">
              {STATUS_OPTIONS.map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => toggleStatus(status)}
                  className={cn(
                    "h-8 rounded-full border px-3 text-xs font-medium transition-colors",
                    statuses.includes(status)
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background text-muted-foreground hover:text-foreground",
                  )}
                >
                  {status}
                </button>
              ))}
            </div>
            <p className="flex items-center gap-1.5 pt-1 text-xs text-muted-foreground">
              <Users className="h-3.5 w-3.5" />
              {audienceCount === null ? "Counting…" : `${audienceCount} lead${audienceCount === 1 ? "" : "s"} with a phone number`}
              {audienceCount !== null && audienceCount > 500 ? " (first 500 will be used)" : ""}
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold">Message</label>
            <Textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              rows={4}
              maxLength={MAX_MESSAGE_LENGTH}
              className="resize-none"
            />
            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span>Must include a &quot;Reply STOP to opt out&quot; line.</span>
              <span>{message.length}/{MAX_MESSAGE_LENGTH}</span>
            </div>
          </div>

          {formError && <p className="text-sm text-red-500">{formError}</p>}

          <div className="pt-2">
            <Button disabled={!canReview} onClick={() => setConfirming(true)}>
              <Send className="mr-2 h-4 w-4" />
              Review &amp; send
            </Button>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Past campaigns</h2>
          {error && <p className="text-sm text-red-500">{error}</p>}
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : campaigns.length === 0 ? (
            <p className="text-sm text-muted-foreground">No campaigns sent yet.</p>
          ) : (
            <div className="space-y-3">
              {campaigns.map((campaign) => (
                <CampaignRow key={campaign._id} campaign={campaign} onCancel={handleCancel} busy={busyId === campaign._id} />
              ))}
            </div>
          )}
        </section>
      </div>

      {confirming && (
        <div
          className="fixed inset-0 z-[2147483000] flex items-center justify-center bg-black/60 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !sending) setConfirming(false)
          }}
        >
          <div className="w-full max-w-md rounded-xl border bg-card p-5 shadow-xl">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold">Send this campaign?</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  This will text {audienceCount ?? "…"} lead{audienceCount === 1 ? "" : "s"}. This can&apos;t be undone
                  once messages start sending.
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setConfirming(false)} disabled={sending} aria-label="Close">
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="mb-4 rounded-lg border bg-muted/30 p-3 text-xs">
              <p className="font-semibold">{name}</p>
              <p className="mt-1 whitespace-pre-wrap text-muted-foreground">{message}</p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setConfirming(false)} disabled={sending}>
                Cancel
              </Button>
              <Button onClick={() => void handleSend()} disabled={sending}>
                {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                Send to {audienceCount ?? "…"} lead{audienceCount === 1 ? "" : "s"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
