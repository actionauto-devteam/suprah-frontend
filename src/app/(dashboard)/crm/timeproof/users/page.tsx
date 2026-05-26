"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  Shield,
  Wifi,
  WifiOff,
  Coffee,
  Clock,
  Monitor,
  RefreshCw,
  Users,
  Zap,
  Apple,
} from "lucide-react"
import { apiClient } from "@/lib/api-client"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn, resolveImageUrl } from "@/lib/utils"

/* ─────────────────────────────────────────────────────────────────────────
   Types
───────────────────────────────────────────────────────────────────────── */
interface HoursSummary {
  hours: number
  minutes: number
  totalSeconds: number
  decimal: number
}

interface UserTimeproof {
  user: {
    _id: string
    fullName: string
    username: string
    avatar?: string
    role: string
  }
  today: HoursSummary
  thisWeek: HoursSummary
  isLive: boolean
  shiftStartedAt: string | null
  todayTotalWorkedSeconds: number
  totalBreakSeconds: number
}

interface AgentStatus {
  user: {
    _id: string
    fullName: string
    username: string
    avatar?: string
    role: string
  }
  isOnline: boolean
  isIdle: boolean
  isOnBreak: boolean
  breakStartedAt: string | null
  platform: string | null
  lastSeenAt: string | null
}

interface MergedUser {
  _id: string
  fullName: string
  username: string
  avatar?: string
  role: string
  today: HoursSummary
  thisWeek: HoursSummary
  isLive: boolean
  isOnline: boolean
  isIdle: boolean
  isOnBreak: boolean
  isBreakExceeded: boolean
  breakStartedAt: string | null
  platform: string | null
  lastSeenAt: string | null
  shiftStartedAt: string | null
  todayTotalWorkedSeconds: number
  totalBreakSeconds: number
}

/* ─────────────────────────────────────────────────────────────────────────
   Utilities
───────────────────────────────────────────────────────────────────────── */
const pad = (n: number) => String(Math.floor(n)).padStart(2, "0")

const fmtDuration = (totalSeconds: number) => {
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = Math.floor(totalSeconds % 60)
  return `${pad(h)}:${pad(m)}:${pad(s)}`
}

const fmtLastSeen = (lastSeenAt: string | null) => {
  if (!lastSeenAt) return "Never"
  const diff = Math.floor((Date.now() - new Date(lastSeenAt).getTime()) / 1000)
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  return `${Math.floor(diff / 3600)}h ago`
}

const roleBadgeClass = (role: string) => {
  if (role === "admin") return "bg-purple-500/10 text-purple-400 border-purple-500/20"
  if (role === "manager") return "bg-blue-500/10 text-blue-400 border-blue-500/20"
  return "bg-zinc-500/10 text-zinc-400 border-zinc-500/20"
}

/* ─────────────────────────────────────────────────────────────────────────
   Status Badge
───────────────────────────────────────────────────────────────────────── */
function StatusBadge({ user }: { user: MergedUser }) {
  if (!user.isOnline) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-500 border border-zinc-700/50">
        <WifiOff className="h-2.5 w-2.5" />
        Offline
      </span>
    )
  }
  if (user.isBreakExceeded) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 animate-pulse">
        <Coffee className="h-2.5 w-2.5" />
        Over Break
      </span>
    )
  }
  if (user.isOnBreak) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
        <Coffee className="h-2.5 w-2.5" />
        On Break
      </span>
    )
  }
  if (user.isIdle) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-zinc-700/50 text-zinc-400 border border-zinc-600/30">
        <Clock className="h-2.5 w-2.5" />
        Idle
      </span>
    )
  }
  if (user.isLive) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
        On Shift
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-500 border border-zinc-700/50">
      <Wifi className="h-2.5 w-2.5" />
      Online
    </span>
  )
}

