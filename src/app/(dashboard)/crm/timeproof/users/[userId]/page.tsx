"use client"

import * as React from "react"
import { useParams, useRouter } from "next/navigation"
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Flame,
  Timer,
  Calendar,
  Copy,
  Check,
  Download,
  Shield,
  Radio,
  DollarSign,
  RefreshCw,
  Scissors,
  Send,
} from "lucide-react"
import { apiClient } from "@/lib/api-client"
import { LiveClock } from "@/components/crm/LiveClock"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { resolveImageUrl } from "@/lib/utils"
import { useCrmUser } from "@/hooks/useCrmUser"
import { isTimeEditExempt } from "@/lib/departments"
import {
  DayData, toDateStr, fmtHHMM, fmtHuman, getDayColor, StatCard, MonthCalendar,
  generatePayslipHtml, openHtmlForPrint, buildTimecardRows, generateTimecardHtml,
  generateIdleLogHtml, type IdlePeriod,
} from "@/components/crm/timeproof/shared"

/* ─────────────────────────────────────────────────────────────────────────
   Types
───────────────────────────────────────────────────────────────────────── */
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
    department?: string
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

/* ─────────────────────────────────────────────────────────────────────────
   Utilities
───────────────────────────────────────────────────────────────────────── */
const MDT_OFFSET_MS = -6 * 60 * 60 * 1000
const toMDTDate = (d: Date) => new Date(d.getTime() + MDT_OFFSET_MS)

const ini = (name: string) =>
  name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)

const roleBadgeClass = (role: string) => {
  if (role === "admin") return "bg-purple-500/10 text-purple-500 border-purple-500/20"
  if (role === "manager") return "bg-blue-500/10 text-blue-500 border-blue-500/20"
  return "bg-zinc-500/10 text-zinc-400 border-zinc-500/20"
}

