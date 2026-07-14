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
  CalendarDays,
  Users,
  Zap,
  Apple,
  ChevronDown,
} from "lucide-react"
import { apiClient } from "@/lib/api-client"
import { LiveClock } from "@/components/crm/LiveClock"
import { initializeSocket } from "@/lib/socket.client"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn, resolveImageUrl } from "@/lib/utils"

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
    department?: string
  }
  today: HoursSummary
  thisWeek: HoursSummary
  isLive: boolean
  shiftStartedAt: string | null
  shiftEndedAt?: string | null
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
  department?: string
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
  shiftEndedAt: string | null
  todayTotalWorkedSeconds: number
  totalBreakSeconds: number
}

const DEPARTMENTS = [
  "Sales & Finance",
  "Accounting",
  "Recon",
  "Marketing",
  "Online Team",
  "Web Dev",
  "Wholesale",
  "Buying",
  "Operations",
  "Lot Tech",
  "Funding",
  "Prospects",
  "Price Check",
  "Other",
]

const MDT_OFFSET_MS = -6 * 60 * 60 * 1000

const fmtTimeMDT = (iso: string | null | undefined) => {
  if (!iso) return "——"
  return new Date(new Date(iso).getTime() + MDT_OFFSET_MS).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "UTC",
  })
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
  // Shift state takes priority over connectivity state.
  // A clocked-in user shows their shift status even when the tray is offline.
  if (user.isLive && user.isBreakExceeded) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 animate-pulse">
        <Coffee className="h-2.5 w-2.5" />
        Over Break
      </span>
    )
  }
  if (user.isLive && user.isOnBreak) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
        <Coffee className="h-2.5 w-2.5" />
        On Break
      </span>
    )
  }
  if (user.isLive && user.isIdle) {
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
        <span className={cn("h-1.5 w-1.5 rounded-full bg-emerald-400", user.isOnline && "animate-pulse")} />
        On Shift
      </span>
    )
  }
  if (user.isOnline) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-500 border border-zinc-700/50">
        <Wifi className="h-2.5 w-2.5" />
        Online
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-500 border border-zinc-700/50">
      <WifiOff className="h-2.5 w-2.5" />
      Offline
    </span>
  )
}

