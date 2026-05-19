"use client"

import * as React from "react"
import {
  Phone,
  PhoneOff,
  PhoneCall,
  Mic,
  MicOff,
  Pause,
  Play,
  Radio,
  Disc3,
  Delete,
  Clock,
  User,
  X,
} from "lucide-react"
import { OutboundCall, RecentContact } from "./types"

function formatTimer(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
}

function getInitials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)
}

const DIALPAD = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
  ["*", "0", "#"],
]

interface OutboundCallPanelProps {
  activeCall: OutboundCall | null
  recentContacts?: RecentContact[]
  onDial: (number: string, name?: string) => void
  onEnd?: () => void
  onMuteToggle?: () => void
  onHoldToggle?: () => void
  onRecordToggle?: () => void
}

export function OutboundCallPanel({
  activeCall,
  recentContacts = [],
  onDial,
  onEnd,
  onMuteToggle,
  onHoldToggle,
  onRecordToggle,
}: OutboundCallPanelProps) {
  const [dialInput, setDialInput] = React.useState("")
  const [elapsed, setElapsed] = React.useState(0)

  React.useEffect(() => {
    if (!activeCall?.answeredAt) { setElapsed(0); return }
    const tick = () => setElapsed(Math.floor((Date.now() - new Date(activeCall.answeredAt!).getTime()) / 1000))
    tick()
    const iv = setInterval(tick, 1000)
    return () => clearInterval(iv)
  }, [activeCall?.answeredAt])

  const handleDialKey = (key: string) => {
    setDialInput((p) => (p.length < 15 ? p + key : p))
  }

  const handleDelete = () => setDialInput((p) => p.slice(0, -1))

  const canDial = dialInput.replace(/\D/g, "").length >= 7 && !activeCall

  const isOnHold = activeCall?.status === "on-hold"
  const isConnected = activeCall?.status === "connected" || isOnHold
  const isDialing = activeCall?.status === "dialing" || activeCall?.status === "ringing"

  return (
    <div className="flex flex-col bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden h-full shadow-sm transition-colors duration-200">
      {/* Header Deck */}
      <div className="px-4 py-3 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/50">
        <span className="text-[10px] font-bold tracking-widest uppercase text-zinc-400 dark:text-zinc-500">Outbound Node</span>
        {activeCall && (
          <div className="flex items-center gap-1.5">
            {activeCall.isRecording && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-[9px] font-bold text-red-600 dark:text-red-400 shadow-sm">
                <Disc3 className="h-3 w-3 animate-spin text-red-500" /> REC
              </span>
            )}
            <span className={`text-[11px] font-mono font-bold tabular-nums ${isConnected ? "text-violet-600 dark:text-violet-400" : "text-zinc-400"}`}>
              {isConnected ? formatTimer(elapsed) : "—:——"}
            </span>
          </div>
        )}
      </div>

      {/* Outbound Sync Overlay Monitoring Display */}
      {activeCall && (
        <div className={`px-4 py-4 border-b border-zinc-100 dark:border-zinc-800 flex flex-col items-center gap-3.5 transition-colors ${
          isDialing ? "bg-violet-50/30 dark:bg-violet-500/5" : isConnected ? "bg-emerald-50/30 dark:bg-emerald-500/5" : "bg-red-50/30 dark:bg-red-500/5"
        }`}>
          <div className="relative">
            <div className={`h-14 w-14 rounded-xl flex items-center justify-center text-white text-base font-bold ${
              isConnected
                ? "bg-gradient-to-br from-violet-500 to-indigo-600"
                : isDialing
                ? "bg-zinc-400 dark:bg-zinc-700"
                : "bg-gradient-to-br from-red-500 to-red-600"
            } shadow-sm`}>
              {activeCall.contactName ? getInitials(activeCall.contactName) : <Phone className="h-5 w-5" />}
            </div>
            {isDialing && (
              <div className="absolute -inset-2 rounded-xl border-2 border-violet-500/20 animate-ping duration-1000" />
            )}
          </div>

          <div className="text-center px-2 w-full">
            <p className="text-sm font-bold text-zinc-800 dark:text-zinc-100 truncate max-w-[180px] mx-auto">{activeCall.contactName || "Remote Connection"}</p>
            <p className="text-xs text-zinc-400 dark:text-zinc-500 font-mono mt-0.5">{activeCall.dialedNumber}</p>
            <p className={`text-[10px] font-bold tracking-wider uppercase mt-1.5 ${
              isDialing ? "text-violet-600 dark:text-violet-400" : isConnected ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
            }`}>
              {activeCall.status === "dialing" ? "Routing trunk..." :
               activeCall.status === "ringing" ? "Terminal alerting..." :
               activeCall.status === "connected" ? "Link Established" :
               activeCall.status === "on-hold" ? "Session On Hold" :
               activeCall.status === "failed" ? "Handshake Failed" :
               activeCall.status === "no-answer" ? "No Answer" : activeCall.status}
            </p>
          </div>

          {isConnected && (
            <div className="grid grid-cols-3 gap-1.5 w-full max-w-[240px] mx-auto">
              <button
                onClick={onMuteToggle}
                className={`flex flex-col items-center gap-1 p-1.5 rounded-lg border text-[9px] font-bold uppercase tracking-wide transition-all cursor-pointer ${
                  activeCall.isMuted ? "bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/25 text-red-600 dark:text-red-400" : "bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700"
                }`}
              >
                {activeCall.isMuted ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
                Mute
              </button>
              <button
                onClick={onHoldToggle}
                className={`flex flex-col items-center gap-1 p-1.5 rounded-lg border text-[9px] font-bold uppercase tracking-wide transition-all cursor-pointer ${
                  isOnHold ? "bg-amber-50 dark:bg-amber-400/10 border-amber-200 dark:border-amber-400/25 text-amber-600 dark:text-amber-400" : "bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700"
                }`}
              >
                {isOnHold ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
                Hold
              </button>
              <button
                onClick={onRecordToggle}
                className={`flex flex-col items-center gap-1 p-1.5 rounded-lg border text-[9px] font-bold uppercase tracking-wide transition-all cursor-pointer ${
                  activeCall.isRecording ? "bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/25 text-red-600 dark:text-red-400" : "bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700"
                }`}
              >
                <Radio className="h-3.5 w-3.5" />
                Record
              </button>
            </div>
          )}

          <button
            onClick={onEnd}
            className="w-full h-9 flex items-center justify-center gap-2 rounded-xl bg-red-50 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 border border-red-200 dark:border-red-500/25 text-red-600 dark:text-red-400 text-xs font-semibold transition-all active:scale-95 cursor-pointer"
          >
            <PhoneOff className="h-3.5 w-3.5" /> Terminate Link
          </button>
        </div>
      )}

      {/* Dial Input Field Area */}
      <div className="px-4 pt-4 pb-1">
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/60 focus-within:border-violet-500 dark:focus-within:border-violet-500/50 transition-colors shadow-inner">
          <input
            type="tel"
            value={dialInput}
            onChange={(e) => setDialInput(e.target.value.replace(/[^\d+*#\-() ]/g, "").slice(0, 15))}
            placeholder="+1 (555) 000-0000"
            className="flex-1 bg-transparent text-sm font-mono font-medium text-zinc-800 dark:text-zinc-100 placeholder:text-zinc-300 dark:placeholder:text-zinc-600 outline-none"
          />
          {dialInput && (
            <button onClick={handleDelete} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 p-0.5 cursor-pointer">
              <Delete className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Dialpad Panel Grid Array */}
      <div className="px-4 py-2">
        <div className="grid grid-cols-3 gap-1.5">
          {DIALPAD.flat().map((key) => (
            <button
              key={key}
              onClick={() => handleDialKey(key)}
              disabled={!!activeCall}
              className="h-9 rounded-xl bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-800/40 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-700/30 text-zinc-700 dark:text-zinc-200 text-sm font-bold shadow-sm transition-all active:scale-95 disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer"
            >
              {key}
            </button>
          ))}
        </div>
      </div>

      {/* Main Bridge Launcher Control */}
      <div className="px-4 pb-4">
        <button
          onClick={() => canDial && onDial(dialInput.trim())}
          disabled={!canDial}
          className="w-full h-10 flex items-center justify-center gap-2 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:bg-zinc-100 dark:disabled:bg-zinc-800 disabled:text-zinc-300 dark:disabled:text-zinc-600 disabled:cursor-not-allowed text-white text-xs font-bold uppercase tracking-wider shadow-sm transition-all active:scale-[0.98] cursor-pointer"
        >
          <PhoneCall className="h-3.5 w-3.5" />
          {dialInput ? `Dial ${dialInput}` : "Launch Link"}
        </button>
      </div>

      {/* Recent Circuit Cache Contacts Segment */}
      {recentContacts.length > 0 && !activeCall && (
        <div className="border-t border-zinc-100 dark:border-zinc-800 flex-1 overflow-y-auto bg-zinc-50/20 dark:bg-transparent">
          <div className="px-4 pt-3 pb-1.5">
            <p className="text-[9px] uppercase tracking-widest text-zinc-400 dark:text-zinc-500 font-bold">Recent Cache Contacts</p>
          </div>
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
            {recentContacts.slice(0, 3).map((c, i) => (
              <button
                key={i}
                onClick={() => { setDialInput(c.number); onDial(c.number, c.name) }}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white dark:hover:bg-zinc-800/30 transition-colors text-left cursor-pointer"
              >
                <div className="h-7 w-7 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center shrink-0 shadow-sm">
                  <User className="h-3.5 w-3.5 text-zinc-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 truncate">{c.name}</p>
                  <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono mt-0.5">{c.number}</p>
                </div>
                <Phone className="h-3 w-3 text-zinc-300 dark:text-zinc-600 shrink-0" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}