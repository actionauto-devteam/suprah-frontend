"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Loader2, Megaphone, Send, Users, X, CalendarClock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { apiClient } from "@/lib/api-client"
import { useAuth, useUser } from "@/providers/AuthProvider"
import { cn } from "@/lib/utils"
import { fmtLongDateTimeMDT, parseDatetimeLocalAsMdt } from "@/lib/timezone"
import { LEAD_STATUS_VALUES } from "@/lib/leadStatus"

const STATUS_OPTIONS = LEAD_STATUS_VALUES
const OPT_OUT_LINE = "Reply STOP to opt out."
const MAX_MESSAGE_LENGTH = 1000

interface Campaign {
  _id: string
  name: string
  message: string
  audienceStatuses: string[]
  status: "queued" | "scheduled" | "sending" | "completed" | "cancelled" | "failed"
  scheduledAt?: string
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
  queued: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  scheduled: "border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300",
  sending: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  completed: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  cancelled: "border-muted-foreground/30 bg-muted text-muted-foreground",
  failed: "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300",
}

const STATUS_LABEL: Record<Campaign["status"], string> = {
  queued: "Processing",
  scheduled: "Scheduled",
  sending: "Processing",
  completed: "Completed",
  cancelled: "Cancelled",
  failed: "Failed",
}