/* ─────────────────────────────────────────────────────────────────────────
   User Card
───────────────────────────────────────────────────────────────────────── */
function UserCard({ user, now, onClick }: { user: MergedUser; now: number; onClick: () => void }) {
  // Compute live display using same formula as tray/CRM dashboard
  let displaySeconds = user.today.totalSeconds
  if (user.isLive && user.isOnline && user.shiftStartedAt) {
    const sessionMs = now - new Date(user.shiftStartedAt).getTime()
    const completedBreakMs = user.totalBreakSeconds * 1000
    // If currently on break, add break time elapsed since break started
    const currentBreakMs = user.isOnBreak && user.breakStartedAt
      ? now - new Date(user.breakStartedAt).getTime()
      : 0
    const totalBreakMs = completedBreakMs + currentBreakMs
    const sessionWorkedMs = Math.max(0, sessionMs - totalBreakMs)
    displaySeconds = Math.floor((user.todayTotalWorkedSeconds * 1000 + sessionWorkedMs) / 1000)
  }

  const initials = user.fullName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  return (
    <div
      onClick={onClick}
      className={cn(
        "relative rounded-2xl border bg-zinc-900/60 p-4 flex flex-col gap-3 transition-all duration-300 cursor-pointer hover:bg-zinc-800/60 hover:scale-[1.01] active:scale-[0.99]",
        user.isOnline
          ? user.isBreakExceeded
            ? "border-red-500/30 shadow-sm shadow-red-500/5 hover:border-red-500/50"
            : user.isIdle
            ? "border-zinc-700/40 hover:border-zinc-600/60"
            : user.isLive
            ? "border-emerald-500/25 shadow-sm shadow-emerald-500/5 hover:border-emerald-500/45"
            : "border-zinc-700/40 hover:border-zinc-600/60"
          : "border-zinc-800/40 opacity-60 hover:opacity-80"
      )}
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="relative">
          <Avatar className="h-10 w-10 border border-zinc-700/50">
            {user.avatar && (
              <AvatarImage src={resolveImageUrl(user.avatar)} alt={user.fullName} />
            )}
            <AvatarFallback className="bg-zinc-800 text-zinc-300 text-xs font-bold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <span
            className={cn(
              "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-zinc-900",
              user.isOnline ? "bg-emerald-400" : "bg-zinc-600"
            )}
          />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-zinc-100 truncate leading-tight">
            {user.fullName}
          </p>
          <p className="text-[10px] text-zinc-500 font-mono">{user.username}</p>
        </div>

        <span className={cn("text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-md border", roleBadgeClass(user.role))}>
          {user.role}
        </span>
      </div>

      {/* Status row */}
      <div className="flex items-center gap-2 flex-wrap">
        <StatusBadge user={user} />
        {user.platform && user.isOnline && (
          <span className="inline-flex items-center gap-1 text-[9px] font-medium text-zinc-600 uppercase tracking-wider">
            {user.platform === "darwin"
              ? <Apple className="h-2.5 w-2.5" />
              : <Monitor className="h-2.5 w-2.5" />}
            {user.platform === "win32" ? "Windows" : user.platform === "darwin" ? "macOS" : user.platform}
          </span>
        )}
      </div>

      {/* Hours */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-zinc-800/50 border border-zinc-700/30 px-3 py-2">
          <p className="text-[9px] text-zinc-600 font-bold uppercase tracking-wider mb-0.5">Today</p>
          <p className={cn(
            "font-mono text-sm font-bold tabular-nums",
            user.isLive && user.isOnline && !user.isOnBreak ? "text-emerald-400" : "text-zinc-300"
          )}>
            {fmtDuration(displaySeconds)}
          </p>
        </div>
        <div className="rounded-xl bg-zinc-800/50 border border-zinc-700/30 px-3 py-2">
          <p className="text-[9px] text-zinc-600 font-bold uppercase tracking-wider mb-0.5">This Week</p>
          <p className="font-mono text-sm font-bold tabular-nums text-zinc-300">
            {fmtDuration(user.thisWeek.totalSeconds)}
          </p>
        </div>
      </div>

      {/* Last seen (offline only) */}
      {!user.isOnline && user.lastSeenAt && (
        <p className="text-[10px] text-zinc-600">
          Last seen {fmtLastSeen(user.lastSeenAt)}
        </p>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────
   Main Page
───────────────────────────────────────────────────────────────────────── */
export default function AdminShiftBoardPage() {
  const router = useRouter()
  const [users, setUsers] = React.useState<MergedUser[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState("")
  const [lastRefreshed, setLastRefreshed] = React.useState<Date | null>(null)
  const [now, setNow] = React.useState(() => Date.now())

  const fetchData = React.useCallback(async () => {
    const token = localStorage.getItem("crm_token")
    if (!token) { router.replace("/crm"); return }

    try {
      const [timeprofRes, agentRes] = await Promise.all([
        apiClient.get("/api/crm/timeproof/users", { headers: { Authorization: `Bearer ${token}` } }),
        apiClient.get("/api/crm/timeproof/agent-status", { headers: { Authorization: `Bearer ${token}` } }),
      ])

      const timeprofUsers: UserTimeproof[] = timeprofRes.data?.data?.users ?? []
      const agentStatuses: AgentStatus[] = agentRes.data?.data?.agents ?? []

      const agentMap = new Map(agentStatuses.map((a) => [a.user._id.toString(), a]))

      const nowMs = Date.now()
      const BREAK_LIMIT_MS = 3600_000 // 1 hour

      const merged: MergedUser[] = timeprofUsers.map((u) => {
        const agent = agentMap.get(u.user._id.toString())
        const breakStartedAt = agent?.isOnBreak ? (agent.breakStartedAt ?? null) : null
        const isBreakExceeded = !!breakStartedAt &&
          (nowMs - new Date(breakStartedAt).getTime()) > BREAK_LIMIT_MS

        return {
          _id: u.user._id.toString(),
          fullName: u.user.fullName,
          username: u.user.username,
          avatar: u.user.avatar,
          role: u.user.role,
          today: u.today,
          thisWeek: u.thisWeek,
          isLive: u.isLive,
          isOnline: agent?.isOnline ?? false,
          isIdle: agent?.isIdle ?? false,
          isOnBreak: agent?.isOnBreak ?? false,
          isBreakExceeded,
          breakStartedAt,
          platform: agent?.platform ?? null,
          lastSeenAt: agent?.lastSeenAt ?? null,
          shiftStartedAt: u.shiftStartedAt,
          todayTotalWorkedSeconds: u.todayTotalWorkedSeconds,
          totalBreakSeconds: u.totalBreakSeconds,
        }
      })

      // Sort: on-shift → on break / over break → idle → online-only → offline; then by name
      merged.sort((a, b) => {
        const score = (u: MergedUser) => {
          if (!u.isOnline) return 0
          if (u.isLive && !u.isIdle && !u.isOnBreak) return 5
          if (u.isBreakExceeded) return 4
          if (u.isOnBreak) return 3
          if (u.isIdle) return 2
          return 1
        }
        const diff = score(b) - score(a)
        return diff !== 0 ? diff : a.fullName.localeCompare(b.fullName)
      })

      setUsers(merged)
      setLastRefreshed(new Date())
      setError("")
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } }
      setError(err?.response?.data?.message || "Failed to load agent data.")
    } finally {
      setLoading(false)
    }
  }, [router])

  // Initial fetch + poll every 30 seconds
  React.useEffect(() => {
    fetchData()
    const pollId = setInterval(fetchData, 30_000)
    return () => clearInterval(pollId)
  }, [fetchData])

  // Tick every second for live timer
  React.useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1_000)
    return () => clearInterval(id)
  }, [])

  const onlineCount = users.filter((u) => u.isOnline).length
  const onShiftCount = users.filter((u) => u.isLive && u.isOnline && !u.isOnBreak && !u.isIdle).length
  const onBreakCount = users.filter((u) => u.isOnBreak && u.isOnline).length
  const idleCount = users.filter((u) => u.isIdle && u.isOnline).length
  const overBreakCount = users.filter((u) => u.isBreakExceeded).length

  return (
    <div className="min-h-screen bg-zinc-950">

      {/* ── Sticky Header ── */}
      <div className="sticky top-0 z-20 border-b border-zinc-800/60 bg-zinc-950/90 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-3">
          <button
            onClick={() => router.push("/crm/timeproof")}
            className="h-8 w-8 rounded-xl flex items-center justify-center hover:bg-zinc-800/60 transition-colors text-zinc-500"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>

          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-emerald-600/10 flex items-center justify-center">
              <Shield className="h-3.5 w-3.5 text-emerald-500" />
            </div>
            <span className="text-sm font-black tracking-tight text-zinc-100">Live Shift Board</span>
            {overBreakCount > 0 && (
              <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 animate-pulse">
                {overBreakCount} over break
              </span>
            )}
          </div>

          <div className="ml-auto flex items-center gap-3">
            {lastRefreshed && (
              <span className="hidden sm:block text-[10px] text-zinc-600 font-mono">
                Updated {fmtLastSeen(lastRefreshed.toISOString())}
              </span>
            )}
            <button
              onClick={fetchData}
              className="h-8 w-8 rounded-xl border border-zinc-800 flex items-center justify-center hover:bg-zinc-800/50 transition-colors text-zinc-500"
              title="Refresh"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-5 space-y-5">

        {/* ── Summary chips ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Online", value: onlineCount, color: "text-emerald-400", icon: <Wifi className="h-3.5 w-3.5" /> },
            { label: "On Shift", value: onShiftCount, color: "text-emerald-300", icon: <Zap className="h-3.5 w-3.5" /> },
            { label: "On Break", value: onBreakCount, color: "text-amber-400", icon: <Coffee className="h-3.5 w-3.5" /> },
            { label: "Idle", value: idleCount, color: "text-zinc-500", icon: <Clock className="h-3.5 w-3.5" /> },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl border border-zinc-800/60 bg-zinc-900/40 px-4 py-3 flex items-center gap-3">
              <span className={cn("opacity-70", s.color)}>{s.icon}</span>
              <div>
                <p className={cn("text-xl font-black tabular-nums leading-none", s.color)}>{s.value}</p>
                <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-wider mt-0.5">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Error ── */}
        {error && (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* ── Loading ── */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 rounded-full border-2 border-emerald-500/30 border-t-emerald-500 animate-spin" />
          </div>
        )}

        {/* ── Empty ── */}
        {!loading && users.length === 0 && !error && (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Users className="h-10 w-10 text-zinc-700" />
            <p className="text-sm text-zinc-500 font-semibold">No agents found</p>
          </div>
        )}

        {/* ── Grid ── */}
        {!loading && users.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {users.map((u) => (
              <UserCard
                key={u._id}
                user={u}
                now={now}
                onClick={() => router.push(`/crm/timeproof/users/${u._id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
