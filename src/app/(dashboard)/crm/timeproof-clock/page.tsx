"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Calendar,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Coffee,
  Copy,
  DollarSign,
  Download,
  Eye,
  Flame,
  Loader2,
  Lock,
  LogOut,
  MapPin,
  MonitorDot,
  Play,
  Power,
  Radio,
  RefreshCw,
  Scissors,
  ShieldAlert,
  Timer,
  Users,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { apiClient } from "@/lib/api-client"
import { initializeSocket } from "@/lib/socket.client"
import { playOverBreakAlarm, stopOverBreakAlarm } from "@/lib/notification-sound"
import { CrmPushPrompt } from "@/components/crm/CrmPushPrompt"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { useIsMobile } from "@/hooks/use-mobile"
import { isMobileMonitoringDept, isMandatoryLocationDept } from "@/lib/departments"
import { useLocationSharing } from "@/hooks/useLocationSharing"
import { sharingMeta } from "@/app/(dashboard)/team-pulse/_components/locator/LocatorMapLegend"
import {
  DayData, toDateStr, fmtHHMM, fmtHuman, getDayColor, StatCard, MonthCalendar, MobileCalendarList,
  generatePayslipHtml, openHtmlForPrint, buildTimecardRows, generateTimecardHtml,
  generateIdleLogHtml, type IdlePeriod,
} from "@/components/crm/timeproof/shared"
import { PulseHealthCard } from "@/components/crm/timeproof/PulseHealthCard"

interface CrmUserData {
  _id: string
  fullName: string
  username: string
  email: string
  avatar?: string
  role: string
  department?: string
  locationRequiredForTimeproof?: boolean
  todayTimeLogs?: Array<{
    _id: string
    type: "time-in" | "time-out" | "break-in" | "break-out"
    timestamp: string
  }>
}

interface HoursSummary {
  hours: number
  minutes: number
  totalSeconds: number
  decimal: number
}

interface TimeprofData {
  user: {
    _id: string
    fullName: string
    username: string
    avatar?: string
    role: string
  }
  calendar: Record<string, DayData>
  summary: {
    today: HoursSummary
    thisWeek: HoursSummary
    thisMonth: HoursSummary
  }
  streak: number
  longestStreak: number
  hourPattern: number[]
  isLive: boolean
  range: { startDate: string; endDate: string }
}

type ApiError = {
  response?: { status?: number; data?: { message?: string } }
}

type GaugeAccent = "emerald" | "amber" | "red" | "zinc"
type LocatorSharingState = "sharing" | "paused_break" | "paused_manual" | "declined_permission" | "off_duty"

const MDT_OFFSET_MS = -6 * 60 * 60 * 1000
const toMDTDate = (d: Date) => new Date(d.getTime() + MDT_OFFSET_MS)
const SHIFT_TARGET_MS = 8 * 60 * 60 * 1000
const EIGHT_HOURS_MS = 8 * 60 * 60 * 1000

function fmt(d: Date) {
  return toMDTDate(d).toLocaleTimeString("en-US", {
    hour: "2-digit", minute: "2-digit", hour12: true, timeZone: "UTC",
  })
}

function getDeviceHint() {
  if (typeof navigator === "undefined") return "desktop"
  const ua = navigator.userAgent || ""
  if (/iPad|iPhone|iPod/i.test(ua)) return "ios-pwa"
  if (/Android/i.test(ua)) return "android-pwa"
  return "desktop-web"
}

function isMacDesktop() {
  if (typeof navigator === "undefined") return false
  const platform = navigator.platform || ""
  const ua = navigator.userAgent || ""
  const isMacUA = /Mac/i.test(platform) || /Macintosh/i.test(ua)
  const isTouchIpad = isMacUA && (navigator.maxTouchPoints ?? 0) > 1
  return isMacUA && !isTouchIpad
}

function getTrayDownloadUrl() {
  const winUrl = process.env.NEXT_PUBLIC_TRAY_DOWNLOAD_URL ?? "#"
  const macUrl = process.env.NEXT_PUBLIC_TRAY_DOWNLOAD_URL_MAC ?? winUrl
  return isMacDesktop() ? macUrl : winUrl
}

const LOCATOR_STATE_COLORS: Record<LocatorSharingState, { dot: string; text: string; pill: string }> = {
  sharing: { dot: "bg-green-500", text: "text-green-500", pill: "border-green-500/20 bg-green-500/10" },
  paused_break: { dot: "bg-orange-500", text: "text-orange-500", pill: "border-orange-500/20 bg-orange-500/10" },
  paused_manual: { dot: "bg-amber-500", text: "text-amber-500", pill: "border-amber-500/20 bg-amber-500/10" },
  declined_permission: { dot: "bg-red-500", text: "text-red-500", pill: "border-red-500/20 bg-red-500/10" },
  off_duty: { dot: "bg-gray-400", text: "text-gray-500", pill: "border-gray-400/20 bg-gray-400/10" },
}

function locatorStateMeta(state: LocatorSharingState, error: string | null, awaitingFirstFix?: boolean) {
  if (awaitingFirstFix) {
    return {
      label: "Turning on…", detail: "Getting your location — this can take a few seconds",
      dot: "bg-blue-500", text: "text-blue-500", pill: "border-blue-500/20 bg-blue-500/10",
    }
  }
  if (error) return { label: "Needs attention", detail: error, ...LOCATOR_STATE_COLORS.declined_permission }
  const meta = sharingMeta(state)
  const detail = state === "sharing" ? "Sharing to Team Pulse Locator"
    : state === "off_duty" ? "Starts automatically on shift"
      : meta.description
  return { label: meta.label, detail, ...LOCATOR_STATE_COLORS[state] }
}

function getPayoutWindowState(dayOfMonth: number): { available: boolean; nextUnlockLabel: string; daysUntil: number } {
  if (dayOfMonth >= 5 && dayOfMonth <= 15) return { available: true, nextUnlockLabel: "", daysUntil: 0 }
  if (dayOfMonth >= 20) return { available: true, nextUnlockLabel: "", daysUntil: 0 }
  if (dayOfMonth < 5) return { available: false, nextUnlockLabel: "the 5th of this month", daysUntil: 5 - dayOfMonth }
  return { available: false, nextUnlockLabel: "the 20th of this month", daysUntil: 20 - dayOfMonth }
}

function AnimatedDigit({ value }: { value: string }) {
  const [displayed, setDisplayed] = React.useState(value)
  const [animating, setAnimating] = React.useState(false)
  const prevRef = React.useRef(value)

  React.useEffect(() => {
    if (prevRef.current !== value) {
      setAnimating(true)
      const t = setTimeout(() => {
        setDisplayed(value)
        setAnimating(false)
        prevRef.current = value
      }, 150)
      return () => clearTimeout(t)
    }
  }, [value])

  return (
    <span className={cn("inline-block transition-all duration-150", animating ? "opacity-0 -translate-y-2 scale-95" : "opacity-100 translate-y-0 scale-100")}>
      {displayed}
    </span>
  )
}

function ShiftGauge({ progress, accent, glow = false, children }: {
  progress: number; accent: GaugeAccent; glow?: boolean; children: React.ReactNode
}) {
  const R = 86
  const CIRC = 2 * Math.PI * R
  const pct = Math.min(1, Math.max(0, progress))
  const dash = CIRC * pct
  const accentText = accent === "amber" ? "text-amber-500 dark:text-amber-400"
    : accent === "red" ? "text-red-500 dark:text-red-400"
      : accent === "zinc" ? "text-zinc-300 dark:text-zinc-700"
        : "text-emerald-500 dark:text-emerald-400"
  const glowColor = accent === "amber" ? "rgba(245,158,11,0.45)"
    : accent === "red" ? "rgba(239,68,68,0.45)"
      : "rgba(16,185,129,0.5)"

  return (
    <div className="relative h-44 w-44 shrink-0 sm:h-52 sm:w-52">
      <svg viewBox="0 0 200 200" className="h-full w-full -rotate-90">
        <circle cx="100" cy="100" r={R} fill="none" strokeWidth="6"
          className="stroke-current text-zinc-200/70 dark:text-zinc-800/90" />
        <circle cx="100" cy="100" r={R} fill="none" strokeWidth="6" strokeLinecap="round"
          strokeDasharray={`${dash} ${CIRC}`}
          className={cn("stroke-current transition-all duration-700 motion-reduce:transition-none", accentText)}
          style={glow ? { filter: `drop-shadow(0 0 7px ${glowColor})` } : undefined} />
      </svg>
      <div className="absolute inset-3.5 rounded-full border border-zinc-200/50 dark:border-white/4" />
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  )
}

function ActivityTimer({ wallClockBaseMs, wallClockBaseAt, isOnShift, isOnBreak, breakTotalMs, currentBreakStartAt }: {
  wallClockBaseMs: number; wallClockBaseAt: number | null; isOnShift: boolean
  isOnBreak: boolean; breakTotalMs: number; currentBreakStartAt: number | null
}) {
  const [now, setNow] = React.useState(() => Date.now())
  React.useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  // Authoritative wall-clock baseline (see wallClockBaseMs state declaration)
  // plus a smooth client-side tick since it was last fetched — never regresses
  // or resets, unlike the old ActivityInterval+heartbeat-derived mechanism.
  const liveMs = wallClockBaseAt ? Math.max(0, now - wallClockBaseAt) : 0
  const totalMs = wallClockBaseMs + liveMs
  const isActive = wallClockBaseAt !== null
  const breakLiveMs = currentBreakStartAt ? Math.max(0, now - currentBreakStartAt) : 0
  const totalBreakMs = breakTotalMs + breakLiveMs
  const BREAK_LIMIT_MS = 65 * 60 * 1000
  const breakExceeded = isOnBreak && totalBreakMs >= BREAK_LIMIT_MS

  // Repeating alarm once break has gone past the limit — keeps playing until
  // the user resumes their shift (breakExceeded flips false, either from
  // isOnBreak going false or the duration no longer qualifying). Only heard
  // while this page is open, same as any other in-app sound.
  React.useEffect(() => {
    if (breakExceeded) {
      playOverBreakAlarm()
    } else {
      stopOverBreakAlarm()
    }
    return () => stopOverBreakAlarm()
  }, [breakExceeded])

  const pad = (n: number) => n.toString().padStart(2, "0")
  const toHMS = (ms: number) => ({
    h: Math.floor(ms / 3600000),
    m: Math.floor((ms % 3600000) / 60000),
    s: Math.floor((ms % 60000) / 1000),
  })

  const displayMs = isOnBreak ? totalBreakMs : totalMs
  const worked = toHMS(displayMs)
  const units = [
    { v: pad(worked.h), l: "HRS" },
    { v: pad(worked.m), l: "MIN" },
    { v: pad(worked.s), l: "SEC" },
  ]
  const shift = toHMS(totalMs)
  const shiftProgress = totalMs / SHIFT_TARGET_MS
  const accent: GaugeAccent = isOnBreak ? (breakExceeded ? "red" : "amber") : isActive ? "emerald" : "zinc"
  const centerColor = isOnBreak
    ? breakExceeded ? "text-red-500 dark:text-red-400" : "text-amber-500 dark:text-amber-400"
    : isActive ? "text-zinc-900 dark:text-white" : "text-zinc-400 dark:text-zinc-600"
  const stateLabel = isOnBreak ? (breakExceeded ? "Break over" : "On break")
    : isActive ? "Tracking" : isOnShift ? "Paused" : "Off clock"

  return (
    <div className="flex w-full flex-col items-center gap-4 py-2">
      <div className="flex flex-col items-center gap-2 text-center">
        <span className={cn("text-[9px] font-black uppercase tracking-[0.25em]",
          accent === "amber" ? "text-amber-500 dark:text-amber-400"
            : accent === "red" ? "text-red-500 dark:text-red-400"
              : accent === "emerald" ? "text-emerald-500 dark:text-emerald-400"
                : "text-zinc-400 dark:text-zinc-600")}>
          {stateLabel}
        </span>
        <div className="flex items-end gap-0.5 font-mono font-black leading-none tracking-tighter">
          {units.map((item, i) => (
            <React.Fragment key={item.l}>
              {i > 0 && <span className={cn("mb-1 text-xl opacity-30 sm:text-2xl", centerColor)}>:</span>}
              <span className={cn("text-4xl tabular-nums transition-colors duration-500 sm:text-5xl", centerColor)}>
                <AnimatedDigit value={item.v[0]} />
                <AnimatedDigit value={item.v[1]} />
              </span>
            </React.Fragment>
          ))}
        </div>
        <span className="font-mono text-[10px] font-bold tabular-nums text-zinc-400 dark:text-zinc-600">
          {pad(shift.h)}h {pad(shift.m)}m <span className="opacity-50">/ 8h</span>
        </span>
      </div>
      {breakExceeded && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-center">
          <p className="text-[10px] font-bold uppercase tracking-wider text-red-400">Break limit exceeded</p>
          <p className="mt-0.5 text-[9px] text-red-400/60">Over 1h 5m — please resume your shift</p>
        </div>
      )}
    </div>
  )
}