/* ─────────────────────────────────────────────────────────────────────────
   User Card
───────────────────────────────────────────────────────────────────────── */
function UserCard({ user, onClick }: { user: MergedUser; onClick: () => void }) {
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
        user.isLive && user.isBreakExceeded
          ? "border-red-500/30 shadow-sm shadow-red-500/5 hover:border-red-500/50"
          : user.isLive && user.isOnBreak
          ? "border-amber-500/25 shadow-sm shadow-amber-500/5 hover:border-amber-500/40"
          : user.isLive && !user.isIdle
          ? "border-emerald-500/25 shadow-sm shadow-emerald-500/5 hover:border-emerald-500/45"
          : user.isLive && user.isIdle
          ? "border-zinc-700/40 hover:border-zinc-600/60"
          : user.isOnline
          ? "border-zinc-700/40 hover:border-zinc-600/60"
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

      {/* Shift times */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-zinc-800/50 border border-zinc-700/30 px-3 py-2">
          <p className="text-[9px] text-zinc-600 font-bold uppercase tracking-wider mb-0.5">Time In</p>
          <p className="font-mono text-sm font-bold tabular-nums text-emerald-400">
            {fmtTimeMDT(user.shiftStartedAt)}
          </p>
        </div>
        <div className="rounded-xl bg-zinc-800/50 border border-zinc-700/30 px-3 py-2">
          <p className="text-[9px] text-zinc-600 font-bold uppercase tracking-wider mb-0.5">Time Out</p>
          {user.isLive ? (
            <p className="flex items-center gap-1.5 font-mono text-sm font-bold tabular-nums text-zinc-600">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              Active
            </p>
          ) : (
            <p className="font-mono text-sm font-bold tabular-nums text-zinc-300">
              {fmtTimeMDT(user.shiftEndedAt)}
            </p>
          )}
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
  const [selectedDept, setSelectedDept] = React.useState<string>("all")

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
      const BREAK_LIMIT_MS = 65 * 60 * 1000 // 1 hour 5 minutes — matches dashboard threshold

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
          department: u.user.department,
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
          shiftEndedAt: u.shiftEndedAt ?? null,
          todayTotalWorkedSeconds: u.todayTotalWorkedSeconds,
          totalBreakSeconds: u.totalBreakSeconds,
        }
      })

      // Sort by shift state first, then connectivity, then name
      merged.sort((a, b) => {
        const score = (u: MergedUser) => {
          if (u.isLive && !u.isIdle && !u.isOnBreak && u.isOnline) return 7  // on shift + online
          if (u.isLive && !u.isIdle && !u.isOnBreak) return 6               // on shift (tray offline)
          if (u.isLive && u.isBreakExceeded) return 5
          if (u.isLive && u.isOnBreak) return 4
          if (u.isLive && u.isIdle) return 3
          if (u.isOnline) return 2
          return 0
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

  // Poll every 5s for near-real-time accuracy on a live board
  React.useEffect(() => {
    fetchData()
    const pollId = setInterval(fetchData, 5_000)
    return () => clearInterval(pollId)
  }, [fetchData])

  // Socket: join shift-board room + instantly refresh on any employee state change
  React.useEffect(() => {
    const token = localStorage.getItem("crm_token")
    if (!token) return
    const sock = initializeSocket(token)

    // Join the server-side room so we receive events emitted to crm:shift-board
    sock.emit("join_shift_board")

    sock.on("crm:presence", fetchData)
    sock.on("agent:idle", fetchData)
    sock.on("agent:break-exceeded", fetchData)
    sock.on("time-in", fetchData)
    sock.on("time-out", fetchData)
    sock.on("break-in", fetchData)
    sock.on("break-out", fetchData)

    return () => {
      sock.emit("leave_shift_board")
      sock.off("crm:presence", fetchData)
      sock.off("agent:idle", fetchData)
      sock.off("agent:break-exceeded", fetchData)
      sock.off("time-in", fetchData)
      sock.off("time-out", fetchData)
      sock.off("break-in", fetchData)
      sock.off("break-out", fetchData)
    }
  }, [fetchData])


  // Derive unique department list from loaded users
  const departments = React.useMemo(() => {
    const seen = new Set<string>()
    users.forEach((u) => { if (u.department) seen.add(u.department) })
    return Array.from(seen).sort()
  }, [users])

  // selectedDept values: "all" | "role:<role>" | "dept:<dept>"
  const filteredUsers = React.useMemo(() => {
    if (selectedDept === "all") return users
    if (selectedDept.startsWith("role:")) {
      const role = selectedDept.slice(5)
      return users.filter((u) => u.role === role)
    }
    if (selectedDept.startsWith("dept:")) {
      const dept = selectedDept.slice(5)
      return users.filter((u) => u.department === dept)
    }
    return users
  }, [users, selectedDept])

  // Online = anyone on shift (any state) OR with an active tray/CRM connection
  const onlineCount = filteredUsers.filter((u) => u.isLive || u.isOnline).length
  const onShiftCount = filteredUsers.filter((u) => u.isLive && !u.isOnBreak && !u.isIdle).length
  const onBreakCount = filteredUsers.filter((u) => u.isLive && u.isOnBreak).length
  const idleCount = filteredUsers.filter((u) => u.isLive && u.isIdle).length
  const overBreakCount = filteredUsers.filter((u) => u.isLive && u.isBreakExceeded).length

  return (
    <div className="min-h-screen bg-zinc-950">

      {/* ── Sticky Header ── */}
      <div className="sticky top-0 z-20 border-b border-zinc-800/60 bg-zinc-950/90 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-3">
          <button
            onClick={() => router.push("/crm/timeproof-clock")}
            className="h-9 w-9 rounded-xl flex items-center justify-center hover:bg-zinc-800/60 transition-colors text-zinc-500"
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

          <div className="ml-auto flex items-center gap-2">
            <LiveClock />
            {/* Department filter */}
            <div className="relative">
              <select
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                className="h-9 pl-3 pr-7 rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-300 text-[11px] font-bold appearance-none focus:outline-none focus:border-zinc-600 cursor-pointer"
              >
                <option value="all">All Departments</option>
                {DEPARTMENTS.map((d) => (
                  <option key={d} value={`dept:${d}`}>{d}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-zinc-600" />
            </div>
            {lastRefreshed && (
              <span className="hidden sm:block text-[10px] text-zinc-600 font-mono">
                Updated {fmtLastSeen(lastRefreshed.toISOString())}
              </span>
            )}
            <button
              onClick={() => router.push("/team-pulse?tab=calendar")}
              className="h-9 px-3 rounded-xl border border-zinc-800 flex items-center gap-1.5 hover:bg-zinc-800/50 transition-colors text-zinc-400 hover:text-zinc-200"
              title="View early-out / out-of-office calendar"
            >
              <CalendarDays className="h-3.5 w-3.5" />
              <span className="text-[11px] font-bold uppercase tracking-wider hidden sm:inline">Calendar</span>
            </button>
            <button
              onClick={fetchData}
              className="h-9 w-9 rounded-xl border border-zinc-800 flex items-center justify-center hover:bg-zinc-800/50 transition-colors text-zinc-500"
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
        {!loading && filteredUsers.length === 0 && !error && (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Users className="h-10 w-10 text-zinc-700" />
            <p className="text-sm text-zinc-500 font-semibold">
              {selectedDept === "all"
                ? "No agents found"
                : `No agents in "${selectedDept.startsWith("dept:") ? selectedDept.slice(5) : selectedDept}"`}
            </p>
          </div>
        )}

        {/* ── Grid ── */}
        {!loading && filteredUsers.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {filteredUsers.map((u) => (
              <UserCard
                key={u._id}
                user={u}
                onClick={() => router.push(`/crm/timeproof/users/${u._id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
