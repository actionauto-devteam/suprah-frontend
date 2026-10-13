"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Loader2, Mail, Send, Users, X, CalendarClock } from "lucide-react"
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
const MAX_BODY_LENGTH = 5000
const MAX_MARKETING_CONTACT_RECIPIENTS = 500

type AudienceSource = "leadStatus" | "marketingContacts"

interface MarketingContactOption {
  _id: string
  email: string
  firstName?: string
  lastName?: string
}

interface SelectionSummary {
  requested: number
  notFoundOrWrongOrg: number
  excludedConsentNotEligible: number
  excludedSuppressed: number
  included: number
}

interface Campaign {
  _id: string
  name: string
  subject: string
  greetingText: string
  bodyText: string
  bannerImageUrl?: string
  signOffText?: string
  audienceStatuses: string[]
  status: "queued" | "scheduled" | "sending" | "completed" | "cancelled" | "failed"
  scheduledAt?: string
  totalRecipients: number
  sentCount: number
  failedCount: number
  skippedCount: number
  uncertainCount: number
  createdByName: string
  createdAt: string
  completedAt?: string
}

function getErrorMessage(error: unknown, fallback: string) {
  return (error as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback
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

const COMPLETED_WITH_ISSUES_STYLE = "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"

function getCampaignStatusDisplay(campaign: Campaign): { label: string; style: string } {
  if (campaign.status === "completed" && campaign.failedCount > 0) {
    return { label: "Completed with failures", style: COMPLETED_WITH_ISSUES_STYLE }
  }
  if (campaign.status === "completed" && campaign.uncertainCount > 0) {
    return { label: "Completed, some uncertain", style: COMPLETED_WITH_ISSUES_STYLE }
  }
  return { label: STATUS_LABEL[campaign.status], style: STATUS_STYLE[campaign.status] }
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
    ? Math.round(((campaign.sentCount + campaign.failedCount + campaign.skippedCount + campaign.uncertainCount) / campaign.totalRecipients) * 100)
    : 0
  const canCancel = isAdmin && (campaign.status === "queued" || campaign.status === "scheduled" || campaign.status === "sending")
  const canReschedule = isAdmin && (campaign.status === "queued" || campaign.status === "scheduled")
  const statusDisplay = getCampaignStatusDisplay(campaign)

  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold">{campaign.name}</h3>
            <Badge variant="outline" className={statusDisplay.style}>
              {statusDisplay.label}
            </Badge>
          </div>
          <p className="mt-1 line-clamp-2 max-w-xl text-xs text-muted-foreground">{campaign.subject}</p>
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
            {campaign.uncertainCount > 0 && <p className="text-amber-600 dark:text-amber-400">{campaign.uncertainCount} uncertain (needs review)</p>}
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
        <Input type="datetime-local" value={value} onChange={(event) => setValue(event.target.value)} disabled={busy} />
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

export function EmailCampaignsPanel({ hideHeader = false }: { hideHeader?: boolean } = {}) {
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
  const [subject, setSubject] = React.useState("")
  const [greetingText, setGreetingText] = React.useState("Hi {firstName},")
  const [bannerImageUrl, setBannerImageUrl] = React.useState("")
  const [bodyText, setBodyText] = React.useState("")
  const [signOffText, setSignOffText] = React.useState("")
  const [statuses, setStatuses] = React.useState<string[]>([])
  const [selectAllLeads, setSelectAllLeads] = React.useState(false)
  const [audienceCount, setAudienceCount] = React.useState<number | null>(null)
  const [scheduleEnabled, setScheduleEnabled] = React.useState(false)
  const [scheduledAtInput, setScheduledAtInput] = React.useState("")
  const [confirming, setConfirming] = React.useState(false)
  const [sending, setSending] = React.useState(false)
  const [formError, setFormError] = React.useState("")
  const [postSendNotice, setPostSendNotice] = React.useState("")

  const [audienceSource, setAudienceSource] = React.useState<AudienceSource>("leadStatus")
  const [mcImportLabel, setMcImportLabel] = React.useState("")
  const [mcSearch, setMcSearch] = React.useState("")
  const [mcPage, setMcPage] = React.useState(1)
  const [mcContacts, setMcContacts] = React.useState<MarketingContactOption[]>([])
  const [mcTotal, setMcTotal] = React.useState(0)
  const [mcLoading, setMcLoading] = React.useState(false)
  const [mcError, setMcError] = React.useState("")
  const [mcImportLabels, setMcImportLabels] = React.useState<string[]>([])
  const [selectedContacts, setSelectedContacts] = React.useState<Map<string, MarketingContactOption>>(new Map())
  const [selectAllBusy, setSelectAllBusy] = React.useState(false)
  const [selectAllNotice, setSelectAllNotice] = React.useState("")
  const [manualEmailInput, setManualEmailInput] = React.useState("")
  const [manualEntryBusy, setManualEntryBusy] = React.useState(false)
  const [manualEntryError, setManualEntryError] = React.useState("")
  const [ineligibleNotices, setIneligibleNotices] = React.useState<Record<string, string>>({})

  const changeAudienceSource = (source: AudienceSource) => {
    setAudienceSource(source)
    if (source === "leadStatus") {
      setSelectedContacts(new Map())
      setSelectAllNotice("")
      setIneligibleNotices({})
    } else {
      setStatuses([])
      setSelectAllLeads(false)
    }
  }

  const loadCampaigns = React.useCallback(async () => {
    try {
      const t = await getToken()
      const res = await apiClient.get("/api/crm/email-campaigns", { headers: { Authorization: `Bearer ${t}` } })
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
        const res = await apiClient.get("/api/crm/email-campaigns/audience-count", {
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

  React.useEffect(() => {
    if (audienceSource !== "marketingContacts") return
    let cancelled = false
    ;(async () => {
      try {
        const t = await getToken()
        const res = await apiClient.get("/api/crm/marketing-contacts/import-labels", {
          headers: { Authorization: `Bearer ${t}` },
        })
        if (cancelled) return
        const data = res.data?.data || res.data
        setMcImportLabels(Array.isArray(data?.labels) ? data.labels : [])
      } catch {
        if (!cancelled) setMcImportLabels([])
      }
    })()
    return () => {
      cancelled = true
    }
  }, [audienceSource, getToken])

  const loadMarketingContacts = React.useCallback(async () => {
    setMcLoading(true)
    setMcError("")
    try {
      const t = await getToken()
      const res = await apiClient.get("/api/crm/marketing-contacts", {
        params: {
          page: mcPage,
          limit: 25,
          eligibleOnly: "true",
          importLabel: mcImportLabel || undefined,
          search: mcSearch || undefined,
        },
        headers: { Authorization: `Bearer ${t}` },
      })
      const data = res.data?.data || res.data
      setMcContacts(Array.isArray(data?.contacts) ? data.contacts : [])
      setMcTotal(typeof data?.total === "number" ? data.total : 0)
    } catch (err) {
      setMcError(getErrorMessage(err, "Could not load Marketing Contacts."))
    } finally {
      setMcLoading(false)
    }
  }, [getToken, mcPage, mcImportLabel, mcSearch])

  React.useEffect(() => {
    if (audienceSource !== "marketingContacts") return
    const timer = window.setTimeout(() => void loadMarketingContacts(), 300)
    return () => window.clearTimeout(timer)
  }, [audienceSource, loadMarketingContacts])

  const toggleContactSelection = (contact: MarketingContactOption) => {
    setSelectAllNotice("")
    setSelectedContacts((prev) => {
      const next = new Map(prev)
      if (next.has(contact._id)) {
        next.delete(contact._id)
        return next
      }
      if (next.size >= MAX_MARKETING_CONTACT_RECIPIENTS) return prev
      next.set(contact._id, contact)
      return next
    })
  }

  const removeSelectedContact = (id: string) => {
    setSelectedContacts((prev) => {
      const next = new Map(prev)
      next.delete(id)
      return next
    })
    setIneligibleNotices((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
  }

  const handleSelectAllEligible = async () => {
    setSelectAllBusy(true)
    setSelectAllNotice("")
    try {
      const t = await getToken()
      const res = await apiClient.get("/api/crm/marketing-contacts/eligible-ids", {
        params: { importLabel: mcImportLabel || undefined, search: mcSearch || undefined },
        headers: { Authorization: `Bearer ${t}` },
      })
      const data = res.data?.data || res.data
      const contacts: MarketingContactOption[] = Array.isArray(data?.contacts) ? data.contacts : []
      const total = typeof data?.total === "number" ? data.total : contacts.length
      const capped = Boolean(data?.capped)

      setSelectedContacts(() => {
        const next = new Map<string, MarketingContactOption>()
        for (const contact of contacts) next.set(contact._id, contact)
        return next
      })

      if (capped) {
        setSelectAllNotice(
          `${total} contacts are eligible for this filter, but campaigns are currently capped at ${MAX_MARKETING_CONTACT_RECIPIENTS}. Only the first ${MAX_MARKETING_CONTACT_RECIPIENTS} were selected — narrow your filter to reach the rest.`,
        )
      } else {
        setSelectAllNotice(`Selected all ${total} eligible contact${total === 1 ? "" : "s"} matching the current filter.`)
      }
    } catch (err) {
      setSelectAllNotice(getErrorMessage(err, "Could not select all eligible contacts."))
    } finally {
      setSelectAllBusy(false)
    }
  }

  const handleAddManualEmail = async () => {
    const email = manualEmailInput.trim()
    if (!email) return
    setManualEntryBusy(true)
    setManualEntryError("")
    try {
      const t = await getToken()
      const res = await apiClient.post(
        "/api/crm/marketing-contacts/manual-entry",
        { email },
        { headers: { Authorization: `Bearer ${t}` } },
      )
      const data = res.data?.data || res.data
      const contact = data?.contact as MarketingContactOption | undefined
      if (!contact) throw new Error("No contact returned")

      if (selectedContacts.size >= MAX_MARKETING_CONTACT_RECIPIENTS && !selectedContacts.has(contact._id)) {
        setManualEntryError(`You've reached the ${MAX_MARKETING_CONTACT_RECIPIENTS}-recipient selection limit.`)
        return
      }

      setSelectedContacts((prev) => {
        const next = new Map(prev)
        next.set(contact._id, contact)
        return next
      })

      if (!data.isEligible && data.reason) {
        setIneligibleNotices((prev) => ({ ...prev, [contact._id]: data.reason }))
      } else {
        setIneligibleNotices((prev) => {
          const next = { ...prev }
          delete next[contact._id]
          return next
        })
      }
      setManualEmailInput("")
    } catch (err) {
      setManualEntryError(getErrorMessage(err, "Could not add this email address."))
    } finally {
      setManualEntryBusy(false)
    }
  }

  const toggleStatus = (status: string) => {
    setStatuses((prev) => (prev.includes(status) ? prev.filter((value) => value !== status) : [...prev, status]))
  }

  const canReview =
    isAdmin &&
    name.trim().length > 0 &&
    subject.trim().length > 0 &&
    greetingText.trim().length > 0 &&
    bodyText.trim().length > 0 &&
    (audienceSource === "leadStatus" || selectedContacts.size > 0) &&
    (!scheduleEnabled || Boolean(scheduledAtInput))

  const confirmCount = audienceSource === "marketingContacts" ? selectedContacts.size : audienceCount
  const confirmNoun = audienceSource === "marketingContacts" ? "contact" : "lead"

  const previewFor = (text: string) => text.replace(/\{firstName\}/gi, "Jordan")

  const handleSend = async () => {
    setSending(true)
    setFormError("")
    setPostSendNotice("")
    try {
      const t = await getToken()
      const payload: Record<string, unknown> = {
        name: name.trim(),
        subject: subject.trim(),
        greetingText: greetingText.trim(),
        bannerImageUrl: bannerImageUrl.trim(),
        bodyText: bodyText.trim(),
        signOffText: signOffText.trim(),
      }
      if (audienceSource === "marketingContacts") {
        payload.audienceSource = "marketingContacts"
        payload.marketingContactIds = Array.from(selectedContacts.keys())
      } else {
        payload.statuses = effectiveStatuses
      }
      if (scheduleEnabled) {
        const parsed = parseDatetimeLocalAsMdt(scheduledAtInput)
        if (!parsed || parsed.getTime() < Date.now() + 30_000) {
          setFormError("Pick a valid send time at least 30 seconds in the future.")
          setSending(false)
          return
        }
        payload.scheduledAt = parsed.toISOString()
      }

      const res = await apiClient.post("/api/crm/email-campaigns", payload, {
        headers: { Authorization: `Bearer ${t}` },
      })
      const data = res.data?.data || res.data
      const selection = data?.selection as SelectionSummary | undefined
      if (selection && selection.included < selection.requested) {
        const excluded = selection.requested - selection.included
        setPostSendNotice(
          `Campaign created with ${selection.included} of ${selection.requested} selected contacts. ${excluded} were excluded (not consent-eligible, suppressed, or no longer available).`,
        )
      }

      setName("")
      setSubject("")
      setGreetingText("Hi {firstName},")
      setBannerImageUrl("")
      setBodyText("")
      setSignOffText("")
      setStatuses([])
      setSelectAllLeads(false)
      setSelectedContacts(new Map())
      setIneligibleNotices({})
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
      await apiClient.post(`/api/crm/email-campaigns/${id}/cancel`, {}, { headers: { Authorization: `Bearer ${t}` } })
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
        `/api/crm/email-campaigns/${rescheduleTarget._id}/reschedule`,
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
            <Mail className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-bold tracking-tight">Email Campaigns</h1>
          </div>
        </div>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Send one announcement email to a group of leads at once, by status — award wins, holiday greetings, and
          other updates. Opted-out addresses are skipped automatically, and every email includes an unsubscribe link.
        </p>
          </>
        )}

        {!isAdmin && (
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-700 dark:text-amber-300">
            Admin access required to create, cancel, or reschedule email campaigns. You can still view campaign history below.
          </div>
        )}

        {isAdmin && (
        <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="space-y-3 rounded-2xl border bg-card p-4 sm:p-6">
            <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">New campaign</h2>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold">Campaign name</label>
              <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. 2026 Top Dealer Award" maxLength={120} />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold">Audience source</label>
              <select
                value={audienceSource}
                onChange={(event) => changeAudienceSource(event.target.value as AudienceSource)}
                className="h-9 w-full max-w-xs rounded-md border bg-background px-2 text-sm"
              >
                <option value="leadStatus">CRM Leads by Status</option>
                <option value="marketingContacts">Marketing Contacts</option>
              </select>
            </div>

            {audienceSource === "leadStatus" ? (
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
                  {selectAllLeads ? "Every eligible lead with an email address will be included, regardless of status." : "Leave all unchecked to include every status."}
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
                  {audienceCount === null ? "Counting…" : `${audienceCount} lead${audienceCount === 1 ? "" : "s"} with an email address`}
                </p>
                {audienceCount !== null && audienceCount > 500 && (
                  <p className="text-xs font-medium text-amber-600 dark:text-amber-400">
                    This audience has {audienceCount} eligible leads, over the 500-recipient safe sending limit. Narrow
                    your status filter before sending.
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-3 rounded-xl border bg-muted/20 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="flex items-center gap-1.5 text-sm font-semibold">
                    <Users className="h-3.5 w-3.5" />
                    Selected: {selectedContacts.size} / {MAX_MARKETING_CONTACT_RECIPIENTS}
                  </p>
                  {selectedContacts.size > 0 && (
                    <button
                      type="button"
                      className="text-xs text-muted-foreground underline"
                      onClick={() => {
                        setSelectedContacts(new Map())
                        setIneligibleNotices({})
                        setSelectAllNotice("")
                      }}
                    >
                      Clear selection
                    </button>
                  )}
                </div>

                <p className="text-[11px] text-muted-foreground">
                  Only contacts with documented consent evidence are shown here — unknown or verbally-claimed consent
                  is not treated as permission to send.
                </p>

                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={mcImportLabel}
                    onChange={(event) => {
                      setMcImportLabel(event.target.value)
                      setMcPage(1)
                    }}
                    className="h-9 rounded-md border bg-background px-2 text-sm"
                  >
                    <option value="">All import labels</option>
                    {mcImportLabels.map((label) => (
                      <option key={label} value={label}>
                        {label}
                      </option>
                    ))}
                  </select>
                  <Input
                    value={mcSearch}
                    onChange={(event) => {
                      setMcSearch(event.target.value)
                      setMcPage(1)
                    }}
                    placeholder="Search by email or name"
                    className="h-9 max-w-[220px]"
                  />
                  <Button type="button" variant="outline" size="sm" disabled={selectAllBusy} onClick={() => void handleSelectAllEligible()}>
                    {selectAllBusy ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
                    Select all matching
                  </Button>
                </div>
                {selectAllNotice && <p className="text-[11px] text-muted-foreground">{selectAllNotice}</p>}

                <div className="flex flex-wrap items-center gap-2 border-t pt-2">
                  <Input
                    value={manualEmailInput}
                    onChange={(event) => setManualEmailInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault()
                        void handleAddManualEmail()
                      }
                    }}
                    placeholder="Type an email address to add it directly"
                    className="h-9 max-w-[260px]"
                    disabled={manualEntryBusy}
                  />
                  <Button type="button" variant="outline" size="sm" disabled={manualEntryBusy || !manualEmailInput.trim()} onClick={() => void handleAddManualEmail()}>
                    {manualEntryBusy ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
                    Add
                  </Button>
                </div>
                {manualEntryError && <p className="text-xs text-red-500">{manualEntryError}</p>}

                {mcError && <p className="text-sm text-red-500">{mcError}</p>}

                {mcLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Loading…
                  </div>
                ) : mcContacts.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No eligible contacts match this filter.</p>
                ) : (
                  <div className="max-h-64 space-y-1 overflow-y-auto">
                    {mcContacts.map((contact) => {
                      const checked = selectedContacts.has(contact._id)
                      const disabled = !checked && selectedContacts.size >= MAX_MARKETING_CONTACT_RECIPIENTS
                      return (
                        <label
                          key={contact._id}
                          className={cn(
                            "flex items-center gap-2 rounded-lg border p-2 text-sm",
                            disabled ? "opacity-50" : "cursor-pointer hover:bg-muted/40",
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={disabled}
                            onChange={() => toggleContactSelection(contact)}
                          />
                          <span className="truncate">
                            {contact.email}
                            {contact.firstName || contact.lastName
                              ? ` — ${[contact.firstName, contact.lastName].filter(Boolean).join(" ")}`
                              : ""}
                          </span>
                        </label>
                      )
                    })}
                  </div>
                )}

                {mcTotal > 25 && (
                  <div className="flex items-center justify-between gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={mcPage <= 1}
                      onClick={() => setMcPage((p) => Math.max(1, p - 1))}
                    >
                      Previous
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      Page {mcPage} of {Math.max(1, Math.ceil(mcTotal / 25))} ({mcTotal} eligible total)
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={mcPage >= Math.ceil(mcTotal / 25)}
                      onClick={() => setMcPage((p) => p + 1)}
                    >
                      Next
                    </Button>
                  </div>
                )}

                {selectedContacts.size > 0 && (
                  <details className="rounded-lg border bg-background p-2" open>
                    <summary className="cursor-pointer text-xs font-semibold text-muted-foreground">
                      Review {selectedContacts.size} selected recipient{selectedContacts.size === 1 ? "" : "s"}
                    </summary>
                    <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto text-xs">
                      {Array.from(selectedContacts.values()).map((contact) => {
                        const notice = ineligibleNotices[contact._id]
                        return (
                          <li key={contact._id} className="flex items-center justify-between gap-2">
                            <span className="truncate">
                              {contact.email}
                              {notice && <span className="ml-1.5 text-amber-600 dark:text-amber-400">— excluded: {notice}</span>}
                            </span>
                            <button
                              type="button"
                              className="shrink-0 text-muted-foreground hover:text-red-500"
                              onClick={() => removeSelectedContact(contact._id)}
                              aria-label={`Remove ${contact.email}`}
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </li>
                        )
                      })}
                    </ul>
                  </details>
                )}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-sm font-semibold">Subject</label>
              <Input value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="We've been named a 2026 Top Dealer!" maxLength={200} />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold">Greeting</label>
              <p className="text-[11px] text-muted-foreground">Use <code>{"{firstName}"}</code> to personalize.</p>
              <Input value={greetingText} onChange={(event) => setGreetingText(event.target.value)} maxLength={500} />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold">Banner image URL (optional)</label>
              <Input value={bannerImageUrl} onChange={(event) => setBannerImageUrl(event.target.value)} placeholder="https://…" />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold">Message</label>
              <Textarea
                value={bodyText}
                onChange={(event) => setBodyText(event.target.value)}
                rows={5}
                maxLength={MAX_BODY_LENGTH}
                className="resize-none"
              />
              <div className="flex items-center justify-end text-[11px] text-muted-foreground">
                <span>{bodyText.length}/{MAX_BODY_LENGTH}</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold">Sign-off (optional)</label>
              <Input value={signOffText} onChange={(event) => setSignOffText(event.target.value)} placeholder="We'd love the opportunity to work with you again." maxLength={300} />
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
              <Button disabled={!canReview} onClick={() => setConfirming(true)}>
                <Send className="mr-2 h-4 w-4" />
                Review &amp; {scheduleEnabled ? "schedule" : "send"}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Preview</h2>
            <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
              {bannerImageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={bannerImageUrl} alt="" className="h-32 w-full object-cover" />
              )}
              <div className="space-y-2 p-4">
                <p className="text-xs font-semibold text-muted-foreground">{previewFor(subject) || "Subject line"}</p>
                <p className="text-sm">{previewFor(greetingText) || "Hi Jordan,"}</p>
                <p className="whitespace-pre-line text-sm text-muted-foreground">{previewFor(bodyText) || "Your message will appear here."}</p>
                {signOffText && <p className="text-sm text-muted-foreground">{previewFor(signOffText)}</p>}
              </div>
            </div>
          </div>
        </section>
        )}

        {postSendNotice && (
          <div className="flex items-start justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-300">
            <p>{postSendNotice}</p>
            <button
              type="button"
              className="shrink-0 text-amber-700 hover:text-amber-900 dark:text-amber-300 dark:hover:text-amber-100"
              onClick={() => setPostSendNotice("")}
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
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
                  This will email {confirmCount ?? "…"} {confirmNoun}
                  {confirmCount === 1 ? "" : "s"}
                  {scheduleEnabled ? " at the scheduled time." : ". This can't be undone once emails start sending."}
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setConfirming(false)} disabled={sending} aria-label="Close">
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="mb-4 rounded-lg border bg-muted/30 p-3 text-xs">
              <p className="font-semibold">{name}</p>
              <p className="mt-1 text-muted-foreground">{subject}</p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setConfirming(false)} disabled={sending}>
                Cancel
              </Button>
              <Button onClick={() => void handleSend()} disabled={sending}>
                {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                {scheduleEnabled ? "Schedule" : "Send"} for {confirmCount ?? "…"} {confirmNoun}
                {confirmCount === 1 ? "" : "s"}
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
