"use client"

import * as React from "react"
import Link from "next/link"
import { FlaskConical, Loader2, Plus, Send, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { apiClient } from "@/lib/api-client"
import { cn } from "@/lib/utils"
import { fmtLongDateTimeMDT, fmtShortDateTimeMDT } from "@/lib/timezone"
import { getAppointmentStatusStyle } from "@/lib/appointmentStatus"

const NURTURE_TOTAL = 3
const TIMELINE_POLL_MS = 4000

interface DemoScenario {
  lead: { _id: string; firstName: string; lastName: string; phone: string; status: string }
  appointment: {
    _id: string
    title: string
    status: string
    startTime: string
    reminderSent: boolean
    noShowFollowUpSentAt: string | null
    reviewRequestSentAt: string | null
    reviewRequestEmailSentAt: string | null
  } | null
  optedOut: boolean
  nurtureCount: number
}

interface ThreadMessage {
  _id: string
  direction: "inbound" | "outbound"
  body: string
  createdAt: string
}

interface ActionResult {
  scenario?: DemoScenario
  blocked?: boolean
  scenarios?: DemoScenario[]
  enabled?: boolean
}

type ApiCall = () => Promise<{ data?: { data?: ActionResult; message?: string } }>

const QUICK_REPLIES = [
  { label: "YES", text: "YES" },
  { label: "CANCEL", text: "CANCEL" },
  { label: "Random question", text: "Can I bring my kids?" },
  { label: "STOP", text: "STOP" },
  { label: "START", text: "START" },
]

function getErrorMessage(error: unknown, fallback: string) {
  return (
    (error as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback
  )
}

function DemoTimeline({
  leadId,
  phone,
  refreshKey,
}: {
  leadId: string
  phone: string
  refreshKey: number
}) {
  const [messages, setMessages] = React.useState<ThreadMessage[]>([])
  const listRef = React.useRef<HTMLDivElement | null>(null)

  const load = React.useCallback(async () => {
    try {
      const response = await apiClient.get(`/api/crm/communications/customers/${leadId}/thread`, {
        params: { leadId, phone },
      })
      const payload = response.data?.data || response.data
      setMessages((payload?.messages || []) as ThreadMessage[])
    } catch {
      return
    }
  }, [leadId, phone])

  React.useEffect(() => {
    void load()
    const timer = window.setInterval(() => void load(), TIMELINE_POLL_MS)
    return () => window.clearInterval(timer)
  }, [load, refreshKey])

  React.useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight
  }, [messages.length])

  return (
    <div className="flex h-full min-h-64 flex-col rounded-xl border bg-muted/20">
      <p className="border-b px-4 py-2.5 text-xs font-bold uppercase tracking-widest text-muted-foreground">
        Conversation
      </p>
      <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto p-4" aria-live="polite">
        {messages.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No texts yet. Use the steps on the left and the messages will appear here.
          </p>
        ) : (
          messages.map((message) => {
            const fromDealership = message.direction === "outbound"
            return (
              <div
                key={message._id}
                className={cn("flex flex-col", fromDealership ? "items-end" : "items-start")}
              >
                <span className="mb-0.5 text-[10px] text-muted-foreground">
                  {fromDealership ? "Dealership (automatic text)" : "Customer"} ·{" "}
                  {fmtShortDateTimeMDT(message.createdAt)}
                </span>
                <div
                  className={cn(
                    "max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-sm [overflow-wrap:anywhere]",
                    fromDealership
                      ? "rounded-br-sm bg-primary text-primary-foreground"
                      : "rounded-bl-sm bg-background text-foreground border",
                  )}
                >
                  {message.body}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

function StepHeading({ number, title, hint }: { number: number; title: string; hint: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
        {number}
      </span>
      <div className="min-w-0">
        <p className="text-sm font-semibold leading-tight">{title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
      </div>
    </div>
  )
}

function DemoScenarioCard({
  scenario,
  busy,
  refreshKey,
  onAction,
}: {
  scenario: DemoScenario
  busy: string
  refreshKey: number
  onAction: (leadId: string, key: string, path: string, body?: object) => void
}) {
  const [replyDraft, setReplyDraft] = React.useState("")
  const { lead, appointment } = scenario
  const leadId = lead._id
  const anyBusy = busy !== ""
  const isBusy = (key: string) => busy === `${leadId}:${key}`
  const statusStyle = appointment ? getAppointmentStatusStyle(appointment.status) : null

  const sendReply = (text: string, key: string) => {
    onAction(leadId, key, "reply", { text })
  }

  return (
    <section className="space-y-4 rounded-2xl border bg-card p-4 shadow-sm sm:p-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-semibold leading-tight">
            {lead.firstName} {lead.lastName}
          </h2>
          <p className="mt-0.5 font-mono text-xs text-muted-foreground">{lead.phone} (fictional number)</p>
          {appointment && (
            <p className="mt-1 text-xs text-muted-foreground">
              {appointment.title} · {fmtLongDateTimeMDT(appointment.startTime)}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {appointment && statusStyle && (
            <Badge variant="outline" className={cn("capitalize", statusStyle.badge)}>
              {appointment.status}
            </Badge>
          )}
          {scenario.optedOut && (
            <Badge variant="outline" className="border-red-500/40 bg-red-500/10 text-red-600 dark:text-red-400">
              Opted out (STOP)
            </Badge>
          )}
          <Badge variant="outline">
            Follow-ups sent: {scenario.nurtureCount}/{NURTURE_TOTAL}
          </Badge>
        </div>
      </header>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-5">
          <div className="space-y-2.5">
            <StepHeading
              number={1}
              title="Appointment reminder"
              hint="The customer is texted the reminder with the reply instructions."
            />
            <Button
              size="sm"
              variant="outline"
              disabled={anyBusy}
              onClick={() => onAction(leadId, "reminder", "reminder")}
            >
              {isBusy("reminder") && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
              Send reminder text
            </Button>
          </div>

          <div className="space-y-2.5">
            <StepHeading
              number={2}
              title="Customer replies by text"
              hint="YES confirms the appointment. CANCEL only alerts staff to call back (nothing is cancelled). Other messages are ignored. STOP blocks every automated text."
            />
            <div className="flex flex-wrap gap-2">
              {QUICK_REPLIES.map((reply) => (
                <Button
                  key={reply.label}
                  size="sm"
                  variant="outline"
                  disabled={anyBusy}
                  onClick={() => sendReply(reply.text, `reply-${reply.label}`)}
                >
                  {isBusy(`reply-${reply.label}`) && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
                  {reply.label}
                </Button>
              ))}
            </div>
            <form
              className="flex items-center gap-2"
              onSubmit={(event) => {
                event.preventDefault()
                if (!replyDraft.trim() || anyBusy) return
                sendReply(replyDraft.trim(), "reply-custom")
                setReplyDraft("")
              }}
            >
              <Input
                value={replyDraft}
                onChange={(event) => setReplyDraft(event.target.value)}
                placeholder="Or type what the customer texts back"
                maxLength={300}
                aria-label="Customer reply"
              />
              <Button type="submit" size="icon" variant="outline" disabled={anyBusy || !replyDraft.trim()} aria-label="Send customer reply">
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>

          <div className="space-y-2.5">
            <StepHeading
              number={3}
              title="Customer does not show up"
              hint="After a no-show, the system texts the customer to rebook. In real life this waits 30 minutes and only sends 9 AM to 8 PM; the demo sends it now."
            />
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={anyBusy || !appointment}
                onClick={() => onAction(leadId, "no-show", "no-show")}
              >
                {isBusy("no-show") && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
                Mark as No-Show
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={anyBusy || appointment?.status !== "no-show"}
                onClick={() => onAction(leadId, "no-show-followup", "no-show-followup")}
              >
                {isBusy("no-show-followup") && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
                Send no-show follow-up now
              </Button>
            </div>
          </div>

          <div className="space-y-2.5">
            <StepHeading
              number={4}
              title="Customer completes the appointment"
              hint="Once completed, the system texts and emails asking for a review — with your review link if you've set one in Settings, or a softer ask if not."
            />
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={anyBusy || !appointment}
                onClick={() => onAction(leadId, "complete", "complete")}
              >
                {isBusy("complete") && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
                Mark as Completed
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={anyBusy || appointment?.status !== "completed"}
                onClick={() => onAction(leadId, "review-request", "review-request")}
              >
                {isBusy("review-request") && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
                Send review request now
              </Button>
            </div>
            {appointment?.status === "completed" && (
              <p className="text-xs text-muted-foreground">
                SMS:{" "}
                {appointment.reviewRequestSentAt
                  ? `sent ${fmtShortDateTimeMDT(appointment.reviewRequestSentAt)}`
                  : "not yet sent"}
                {" · "}
                Email:{" "}
                {appointment.reviewRequestEmailSentAt
                  ? `sent ${fmtShortDateTimeMDT(appointment.reviewRequestEmailSentAt)}`
                  : "not yet sent"}
              </p>
            )}
          </div>

          <div className="space-y-2.5">
            <StepHeading
              number={5}
              title="Follow-ups for a quiet lead"
              hint="Three short texts at about day 1, 3 and 7 when a lead goes silent. The demo sends the next one now."
            />
            <Button
              size="sm"
              variant="outline"
              disabled={anyBusy || scenario.nurtureCount >= NURTURE_TOTAL}
              onClick={() => onAction(leadId, "nurture", "nurture")}
            >
              {isBusy("nurture") && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
              Send follow-up {Math.min(scenario.nurtureCount + 1, NURTURE_TOTAL)} of {NURTURE_TOTAL}
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t pt-3 text-xs">
            <span className="text-muted-foreground">See it in the real screens:</span>
            <Link href="/crm/leads" className="font-medium text-primary hover:underline">
              Leads
            </Link>
            <Link href="/crm/appointments" className="font-medium text-primary hover:underline">
              Appointments (open it, then look for the Conversation box)
            </Link>
            <span className="text-muted-foreground">Staff alerts appear in the bell icon.</span>
          </div>
        </div>

        <DemoTimeline leadId={leadId} phone={lead.phone} refreshKey={refreshKey} />
      </div>
    </section>
  )
}

export default function DemoLabPage() {
  const [enabled, setEnabled] = React.useState<boolean | null>(null)
  const [scenarios, setScenarios] = React.useState<DemoScenario[]>([])
  const [name, setName] = React.useState("")
  const [busy, setBusy] = React.useState("")
  const [error, setError] = React.useState("")
  const [notice, setNotice] = React.useState("")
  const [refreshKey, setRefreshKey] = React.useState(0)

  const loadScenarios = React.useCallback(async () => {
    try {
      const response = await apiClient.get("/api/crm/demo/scenarios")
      const payload = (response.data?.data || response.data) as ActionResult
      setScenarios(payload?.scenarios || [])
    } catch (err) {
      setError(getErrorMessage(err, "Could not load the demo customers."))
    }
  }, [])

  React.useEffect(() => {
    let cancelled = false

    const init = async () => {
      try {
        const response = await apiClient.get("/api/crm/demo/status")
        const payload = (response.data?.data || response.data) as ActionResult
        if (cancelled) return
        setEnabled(Boolean(payload?.enabled))
        if (payload?.enabled) await loadScenarios()
      } catch {
        if (!cancelled) setEnabled(false)
      }
    }

    void init()
    return () => {
      cancelled = true
    }
  }, [loadScenarios])

  const applyScenario = React.useCallback((scenario: DemoScenario) => {
    setScenarios((previous) =>
      previous.some((item) => item.lead._id === scenario.lead._id)
        ? previous.map((item) => (item.lead._id === scenario.lead._id ? scenario : item))
        : [scenario, ...previous],
    )
  }, [])

  const run = React.useCallback(
    async (key: string, call: ApiCall) => {
      setBusy(key)
      setError("")
      setNotice("")
      try {
        const response = await call()
        const payload = response.data?.data
        if (payload?.scenario) applyScenario(payload.scenario)
        if (response.data?.message) {
          setNotice(response.data.message)
        } else if (payload?.blocked) {
          setNotice("Blocked: this number opted out with STOP, so the automatic text was not sent.")
        }
        setRefreshKey((value) => value + 1)
      } catch (err) {
        setError(getErrorMessage(err, "Something went wrong. Please try again."))
      } finally {
        setBusy("")
      }
    },
    [applyScenario],
  )

  const handleAction = (leadId: string, key: string, path: string, body?: object) => {
    void run(`${leadId}:${key}`, () =>
      apiClient.post(`/api/crm/demo/scenarios/${leadId}/${path}`, body ?? {}),
    )
  }

  const handleCreate = async () => {
    await run("create", () =>
      apiClient.post("/api/crm/demo/scenarios", { name: name.trim() || undefined }),
    )
    setName("")
  }

  const handleReset = async () => {
    if (!window.confirm("Delete all demo customers with their appointments, texts and notifications?")) {
      return
    }
    setBusy("reset")
    setError("")
    setNotice("")
    try {
      await apiClient.delete("/api/crm/demo/scenarios")
      setScenarios([])
      setRefreshKey((value) => value + 1)
      setNotice("Demo data deleted.")
    } catch (err) {
      setError(getErrorMessage(err, "Could not delete the demo data."))
    } finally {
      setBusy("")
    }
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
        <header className="space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <FlaskConical className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight">Demo Lab</h1>
            <Badge variant="secondary">Simulated SMS</Badge>
          </div>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Try the text-message features without a real phone. Demo customers use fictional 555-01XX
            numbers, so no real text is ever sent. Everything else is the real system: the same replies,
            statuses, notifications and conversation history you would see with a real customer.
          </p>
        </header>

        {enabled === null && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        )}

        {enabled === false && (
          <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm">
            Demo Lab is turned off on this server. Set <code className="font-mono">DEMO_LAB_ENABLED=true</code>{" "}
            in the backend environment and restart to use it.
          </div>
        )}

        {enabled && (
          <>
            <div className="flex flex-col gap-3 rounded-xl border bg-card p-4 sm:flex-row sm:items-center">
              <Input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Customer name (optional, default: Demo Customer)"
                maxLength={60}
                aria-label="Demo customer name"
                className="sm:max-w-sm"
              />
              <Button onClick={() => void handleCreate()} disabled={busy !== ""}>
                {busy === "create" ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="mr-2 h-4 w-4" />
                )}
                Create demo customer
              </Button>
              <Button
                variant="ghost"
                className="text-destructive hover:text-destructive sm:ml-auto"
                onClick={() => void handleReset()}
                disabled={busy !== ""}
              >
                {busy === "reset" ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="mr-2 h-4 w-4" />
                )}
                Delete all demo data
              </Button>
            </div>

            {error && (
              <p className="text-sm text-red-500" role="alert">
                {error}
              </p>
            )}
            {notice && <p className="text-sm text-amber-600 dark:text-amber-400">{notice}</p>}

            {scenarios.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No demo customers yet. Create one to start. It comes with a test-drive appointment 45
                minutes from now.
              </p>
            ) : (
              <div className="space-y-6">
                {scenarios.map((scenario) => (
                  <DemoScenarioCard
                    key={scenario.lead._id}
                    scenario={scenario}
                    busy={busy}
                    refreshKey={refreshKey}
                    onAction={handleAction}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
