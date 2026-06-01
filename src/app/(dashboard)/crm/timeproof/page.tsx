"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
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
  Users,
  Lock,
} from "lucide-react"
import { apiClient } from "@/lib/api-client"
import { LiveClock } from "@/components/crm/LiveClock"

/* ─────────────────────────────────────────────────────────────────────────
   Types
───────────────────────────────────────────────────────────────────────── */
interface Session {
  in: string
  out: string | null
  duration: number
  isLive: boolean
}

interface DayData {
  sessions: Session[]
  totalSeconds: number
  breakSeconds?: number
  weekTotalSeconds?: number
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

/* ─────────────────────────────────────────────────────────────────────────
   Utilities
───────────────────────────────────────────────────────────────────────── */
// Company timezone: MDT (UTC-6). All calendar dates are computed in MDT
// so they match the backend's COMPANY_TZ_OFFSET_MINUTES = -360.
const MDT_OFFSET_MS = -6 * 60 * 60 * 1000
const toMDTDate = (d: Date) => new Date(d.getTime() + MDT_OFFSET_MS)

const toDateStr = (d: Date) => {
  const m = toMDTDate(d)
  return `${m.getUTCFullYear()}-${String(m.getUTCMonth() + 1).padStart(2, "0")}-${String(m.getUTCDate()).padStart(2, "0")}`
}

// Pay schedule: 1st–15th → payday 21st | 16th–end → payday 6th of next month.
// Calculator unlocks 1 day before payday and stays available through the period end.
function getPayoutWindowState(dayOfMonth: number): { available: boolean; nextUnlockLabel: string; daysUntil: number } {
  if (dayOfMonth >= 5 && dayOfMonth <= 15) return { available: true, nextUnlockLabel: "", daysUntil: 0 }
  if (dayOfMonth >= 20) return { available: true, nextUnlockLabel: "", daysUntil: 0 }
  if (dayOfMonth < 5) return { available: false, nextUnlockLabel: "the 5th of this month", daysUntil: 5 - dayOfMonth }
  return { available: false, nextUnlockLabel: "the 20th of this month", daysUntil: 20 - dayOfMonth }
}

const fmtHHMM = (seconds: number) => {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
}

const fmtHuman = (seconds: number) => {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h === 0 && m === 0) return "0m"
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

const getDayColor = (seconds: number, isToday: boolean) => {
  if (isToday && seconds === 0)
    return { bg: "bg-amber-400/10 border-amber-400/40", bar: "bg-muted/40", text: "text-muted-foreground/30" }
  if (seconds === 0) return { bg: "", bar: "", text: "" }
  return { bg: "bg-blue-950/[0.07] border-blue-500/20", bar: "bg-blue-700", text: "text-white" }
}

/* ─────────────────────────────────────────────────────────────────────────
   Stat Card
───────────────────────────────────────────────────────────────────────── */
const StatCard = ({
  label,
  value,
  sub,
  icon: Icon,
  accent = false,
  amber = false,
}: {
  label: string
  value: string
  sub?: string
  icon: React.ElementType
  accent?: boolean
  amber?: boolean
}) => (
  <div
    className={`rounded-xl border px-4 py-3.5 space-y-2 ${accent
        ? "border-emerald-500/30 bg-emerald-50/60 dark:bg-emerald-950/20"
        : amber
          ? "border-amber-500/25 bg-amber-50/40 dark:bg-amber-950/15"
          : "border-border/40 bg-card"
      }`}
  >
    <div className="flex items-center justify-between">
      <p className="text-[9px] font-black uppercase tracking-[0.22em] text-muted-foreground/40">
        {label}
      </p>
      <Icon
        className={`h-3.5 w-3.5 ${accent ? "text-emerald-600" : amber ? "text-amber-500" : "text-muted-foreground/25"
          }`}
      />
    </div>
    <p
      className={`text-2xl font-black tracking-tight leading-none ${accent
          ? "text-emerald-700 dark:text-emerald-300"
          : amber
            ? "text-amber-700 dark:text-amber-300"
            : ""
        }`}
    >
      {value}
    </p>
    {sub && <p className="text-[10px] text-muted-foreground/40 leading-none">{sub}</p>}
  </div>
)

/* ─────────────────────────────────────────────────────────────────────────
   Monthly Calendar Grid
───────────────────────────────────────────────────────────────────────── */
const MonthCalendar = ({
  year,
  month,
  calendar,
  onSelectDay,
  isLive,
}: {
  year: number
  month: number
  calendar: Record<string, DayData>
  onSelectDay: (ds: string) => void
  isLive: boolean
}) => {
  const todayStr = toDateStr(new Date())

  const firstDay = new Date(year, month, 1)
  const startOffset = firstDay.getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const cells: (number | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

  return (
    <div className="w-full">
      {/* Day header */}
      <div className="grid grid-cols-7 border-b border-border/30">
        {DAYS.map((d) => (
          <div
            key={d}
            className="py-2.5 text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground/35 border-r border-border/20 last:border-r-0"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Week rows */}
      {Array.from({ length: cells.length / 7 }, (_, wi) => (
        <div key={wi} className="grid grid-cols-7 border-b border-border/20 last:border-b-0">
          {cells.slice(wi * 7, wi * 7 + 7).map((dayNum, di) => {
            if (dayNum === null) {
              return (
                <div
                  key={di}
                  className="border-r border-border/20 last:border-r-0 bg-muted/5 min-h-22.5 sm:min-h-25"
                />
              )
            }

            const ds = `${year}-${String(month + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`
            const data = calendar[ds]
            const isToday = ds === todayStr
            const isFuture = ds > todayStr
            const hasData = !!data && data.totalSeconds > 0
            const colors = getDayColor(data?.totalSeconds ?? 0, isToday)
            const isCurrentlyLive = isToday && isLive

            return (
              <div
                key={di}
                onClick={() => !isFuture && onSelectDay(ds)}
                className={[
                  "border-r border-border/20 last:border-r-0 min-h-22.5 sm:min-h-25 p-2 flex flex-col gap-1 transition-all duration-100",
                  isFuture ? "opacity-30 cursor-default select-none" : "cursor-pointer hover:bg-muted/20",
                  isToday || hasData ? `border ${colors.bg}` : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {/* Date number */}
                <div className="flex items-start justify-between">
                  <span
                    className={
                      isToday
                        ? "h-5 w-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-black"
                        : isFuture
                          ? "text-[12px] font-bold text-muted-foreground/20"
                          : "text-[12px] font-bold text-muted-foreground/50"
                    }
                  >
                    {dayNum}
                  </span>
                  {isCurrentlyLive && (
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse mt-0.5" />
                  )}
                </div>

                {/* Badges */}
                {(hasData || (!!data?.weekTotalSeconds && data.weekTotalSeconds > 0)) && (
                  <div className="mt-auto space-y-0.5">
                    {hasData && (
                      <>
                        {/* Dark blue — work hours */}
                        <div className={`rounded-[5px] px-1.5 py-1 text-center ${colors.bar}`}>
                          <span className={`text-[11px] font-black font-mono ${colors.text}`}>
                            {fmtHHMM(data.totalSeconds)}
                          </span>
                        </div>
                        {/* Orange — break hours (only if breaks exist) */}
                        {!!data.breakSeconds && data.breakSeconds > 0 && (
                          <div className="rounded-[5px] px-1.5 py-0.5 text-center bg-orange-500/80">
                            <span className="text-[10px] font-bold font-mono text-white">
                              {fmtHHMM(data.breakSeconds)}
                            </span>
                          </div>
                        )}
                      </>
                    )}
                    {/* Green — week total (Saturday of each week, even if no work that day) */}
                    {!!data?.weekTotalSeconds && data.weekTotalSeconds > 0 && (
                      <div className="rounded-[5px] px-1.5 py-0.5 text-center bg-emerald-600/90">
                        <span className="text-[10px] font-bold font-mono text-white">
                          {fmtHHMM(data.weekTotalSeconds)}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Today empty placeholder */}
                {isToday && !hasData && (
                  <div className="mt-auto">
                    <div className="rounded-[5px] px-1.5 py-1 bg-muted/25 text-center">
                      <span className="text-[10px] text-muted-foreground/25 font-mono">--:--</span>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────
   Main Page
───────────────────────────────────────────────────────────────────────── */
export default function TimeprofPage() {
  const router = useRouter()

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
    if (typeof window !== "undefined") return localStorage.getItem("tp_hourly_rate") ?? ""
    return ""
  })
  const [showPhp, setShowPhp] = React.useState(false)
  const [phpRate, setPhpRate] = React.useState<number | null>(null)
  const [fetchingPhp, setFetchingPhp] = React.useState(false)

  // Payout calculator follows the calendar month navigation — no separate nav needed
  const calcMonthDate = new Date(Date.UTC(viewYear, viewMonth, 1))
  const calcMonthShort = calcMonthDate.toLocaleString("en-US", { month: "short", timeZone: "UTC" })
  const calcMonthLong = calcMonthDate.toLocaleString("en-US", { month: "long", timeZone: "UTC" })

  // Persist rate across sessions
  React.useEffect(() => {
    localStorage.setItem("tp_hourly_rate", hourlyRate)
  }, [hourlyRate])

  // Refresh live session every minute
  const [, setTick] = React.useState(0)
  React.useEffect(() => {
    if (!data?.isLive) return
    const id = setInterval(() => setTick((n) => n + 1), 60_000)
    return () => clearInterval(id)
  }, [data?.isLive])

  /* ── Fetch 365-day window so all months work without refetch ── */
  React.useEffect(() => {
    const token = localStorage.getItem("crm_token")
    if (!token) { router.replace("/crm"); return }

    setLoading(true)
    apiClient
      .get("/api/crm/timeproof/my?range=365", {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setData(res.data?.data))
      .catch((e: any) =>
        setError(e?.response?.data?.message || "Failed to load timeproof data.")
      )
      .finally(() => setLoading(false))
  }, [router])

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
  const monthLabel = new Date(viewYear, viewMonth).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  })

  /* ── Per-month stats ── */
  const monthSummary = React.useMemo(() => {
    if (!data) return { seconds: 0, days: 0 }
    const prefix = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-`
    let seconds = 0, days = 0
    for (const [ds, d] of Object.entries(data.calendar)) {
      if (ds.startsWith(prefix) && d.totalSeconds > 0) {
        seconds += d.totalSeconds
        days++
      }
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
      const ds = `${y}-${mStr}-${String(d).padStart(2, "0")}`
      p1 += data.calendar[ds]?.totalSeconds ?? 0
    }
    for (let d = 16; d <= lastDay; d++) {
      const ds = `${y}-${mStr}-${String(d).padStart(2, "0")}`
      p2 += data.calendar[ds]?.totalSeconds ?? 0
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
      const ds = `${viewYear}-${mStr}-${String(d).padStart(2, "0")}`
      p1 += data.calendar[ds]?.totalSeconds ?? 0
    }
    for (let d = 16; d <= lastDay; d++) {
      const ds = `${viewYear}-${mStr}-${String(d).padStart(2, "0")}`
      p2 += data.calendar[ds]?.totalSeconds ?? 0
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
    ? `Due ${nowMonthShort} 21`
    : `Due ${new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 6)).toLocaleString("en-US", { month: "short", timeZone: "UTC" })} 6`

  /* ── Payout calculator derived ── */
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
    ? `${calcMonthLong} 21`
    : new Date(Date.UTC(viewYear, viewMonth + 1, 6))
      .toLocaleDateString("en-US", { month: "long", day: "numeric", timeZone: "UTC" })

  /* ── Pay day availability ── */
  const payDayDate = React.useMemo(() => {
    if (payoutPeriod === 1) {
      return new Date(Date.UTC(viewYear, viewMonth, 21))
    }
    return new Date(Date.UTC(viewYear, viewMonth + 1, 6))
  }, [payoutPeriod, viewYear, viewMonth])

  const isPayDayReached = new Date() >= payDayDate
  const payDayLabel = payDayDate.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  })

  /* ── Payout calculator access gate ── */
  const payoutWindow = getPayoutWindowState(now.getUTCDate())
  const isAdminOrManager = data?.user?.role === 'admin' || data?.user?.role === 'manager'
  // Past months are always unlocked — the pay period has already closed
  const showPayoutCalculator = !isCurrentMonth || isAdminOrManager || payoutWindow.available

  /* ── Payslip print ── */
  const printPayslip = React.useCallback(() => {
    if (!data) return
    const u = data.user
    const generatedAt = new Date().toLocaleString("en-US", {
      month: "long", day: "numeric", year: "numeric",
      hour: "2-digit", minute: "2-digit", hour12: true,
    })
    const periodFull = payoutPeriod === 1
      ? `${nowMonthLong} 1–15, ${now.getFullYear()}`
      : `${nowMonthLong} 16–${cutoffSummary.lastDay}, ${now.getFullYear()}`
    const renderedFull = fmtHHMM(calcSeconds)
    const phpRow = showPhp && payoutPHP !== null && phpRate !== null
      ? `<tr>
          <td>Gross Pay (PHP)</td>
          <td class="amount">₱${payoutPHP.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
         </tr>
         <tr class="note-row">
          <td>Exchange Rate</td>
          <td class="amount">1 USD = ₱${phpRate.toFixed(2)}</td>
         </tr>`
      : ""

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Payslip — ${u.fullName} — ${periodFull}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, Helvetica, sans-serif; color: #111; background: #fff; padding: 48px 56px; max-width: 720px; margin: 0 auto; }
  .header { text-align: center; padding-bottom: 20px; border-bottom: 2px solid #111; margin-bottom: 24px; }
  .company { font-size: 22px; font-weight: 900; letter-spacing: 4px; text-transform: uppercase; }
  .doc-title { font-size: 12px; letter-spacing: 3px; text-transform: uppercase; color: #555; margin-top: 4px; }
  .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 32px; margin-bottom: 24px; }
  .meta-grid .row { display: flex; flex-direction: column; gap: 1px; }
  .meta-label { font-size: 9px; text-transform: uppercase; letter-spacing: 1.5px; color: #888; font-weight: 700; }
  .meta-value { font-size: 13px; font-weight: 600; color: #111; }
  .section-title { font-size: 9px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; color: #444; margin-bottom: 8px; border-bottom: 1px solid #ddd; padding-bottom: 4px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
  table td { padding: 9px 12px; font-size: 12px; border-bottom: 1px solid #eee; }
  table td:first-child { color: #444; }
  table td.amount { text-align: right; font-family: 'Courier New', monospace; font-weight: 700; }
  .total-row td { font-size: 15px; font-weight: 900; border-top: 2px solid #111; border-bottom: none; padding-top: 12px; }
  .note-row td { font-size: 10px; color: #888; }
  .verified { background: #f0fdf4; border: 1px solid #86efac; border-radius: 6px; padding: 10px 14px; font-size: 10px; color: #166534; margin-bottom: 28px; }
  .sig-area { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 8px; }
  .sig-box { border-top: 1px solid #bbb; padding-top: 6px; font-size: 10px; color: #888; text-align: center; }
  .footer { text-align: center; font-size: 9px; color: #bbb; margin-top: 32px; border-top: 1px solid #eee; padding-top: 12px; letter-spacing: 1px; }
  @media print {
    body { padding: 24px 32px; }
    @page { size: A4; margin: 20mm; }
  }
</style>
</head>
<body>
  <div class="header">
    <div class="company">Action Auto</div>
    <div class="doc-title">Employee Payslip</div>
  </div>

  <div class="meta-grid">
    <div class="row"><span class="meta-label">Employee</span><span class="meta-value">${u.fullName}</span></div>
    <div class="row"><span class="meta-label">Username</span><span class="meta-value">${u.username}</span></div>
    <div class="row"><span class="meta-label">Role</span><span class="meta-value">${u.role}</span></div>
    <div class="row"><span class="meta-label">Pay Period</span><span class="meta-value">${periodFull}</span></div>
    <div class="row"><span class="meta-label">Pay Date</span><span class="meta-value">${payDayLabel}</span></div>
    <div class="row"><span class="meta-label">Generated</span><span class="meta-value">${generatedAt}</span></div>
  </div>

  <p class="section-title">Earnings Breakdown</p>
  <table>
    <tr><td>Hours Rendered</td><td class="amount">${renderedFull}</td></tr>
    <tr><td>Hours Billed</td><td class="amount">${calcWholeHours} hours</td></tr>
    <tr><td>Hourly Rate</td><td class="amount">$${rateNum.toFixed(2)} / hr</td></tr>
    <tr class="total-row"><td>Gross Pay (USD)</td><td class="amount">$${payoutUSD.toFixed(2)}</td></tr>
    ${phpRow}
  </table>

  <div class="verified">✓ Hours verified via Action Auto Timeproof System — server-validated timestamps</div>

  <div class="sig-area">
    <div class="sig-box">Employee Signature</div>
    <div class="sig-box">Authorized Signature</div>
  </div>

  <div class="footer">ACTION AUTO · CONFIDENTIAL · ${new Date().getFullYear()}</div>

  <script>window.onload = function() { window.print(); }<\/script>
</body>
</html>`

    const win = window.open("", "_blank")
    if (!win) return
    win.document.write(html)
    win.document.close()
  }, [data, payoutPeriod, nowMonthLong, cutoffSummary.lastDay, calcSeconds, calcWholeHours, rateNum, payoutUSD, showPhp, payoutPHP, phpRate, payDayLabel])

  /* ── Fetch live PHP/USD rate ── */
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
    if (!showPhp && phpRate === null) {
      fetchPhpRate()
    } else {
      setShowPhp((v) => !v)
    }
  }

  /* ── Copy proof text ── */
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

  /* ── Export CSV ── */
  const exportCSV = async () => {
    const token = localStorage.getItem("crm_token")
    try {
      const res = await apiClient.get("/api/crm/timeproof/export?range=365", {
        headers: { Authorization: `Bearer ${token}` },
        responseType: "blob",
      })
      const blob = new Blob([res.data], { type: "text/csv" })
      const a = document.createElement("a")
      a.href = URL.createObjectURL(blob)
      a.download = `timeproof-${viewYear}-${String(viewMonth + 1).padStart(2, "0")}.csv`
      a.click()
    } catch { }
  }

  /* ─────────────── Loading ─────────────── */
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

  /* ─────────────── Page ─────────────── */
  return (
    <div className="min-h-screen bg-background">

      {/* ── Sticky Header ── */}
      <div className="sticky top-0 z-20 border-b border-border/40 bg-background/85 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-3">
          <button
            onClick={() => router.push("/crm/dashboard")}
            className="h-8 w-8 rounded-xl flex items-center justify-center hover:bg-muted/50 transition-colors text-muted-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>

          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-emerald-600/10 flex items-center justify-center">
              <Shield className="h-3.5 w-3.5 text-emerald-600" />
            </div>
            <span className="text-sm font-black tracking-tight">Timeproof</span>
            {data?.isLive && (
              <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-500/20">
                <Radio className="h-2.5 w-2.5 animate-pulse" />
                Live
              </span>
            )}
          </div>

          {data && (
            <p className="hidden sm:block text-[11px] text-muted-foreground/40 font-semibold ml-1 truncate">
              — {data.user.fullName.toUpperCase()}
            </p>
          )}

          <div className="ml-auto flex items-center gap-2">
            <LiveClock />
            {(data?.user.role === "admin" || data?.user.role === "manager") && (
              <button
                onClick={() => router.push("/crm/timeproof/users")}
                title="View all users"
                className="h-8 px-3 rounded-xl border border-border/40 flex items-center gap-1.5 hover:bg-muted/30 transition-colors text-muted-foreground text-[11px] font-bold"
              >
                <Users className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">View Users</span>
              </button>
            )}
            <button
              onClick={exportCSV}
              title="Export CSV"
              className="h-8 w-8 rounded-xl border border-border/40 flex items-center justify-center hover:bg-muted/30 transition-colors text-muted-foreground"
            >
              <Download className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={copyProof}
              className={`h-8 px-3 rounded-xl border flex items-center gap-1.5 text-[11px] font-bold transition-all ${copied
                  ? "border-emerald-500/40 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700"
                  : "border-border/40 hover:bg-muted/30 text-muted-foreground"
                }`}
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

              {/* Nav bar */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-border/30">
                <h2 className="text-base font-black tracking-tight">{monthLabel}</h2>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={prevMonth}
                    className="h-8 w-8 rounded-lg border border-border/40 flex items-center justify-center hover:bg-muted/50 transition-colors text-muted-foreground"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    onClick={nextMonth}
                    className="h-8 w-8 rounded-lg border border-border/40 flex items-center justify-center hover:bg-muted/50 transition-colors text-muted-foreground"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                  <button
                    onClick={goToday}
                    disabled={isCurrentMonth}
                    className="h-8 px-3 rounded-lg border border-border/40 text-[11px] font-semibold hover:bg-muted/50 transition-colors disabled:opacity-40 disabled:cursor-default text-muted-foreground"
                  >
                    Today
                  </button>
                </div>
              </div>

              {/* Month summary sub-bar */}
              <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 px-5 py-2.5 border-b border-border/20 bg-muted/10">
                <span className="text-[10px] text-muted-foreground/50">
                  Total:{" "}
                  <strong className="text-foreground/70 font-mono">{fmtHHMM(monthSummary.seconds)}</strong>
                </span>
                <span className="text-[10px] text-muted-foreground/50">
                  Active days:{" "}
                  <strong className="text-foreground/70">{monthSummary.days}</strong>
                </span>

                {/* Legend */}
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

              {/* Grid */}
              <MonthCalendar
                year={viewYear}
                month={viewMonth}
                calendar={data.calendar}
                onSelectDay={(ds) =>
                  router.push(`/crm/timeproof/${ds}?t=${data?.calendar[ds]?.totalSeconds ?? 0}`)
                }
                isLive={data.isLive}
              />
            </div>

            {/* ── Payout Calculator ── */}
            {!showPayoutCalculator ? (
              /* Locked state for non-admin users outside the payout window */
              <div className="rounded-2xl border border-border/40 bg-card p-5">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <p className="text-xs font-black tracking-tight">Payout Calculator</p>
                    <p className="text-[10px] text-muted-foreground/40 mt-0.5">
                      Estimate your earnings for a cut-off period
                    </p>
                  </div>
                  <DollarSign className="h-4 w-4 text-muted-foreground/20" />
                </div>
                <div className="flex flex-col items-center gap-3 py-5">
                  <div className="h-14 w-14 rounded-2xl bg-muted/30 border border-border/30 flex items-center justify-center">
                    <Lock className="h-6 w-6 text-muted-foreground/40" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-bold text-muted-foreground/60">Calculator Locked</p>
                    <p className="text-[11px] text-muted-foreground/40 mt-1">
                      Available starting {payoutWindow.nextUnlockLabel}
                    </p>
                    {payoutWindow.daysUntil > 0 && (
                      <p className="text-[10px] text-muted-foreground/30 mt-0.5">
                        {payoutWindow.daysUntil} day{payoutWindow.daysUntil !== 1 ? "s" : ""} from now
                      </p>
                    )}
                  </div>
                  <div className="w-full rounded-xl bg-muted/10 border border-border/20 px-4 py-3 mt-1 space-y-2">
                    <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground/30 text-center">
                      Pay Schedule
                    </p>
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
                    <p className="text-[10px] text-muted-foreground/40 mt-0.5">
                      Estimate your earnings for a cut-off period
                    </p>
                  </div>
                  <DollarSign className="h-4 w-4 text-muted-foreground/20" />
                </div>

                {/* Period selector */}
                <div className="space-y-1.5">
                  <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground/35">
                    Period
                  </p>
                  <div className="flex gap-2">
                    {([1, 2] as const).map((p) => {
                      const label = p === 1
                        ? `${calcMonthShort} 1–15`
                        : `${calcMonthShort} 16–${calcCutoffSummary.lastDay}`
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
                    Your Hourly Rate
                  </p>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-muted-foreground/50">
                      $
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={hourlyRate}
                      onChange={(e) => setHourlyRate(e.target.value)}
                      className="w-full h-9 pl-7 pr-12 rounded-xl border border-border/40 bg-muted/10 text-sm font-bold font-mono focus:outline-none focus:border-emerald-500/50 focus:bg-emerald-500/5 transition-all"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground/35">
                      / hr
                    </span>
                  </div>
                </div>

                {/* Divider + result */}
                <div className="pt-1 border-t border-border/20 space-y-3">

                  {/* Hours rendered row */}
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <span className="text-[11px] text-muted-foreground/50">Hours rendered ({calcPeriodLabel})</span>
                      {calcRemainderMins > 0 && (
                        <p className="text-[9px] text-muted-foreground/35 mt-0.5">
                          {calcRemainderMins}m not counted — whole hours only
                        </p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-[11px] font-bold font-mono text-foreground/80">
                        {fmtHHMM(calcSeconds)}
                      </span>
                      <p className="text-[9px] font-bold font-mono text-muted-foreground/40">
                        {calcWholeHours}h billed
                      </p>
                    </div>
                  </div>

                  {/* Payout amount */}
                  <div className="rounded-xl bg-muted/15 border border-border/20 px-4 py-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground/40">
                        Estimated Payout
                      </p>
                      {/* USD / PHP toggle */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={togglePhp}
                          disabled={fetchingPhp}
                          className={`h-6 px-2.5 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all border ${showPhp
                              ? "border-sky-500/40 bg-sky-500/10 text-sky-600 dark:text-sky-400"
                              : "border-border/30 text-muted-foreground/40 hover:border-border/60"
                            }`}
                        >
                          {fetchingPhp ? (
                            <RefreshCw className="h-2.5 w-2.5 animate-spin" />
                          ) : (
                            showPhp ? "PHP ✓" : "PHP"
                          )}
                        </button>
                        {showPhp && phpRate && (
                          <button
                            onClick={fetchPhpRate}
                            disabled={fetchingPhp}
                            title="Refresh rate"
                            className="h-6 w-6 rounded-lg border border-border/30 flex items-center justify-center text-muted-foreground/40 hover:text-muted-foreground transition-colors"
                          >
                            <RefreshCw className={`h-2.5 w-2.5 ${fetchingPhp ? "animate-spin" : ""}`} />
                          </button>
                        )}
                      </div>
                    </div>

                    {rateNum > 0 ? (
                      <div className="space-y-1">
                        <p className="text-2xl font-black tracking-tight text-emerald-700 dark:text-emerald-300">
                          ${payoutUSD.toFixed(2)}
                          <span className="text-xs font-bold text-muted-foreground/40 ml-1">USD</span>
                        </p>
                        {showPhp && payoutPHP !== null && (
                          <p className="text-base font-bold text-sky-700 dark:text-sky-400">
                            ₱{payoutPHP.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            <span className="text-[9px] font-semibold text-muted-foreground/35 ml-1.5">
                              1 USD = ₱{phpRate?.toFixed(2)}
                            </span>
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground/30 font-medium">
                        Enter your hourly rate above
                      </p>
                    )}
                  </div>

                  {/* Payout date */}
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50/30 dark:bg-amber-950/15 border border-amber-500/15">
                    <Scissors className="h-3 w-3 text-amber-500 shrink-0" />
                    <span className="text-[10px] text-muted-foreground/50 flex-1">
                      {payoutPeriod === 1 ? "1st–15th" : `16th–${cutoffSummary.lastDay}th`} cut-off
                    </span>
                    <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">
                      Released {calcPayoutDate}
                    </span>
                  </div>

                  {/* Payslip download */}
                  {isPayDayReached ? (
                    <button
                      onClick={printPayslip}
                      disabled={rateNum <= 0}
                      className="w-full h-10 rounded-xl border border-emerald-500/40 bg-emerald-600/10 hover:bg-emerald-600/15 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Download Payslip (PDF)
                    </button>
                  ) : (
                    <div className="w-full h-10 rounded-xl border border-border/30 bg-muted/10 flex items-center justify-center gap-2 text-[11px] text-muted-foreground/40 cursor-not-allowed select-none">
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                      Payslip available on {payDayLabel}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── Verified footer ── */}
            <div className="rounded-2xl border border-emerald-500/20 bg-gradient-to-r from-emerald-50/50 to-transparent dark:from-emerald-950/20 p-4">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-xl bg-emerald-600/10 flex items-center justify-center shrink-0">
                  <Shield className="h-3.5 w-3.5 text-emerald-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-black text-emerald-800 dark:text-emerald-300">
                    Timeproof Verified
                  </p>
                  <p className="text-[10px] text-emerald-700/50 dark:text-emerald-400/50 mt-0.5">
                    All timestamps are server-validated and IP-logged. Click any day to inspect individual sessions.
                  </p>
                </div>
                <button
                  onClick={copyProof}
                  className="shrink-0 h-8 px-3 rounded-xl bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-700 dark:text-emerald-400 text-[11px] font-bold flex items-center gap-1.5 transition-colors"
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