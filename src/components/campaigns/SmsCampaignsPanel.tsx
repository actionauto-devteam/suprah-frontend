"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  AlertTriangle,
  ArrowLeft,
  CalendarClock,
  ChevronDown,
  ChevronUp,
  Loader2,
  Megaphone,
  MessageSquareText,
  Send,
  Users,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { useAlert } from "@/components/AlertDialog"
import { apiClient } from "@/lib/api-client"
import { useAuth, useUser } from "@/providers/AuthProvider"
import { cn } from "@/lib/utils"
import { fmtLongDateTimeMDT, parseDatetimeLocalAsMdt } from "@/lib/timezone"
import { LEAD_STATUS_VALUES } from "@/lib/leadStatus"
import { MultiSelectFilter } from "@/components/calendar/MultiSelectFilter"

const STATUS_OPTIONS = LEAD_STATUS_VALUES.map((status) => ({ value: status, label: status }))
const OPT_OUT_LINE = "Reply STOP to opt out."
const MAX_MESSAGE_LENGTH = 1000
const MAX_RECIPIENTS = 500

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

interface CampaignDetail {
  failedSample: Array<{ customerName?: string; phone: string; failureReason?: string }>
  deliveryStatusCounts: Record<string, number>
}

const DELIVERY_STATUS_LABEL: Record<string, string> = {
  accepted: "Accepted by carrier (not yet confirmed delivered)",
  delivered: "Delivered",
  delivery_failed: "Delivery failed",
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

function FormSection({
  step,
  title,
  description,
  children,
}: {
  step: number
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-2.5">
      <div className="flex items-start gap-2.5">
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
          {step}
        </span>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold leading-5">{title}</h3>
          {description && <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{description}</p>}
        </div>
      </div>
      <div className="pl-7.5">{children}</div>
    </div>
  )
}

function CampaignRow({
  campaign,
  onCancel,
  onReschedule,
  busy,
  isAdmin,
  expanded,
  detail,
  detailLoading,
  onToggleDetail,
}: {
  campaign: Campaign
  onCancel: (id: string) => void
  onReschedule: (campaign: Campaign) => void
  busy: boolean
  isAdmin: boolean
  expanded: boolean
  detail?: CampaignDetail
  detailLoading: boolean
  onToggleDetail: (id: string) => void
}) {
  const progress = campaign.totalRecipients > 0
    ? Math.round(((campaign.sentCount + campaign.failedCount + campaign.skippedCount) / campaign.totalRecipients) * 100)
    : 0
  const canCancel = isAdmin && (campaign.status === "queued" || campaign.status === "scheduled" || campaign.status === "sending")
  const canReschedule = isAdmin && (campaign.status === "queued" || campaign.status === "scheduled")
  const hasDetails = campaign.sentCount > 0 || campaign.failedCount > 0

  return (
    <div className="rounded-xl border bg-card p-4 transition-colors hover:border-border/80">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-sm font-semibold">{campaign.name}</h3>
            <Badge variant="outline" className={cn("shrink-0", STATUS_STYLE[campaign.status])}>
              {STATUS_LABEL[campaign.status]}
            </Badge>
          </div>
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{campaign.message}</p>
          <p className="mt-1.5 text-[11px] text-muted-foreground">
            {campaign.createdByName} · {fmtLongDateTimeMDT(campaign.createdAt)}
            {campaign.audienceStatuses.length > 0 ? ` · ${campaign.audienceStatuses.join(", ")}` : " · All statuses"}
          </p>
          {campaign.status === "scheduled" && campaign.scheduledAt && (
            <p className="mt-1.5 flex items-center gap-1 text-[11px] font-medium text-violet-600 dark:text-violet-400">
              <CalendarClock className="h-3 w-3" />
              Scheduled for {fmtLongDateTimeMDT(campaign.scheduledAt)} (Mountain Time)
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center justify-between gap-3 sm:flex-col sm:items-end sm:justify-start sm:gap-2">
          <div className="text-left text-xs sm:text-right">
            <p className="font-semibold">{campaign.sentCount}/{campaign.totalRecipients} sent</p>
            {campaign.failedCount > 0 && <p className="text-red-600 dark:text-red-400">{campaign.failedCount} failed</p>}
            {campaign.skippedCount > 0 && <p className="text-muted-foreground">{campaign.skippedCount} skipped</p>}
          </div>
          <div className="flex gap-1.5">
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
      {hasDetails && (
        <button
          type="button"
          onClick={() => onToggleDetail(campaign._id)}
          className="mt-3 flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
        >
          {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          {expanded ? "Hide delivery details" : "View delivery details"}
        </button>
      )}
      {expanded && (
        <div className="mt-2 space-y-2 rounded-lg border bg-muted/20 p-3 text-xs">
          {detailLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…
            </div>
          ) : detail ? (
            <>
              {Object.keys(detail.deliveryStatusCounts).length > 0 && (
                <div>
                  <p className="mb-1 text-[10px] font-semibold uppercase text-muted-foreground">Carrier delivery status</p>
                  <ul className="space-y-0.5">
                    {Object.entries(detail.deliveryStatusCounts).map(([status, count]) => (
                      <li key={status} className="flex items-center justify-between gap-2">
                        <span className="text-muted-foreground">{DELIVERY_STATUS_LABEL[status] || status}</span>
                        <span className="font-semibold text-foreground">{count}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {detail.failedSample.length > 0 && (
                <div>
                  <p className="mb-1 text-[10px] font-semibold uppercase text-muted-foreground">Failed recipients (sample)</p>
                  <ul className="space-y-1">
                    {detail.failedSample.map((recipient, index) => (
                      <li key={`${recipient.phone}-${index}`} className="text-red-600 dark:text-red-400">
                        {recipient.customerName || recipient.phone}: {recipient.failureReason || "Unknown error"}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {Object.keys(detail.deliveryStatusCounts).length === 0 && detail.failedSample.length === 0 && (
                <p className="text-muted-foreground">No delivery details to show yet.</p>
              )}
            </>
          ) : null}
        </div>
      )}
    </div>
  )
}

function RescheduleDialog({
  campaign,
  busy,
  open,
  onOpenChange,
  onConfirm,
}: {
  campaign: Campaign
  busy: boolean
  open: boolean
  onOpenChange: (open: boolean) => void
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
    <Dialog open={open} onOpenChange={(next) => !busy && onOpenChange(next)}>
      <DialogContent className="w-[calc(100vw-1rem)] sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Reschedule &quot;{campaign.name}&quot;</DialogTitle>
          <DialogDescription>Pick a new send time in Mountain Time (America/Denver).</DialogDescription>
        </DialogHeader>
        <Input
          type="datetime-local"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          disabled={busy}
        />
        {error && <p className="text-sm text-red-500">{error}</p>}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={busy || !value}>
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save new time
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function SmsCampaignsPanel({ hideHeader = false }: { hideHeader?: boolean } = {}) {
  const router = useRouter()
  const { getToken } = useAuth()
  const { user } = useUser()
  const isAdmin = user?.role === "admin"
  const { confirm, AlertComponent } = useAlert()

  const [campaigns, setCampaigns] = React.useState<Campaign[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState("")
  const [busyId, setBusyId] = React.useState("")
  const [rescheduleTarget, setRescheduleTarget] = React.useState<Campaign | null>(null)
  const [expandedId, setExpandedId] = React.useState("")
  const [detailById, setDetailById] = React.useState<Record<string, CampaignDetail>>({})
  const [detailLoadingId, setDetailLoadingId] = React.useState("")

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

  const messageIncludesOptOut = message.toLowerCase().includes("stop")
  const canReview = isAdmin && name.trim().length > 0 && message.trim().length > 0 && messageIncludesOptOut
  const overLimit = audienceCount !== null && audienceCount > MAX_RECIPIENTS

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

  const doCancel = async (id: string) => {
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

  const handleCancel = (id: string) => {
    void confirm(
      "Cancel this campaign?",
      "Any recipients who haven't been texted yet will be skipped. This can't be undone.",
      () => doCancel(id),
      "Cancel campaign",
      "Keep it",
    )
  }

  const handleToggleDetail = async (id: string) => {
    if (expandedId === id) {
      setExpandedId("")
      return
    }
    setExpandedId(id)
    if (detailById[id]) return
    setDetailLoadingId(id)
    try {
      const t = await getToken()
      const res = await apiClient.get(`/api/crm/sms-campaigns/${id}`, { headers: { Authorization: `Bearer ${t}` } })
      const data = res.data?.data || res.data
      setDetailById((prev) => ({
        ...prev,
        [id]: { failedSample: data?.failedSample || [], deliveryStatusCounts: data?.deliveryStatusCounts || {} },
      }))
    } catch {
      setDetailById((prev) => ({ ...prev, [id]: { failedSample: [], deliveryStatusCounts: {} } }))
    } finally {
      setDetailLoadingId("")
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
              <Button variant="ghost" size="icon" onClick={() => router.push("/crm/dashboard")} aria-label="Back to CRM dashboard">
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
          <section className="space-y-5 rounded-2xl border bg-card p-4 sm:p-6">
            <div className="flex items-center gap-2 border-b pb-4">
              <MessageSquareText className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">New Campaign</h2>
            </div>

            <FormSection step={1} title="Campaign name">
              <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. September Trade-In Push" maxLength={120} className="max-w-md" />
            </FormSection>

            <FormSection
              step={2}
              title="Audience"
              description="Choose which lead statuses to text, or include everyone with a phone number."
            >
              <div className="flex flex-wrap items-center gap-3">
                <div className={cn(selectAllLeads && "pointer-events-none opacity-40")}>
                  <MultiSelectFilter
                    filterLabel="Lead status"
                    icon={Users}
                    allLabel="All statuses"
                    options={STATUS_OPTIONS}
                    value={statuses}
                    onChange={setStatuses}
                    searchPlaceholder="Search statuses…"
                    clearLabel="Clear statuses"
                  />
                </div>
                <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  <Checkbox checked={selectAllLeads} onCheckedChange={(checked) => setSelectAllLeads(checked === true)} />
                  Select All Leads
                </label>
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-muted/20 px-3 py-2">
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Users className="h-3.5 w-3.5" />
                  {audienceCount === null ? "Counting…" : `${audienceCount} lead${audienceCount === 1 ? "" : "s"} with a phone number`}
                </p>
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[10px]",
                    overLimit ? "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400" : "text-muted-foreground",
                  )}
                >
                  Limit {MAX_RECIPIENTS}/send
                </Badge>
              </div>
              {overLimit && (
                <p className="mt-2 flex items-start gap-1.5 text-xs font-medium text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  This audience has {audienceCount} eligible leads, over the {MAX_RECIPIENTS}-recipient safe sending limit. Narrow your status filter before sending.
                </p>
              )}
            </FormSection>

            <FormSection step={3} title="Message" description='Must include a "Reply STOP to opt out" line.'>
              <Textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                rows={4}
                maxLength={MAX_MESSAGE_LENGTH}
                className="resize-none"
              />
              <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
                <span className={cn(!messageIncludesOptOut && message.trim().length > 0 && "font-medium text-amber-600 dark:text-amber-400")}>
                  {messageIncludesOptOut ? "Opt-out line detected." : "Opt-out line missing."}
                </span>
                <span>{message.length}/{MAX_MESSAGE_LENGTH}</span>
              </div>
            </FormSection>

            <FormSection step={4} title="Scheduling" description="Send immediately, or line it up for a specific time.">
              <label className="flex items-center gap-2 text-sm font-medium">
                <Checkbox checked={scheduleEnabled} onCheckedChange={(checked) => setScheduleEnabled(checked === true)} />
                <CalendarClock className="h-4 w-4 text-muted-foreground" />
                Schedule for later
              </label>
              {scheduleEnabled && (
                <div className="mt-2 space-y-1">
                  <p className="text-[11px] text-muted-foreground">Mountain Time (America/Denver)</p>
                  <Input
                    type="datetime-local"
                    value={scheduledAtInput}
                    onChange={(event) => setScheduledAtInput(event.target.value)}
                    className="max-w-xs"
                  />
                </div>
              )}
            </FormSection>

            {formError && <p className="text-sm text-red-500">{formError}</p>}

            <div className="border-t pt-4">
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
            <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
              No campaigns sent yet.
            </div>
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
                  expanded={expandedId === campaign._id}
                  detail={detailById[campaign._id]}
                  detailLoading={detailLoadingId === campaign._id}
                  onToggleDetail={handleToggleDetail}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      <Dialog open={confirming} onOpenChange={(open) => !sending && setConfirming(open)}>
        <DialogContent className="w-[calc(100vw-1rem)] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{scheduleEnabled ? "Schedule this campaign?" : "Send this campaign?"}</DialogTitle>
            <DialogDescription>
              This will text {audienceCount ?? "…"} lead{audienceCount === 1 ? "" : "s"}
              {scheduleEnabled ? " at the scheduled time." : ". This can't be undone once messages start sending."}
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border bg-muted/30 p-3 text-xs">
            <p className="font-semibold">{name}</p>
            <p className="mt-1 whitespace-pre-wrap text-muted-foreground">{message}</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirming(false)} disabled={sending}>
              Cancel
            </Button>
            <Button onClick={() => void handleSend()} disabled={sending}>
              {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              {scheduleEnabled ? "Schedule" : "Send"} for {audienceCount ?? "…"} lead{audienceCount === 1 ? "" : "s"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {rescheduleTarget && (
        <RescheduleDialog
          campaign={rescheduleTarget}
          busy={busyId === rescheduleTarget._id}
          open={!!rescheduleTarget}
          onOpenChange={(open) => !open && setRescheduleTarget(null)}
          onConfirm={handleReschedule}
        />
      )}

      <AlertComponent />
    </div>
  )
}