/* ─────────────────────────────────────────────────────────────────────────
   Main Page
───────────────────────────────────────────────────────────────────────── */
export default function AdminUserTimeprofPage() {
  const { userId } = useParams<{ userId: string }>()
  const router = useRouter()
  const { user: currentUser } = useCrmUser()
  const isAdmin = currentUser?.role === "admin"

  const [data, setData] = React.useState<TimeprofData | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState("")

  const now = toMDTDate(new Date())
  const [viewYear, setViewYear] = React.useState(now.getUTCFullYear())
  const [viewMonth, setViewMonth] = React.useState(now.getUTCMonth())
  const [copied, setCopied] = React.useState(false)

  /* ── Payout Calculator state ── */
  const [payoutPeriod, setPayoutPeriod] = React.useState<1 | 2>(() =>
    now.getUTCDate() <= 15 ? 1 : 2
  )
  const [hourlyRate, setHourlyRate] = React.useState(() => {
    if (typeof window !== "undefined") return localStorage.getItem(`tp_hourly_rate_${userId}`) ?? ""
    return ""
  })
  const [showPhp, setShowPhp] = React.useState(false)
  const [phpRate, setPhpRate] = React.useState<number | null>(null)
  const [fetchingPhp, setFetchingPhp] = React.useState(false)

  /* ── Timecard (pay-period summary for HR) state ── */
  const [showTimecardForm, setShowTimecardForm] = React.useState(false)
  const [timecardStart, setTimecardStart] = React.useState(() => {
    const y = now.getUTCFullYear(), m = now.getUTCMonth()
    const d = now.getUTCDate() <= 15 ? 1 : 16
    return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`
  })
  const [timecardEnd, setTimecardEnd] = React.useState(() => toDateStr(new Date()))

  /* ── Idle Log (read-only export) state ── */
  const [showIdleLogForm, setShowIdleLogForm] = React.useState(false)
  const [idleLogStart, setIdleLogStart] = React.useState(() => {
    const d = new Date(now.getTime() - 14 * 86_400_000)
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`
  })
  const [idleLogEnd, setIdleLogEnd] = React.useState(() => toDateStr(new Date()))
  const [idlePeriods, setIdlePeriods] = React.useState<IdlePeriod[]>([])
  const [idleLogLoading, setIdleLogLoading] = React.useState(false)

  React.useEffect(() => {
    if (!showIdleLogForm || idleLogStart > idleLogEnd) return
    let cancelled = false
    setIdleLogLoading(true)
    const token = localStorage.getItem("crm_token")
    apiClient
      .get(`/api/crm/timeproof/user/${userId}/idle-log?startDate=${idleLogStart}&endDate=${idleLogEnd}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => { if (!cancelled) setIdlePeriods(res.data?.data?.idleLog || []) })
      .catch(() => { if (!cancelled) setIdlePeriods([]) })
      .finally(() => { if (!cancelled) setIdleLogLoading(false) })
    return () => { cancelled = true }
  }, [showIdleLogForm, idleLogStart, idleLogEnd, userId])

  /* ── Pay state ── */
  const [isPaying, setIsPaying] = React.useState(false)
  const [payConfirm, setPayConfirm] = React.useState(false)
  const [payDone, setPayDone] = React.useState(false)
  const [payError, setPayError] = React.useState("")

  /* ── Time correction state (overrun/forgotten clock-out fix) ── */
  const [showCorrectForm, setShowCorrectForm] = React.useState(false)
  const [correctDate, setCorrectDate] = React.useState("")
  const [correctTime, setCorrectTime] = React.useState("")
  const [correctReason, setCorrectReason] = React.useState("")
  const [alsoExcludeScreenshots, setAlsoExcludeScreenshots] = React.useState(true)
  const [correctSubmitting, setCorrectSubmitting] = React.useState(false)
  const [correctError, setCorrectError] = React.useState("")
  const [correctSuccess, setCorrectSuccess] = React.useState("")

  const handleSubmitCorrection = React.useCallback(async () => {
    if (!correctDate || !correctTime || !correctReason.trim()) {
      setCorrectError("Date, corrected time, and reason are all required.")
      return
    }
    const token = localStorage.getItem("crm_token")
    if (!token) return
    setCorrectSubmitting(true)
    setCorrectError("")
    setCorrectSuccess("")
    try {
      const correctedTimeOut = new Date(`${correctDate}T${correctTime}:00`).toISOString()
      await apiClient.correctTimeLog(
        { userId, date: correctDate, correctedTimeOut, reason: correctReason.trim() },
        { headers: { Authorization: `Bearer ${token}` } },
      )
      if (alsoExcludeScreenshots) {
        await apiClient.excludeScreenshots(
          { userId, date: correctDate, after: correctedTimeOut, reason: correctReason.trim() },
          { headers: { Authorization: `Bearer ${token}` } },
        )
      }
      setCorrectSuccess("Time corrected. Reloading data…")
      setCorrectReason("")
      const res = await apiClient.get(`/api/crm/timeproof/user/${userId}?range=365`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setData(res.data?.data)
      setTimeout(() => { setShowCorrectForm(false); setCorrectSuccess("") }, 1500)
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } }
      setCorrectError(err?.response?.data?.message || "Failed to correct time log.")
    } finally {
      setCorrectSubmitting(false)
    }
  }, [correctDate, correctTime, correctReason, alsoExcludeScreenshots, userId])

  // Payout calculator follows the calendar month navigation — no separate nav needed
  const calcMonthDate = new Date(Date.UTC(viewYear, viewMonth, 1))
  const calcMonthShort = calcMonthDate.toLocaleString("en-US", { month: "short", timeZone: "UTC" })
  const calcMonthLong = calcMonthDate.toLocaleString("en-US", { month: "long", timeZone: "UTC" })

  React.useEffect(() => {
    localStorage.setItem(`tp_hourly_rate_${userId}`, hourlyRate)
  }, [hourlyRate, userId])

  React.useEffect(() => {
    if (!data?.isLive) return
    const id = setInterval(() => { }, 60_000)
    return () => clearInterval(id)
  }, [data?.isLive])

  /* ── Fetch user timeproof ── */
  React.useEffect(() => {
    if (!userId) return
    const token = localStorage.getItem("crm_token")
    if (!token) { router.replace("/crm"); return }

    setLoading(true)
    apiClient
      .get(`/api/crm/timeproof/user/${userId}?range=365`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setData(res.data?.data))
      .catch((e: unknown) => {
        const err = e as { response?: { data?: { message?: string } } }
        setError(err?.response?.data?.message || "Failed to load timeproof data.")
      })
      .finally(() => setLoading(false))
  }, [userId, router])

  /* ── Month navigation ── */
  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear((y) => y - 1); setViewMonth(11) }
    else setViewMonth((m) => m - 1)
  }
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear((y) => y + 1); setViewMonth(0) }
    else setViewMonth((m) => m + 1)
  }
  const goToday = () => { setViewYear(now.getUTCFullYear()); setViewMonth(now.getUTCMonth()) }
  const isCurrentMonth = viewYear === now.getUTCFullYear() && viewMonth === now.getUTCMonth()
  const monthLabel = new Date(viewYear, viewMonth).toLocaleDateString("en-US", { month: "long", year: "numeric" })

  /* ── Per-month stats ── */
  const monthSummary = React.useMemo(() => {
    if (!data) return { seconds: 0, days: 0 }
    const prefix = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-`
    let seconds = 0, days = 0
    for (const [ds, d] of Object.entries(data.calendar)) {
      if (ds.startsWith(prefix) && d.totalSeconds > 0) { seconds += d.totalSeconds; days++ }
    }
    return { seconds, days }
  }, [data, viewYear, viewMonth])

  /* ── Cut-off period totals for the STAT CARD (always current real month) ── */
  const cutoffSummary = React.useMemo(() => {
    if (!data) return { p1Seconds: 0, p2Seconds: 0, lastDay: 31 }
    const y = now.getUTCFullYear()
    const mStr = String(now.getUTCMonth() + 1).padStart(2, "0")
    const lastDay = new Date(y, now.getUTCMonth() + 1, 0).getDate()
    let p1 = 0, p2 = 0
    for (let d = 1; d <= 15; d++) {
      p1 += data.calendar[`${y}-${mStr}-${String(d).padStart(2, "0")}`]?.totalSeconds ?? 0
    }
    for (let d = 16; d <= lastDay; d++) {
      p2 += data.calendar[`${y}-${mStr}-${String(d).padStart(2, "0")}`]?.totalSeconds ?? 0
    }
    return { p1Seconds: p1, p2Seconds: p2, lastDay }
  }, [data])

  /* ── Cut-off period totals for the CALCULATOR (follows calendar viewYear/viewMonth) ── */
  const calcCutoffSummary = React.useMemo(() => {
    if (!data) return { p1Seconds: 0, p2Seconds: 0, lastDay: 31 }
    const mStr = String(viewMonth + 1).padStart(2, "0")
    const lastDay = new Date(viewYear, viewMonth + 1, 0).getDate()
    let p1 = 0, p2 = 0
    for (let d = 1; d <= 15; d++) {
      p1 += data.calendar[`${viewYear}-${mStr}-${String(d).padStart(2, "0")}`]?.totalSeconds ?? 0
    }
    for (let d = 16; d <= lastDay; d++) {
      p2 += data.calendar[`${viewYear}-${mStr}-${String(d).padStart(2, "0")}`]?.totalSeconds ?? 0
    }
    return { p1Seconds: p1, p2Seconds: p2, lastDay }
  }, [data, viewYear, viewMonth])

  /* ── Derived cut-off values ── */
  const nowMonthShort = now.toLocaleString("en-US", { month: "short", timeZone: "UTC" })
  const nowMonthLong = now.toLocaleString("en-US", { month: "long", timeZone: "UTC" })
  const currentCutoff = now.getUTCDate() <= 15 ? 1 : 2
  const currentCutoffSeconds = currentCutoff === 1 ? cutoffSummary.p1Seconds : cutoffSummary.p2Seconds
  const currentCutoffLabel = currentCutoff === 1
    ? `${nowMonthShort} 1–15`
    : `${nowMonthShort} 16–${cutoffSummary.lastDay}`
  const currentPayoutDue = currentCutoff === 1
    ? `Due ${nowMonthShort} 20`
    : `Due ${new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 5)).toLocaleString("en-US", { month: "short", timeZone: "UTC" })} 5`

  /* ── Payout calculator ── */
  const calcSeconds = payoutPeriod === 1 ? calcCutoffSummary.p1Seconds : calcCutoffSummary.p2Seconds
  const calcWholeHours = Math.floor(calcSeconds / 3600)
  const calcRemainderMins = Math.floor((calcSeconds % 3600) / 60)
  const rateNum = parseFloat(hourlyRate) || 0
  const payoutUSD = calcWholeHours * rateNum
  const payoutPHP = phpRate !== null ? payoutUSD * phpRate : null
  const calcPeriodLabel = payoutPeriod === 1
    ? `${calcMonthShort} 1–15`
    : `${calcMonthShort} 16–${calcCutoffSummary.lastDay}`
  const calcPayoutDate = payoutPeriod === 1
    ? `${calcMonthLong} 20`
    : new Date(Date.UTC(viewYear, viewMonth + 1, 5))
      .toLocaleDateString("en-US", { month: "long", day: "numeric", timeZone: "UTC" })

  const payDayDate = React.useMemo(() => {
    if (payoutPeriod === 1) return new Date(Date.UTC(viewYear, viewMonth, 20))
    return new Date(Date.UTC(viewYear, viewMonth + 1, 5))
  }, [payoutPeriod, viewYear, viewMonth])
  const isPayDayReached = new Date() >= payDayDate
  const payDayLabel = payDayDate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" })

  /* ── Payslip print ── */
  const printPayslip = React.useCallback(() => {
    if (!data) return
    const u = data.user
    const periodFull = payoutPeriod === 1
      ? `${nowMonthLong} 1–15, ${now.getFullYear()}`
      : `${nowMonthLong} 16–${cutoffSummary.lastDay}, ${now.getFullYear()}`
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
  }, [data, payoutPeriod, nowMonthLong, cutoffSummary.lastDay, calcSeconds, calcWholeHours, rateNum, payoutUSD, showPhp, payoutPHP, phpRate, payDayLabel])

  /* ── Timecard preview + print (HR pay-period summary, arbitrary date range) ── */
  const timecardPreviewHtml = React.useMemo(() => {
    if (!data || !showTimecardForm) return ""
    const rows = buildTimecardRows(data.calendar, timecardStart, timecardEnd)
    return generateTimecardHtml({
      fullName: data.user.fullName,
      rateNum,
      startDateStr: timecardStart,
      endDateStr: timecardEnd,
      rows,
      autoPrint: false,
    })
  }, [data, showTimecardForm, timecardStart, timecardEnd, rateNum])

  const timecardPreviewRef = React.useRef<HTMLIFrameElement>(null)
  const printTimecard = React.useCallback(() => {
    timecardPreviewRef.current?.contentWindow?.print()
  }, [])

  /* ── Idle Log preview + print (read-only, not editable) ── */
  const idleLogPreviewHtml = React.useMemo(() => {
    if (!data || !showIdleLogForm) return ""
    return generateIdleLogHtml({
      fullName: data.user.fullName,
      startDateStr: idleLogStart,
      endDateStr: idleLogEnd,
      periods: idlePeriods,
      autoPrint: false,
    })
  }, [data, showIdleLogForm, idleLogStart, idleLogEnd, idlePeriods])

  const idleLogPreviewRef = React.useRef<HTMLIFrameElement>(null)
  const printIdleLog = React.useCallback(() => {
    idleLogPreviewRef.current?.contentWindow?.print()
  }, [])

  /* ── PHP rate fetch ── */
  const fetchPhpRate = React.useCallback(async () => {
    setFetchingPhp(true)
    try {
      const res = await fetch("https://open.er-api.com/v6/latest/USD")
      const json = await res.json()
      setPhpRate(json.rates?.PHP ?? null)
      setShowPhp(true)
    } catch {
      setPhpRate(null)
    } finally {
      setFetchingPhp(false)
    }
  }, [])

  const togglePhp = () => {
    if (!showPhp && phpRate === null) fetchPhpRate()
    else setShowPhp((v) => !v)
  }

  /* ── Reset pay state when period/rate changes ── */
  React.useEffect(() => {
    setPayDone(false)
    setPayConfirm(false)
    setPayError("")
  }, [payoutPeriod, viewMonth, viewYear, hourlyRate])

  /* ── SupraPay mock: simulates payment + email payslip (real integration pending) ── */
  const handlePay = React.useCallback(async () => {
    if (!data) return
    setIsPaying(true)
    setPayError("")
    try {
      await new Promise((resolve) => setTimeout(resolve, 1400))
      setPayDone(true)
      setPayConfirm(false)
    } catch {
      setPayError("Payment failed. Please try again.")
      setPayConfirm(false)
    } finally {
      setIsPaying(false)
    }
  }, [data])

  /* ── Copy proof ── */
  const copyProof = () => {
    if (!data) return
    const { summary, streak, user: u } = data
    navigator.clipboard.writeText(
      [
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
      ].join("\n")
    )
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="h-14 w-14 rounded-2xl bg-emerald-600/10 flex items-center justify-center">
              <Shield className="h-6 w-6 text-emerald-600" />
            </div>
            <div className="absolute inset-0 rounded-2xl ring-2 ring-emerald-500/20 ring-offset-2 ring-offset-background animate-ping" />
          </div>
          <p className="text-[11px] text-muted-foreground/40 tracking-[0.2em] uppercase font-semibold">
            Loading Timeproof…
          </p>
        </div>
      </div>
    )
  }

  /* ── Page ── */
  return (
    <div className="min-h-screen bg-background">

      {/* ── Sticky Header ── */}
      <div className="sticky top-0 z-20 border-b border-border/40 bg-background/85 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-3">
          <button
            onClick={() => router.push("/crm/timeproof/users")}
            className="h-9 w-9 rounded-xl flex items-center justify-center hover:bg-muted/50 transition-colors text-muted-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>

          {/* User identity */}
          {data ? (
            <div className="flex items-center gap-2.5 min-w-0">
              <Avatar className="h-7 w-7 shrink-0">
                {data.user.avatar && <AvatarFallback className="text-[10px] font-black">{ini(data.user.fullName)}</AvatarFallback>}
                {data.user.avatar
                  ? <AvatarFallback className="bg-emerald-600/10 text-emerald-700 dark:text-emerald-400 text-[10px] font-black">{ini(data.user.fullName)}</AvatarFallback>
                  : <AvatarFallback className="bg-emerald-600/10 text-emerald-700 dark:text-emerald-400 text-[10px] font-black">{ini(data.user.fullName)}</AvatarFallback>
                }
                {data.user.avatar && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={resolveImageUrl(data.user.avatar) ?? undefined} alt="" className="absolute inset-0 w-full h-full object-cover rounded-full" />
                )}
              </Avatar>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-black tracking-tight truncate">{data.user.fullName}</span>
                  <span className={`text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-md border shrink-0 ${roleBadgeClass(data.user.role)}`}>
                    {data.user.role}
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground/40 font-mono truncate leading-none mt-0.5">
                  Timeproof — {data.user.username}
                </p>
              </div>
              {data.isLive && (
                <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-500/20 shrink-0">
                  <Radio className="h-2.5 w-2.5 animate-pulse" />
                  Live
                </span>
              )}
            </div>
          ) : (
            <span className="text-sm font-black tracking-tight">Timeproof</span>
          )}

          <div className="ml-auto flex items-center gap-2">
            <LiveClock />
            <button
              onClick={copyProof}
              disabled={!data}
              className={`h-9 px-3 rounded-xl border flex items-center gap-1.5 text-[11px] font-bold transition-all ${copied
                  ? "border-emerald-500/40 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700"
                  : "border-border/40 hover:bg-muted/30 text-muted-foreground"
                } disabled:opacity-40 disabled:cursor-not-allowed`}
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              <span className="hidden sm:inline">{copied ? "Copied!" : "Copy Proof"}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-5 space-y-4">

        {error && (
          <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 px-4 py-3 text-xs text-rose-600">
            {error}
          </div>
        )}

        {data && (
          <>
            {/* ── Stat Cards ── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard
                label="Today"
                value={fmtHuman(data.summary.today.totalSeconds)}
                sub={data.isLive ? "🟢 Live session" : data.summary.today.totalSeconds > 0 ? "Completed" : "Not clocked in"}
                icon={Timer}
                accent={data.summary.today.totalSeconds > 0}
              />
              <StatCard
                label="Cut-off"
                value={fmtHHMM(currentCutoffSeconds)}
                sub={`${currentCutoffLabel} · ${currentPayoutDue}`}
                icon={Scissors}
                accent={currentCutoffSeconds > 0}
              />
              <StatCard
                label={monthLabel.split(" ")[0]}
                value={fmtHHMM(monthSummary.seconds)}
                sub={`${monthSummary.days} day${monthSummary.days !== 1 ? "s" : ""} active`}
                icon={Calendar}
              />
              <StatCard
                label="Streak"
                value={`${data.streak}d`}
                sub={`Best: ${data.longestStreak} days`}
                icon={Flame}
                amber
              />
            </div>

            {/* ── Calendar Card ── */}
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
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 px-5 py-2.5 border-b border-border/20 bg-muted/10">
                <span className="text-[10px] text-muted-foreground/50">
                  Total: <strong className="text-foreground/70 font-mono">{fmtHHMM(monthSummary.seconds)}</strong>
                </span>
                <span className="text-[10px] text-muted-foreground/50">
                  Active days: <strong className="text-foreground/70">{monthSummary.days}</strong>
                </span>
                <div className="ml-auto hidden sm:flex items-center gap-3 flex-wrap">
                  {[
                    { label: "< 2h", cls: "bg-rose-500" },
                    { label: "2–4h", cls: "bg-sky-700" },
                    { label: "4–6h", cls: "bg-sky-600" },
                    { label: "6–9h", cls: "bg-emerald-600" },
                    { label: "9h+", cls: "bg-emerald-500" },
                  ].map((c) => (
                    <span key={c.label} className="flex items-center gap-1">
                      <span className={`h-2.5 w-5 rounded-[3px] ${c.cls}`} />
                      <span className="text-[8px] text-muted-foreground/35">{c.label}</span>
                    </span>
                  ))}
                </div>
              </div>

              <MonthCalendar
                year={viewYear}
                month={viewMonth}
                calendar={data.calendar}
                onSelectDay={(ds) =>
                  router.push(`/crm/timeproof/${ds}?userId=${userId}&t=${data?.calendar[ds]?.totalSeconds ?? 0}`)
                }
                isLive={data.isLive}
              />
            </div>

            {/* ── Payout Calculator ── */}
            <div className="rounded-2xl border border-border/40 bg-card p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-black tracking-tight">Payout Calculator</p>
                  <p className="text-[10px] text-muted-foreground/40 mt-0.5">
                    Compute {data.user.fullName.split(" ")[0]}&apos;s earnings for a cut-off period
                  </p>
                </div>
                <DollarSign className="h-4 w-4 text-muted-foreground/20" />
              </div>

              {/* Period selector */}
              <div className="space-y-1.5">
                <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground/35">Period</p>
                <div className="flex gap-2">
                  {([1, 2] as const).map((p) => {
                    const label = p === 1 ? `${calcMonthShort} 1–15` : `${calcMonthShort} 16–${calcCutoffSummary.lastDay}`
                    return (
                      <button
                        key={p}
                        onClick={() => setPayoutPeriod(p)}
                        className={`flex-1 h-9 rounded-xl border text-[11px] font-bold transition-all ${payoutPeriod === p
                            ? "border-emerald-500/50 bg-emerald-600/10 text-emerald-700 dark:text-emerald-300"
                            : "border-border/40 text-muted-foreground hover:bg-muted/30"
                          }`}
                      >
                        {label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Hourly rate input */}
              <div className="space-y-1.5">
                <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground/35">
                  {data.user.fullName.split(" ")[0]}&apos;s Hourly Rate
                </p>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-muted-foreground/50">$</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={hourlyRate}
                    onChange={(e) => setHourlyRate(e.target.value)}
                    className="w-full h-9 pl-7 pr-12 rounded-xl border border-border/40 bg-muted/10 text-sm font-bold font-mono focus:outline-none focus:border-emerald-500/50 focus:bg-emerald-500/5 transition-all"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground/35">/ hr</span>
                </div>
              </div>

              {/* Result */}
              <div className="pt-1 border-t border-border/20 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <span className="text-[11px] text-muted-foreground/50">Hours rendered ({calcPeriodLabel})</span>
                    {calcRemainderMins > 0 && (
                      <p className="text-[9px] text-muted-foreground/35 mt-0.5">{calcRemainderMins}m not counted — whole hours only</p>
                    )}
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
                      <button
                        onClick={togglePhp}
                        disabled={fetchingPhp}
                        className={`h-9 px-2.5 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all border ${showPhp
                            ? "border-sky-500/40 bg-sky-500/10 text-sky-600 dark:text-sky-400"
                            : "border-border/30 text-muted-foreground/40 hover:border-border/60"
                          }`}
                      >
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
                    <p className="text-sm text-muted-foreground/30 font-medium">Enter the hourly rate above</p>
                  )}
                </div>

                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50/30 dark:bg-amber-950/15 border border-amber-500/15">
                  <Scissors className="h-3 w-3 text-amber-500 shrink-0" />
                  <span className="text-[10px] text-muted-foreground/50 flex-1">
                    {payoutPeriod === 1 ? "1st–15th" : `16th–${cutoffSummary.lastDay}th`} cut-off
                  </span>
                  <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">Released {calcPayoutDate}</span>
                </div>

                {/* ── Admin-only: Confirm banner ── */}
                {isAdmin && payConfirm && !isPaying && (
                  <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-blue-50/40 dark:bg-blue-950/20 border border-blue-500/20">
                    <p className="text-[10px] text-muted-foreground/70 flex-1 leading-snug">
                      Send <strong className="text-blue-700 dark:text-blue-300">${payoutUSD.toFixed(2)} USD</strong> to {data.user.fullName.split(" ")[0]} via SupraPay + email payslip?
                    </p>
                    <div className="flex gap-1 shrink-0">
                      <button
                        onClick={() => setPayConfirm(false)}
                        className="h-7 px-2 rounded-lg text-[10px] font-semibold text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handlePay}
                        disabled={isPaying}
                        className="h-7 px-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold transition-colors disabled:opacity-50"
                      >
                        Confirm
                      </button>
                    </div>
                  </div>
                )}

                {isAdmin && payError && (
                  <p className="text-[10px] text-rose-500 bg-rose-500/5 border border-rose-500/15 rounded-lg px-3 py-2">{payError}</p>
                )}

                {/* ── Pay + Payslip buttons row ── */}
                <div className="flex gap-2">
                  {/* Pay button — admin only */}
                  {isAdmin && (payDone ? (
                    <div className="flex-1 h-10 rounded-xl border border-emerald-500/30 bg-emerald-600/8 flex items-center justify-center gap-2 text-[11px] font-bold text-emerald-700 dark:text-emerald-300 select-none">
                      <Check className="h-3.5 w-3.5" />
                      Payment Sent
                    </div>
                  ) : (
                    <button
                      onClick={() => setPayConfirm(true)}
                      disabled={rateNum <= 0 || isPaying || payConfirm}
                      className="flex-1 h-10 rounded-xl border border-blue-500/40 bg-blue-600/10 hover:bg-blue-600/15 text-blue-700 dark:text-blue-300 text-[11px] font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {isPaying
                        ? <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        : <Send className="h-3.5 w-3.5" />
                      }
                      {isPaying ? "Sending…" : "Pay"}
                    </button>
                  ))}

                  {/* Payslip button */}
                  {isPayDayReached ? (
                    <button
                      onClick={printPayslip}
                      disabled={rateNum <= 0}
                      className="flex-1 h-10 rounded-xl border border-emerald-500/40 bg-emerald-600/10 hover:bg-emerald-600/15 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Payslip (PDF)</span>
                      <span className="sm:hidden">Payslip</span>
                    </button>
                  ) : (
                    <div className="flex-1 h-10 rounded-xl border border-border/30 bg-muted/10 flex items-center justify-center gap-2 text-[11px] text-muted-foreground/40 cursor-not-allowed select-none">
                      <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                      <span className="hidden sm:inline">Payslip on {payDayLabel}</span>
                      <span className="sm:hidden">Locked</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ── Admin-only: Correct overrun/forgotten clock-out ── */}
            {isAdmin && (
              isTimeEditExempt(data.user.department) ? (
                <div className="rounded-2xl border border-border/30 bg-muted/10 p-4 text-[11px] text-muted-foreground/40">
                  Time log correction is disabled for this user&apos;s department.
                </div>
              ) : (
                <div className="rounded-2xl border border-border/40 bg-card p-4 space-y-3">
                  <button
                    onClick={() => setShowCorrectForm((v) => !v)}
                    className="w-full flex items-center justify-between gap-2 text-left"
                  >
                    <div className="flex items-center gap-2">
                      <Scissors className="h-3.5 w-3.5 text-amber-500" />
                      <span className="text-[11px] font-black tracking-tight">Correct Overrun Shift</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground/40">{showCorrectForm ? "Hide" : "Fix a forgotten clock-out"}</span>
                  </button>

                  {showCorrectForm && (
                    <div className="space-y-2.5 pt-1">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/40 block mb-1">Date</label>
                          <input
                            type="date"
                            value={correctDate}
                            onChange={(e) => setCorrectDate(e.target.value)}
                            className="w-full h-9 rounded-lg border border-border/40 bg-background px-2 text-[12px]"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/40 block mb-1">Corrected clock-out</label>
                          <input
                            type="time"
                            value={correctTime}
                            onChange={(e) => setCorrectTime(e.target.value)}
                            className="w-full h-9 rounded-lg border border-border/40 bg-background px-2 text-[12px]"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/40 block mb-1">Reason (required)</label>
                        <textarea
                          value={correctReason}
                          onChange={(e) => setCorrectReason(e.target.value)}
                          rows={2}
                          placeholder="e.g. Forgot to clock out, left premises at ~6pm"
                          className="w-full rounded-lg border border-border/40 bg-background px-2 py-1.5 text-[12px] resize-none"
                        />
                      </div>
                      <label className="flex items-center gap-2 text-[10px] text-muted-foreground/60">
                        <input
                          type="checkbox"
                          checked={alsoExcludeScreenshots}
                          onChange={(e) => setAlsoExcludeScreenshots(e.target.checked)}
                        />
                        Also exclude screenshots captured after the corrected time (archived, not deleted)
                      </label>

                      {correctError && (
                        <p className="text-[10px] text-rose-500 bg-rose-500/5 border border-rose-500/15 rounded-lg px-3 py-2">{correctError}</p>
                      )}
                      {correctSuccess && (
                        <p className="text-[10px] text-emerald-600 bg-emerald-500/5 border border-emerald-500/15 rounded-lg px-3 py-2">{correctSuccess}</p>
                      )}

                      <button
                        onClick={handleSubmitCorrection}
                        disabled={correctSubmitting}
                        className="w-full h-9 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-[11px] font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                      >
                        {correctSubmitting ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Scissors className="h-3.5 w-3.5" />}
                        {correctSubmitting ? "Saving…" : "Apply Correction"}
                      </button>
                    </div>
                  )}
                </div>
              )
            )}

            {/* ── Timecard: HR pay-period summary, any date range ── */}
            <div className="rounded-2xl border border-border/40 bg-card p-4 space-y-3">
              <button
                onClick={() => setShowTimecardForm((v) => !v)}
                className="w-full flex items-center justify-between gap-2 text-left"
              >
                <div className="flex items-center gap-2">
                  <Download className="h-3.5 w-3.5 text-muted-foreground/40" />
                  <span className="text-[11px] font-black tracking-tight">Timecard (Pay Period Summary)</span>
                </div>
                <span className="text-[10px] text-muted-foreground/40">{showTimecardForm ? "Hide" : "Generate for payroll"}</span>
              </button>

              {showTimecardForm && (
                <div className="space-y-2.5 pt-1">
                  <p className="text-[10px] text-muted-foreground/50 leading-relaxed">
                    Day-by-day Time In / Time Out / Total Break / Total for any date range — printable/exportable for Accounting or the employee&apos;s records.
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/40 block mb-1">Date Start</label>
                      <input
                        type="date"
                        value={timecardStart}
                        onChange={(e) => setTimecardStart(e.target.value)}
                        className="w-full h-9 rounded-lg border border-border/40 bg-background px-2 text-[12px]"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/40 block mb-1">Date End</label>
                      <input
                        type="date"
                        value={timecardEnd}
                        onChange={(e) => setTimecardEnd(e.target.value)}
                        className="w-full h-9 rounded-lg border border-border/40 bg-background px-2 text-[12px]"
                      />
                    </div>
                  </div>
                  {rateNum <= 0 && (
                    <p className="text-[10px] text-amber-500/80">Set {data.user.fullName.split(" ")[0]}&apos;s hourly rate above to include Total Income.</p>
                  )}
                  <div className="h-72 rounded-lg overflow-hidden border border-border/40 bg-white">
                    {timecardStart <= timecardEnd ? (
                      <iframe ref={timecardPreviewRef} srcDoc={timecardPreviewHtml} title="Timecard preview" className="w-full h-full" />
                    ) : (
                      <div className="h-full flex items-center justify-center text-xs text-muted-foreground/50">Date Start must be before Date End</div>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground/40">Preview updates live as you change the dates — confirm it looks right before printing.</p>
                  <button
                    onClick={printTimecard}
                    disabled={timecardStart > timecardEnd}
                    className="w-full h-9 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                  >
                    <Download className="h-3.5 w-3.5" /> Confirm — Print / PDF Timecard
                  </button>
                </div>
              )}
            </div>

            {/* ── Idle Log: read-only export of when the user went idle ── */}
            <div className="rounded-2xl border border-border/40 bg-card p-4 space-y-3">
              <button
                onClick={() => setShowIdleLogForm((v) => !v)}
                className="w-full flex items-center justify-between gap-2 text-left"
              >
                <div className="flex items-center gap-2">
                  <Download className="h-3.5 w-3.5 text-muted-foreground/40" />
                  <span className="text-[11px] font-black tracking-tight">Idle Log (read-only)</span>
                </div>
                <span className="text-[10px] text-muted-foreground/40">{showIdleLogForm ? "Hide" : "Export idle history"}</span>
              </button>

              {showIdleLogForm && (
                <div className="space-y-2.5 pt-1">
                  <p className="text-[10px] text-muted-foreground/50 leading-relaxed">
                    Date &amp; time of every tray-detected idle period for any date range — export/print only, not editable.
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/40 block mb-1">Date Start</label>
                      <input
                        type="date"
                        value={idleLogStart}
                        onChange={(e) => setIdleLogStart(e.target.value)}
                        className="w-full h-9 rounded-lg border border-border/40 bg-background px-2 text-[12px]"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/40 block mb-1">Date End</label>
                      <input
                        type="date"
                        value={idleLogEnd}
                        onChange={(e) => setIdleLogEnd(e.target.value)}
                        className="w-full h-9 rounded-lg border border-border/40 bg-background px-2 text-[12px]"
                      />
                    </div>
                  </div>
                  <div className="h-72 rounded-lg overflow-hidden border border-border/40 bg-white relative">
                    {idleLogLoading && (
                      <div className="absolute inset-0 flex items-center justify-center bg-white/70 text-xs text-muted-foreground/50">Loading…</div>
                    )}
                    {idleLogStart <= idleLogEnd ? (
                      <iframe ref={idleLogPreviewRef} srcDoc={idleLogPreviewHtml} title="Idle log preview" className="w-full h-full" />
                    ) : (
                      <div className="h-full flex items-center justify-center text-xs text-muted-foreground/50">Date Start must be before Date End</div>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground/40">Preview updates live as you change the dates — confirm it looks right before printing.</p>
                  <button
                    onClick={printIdleLog}
                    disabled={idleLogStart > idleLogEnd || idleLogLoading}
                    className="w-full h-9 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                  >
                    <Download className="h-3.5 w-3.5" /> Confirm — Print / PDF Idle Log
                  </button>
                </div>
              )}
            </div>

            {/* ── Verified footer ── */}
            <div className="rounded-2xl border border-emerald-500/20 bg-gradient-to-r from-emerald-50/50 to-transparent dark:from-emerald-950/20 p-4">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-xl bg-emerald-600/10 flex items-center justify-center shrink-0">
                  <Shield className="h-3.5 w-3.5 text-emerald-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-black text-emerald-800 dark:text-emerald-300">Timeproof Verified</p>
                  <p className="text-[10px] text-emerald-700/50 dark:text-emerald-400/50 mt-0.5">
                    All timestamps are server-validated and IP-logged. Click any day to inspect individual sessions and screenshots.
                  </p>
                </div>
                <button
                  onClick={copyProof}
                  className="shrink-0 h-9 px-3 rounded-xl bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-700 dark:text-emerald-400 text-[11px] font-bold flex items-center gap-1.5 transition-colors"
                >
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? "Copied" : "Share"}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
