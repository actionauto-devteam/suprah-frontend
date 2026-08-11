"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, RefreshCw, Download, TrendingUp } from "lucide-react"
import { apiClient } from "@/lib/api-client"
import { fmtHHMM, toDateStr, MDT_OFFSET_MS } from "@/components/crm/timeproof/shared"
import { cn } from "@/lib/utils"

interface OvertimeRow {
  userId: string
  fullName: string
  username: string
  department?: string
  payrollLocation?: "Utah" | "Philippines" | null
  totalWorkedSeconds: number
  overtimeSeconds: number
}

// Most recently completed Sunday, in company-local (MDT) terms — computed from
// the real "now" instant so toDateStr only shifts once, not twice.
function getDefaultWeekStart(): string {
  const now = new Date()
  const mdtNow = new Date(now.getTime() + MDT_OFFSET_MS)
  const dayOfWeek = mdtNow.getUTCDay() // 0 = Sunday
  const sundayReal = new Date(now.getTime() - dayOfWeek * 24 * 60 * 60 * 1000)
  return toDateStr(sundayReal)
}

function fmtWeekLabel(dateStr: string) {
  return new Date(dateStr + "T12:00:00Z").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" })
}

// "Aug 3-9, 2026" (or "Aug 31-Sep 6, 2026" when the week crosses a month boundary)
function fmtShortDateRange(startStr: string, endStr: string | null) {
  const start = new Date(startStr + "T12:00:00Z")
  const startMonth = start.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" })
  const startDay = start.getUTCDate()
  const year = start.getUTCFullYear()
  if (!endStr) return `${startMonth} ${startDay}, ${year}`

  const end = new Date(endStr + "T12:00:00Z")
  const endMonth = end.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" })
  const endDay = end.getUTCDate()
  const endYear = end.getUTCFullYear()

  if (startMonth === endMonth && year === endYear) return `${startMonth} ${startDay}-${endDay}, ${year}`
  return `${startMonth} ${startDay}-${endMonth} ${endDay}, ${endYear}`
}

