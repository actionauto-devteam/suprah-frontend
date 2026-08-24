"use client"

import * as React from "react"
import { Coffee, LogOut, Play, Loader2 } from "lucide-react"
import { apiClient } from "@/lib/api-client"
import { isMobileMonitoringDept } from "@/lib/departments"
import { cn } from "@/lib/utils"

const SHIFT_TARGET_MS = 8 * 60 * 60 * 1000
const MDT_OFFSET_MS = -6 * 60 * 60 * 1000 // company timezone, matches backend COMPANY_TZ_OFFSET_MINUTES

function fmtMdtTime(iso: string) {
  // Shift into MDT, then format with timeZone: "UTC" so the shifted value is
  // displayed as-is regardless of the viewer's own device timezone — mirrors
  // fmt()/toMDTDate() in the main timeproof-clock page.
  const mdt = new Date(new Date(iso).getTime() + MDT_OFFSET_MS)
  return mdt.toLocaleTimeString("en-US", {
    hour: "2-digit", minute: "2-digit", hour12: true, timeZone: "UTC",
  })
}

function getErrorMessage(error: unknown, fallback: string) {
  if (typeof error === "object" && error !== null && "response" in error) {
    const response = error as { response?: { data?: { message?: string } } }
    return response.response?.data?.message || fallback
  }
  return error instanceof Error ? error.message || fallback : fallback
}

interface TodayLog {
  type: "time-in" | "time-out" | "break-in" | "break-out"
  timestamp: string
}

interface WidgetUser {
  department?: string
  locationRequiredForTimeproof?: boolean
}

