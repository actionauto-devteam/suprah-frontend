"use client"

import * as React from "react"
import { CheckCircle2, AlertCircle, Info, X, Phone, PhoneOutgoing } from "lucide-react"
import { useAuth } from "@/providers/AuthProvider"
import { apiClient } from "@/lib/api-client"
import { initializeSocket } from "@/lib/socket.client"
import { AgentControlPanel } from "./AgentControlPanel"
import { LiveCallPanel } from "./LiveCallPanel"
import { OutboundCallPanel } from "./OutboundCallPanel"
import { CustomerInfoPanel } from "./CustomerInfoPanel"
import { CallQueue } from "./CallQueue"
import {
  AgentInfo,
  BreakReason,
  InboundCall,
  OutboundCall,
  QueuedCall,
  CallLogEntry,
  CustomerRecord,
  RecentContact,
} from "./types"
import {
  useCommStore,
  commActions,
  connectCommunicationSocket,
  CommCall,
} from "@/lib/communicationStore"
import { useTelnyxRTC } from "@/hooks/useTelnyxRTC"

interface Toast {
  id: string
  type: "success" | "error" | "info"
  message: string
  ts: Date
}

function ToastStack({ toasts, dismiss }: { toasts: Toast[]; dismiss: (id: string) => void }) {
  const icons = {
    success: <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />,
    error: <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />,
    info: <Info className="h-4 w-4 shrink-0 text-sky-500" />,
  }

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-xs pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl border text-sm shadow-xl backdrop-blur-md animate-in slide-in-from-top-2 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-100"
        >
          {icons[t.type]}
          <p className="flex-1 font-semibold text-xs">{t.message}</p>
          <button onClick={() => dismiss(t.id)} className="opacity-40 hover:opacity-100 transition-opacity cursor-pointer">
            <X className="h-3.5 w-3.5 text-zinc-400" />
          </button>
        </div>
      ))}
    </div>
  )
}

// ─── Mapping helpers: CommCall (backend) → panel view models ────────────────

const toQueuedCall = (c: CommCall): QueuedCall => ({
  id: c._id,
  callerNumber: c.from,
  callerName: c.customerName,
  waitingSince: c.startedAt || c.createdAt,
  priority: "normal",
})

const toLogEntry = (c: CommCall): CallLogEntry => ({
  id: c._id,
  callerNumber: c.direction === "inbound" ? c.from : c.to,
  callerName: c.customerName,
  direction: c.direction,
  status:
    c.status === "completed" || c.status === "in-progress"
      ? "answered"
      : c.status === "failed"
      ? "failed"
      : c.status === "canceled"
      ? "no-answer"
      : "missed",
  startedAt: c.startedAt || c.createdAt,
  duration: c.durationSec || 0,
})

type CallMode = "inbound" | "outbound"

const AGENT_STATUS_KEY = "suprah-agent-status"

