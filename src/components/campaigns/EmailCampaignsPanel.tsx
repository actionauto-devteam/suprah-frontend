"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  AlertTriangle,
  ArrowLeft,
  CalendarClock,
  ChevronDown,
  ChevronUp,
  ImageUp,
  Loader2,
  Mail,
  Search,
  Send,
  Sparkles,
  Users,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { useAlert } from "@/components/AlertDialog"
import { apiClient } from "@/lib/api-client"
import { useAuth, useUser } from "@/providers/AuthProvider"
import { cn } from "@/lib/utils"
import { fmtLongDateTimeMDT, parseDatetimeLocalAsMdt } from "@/lib/timezone"
import { LEAD_STATUS_VALUES } from "@/lib/leadStatus"
import { MultiSelectFilter } from "@/components/calendar/MultiSelectFilter"
import {
  EmailRichTextEditor,
  EMAIL_IMAGE_ACCEPT,
  emailImageFilesFrom,
  emailImageSizeError,
  describeEmailImageUploadError,
} from "@/components/campaigns/EmailRichTextEditor"

const STATUS_OPTIONS = LEAD_STATUS_VALUES.map((status) => ({ value: status, label: status }))
const MAX_BODY_TEXT_LENGTH = 5000
const MAX_MARKETING_CONTACT_RECIPIENTS = 500
const MAX_RECIPIENTS = 500

type AudienceSource = "leadStatus" | "marketingContacts"

interface MarketingContactOption {
  _id: string
  email: string
  firstName?: string
  lastName?: string
  permissionOverride?: { confirmedByName: string; confirmedAt: string }
}

interface PreviewRecipient {
  firstName: string
  displayName: string
  email: string
}

interface CampaignPreviewData {
  subject: string
  html: string
  greetingName: string
  missingMailingAddress: boolean
  images: { inEditor: number; inEmail: number; removedBySanitizer: number; notHttps: number }
}

const NO_NAME_PREVIEW = "__no_first_name__"

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

interface CampaignDetail {
  failedSample: Array<{ customerName?: string; email: string; failureReason?: string }>
  uncertainSample: Array<{ customerName?: string; email: string; failureReason?: string }>
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
    ? Math.round(((campaign.sentCount + campaign.failedCount + campaign.skippedCount + campaign.uncertainCount) / campaign.totalRecipients) * 100)
    : 0
  const canCancel = isAdmin && (campaign.status === "queued" || campaign.status === "scheduled" || campaign.status === "sending")
  const canReschedule = isAdmin && (campaign.status === "queued" || campaign.status === "scheduled")
  const statusDisplay = getCampaignStatusDisplay(campaign)
  const hasDetails = campaign.failedCount > 0 || campaign.uncertainCount > 0

