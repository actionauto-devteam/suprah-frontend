"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Loader2, Mail, Send, Users, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { apiClient } from "@/lib/api-client"
import { useAuth } from "@/providers/AuthProvider"
import { cn } from "@/lib/utils"
import { fmtLongDateTimeMDT } from "@/lib/timezone"
import { LEAD_STATUS_VALUES } from "@/lib/leadStatus"

const STATUS_OPTIONS = LEAD_STATUS_VALUES
const MAX_BODY_LENGTH = 5000

interface Campaign {
  _id: string
  name: string
  subject: string
  greetingText: string
  bodyText: string
  bannerImageUrl?: string
  signOffText?: string
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
  return (error as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback
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
          <p className="mt-1 line-clamp-2 max-w-xl text-xs text-muted-foreground">{campaign.subject}</p>
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

export default function EmailCampaignsPage() {
  const router = useRouter()
  const { getToken } = useAuth()

  const [campaigns, setCampaigns] = React.useState<Campaign[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState("")
  const [busyId, setBusyId] = React.useState("")

  const [name, setName] = React.useState("")
  const [subject, setSubject] = React.useState("")
  const [greetingText, setGreetingText] = React.useState("Hi {firstName},")
  const [bannerImageUrl, setBannerImageUrl] = React.useState("")
  const [bodyText, setBodyText] = React.useState("")
  const [signOffText, setSignOffText] = React.useState("")
  const [statuses, setStatuses] = React.useState<string[]>([])
  const [audienceCount, setAudienceCount] = React.useState<number | null>(null)
  const [confirming, setConfirming] = React.useState(false)
  const [sending, setSending] = React.useState(false)
  const [formError, setFormError] = React.useState("")

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

  React.useEffect(() => {
    let cancelled = false
    const timer = window.setTimeout(async () => {
      try {
        const t = await getToken()
        const res = await apiClient.get("/api/crm/email-campaigns/audience-count", {
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

  const canReview =
    name.trim().length > 0 && subject.trim().length > 0 && greetingText.trim().length > 0 && bodyText.trim().length > 0

  const previewFor = (text: string) => text.replace(/\{firstName\}/gi, "Jordan")

  const handleSend = async () => {
    setSending(true)
    setFormError("")
    try {
      const t = await getToken()
      await apiClient.post(
        "/api/crm/email-campaigns",
        {
          name: name.trim(),
          subject: subject.trim(),
          greetingText: greetingText.trim(),
          bannerImageUrl: bannerImageUrl.trim(),
          bodyText: bodyText.trim(),
          signOffText: signOffText.trim(),
          statuses,
        },
        { headers: { Authorization: `Bearer ${t}` } },
      )
      setName("")
      setSubject("")
      setGreetingText("Hi {firstName},")
      setBannerImageUrl("")
      setBodyText("")
      setSignOffText("")
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
      await apiClient.post(`/api/crm/email-campaigns/${id}/cancel`, {}, { headers: { Authorization: `Bearer ${t}` } })
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
            <Mail className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-bold tracking-tight">Email Campaigns</h1>
          </div>
        </div>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Send one announcement email to a group of leads at once, by status — award wins, holiday greetings, and
          other updates. Opted-out addresses are skipped automatically, and every email includes an unsubscribe link.
        </p>

        <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="space-y-3 rounded-2xl border bg-card p-4 sm:p-6">
            <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">New campaign</h2>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold">Campaign name</label>
              <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. 2026 Top Dealer Award" maxLength={120} />
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
                {audienceCount === null ? "Counting…" : `${audienceCount} lead${audienceCount === 1 ? "" : "s"} with an email address`}
                {audienceCount !== null && audienceCount > 500 ? " (first 500 will be used)" : ""}
              </p>
            </div>

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

            {formError && <p className="text-sm text-red-500">{formError}</p>}

            <div className="pt-2">
              <Button disabled={!canReview} onClick={() => setConfirming(true)}>
                <Send className="mr-2 h-4 w-4" />
                Review &amp; send
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
                <p className="text-xs font-semibold text-muted-foreground">{subject || "Subject line"}</p>
                <p className="text-sm">{previewFor(greetingText) || "Hi Jordan,"}</p>
                <p className="whitespace-pre-line text-sm text-muted-foreground">{previewFor(bodyText) || "Your message will appear here."}</p>
                {signOffText && <p className="text-sm text-muted-foreground">{previewFor(signOffText)}</p>}
              </div>
            </div>
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
                  This will email {audienceCount ?? "…"} lead{audienceCount === 1 ? "" : "s"}. This can&apos;t be undone
                  once emails start sending.
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
                Send to {audienceCount ?? "…"} lead{audienceCount === 1 ? "" : "s"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