export function InboundCallsTab() {
  const { getToken } = useAuth()
  const { incomingCalls, activeCall: rtcCall, softphoneReady } = useCommStore()
  const { dial, answerInbound, hangup, toggleMute, toggleHold } = useTelnyxRTC()

  const [toasts, setToasts] = React.useState<Toast[]>([])
  const [callMode, setCallMode] = React.useState<CallMode>("inbound")
  const [orgId, setOrgId] = React.useState<string | null>(null)

  const [agent, setAgent] = React.useState<AgentInfo>({
    name: "Agent Workspace",
    employeeId: "—",
    status: "offline",
  })

  // The claimed/answered inbound call (panel view model) + live outbound
  const [claimedCall, setClaimedCall] = React.useState<InboundCall | null>(null)
  const [outboundCall, setOutboundCall] = React.useState<OutboundCall | null>(null)
  const [customer, setCustomer] = React.useState<CustomerRecord | null>(null)
  const [isLoadingCustomer, setIsLoadingCustomer] = React.useState(false)
  const [logs, setLogs] = React.useState<CallLogEntry[]>([])
  const [recentContacts, setRecentContacts] = React.useState<RecentContact[]>([])
  const [onHold, setOnHold] = React.useState(false)

  const addToast = React.useCallback((type: Toast["type"], message: string) => {
    setToasts((p) => {
      if (p.some((t) => t.message === message)) return p
      const id = Math.random().toString(36).slice(2)
      window.setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000)
      return [...p, { id, type, message, ts: new Date() }]
    })
  }, [])

  // ── Identity + socket wiring ──────────────────────────────────────────────

  React.useEffect(() => {
    let cancelled = false
    const init = async () => {
      try {
        const token = await getToken()
        if (!token || cancelled) return
        const res = await apiClient.get("/api/auth/me", {
          headers: { Authorization: `Bearer ${token}` },
        })
        const user = res.data?.data || res.data
        if (cancelled) return
        setAgent((p) => ({
          ...p,
          name:
            [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
            user?.email ||
            "Agent Workspace",
          employeeId: user?.id?.slice(-6)?.toUpperCase() || user?._id?.slice(-6)?.toUpperCase() || "—",
        }))
        const resolvedOrgId = user?.organizationId || user?.orgId || null
        setOrgId(resolvedOrgId)

        const socket = initializeSocket(token)
        if (socket && resolvedOrgId) connectCommunicationSocket(socket, resolvedOrgId)

        // Restore availability across page loads.
        const saved = window.localStorage.getItem(AGENT_STATUS_KEY)
        if (saved === "available") setAgent((p) => ({ ...p, status: "available", liveAt: new Date().toISOString() }))
      } catch {
        /* identity load is best-effort; the workspace still renders */
      }
    }
    void init()
    return () => {
      cancelled = true
    }
  }, [getToken])

  // ── Ringing recovery + logs refresh ──────────────────────────────────────

  const refreshCallData = React.useCallback(async () => {
    try {
      const [ringingRes, callsRes] = await Promise.all([
        apiClient.get("/api/crm/communications/calls/ringing"),
        apiClient.get("/api/crm/communications/calls", { params: { limit: 50 } }),
      ])
      const ringing: CommCall[] = ringingRes.data?.data?.items || []
      ringing.forEach((c) => commActions.upsertCall(c))

      const items: CommCall[] = callsRes.data?.data?.items || []
      const finished = items.filter((c) =>
        ["completed", "missed", "failed", "canceled"].includes(c.status),
      )
      setLogs(finished.map(toLogEntry))

      const seen = new Set<string>()
      const contacts: RecentContact[] = []
      for (const c of finished) {
        if (c.direction !== "outbound") continue
        if (seen.has(c.to)) continue
        seen.add(c.to)
        contacts.push({ name: c.customerName || c.to, number: c.to, lastCalled: c.startedAt })
        if (contacts.length >= 5) break
      }
      setRecentContacts(contacts)
    } catch {
      /* keep last known data on transient failures */
    }
  }, [])

  React.useEffect(() => {
    void refreshCallData()
    const iv = window.setInterval(() => void refreshCallData(), 30_000)
    return () => window.clearInterval(iv)
  }, [refreshCallData])

  // Refresh logs whenever a call finishes (socket-driven, no tight polling).
  const finishedCountRef = React.useRef(0)
  React.useEffect(() => {
    finishedCountRef.current += 1
    if (finishedCountRef.current > 1) void refreshCallData()
  }, [rtcCall === null, refreshCallData])

  // ── Derive stats ──────────────────────────────────────────────────────────

  const todayKey = new Date().toDateString()
  const todaysAnswered = logs.filter(
    (l) => l.status === "answered" && new Date(l.startedAt).toDateString() === todayKey,
  )
  const todayCalls = todaysAnswered.length
  const avgHandle = React.useMemo(() => {
    if (!todaysAnswered.length) return "—"
    const avg = Math.round(todaysAnswered.reduce((s, l) => s + l.duration, 0) / todaysAnswered.length)
    return `${Math.floor(avg / 60)}m ${String(avg % 60).padStart(2, "0")}s`
  }, [todaysAnswered])

  // ── Sync RTC store state → panel view models ─────────────────────────────

  React.useEffect(() => {
    if (!rtcCall) {
      if (claimedCall) {
        setClaimedCall(null)
        setOnHold(false)
        setAgent((p) => (p.status === "on-call" ? { ...p, status: "available" } : p))
      }
      if (outboundCall) {
        setOutboundCall(null)
        setOnHold(false)
        setAgent((p) => (p.status === "on-call" ? { ...p, status: "available" } : p))
      }
      return
    }

    if (rtcCall.kind === "inbound") {
      setClaimedCall((prev) => ({
        id: rtcCall.callLogId || prev?.id || "",
        callerNumber: rtcCall.phoneNumber,
        callerName: rtcCall.displayName,
        status: onHold ? "on-hold" : rtcCall.phase === "active" ? "connected" : "ringing",
        startedAt: prev?.startedAt || new Date().toISOString(),
        answeredAt: rtcCall.startedAt ? new Date(rtcCall.startedAt).toISOString() : prev?.answeredAt,
        isRecording: false,
        isMuted: rtcCall.muted,
      }))
      if (rtcCall.phase === "active") setAgent((p) => ({ ...p, status: "on-call" }))
    } else {
      setOutboundCall((prev) => ({
        id: rtcCall.clientCallId || prev?.id || "",
        dialedNumber: rtcCall.phoneNumber,
        contactName: rtcCall.displayName,
        status:
          onHold
            ? "on-hold"
            : rtcCall.phase === "active"
            ? "connected"
            : rtcCall.phase === "connecting"
            ? "dialing"
            : "ringing",
        startedAt: prev?.startedAt || new Date().toISOString(),
        answeredAt: rtcCall.startedAt ? new Date(rtcCall.startedAt).toISOString() : prev?.answeredAt,
        isRecording: false,
        isMuted: rtcCall.muted,
      }))
      if (rtcCall.phase === "active") setAgent((p) => ({ ...p, status: "on-call" }))
      setCallMode("outbound")
    }
  }, [rtcCall, onHold]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Real customer lookup on connect ──────────────────────────────────────

  React.useEffect(() => {
    const phone =
      claimedCall?.status === "connected"
        ? claimedCall.callerNumber
        : outboundCall?.status === "connected"
        ? outboundCall.dialedNumber
        : null

    if (!phone) {
      setCustomer(null)
      return
    }

    let cancelled = false
    const lookup = async () => {
      setIsLoadingCustomer(true)
      try {
        const res = await apiClient.get("/api/crm/communications/lookup", { params: { phone } })
        if (!cancelled) setCustomer(res.data?.data?.record || null)
      } catch {
        if (!cancelled) setCustomer(null)
      } finally {
        if (!cancelled) setIsLoadingCustomer(false)
      }
    }
    void lookup()
    return () => {
      cancelled = true
    }
  }, [claimedCall?.status, outboundCall?.status]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Agent availability (client-side gate for the ringing surface) ────────

  const goLive = () => {
    window.localStorage.setItem(AGENT_STATUS_KEY, "available")
    setAgent((p) => ({ ...p, status: "available", liveAt: new Date().toISOString(), breakReason: undefined }))
    addToast(
      "success",
      softphoneReady ? "You're online — incoming calls will ring here" : "You're online — softphone is connecting",
    )
  }

  const goOffline = () => {
    window.localStorage.setItem(AGENT_STATUS_KEY, "offline")
    if (rtcCall) hangup()
    setAgent((p) => ({ ...p, status: "offline", liveAt: undefined, breakReason: undefined }))
    setCustomer(null)
    addToast("info", "You're offline — calls will ring for other teammates")
  }

  const takeBreak = (reason: BreakReason) => {
    window.localStorage.setItem(AGENT_STATUS_KEY, "break")
    setAgent((p) => ({ ...p, status: "break", breakReason: reason }))
    addToast("info", "On break — incoming calls muted for you")
  }

  const resumeFromBreak = () => {
    window.localStorage.setItem(AGENT_STATUS_KEY, "available")
    setAgent((p) => ({ ...p, status: "available", breakReason: undefined }))
    addToast("success", "Back online")
  }

  // ── Inbound actions (real claim + bridge) ─────────────────────────────────

  const answerCall = async () => {
    const ringingCall = incomingCalls[0] || null
    if (!ringingCall) return
    try {
      await answerInbound(ringingCall._id, {
        phoneNumber: ringingCall.from,
        displayName: ringingCall.customerName || ringingCall.from,
      })
      setCallMode("inbound")
      addToast("success", "Call claimed — bridging audio to your browser")
    } catch (err: any) {
      addToast(
        "error",
        err?.response?.status === 409
          ? "Another teammate answered this call"
          : err?.response?.data?.message || "Couldn't answer the call",
      )
    }
  }

  const pickupQueued = async (queuedId: string) => {
    const q = incomingCalls.find((c) => c._id === queuedId)
    if (!q) return
    try {
      await answerInbound(q._id, {
        phoneNumber: q.from,
        displayName: q.customerName || q.from,
      })
      setCallMode("inbound")
      addToast("success", `Connected to ${q.customerName || q.from}`)
    } catch (err: any) {
      addToast(
        "error",
        err?.response?.status === 409
          ? "Another teammate answered this call"
          : err?.response?.data?.message || "Couldn't pick up the call",
      )
    }
  }

  const endCall = () => {
    hangup()
    setCustomer(null)
    addToast("info", "Call ended")
    window.setTimeout(() => void refreshCallData(), 1200)
  }

  const handleMuteToggle = () => toggleMute()

  const handleHoldToggle = () => {
    const next = !onHold
    const ok = toggleHold(next)
    if (!ok) {
      addToast("error", "Hold isn't available right now")
      return
    }
    setOnHold(next)
    addToast("info", next ? "Caller placed on hold" : "Caller taken off hold")
  }

  const handleRecordToggle = () => {
    addToast("info", "Call recording isn't enabled for this workspace yet")
  }

  const handleTransfer = () => {
    addToast("info", "Warm transfer is coming in the next phase")
  }

  // ── Outbound actions (real dial) ──────────────────────────────────────────

  const dialOutbound = async (number: string, name?: string) => {
    if (!number || rtcCall) return
    if (!softphoneReady) {
      addToast("error", "Softphone is still connecting — try again in a moment")
      return
    }
    try {
      await dial(number, { displayName: name })
      setCallMode("outbound")
      addToast("success", `Dialing ${name || number}`)
    } catch {
      addToast("error", "Couldn't start the call")
    }
  }

  // ── Create-lead action for the CRM records panel ──────────────────────────

  const createLead = async (data: { name: string; phone: string; email?: string }) => {
    try {
      const [firstName, ...rest] = (data.name || "").trim().split(/\s+/)
      await apiClient.post("/api/leads", {
        firstName: firstName || data.name,
        lastName: rest.join(" "),
        phone: data.phone,
        email: data.email,
        source: "Inbound Call",
        channel: "phone",
      })
      addToast("success", `Lead created for ${data.name}`)
    } catch {
      addToast("error", "Couldn't create the lead")
    }
  }

  // ── Render — EXACT original 3-panel layout, now driven by real telephony ──

  const queue: QueuedCall[] = incomingCalls
    .filter((c) => !(claimedCall && c._id === claimedCall.id))
    .map(toQueuedCall)

  const ringingCall = incomingCalls[0] || null
  const showRinging = agent.status === "available" && !rtcCall && !!ringingCall

  const liveCallForPanel: InboundCall | null =
    claimedCall ||
    (showRinging && ringingCall
      ? {
          id: ringingCall._id,
          callerNumber: ringingCall.from,
          callerName: ringingCall.customerName,
          status: "ringing",
          startedAt: ringingCall.startedAt || ringingCall.createdAt,
          isRecording: false,
          isMuted: false,
        }
      : null)

  const activeInboundCall = agent.status !== "offline" ? liveCallForPanel : null
  const activeOutboundCall = agent.status !== "offline" ? outboundCall : null
  const currentCall = callMode === "inbound" ? claimedCall : activeOutboundCall
  const callerNumber = claimedCall?.callerNumber || outboundCall?.dialedNumber

  return (
    <div className="flex flex-col gap-6 p-1 md:p-2 max-w-[1600px] mx-auto w-full transition-colors duration-200">
      <ToastStack toasts={toasts} dismiss={(id) => setToasts((p) => p.filter((t) => t.id !== id))} />

      {/* Header Deck Area */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-100 dark:border-zinc-800 pb-5">
        <div>
          <h2 className="text-xl md:text-2xl font-bold tracking-tight text-zinc-800 dark:text-zinc-100">Live Agent Console</h2>
          <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1 font-medium flex items-center gap-2">
            {agent.status === "offline"
              ? "Console offline · System decoupled"
              : `Gateway Connected · Matrix Mode: ${agent.status}`}
            <span className="inline-flex items-center gap-1.5">
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  softphoneReady ? "bg-emerald-500" : "bg-zinc-300 dark:bg-zinc-600 animate-pulse"
                }`}
              />
              {softphoneReady ? "Softphone ready" : "Softphone connecting"}
            </span>
          </p>
        </div>

        {/* Mode Toggle Controls */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700/60 self-start sm:self-auto shadow-sm">
          <button
            onClick={() => setCallMode("inbound")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              callMode === "inbound"
                ? "bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-emerald-600 dark:text-emerald-400 shadow-sm"
                : "text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300"
            }`}
          >
            <Phone className="h-3.5 w-3.5" />
            Inbound Link
            {activeInboundCall && (
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            )}
          </button>
          <button
            onClick={() => setCallMode("outbound")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              callMode === "outbound"
                ? "bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-violet-600 dark:text-violet-400 shadow-sm"
                : "text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300"
            }`}
          >
            <PhoneOutgoing className="h-3.5 w-3.5" />
            Outbound Hub
            {activeOutboundCall && (
              <span className="h-1.5 w-1.5 rounded-full bg-violet-500 animate-pulse" />
            )}
          </button>
        </div>
      </div>

      {/* 3-Panel Central Workspace */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[240px_1fr_310px] gap-5 min-h-[540px]">
        {/* Left Card Anchor */}
        <div className="md:col-span-1 lg:col-span-1">
          <AgentControlPanel
            agent={agent}
            onGoLive={goLive}
            onGoOffline={goOffline}
            onBreak={takeBreak}
            onResumeFromBreak={resumeFromBreak}
            todayCalls={todayCalls}
            avgHandle={avgHandle}
          />
        </div>

        {/* Center Control Console Card */}
        <div className="md:col-span-1 lg:col-span-1">
          {callMode === "inbound" ? (
            <LiveCallPanel
              call={activeInboundCall}
              agentStatus={agent.status}
              onAnswer={answerCall}
              onEnd={endCall}
              onMuteToggle={handleMuteToggle}
              onHoldToggle={handleHoldToggle}
              onTransfer={handleTransfer}
              onConference={() => addToast("info", "Conference calling is coming in the next phase")}
              onRecordToggle={handleRecordToggle}
            />
          ) : (
            <OutboundCallPanel
              activeCall={activeOutboundCall}
              recentContacts={recentContacts}
              onDial={dialOutbound}
              onEnd={endCall}
              onMuteToggle={handleMuteToggle}
              onHoldToggle={handleHoldToggle}
              onRecordToggle={handleRecordToggle}
            />
          )}
        </div>

        {/* Right CRM Records Stack */}
        <div className="md:col-span-2 lg:col-span-1">
          <CustomerInfoPanel
            call={currentCall as any}
            callerNumber={callerNumber}
            customer={customer}
            isLoadingCustomer={isLoadingCustomer}
            onCreateLead={createLead}
          />
        </div>
      </div>

      {/* Bottom Layout Queue Pipeline */}
      <CallQueue queue={queue} logs={logs} onPickupQueued={pickupQueued} />
    </div>
  )
}