  return (
    <div className="rounded-xl border bg-card p-4 transition-colors hover:border-border/80">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-sm font-semibold">{campaign.name}</h3>
            <Badge variant="outline" className={cn("shrink-0", statusDisplay.style)}>
              {statusDisplay.label}
            </Badge>
          </div>
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{campaign.subject}</p>
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
            {campaign.uncertainCount > 0 && <p className="text-amber-600 dark:text-amber-400">{campaign.uncertainCount} uncertain</p>}
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
          {expanded ? "Hide details" : "View details"}
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
              {detail.failedSample.length > 0 && (
                <div>
                  <p className="mb-1 text-[10px] font-semibold uppercase text-muted-foreground">Failed recipients (sample)</p>
                  <ul className="space-y-1">
                    {detail.failedSample.map((recipient, index) => (
                      <li key={`${recipient.email}-${index}`} className="text-red-600 dark:text-red-400">
                        {recipient.customerName || recipient.email}: {recipient.failureReason || "Unknown error"}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {detail.uncertainSample.length > 0 && (
                <div>
                  <p className="mb-1 text-[10px] font-semibold uppercase text-muted-foreground">
                    Uncertain recipients (sample) — send may or may not have reached them, needs review
                  </p>
                  <ul className="space-y-1">
                    {detail.uncertainSample.map((recipient, index) => (
                      <li key={`${recipient.email}-${index}`} className="text-amber-600 dark:text-amber-400">
                        {recipient.customerName || recipient.email}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {detail.failedSample.length === 0 && detail.uncertainSample.length === 0 && (
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
        <Input type="datetime-local" value={value} onChange={(event) => setValue(event.target.value)} disabled={busy} />
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

export function EmailCampaignsPanel({ hideHeader = false }: { hideHeader?: boolean } = {}) {
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
  const [subject, setSubject] = React.useState("Hi {firstName},");
  const [greetingText, setGreetingText] = React.useState("Hi {firstName},")
  const [bannerImageUrl, setBannerImageUrl] = React.useState("")
  const [bannerUploading, setBannerUploading] = React.useState(false)
  const [bannerError, setBannerError] = React.useState<string | null>(null)
  const bannerFileInputRef = React.useRef<HTMLInputElement>(null)
  const [bodyHtml, setBodyHtml] = React.useState("")
  const [signOffText, setSignOffText] = React.useState("")
  const [statuses, setStatuses] = React.useState<string[]>([])
  const [selectAllLeads, setSelectAllLeads] = React.useState(false)
  const [audienceCount, setAudienceCount] = React.useState<number | null>(null)
  const [leadPreviewRecipient, setLeadPreviewRecipient] = React.useState<PreviewRecipient | null>(null)
  const [previewChoice, setPreviewChoice] = React.useState("")
  const [previewData, setPreviewData] = React.useState<CampaignPreviewData | null>(null)
  const [previewError, setPreviewError] = React.useState("")
  const [previewLoading, setPreviewLoading] = React.useState(false)
  const [previewFrameHeight, setPreviewFrameHeight] = React.useState(480)
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
  const [confirmedPermission, setConfirmedPermission] = React.useState(false)
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
        setLeadPreviewRecipient(data?.previewRecipient || null)
      } catch {
        if (!cancelled) {
          setAudienceCount(null)
          setLeadPreviewRecipient(null)
        }
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

  const uploadCampaignImage = React.useCallback(
    async (file: File): Promise<string> => {
      const t = await getToken()
      const form = new FormData()
      form.append("image", file)
      const res = await apiClient.post("/api/crm/email-campaigns/images", form, {
        headers: { Authorization: `Bearer ${t}` },
      })
      const url = res.data?.data?.url
      if (typeof url !== "string" || !url) throw new Error("The image could not be uploaded. Please try again.")
      return url
    },
    [getToken],
  )

  const handleBannerFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const [file] = emailImageFilesFrom(event.target.files)
    event.target.value = ""
    if (!file) {
      setBannerError("Please choose a JPG, PNG, WEBP, or GIF image.")
      return
    }
    const sizeError = emailImageSizeError(file)
    if (sizeError) {
      setBannerError(sizeError)
      return
    }
    setBannerError(null)
    setBannerUploading(true)
    try {
      setBannerImageUrl(await uploadCampaignImage(file))
    } catch (err) {
      setBannerError(describeEmailImageUploadError(err))
    } finally {
      setBannerUploading(false)
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
        { email, confirmedPermission },
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
      setConfirmedPermission(false)
    } catch (err) {
      setManualEntryError(getErrorMessage(err, "Could not add this email address."))
    } finally {
      setManualEntryBusy(false)
    }
  }

  const bodyHtmlHasContent = bodyHtml.replace(/<[^>]*>/g, "").trim().length > 0

  const canReview =
    isAdmin &&
    name.trim().length > 0 &&
    subject.trim().length > 0 &&
    greetingText.trim().length > 0 &&
    bodyHtmlHasContent &&
    (audienceSource === "leadStatus" || selectedContacts.size > 0) &&
    (!scheduleEnabled || Boolean(scheduledAtInput))

  const confirmCount = audienceSource === "marketingContacts" ? selectedContacts.size : audienceCount
  const confirmNoun = audienceSource === "marketingContacts" ? "contact" : "lead"
  const overLimit = audienceSource === "leadStatus" && audienceCount !== null && audienceCount > MAX_RECIPIENTS

  const previewOptions = React.useMemo(() => {
    const options: { value: string; label: string; firstName: string }[] = []
    if (audienceSource === "marketingContacts") {
      for (const contact of Array.from(selectedContacts.values()).slice(0, 20)) {
        const display = [contact.firstName, contact.lastName].filter(Boolean).join(" ").trim()
        options.push({
          value: contact._id,
          label: display ? `${display} (${contact.email})` : contact.email,
          firstName: String(contact.firstName || "").trim(),
        })
      }
    } else if (leadPreviewRecipient) {
      options.push({
        value: "lead-sample",
        label: leadPreviewRecipient.displayName
          ? `${leadPreviewRecipient.displayName} (${leadPreviewRecipient.email})`
          : leadPreviewRecipient.email,
        firstName: leadPreviewRecipient.firstName,
      })
    }
    options.push({ value: NO_NAME_PREVIEW, label: "A recipient with no first name", firstName: "" })
    return options
  }, [audienceSource, selectedContacts, leadPreviewRecipient])

  const activePreview = previewOptions.find((option) => option.value === previewChoice) || previewOptions[0]

  React.useEffect(() => {
    let cancelled = false
    const timer = window.setTimeout(async () => {
      setPreviewLoading(true)
      try {
        const t = await getToken()
        const res = await apiClient.post(
          "/api/crm/email-campaigns/preview",
          {
            subject,
            greetingText,
            bannerImageUrl: bannerImageUrl.trim(),
            bodyHtml: bodyHtml.trim(),
            signOffText,
            previewFirstName: activePreview?.firstName || "",
          },
          { headers: { Authorization: `Bearer ${t}` } },
        )
        if (cancelled) return
        setPreviewData((res.data?.data || res.data) as CampaignPreviewData)
        setPreviewError("")
      } catch (err) {
        if (cancelled) return
        const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        setPreviewError(message || "The preview could not be loaded.")
      } finally {
        if (!cancelled) setPreviewLoading(false)
      }
    }, 500)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [subject, greetingText, bannerImageUrl, bodyHtml, signOffText, activePreview?.firstName, getToken])

  const resizePreviewFrame = (frame: HTMLIFrameElement | null) => {
    const height = frame?.contentDocument?.body?.scrollHeight
    if (height) setPreviewFrameHeight(Math.min(Math.max(height + 16, 240), 1600))
  }

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
        bodyHtml: bodyHtml.trim(),
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
      setBodyHtml("")
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

  const doCancel = async (id: string) => {
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

  const handleCancel = (id: string) => {
    void confirm(
      "Cancel this campaign?",
      "Any recipients who haven't been emailed yet will be skipped. This can't be undone.",
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
      const res = await apiClient.get(`/api/crm/email-campaigns/${id}`, { headers: { Authorization: `Bearer ${t}` } })
      const data = res.data?.data || res.data
      setDetailById((prev) => ({
        ...prev,
        [id]: { failedSample: data?.failedSample || [], uncertainSample: data?.uncertainSample || [] },
      }))
    } catch {
      setDetailById((prev) => ({ ...prev, [id]: { failedSample: [], uncertainSample: [] } }))
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
      <div className={hideHeader ? "space-y-6" : "mx-auto max-w-6xl space-y-6 p-4 sm:p-6"}>
        {!hideHeader && (
          <>
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => router.push("/crm/dashboard")} aria-label="Back to CRM dashboard">
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
          <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
            <div className="space-y-5 rounded-2xl border bg-card p-4 sm:p-6">
              <div className="flex items-center gap-2 border-b pb-4">
                <Sparkles className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">New Campaign</h2>
              </div>

              <FormSection step={1} title="Campaign details">
                <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. 2026 Top Dealer Award" maxLength={120} className="max-w-md" />
              </FormSection>

              <FormSection step={2} title="Audience" description="Choose who receives this email.">
                <Select value={audienceSource} onValueChange={(value) => changeAudienceSource(value as AudienceSource)}>
                  <SelectTrigger className="w-full max-w-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="leadStatus">CRM Leads by Status</SelectItem>
                    <SelectItem value="marketingContacts">Marketing Contacts</SelectItem>
                  </SelectContent>
                </Select>

                {audienceSource === "leadStatus" ? (
                  <div className="mt-3 space-y-2">
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

                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-muted/20 px-3 py-2">
                      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Users className="h-3.5 w-3.5" />
                        {audienceCount === null ? "Counting…" : `${audienceCount} lead${audienceCount === 1 ? "" : "s"} with an email address`}
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
                      <p className="flex items-start gap-1.5 text-xs font-medium text-amber-600 dark:text-amber-400">
                        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        This audience has {audienceCount} eligible leads, over the {MAX_RECIPIENTS}-recipient safe sending limit. Narrow your status filter before sending.
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="mt-3 space-y-3 rounded-xl border bg-muted/20 p-3">
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
                      <Select value={mcImportLabel || "__all__"} onValueChange={(value) => { setMcImportLabel(value === "__all__" ? "" : value); setMcPage(1) }}>
                        <SelectTrigger className="h-9 w-[180px]" size="sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__all__">All import labels</SelectItem>
                          {mcImportLabels.map((label) => (
                            <SelectItem key={label} value={label}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div className="relative">
                        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          value={mcSearch}
                          onChange={(event) => {
                            setMcSearch(event.target.value)
                            setMcPage(1)
                          }}
                          placeholder="Search by email or name"
                          className="h-9 max-w-[220px] pl-8"
                        />
                      </div>
                      <Button type="button" variant="outline" size="sm" disabled={selectAllBusy} onClick={() => void handleSelectAllEligible()}>
                        {selectAllBusy ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
                        Select all matching
                      </Button>
                    </div>
                    {selectAllNotice && <p className="text-[11px] text-muted-foreground">{selectAllNotice}</p>}
                    {mcTotal > MAX_MARKETING_CONTACT_RECIPIENTS && (
                      <p className="flex items-start gap-1.5 text-xs font-medium text-amber-600 dark:text-amber-400">
                        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        This filter matches {mcTotal.toLocaleString()} contacts — only the first {MAX_MARKETING_CONTACT_RECIPIENTS} are available to select until bulk sending is enabled. Narrow your filter, or use the import label / search to target fewer contacts.
                      </p>
                    )}

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
                    <label className="flex items-start gap-2 text-[11px] text-muted-foreground">
                      <Checkbox
                        checked={confirmedPermission}
                        onCheckedChange={(checked) => setConfirmedPermission(checked === true)}
                        disabled={manualEntryBusy}
                        className="mt-0.5"
                      />
                      <span>
                        I confirm I have permission to email this address. This overrides the usual
                        &ldquo;consent not documented&rdquo; block for this one address only, and is recorded with your name and the time.
                      </span>
                    </label>
                    {manualEntryError && <p className="text-xs text-red-500">{manualEntryError}</p>}

                    {mcError && <p className="text-sm text-red-500">{mcError}</p>}

                    {mcLoading ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" /> Loading…
                      </div>
                    ) : mcContacts.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No eligible contacts match this filter.</p>
                    ) : (
                      <div className="max-h-56 space-y-1 overflow-y-auto">
                        {mcContacts.map((contact) => {
                          const checked = selectedContacts.has(contact._id)
                          const disabled = !checked && selectedContacts.size >= MAX_MARKETING_CONTACT_RECIPIENTS
                          return (
                            <label
                              key={contact._id}
                              className={cn(
                                "flex items-center gap-2 rounded-lg border bg-background p-2 text-sm",
                                disabled ? "opacity-50" : "cursor-pointer hover:bg-muted/40",
                              )}
                            >
                              <Checkbox
                                checked={checked}
                                disabled={disabled}
                                onCheckedChange={() => toggleContactSelection(contact)}
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
                      <div className="rounded-lg border bg-background">
                        <p className="border-b px-2.5 py-1.5 text-xs font-semibold text-muted-foreground">
                          Reviewing {selectedContacts.size} selected recipient{selectedContacts.size === 1 ? "" : "s"}
                        </p>
                        <ul className="max-h-40 space-y-1 overflow-y-auto p-2 text-xs">
                          {Array.from(selectedContacts.values()).map((contact) => {
                            const notice = ineligibleNotices[contact._id]
                            return (
                              <li key={contact._id} className="flex items-center justify-between gap-2">
                                <span className="truncate">
                                  {contact.email}
                                  {notice && <span className="ml-1.5 text-amber-600 dark:text-amber-400">— excluded: {notice}</span>}
                                  {!notice && contact.permissionOverride && (
                                    <span className="ml-1.5 text-emerald-600 dark:text-emerald-400">
                                      — permission confirmed by {contact.permissionOverride.confirmedByName}
                                    </span>
                                  )}
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
                      </div>
                    )}
                  </div>
                )}
              </FormSection>

              <FormSection step={3} title="Email content">
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Subject</label>
                    <Input value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="We've been named a 2026 Top Dealer!" maxLength={200} />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">
                      Greeting — use <code className="rounded bg-muted px-1 py-0.5">{"{firstName}"}</code> to personalize
                    </label>
                    <Input value={greetingText} onChange={(event) => setGreetingText(event.target.value)} maxLength={500} />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Banner image (optional)</label>
                    {bannerImageUrl ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <img src={bannerImageUrl} alt="Banner preview" className="h-14 w-24 shrink-0 rounded-md border object-cover" />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={bannerUploading}
                          onClick={() => bannerFileInputRef.current?.click()}
                        >
                          {bannerUploading ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <ImageUp className="mr-1.5 h-3.5 w-3.5" />}
                          {bannerUploading ? "Uploading…" : "Replace"}
                        </Button>
                        <Button type="button" variant="ghost" size="sm" disabled={bannerUploading} onClick={() => setBannerImageUrl("")}>
                          <X className="mr-1.5 h-3.5 w-3.5" />
                          Remove
                        </Button>
                      </div>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={bannerUploading}
                        onClick={() => bannerFileInputRef.current?.click()}
                      >
                        {bannerUploading ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <ImageUp className="mr-1.5 h-3.5 w-3.5" />}
                        {bannerUploading ? "Uploading…" : "Upload banner image"}
                      </Button>
                    )}
                    <input
                      ref={bannerFileInputRef}
                      type="file"
                      accept={EMAIL_IMAGE_ACCEPT}
                      className="hidden"
                      onChange={handleBannerFile}
                    />
                    <p className="text-[11px] text-muted-foreground">JPG, PNG, WEBP, or GIF from your device, up to 5 MB.</p>
                    {bannerError && <p className="text-[11px] text-red-600 dark:text-red-400">{bannerError}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">
                      Message — <code className="rounded bg-muted px-1 py-0.5">{"{firstName}"}</code> works here too
                    </label>
                    <EmailRichTextEditor value={bodyHtml} onChange={setBodyHtml} onUploadImage={uploadCampaignImage} />
                    <div className="flex items-center justify-end text-[11px] text-muted-foreground">
                      <span>{bodyHtml.replace(/<[^>]*>/g, "").length}/{MAX_BODY_TEXT_LENGTH} characters (approx.)</span>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Sign-off (optional)</label>
                    <Input value={signOffText} onChange={(event) => setSignOffText(event.target.value)} placeholder="We'd love the opportunity to work with you again." maxLength={300} />
                  </div>
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
                <Button disabled={!canReview} onClick={() => setConfirming(true)}>
                  <Send className="mr-2 h-4 w-4" />
                  Review &amp; {scheduleEnabled ? "schedule" : "send"}
                </Button>
              </div>
            </div>

            <div className="lg:sticky lg:top-4 lg:self-start">
              <p className="mb-2 text-sm font-bold uppercase tracking-widest text-muted-foreground">Live Preview</p>
              <div className="mb-2 space-y-1.5">
                <label className="text-[11px] font-medium text-muted-foreground">Previewing as</label>
                <Select value={activePreview?.value || NO_NAME_PREVIEW} onValueChange={setPreviewChoice}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {previewOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value} className="text-xs">
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground">
                  Greeting will read &ldquo;{previewData?.greetingName || "there"}&rdquo;. Recipients without a first name see &ldquo;there&rdquo;.
                </p>
              </div>
              <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
                <div className="flex items-center justify-between gap-2 border-b bg-muted/30 px-4 py-2.5">
                  <p className="min-w-0 truncate text-[11px] text-muted-foreground">
                    <span className="font-semibold text-foreground">Subject:</span> {previewData?.subject || "Your subject line"}
                  </p>
                  {previewLoading && <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-muted-foreground" />}
                </div>
                {previewData ? (
                  <iframe
                    title="Email preview"
                    sandbox="allow-same-origin"
                    srcDoc={previewData.html}
                    onLoad={(event) => resizePreviewFrame(event.currentTarget)}
                    className="block w-full border-0 bg-[#f4f4f4]"
                    style={{ height: previewFrameHeight }}
                  />
                ) : (
                  <p className="p-4 text-sm text-muted-foreground">{previewError || "Loading preview…"}</p>
                )}
              </div>
              <div className="mt-2 space-y-1 text-[11px]">
                {previewError && previewData && <p className="text-red-600 dark:text-red-400">{previewError}</p>}
                {previewData?.missingMailingAddress && (
                  <p className="text-amber-700 dark:text-amber-300">Add your business mailing address in Settings before sending. It appears in the footer.</p>
                )}
                {previewData && previewData.images.removedBySanitizer > 0 && (
                  <p className="text-amber-700 dark:text-amber-300">
                    {previewData.images.removedBySanitizer} image(s) will be removed before sending because their address is not a valid web link.
                  </p>
                )}
                {previewData && previewData.images.notHttps > 0 && (
                  <p className="text-amber-700 dark:text-amber-300">
                    {previewData.images.notHttps} image(s) do not use a secure https link and may not display for every recipient.
                  </p>
                )}
                {previewData && (
                  <p className="text-muted-foreground">
                    Images in this email: {previewData.images.inEmail}. Some inboxes hide images until the reader allows them, and Gmail hides them for messages in Spam.
                  </p>
                )}
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
              This will email {confirmCount ?? "…"} {confirmNoun}
              {confirmCount === 1 ? "" : "s"}
              {scheduleEnabled ? " at the scheduled time." : ". This can't be undone once emails start sending."}
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border bg-muted/30 p-3 text-xs">
            <p className="font-semibold">{name}</p>
            <p className="mt-1 text-muted-foreground">{subject}</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirming(false)} disabled={sending}>
              Cancel
            </Button>
            <Button onClick={() => void handleSend()} disabled={sending}>
              {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              {scheduleEnabled ? "Schedule" : "Send"} for {confirmCount ?? "…"} {confirmNoun}
              {confirmCount === 1 ? "" : "s"}
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