function OvertimeTable({ title, rows }: { title: string; rows: OvertimeRow[] }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card overflow-hidden">
      <div className="px-4 py-3 border-b border-border/40">
        <h3 className="text-sm font-black text-foreground">{title}</h3>
      </div>
      {rows.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-10">No employees found for this team.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/30 bg-muted/20">
                <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Employee</th>
                <th className="px-4 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Total Worked Hrs</th>
                <th className="px-4 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Overtime Hrs</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.userId}
                  className={cn(
                    "border-b border-border/20 last:border-0",
                    r.overtimeSeconds > 0 && "bg-red-500/5"
                  )}
                >
                  <td className="px-4 py-2.5">
                    <p className="text-xs font-bold text-foreground">{r.fullName}</p>
                    <p className="text-[10px] text-muted-foreground">{r.department || "—"}</p>
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-xs font-bold text-foreground">
                    {fmtHHMM(r.totalWorkedSeconds)}
                  </td>
                  <td className={cn("px-4 py-2.5 text-right font-mono text-xs font-bold", r.overtimeSeconds > 0 ? "text-red-600 dark:text-red-400" : "text-muted-foreground")}>
                    {r.overtimeSeconds > 0 ? fmtHHMM(r.overtimeSeconds) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

type TeamFilter = "all" | "Utah" | "Philippines"

export default function OvertimeReportPage() {
  const router = useRouter()
  const [weekStart, setWeekStart] = React.useState(getDefaultWeekStart())
  const [weekEnd, setWeekEnd] = React.useState<string | null>(null)
  const [rows, setRows] = React.useState<OvertimeRow[] | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState("")
  const [teamFilter, setTeamFilter] = React.useState<TeamFilter>("all")

  const generate = React.useCallback(async () => {
    const token = localStorage.getItem("crm_token")
    if (!token) { router.replace("/crm"); return }
    setLoading(true)
    setError("")
    try {
      const res = await apiClient.get("/api/crm/timeproof/weekly-overtime-report", {
        headers: { Authorization: `Bearer ${token}` },
        params: { weekStart },
      })
      setRows(res.data?.data?.employees || [])
      setWeekEnd(res.data?.data?.weekEnd || null)
    } catch (e: any) {
      setError(e?.response?.data?.message || "Failed to generate report.")
      setRows(null)
    } finally {
      setLoading(false)
    }
  }, [router, weekStart])

  const utahRows = React.useMemo(() => (rows || []).filter((r) => r.payrollLocation === "Utah"), [rows])
  const phRows = React.useMemo(() => (rows || []).filter((r) => r.payrollLocation === "Philippines"), [rows])
  const showUtah = teamFilter === "all" || teamFilter === "Utah"
  const showPh = teamFilter === "all" || teamFilter === "Philippines"

  const exportPdf = async () => {
    if (!rows) return
    const { jsPDF } = await import("jspdf")
    const autoTable = (await import("jspdf-autotable")).default
    const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "letter" })
    const label = weekEnd ? `${fmtWeekLabel(weekStart)} - ${fmtWeekLabel(weekEnd)}` : fmtWeekLabel(weekStart)

    let y = 40
    doc.setFont("helvetica", "bold")
    doc.setFontSize(16)
    doc.text("Weekly Overtime Report", 40, y)
    doc.setFont("helvetica", "normal")
    doc.setFontSize(10)
    y += 20
    doc.text(label, 40, y)
    y += 20

    const addTeamTable = (title: string, teamRows: OvertimeRow[]) => {
      doc.setFont("helvetica", "bold")
      doc.setFontSize(12)
      doc.text(title, 40, y)
      autoTable(doc, {
        startY: y + 10,
        head: [["Employee", "Total Worked Hrs", "Overtime Hrs"]],
        body: teamRows.map((r) => [r.fullName, fmtHHMM(r.totalWorkedSeconds), r.overtimeSeconds > 0 ? fmtHHMM(r.overtimeSeconds) : "—"]),
        styles: { fontSize: 9, cellPadding: 5 },
        headStyles: { fillColor: [5, 150, 105], textColor: 255, fontStyle: "bold" },
        didParseCell: (data) => {
          if (data.section === "body" && teamRows[data.row.index]?.overtimeSeconds > 0) {
            data.cell.styles.fillColor = [254, 226, 226]
          }
        },
        margin: { left: 40, right: 40 },
      })
      y = (doc as any).lastAutoTable.finalY + 30
    }

    if (showUtah) addTeamTable("Utah Team", utahRows)
    if (showPh) addTeamTable("Philippines Team", phRows)

    const teamLabel = teamFilter === "all" ? "All Teams" : teamFilter
    doc.save(`Overtime Report - ${teamLabel} - ${fmtShortDateRange(weekStart, weekEnd)}.pdf`)
  }

  return (
    <div className="min-h-screen bg-background timeproof-scope">
      <div
        className="sticky top-0 z-20 border-b border-border/60 bg-background/90 backdrop-blur-md"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-3">
          <button
            onClick={() => router.push("/crm/timeproof/users")}
            className="h-9 w-9 shrink-0 rounded-xl flex items-center justify-center hover:bg-muted/40 transition-colors text-muted-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="h-7 w-7 shrink-0 rounded-lg bg-emerald-600/10 flex items-center justify-center">
              <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
            </div>
            <span className="text-sm font-black tracking-tight text-foreground truncate">Weekly Overtime Report</span>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-5 space-y-5">
        <div className="flex items-center gap-1">
          {([
            { key: "all", label: "All Teams" },
            { key: "Utah", label: "Utah" },
            { key: "Philippines", label: "Philippines" },
          ] as const).map((t) => (
            <button
              key={t.key}
              onClick={() => setTeamFilter(t.key)}
              className={cn(
                "h-8 px-3 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-colors",
                teamFilter === t.key
                  ? "bg-emerald-600 text-white"
                  : "text-muted-foreground hover:bg-muted/40"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="rounded-2xl border border-border/60 bg-card px-4 py-3 flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Week Starting (Sunday)</label>
            <input
              type="date"
              value={weekStart}
              onChange={(e) => setWeekStart(e.target.value)}
              className="h-9 px-3 rounded-xl border border-border bg-muted/30 text-foreground/80 text-[12px] font-bold"
            />
          </div>
          <button
            onClick={generate}
            disabled={loading}
            className="h-9 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[12px] font-bold flex items-center gap-1.5 transition-colors disabled:opacity-50"
          >
            {loading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <TrendingUp className="h-3.5 w-3.5" />}
            Generate Report
          </button>
          {rows && rows.length > 0 && (
            <button
              onClick={exportPdf}
              className="h-9 px-4 rounded-xl border border-border text-[12px] font-bold flex items-center gap-1.5 hover:bg-muted/30 transition-colors text-muted-foreground hover:text-foreground"
            >
              <Download className="h-3.5 w-3.5" />
              Export PDF
            </button>
          )}
        </div>

        {error && (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-600 dark:text-red-400">{error}</div>
        )}

        {rows === null && !loading && !error && (
          <p className="text-center text-sm text-muted-foreground py-16">Pick a week and click "Generate Report" to begin.</p>
        )}

        {rows !== null && (
          <div className="space-y-4">
            {showUtah && <OvertimeTable title="Utah Team — Overtime Report" rows={utahRows} />}
            {showPh && <OvertimeTable title="Philippines Team — Overtime Report" rows={phRows} />}
          </div>
        )}
      </div>
    </div>
  )
}