export default function TimeprofClockPage() {
  const router = useRouter()
  const isMobile = useIsMobile()

  const authModeRef = React.useRef<'crm' | 'main'>('crm')
  const [user, setUser] = React.useState<CrmUserData | null>(null)
  const [token, setToken] = React.useState("")
  const [isLoading, setIsLoading] = React.useState(true)
  const [todayLogs, setTodayLogs] = React.useState<CrmUserData["todayTimeLogs"]>([])

  const [isClocking, setIsClocking] = React.useState(false)
  const [clockMsg, setClockMsg] = React.useState("")
  const [isOnBreak, setIsOnBreak] = React.useState(false)
  const [breakAccumulatedMs, setBreakAccumulatedMs] = React.useState(0)
  const [showTrayModal, setShowTrayModal] = React.useState(false)
  const [trayChecking, setTrayChecking] = React.useState(false)
  const [serverIsOnShift, setServerIsOnShift] = React.useState(false)
  // Authoritative, single-source on-break flag for gating the End Shift
  // button — deliberately separate from `isOnBreak` below, which is also
  // written by socket events AND a log-derived useEffect (computed from
  // todayLogs). Those extra writers made `isOnBreak` race-prone: if that
  // effect's log snapshot showed an unpaired break-in from data that didn't
  // yet reflect a break-out, it could set `isOnBreak=true` even while this
  // same poll's `s.isOnBreak=false` was correctly keeping the timer ticking
  // — silently disabling End Shift with no modal, no error, nothing (seen in
  // production: a user reported that clicking End Shift with hours already
  // over 8h did nothing and the timer kept running). This flag never gets
  // written by anything except this one poll, so it can't be stale/desynced
  // by another writer racing it.
  const [serverIsOnBreak, setServerIsOnBreak] = React.useState(false)
  const [serverIsShiftFromToday, setServerIsShiftFromToday] = React.useState(false)
  const [locallyResumedShift, setLocallyResumedShift] = React.useState(
    () => typeof window !== "undefined" && sessionStorage.getItem("crm_resumed_shift") === "true"
  )
  const [serverShiftStartedAt, setServerShiftStartedAt] = React.useState<string | null>(null)
  const [todayTotalActiveMs, setTodayTotalActiveMs] = React.useState(0)
  const [activityStartAt, setActivityStartAt] = React.useState<number | null>(null)
  // Authoritative rendered-hours baseline — same wall-clock (TimeLog-based)
  // figure that already powers the Today card and calendar, which is why
  // those never show the "resets to zero" bug this live ticker was prone to.
  // wallClockBaseAt marks when this baseline was fetched; the display adds
  // (now - wallClockBaseAt) on top for smooth client-side ticking, then
  // resyncs to a fresh authoritative baseline on every poll — so even if
  // something is briefly off, it self-corrects within one poll cycle instead
  // of getting stuck at a wrong, frozen, or reset value.
  const [wallClockBaseMs, setWallClockBaseMs] = React.useState(0)
  const [wallClockBaseAt, setWallClockBaseAt] = React.useState<number | null>(null)
  const [currentBreakStartAt, setCurrentBreakStartAt] = React.useState<number | null>(null)
  const [resumeModal, setResumeModal] = React.useState(false)
  const [resumeOriginalClockIn, setResumeOriginalClockIn] = React.useState<string | null>(null)
  const [showEarlyEndModal, setShowEarlyEndModal] = React.useState(false)
  const [showConfirmEndModal, setShowConfirmEndModal] = React.useState(false)
  const [showBreakCapModal, setShowBreakCapModal] = React.useState(false)
  const [earlyEndReason, setEarlyEndReason] = React.useState("")
  const [earlyEndDetails, setEarlyEndDetails] = React.useState("")
  const [earlyEndSubmitting, setEarlyEndSubmitting] = React.useState(false)
  const [locatorStatus, setLocatorStatus] = React.useState<{
    consentGranted: boolean
  } | null>(null)
  const locatorWasEligibleRef = React.useRef(false)

  const [tpData, setTpData] = React.useState<TimeprofData | null>(null)
  const [tpLoading, setTpLoading] = React.useState(true)
  const [tpError, setTpError] = React.useState("")

  const now = toMDTDate(new Date())
  const [viewYear, setViewYear] = React.useState(now.getUTCFullYear())
  const [viewMonth, setViewMonth] = React.useState(now.getUTCMonth())
  const [copied, setCopied] = React.useState(false)

  const [payoutPeriod, setPayoutPeriod] = React.useState<1 | 2>(() => now.getUTCDate() <= 15 ? 1 : 2)
  const [hourlyRate, setHourlyRate] = React.useState(() => {
    if (typeof window !== "undefined") return localStorage.getItem("tp_hourly_rate") ?? ""
    return ""
  })
  const [showPhp, setShowPhp] = React.useState(false)
  const [phpRate, setPhpRate] = React.useState<number | null>(null)
  const [fetchingPhp, setFetchingPhp] = React.useState(false)

  const [showTimecardModal, setShowTimecardModal] = React.useState(false)
  const [timecardStart, setTimecardStart] = React.useState(() => {
    const y = now.getUTCFullYear(), m = now.getUTCMonth()
    const d = now.getUTCDate() <= 15 ? 1 : 16
    return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`
  })
  const [timecardEnd, setTimecardEnd] = React.useState(() => toDateStr(new Date()))

  const [showIdleLogModal, setShowIdleLogModal] = React.useState(false)
  const [idleLogStart, setIdleLogStart] = React.useState(() => {
    const d = new Date(now.getTime() - 14 * 86_400_000)
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`
  })
  const [idleLogEnd, setIdleLogEnd] = React.useState(() => toDateStr(new Date()))
  const [idlePeriods, setIdlePeriods] = React.useState<IdlePeriod[]>([])
  const [idleLogLoading, setIdleLogLoading] = React.useState(false)

  React.useEffect(() => {
    if (typeof window !== "undefined") localStorage.setItem("tp_hourly_rate", hourlyRate)
  }, [hourlyRate])

  const [, setTick] = React.useState(0)
  React.useEffect(() => {
    if (!tpData?.isLive) return
    const id = setInterval(() => setTick((n) => n + 1), 60_000)
    return () => clearInterval(id)
  }, [tpData?.isLive])

  const getCrmLocatorHeaders = React.useCallback(async () => {
    if (authModeRef.current === 'main') return {}
    const freshToken = localStorage.getItem("crm_token")
    if (!freshToken) throw new Error("CRM session is missing")
    return { headers: { Authorization: `Bearer ${freshToken}` } }
  }, [])

  const refreshLocatorStatus = React.useCallback(async () => {
    try {
      const headers = await getCrmLocatorHeaders()
      const { data } = await apiClient.getMyLocatorStatus(headers)
      const d = data?.data || data
      setLocatorStatus({
        consentGranted: !!d?.locationConsent?.granted,
      })
    } catch { }
  }, [getCrmLocatorHeaders])

  // Location sharing is now required to clock in — no more pre-shift opt-out. Requests
  // a real GPS fix (forces the permission prompt on a fresh install) and grants consent
  // server-side before the actual clock-in call, so the backend's own mandatory-location
  // gate (generalTimeclock.controller.ts / crm.controller.ts) never has to reject it.
  const requestLocationForShiftStart = React.useCallback(async (): Promise<boolean> => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      toast.error("Location is required to start your shift, and this device doesn't support it.")
      return false
    }
    try {
      await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 20000 })
      )
      const headers = await getCrmLocatorHeaders()
      await apiClient.setLocationConsent({ granted: true, deviceHint: getDeviceHint() }, headers)
      await refreshLocatorStatus()
      return true
    } catch {
      toast.error("Location is required to start your shift. Please allow location access and try again.")
      return false
    }
  }, [getCrmLocatorHeaders, refreshLocatorStatus])

  const [stopSharingConfirmOpen, setStopSharingConfirmOpen] = React.useState(false)
  const [stopSharingSaving, setStopSharingSaving] = React.useState(false)
  const [resumeSharingSaving, setResumeSharingSaving] = React.useState(false)

  const handleStopSharingNow = React.useCallback(async () => {
    setStopSharingSaving(true)
    try {
      const headers = await getCrmLocatorHeaders()
      await apiClient.setLocationConsent({ granted: false }, headers)
      toast.message("Location sharing turned off — your shift stays active. Admins have been notified.")
      await refreshLocatorStatus()
    } catch {
      toast.error("Could not turn off location sharing")
    } finally {
      setStopSharingSaving(false)
      setStopSharingConfirmOpen(false)
    }
  }, [getCrmLocatorHeaders, refreshLocatorStatus])

  const handleResumeSharingNow = React.useCallback(async () => {
    setResumeSharingSaving(true)
    try {
      const locationOk = await requestLocationForShiftStart()
      if (locationOk) toast.success("Location sharing turned back on")
    } finally {
      setResumeSharingSaving(false)
    }
  }, [requestLocationForShiftStart])

  React.useEffect(() => { refreshLocatorStatus() }, [refreshLocatorStatus])

  const {
    sharingState: locatorState, lastPingAt: locatorLastPingAt, error: locatorError, awaitingFirstFix: locatorAwaitingFirstFix,
  } = useLocationSharing({
    eligible: !!locatorStatus?.consentGranted,
    onBreak: isOnBreak,
    getAuthHeaders: getCrmLocatorHeaders,
  })

  const wasAwaitingLocatorFix = React.useRef(false)
  React.useEffect(() => {
    if (wasAwaitingLocatorFix.current && !locatorAwaitingFirstFix) {
      if (locatorState === "sharing") toast.success("Location sharing is now on")
      else if (locatorError) toast.error(locatorError)
    }
    wasAwaitingLocatorFix.current = locatorAwaitingFirstFix
  }, [locatorAwaitingFirstFix, locatorState, locatorError])

  const refreshShiftState = React.useCallback(async () => {
    if (authModeRef.current === 'main') {
      try {
        const res = await apiClient.get("/api/timeclock/me")
        const data = res.data?.data || res.data
        setTodayLogs(data.todayTimeLogs || [])
      } catch { }
      return
    }
    const t = localStorage.getItem("crm_token")
    if (!t) return
    try {
      const res = await apiClient.get("/api/crm/me", { headers: { Authorization: `Bearer ${t}` } })
      const data = res.data?.data || res.data
      setTodayLogs(data.todayTimeLogs || [])
    } catch { }
  }, [])

  React.useEffect(() => {
    const onVisibility = () => { if (!document.hidden) { refreshShiftState(); refreshLocatorStatus() } }
    document.addEventListener("visibilitychange", onVisibility)
    return () => document.removeEventListener("visibilitychange", onVisibility)
  }, [refreshShiftState, refreshLocatorStatus])

  const fetchActivityState = React.useCallback(async () => {
    let res
    if (authModeRef.current === 'main') {
      try { res = await apiClient.get("/api/timeclock/shift-state") } catch { return }
    } else {
      const t = localStorage.getItem("crm_token")
      if (!t) return
      try { res = await apiClient.get("/api/crm/timeproof/shift-state", { headers: { Authorization: `Bearer ${t}` } }) } catch { return }
    }
    try {
      const s = res.data?.data
      if (s) {
        setServerIsOnShift(!!s.isOnShift)
        setServerIsOnBreak(!!s.isOnBreak)
        setServerIsShiftFromToday(!!s.isShiftFromToday)
        setServerShiftStartedAt(s.shiftStartedAt ?? null)
        setTodayTotalActiveMs((s.todayTotalActiveSeconds ?? 0) * 1000)
        // Authoritative baseline for the displayed number — see the state
        // declaration above for why this exists. Always trust this fresh
        // value from the server; wallClockBaseAt is only non-null while
        // actively on shift and not on break, so the client-side tick (see
        // ActivityTimer) only runs when it should.
        setWallClockBaseMs((s.wallClockRenderedSeconds ?? 0) * 1000)
        setWallClockBaseAt(s.isOnShift && !s.isOnBreak ? Date.now() : null)
        const SHIFT_AUTO_RESUME_MS = 5 * 60 * 1000
        const shiftStartedMs = s.shiftStartedAt ? new Date(s.shiftStartedAt).getTime() : 0
        const shiftStartedRecently = shiftStartedMs > 0 && (Date.now() - shiftStartedMs) < SHIFT_AUTO_RESUME_MS
        // Reconcile isOnBreak/currentBreakStartAt from this SAME snapshot that
        // drives activityStartAt below. Previously isOnBreak was only ever set
        // by the optimistic click handlers and socket events, never by this
        // poll — so a poll landing between "user clicked to end break" and
        // "break-out TimeLog actually committed" could read a stale
        // s.isOnBreak=true, null out activityStartAt (since the updater below
        // keys off s.isOnBreak), while local isOnBreak stayed false from the
        // optimistic update. That combination (not on break, not tracking) is
        // the impossible "Paused / Resume Shift" stuck state users hit after
        // ending a break — coupling both fields to the same snapshot means
        // they can only ever be inconsistent for one poll cycle, and always
        // self-correct on the next one instead of getting stuck permanently.
        setIsOnBreak(!!s.isOnBreak)
        setCurrentBreakStartAt(s.isOnBreak && s.breakStartedAt ? new Date(s.breakStartedAt).getTime() : null)
        setActivityStartAt((prev) => {
          if (!s.isOnShift || s.isOnBreak) return null
          if (s.currentIntervalStartAt) return new Date(s.currentIntervalStartAt).getTime()
          if (prev !== null) return prev
          if (shiftStartedRecently) return Date.now()
          return null
        })
      }
    } catch { }
  }, [])

  React.useEffect(() => {
    if (!token) return
    fetchActivityState()
    refreshShiftState()
    const actId = setInterval(fetchActivityState, 10_000)
    const shiftId = setInterval(refreshShiftState, 5_000)
    return () => { clearInterval(actId); clearInterval(shiftId) }
  }, [token, fetchActivityState, refreshShiftState])

  React.useEffect(() => {
    if (!token) return
    const socketJwt = authModeRef.current === 'main'
      ? (typeof window !== 'undefined' ? (window as any).__AUTH_TOKEN__ : '') || ''
      : token
    const sock = initializeSocket(socketJwt)
    const syncTimeIn = () => {
      refreshShiftState()
      setActivityStartAt(Date.now())
      setTimeout(() => fetchActivityState(), 2500)
    }
    const syncTimeOut = () => { refreshShiftState(); fetchActivityState() }
    const syncBreakIn = (data?: { breakStartedAt?: string }) => {
      setActivityStartAt(null)
      setIsOnBreak(true)
      setCurrentBreakStartAt(data?.breakStartedAt ? new Date(data.breakStartedAt).getTime() : Date.now())
      refreshShiftState(); fetchActivityState()
    }
    const syncBreakOut = () => {
      setIsOnBreak(false)
      setCurrentBreakStartAt(null)
      setActivityStartAt(Date.now())
      refreshShiftState()
      setTimeout(() => fetchActivityState(), 2500)
    }
    const onEarlyEnd = (data: { fullName: string; reason: string }) => {
      if (user && ["admin", "manager"].includes(user.role)) {
        toast.warning("Early End Shift", { description: `${data.fullName}: "${data.reason}"`, duration: 10000 })
      }
    }
    sock.on("time-in", syncTimeIn)
    sock.on("time-out", syncTimeOut)
    sock.on("break-in", syncBreakIn)
    sock.on("break-out", syncBreakOut)
    sock.on("crm:early-end", onEarlyEnd)
    return () => {
      sock.off("time-in", syncTimeIn)
      sock.off("time-out", syncTimeOut)
      sock.off("break-in", syncBreakIn)
      sock.off("break-out", syncBreakOut)
      sock.off("crm:early-end", onEarlyEnd)
    }
  }, [token, refreshShiftState, fetchActivityState]) // eslint-disable-line react-hooks/exhaustive-deps

  React.useEffect(() => {
    const check = async () => {
      const crmT = localStorage.getItem("crm_token")
      const mainToken = typeof window !== 'undefined' ? (window as any).__AUTH_TOKEN__ : null

      if (mainToken) {
        try {
          const mainRes = await apiClient.get("/api/timeclock/me")
          const mainData = mainRes.data?.data || mainRes.data
          if (isMobileMonitoringDept(mainData?.department)) {
            authModeRef.current = 'main'
            setUser(mainData)
            setToken('__main__')
            setTodayLogs(mainData.todayTimeLogs || [])
            setIsLoading(false)
            return
          }
        } catch { }
      }

      if (crmT) {
        authModeRef.current = 'crm'
        try {
          const res = await apiClient.get("/api/crm/me", { headers: { Authorization: `Bearer ${crmT}` } })
          const data = res.data?.data || res.data
          setUser(data)
          setToken(crmT)
          setTodayLogs(data.todayTimeLogs || [])
        } catch {
          localStorage.removeItem("crm_token")
          localStorage.removeItem("crm_user")
          router.replace("/crm")
        } finally {
          setIsLoading(false)
        }
        return
      }

      if (mainToken) {
        authModeRef.current = 'main'
        try {
          const res = await apiClient.get("/api/timeclock/me")
          const data = res.data?.data || res.data
          setUser(data)
          setToken('__main__')
          setTodayLogs(data.todayTimeLogs || [])
        } catch {
          router.replace("/")
        } finally {
          setIsLoading(false)
        }
        return
      }

      router.replace("/crm")
      setIsLoading(false)
    }
    check()
  }, [router])

  React.useEffect(() => {
    if (!token) return
    setTpLoading(true)
    const endpoint = authModeRef.current === 'main' ? "/api/timeclock/my?range=365" : "/api/crm/timeproof/my?range=365"
    const options = authModeRef.current === 'main' ? {} : { headers: { Authorization: `Bearer ${localStorage.getItem("crm_token")}` } }
    apiClient
      .get(endpoint, options)
      .then((res) => setTpData(res.data?.data))
      .catch((e: any) => setTpError(e?.response?.data?.message || "Failed to load timeproof data."))
      .finally(() => setTpLoading(false))
  }, [token])

  const handleClock = async (type: "time-in" | "time-out", note?: string) => {
    // Skip the GPS-permission gate entirely for a department exempted via
    // "Require Location for TimeProof" (Settings → Departments) — the backend
    // no longer requires it for them either, so forcing this prompt here was
    // blocking exempted users on a location permission they were never
    // supposed to need in the first place.
    if (type === "time-in" && user?.locationRequiredForTimeproof !== false) {
      const locationOk = await requestLocationForShiftStart()
      if (!locationOk) return
    }
    setIsClocking(true)
    setClockMsg("")
    const isMain = authModeRef.current === 'main'
    const freshToken = isMain ? null : localStorage.getItem("crm_token")
    if (!isMain && !freshToken) { router.replace("/crm"); return }
    const clockEndpoint = isMain ? "/api/timeclock/clock" : "/api/crm/time-clock"
    const clockOptions = isMain
      ? { _skipAuthRefresh: true } as any
      : { headers: { Authorization: `Bearer ${freshToken}` }, _skipAuthRefresh: true } as any
    try {
      const res = await apiClient.post(clockEndpoint, { type, ...(note && { note }) }, clockOptions)
      const data = res.data?.data || res.data
      setTodayLogs(data.todayLogs || [])
      if (type === "time-out") {
        setIsOnBreak(false)
        setBreakAccumulatedMs(0)
        setResumeOriginalClockIn(null)
        setLocallyResumedShift(false)
        sessionStorage.removeItem("crm_resumed_shift")
      }
      setClockMsg(`${type === "time-in" ? "Clocked in" : "Clocked out"} at ${fmt(new Date())}`)
      setTimeout(() => fetchActivityState(), 2500)
    } catch (err: unknown) {
      const apiError = err as ApiError
      const msg = apiError.response?.data?.message || "Failed"
      const status = apiError.response?.status
      if (status === 401 && !isMain) {
        localStorage.removeItem("crm_token")
        localStorage.removeItem("crm_user")
        router.replace("/crm")
        return
      }
      if (type === "time-in" && /already clocked in/i.test(msg)) {
        setLocallyResumedShift(true)
        sessionStorage.setItem("crm_resumed_shift", "true")
        setClockMsg(`Resumed your open shift at ${fmt(new Date())}`)
        await refreshShiftState()
        setTimeout(() => fetchActivityState(), 2500)
      } else if (type === "time-out" && /must clock in before/i.test(msg)) {
        setClockMsg("")
        await refreshShiftState()
      } else {
        setClockMsg(msg)
        refreshShiftState()
      }
    } finally {
      setIsClocking(false)
    }
  }

  // Checks whether the tray app is reachable/online via the BACKEND's own
  // heartbeat record, not a direct browser fetch to 127.0.0.1 — modern Chrome
  // blocks that outright (Private Network Access), regardless of whether the
  // tray is genuinely running, so a direct loopback fetch always fails on a
  // real HTTPS deployment and falsely reports "not detected".
  const isTrayOnline = async (): Promise<boolean> => {
    const t = localStorage.getItem("crm_token")
    if (!t) return false
    try {
      const res = await apiClient.get("/api/crm/timeproof/my-agent", { headers: { Authorization: `Bearer ${t}` } })
      return !!res.data?.data?.isOnline
    } catch {
      return false
    }
  }

  // Re-fires the custom-protocol handshake (the one path that reaches the
  // tray even when the browser blocks the loopback auto-connect fetch — see
  // isTrayOnline's comment) and polls for it coming online, instead of a
  // single check after a fixed delay. A single 3s check was sometimes too
  // early: verifying the token, starting the tray's services, and its first
  // heartbeat reaching the backend is more than one network round trip, and
  // a plain re-check (no protocol re-trigger) never gives a tray whose
  // silent background auto-connect got blocked any other way to connect —
  // clicking it repeatedly just re-read the same stale "offline" status.
  const POLL_INTERVAL_MS = 1500
  const POLL_MAX_ATTEMPTS = 8 // ~12s total
  const attemptTrayReconnect = async (): Promise<boolean> => {
    try { window.location.href = `actionauto://auth?token=${encodeURIComponent(token)}` } catch { }
    for (let attempt = 0; attempt < POLL_MAX_ATTEMPTS; attempt++) {
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS))
      if (await isTrayOnline()) return true
    }
    return false
  }

  const checkTrayAndStartShift = React.useCallback(async () => {
    const isLotTech = isMobileMonitoringDept(user?.department)
    const isMain = authModeRef.current === 'main'
    const resumableEndpoint = isMain ? "/api/timeclock/resumable-shift" : "/api/crm/timeproof/resumable-shift"
    const getResumeHeaders = () => {
      const t = localStorage.getItem("crm_token")
      return isMain ? {} : (t ? { headers: { Authorization: `Bearer ${t}` } } : {})
    }
    if (isMobile || isLotTech || isMain) {
      try {
        if (token) {
          const resumeRes = await apiClient.get(resumableEndpoint, getResumeHeaders())
          const d = resumeRes.data?.data
          if (d?.resumable && d?.originalClockIn) {
            setResumeOriginalClockIn(d.originalClockIn)
            setResumeModal(true)
            return
          }
        }
      } catch { }
      handleClock("time-in")
      return
    }
    setTrayChecking(true)
    try {
      const online = await isTrayOnline()
      if (online) {
        setShowTrayModal(false)
        try {
          const resumeRes = await apiClient.get(resumableEndpoint, getResumeHeaders())
          const d = resumeRes.data?.data
          if (d?.resumable && d?.originalClockIn) {
            setResumeOriginalClockIn(d.originalClockIn)
            setResumeModal(true)
            return
          }
        } catch { }
        handleClock("time-in")
      } else {
        setShowTrayModal(true)
      }
    } catch {
      setShowTrayModal(true)
    } finally {
      setTrayChecking(false)
    }
  }, [isMobile, user?.department, token]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleEndShiftClick = React.useCallback(() => {
    const currentTotalMs = wallClockBaseMs + (wallClockBaseAt ? Date.now() - wallClockBaseAt : 0)
    if (currentTotalMs < EIGHT_HOURS_MS) setShowEarlyEndModal(true)
    else setShowConfirmEndModal(true)
  }, [wallClockBaseMs, wallClockBaseAt]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleEarlyEndSubmit = async () => {
    if (!earlyEndReason) return
    setEarlyEndSubmitting(true)
    try {
      const note = earlyEndDetails.trim() ? `${earlyEndReason} — ${earlyEndDetails.trim()}` : earlyEndReason
      await handleClock("time-out", note)
      setShowEarlyEndModal(false)
      setEarlyEndReason("")
      setEarlyEndDetails("")
    } finally {
      setEarlyEndSubmitting(false)
    }
  }

  const handleBreak = async () => {
    setClockMsg("")
    const isMain = authModeRef.current === 'main'
    const breakEndpoint = isMain ? "/api/timeclock/clock" : "/api/crm/time-clock"
    const freshToken = isMain ? null : localStorage.getItem("crm_token")
    const breakHeaders = isMain ? {} : { headers: { Authorization: `Bearer ${freshToken}` } }
    if (!isOnBreak) {
      // Not optimistic here (unlike break-out below) — the backend can reject
      // this once the cumulative 1-hour break cap for the shift is already
      // used up, and flipping the UI to "on break" first would show a break
      // timer running for a break that was never actually granted.
      try {
        const res = await apiClient.post(breakEndpoint, { type: "break-in" }, breakHeaders)
        const d = res.data?.data || res.data
        if (d?.todayLogs) setTodayLogs(d.todayLogs)
        setIsOnBreak(true)
        setCurrentBreakStartAt(Date.now())
        setActivityStartAt(null)
        refreshShiftState()
        setClockMsg(`Break started at ${fmt(new Date())}`)
      } catch (err: any) {
        const message = err?.response?.data?.message || ""
        if (message.includes("already used your 1-hour break")) {
          setShowBreakCapModal(true)
        }
        refreshShiftState()
      }
    } else {
      setIsOnBreak(false)
      setCurrentBreakStartAt(null)
      setActivityStartAt(Date.now())
      try {
        const res = await apiClient.post(breakEndpoint, { type: "break-out" }, breakHeaders)
        const d = res.data?.data || res.data
        if (d?.todayLogs) setTodayLogs(d.todayLogs)
      } catch { }
      refreshShiftState()
      setTimeout(() => fetchActivityState(), 2500)
      setClockMsg(`Break ended at ${fmt(new Date())}`)
    }
  }

  const sortedLogs = React.useMemo(
    () => [...(todayLogs || [])].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()),
    [todayLogs]
  )
  const timeIn = [...sortedLogs].reverse().find((l) => l.type === "time-in")
  const timeOut = timeIn
    ? [...sortedLogs].reverse().find(
      (l) => l.type === "time-out" && new Date(l.timestamp).getTime() >= new Date(timeIn.timestamp).getTime()
    )
    : undefined

  const hasClockedIn = !!timeIn || (serverIsOnShift && (serverIsShiftFromToday || locallyResumedShift || activityStartAt !== null))
  const hasClockedOut = !!timeOut
  const isActive = hasClockedIn && !hasClockedOut
  const isComplete = hasClockedOut

  // Consent is now granted up front by requestLocationForShiftStart before time-in ever
  // succeeds, so this effect only needs to handle the other end: revoke it on clock-out.
  // It deliberately does NOT re-grant consent just because a shift is active — doing so
  // used to silently undo an explicit "Stop Sharing" click the instant locatorStatus
  // refreshed, since isActive && !isOnBreak stayed true right through that action.
  React.useEffect(() => {
    if (!isActive) {
      if (locatorWasEligibleRef.current) {
        getCrmLocatorHeaders()
          .then((headers) => apiClient.setLocationConsent({ granted: false }, headers))
          .then(() => refreshLocatorStatus())
          .catch(() => null)
      }
      locatorWasEligibleRef.current = false
      return
    }
    locatorWasEligibleRef.current = true
  }, [isActive, getCrmLocatorHeaders, refreshLocatorStatus])

  React.useEffect(() => {
    const sessionStartMs = timeIn
      ? new Date(timeIn.timestamp).getTime()
      : serverShiftStartedAt ? new Date(serverShiftStartedAt).getTime() : null
    if (sessionStartMs === null) return
    const breakLogs = sortedLogs.filter(
      (l) => (l.type === "break-in" || l.type === "break-out") && new Date(l.timestamp).getTime() >= sessionStartMs
    )
    let accumulated = 0
    let currentBreakStart: number | null = null
    for (const log of breakLogs) {
      if (log.type === "break-in") {
        currentBreakStart = new Date(log.timestamp).getTime()
      } else if (log.type === "break-out" && currentBreakStart !== null) {
        accumulated += new Date(log.timestamp).getTime() - currentBreakStart
        currentBreakStart = null
      }
    }
    setBreakAccumulatedMs(accumulated)
    setIsOnBreak(currentBreakStart !== null)
    setCurrentBreakStartAt(currentBreakStart)
  }, [sortedLogs, serverShiftStartedAt]) // eslint-disable-line react-hooks/exhaustive-deps

  const previousSessionsMs = React.useMemo(() => {
    if (!timeIn) return 0
    const currentStart = new Date(timeIn.timestamp).getTime()
    let total = 0
    let sessionIn: number | null = null
    for (const log of sortedLogs) {
      const ts = new Date(log.timestamp).getTime()
      if (ts >= currentStart) break
      if (log.type === "time-in") sessionIn = ts
      else if (log.type === "time-out" && sessionIn !== null) { total += ts - sessionIn; sessionIn = null }
    }
    return total
  }, [sortedLogs, timeIn])

  const finalHours = React.useMemo(() => {
    if (!timeIn || !timeOut) return null
    const lastSessionMs = new Date(timeOut.timestamp).getTime() - new Date(timeIn.timestamp).getTime()
    const workedMs = previousSessionsMs + Math.max(0, lastSessionMs - breakAccumulatedMs)
    const h = Math.floor(workedMs / 3600000)
    const m = Math.floor((workedMs % 3600000) / 60000)
    return `${h}h ${m}m`
  }, [timeIn, timeOut, breakAccumulatedMs, previousSessionsMs])

  const isCurrentMonth = viewYear === now.getUTCFullYear() && viewMonth === now.getUTCMonth()
  const monthLabel = new Date(viewYear, viewMonth).toLocaleDateString("en-US", { month: "long", year: "numeric" })
  const calcMonthDate = new Date(Date.UTC(viewYear, viewMonth, 1))
  const calcMonthShort = calcMonthDate.toLocaleString("en-US", { month: "short", timeZone: "UTC" })
  const calcMonthLong = calcMonthDate.toLocaleString("en-US", { month: "long", timeZone: "UTC" })
  const nowMonthShort = now.toLocaleString("en-US", { month: "short", timeZone: "UTC" })
  const nowMonthLong = now.toLocaleString("en-US", { month: "long", timeZone: "UTC" })

  const monthSummary = React.useMemo(() => {
    if (!tpData) return { seconds: 0, days: 0 }
    const prefix = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-`
    let seconds = 0, days = 0
    for (const [ds, d] of Object.entries(tpData.calendar)) {
      if (ds.startsWith(prefix) && d.totalSeconds > 0) { seconds += d.totalSeconds; days++ }
    }
    return { seconds, days }
  }, [tpData, viewYear, viewMonth])

  const cutoffSummary = React.useMemo(() => {
    if (!tpData) return { p1Seconds: 0, p2Seconds: 0, lastDay: 31 }
    const y = now.getUTCFullYear()
    const mStr = String(now.getUTCMonth() + 1).padStart(2, "0")
    const lastDay = new Date(y, now.getUTCMonth() + 1, 0).getDate()
    let p1 = 0, p2 = 0
    for (let d = 1; d <= 15; d++) { const ds = `${y}-${mStr}-${String(d).padStart(2, "0")}`; p1 += tpData.calendar[ds]?.totalSeconds ?? 0 }
    for (let d = 16; d <= lastDay; d++) { const ds = `${y}-${mStr}-${String(d).padStart(2, "0")}`; p2 += tpData.calendar[ds]?.totalSeconds ?? 0 }
    return { p1Seconds: p1, p2Seconds: p2, lastDay }
  }, [tpData])

  const calcCutoffSummary = React.useMemo(() => {
    if (!tpData) return { p1Seconds: 0, p2Seconds: 0, lastDay: 31 }
    const mStr = String(viewMonth + 1).padStart(2, "0")
    const lastDay = new Date(viewYear, viewMonth + 1, 0).getDate()
    let p1 = 0, p2 = 0
    for (let d = 1; d <= 15; d++) { const ds = `${viewYear}-${mStr}-${String(d).padStart(2, "0")}`; p1 += tpData.calendar[ds]?.totalSeconds ?? 0 }
    for (let d = 16; d <= lastDay; d++) { const ds = `${viewYear}-${mStr}-${String(d).padStart(2, "0")}`; p2 += tpData.calendar[ds]?.totalSeconds ?? 0 }
    return { p1Seconds: p1, p2Seconds: p2, lastDay }
  }, [tpData, viewYear, viewMonth])

  const currentCutoff = now.getUTCDate() <= 15 ? 1 : 2
  const currentCutoffSeconds = currentCutoff === 1 ? cutoffSummary.p1Seconds : cutoffSummary.p2Seconds
  const currentCutoffLabel = currentCutoff === 1 ? `${nowMonthShort} 1–15` : `${nowMonthShort} 16–${cutoffSummary.lastDay}`
  const currentPayoutDue = currentCutoff === 1
    ? `Due ${nowMonthShort} 20`
    : `Due ${new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 5)).toLocaleString("en-US", { month: "short", timeZone: "UTC" })} 5`

  const calcSeconds = payoutPeriod === 1 ? calcCutoffSummary.p1Seconds : calcCutoffSummary.p2Seconds
  const calcWholeHours = Math.floor(calcSeconds / 3600)
  const calcRemainderMins = Math.floor((calcSeconds % 3600) / 60)
  const rateNum = parseFloat(hourlyRate) || 0
  const payoutUSD = calcWholeHours * rateNum
  const payoutPHP = phpRate !== null ? payoutUSD * phpRate : null
  const calcPeriodLabel = payoutPeriod === 1 ? `${calcMonthShort} 1–15` : `${calcMonthShort} 16–${calcCutoffSummary.lastDay}`
  const calcPayoutDate = payoutPeriod === 1
    ? `${calcMonthLong} 20`
    : new Date(Date.UTC(viewYear, viewMonth + 1, 5)).toLocaleDateString("en-US", { month: "long", day: "numeric", timeZone: "UTC" })

  const payDayDate = React.useMemo(() => {
    if (payoutPeriod === 1) return new Date(Date.UTC(viewYear, viewMonth, 20))
    return new Date(Date.UTC(viewYear, viewMonth + 1, 5))
  }, [payoutPeriod, viewYear, viewMonth])

  const isPayDayReached = new Date() >= payDayDate
  const payDayLabel = payDayDate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" })

  const payoutWindow = getPayoutWindowState(now.getUTCDate())
  const isAdminOrManager = tpData?.user?.role === "admin" || tpData?.user?.role === "manager"
  const showPayoutCalculator = !isCurrentMonth || isAdminOrManager || payoutWindow.available

  const prevMonth = () => { if (viewMonth === 0) { setViewYear((y) => y - 1); setViewMonth(11) } else setViewMonth((m) => m - 1) }
  const nextMonth = () => { if (viewMonth === 11) { setViewYear((y) => y + 1); setViewMonth(0) } else setViewMonth((m) => m + 1) }
  const goToday = () => { setViewYear(now.getUTCFullYear()); setViewMonth(now.getUTCMonth()) }

  const fetchPhpRate = React.useCallback(async () => {
    setFetchingPhp(true)
    try {
      const res = await fetch("https://open.er-api.com/v6/latest/USD")
      const json = await res.json()
      setPhpRate(json.rates?.PHP ?? null)
      setShowPhp(true)
    } catch { setPhpRate(null) } finally { setFetchingPhp(false) }
  }, [])

  const togglePhp = () => {
    if (!showPhp && phpRate === null) fetchPhpRate()
    else setShowPhp((v) => !v)
  }

  const copyProof = () => {
    if (!tpData) return
    const { summary, streak, user: u } = tpData
    navigator.clipboard.writeText([
      `📋 TIMEPROOF REPORT`,
      `Employee : ${u.fullName.toUpperCase()}`,
      `ID       : ${u.username}`,
      `Period   : ${monthLabel}`,
      `Generated: ${new Date().toLocaleString()}`,
      `─────────────────────────────────`,
      `Today        : ${summary.today.hours}h ${summary.today.minutes}m`,
      `This Week    : ${summary.thisWeek.hours}h ${summary.thisWeek.minutes}m`,
      `${monthLabel.split(" ")[0]} Total : ${monthSummary.days} active days · ${fmtHHMM(monthSummary.seconds)}`,
      `Streak       : ${streak} consecutive day${streak !== 1 ? "s" : ""}`,
      `─────────────────────────────────`,
      `✓ Verified via Action Auto CRM`,
    ].join("\n"))
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  const exportCSV = async () => {
    if (authModeRef.current === 'main') return
    const t = localStorage.getItem("crm_token")
    try {
      const res = await apiClient.get("/api/crm/timeproof/export?range=365", {
        headers: { Authorization: `Bearer ${t}` },
        responseType: "blob",
      })
      const blob = new Blob([res.data], { type: "text/csv" })
      const a = document.createElement("a")
      a.href = URL.createObjectURL(blob)
      a.download = `timeproof-${viewYear}-${String(viewMonth + 1).padStart(2, "0")}.csv`
      a.click()
    } catch { }
  }

  const printPayslip = React.useCallback(() => {
    if (!tpData) return
    const u = tpData.user
    const periodFull = payoutPeriod === 1 ? `${nowMonthLong} 1–15, ${now.getFullYear()}` : `${nowMonthLong} 16–${cutoffSummary.lastDay}, ${now.getFullYear()}`
    const html = generatePayslipHtml({
      fullName: u.fullName,
      username: u.username,
      role: u.role,
      periodFull,
      payDayLabel,
      renderedFull: fmtHHMM(calcSeconds),
      calcWholeHours,
      rateNum,
      payoutUSD,
      phpPayout: showPhp && payoutPHP !== null && phpRate !== null ? { amountPHP: payoutPHP, rate: phpRate } : null,
    })
    openHtmlForPrint(html)
  }, [tpData, payoutPeriod, nowMonthLong, cutoffSummary.lastDay, calcSeconds, calcWholeHours, rateNum, payoutUSD, showPhp, payoutPHP, phpRate, payDayLabel])

  const timecardPreviewHtml = React.useMemo(() => {
    if (!tpData || !showTimecardModal) return ""
    const rows = buildTimecardRows(tpData.calendar, timecardStart, timecardEnd)
    return generateTimecardHtml({
      fullName: tpData.user.fullName,
      rateNum,
      startDateStr: timecardStart,
      endDateStr: timecardEnd,
      rows,
      autoPrint: false,
    })
  }, [tpData, showTimecardModal, timecardStart, timecardEnd, rateNum])

  const timecardPreviewRef = React.useRef<HTMLIFrameElement>(null)
  const printTimecard = React.useCallback(() => {
    timecardPreviewRef.current?.contentWindow?.print()
  }, [])

  React.useEffect(() => {
    if (!showIdleLogModal || idleLogStart > idleLogEnd) return
    let cancelled = false
    setIdleLogLoading(true)
    const endpoint = authModeRef.current === 'main' ? "/api/timeclock/idle-log" : "/api/crm/timeproof/idle-log"
    const options = authModeRef.current === 'main' ? {} : { headers: { Authorization: `Bearer ${localStorage.getItem("crm_token")}` } }
    apiClient
      .get(`${endpoint}?startDate=${idleLogStart}&endDate=${idleLogEnd}`, options)
      .then((res) => { if (!cancelled) setIdlePeriods(res.data?.data?.idleLog || []) })
      .catch(() => { if (!cancelled) setIdlePeriods([]) })
      .finally(() => { if (!cancelled) setIdleLogLoading(false) })
    return () => { cancelled = true }
  }, [showIdleLogModal, idleLogStart, idleLogEnd])

  const idleLogPreviewHtml = React.useMemo(() => {
    if (!tpData || !showIdleLogModal) return ""
    return generateIdleLogHtml({
      fullName: tpData.user.fullName,
      startDateStr: idleLogStart,
      endDateStr: idleLogEnd,
      periods: idlePeriods,
      autoPrint: false,
    })
  }, [tpData, showIdleLogModal, idleLogStart, idleLogEnd, idlePeriods])

  const idleLogPreviewRef = React.useRef<HTMLIFrameElement>(null)
  const printIdleLog = React.useCallback(() => {
    idleLogPreviewRef.current?.contentWindow?.print()
  }, [])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="h-14 w-14 rounded-2xl bg-emerald-600/10 flex items-center justify-center">
              <Clock className="h-6 w-6 text-emerald-600" />
            </div>
            <div className="absolute inset-0 rounded-2xl ring-2 ring-emerald-500/20 ring-offset-2 ring-offset-background animate-ping" />
          </div>
          <p className="text-[11px] text-muted-foreground/40 tracking-[0.2em] uppercase font-semibold">Loading…</p>
        </div>
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-background">

      <div className="sticky top-0 z-20 border-b border-border/40 bg-background/85 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-emerald-600/10 flex items-center justify-center">
              <Clock className="h-3.5 w-3.5 text-emerald-600" />
            </div>
            <span className="text-sm font-black tracking-tight">Timeproof Clock</span>
            {(tpData?.isLive || isActive) && (
              <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-500/20">
                <Radio className="h-2.5 w-2.5 animate-pulse" />
                Live
              </span>
            )}
          </div>
          {tpData && (
            <p className="hidden sm:block text-[11px] text-muted-foreground/40 font-semibold ml-1 truncate">
              — {tpData.user.fullName.toUpperCase()}
            </p>
          )}
          <div className="ml-auto flex items-center gap-2">
            {(user.role === "admin" || user.role === "manager") && (
              <button
                onClick={() => router.push("/crm/timeproof/users")}
                className="h-9 px-3 rounded-xl border border-border/40 flex items-center gap-1.5 hover:bg-muted/30 transition-colors text-muted-foreground text-[11px] font-bold"
              >
                <Users className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">View Users</span>
              </button>
            )}
            <button onClick={exportCSV} title="Export CSV" className="h-9 w-9 rounded-xl border border-border/40 flex items-center justify-center hover:bg-muted/30 transition-colors text-muted-foreground">
              <Download className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={copyProof}
              className={`h-9 px-3 rounded-xl border flex items-center gap-1.5 text-[11px] font-bold transition-all ${copied ? "border-emerald-500/40 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700" : "border-border/40 hover:bg-muted/30 text-muted-foreground"}`}
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              <span className="hidden sm:inline">{copied ? "Copied!" : "Copy Proof"}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="w-full px-4 sm:px-6 py-5">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(320px,2fr)_3fr] gap-4 items-start">

          <div className="space-y-4">

            <div className="overflow-hidden rounded-2xl border border-zinc-200/80 bg-white/70 shadow-sm backdrop-blur-xl dark:border-white/6 dark:bg-zinc-900/40">
              <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4 dark:border-zinc-800/60">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-zinc-400 dark:text-zinc-600" />
                  <span className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-400 dark:text-zinc-500">Time Clock</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={cn("h-2 w-2 rounded-full transition-colors duration-500",
                    isOnBreak ? "animate-pulse bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.6)] motion-reduce:animate-none"
                      : isActive ? "animate-pulse bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)] motion-reduce:animate-none"
                        : isComplete ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                          : "bg-zinc-300 dark:bg-zinc-700")} />
                  <span className={cn("text-[10px] font-bold uppercase tracking-wider transition-colors duration-500",
                    isOnBreak ? "text-amber-500" : isActive ? "text-emerald-500 dark:text-emerald-400"
                      : isComplete ? "text-emerald-500" : "text-zinc-400 dark:text-zinc-600")}>
                    {isOnBreak ? "On Break" : isActive ? "On Shift" : isComplete ? "Completed" : "Off Clock"}
                  </span>
                </div>
              </div>

              {(isActive || isComplete) && (
                <div className="flex flex-1 items-center justify-center px-4 py-8 sm:px-8">
                  {isActive && (
                    <ActivityTimer
                      wallClockBaseMs={wallClockBaseMs}
                      wallClockBaseAt={wallClockBaseAt}
                      isOnShift={isActive}
                      isOnBreak={isOnBreak}
                      breakTotalMs={breakAccumulatedMs}
                      currentBreakStartAt={currentBreakStartAt}
                    />
                  )}
                  {isComplete && (
                    <ShiftGauge progress={1} accent="emerald" glow>
                      <div className="flex flex-col items-center gap-1.5 text-center">
                        <CheckCircle2 className="h-8 w-8 text-emerald-500 drop-shadow-[0_0_12px_rgba(16,185,129,0.5)]" />
                        <p className="font-mono text-2xl font-black tracking-tighter text-zinc-900 dark:text-white sm:text-3xl">{finalHours}</p>
                        <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-600">Shift Complete</p>
                      </div>
                    </ShiftGauge>
                  )}
                </div>
              )}

              <div className="border-t border-zinc-100 bg-zinc-50/50 px-5 py-4 dark:border-zinc-800/60 dark:bg-zinc-900/20">
                <div className="mb-4 grid grid-cols-2 gap-3">
                  {[
                    {
                      label: "Time In",
                      value: resumeOriginalClockIn ? fmt(new Date(resumeOriginalClockIn))
                        : timeIn ? fmt(new Date(timeIn.timestamp))
                          : serverShiftStartedAt ? fmt(new Date(serverShiftStartedAt)) : "——",
                    },
                    { label: "Time Out", value: timeOut ? fmt(new Date(timeOut.timestamp)) : "——" },
                  ].map((item) => (
                    <div key={item.label} className="rounded-xl border border-zinc-200/70 bg-white/60 px-3 py-2.5 shadow-sm dark:border-zinc-800/40 dark:bg-zinc-900/50">
                      <p className="mb-1 text-[9px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-600">{item.label}</p>
                      <p className="font-mono text-xl font-black leading-none tabular-nums text-zinc-900 dark:text-white">{item.value}</p>
                    </div>
                  ))}
                </div>

                {!isActive && (
                  (isMobile && !isMobileMonitoringDept(user?.department) && authModeRef.current !== 'main') ? (
                    <div className="h-12 w-full rounded-xl border border-zinc-700/40 bg-zinc-800/30 flex items-center justify-center gap-2 px-4">
                      <MonitorDot className="h-4 w-4 text-zinc-500 shrink-0" />
                      <p className="text-[11px] text-zinc-500 font-bold text-center">Shift tracking requires the desktop app</p>
                    </div>
                  ) : (
                    <Button
                      onClick={checkTrayAndStartShift}
                      disabled={isClocking || trayChecking}
                      className="h-12 w-full gap-2 rounded-xl border-0 bg-linear-to-r from-emerald-600 to-emerald-500 text-sm font-black text-white shadow-lg shadow-emerald-500/20 transition-all duration-200 hover:-translate-y-0.5 hover:from-emerald-500 hover:to-emerald-400 active:translate-y-0 motion-reduce:transform-none"
                    >
                      {isClocking || trayChecking ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Start Shift <ArrowRight className="ml-auto h-4 w-4 opacity-60" /></>}
                    </Button>
                  )
                )}
                {isActive && (() => {
                  const isPausedOnShift = !isOnBreak && activityStartAt === null
                  const showMobileEndShiftHint = isMobile && !isMobileMonitoringDept(user?.department) && authModeRef.current !== 'main'
                  return (
                    <div className="grid grid-cols-2 gap-2">
                      {showMobileEndShiftHint && (
                        <p className="col-span-2 -mt-1 mb-1 text-center text-[10px] text-zinc-500">
                          Forgot to clock out on your computer? You can safely end this shift from your phone — it will stop the desktop app too.
                        </p>
                      )}
                      {isPausedOnShift ? (
                        <Button onClick={() => { setActivityStartAt(Date.now()); handleClock("time-in") }} disabled={isClocking}
                          className="h-11 gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-sm font-bold text-emerald-600 hover:bg-emerald-500/20 dark:text-emerald-400">
                          <Play className="h-4 w-4" /> Resume Shift
                        </Button>
                      ) : (
                        <Button onClick={handleBreak}
                          className={cn("h-11 gap-2 rounded-xl border text-sm font-bold transition-all duration-200",
                            isOnBreak ? "border-amber-500/30 bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 dark:text-amber-400"
                              : "border-zinc-200 bg-zinc-50 text-zinc-600 hover:border-amber-500/30 hover:bg-zinc-100 hover:text-amber-600 dark:border-zinc-700/60 dark:bg-zinc-800/40 dark:text-zinc-300")}>
                          {isOnBreak ? <><Play className="h-4 w-4" /> Resume</> : <><Coffee className="h-4 w-4" /> Break</>}
                        </Button>
                      )}
                      <Button onClick={handleEndShiftClick} disabled={isClocking || serverIsOnBreak}
                        className="h-11 gap-2 rounded-xl border border-red-200 bg-red-50 text-sm font-bold text-red-500 hover:border-red-300 hover:bg-red-100 disabled:opacity-30 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
                        {isClocking ? <Loader2 className="h-4 w-4 animate-spin" /> : <><LogOut className="h-4 w-4" /> End Shift</>}
                      </Button>
                    </div>
                  )
                })()}
                {clockMsg && <p className="mt-2 text-center font-mono text-[11px] text-emerald-600 dark:text-emerald-400/70">{clockMsg}</p>}
              </div>
            </div>

            {user?.locationRequiredForTimeproof !== false && (() => {
              const meta = locatorStateMeta(locatorState, locatorError, locatorAwaitingFirstFix)
              return (
                <div className="w-full rounded-2xl border border-border/40 bg-card">
                  <div className="flex items-center justify-between gap-3 px-5 py-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="h-8 w-8 rounded-xl bg-emerald-600/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                        {locatorAwaitingFirstFix ? <Loader2 className="h-4 w-4 text-emerald-500 animate-spin" />
                          : locatorState === "sharing" ? <Radio className="h-4 w-4 text-emerald-500" /> : <MapPin className="h-4 w-4 text-emerald-500" />}
                      </div>
                      <div className="min-w-0 text-left">
                        <p className="text-[12px] font-black tracking-tight text-foreground">Share Location</p>
                        <p className="mt-0.5 line-clamp-2 text-[10px] text-muted-foreground/50">{meta.detail}</p>
                        {locatorLastPingAt && (
                          <p className="mt-1 font-mono text-[9px] text-muted-foreground/40">
                            Last ping {fmt(new Date(locatorLastPingAt))}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-[9px] font-black uppercase tracking-widest", meta.text, meta.pill)}>
                        <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot, (locatorState === "sharing" || locatorAwaitingFirstFix) && "animate-pulse motion-reduce:animate-none")} />
                        {meta.label}
                      </span>
                      <Button
                        size="sm" variant="outline"
                        onClick={() => router.push("/team-pulse?tab=activity")}
                        className="h-7 gap-1.5 rounded-full border-border/50 px-2.5 text-[10px] font-bold"
                      >
                        <Eye className="h-3 w-3" /> View
                      </Button>
                    </div>
                  </div>

                  {isActive && !isOnBreak && (
                    <div className="flex items-center justify-between gap-3 border-t border-border/30 px-5 py-3">
                      {locatorStatus?.consentGranted ? (
                        isMandatoryLocationDept(user?.department) ? (
                          <>
                            <div className="min-w-0">
                              <p className="text-[11px] font-bold text-foreground">Sharing during your active shift</p>
                              <p className="mt-0.5 text-[9px] text-muted-foreground/50">Lot Tech accounts can&apos;t turn off location while clocked in. End your shift to stop sharing.</p>
                            </div>
                            <span className="inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full border border-border/40 bg-muted/20 px-2.5 text-[10px] font-bold text-muted-foreground/60">
                              <Lock className="h-3 w-3" /> Locked
                            </span>
                          </>
                        ) : (
                          <>
                            <div className="min-w-0">
                              <p className="text-[11px] font-bold text-foreground">Sharing during your active shift</p>
                              <p className="mt-0.5 text-[9px] text-muted-foreground/50">Required to clock in. You can pause it now — admins will be notified — and turn it back on any time.</p>
                            </div>
                            <Button
                              size="sm" variant="outline" onClick={() => setStopSharingConfirmOpen(true)}
                              className="h-7 gap-1.5 rounded-full border-red-500/30 bg-red-500/5 px-2.5 text-[10px] font-bold text-red-500 hover:bg-red-500/10 shrink-0"
                            >
                              <Power className="h-3 w-3" /> Stop Sharing
                            </Button>
                          </>
                        )
                      ) : (
                        <>
                          <div className="min-w-0">
                            <p className="text-[11px] font-bold text-red-500">Location sharing is off</p>
                            <p className="mt-0.5 text-[9px] text-muted-foreground/50">Admins have been notified. Turn it back on any time.</p>
                          </div>
                          <Button
                            size="sm" onClick={handleResumeSharingNow} disabled={resumeSharingSaving}
                            className="h-7 gap-1.5 rounded-full bg-emerald-600 hover:bg-emerald-500 px-2.5 text-[10px] font-bold text-white shrink-0"
                          >
                            {resumeSharingSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <><Play className="h-3 w-3" /> Turn Back On</>}
                          </Button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )
            })()}

            {/* Suprah Pulse360 — work health for the current shift. Takes no
                props: it reads the same module-level store as the global popup,
                so this number can never disagree with the header bell. */}
            <PulseHealthCard />

            {!isMobile && (
              <div className="rounded-2xl border border-border/40 bg-card p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-black tracking-tight">Desktop Tray App</p>
                    <p className="text-[10px] text-muted-foreground/40 mt-0.5">Required for shift tracking, screenshots &amp; activity monitoring</p>
                  </div>
                  <MonitorDot className="h-4 w-4 text-muted-foreground/20" />
                </div>

                <div className="rounded-xl bg-muted/10 border border-border/20 px-4 py-3 space-y-2">
                  {[
                    "Download and install the tray app",
                    "Launch it — it appears in your system tray",
                    "Return here and click Start Shift",
                  ].map((step, i) => (
                    <div key={i} className="flex items-start gap-2.5">
                      <span className="h-4 w-4 rounded-full bg-emerald-600/20 border border-emerald-500/30 text-[9px] font-black text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                      <p className="text-[11px] text-muted-foreground/60 leading-relaxed">{step}</p>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-border/30 p-3 space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                        <MonitorDot className="h-3.5 w-3.5 text-blue-400" />
                      </div>
                      <div>
                        <p className="text-[11px] font-bold">Windows</p>
                        <p className="text-[9px] text-muted-foreground/40">x64 · NSIS installer</p>
                      </div>
                    </div>
                    <a
                      href={process.env.NEXT_PUBLIC_TRAY_DOWNLOAD_URL ?? "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex w-full items-center justify-center gap-1.5 h-8 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold transition-colors"
                    >
                      <Download className="h-3 w-3" /> Download (.exe)
                    </a>
                  </div>

                  <div className="rounded-xl border border-border/30 p-3 space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-lg bg-zinc-500/10 border border-zinc-500/20 flex items-center justify-center">
                        <MonitorDot className="h-3.5 w-3.5 text-zinc-400" />
                      </div>
                      <div>
                        <p className="text-[11px] font-bold">macOS</p>
                        <p className="text-[9px] text-muted-foreground/40">Intel &amp; Apple Silicon</p>
                      </div>
                    </div>
                    <a
                      href={process.env.NEXT_PUBLIC_TRAY_DOWNLOAD_URL_MAC ?? "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex w-full items-center justify-center gap-1.5 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 dark:bg-zinc-700 dark:hover:bg-zinc-600 text-white text-[10px] font-bold transition-colors"
                    >
                      <Download className="h-3 w-3" /> Download (.dmg)
                    </a>
                  </div>
                </div>

                <a
                  href="/guide"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 h-10 rounded-lg border border-blue-500/20 bg-blue-500/5 hover:bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[11px] font-bold transition-colors"
                >
                  <BookOpen className="h-3.5 w-3.5" />
                  View Instructions — How to Download &amp; Use
                </a>
              </div>
            )}

          </div>
          <div className="space-y-4">

            {tpError && (
              <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 px-4 py-3 text-xs text-rose-600">{tpError}</div>
            )}

            {tpData && (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <StatCard label="Today" value={fmtHuman(tpData.summary.today.totalSeconds)}
                    sub={tpData.isLive ? "🟢 Live session" : tpData.summary.today.totalSeconds > 0 ? "Completed" : "Not clocked in"}
                    icon={Timer} accent={tpData.summary.today.totalSeconds > 0} />
                  <StatCard label="Cut-off" value={fmtHHMM(currentCutoffSeconds)}
                    sub={`${currentCutoffLabel} · ${currentPayoutDue}`} icon={Scissors} accent={currentCutoffSeconds > 0} />
                  <StatCard label={monthLabel.split(" ")[0]} value={fmtHHMM(monthSummary.seconds)}
                    sub={`${monthSummary.days} day${monthSummary.days !== 1 ? "s" : ""} active`} icon={Calendar} />
                  <StatCard label="Streak" value={`${tpData.streak}d`} sub={`Best: ${tpData.longestStreak} days`} icon={Flame} amber />
                </div>

                <div className="rounded-2xl border border-border/40 bg-card overflow-hidden shadow-sm">
                  <div className="flex items-center justify-between px-5 py-4 border-b border-border/30">
                    <h2 className="text-base font-black tracking-tight">{monthLabel}</h2>
                    <div className="flex items-center gap-1.5">
                      <button onClick={prevMonth} className="h-9 w-9 rounded-lg border border-border/40 flex items-center justify-center hover:bg-muted/50 transition-colors text-muted-foreground">
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <button onClick={nextMonth} className="h-9 w-9 rounded-lg border border-border/40 flex items-center justify-center hover:bg-muted/50 transition-colors text-muted-foreground">
                        <ChevronRight className="h-4 w-4" />
                      </button>
                      <button onClick={goToday} disabled={isCurrentMonth} className="h-9 px-3 rounded-lg border border-border/40 text-[11px] font-semibold hover:bg-muted/50 transition-colors disabled:opacity-40 disabled:cursor-default text-muted-foreground">
                        Today
                      </button>
                      <button onClick={() => setShowIdleLogModal(true)} title="Export Idle Log"
                        className="h-9 px-3 rounded-lg border border-border/40 text-[11px] font-semibold hover:bg-muted/50 transition-colors text-muted-foreground flex items-center gap-1.5">
                        <Download className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Idle Log</span>
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 px-5 py-2.5 border-b border-border/20 bg-muted/10">
                    <span className="text-[10px] text-muted-foreground/50">Total: <strong className="text-foreground/70 font-mono">{fmtHHMM(monthSummary.seconds)}</strong></span>
                    <span className="text-[10px] text-muted-foreground/50">Active days: <strong className="text-foreground/70">{monthSummary.days}</strong></span>
                    <div className="ml-auto hidden sm:flex items-center gap-3 flex-wrap">
                      {[{ label: "< 2h", cls: "bg-rose-500" }, { label: "2–4h", cls: "bg-sky-700" }, { label: "4–6h", cls: "bg-sky-600" }, { label: "6–9h", cls: "bg-emerald-600" }, { label: "9h+", cls: "bg-emerald-500" }].map((c) => (
                        <span key={c.label} className="flex items-center gap-1">
                          <span className={`h-2.5 w-5 rounded-[3px] ${c.cls}`} />
                          <span className="text-[8px] text-muted-foreground/35">{c.label}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                  {isMobile ? (
                    <MobileCalendarList
                      year={viewYear} month={viewMonth} calendar={tpData.calendar}
                      onSelectDay={(ds) => router.push(`/crm/timeproof/${ds}?t=${tpData?.calendar[ds]?.totalSeconds ?? 0}`)}
                      isLive={tpData.isLive}
                    />
                  ) : (
                    <MonthCalendar
                      year={viewYear} month={viewMonth} calendar={tpData.calendar}
                      onSelectDay={(ds) => router.push(`/crm/timeproof/${ds}?t=${tpData?.calendar[ds]?.totalSeconds ?? 0}`)}
                      isLive={tpData.isLive}
                    />
                  )}
                </div>

                {!showPayoutCalculator ? (
                  <div className="rounded-2xl border border-border/40 bg-card p-5">
                    <div className="flex items-center justify-between mb-5">
                      <div>
                        <p className="text-xs font-black tracking-tight">Payout Calculator</p>
                        <p className="text-[10px] text-muted-foreground/40 mt-0.5">Estimate your earnings for a cut-off period</p>
                      </div>
                      <DollarSign className="h-4 w-4 text-muted-foreground/20" />
                    </div>
                    <div className="flex flex-col items-center gap-3 py-5">
                      <div className="h-14 w-14 rounded-2xl bg-muted/30 border border-border/30 flex items-center justify-center">
                        <Lock className="h-6 w-6 text-muted-foreground/40" />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-bold text-muted-foreground/60">Calculator Locked</p>
                        <p className="text-[11px] text-muted-foreground/40 mt-1">Available starting {payoutWindow.nextUnlockLabel}</p>
                        {payoutWindow.daysUntil > 0 && <p className="text-[10px] text-muted-foreground/30 mt-0.5">{payoutWindow.daysUntil} day{payoutWindow.daysUntil !== 1 ? "s" : ""} from now</p>}
                      </div>
                      <div className="w-full rounded-xl bg-muted/10 border border-border/20 px-4 py-3 mt-1 space-y-2">
                        <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground/30 text-center">Pay Schedule</p>
                        <div className="grid grid-cols-2 gap-3 text-center">
                          <div className="rounded-lg bg-muted/10 px-2 py-2">
                            <p className="text-[10px] font-bold text-muted-foreground/50">1st – 15th</p>
                            <p className="text-[9px] text-muted-foreground/30 mt-0.5">Payday: 21st</p>
                          </div>
                          <div className="rounded-lg bg-muted/10 px-2 py-2">
                            <p className="text-[10px] font-bold text-muted-foreground/50">16th – end</p>
                            <p className="text-[9px] text-muted-foreground/30 mt-0.5">Payday: 6th (next mo.)</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-border/40 bg-card p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-black tracking-tight">Payout Calculator</p>
                        <p className="text-[10px] text-muted-foreground/40 mt-0.5">Estimate your earnings for a cut-off period</p>
                      </div>
                      <DollarSign className="h-4 w-4 text-muted-foreground/20" />
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground/35">Period</p>
                      <div className="flex gap-2">
                        {([1, 2] as const).map((p) => {
                          const label = p === 1 ? `${calcMonthShort} 1–15` : `${calcMonthShort} 16–${calcCutoffSummary.lastDay}`
                          return (
                            <button key={p} onClick={() => setPayoutPeriod(p)}
                              className={`flex-1 h-9 rounded-xl border text-[11px] font-bold transition-all ${payoutPeriod === p ? "border-emerald-500/50 bg-emerald-600/10 text-emerald-700 dark:text-emerald-300" : "border-border/40 text-muted-foreground hover:bg-muted/30"}`}>
                              {label}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground/35">Your Hourly Rate</p>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-muted-foreground/50">$</span>
                        <input type="number" min="0" step="0.01" placeholder="0.00" value={hourlyRate} onChange={(e) => setHourlyRate(e.target.value)}
                          className="w-full h-9 pl-7 pr-12 rounded-xl border border-border/40 bg-muted/10 text-sm font-bold font-mono focus:outline-none focus:border-emerald-500/50 focus:bg-emerald-500/5 transition-all" />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground/35">/ hr</span>
                      </div>
                    </div>
                    <div className="pt-1 border-t border-border/20 space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <span className="text-[11px] text-muted-foreground/50">Hours rendered ({calcPeriodLabel})</span>
                          {calcRemainderMins > 0 && <p className="text-[9px] text-muted-foreground/35 mt-0.5">{calcRemainderMins}m not counted — whole hours only</p>}
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-[11px] font-bold font-mono text-foreground/80">{fmtHHMM(calcSeconds)}</span>
                          <p className="text-[9px] font-bold font-mono text-muted-foreground/40">{calcWholeHours}h billed</p>
                        </div>
                      </div>
                      <div className="rounded-xl bg-muted/15 border border-border/20 px-4 py-3 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground/40">Estimated Payout</p>
                          <div className="flex items-center gap-1">
                            <button onClick={togglePhp} disabled={fetchingPhp}
                              className={`h-9 px-2.5 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all border ${showPhp ? "border-sky-500/40 bg-sky-500/10 text-sky-600 dark:text-sky-400" : "border-border/30 text-muted-foreground/40 hover:border-border/60"}`}>
                              {fetchingPhp ? <RefreshCw className="h-2.5 w-2.5 animate-spin" /> : showPhp ? "PHP ✓" : "PHP"}
                            </button>
                            {showPhp && phpRate && (
                              <button onClick={fetchPhpRate} disabled={fetchingPhp} title="Refresh rate"
                                className="h-9 w-9 rounded-lg border border-border/30 flex items-center justify-center text-muted-foreground/40 hover:text-muted-foreground transition-colors">
                                <RefreshCw className={`h-2.5 w-2.5 ${fetchingPhp ? "animate-spin" : ""}`} />
                              </button>
                            )}
                          </div>
                        </div>
                        {rateNum > 0 ? (
                          <div className="space-y-1">
                            <p className="text-2xl font-black tracking-tight text-emerald-700 dark:text-emerald-300">
                              ${payoutUSD.toFixed(2)}<span className="text-xs font-bold text-muted-foreground/40 ml-1">USD</span>
                            </p>
                            {showPhp && payoutPHP !== null && (
                              <p className="text-base font-bold text-sky-700 dark:text-sky-400">
                                ₱{payoutPHP.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                <span className="text-[9px] font-semibold text-muted-foreground/35 ml-1.5">1 USD = ₱{phpRate?.toFixed(2)}</span>
                              </p>
                            )}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground/30 font-medium">Enter your hourly rate above</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50/30 dark:bg-amber-950/15 border border-amber-500/15">
                        <Scissors className="h-3 w-3 text-amber-500 shrink-0" />
                        <span className="text-[10px] text-muted-foreground/50 flex-1">{payoutPeriod === 1 ? "1st–15th" : `16th–${cutoffSummary.lastDay}th`} cut-off</span>
                        <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">Released {calcPayoutDate}</span>
                      </div>
                      {isPayDayReached ? (
                        <button onClick={printPayslip} disabled={rateNum <= 0}
                          className="w-full h-10 rounded-xl border border-emerald-500/40 bg-emerald-600/10 hover:bg-emerald-600/15 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
                          <Download className="h-3.5 w-3.5" /> Download Payslip (PDF)
                        </button>
                      ) : (
                        <div className="w-full h-10 rounded-xl border border-border/30 bg-muted/10 flex items-center justify-center gap-2 text-[11px] text-muted-foreground/40 cursor-not-allowed select-none">
                          <Lock className="h-3.5 w-3.5" /> Payslip available on {payDayLabel}
                        </div>
                      )}
                      <button onClick={() => setShowTimecardModal(true)}
                        className="w-full h-10 rounded-xl border border-border/30 bg-muted/10 hover:bg-muted/20 text-foreground/70 text-[11px] font-bold flex items-center justify-center gap-2 transition-all">
                        <Download className="h-3.5 w-3.5" /> Download Timecard (any date range)
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}

          </div>
        </div>

      </div>

      <CrmPushPrompt role={user.role} />

      {showEarlyEndModal && (
        <div className="fixed inset-0 z-200 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowEarlyEndModal(false)} />
          <div className="relative z-10 w-full max-w-sm rounded-2xl bg-zinc-900 border border-zinc-700/60 shadow-2xl overflow-y-auto max-h-[90vh] overscroll-contain" style={{ animation: "slideUp 0.25s ease-out" }}>
            <button onClick={() => setShowEarlyEndModal(false)} className="absolute top-3 right-3 h-9 w-9 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 flex items-center justify-center text-zinc-400 hover:text-zinc-200 transition-colors">
              <X className="h-3.5 w-3.5" />
            </button>
            <div className="bg-amber-500/10 border-b border-amber-500/20 px-5 py-3 flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0" />
              <div>
                <p className="text-xs font-black text-amber-300 uppercase tracking-wider">Minimum shift not yet completed</p>
                <p className="text-[11px] text-amber-400/60 mt-0.5">You need to render <span className="font-bold text-amber-400">8 hours</span> per shift.</p>
              </div>
            </div>
            <div className="px-5 py-4 space-y-4">
              <div className="rounded-xl bg-zinc-800/50 border border-zinc-700/30 px-4 py-3 flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Time Worked</span>
                <span className="font-mono text-sm font-black text-zinc-200">
                  {(() => { const ms = wallClockBaseMs + (wallClockBaseAt ? Date.now() - wallClockBaseAt : 0); const h = Math.floor(ms / 3600000); const m = Math.floor((ms % 3600000) / 60000); return `${h}h ${m}m` })()}
                </span>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Reason for early end <span className="text-red-400">*</span></label>
                <select value={earlyEndReason} onChange={(e) => setEarlyEndReason(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700/60 rounded-xl px-3 py-2.5 text-sm text-zinc-200 outline-none focus:border-amber-500/50 transition-colors">
                  <option value="">Select a reason…</option>
                  <option value="Emergency">Emergency</option>
                  <option value="Medical / Illness">Medical / Illness</option>
                  <option value="Family Emergency">Family Emergency</option>
                  <option value="Personal Matters">Personal Matters</option>
                  <option value="Work Completed Early">Work Completed Early</option>
                  <option value="Technical Issues">Technical Issues</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Additional details (optional)</label>
                <textarea value={earlyEndDetails} onChange={(e) => setEarlyEndDetails(e.target.value)} placeholder="Add more context here…" rows={3}
                  className="w-full bg-zinc-800 border border-zinc-700/60 rounded-xl px-3 py-2.5 text-sm text-zinc-200 outline-none focus:border-amber-500/50 transition-colors resize-none" />
              </div>
              <div className="space-y-2 pt-1">
                <button onClick={handleEarlyEndSubmit} disabled={!earlyEndReason || earlyEndSubmitting}
                  className="flex w-full items-center justify-center gap-2 h-11 rounded-xl bg-red-500/90 hover:bg-red-500 text-white text-sm font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                  {earlyEndSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <><LogOut className="h-4 w-4" /> Submit &amp; End Shift</>}
                </button>
                <button onClick={() => setShowEarlyEndModal(false)}
                  className="flex w-full items-center justify-center gap-2 h-10 rounded-xl border border-zinc-700/60 bg-zinc-800/60 hover:bg-zinc-700/60 text-zinc-300 text-xs font-bold transition-colors">
                  <Play className="h-3.5 w-3.5" /> Resume Shift
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showConfirmEndModal && (
        <div className="fixed inset-0 z-200 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowConfirmEndModal(false)} />
          <div className="relative z-10 w-full max-w-sm rounded-2xl bg-zinc-900 border border-zinc-700/60 shadow-2xl overflow-hidden" style={{ animation: "slideUp 0.25s ease-out" }}>
            <button onClick={() => setShowConfirmEndModal(false)} className="absolute top-3 right-3 h-9 w-9 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 flex items-center justify-center text-zinc-400 hover:text-zinc-200 transition-colors">
              <X className="h-3.5 w-3.5" />
            </button>
            <div className="px-6 pt-6 pb-5 space-y-4">
              <div className="flex flex-col items-center gap-3 text-center">
                <div className="h-14 w-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                  <ShieldAlert className="h-7 w-7 text-red-400" />
                </div>
                <div>
                  <p className="text-base font-black text-white">End your shift?</p>
                  <p className="text-xs text-zinc-400 mt-1 leading-relaxed">You have worked{" "}
                    <span className="text-white font-semibold">
                      {(() => { const ms = wallClockBaseMs + (wallClockBaseAt ? Date.now() - wallClockBaseAt : 0); const h = Math.floor(ms / 3600000); const m = Math.floor((ms % 3600000) / 60000); return `${h}h ${m}m` })()}
                    </span>{" "}today. Are you sure you want to clock out?
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <button onClick={() => { setShowConfirmEndModal(false); handleClock("time-out") }} disabled={isClocking}
                  className="flex w-full items-center justify-center gap-2 h-11 rounded-xl bg-red-500/90 hover:bg-red-500 text-white text-sm font-bold transition-colors disabled:opacity-40">
                  {isClocking ? <Loader2 className="h-4 w-4 animate-spin" /> : <><LogOut className="h-4 w-4" /> Yes, End Shift</>}
                </button>
                <button onClick={() => setShowConfirmEndModal(false)}
                  className="flex w-full items-center justify-center gap-2 h-10 rounded-xl border border-zinc-700/60 bg-zinc-800/60 hover:bg-zinc-700/60 text-zinc-300 text-xs font-bold transition-colors">
                  <Play className="h-3.5 w-3.5" /> Resume Shift
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showBreakCapModal && (
        <div className="fixed inset-0 z-200 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowBreakCapModal(false)} />
          <div className="relative z-10 w-full max-w-sm rounded-2xl bg-zinc-900 border border-zinc-700/60 shadow-2xl overflow-hidden" style={{ animation: "slideUp 0.25s ease-out" }}>
            <button onClick={() => setShowBreakCapModal(false)} className="absolute top-3 right-3 h-9 w-9 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 flex items-center justify-center text-zinc-400 hover:text-zinc-200 transition-colors">
              <X className="h-3.5 w-3.5" />
            </button>
            <div className="px-6 pt-6 pb-5 space-y-4">
              <div className="flex flex-col items-center gap-3 text-center">
                <div className="h-14 w-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                  <Coffee className="h-7 w-7 text-red-400" />
                </div>
                <div>
                  <p className="text-base font-black text-white">Break Already Used</p>
                  <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                    You&apos;ve already used your 1-hour break for this shift. You can&apos;t start another break until your next shift.
                  </p>
                </div>
              </div>
              <button onClick={() => setShowBreakCapModal(false)}
                className="flex w-full items-center justify-center gap-2 h-11 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-bold transition-colors">
                Got it
              </button>
            </div>
          </div>
        </div>
      )}

      {resumeModal && (
        <div className="fixed inset-0 z-200 flex items-start justify-center pt-12 p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setResumeModal(false)} />
          <div className="relative z-10 w-full max-w-sm rounded-2xl bg-zinc-900 border border-zinc-700/60 shadow-2xl overflow-hidden" style={{ animation: "slideUp 0.25s ease-out" }}>
            <button onClick={() => setResumeModal(false)} className="absolute top-3 right-3 h-9 w-9 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 flex items-center justify-center text-zinc-400 hover:text-zinc-200 transition-colors">
              <X className="h-3.5 w-3.5" />
            </button>
            <div className="px-6 pt-6 pb-5 space-y-4">
              <div className="flex flex-col items-center gap-3 text-center">
                <div className="h-14 w-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                  <Clock className="h-7 w-7 text-amber-400" />
                </div>
                <div>
                  <p className="text-base font-black text-white">Resume Your Shift?</p>
                  <p className="text-xs text-zinc-400 mt-1 leading-relaxed">You have an unfinished shift from today that started at{" "}
                    <span className="text-white font-semibold">{resumeOriginalClockIn ? fmt(new Date(resumeOriginalClockIn)) : "—"}</span>. Would you like to continue from where you left off?
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <button onClick={() => { setResumeModal(false); handleClock("time-in") }}
                  className="flex w-full items-center justify-center gap-2 h-11 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-bold transition-colors">
                  <Play className="h-4 w-4" /> Yes, Resume Shift
                </button>
                <button onClick={() => { setResumeModal(false); setResumeOriginalClockIn(null); handleClock("time-in") }}
                  className="flex w-full items-center justify-center h-10 rounded-xl border border-zinc-700/60 bg-zinc-800/60 hover:bg-zinc-700/60 text-zinc-300 text-xs font-bold transition-colors">
                  No, Start a New Shift
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showTimecardModal && (
        <div className="fixed inset-0 z-200 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowTimecardModal(false)} />
          <div className="relative z-10 w-full max-w-2xl rounded-2xl bg-zinc-900 border border-zinc-700/60 shadow-2xl overflow-hidden max-h-[92vh] flex flex-col" style={{ animation: "slideUp 0.25s ease-out" }}>
            <button onClick={() => setShowTimecardModal(false)} className="absolute top-3 right-3 h-9 w-9 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 flex items-center justify-center text-zinc-400 hover:text-zinc-200 transition-colors z-10">
              <X className="h-3.5 w-3.5" />
            </button>
            <div className="px-6 pt-6 pb-4 space-y-4 shrink-0">
              <div>
                <p className="text-base font-black text-white">Download Timecard</p>
                <p className="text-xs text-zinc-400 mt-1 leading-relaxed">Preview updates live — confirm it looks right before printing/downloading.</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Date Start</label>
                  <input type="date" value={timecardStart} onChange={(e) => setTimecardStart(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700/60 rounded-xl px-3 py-2.5 text-sm text-zinc-200 outline-none focus:border-emerald-500/50 transition-colors" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Date End</label>
                  <input type="date" value={timecardEnd} onChange={(e) => setTimecardEnd(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700/60 rounded-xl px-3 py-2.5 text-sm text-zinc-200 outline-none focus:border-emerald-500/50 transition-colors" />
                </div>
              </div>
              {rateNum <= 0 && (
                <p className="text-[10px] text-amber-400/80">Enter your hourly rate above to include Total Income — otherwise it will show as $0.00.</p>
              )}
            </div>
            <div className="px-6 flex-1 min-h-0 overflow-hidden">
              <div className="h-[45vh] rounded-xl overflow-hidden border border-zinc-700/60 bg-white">
                {timecardStart <= timecardEnd ? (
                  <iframe ref={timecardPreviewRef} srcDoc={timecardPreviewHtml} title="Timecard preview" className="w-full h-full" />
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-zinc-500">Date Start must be before Date End</div>
                )}
              </div>
            </div>
            <div className="px-6 pt-4 pb-6 shrink-0">
              <button onClick={printTimecard} disabled={timecardStart > timecardEnd}
                className="flex w-full items-center justify-center gap-2 h-11 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                <Download className="h-4 w-4" /> Confirm — Print / PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {showIdleLogModal && (
        <div className="fixed inset-0 z-200 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowIdleLogModal(false)} />
          <div className="relative z-10 w-full max-w-2xl rounded-2xl bg-zinc-900 border border-zinc-700/60 shadow-2xl overflow-hidden max-h-[92vh] flex flex-col" style={{ animation: "slideUp 0.25s ease-out" }}>
            <button onClick={() => setShowIdleLogModal(false)} className="absolute top-3 right-3 h-9 w-9 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 flex items-center justify-center text-zinc-400 hover:text-zinc-200 transition-colors z-10">
              <X className="h-3.5 w-3.5" />
            </button>
            <div className="px-6 pt-6 pb-4 space-y-4 shrink-0">
              <div>
                <p className="text-base font-black text-white">Export Idle Log</p>
                <p className="text-xs text-zinc-400 mt-1 leading-relaxed">Read-only record of when you went idle (tray-detected inactivity) — not editable. Preview updates live.</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Date Start</label>
                  <input type="date" value={idleLogStart} onChange={(e) => setIdleLogStart(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700/60 rounded-xl px-3 py-2.5 text-sm text-zinc-200 outline-none focus:border-emerald-500/50 transition-colors" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Date End</label>
                  <input type="date" value={idleLogEnd} onChange={(e) => setIdleLogEnd(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700/60 rounded-xl px-3 py-2.5 text-sm text-zinc-200 outline-none focus:border-emerald-500/50 transition-colors" />
                </div>
              </div>
            </div>
            <div className="px-6 flex-1 min-h-0 overflow-hidden">
              <div className="h-[45vh] rounded-xl overflow-hidden border border-zinc-700/60 bg-white relative">
                {idleLogLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white/70 text-xs text-zinc-500">Loading…</div>
                )}
                {idleLogStart <= idleLogEnd ? (
                  <iframe ref={idleLogPreviewRef} srcDoc={idleLogPreviewHtml} title="Idle log preview" className="w-full h-full" />
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-zinc-500">Date Start must be before Date End</div>
                )}
              </div>
            </div>
            <div className="px-6 pt-4 pb-6 shrink-0">
              <button onClick={printIdleLog} disabled={idleLogStart > idleLogEnd || idleLogLoading}
                className="flex w-full items-center justify-center gap-2 h-11 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                <Download className="h-4 w-4" /> Confirm — Print / PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {showTrayModal && (
        <div className="fixed inset-0 z-200 flex items-start justify-center pt-12 p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowTrayModal(false)} />
          <div className="relative z-10 w-full max-w-sm rounded-2xl bg-zinc-900 border border-zinc-700/60 shadow-2xl overflow-y-auto max-h-[88vh] overscroll-contain" style={{ animation: "slideUp 0.25s ease-out" }}>
            <button onClick={() => setShowTrayModal(false)} className="absolute top-3 right-3 h-9 w-9 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 flex items-center justify-center text-zinc-400 hover:text-zinc-200 transition-colors">
              <X className="h-3.5 w-3.5" />
            </button>
            <div className="px-6 pt-6 pb-5 space-y-5">
              <div className="flex flex-col items-center gap-3 text-center">
                <div className="h-16 w-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                  <MonitorDot className="h-8 w-8 text-emerald-400" />
                </div>
                <div>
                  <p className="text-base font-black text-white">Tray App Required</p>
                  <p className="text-xs text-zinc-400 mt-1 leading-relaxed">The <span className="text-white font-semibold">Suprah AI Time Tracker</span> must be installed and running to track your shift, capture screenshots, and monitor activity.</p>
                </div>
              </div>
              <div className="rounded-xl bg-zinc-800/60 border border-zinc-700/40 px-4 py-3 space-y-2">
                {["Download and install the tray app below", "Launch it — it will appear in your system tray", "Come back here and click Start Shift"].map((step, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <span className="h-4 w-4 rounded-full bg-emerald-600/20 border border-emerald-500/30 text-[9px] font-black text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                    <p className="text-[11px] text-zinc-300 leading-relaxed">{step}</p>
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                <a href={getTrayDownloadUrl()} target="_blank" rel="noopener noreferrer" onClick={() => setShowTrayModal(false)}
                  className="flex w-full items-center justify-center gap-2 h-11 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-bold transition-colors">
                  <Download className="h-4 w-4" /> Download Tray App ({isMacDesktop() ? ".dmg" : ".exe"})
                </a>
                <button onClick={async () => {
                  setTrayChecking(true)
                  try {
                    const online = await attemptTrayReconnect()
                    if (online) { setShowTrayModal(false); handleClock("time-in") }
                    else toast.error("Still couldn't reach the tray app. Make sure it's running, then try again.")
                  } catch { } finally { setTrayChecking(false) }
                }} disabled={trayChecking}
                  className="flex w-full items-center justify-center gap-2 h-10 rounded-xl border border-zinc-700/60 bg-zinc-800/60 hover:bg-zinc-700/60 text-zinc-300 text-xs font-bold transition-colors disabled:opacity-50">
                  <MonitorDot className="h-3.5 w-3.5" /> Already Installed — Open It
                </button>
                <button onClick={async () => {
                  setTrayChecking(true)
                  try {
                    const online = await attemptTrayReconnect()
                    if (online) { setShowTrayModal(false); handleClock("time-in") }
                    else toast.error("Tray app not detected. Make sure it is running.")
                  } catch { toast.error("Tray app not detected. Make sure it is running.") } finally { setTrayChecking(false) }
                }} disabled={trayChecking}
                  className="flex w-full items-center justify-center gap-2 h-9 rounded-xl text-zinc-500 hover:text-zinc-300 text-xs font-semibold transition-colors disabled:opacity-50">
                  {trayChecking ? <><Loader2 className="h-3 w-3 animate-spin" /> Checking…</> : <><RefreshCw className="h-3 w-3" /> Check Again</>}
                </button>
                <a
                  href="/guide"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex w-full items-center justify-center gap-2 h-9 rounded-xl text-zinc-500 hover:text-zinc-300 text-xs font-semibold transition-colors"
                >
                  <BookOpen className="h-3 w-3" /> View Instructions — How to Download &amp; Use
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      <AlertDialog open={stopSharingConfirmOpen} onOpenChange={setStopSharingConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Stop sharing your location?</AlertDialogTitle>
            <AlertDialogDescription>
              Your shift stays active — this only pauses location sharing. Admins will be notified that it's off, and you can turn it back on any time from this page.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={stopSharingSaving}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleStopSharingNow} disabled={stopSharingSaving} className="bg-red-500 hover:bg-red-600">
              {stopSharingSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Stop Sharing"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}