export default function TimeproofWidgetPage() {
  const [ready, setReady] = React.useState(false)
  const [loggedIn, setLoggedIn] = React.useState(false)
  const [user, setUser] = React.useState<WidgetUser | null>(null)
  const [todayLogs, setTodayLogs] = React.useState<TodayLog[]>([])

  const [isOnShift, setIsOnShift] = React.useState(false)
  const [isOnBreak, setIsOnBreak] = React.useState(false)
  const [wallClockBaseMs, setWallClockBaseMs] = React.useState(0)
  const [wallClockBaseAt, setWallClockBaseAt] = React.useState<number | null>(null)
  const [breakTotalMs, setBreakTotalMs] = React.useState(0)
  const [currentBreakStartAt, setCurrentBreakStartAt] = React.useState<number | null>(null)

  const [busy, setBusy] = React.useState(false)
  const [errorMsg, setErrorMsg] = React.useState("")
  const [now, setNow] = React.useState(() => Date.now())

  const isLotTech = isMobileMonitoringDept(user?.department)

  const authHeaders = React.useCallback(() => {
    const t = localStorage.getItem("crm_token")
    return t ? { headers: { Authorization: `Bearer ${t}` } } : null
  }, [])

  const fetchShiftState = React.useCallback(async () => {
    const cfg = authHeaders()
    if (!cfg) return
    const requestSentAt = Date.now()
    try {
      const res = await apiClient.get("/api/crm/timeproof/shift-state", cfg)
      const s = res.data?.data
      if (!s) return
      setIsOnShift(!!s.isOnShift)
      setIsOnBreak(!!s.isOnBreak)
      setWallClockBaseMs((s.wallClockRenderedSeconds ?? 0) * 1000)
      setWallClockBaseAt(s.isOnShift && !s.isOnBreak ? requestSentAt : null)
      setCurrentBreakStartAt(s.isOnBreak && s.breakStartedAt ? new Date(s.breakStartedAt).getTime() : null)
    } catch {
      // best-effort — next poll will retry
    }
  }, [authHeaders])

  const fetchMe = React.useCallback(async () => {
    const cfg = authHeaders()
    if (!cfg) { setLoggedIn(false); setReady(true); return }
    try {
      const res = await apiClient.get("/api/crm/me", cfg)
      const data = res.data?.data || res.data
      setUser(data)
      setTodayLogs(data.todayTimeLogs || [])
      setLoggedIn(true)
    } catch {
      localStorage.removeItem("crm_token")
      setLoggedIn(false)
    } finally {
      setReady(true)
    }
  }, [authHeaders])

  React.useEffect(() => {
    fetchMe()
  }, [fetchMe])

  React.useEffect(() => {
    if (!loggedIn) return
    fetchShiftState()
    const id = setInterval(fetchShiftState, 10_000)
    return () => clearInterval(id)
  }, [loggedIn, fetchShiftState])

  React.useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  const liveMs = wallClockBaseAt ? Math.max(0, now - wallClockBaseAt) : 0
  const totalMs = wallClockBaseMs + liveMs
  const isActive = wallClockBaseAt !== null
  const breakLiveMs = currentBreakStartAt ? Math.max(0, now - currentBreakStartAt) : 0
  const totalBreakMs = breakTotalMs + breakLiveMs

  const pad = (n: number) => n.toString().padStart(2, "0")
  const toHMS = (ms: number) => ({
    h: Math.floor(ms / 3600000),
    m: Math.floor((ms % 3600000) / 60000),
    s: Math.floor((ms % 60000) / 1000),
  })
  const displayMs = isOnBreak ? totalBreakMs : totalMs
  const worked = toHMS(displayMs)
  const shift = toHMS(totalMs)
  const stateLabel = isOnBreak ? "On break" : isActive ? "Tracking" : isOnShift ? "Paused" : "Off clock"
  const accentClass = isOnBreak ? "text-amber-500" : isActive ? "text-emerald-500" : "text-zinc-500"

  const firstTimeIn = todayLogs.find((l) => l.type === "time-in")
  const lastTimeOut = isOnShift ? null : [...todayLogs].reverse().find((l) => l.type === "time-out")

  const runAction = async (fn: () => Promise<void>) => {
    setErrorMsg("")
    setBusy(true)
    try {
      await fn()
    } catch (err) {
      setErrorMsg(getErrorMessage(err, "Something went wrong. Please try again."))
    } finally {
      setBusy(false)
    }
  }

  const handleStartShift = () => runAction(async () => {
    // Best-effort location nudge only — Lot Tech users already have location
    // consent set up via their normal mobile monitoring usage elsewhere in the
    // app; this widget deliberately doesn't replicate the full consent-setup
    // flow from the main TimeProof page to stay a quick, minimal glance tool.
    if (typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(() => {}, () => {}, { timeout: 5000 })
    }
    const cfg = authHeaders()
    if (!cfg) return
    await apiClient.post("/api/crm/time-clock", { type: "time-in" }, cfg)
    await Promise.all([fetchShiftState(), fetchMe()])
  })

  const handleEndShift = () => runAction(async () => {
    if (!window.confirm("End your shift now?")) return
    const cfg = authHeaders()
    if (!cfg) return
    await apiClient.post("/api/crm/time-clock", { type: "time-out" }, cfg)
    await Promise.all([fetchShiftState(), fetchMe()])
  })

  const handleToggleBreak = () => runAction(async () => {
    const cfg = authHeaders()
    if (!cfg) return
    await apiClient.post("/api/crm/time-clock", { type: isOnBreak ? "break-out" : "break-in" }, cfg)
    await fetchShiftState()
  })

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <Loader2 className="size-6 animate-spin text-zinc-500" />
      </div>
    )
  }

  if (!loggedIn) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-black px-6 text-center">
        <p className="text-sm text-zinc-400">
          Please log in to Suprah AI first, then come back to this widget.
        </p>
        <a href="/crm" className="text-sm font-bold text-emerald-500 underline underline-offset-4">
          Go to login
        </a>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col justify-center gap-6 bg-black px-5 py-8">
      <div className="flex flex-col items-center gap-2 text-center">
        <span className={cn("text-[11px] font-black uppercase tracking-[0.25em]", accentClass)}>
          {stateLabel}
        </span>
        <div className="flex items-end gap-0.5 font-mono font-black leading-none tracking-tighter text-white">
          <span className="text-5xl tabular-nums">{pad(worked.h)}</span>
          <span className="mb-1 text-2xl opacity-30">:</span>
          <span className="text-5xl tabular-nums">{pad(worked.m)}</span>
          <span className="mb-1 text-2xl opacity-30">:</span>
          <span className="text-5xl tabular-nums">{pad(worked.s)}</span>
        </div>
        <span className="font-mono text-[12px] font-bold tabular-nums text-zinc-400">
          {pad(shift.h)}h {pad(shift.m)}m <span className="opacity-50">/ 8h</span>
        </span>
      </div>

      {isOnShift ? (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Time In</p>
              <p className="mt-1 text-base font-bold text-white">
                {firstTimeIn ? fmtMdtTime(firstTimeIn.timestamp) : "—"}
              </p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Time Out</p>
              <p className="mt-1 text-base font-bold text-white">—</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleToggleBreak}
              disabled={busy}
              className="flex items-center justify-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950 py-3 text-sm font-bold text-white disabled:opacity-50"
            >
              <Coffee className="size-4" />
              {isOnBreak ? "Resume" : "Break"}
            </button>
            <button
              onClick={handleEndShift}
              disabled={busy}
              className="flex items-center justify-center gap-2 rounded-xl border border-red-900/50 bg-red-950/40 py-3 text-sm font-bold text-red-400 disabled:opacity-50"
            >
              <LogOut className="size-4" />
              End Shift
            </button>
          </div>
        </>
      ) : isLotTech ? (
        <button
          onClick={handleStartShift}
          disabled={busy}
          className="flex items-center justify-center gap-2 rounded-xl border border-emerald-900/50 bg-emerald-950/40 py-3 text-sm font-bold text-emerald-400 disabled:opacity-50"
        >
          <Play className="size-4" />
          Start Shift
        </button>
      ) : (
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-center">
          <p className="text-sm text-zinc-400">
            {lastTimeOut ? `Shift ended at ${fmtMdtTime(lastTimeOut.timestamp)}.` : "You're not clocked in yet."}
          </p>
          <p className="mt-1 text-xs text-zinc-600">Start your shift from your desktop tray app.</p>
        </div>
      )}

      {errorMsg && (
        <p className="text-center text-xs font-medium text-red-400">{errorMsg}</p>
      )}
    </div>
  )
}
