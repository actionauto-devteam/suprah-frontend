"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  CheckCircle2,
  Lock,
  Unlock,
  ShieldAlert,
  Search,
  X,
  Wallet,
  AlertTriangle,
} from "lucide-react"
import { apiClient } from "@/lib/api-client"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { resolveImageUrl, cn } from "@/lib/utils"
import { useCrmUser } from "@/hooks/useCrmUser"
import { fmtHHMM } from "@/components/crm/timeproof/shared"

interface PayrollRow {
  userId: string
  fullName: string
  username: string
  avatar?: string
  role: string
  department?: string
  payrollLocation?: "Utah" | "Philippines" | null
  totalSeconds: number
  hourlyRate: number | null
  payout: number | null
  otPremiumSeconds: number
  otPremiumPay: number
  flaggedWeeks: { weekEndingDate: string; weekTotalSeconds: number }[]
  status: "open" | "paid" | "auto-locked" | "unlocked"
  lockedAt: string | null
  lockedByName: string | null
  unlockReason: string | null
}

const ini = (name: string) => name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)

function StatusBadge({ row }: { row: PayrollRow }) {
  if (row.status === "paid") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
        <CheckCircle2 className="h-2.5 w-2.5" /> Paid
      </span>
    )
  }
  if (row.status === "auto-locked") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
        <Lock className="h-2.5 w-2.5" /> Locked
      </span>
    )
  }
  if (row.status === "unlocked") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20">
        <ShieldAlert className="h-2.5 w-2.5" /> Unlocked
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
      Not Paid
    </span>
  )
}

