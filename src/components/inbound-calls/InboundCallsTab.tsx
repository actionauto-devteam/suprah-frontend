"use client"

import * as React from "react"
import { CheckCircle2, AlertCircle, Info, X, Phone, PhoneOutgoing } from "lucide-react"
import { useAuth } from "@/providers/AuthProvider"
import { apiClient } from "@/lib/api-client"
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
  const styles = {
    success: "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-100 shadow-xl",
    error: "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-100 shadow-xl",
    info: "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-100 shadow-xl",
  }

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-xs pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl border text-sm shadow-xl backdrop-blur-md animate-in slide-in-from-top-2 ${styles[t.type]}`}
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

// ─── Workspace Canvas Redesign ───────────────────────────────────────────────

type CallMode = "inbound" | "outbound"

export function InboundCallsTab() {
  const { getToken } = useAuth()

  const [toasts, setToasts] = React.useState<Toast[]>([])
  const [callMode, setCallMode] = React.useState<CallMode>("inbound")
  const [todayCalls, setTodayCalls] = React.useState(0)
  const [avgHandle, setAvgHandle] = React.useState("—")

  const [agent, setAgent] = React.useState<AgentInfo>({
    name: "Agent Workspace",
    employeeId: "—",
    status: "offline",
  })

  const [activeCall, setActiveCall] = React.useState<InboundCall | null>(null)
  const [outboundCall, setOutboundCall] = React.useState<OutboundCall | null>(null)
  const [customer, setCustomer] = React.useState<CustomerRecord | null>(null)
  const [isLoadingCustomer, setIsLoadingCustomer] = React.useState(false)
  const [queue, setQueue] = React.useState<QueuedCall[]>([])
  const [logs, setLogs] = React.useState<CallLogEntry[]>([])
  const [recentContacts, setRecentContacts] = React.useState<RecentContact[]>([])

  // ── Init Matrix ──────────────────────────────────────────────────────────

  React.useEffect(() => {
    const load = async () => {
      try {
        const token = await getToken()
        if (!token) return
        const res = await apiClient.get("/api/auth/me", { headers: { Authorization: `Bearer ${token}` } })
        const user = res.data
        setAgent((p) => ({
          ...p,
          name: [user?.firstName, user?.lastName].filter(Boolean).join(" ") || user?.email || "Agent Workspace",
          employeeId: user?.id?.slice(-6)?.toUpperCase() || "—",
        }))
      } catch {}
    }
    load()
  }, [getToken])

  // ── Network Polling Sync ──────────────────────────────────────────────────

  React.useEffect(() => {
    if (agent.status === "offline") return
    const poll = async () => {
      try {
        const token = await getToken()
        if (!token) return
        const [qRes, lRes] = await Promise.all([
          apiClient.get("/api/calls/queue", { headers: { Authorization: `Bearer ${token}` } }),
          apiClient.get("/api/calls/logs", { headers: { Authorization: `Bearer ${token}` } }),
        ])
        setQueue(qRes.data?.data || [])
        const fetchedLogs: CallLogEntry[] = lRes.data?.data || []
        setLogs(fetchedLogs)

        // Run Compute Aggregates
        const answered = fetchedLogs.filter((l) => l.status === "answered")
        setTodayCalls(answered.length)
        if (answered.length > 0) {
          const avg = Math.round(answered.reduce((s, l) => s + l.duration, 0) / answered.length)
          const m = Math.floor(avg / 60), s = avg % 60
          setAvgHandle(`${m}m ${String(s).padStart(2, "0")}s`)
        }

        // Aggregate Recent contacts
        const outboundLogs = fetchedLogs.filter((l) => l.direction === "outbound" && l.callerName)
        const seen = new Set<string>()
        const contacts: RecentContact[] = []
        for (const log of outboundLogs) {
          if (!seen.has(log.callerNumber)) {
            seen.add(log.callerNumber)
            contacts.push({ name: log.callerName || log.callerNumber, number: log.callerNumber, lastCalled: log.startedAt })
          }
          if (contacts.length >= 5) break
        }
        setRecentContacts(contacts)
      } catch {}
    }
    poll()
    const iv = setInterval(poll, 10000)
    return () => clearInterval(iv)
  }, [agent.status, getToken])

  // ── Sync Incoming Routing Thread ──────────────────────────────────────────

  React.useEffect(() => {
    if (agent.status !== "available") return
    const poll = async () => {
      try {
        const token = await getToken()
        if (!token) return
        const res = await apiClient.get("/api/calls/incoming", { headers: { Authorization: `Bearer ${token}` } })
        const incoming = res.data?.data
        if (incoming && !activeCall) {
          setActiveCall({
            id: incoming.id,
            callerNumber: incoming.callerNumber,
            callerName: incoming.callerName,
            status: "ringing",
            startedAt: incoming.startedAt || new Date().toISOString(),
            isRecording: false,
            isMuted: false,
          })
          setCallMode("inbound")
        }
      } catch {}
    }
    poll()
    const iv = setInterval(poll, 5000)
    return () => clearInterval(iv)
  }, [agent.status, activeCall, getToken])

  // ── Unified Database CRM Lookup ───────────────────────────────────────────

  React.useEffect(() => {
    const callForLookup = activeCall?.status === "connected" ? activeCall
      : outboundCall?.status === "connected" ? outboundCall : null
    if (!callForLookup) { setCustomer(null); return }

    const phone = "callerNumber" in callForLookup ? callForLookup.callerNumber : callForLookup.dialedNumber

    const lookup = async () => {
      setIsLoadingCustomer(true)
      try {
        const token = await getToken()
        if (!token) return
        const res = await apiClient.get(`/api/calls/customer-lookup?phone=${encodeURIComponent(phone)}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        setCustomer(res.data?.data || null)
      } catch {
        setCustomer(null)
      } finally {
        setIsLoadingCustomer(false)
      }
    }
    lookup()
  }, [activeCall?.status, outboundCall?.status, getToken])

  // ── Dispatch Toast Utilities ──────────────────────────────────────────────

  const addToast = (type: Toast["type"], message: string) => {
    if (toasts.some((t) => t.message === message)) return
    const id = Math.random().toString(36).slice(2)
    setToasts((p) => [...p, { id, type, message, ts: new Date() }])
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 4000)
  }

  // ── Status Event Transitions ──────────────────────────────────────────────

  const goLive = async () => {
    try {
      const token = await getToken()
      if (token) await apiClient.post("/api/calls/agent-status", { status: "available" }, { headers: { Authorization: `Bearer ${token}` } })
    } catch {}
    setAgent((p) => ({ ...p, status: "available", liveAt: new Date().toISOString(), breakReason: undefined }))
    addToast("success", "Status online: Routing matrix activated")
  }

  const goOffline = async () => {
    try {
      const token = await getToken()
      if (token) await apiClient.post("/api/calls/agent-status", { status: "offline" }, { headers: { Authorization: `Bearer ${token}` } })
    } catch {}
    setAgent((p) => ({ ...p, status: "offline", liveAt: undefined, breakReason: undefined }))
    setActiveCall(null)
    setOutboundCall(null)
    setCustomer(null)
    addToast("info", "Status offline: Routing matrix severed")
  }

  const takeBreak = async (reason: BreakReason) => {
    try {
      const token = await getToken()
      if (token) await apiClient.post("/api/calls/agent-status", { status: "break", reason }, { headers: { Authorization: `Bearer ${token}` } })
    } catch {}
    setAgent((p) => ({ ...p, status: "break", breakReason: reason }))
    addToast("info", "Break configuration active")
  }

  const resumeFromBreak = async () => {
    try {
      const token = await getToken()
      if (token) await apiClient.post("/api/calls/agent-status", { status: "available" }, { headers: { Authorization: `Bearer ${token}` } })
    } catch {}
    setAgent((p) => ({ ...p, status: "available", breakReason: undefined }))
    addToast("success", "Break terminated: Status online")
  }

  // ── Audio Inbound Actions ─────────────────────────────────────────────────

  const answerCall = async () => {
    if (!activeCall) return
    try {
      const token = await getToken()
      if (token) await apiClient.post(`/api/calls/${activeCall.id}/answer`, {}, { headers: { Authorization: `Bearer ${token}` } })
    } catch {}
    setActiveCall((p) => p ? { ...p, status: "connected", answeredAt: new Date().toISOString() } : null)
    setAgent((p) => ({ ...p, status: "on-call" }))
    addToast("success", "Voice link secure and connected")
  }

  const endCall = async () => {
    if (!activeCall) return
    try {
      const token = await getToken()
      if (token) await apiClient.post(`/api/calls/${activeCall.id}/end`, {}, { headers: { Authorization: `Bearer ${token}` } })
    } catch {}
    setActiveCall(null)
    setCustomer(null)
    setAgent((p) => ({ ...p, status: "available" }))
    addToast("info", "Voice channel connection closed")
  }

  const toggleMute = () => setActiveCall((p) => p ? { ...p, isMuted: !p.isMuted } : null)

  const toggleHold = async () => {
    if (!activeCall) return
    const newStatus = activeCall.status === "on-hold" ? "connected" : "on-hold"
    try {
      const token = await getToken()
      if (token) await apiClient.post(`/api/calls/${activeCall.id}/hold`, { hold: newStatus === "on-hold" }, { headers: { Authorization: `Bearer ${token}` } })
    } catch {}
    setActiveCall((p) => p ? { ...p, status: newStatus } : null)
    addToast("info", newStatus === "on-hold" ? "Line placed on master hold" : "Line retrieved from hold")
  }

  const toggleRecord = () => {
    setActiveCall((p) => {
      if (!p) return null
      const next = !p.isRecording
      addToast("info", next ? "Legal compliance recording active" : "Recording channel stopped")
      return { ...p, isRecording: next }
    })
  }

  const pickupQueued = async (queuedId: string) => {
    const q = queue.find((c) => c.id === queuedId)
    if (!q) return
    try {
      const token = await getToken()
      if (token) await apiClient.post(`/api/calls/queue/${queuedId}/pickup`, {}, { headers: { Authorization: `Bearer ${token}` } })
    } catch {}
    setQueue((p) => p.filter((c) => c.id !== queuedId))
    setActiveCall({
      id: queuedId,
      callerNumber: q.callerNumber,
      callerName: q.callerName,
      status: "connected",
      startedAt: q.waitingSince,
      answeredAt: new Date().toISOString(),
      isRecording: false,
      isMuted: false,
    })
    setAgent((p) => ({ ...p, status: "on-call" }))
    setCallMode("inbound")
    addToast("success", `Intercepted channel line for ${q.callerName || q.callerNumber}`)
  }

  // ── Audio Outbound Actions ────────────────────────────────────────────────

  const dialOutbound = async (number: string, name?: string) => {
    if (!number) return
    const callId = Math.random().toString(36).slice(2)
    const call: OutboundCall = {
      id: callId,
      dialedNumber: number,
      contactName: name,
      status: "dialing",
      startedAt: new Date().toISOString(),
      isRecording: false,
      isMuted: false,
    }

    try {
      const token = await getToken()
      if (token) {
        const res = await apiClient.post("/api/calls/outbound", { number, name }, { headers: { Authorization: `Bearer ${token}` } })
        call.id = res.data?.data?.id || callId
      }
    } catch {}

    setOutboundCall(call)
    setAgent((p) => ({ ...p, status: "on-call" }))
    addToast("info", `Accessing routing circuit for ${name || number}...`)

    setTimeout(() => {
      setOutboundCall((p) => p ? { ...p, status: "ringing" } : null)
      setTimeout(() => {
        setOutboundCall((p) => p ? { ...p, status: "connected", answeredAt: new Date().toISOString() } : null)
        addToast("success", `Remote bridge secure to ${name || number}`)
      }, 2500)
    }, 1500)
  }

  const endOutboundCall = async () => {
    if (!outboundCall) return
    try {
      const token = await getToken()
      if (token) await apiClient.post(`/api/calls/${outboundCall.id}/end`, {}, { headers: { Authorization: `Bearer ${token}` } })
    } catch {}
    setOutboundCall(null)
    setCustomer(null)
    setAgent((p) => ({ ...p, status: "available" }))
    addToast("info", "Outbound channel circuit closed")
  }

  const toggleOutboundMute = () => setOutboundCall((p) => p ? { ...p, isMuted: !p.isMuted } : null)
  const toggleOutboundHold = () => {
    setOutboundCall((p) => {
      if (!p) return null
      const next = p.status === "on-hold" ? "connected" : "on-hold"
      addToast("info", next === "on-hold" ? "Outbound destination on hold" : "Outbound session active")
      return { ...p, status: next }
    })
  }
  const toggleOutboundRecord = () => {
    setOutboundCall((p) => {
      if (!p) return null
      const next = !p.isRecording
      addToast("info", next ? "Outbound tracking module active" : "Outbound tracking module stopped")
      return { ...p, isRecording: next }
    })
  }

  // ── Server Updates Global ─────────────────────────────────────────────────

  const saveNotes = async (notes: string) => {
    const callId = activeCall?.id || outboundCall?.id
    if (!callId) return
    try {
      const token = await getToken()
      if (token) await apiClient.post(`/api/calls/${callId}/notes`, { notes }, { headers: { Authorization: `Bearer ${token}` } })
      addToast("success", "CRM system file logs modified successfully")
    } catch {
      addToast("error", "CRM update network timeout")
    }
  }

  const createLead = async (data: { name: string; phone: string; email?: string }) => {
    try {
      const token = await getToken()
      if (token) await apiClient.post("/api/leads", data, { headers: { Authorization: `Bearer ${token}` } })
      addToast("success", `Account file created for ${data.name}`)
    } catch {
      addToast("error", "Database pipeline creation exception")
    }
  }

  const activeInboundCall = agent.status !== "offline" ? activeCall : null
  const activeOutboundCall = agent.status !== "offline" ? outboundCall : null

  const currentCall = callMode === "inbound" ? activeInboundCall : activeOutboundCall
  const callerNumber = activeCall?.callerNumber || outboundCall?.dialedNumber

  return (
    <div className="flex flex-col gap-6 p-1 md:p-2 max-w-[1600px] mx-auto w-full transition-colors duration-200">
      <ToastStack toasts={toasts} dismiss={(id) => setToasts((p) => p.filter((t) => t.id !== id))} />

      {/* Header Deck Area */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-100 dark:border-zinc-800 pb-5">
        <div>
          <h2 className="text-xl md:text-2xl font-bold tracking-tight text-zinc-800 dark:text-zinc-100">Live Agent Console</h2>
          <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1 font-medium">
            {agent.status === "offline" ? "Console offline · System decoupled" : `Gateway Connected · Matrix Mode: ${agent.status}`}
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
              onMuteToggle={toggleMute}
              onHoldToggle={toggleHold}
              onTransfer={() => addToast("info", "SIP trunk dynamic lines processing...")}
              onConference={() => addToast("info", "Conference multi-bridge initialization...")}
              onRecordToggle={toggleRecord}
            />
          ) : (
            <OutboundCallPanel
              activeCall={activeOutboundCall}
              recentContacts={recentContacts}
              onDial={dialOutbound}
              onEnd={endOutboundCall}
              onMuteToggle={toggleOutboundMute}
              onHoldToggle={toggleOutboundHold}
              onRecordToggle={toggleOutboundRecord}
            />
          )}
        </div>

        {/* Right CRM Records Stack */}
        <div className="md:col-span-2 lg:col-span-1">
          <CustomerInfoPanel
            call={currentCall}
            callerNumber={callerNumber}
            customer={customer}
            isLoadingCustomer={isLoadingCustomer}
            onSaveNotes={saveNotes}
            onCreateLead={createLead}
          />
        </div>
      </div>

      {/* Bottom Layout Queue Pipeline */}
      <CallQueue queue={queue} logs={logs} onPickupQueued={pickupQueued} />
    </div>
  )
}