"use client"

import * as React from "react"
import {
  Phone,
  PhoneOff,
  Mic,
  MicOff,
  Pause,
  Play,
  ArrowRightLeft,
  Users,
  Radio,
  PhoneIncoming,
  Disc3,
  PhoneCall,
} from "lucide-react"
import { InboundCall } from "./types"

function formatTimer(seconds: number) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  const pad = (n: number) => String(n).padStart(2, "0")
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`
}

function getInitials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)
}

interface LiveCallPanelProps {
  call: InboundCall | null
  agentStatus: string
  onAnswer?: () => void
  onEnd?: () => void
  onMuteToggle?: () => void
  onHoldToggle?: () => void
  onTransfer?: () => void
  onConference?: () => void
  onRecordToggle?: () => void
}

function ControlButton({
  onClick,
  active,
  activeColor = "amber",
  icon,
  label,
}: {
  onClick?: () => void
  active?: boolean
  activeColor?: string
  icon: React.ReactNode
  label: string
}) {
  const base = "flex flex-col items-center gap-2 p-3 rounded-xl border transition-all active:scale-95 cursor-pointer text-center"
  
  // Custom context color maps for Light and Dark themes
  const inactiveStyles = "bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-800/40 dark:hover:bg-zinc-800 border-zinc-200 dark:border-zinc-700/60 text-zinc-600 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200"
  
  const activeStylesMap: Record<string, string> = {
    amber: "bg-amber-50 dark:bg-amber-400/10 border-amber-200 dark:border-amber-400/25 text-amber-600 dark:text-amber-400 font-semibold",
    red: "bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/25 text-red-600 dark:text-red-400 font-semibold",
    emerald: "bg-emerald-50 dark:bg-emerald-400/10 border-emerald-200 dark:border-emerald-400/25 text-emerald-600 dark:text-emerald-400 font-semibold",
  }

  return (
    <button onClick={onClick} className={`${base} ${active ? (activeStylesMap[activeColor] || activeStylesMap.amber) : inactiveStyles}`}>
      <span className="h-5 w-5 flex items-center justify-center shrink-0">{icon}</span>
      <span className="text-[9px] font-bold tracking-wider uppercase">{label}</span>
    </button>
  )
}

export function LiveCallPanel({
  call,
  agentStatus,
  onAnswer,
  onEnd,
  onMuteToggle,
  onHoldToggle,
  onTransfer,
  onConference,
  onRecordToggle,
}: LiveCallPanelProps) {
  const [elapsed, setElapsed] = React.useState(0)
  React.useEffect(() => {
    if (!call?.answeredAt) { setElapsed(0); return }
    const tick = () => setElapsed(Math.floor((Date.now() - new Date(call.answeredAt!).getTime()) / 1000))
    tick()
    const iv = setInterval(tick, 1000)
    return () => clearInterval(iv)
  }, [call?.answeredAt])

  const BasePanel = ({ title, headerRight, children, borderColorClass = "border-zinc-200 dark:border-zinc-800" }: { title: string, headerRight?: React.ReactNode, children: React.ReactNode, borderColorClass?: string }) => (
    <div className={`flex flex-col bg-white dark:bg-zinc-900 border ${borderColorClass} rounded-2xl overflow-hidden h-full shadow-sm transition-colors duration-200`}>
      <div className="px-4 py-3 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/50">
        <span className="text-[10px] font-bold tracking-widest uppercase text-zinc-400 dark:text-zinc-500">{title}</span>
        {headerRight}
      </div>
      {children}
    </div>
  )

  // Status Matrix: Agent Offline Case
  if (agentStatus === "offline") {
    return (
      <BasePanel title="Audio Stream">
        <div className="flex-1 flex flex-col items-center justify-center gap-4 py-16">
          <div className="h-14 w-14 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800 flex items-center justify-center bg-zinc-50 dark:bg-zinc-900">
            <Phone className="h-5 w-5 text-zinc-300 dark:text-zinc-600" />
          </div>
          <div className="text-center">
            <p className="text-sm font-bold text-zinc-700 dark:text-zinc-400">Terminal Terminated</p>
            <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1 px-4">Go live on your profile block to initialize communication interfaces.</p>
          </div>
        </div>
      </BasePanel>
    )
  }

  // Status Matrix: Ready/No Call Active Line Case
  if (!call) {
    return (
      <BasePanel title="Audio Stream">
        <div className="flex-1 flex flex-col items-center justify-center gap-4 py-16">
          <div className="relative h-16 w-16 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full bg-emerald-500/10 dark:bg-emerald-500/5 animate-ping duration-1000" />
            <div className="h-14 w-14 rounded-full border border-emerald-100 dark:border-emerald-500/10 bg-emerald-50/50 dark:bg-emerald-950/10 flex items-center justify-center shadow-inner">
              <PhoneCall className="h-5 w-5 text-emerald-500 dark:text-emerald-400/60" />
            </div>
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-zinc-600 dark:text-zinc-400">Awaiting Central Audio Matrix Routing</p>
            <div className="flex items-center justify-center gap-1.5 mt-2">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold tracking-wider uppercase">Circuit Sync Secure</span>
            </div>
          </div>
        </div>
      </BasePanel>
    )
  }

  // Status Matrix: Ringing Incoming Inbound Call Case
  if (call.status === "ringing") {
    return (
      <div className="flex flex-col bg-white dark:bg-zinc-900 border border-emerald-300 dark:border-emerald-500/30 rounded-2xl overflow-hidden h-full shadow-lg transition-all">
        <div className="px-4 py-3 border-b border-emerald-100 dark:border-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-500/5 flex items-center justify-between">
          <span className="text-[10px] font-bold tracking-widest uppercase text-emerald-600 dark:text-emerald-400">Inbound Handshake</span>
          <span className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
            <PhoneIncoming className="h-3.5 w-3.5 animate-bounce" /> Ringing Circuit...
          </span>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center gap-6 py-10 bg-gradient-to-b from-emerald-50/20 to-transparent dark:from-transparent">
          <div className="relative">
            <div className="absolute -inset-3 rounded-full bg-emerald-500/10 animate-ping duration-700" />
            <div className="relative h-20 w-20 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-md">
              <span className="text-white text-xl font-bold">
                {call.callerName ? getInitials(call.callerName) : <Phone className="h-7 w-7" />}
              </span>
            </div>
          </div>

          <div className="text-center px-4">
            <p className="text-lg font-bold text-zinc-800 dark:text-zinc-100 truncate max-w-[240px]">{call.callerName || "Unknown Endpoint ID"}</p>
            <p className="text-sm text-zinc-400 dark:text-zinc-500 font-mono font-medium mt-1">{call.callerNumber}</p>
          </div>

          <button
            onClick={onAnswer}
            className="flex items-center gap-2.5 px-8 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 dark:bg-emerald-500 dark:hover:bg-emerald-400 text-white font-bold text-sm shadow-md shadow-emerald-600/10 dark:shadow-none transition-all active:scale-95 cursor-pointer"
          >
            <Phone className="h-4 w-4" />
            Connect Channel Link
          </button>
        </div>
      </div>
    )
  }

  // Connected Interface Layout Setup
  const isOnHold = call.status === "on-hold"
  const themeAccentClass = isOnHold ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"
  const borderAccentClass = isOnHold ? "border-amber-200 dark:border-amber-500/30" : "border-emerald-200 dark:border-emerald-500/30"
  const headerAccentBg = isOnHold ? "bg-amber-50/50 dark:bg-amber-500/5 border-amber-100 dark:border-amber-500/15" : "bg-emerald-50/50 dark:bg-emerald-500/5 border-emerald-100 dark:border-emerald-500/15"

  return (
    <div className={`flex flex-col bg-white dark:bg-zinc-900 border ${borderAccentClass} rounded-2xl overflow-hidden h-full shadow-sm transition-colors duration-200`}>
      {/* Dynamic Header Badge Stack */}
      <div className={`px-4 py-3 border-b flex items-center justify-between ${headerAccentBg}`}>
        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-bold tracking-widest uppercase ${themeAccentClass}`}>
            {isOnHold ? "Channel On Hold" : "Channel Live"}
          </span>
          {call.isRecording && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-[9px] font-bold text-red-600 dark:text-red-400 shadow-sm">
              <Disc3 className="h-3 w-3 animate-spin text-red-500" /> TAP ACTIVE
            </span>
          )}
        </div>
        <span className={`font-mono text-sm font-bold tabular-nums ${themeAccentClass}`}>
          {formatTimer(elapsed)}
        </span>
      </div>

      {/* Target Caller Vector Card */}
      <div className="px-5 py-5 flex flex-col items-center gap-3 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/30 dark:bg-transparent">
        <div className="relative">
          <div className={`h-16 w-16 rounded-xl flex items-center justify-center text-white text-lg font-bold ${isOnHold ? "bg-gradient-to-br from-amber-500 to-orange-600" : "bg-gradient-to-br from-emerald-500 to-teal-600"} shadow-sm`}>
            {call.callerName ? getInitials(call.callerName) : <Phone className="h-5 w-5" />}
          </div>
          <span className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white dark:border-zinc-900 ${isOnHold ? "bg-amber-400 animate-pulse" : "bg-emerald-500"}`} />
        </div>
        <div className="text-center px-2">
          <p className="text-sm font-bold text-zinc-800 dark:text-zinc-100 truncate max-w-[200px]">{call.callerName || "External Caller"}</p>
          <p className="text-xs text-zinc-400 dark:text-zinc-500 font-mono font-medium mt-0.5">{call.callerNumber}</p>
        </div>
      </div>

      {/* Grid Network Array Controls */}
      <div className="flex-1 flex items-center justify-center px-4 py-4">
        <div className="grid grid-cols-5 gap-1.5 w-full">
          <ControlButton onClick={onMuteToggle} active={call.isMuted} activeColor="red" icon={call.isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />} label={call.isMuted ? "Unmute" : "Mute"} />
          <ControlButton onClick={onHoldToggle} active={isOnHold} activeColor="amber" icon={isOnHold ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />} label={isOnHold ? "Resume" : "Hold"} />
          <ControlButton onClick={onTransfer} icon={<ArrowRightLeft className="h-4 w-4" />} label="Xfer" />
          <ControlButton onClick={onConference} icon={<Users className="h-4 w-4" />} label="Bridge" />
          <ControlButton onClick={onRecordToggle} active={call.isRecording} activeColor="red" icon={<Radio className="h-4 w-4" />} label={call.isRecording ? "Halt" : "Record"} />
        </div>
      </div>

      {/* Disconnection Safe Trigger Deck */}
      <div className="px-4 pb-4 flex justify-center bg-zinc-50/20 dark:bg-transparent">
        <button
          onClick={onEnd}
          className="flex items-center gap-2 px-8 py-2.5 rounded-xl bg-red-50 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 border border-red-200 dark:border-red-500/25 text-red-600 dark:text-red-400 font-bold text-xs uppercase tracking-wider transition-all active:scale-95 cursor-pointer"
        >
          <PhoneOff className="h-4 w-4" />
          Sever Call Link
        </button>
      </div>
    </div>
  )
}