export default function PayrollStatusPage() {
  const router = useRouter()
  const { user: currentUser } = useCrmUser()
  const isAdmin = currentUser?.role === "admin"

  const now = new Date()
  const [year, setYear] = React.useState(now.getFullYear())
  const [month, setMonth] = React.useState(now.getMonth())
  const [periodNumber, setPeriodNumber] = React.useState<1 | 2>(now.getDate() <= 15 ? 1 : 2)

  const [rows, setRows] = React.useState<PayrollRow[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState("")
  const [searchQuery, setSearchQuery] = React.useState("")
  const [teamTab, setTeamTab] = React.useState<"all" | "Utah" | "Philippines">("all")
  const [busyUserId, setBusyUserId] = React.useState<string | null>(null)
  const [unlockTarget, setUnlockTarget] = React.useState<PayrollRow | null>(null)
  const [unlockReason, setUnlockReason] = React.useState("")
  const [unlockSubmitting, setUnlockSubmitting] = React.useState(false)

  const monthLabel = new Date(Date.UTC(year, month, 1)).toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" })
  const periodLabel = periodNumber === 1 ? "1st – 15th" : `16th – end of month`

  const fetchData = React.useCallback(async () => {
    const token = localStorage.getItem("crm_token")
    if (!token) { router.replace("/crm"); return }
    setLoading(true)
    try {
      const res = await apiClient.get("/api/crm/timeproof/payroll-status", {
        headers: { Authorization: `Bearer ${token}` },
        params: { year, month, periodNumber },
      })
      setRows(res.data?.data?.users || [])
      setError("")
    } catch (e: any) {
      setError(e?.response?.data?.message || "Failed to load payroll status.")
    } finally {
      setLoading(false)
    }
  }, [router, year, month, periodNumber])

  React.useEffect(() => { fetchData() }, [fetchData])

  const goPrevPeriod = () => {
    if (periodNumber === 2) { setPeriodNumber(1) } else {
      setPeriodNumber(2)
      if (month === 0) { setMonth(11); setYear((y) => y - 1) } else { setMonth((m) => m - 1) }
    }
  }
  const goNextPeriod = () => {
    if (periodNumber === 1) { setPeriodNumber(2) } else {
      setPeriodNumber(1)
      if (month === 11) { setMonth(0); setYear((y) => y + 1) } else { setMonth((m) => m + 1) }
    }
  }

  const filteredRows = React.useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    const byTeam = teamTab === "all" ? rows : rows.filter((r) => r.payrollLocation === teamTab)
    return q ? byTeam.filter((r) => r.fullName.toLowerCase().includes(q)) : byTeam
  }, [rows, searchQuery, teamTab])

  const paidCount = filteredRows.filter((r) => r.status === "paid").length
  const notPaidCount = filteredRows.length - paidCount

  const markPaid = async (row: PayrollRow) => {
    const token = localStorage.getItem("crm_token")
    if (!token) return
    setBusyUserId(row.userId)
    try {
      await apiClient.post(`/api/crm/timeproof/user/${row.userId}/mark-paid`, { year, month, periodNumber }, {
        headers: { Authorization: `Bearer ${token}` },
      })
      await fetchData()
    } catch (e: any) {
      setError(e?.response?.data?.message || "Failed to mark as paid")
    } finally {
      setBusyUserId(null)
    }
  }

  const submitUnlock = async () => {
    if (!unlockTarget || !unlockReason.trim()) return
    const token = localStorage.getItem("crm_token")
    if (!token) return
    setUnlockSubmitting(true)
    try {
      await apiClient.post(`/api/crm/timeproof/user/${unlockTarget.userId}/unlock-period`, {
        year, month, periodNumber, reason: unlockReason.trim(),
      }, { headers: { Authorization: `Bearer ${token}` } })
      setUnlockTarget(null)
      setUnlockReason("")
      await fetchData()
    } catch (e: any) {
      setError(e?.response?.data?.message || "Failed to unlock period")
    } finally {
      setUnlockSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-background timeproof-scope">
      {/* Header — two rows on every screen size so the search box can never
          force the title/back-button off-screen on a narrow phone. */}
      <div
        className="sticky top-0 z-20 border-b border-border/60 bg-background/90 backdrop-blur-md"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="max-w-5xl mx-auto px-4">
          <div className="h-14 flex items-center gap-3">
            <button
              onClick={() => router.push("/crm/timeproof/users")}
              className="h-9 w-9 shrink-0 rounded-xl flex items-center justify-center hover:bg-muted/40 transition-colors text-muted-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div className="h-7 w-7 shrink-0 rounded-lg bg-emerald-600/10 flex items-center justify-center">
                <Wallet className="h-3.5 w-3.5 text-emerald-500" />
              </div>
              <span className="text-sm font-black tracking-tight text-foreground truncate">Payroll Status</span>
            </div>
            <button onClick={fetchData} className="shrink-0 h-9 w-9 rounded-xl border border-border flex items-center justify-center hover:bg-muted/30 transition-colors text-muted-foreground" title="Refresh">
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="pb-3">
            <div className="relative w-full sm:w-44">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search name..."
                className="h-9 pl-8 pr-7 w-full rounded-xl border border-border bg-muted/30 text-foreground/80 text-[11px] font-bold placeholder:text-muted-foreground placeholder:font-medium focus:outline-none focus:border-ring/50"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 rounded-full bg-muted hover:bg-muted-foreground/20 flex items-center justify-center text-muted-foreground">
                  <X className="h-2.5 w-2.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-5 space-y-5">
        {/* Utah / Philippines / All team tabs */}
        <div className="flex items-center gap-1">
          {([
            { key: "all", label: "All Teams" },
            { key: "Utah", label: "Utah" },
            { key: "Philippines", label: "Philippines" },
          ] as const).map((t) => (
            <button
              key={t.key}
              onClick={() => setTeamTab(t.key)}
              className={cn(
                "h-8 px-3 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-colors",
                teamTab === t.key
                  ? "bg-emerald-600 text-white"
                  : "text-muted-foreground hover:bg-muted/40"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Period selector */}
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-border/60 bg-card px-4 py-3">
          <button onClick={goPrevPeriod} className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-muted/40 text-muted-foreground">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="text-center">
            <p className="text-sm font-black text-foreground">{monthLabel}</p>
            <p className="text-[11px] text-muted-foreground font-semibold">{periodLabel} cut-off</p>
          </div>
          <button onClick={goNextPeriod} className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-muted/40 text-muted-foreground">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Summary chips */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-border/60 bg-card px-4 py-3">
            <p className="text-xl font-black tabular-nums text-emerald-600 dark:text-emerald-400">{paidCount}</p>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mt-0.5">Paid</p>
          </div>
          <div className="rounded-2xl border border-border/60 bg-card px-4 py-3">
            <p className="text-xl font-black tabular-nums text-blue-600 dark:text-blue-400">{notPaidCount}</p>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mt-0.5">Not Paid</p>
          </div>
        </div>

        {error && (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-600 dark:text-red-400">{error}</div>
        )}

        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-16 rounded-2xl bg-card border border-border/40 animate-pulse" />
            ))}
          </div>
        ) : filteredRows.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-16">No employees found.</p>
        ) : (
          <div className="space-y-2">
            {filteredRows.map((row) => (
              <div key={row.userId} className="rounded-2xl border border-border/60 bg-card px-4 py-3 flex items-center gap-3 flex-wrap">
                <Avatar className="h-9 w-9 border border-border/50 shrink-0">
                  {row.avatar && <AvatarImage src={resolveImageUrl(row.avatar)} alt={row.fullName} />}
                  <AvatarFallback className="bg-muted text-foreground/80 text-xs font-bold">{ini(row.fullName)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-foreground truncate">{row.fullName}</p>
                  <p className="text-[10px] text-muted-foreground">{row.department || "—"}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold font-mono text-foreground">{fmtHHMM(row.totalSeconds)}</p>
                  <p className="text-[10px] text-muted-foreground">hours</p>
                </div>
                <div className="text-right shrink-0 w-20">
                  <p className="text-sm font-bold font-mono text-emerald-600 dark:text-emerald-400">
                    {row.payout != null ? `$${row.payout.toFixed(2)}` : "—"}
                  </p>
                  {row.otPremiumPay > 0 ? (
                    <p className="text-[9px] font-bold text-amber-600 dark:text-amber-400">+${row.otPremiumPay.toFixed(2)} OT</p>
                  ) : (
                    <p className="text-[10px] text-muted-foreground">{row.hourlyRate != null ? `$${row.hourlyRate}/hr` : "no rate"}</p>
                  )}
                </div>
                {row.flaggedWeeks.length > 0 && (
                  <span
                    title={`Over 43h this week: ${row.flaggedWeeks.map((w) => `${fmtHHMM(w.weekTotalSeconds)} (week ending ${w.weekEndingDate})`).join(", ")}`}
                    className="shrink-0 inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                  >
                    <AlertTriangle className="h-2.5 w-2.5" /> OT Watch
                  </span>
                )}
                <div className="shrink-0"><StatusBadge row={row} /></div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {row.status !== "paid" && (
                    <button
                      onClick={() => markPaid(row)}
                      disabled={busyUserId === row.userId}
                      className="h-8 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold flex items-center gap-1.5 transition-colors disabled:opacity-50"
                    >
                      {busyUserId === row.userId ? <RefreshCw className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                      Mark as Paid
                    </button>
                  )}
                  {isAdmin && (row.status === "paid" || row.status === "auto-locked") && (
                    <button
                      onClick={() => { setUnlockTarget(row); setUnlockReason("") }}
                      className="h-8 px-3 rounded-lg border border-amber-500/40 text-amber-500 hover:bg-amber-500/10 text-[11px] font-bold flex items-center gap-1.5 transition-colors"
                    >
                      <Unlock className="h-3 w-3" />
                      Unlock
                    </button>
                  )}
                </div>
                {row.status === "unlocked" && row.unlockReason && (
                  <p className="w-full text-[10px] text-amber-500/80 bg-amber-500/5 border border-amber-500/15 rounded-lg px-2.5 py-1.5">
                    Unlocked by {row.lockedByName || "admin"}: {row.unlockReason}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Emergency unlock modal */}
      {unlockTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !unlockSubmitting && setUnlockTarget(null)} />
          <div className="relative w-full max-w-sm rounded-2xl border border-border bg-popover p-5 space-y-4">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-amber-500" />
              <p className="text-sm font-black text-foreground">Emergency Unlock</p>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              This reopens <strong className="text-foreground">{unlockTarget.fullName}&apos;s</strong> already-processed period for correction. It will stay unlocked until you mark it paid again. This action is logged.
            </p>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Reason (required)</label>
              <textarea
                value={unlockReason}
                onChange={(e) => setUnlockReason(e.target.value)}
                rows={3}
                placeholder="Why does this need to be reopened?"
                className="w-full rounded-xl border border-border bg-background text-foreground text-[12px] p-3 focus:outline-none focus:border-amber-500/50 resize-none"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setUnlockTarget(null)}
                disabled={unlockSubmitting}
                className="flex-1 h-9 rounded-xl border border-border text-[11px] font-bold text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={submitUnlock}
                disabled={unlockSubmitting || !unlockReason.trim()}
                className="flex-1 h-9 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
              >
                {unlockSubmitting ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Unlock className="h-3 w-3" />}
                Unlock
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
