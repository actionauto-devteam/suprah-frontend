"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Coffee,
  ChevronDown,
  Phone,
  PhoneOff,
  Wifi,
  WifiOff,
  Clock,
  Activity,
  Timer,
} from "lucide-react"
import {
  AgentInfo,
  BreakReason,
  agentStatusConfig,
  breakReasonLabels,
} from "./types"

function getInitials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

function formatElapsed(seconds: number) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m`
  if (m > 0) return `${m}m ${String(s).padStart(2, "0")}s`
  return `${s}s`
}

// Map external statuses to native Light/Dark classes for complete theme independence
const statusThemeMap: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  available: { bg: "bg-emerald-50 dark:bg-emerald-950/30", text: "text-emerald-600 dark:text-emerald-400", border: "border-emerald-200 dark:border-emerald-800/30", dot: "bg-emerald-500" },
  "on-call": { bg: "bg-amber-50 dark:bg-amber-950/30", text: "text-amber-600 dark:text-amber-400", border: "border-amber-200 dark:border-amber-800/30", dot: "bg-amber-500" },
  break: { bg: "bg-sky-50 dark:bg-sky-950/30", text: "text-sky-600 dark:text-sky-400", border: "border-sky-200 dark:border-sky-800/30", dot: "bg-sky-500" },
  offline: { bg: "bg-zinc-50 dark:bg-zinc-900", text: "text-zinc-600 dark:text-zinc-400", border: "border-zinc-200 dark:border-zinc-800", dot: "bg-zinc-400" },
}

interface AgentControlPanelProps {
  agent: AgentInfo
  onGoLive: () => void
  onGoOffline: () => void
  onBreak: (reason: BreakReason) => void
  onResumeFromBreak: () => void
  todayCalls?: number
  avgHandle?: string
}

export function AgentControlPanel({
  agent,
  onGoLive,
  onGoOffline,
  onBreak,
  onResumeFromBreak,
  todayCalls = 0,
  avgHandle = "—",
}: AgentControlPanelProps) {
  const cfg = agentStatusConfig[agent.status]
  const theme = statusThemeMap[agent.status] || statusThemeMap.offline

  const [elapsed, setElapsed] = React.useState(0)
  React.useEffect(() => {
    if (!agent.liveAt) { setElapsed(0); return }
    const tick = () => setElapsed(Math.floor((Date.now() - new Date(agent.liveAt!).getTime()) / 1000))
    tick()
    const iv = setInterval(tick, 1000)
    return () => clearInterval(iv)
  }, [agent.liveAt])

  const isLive = agent.status === "available" || agent.status === "on-call"
  const isOnBreak = agent.status === "break"

  return (
    <div className="flex flex-col bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm h-full transition-colors duration-200">
      {/* Header */}
      <div className="px-4 py-3 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/50">
        <span className="text-[10px] font-bold tracking-widest uppercase text-zinc-400 dark:text-zinc-500">Agent Details</span>
        <div className="flex items-center gap-1.5">
          <span className={`h-1.5 w-1.5 rounded-full ${theme.dot} ${agent.status === "on-call" ? "animate-pulse" : ""}`} />
          <span className={`text-[11px] font-semibold ${theme.text}`}>{cfg.label}</span>
        </div>
      </div>

      {/* Identity */}
      <div className="px-4 pt-6 pb-5 flex flex-col items-center gap-3.5 border-b border-zinc-100 dark:border-zinc-800">
        <div className="relative">
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 dark:from-violet-600 dark:to-indigo-700 flex items-center justify-center text-white text-lg font-bold shadow-sm">
            {getInitials(agent.name)}
          </div>
          <span className={`absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full border-2 border-white dark:border-zinc-900 ${theme.dot} ${agent.status === "on-call" ? "animate-pulse" : ""}`} />
        </div>

        <div className="text-center">
          <p className="text-sm font-bold text-zinc-800 dark:text-zinc-100">{agent.name}</p>
          <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5 font-mono">#{agent.employeeId}</p>
        </div>

        <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-[11px] font-medium ${theme.bg} ${theme.border} ${theme.text}`}>
          <span className={`h-1 w-1 rounded-full ${theme.dot}`} />
          {cfg.label}
          {agent.breakReason && (
            <span className="text-zinc-400 dark:text-zinc-500 font-normal"> · {breakReasonLabels[agent.breakReason]}</span>
          )}
        </div>

        {agent.liveAt && (
          <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 dark:text-zinc-500">
            <Timer className="h-3 w-3" />
            <span>Session: <span className="font-mono font-medium text-zinc-600 dark:text-zinc-300">{formatElapsed(elapsed)}</span></span>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex-1 px-4 py-4 flex flex-col gap-2 bg-zinc-50/30 dark:bg-zinc-900/20">
        {!isLive && !isOnBreak ? (
          <button
            onClick={onGoLive}
            className="w-full h-10 flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-50 dark:bg-emerald-500 dark:hover:bg-emerald-400 text-white dark:text-white text-xs font-semibold transition-all shadow-sm active:scale-[0.98] cursor-pointer"
          >
            <Wifi className="h-3.5 w-3.5" />
            Go Live
          </button>
        ) : (
          <button
            onClick={onGoOffline}
            className="w-full h-10 flex items-center justify-center gap-2 rounded-xl bg-white hover:bg-zinc-50 dark:bg-zinc-800 dark:hover:bg-zinc-700/80 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 text-xs font-semibold transition-all active:scale-[0.98] cursor-pointer"
          >
            <WifiOff className="h-3.5 w-3.5" />
            Go Offline
          </button>
        )}

        {isLive && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-full h-10 flex items-center justify-center gap-2 rounded-xl bg-white hover:bg-zinc-50 dark:bg-zinc-800/50 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-700/60 text-zinc-600 dark:text-zinc-300 text-xs font-medium transition-all cursor-pointer">
                <Coffee className="h-3.5 w-3.5 text-zinc-400" />
                Take a Break
                <ChevronDown className="h-3.5 w-3.5 ml-auto opacity-50" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="rounded-xl w-48 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-lg">
              {(Object.keys(breakReasonLabels) as BreakReason[]).map((reason) => (
                <DropdownMenuItem
                  key={reason}
                  onClick={() => onBreak(reason)}
                  className="text-xs text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 focus:bg-zinc-50 dark:focus:bg-zinc-800 cursor-pointer"
                >
                  {breakReasonLabels[reason]}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {isOnBreak && (
          <button
            onClick={onResumeFromBreak}
            className="w-full h-10 flex items-center justify-center gap-2 rounded-xl bg-sky-50 dark:bg-sky-500/10 hover:bg-sky-100 dark:hover:bg-sky-500/20 border border-sky-200 dark:border-sky-500/20 text-sky-600 dark:text-sky-400 text-xs font-semibold transition-all cursor-pointer"
          >
            <Phone className="h-3.5 w-3.5" />
            Resume Ready
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="px-4 py-4 border-t border-zinc-100 dark:border-zinc-800 grid grid-cols-2 gap-4 bg-zinc-50/50 dark:bg-zinc-900/50">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-zinc-400 dark:text-zinc-500 font-bold">Calls Today</p>
          <p className="text-xl font-bold text-zinc-800 dark:text-zinc-100 mt-1 tabular-nums">{todayCalls}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-widest text-zinc-400 dark:text-zinc-500 font-bold">Avg Handle</p>
          <p className="text-xl font-bold text-zinc-800 dark:text-zinc-100 mt-1 tabular-nums">{avgHandle}</p>
        </div>
      </div>
    </div>
  )
}