function CampaignRow({
  campaign,
  onCancel,
  onReschedule,
  busy,
  isAdmin,
}: {
  campaign: Campaign
  onCancel: (id: string) => void
  onReschedule: (campaign: Campaign) => void
  busy: boolean
  isAdmin: boolean
}) {
  const progress = campaign.totalRecipients > 0
    ? Math.round(((campaign.sentCount + campaign.failedCount + campaign.skippedCount) / campaign.totalRecipients) * 100)
    : 0
  const canCancel = isAdmin && (campaign.status === "queued" || campaign.status === "scheduled" || campaign.status === "sending")
  const canReschedule = isAdmin && (campaign.status === "queued" || campaign.status === "scheduled")

  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold">{campaign.name}</h3>
            <Badge variant="outline" className={STATUS_STYLE[campaign.status]}>
              {STATUS_LABEL[campaign.status]}
            </Badge>
          </div>
          <p className="mt-1 line-clamp-2 max-w-xl text-xs text-muted-foreground">{campaign.message}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {campaign.createdByName} · {fmtLongDateTimeMDT(campaign.createdAt)}
            {campaign.audienceStatuses.length > 0 ? ` · ${campaign.audienceStatuses.join(", ")}` : " · All statuses"}
          </p>
          {campaign.status === "scheduled" && campaign.scheduledAt && (
            <p className="mt-1 flex items-center gap-1 text-[11px] font-medium text-violet-600 dark:text-violet-400">
              <CalendarClock className="h-3 w-3" />
              Scheduled for {fmtLongDateTimeMDT(campaign.scheduledAt)} (Mountain Time)
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <div className="text-right text-xs">
            <p className="font-semibold">{campaign.sentCount}/{campaign.totalRecipients} sent</p>
            {campaign.failedCount > 0 && <p className="text-red-600 dark:text-red-400">{campaign.failedCount} failed</p>}
            {campaign.skippedCount > 0 && <p className="text-muted-foreground">{campaign.skippedCount} skipped (opted out)</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            {canReschedule && (
              <Button size="sm" variant="outline" disabled={busy} onClick={() => onReschedule(campaign)}>
                Reschedule
              </Button>
            )}
            {canCancel && (
              <Button size="sm" variant="outline" disabled={busy} onClick={() => onCancel(campaign._id)}>
                Cancel
              </Button>
            )}
          </div>
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

function RescheduleDialog({
  campaign,
  busy,
  onClose,
  onConfirm,
}: {
  campaign: Campaign
  busy: boolean
  onClose: () => void
  onConfirm: (scheduledAtIso: string) => void
}) {
  const [value, setValue] = React.useState("")
  const [error, setError] = React.useState("")

  const handleConfirm = () => {
    const parsed = parseDatetimeLocalAsMdt(value)
    if (!parsed) {
      setError("Pick a valid date and time.")
      return
    }
    if (parsed.getTime() < Date.now() + 30_000) {
      setError("Scheduled time must be at least 30 seconds in the future.")
      return
    }
    setError("")
    onConfirm(parsed.toISOString())
  }

  return (
    <div
      className="fixed inset-0 z-[2147483000] flex items-center justify-center bg-black/60 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onClose()
      }}
    >
      <div className="w-full max-w-sm rounded-xl border bg-card p-5 shadow-xl">
        <div className="mb-3 flex items-start justify-between gap-3">
          <h3 className="text-base font-semibold">Reschedule &quot;{campaign.name}&quot;</h3>
          <Button variant="ghost" size="icon" onClick={onClose} disabled={busy} aria-label="Close">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <label className="text-sm font-semibold">New date &amp; time</label>
        <p className="mb-1.5 text-[11px] text-muted-foreground">Mountain Time (America/Denver)</p>
        <Input
          type="datetime-local"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          disabled={busy}
        />
        {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={busy || !value}>
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save new time
          </Button>
        </div>
      </div>
    </div>
  )
}

export function SmsCampaignsPanel({ hideHeader = false }: { hideHeader?: boolean } = {}) {
  const router = useRouter()
  const { getToken } = useAuth()
  const { user } = useUser()
  const isAdmin = user?.role === "admin"

  const [campaigns, setCampaigns] = React.useState<Campaign[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState("")
  const [busyId, setBusyId] = React.useState("")
  const [rescheduleTarget, setRescheduleTarget] = React.useState<Campaign | null>(null)

  const [name, setName] = React.useState("")
  const [message, setMessage] = React.useState(`\n\n${OPT_OUT_LINE}`)
  const [statuses, setStatuses] = React.useState<string[]>([])
  const [selectAllLeads, setSelectAllLeads] = React.useState(false)
  const [audienceCount, setAudienceCount] = React.useState<number | null>(null)
  const [scheduleEnabled, setScheduleEnabled] = React.useState(false)
  const [scheduledAtInput, setScheduledAtInput] = React.useState("")
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

  const effectiveStatuses = selectAllLeads ? [] : statuses

  React.useEffect(() => {
    let cancelled = false
    const timer = window.setTimeout(async () => {
      try {
        const t = await getToken()
        const res = await apiClient.get("/api/crm/sms-campaigns/audience-count", {
          params: effectiveStatuses.length > 0 ? { statuses: effectiveStatuses.join(",") } : {},
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectAllLeads, statuses, getToken])

  const toggleStatus = (status: string) => {
    setStatuses((prev) => (prev.includes(status) ? prev.filter((value) => value !== status) : [...prev, status]))
  }

  const messageIncludesOptOut = message.toLowerCase().includes("stop")
  const canReview = isAdmin && name.trim().length > 0 && message.trim().length > 0 && messageIncludesOptOut

  const handleSend = async () => {
    setSending(true)
    setFormError("")
    try {
      const t = await getToken()
      const payload: Record<string, unknown> = { name: name.trim(), message: message.trim(), statuses: effectiveStatuses }
      if (scheduleEnabled) {
        const parsed = parseDatetimeLocalAsMdt(scheduledAtInput)
        if (!parsed || parsed.getTime() < Date.now() + 30_000) {
          setFormError("Pick a valid send time at least 30 seconds in the future.")
          setSending(false)
          return
        }
        payload.scheduledAt = parsed.toISOString()
      }
      await apiClient.post("/api/crm/sms-campaigns", payload, { headers: { Authorization: `Bearer ${t}` } })
      setName("")
      setMessage(`\n\n${OPT_OUT_LINE}`)
      setStatuses([])
      setSelectAllLeads(false)
      setScheduleEnabled(false)
      setScheduledAtInput("")
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

  const handleReschedule = async (scheduledAtIso: string) => {
    if (!rescheduleTarget) return
    setBusyId(rescheduleTarget._id)
    try {
      const t = await getToken()
      await apiClient.patch(
        `/api/crm/sms-campaigns/${rescheduleTarget._id}/reschedule`,
        { scheduledAt: scheduledAtIso },
        { headers: { Authorization: `Bearer ${t}` } },
      )
      setRescheduleTarget(null)
      await loadCampaigns()
    } catch (err) {
      setError(getErrorMessage(err, "Could not reschedule this campaign."))
    } finally {
      setBusyId("")
    }
  }

  return (
    <div className={hideHeader ? "contents" : "h-full overflow-y-auto"}>
      <div className={hideHeader ? "space-y-6" : "mx-auto max-w-5xl space-y-6 p-4 sm:p-6"}>
        {!hideHeader && (
          <>
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
          </>
        )}

        {!isAdmin && (
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-700 dark:text-amber-300">
            Admin access required to create, cancel, or reschedule SMS campaigns. You can still view campaign history below.
          </div>
        )}

        {isAdmin && (
        <section className="space-y-3 rounded-2xl border bg-card p-4 sm:p-6">
          <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">New campaign</h2>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold">Campaign name</label>
            <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. September Trade-In Push" maxLength={120} />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold">Audience</label>
              <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <input
                  type="checkbox"
                  checked={selectAllLeads}
                  onChange={(event) => setSelectAllLeads(event.target.checked)}
                />
                Select All Leads
              </label>
            </div>
            <p className="text-[11px] text-muted-foreground">
              {selectAllLeads ? "Every eligible lead with a phone number will be included, regardless of status." : "Leave all unchecked to include every status."}
            </p>
            <div className={cn("flex flex-wrap gap-2 pt-1", selectAllLeads && "opacity-40")}>
              {STATUS_OPTIONS.map((status) => (
                <button
                  key={status}
                  type="button"
                  disabled={selectAllLeads}
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
            </p>
            {audienceCount !== null && audienceCount > 500 && (
              <p className="text-xs font-medium text-amber-600 dark:text-amber-400">
                This audience has {audienceCount} eligible leads, over the 500-recipient safe sending limit. Narrow your
                status filter before sending.
              </p>
            )}
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

          <div className="space-y-1.5 rounded-xl border bg-muted/20 p-3">
            <label className="flex items-center gap-2 text-sm font-semibold">
              <input
                type="checkbox"
                checked={scheduleEnabled}
                onChange={(event) => setScheduleEnabled(event.target.checked)}
              />
              <CalendarClock className="h-4 w-4" />
              Schedule for later
            </label>
            {scheduleEnabled && (
              <div className="space-y-1">
                <p className="text-[11px] text-muted-foreground">Mountain Time (America/Denver)</p>
                <Input
                  type="datetime-local"
                  value={scheduledAtInput}
                  onChange={(event) => setScheduledAtInput(event.target.value)}
                  className="max-w-xs"
                />
              </div>
            )}
          </div>

          {formError && <p className="text-sm text-red-500">{formError}</p>}

          <div className="pt-2">
            <Button disabled={!canReview || (scheduleEnabled && !scheduledAtInput)} onClick={() => setConfirming(true)}>
              <Send className="mr-2 h-4 w-4" />
              Review &amp; {scheduleEnabled ? "schedule" : "send"}
            </Button>
          </div>
        </section>
        )}

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
                <CampaignRow
                  key={campaign._id}
                  campaign={campaign}
                  onCancel={handleCancel}
                  onReschedule={setRescheduleTarget}
                  busy={busyId === campaign._id}
                  isAdmin={isAdmin}
                />
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
                <h3 className="text-base font-semibold">{scheduleEnabled ? "Schedule this campaign?" : "Send this campaign?"}</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  This will text {audienceCount ?? "…"} lead{audienceCount === 1 ? "" : "s"}
                  {scheduleEnabled ? " at the scheduled time." : ". This can't be undone once messages start sending."}
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
                {scheduleEnabled ? "Schedule" : "Send"} for {audienceCount ?? "…"} lead{audienceCount === 1 ? "" : "s"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {rescheduleTarget && (
        <RescheduleDialog
          campaign={rescheduleTarget}
          busy={busyId === rescheduleTarget._id}
          onClose={() => setRescheduleTarget(null)}
          onConfirm={handleReschedule}
        />
      )}
    </div>
  )
}
