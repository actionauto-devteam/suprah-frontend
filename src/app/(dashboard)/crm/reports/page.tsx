"use client"

import * as React from "react"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import {
  BarChart3,
  Download,
  Loader2,
  Mail,
  MessageSquare,
  RefreshCw,
  Tag,
  TrendingDown,
  UserX,
  Users,
} from "lucide-react"
import { apiClient } from "@/lib/api-client"
import { useAuth } from "@/providers/AuthProvider"
import { cn } from "@/lib/utils"
import { mdtDayRangeUtc, todayStrMDT, fmtDateMDT, fmtLongDateMDT, fmtLongDateTimeMDT } from "@/lib/timezone"
import { useChartTheme, OverviewTooltip } from "@/components/reports/crm/LeadAnalyticsOverview"

type RangePreset = "today" | "yesterday" | "custom"

interface LeadsOverTimePoint {
  date: string
  count: number
}

interface ReportsOverview {
  range: { from: string; to: string }
  leads: {
    total: number
    byStatus: Record<string, number>
    bySource: Record<string, number>
    overTime: LeadsOverTimePoint[]
  }
  smsCampaigns: Record<string, number>
  smsDeliveryStatus: Record<string, number>
  emailCampaigns: Record<string, number>
  priceDropEmails: Record<string, number>
  vehicleReengagement: Record<string, number>
  unsubscribes: { sms: number; email: number }
}

const STATUS_COLORS: Record<string, string> = {
  sent: "#10b981",
  delivered: "#10b981",
  accepted: "#3b82f6",
  processing: "#3b82f6",
  pending: "#3b82f6",
  failed: "#ef4444",
  delivery_failed: "#ef4444",
  blocked: "#f59e0b",
  uncertain: "#f59e0b",
  skipped: "#64748b",
  sms: "#3b82f6",
  email: "#8b5cf6",
}

function statusColor(key: string, fallback: string): string {
  return STATUS_COLORS[key] || fallback
}

function sum(record: Record<string, number>): number {
  return Object.values(record).reduce((total, value) => total + value, 0)
}

function getErrorMessage(error: unknown, fallback: string) {
  return (error as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback
}

function SectionHeader({ title, description }: { title: string; description: string }) {
  return (
    <div className="mb-3">
      <h2 className="text-base font-bold text-foreground sm:text-lg">{title}</h2>
      <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
    </div>
  )
}

function KpiCard({ label, value, icon, tone }: { label: string; value: number; icon: React.ReactNode; tone: string }) {
  return (
    <div className="min-w-0 rounded-xl border border-border/80 bg-card px-3.5 py-3 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{label}</p>
        <div className={cn("flex size-7 shrink-0 items-center justify-center rounded-lg", tone)}>{icon}</div>
      </div>
      <p className="mt-1.5 text-2xl font-black tracking-tight text-foreground">{value.toLocaleString("en-US")}</p>
    </div>
  )
}

function ChartCard({ title, description, children, className }: { title: string; description?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("min-w-0 rounded-xl border border-border/80 bg-card p-4 shadow-sm sm:p-5", className)}>
      <h3 className="text-sm font-bold text-foreground sm:text-base">{title}</h3>
      {description && <p className="mt-1 text-xs text-muted-foreground sm:text-sm">{description}</p>}
      <div className="mt-4">{children}</div>
    </section>
  )
}

function EmptyChartState({ message }: { message: string }) {
  return (
    <div className="flex h-48 flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/20 px-4 text-center">
      <p className="text-sm font-semibold text-foreground">No activity in this period</p>
      <p className="mt-1 max-w-xs text-xs text-muted-foreground">{message}</p>
    </div>
  )
}

function StatusDonut({
  data,
  palette,
  emptyMessage,
  centerLabel,
}: {
  data: Record<string, number>
  palette: (key: string, index: number) => string
  emptyMessage: string
  centerLabel?: string
}) {
  const entries = Object.entries(data).filter(([, value]) => value > 0)
  const total = entries.reduce((acc, [, value]) => acc + value, 0)

  if (total === 0) return <EmptyChartState message={emptyMessage} />

  const points = entries.map(([name, value]) => ({ name, value }))

  return (
    <div className="grid min-w-0 gap-4 sm:grid-cols-[minmax(150px,0.8fr)_minmax(0,1.2fr)] sm:items-center">
      <div className="relative mx-auto size-40 shrink-0">
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <PieChart>
            <Pie data={points} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={46} outerRadius={72} paddingAngle={2} strokeWidth={0}>
              {points.map((entry, index) => (
                <Cell key={entry.name} fill={palette(entry.name, index)} />
              ))}
            </Pie>
            <Tooltip content={<OverviewTooltip />} cursor={false} allowEscapeViewBox={{ x: false, y: false }} wrapperStyle={{ zIndex: 100, pointerEvents: "none" }} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-black text-foreground">{total.toLocaleString("en-US")}</span>
          {centerLabel && <span className="text-[10px] font-semibold uppercase text-muted-foreground">{centerLabel}</span>}
        </div>
      </div>
      <div className="space-y-1.5">
        {points.map((item, index) => (
          <div key={item.name} className="flex items-center gap-2.5 rounded-lg border border-border/60 bg-muted/20 px-2.5 py-1.5 text-xs">
            <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: palette(item.name, index) }} />
            <span className="min-w-0 flex-1 truncate font-semibold capitalize text-foreground">{item.name.replace(/_/g, " ")}</span>
            <span className="shrink-0 font-bold text-foreground">
              {item.value.toLocaleString("en-US")}
              <span className="ml-1 font-medium text-muted-foreground">({((item.value / total) * 100).toFixed(0)}%)</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function CrmReportsPage() {
  const { getToken } = useAuth()
  const theme = useChartTheme()
  const gradientId = React.useId().replace(/:/g, "")

  const [preset, setPreset] = React.useState<RangePreset>("today")
  const [customFrom, setCustomFrom] = React.useState(todayStrMDT(-6))
  const [customTo, setCustomTo] = React.useState(todayStrMDT(0))
  const [overview, setOverview] = React.useState<ReportsOverview | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState("")
  const [exporting, setExporting] = React.useState(false)

  const resolvedRange = React.useMemo(() => {
    if (preset === "today") {
      const { start, end } = mdtDayRangeUtc(todayStrMDT(0))
      return { from: start, to: end }
    }
    if (preset === "yesterday") {
      const { start, end } = mdtDayRangeUtc(todayStrMDT(-1))
      return { from: start, to: end }
    }
    const { start } = mdtDayRangeUtc(customFrom)
    const { end } = mdtDayRangeUtc(customTo)
    return { from: start, to: end }
  }, [preset, customFrom, customTo])

  const loadOverview = React.useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const t = await getToken()
      const res = await apiClient.get("/api/crm/reports/overview", {
        params: { from: resolvedRange.from, to: resolvedRange.to },
        headers: { Authorization: `Bearer ${t}` },
      })
      const data = res.data?.data || res.data
      setOverview(data || null)
    } catch (err) {
      setError(getErrorMessage(err, "Could not load the CRM reports overview."))
    } finally {
      setLoading(false)
    }
  }, [getToken, resolvedRange.from, resolvedRange.to])

  React.useEffect(() => {
    void loadOverview()
  }, [loadOverview])

  const leadStatusPalette = React.useCallback((_key: string, index: number) => theme.palette[index % theme.palette.length], [theme.palette])

  const sourceChartData = React.useMemo(() => {
    if (!overview) return []
    return Object.entries(overview.leads.bySource)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10)
  }, [overview])

  const handleExport = async () => {
    if (!overview) return
    setExporting(true)
    try {
      const XLSX = await import("xlsx-js-style")
      const { createDataSheet, writeWorkbookBlob } = await import("@/components/reports/crm/shared/report-excel-utils")

      const toRows = (record: Record<string, number>) =>
        Object.entries(record).sort((a, b) => b[1] - a[1]).map(([label, count]) => ({ label, count }))

      const countColumns = [
        { label: "Category", width: 32, value: (row: { label: string }) => row.label },
        { label: "Count", width: 14, value: (row: { count: number }) => row.count, type: "number" as const },
      ]
      const trendColumns = [
        { label: "Date", width: 16, value: (row: LeadsOverTimePoint) => row.date },
        { label: "Leads", width: 14, value: (row: LeadsOverTimePoint) => row.count, type: "number" as const },
      ]

      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, createDataSheet(XLSX, overview.leads.overTime, trendColumns, "No leads in this range"), "Leads Over Time")
      XLSX.utils.book_append_sheet(workbook, createDataSheet(XLSX, toRows(overview.leads.byStatus), countColumns, "No leads in this range"), "Leads by Status")
      XLSX.utils.book_append_sheet(workbook, createDataSheet(XLSX, toRows(overview.leads.bySource), countColumns, "No leads in this range"), "Leads by Source")
      XLSX.utils.book_append_sheet(workbook, createDataSheet(XLSX, toRows(overview.smsCampaigns), countColumns, "No SMS campaign activity"), "SMS Campaigns")
      XLSX.utils.book_append_sheet(workbook, createDataSheet(XLSX, toRows(overview.smsDeliveryStatus), countColumns, "No SMS delivery confirmations"), "SMS Delivery Status")
      XLSX.utils.book_append_sheet(workbook, createDataSheet(XLSX, toRows(overview.emailCampaigns), countColumns, "No email campaign activity"), "Email Campaigns")
      XLSX.utils.book_append_sheet(workbook, createDataSheet(XLSX, toRows(overview.priceDropEmails), countColumns, "No price drop emails"), "Price Drop Emails")
      XLSX.utils.book_append_sheet(workbook, createDataSheet(XLSX, toRows(overview.vehicleReengagement), countColumns, "No re-engagement activity"), "Vehicle Re-engagement")
      XLSX.utils.book_append_sheet(workbook, createDataSheet(XLSX, [
        { label: "SMS unsubscribes", count: overview.unsubscribes.sms },
        { label: "Email unsubscribes", count: overview.unsubscribes.email },
      ], countColumns, "No unsubscribes"), "Unsubscribes")

      const blob = writeWorkbookBlob(XLSX, workbook)
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `crm-report-${resolvedRange.from.slice(0, 10)}-to-${resolvedRange.to.slice(0, 10)}.xlsx`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch {
      setError("Could not generate the Excel export.")
    } finally {
      setExporting(false)
    }
  }

  const smsHasActivity = overview ? sum(overview.smsCampaigns) > 0 : false
  const emailHasActivity = overview ? sum(overview.emailCampaigns) > 0 : false

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-lg font-semibold">
            <BarChart3 className="h-5 w-5 text-emerald-500" />
            CRM Reports
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Leads, campaigns, price drop and re-engagement activity, and unsubscribes for the selected period.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void loadOverview()}
            disabled={loading}
            className="inline-flex h-9 shrink-0 items-center gap-2 rounded-lg border border-border bg-background px-3 text-xs font-semibold text-foreground disabled:opacity-50"
            aria-label="Refresh"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
          </button>
          <button
            type="button"
            onClick={handleExport}
            disabled={exporting || loading || !overview}
            className="inline-flex h-9 shrink-0 items-center gap-2 rounded-lg bg-primary px-3.5 text-xs font-semibold text-primary-foreground shadow-sm disabled:opacity-50"
          >
            {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Export Excel
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {(["today", "yesterday", "custom"] as const).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setPreset(value)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-semibold capitalize transition-colors",
              preset === value ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground",
            )}
          >
            {value}
          </button>
        ))}
        {preset === "custom" && (
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={customFrom}
              onChange={(event) => setCustomFrom(event.target.value)}
              max={customTo}
              className="h-8 rounded-md border border-border bg-background px-2 text-xs"
            />
            <span className="text-xs text-muted-foreground">to</span>
            <input
              type="date"
              value={customTo}
              onChange={(event) => setCustomTo(event.target.value)}
              min={customFrom}
              max={todayStrMDT(0)}
              className="h-8 rounded-md border border-border bg-background px-2 text-xs"
            />
          </div>
        )}
        {overview && (
          <span className="text-xs text-muted-foreground">
            {fmtLongDateMDT(overview.range.from)} – {fmtLongDateMDT(overview.range.to)} (Mountain Time)
          </span>
        )}
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {loading && !overview ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : !overview ? (
        <p className="py-16 text-center text-sm text-muted-foreground">Nothing here yet.</p>
      ) : (
        <div className="space-y-8">
          <div>
            <SectionHeader title="Overview" description="Top-line totals for the selected period." />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              <KpiCard label="Leads" value={overview.leads.total} icon={<Users className="size-4" />} tone="bg-blue-500/10 text-blue-600 dark:text-blue-400" />
              <KpiCard label="SMS Sent" value={overview.smsCampaigns.sent || 0} icon={<MessageSquare className="size-4" />} tone="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" />
              <KpiCard label="Email Sent" value={overview.emailCampaigns.sent || 0} icon={<Mail className="size-4" />} tone="bg-violet-500/10 text-violet-600 dark:text-violet-400" />
              <KpiCard label="Price Drops" value={overview.priceDropEmails.sent || 0} icon={<TrendingDown className="size-4" />} tone="bg-rose-500/10 text-rose-600 dark:text-rose-400" />
              <KpiCard label="Re-engagement" value={overview.vehicleReengagement.sent || 0} icon={<RefreshCw className="size-4" />} tone="bg-amber-500/10 text-amber-600 dark:text-amber-400" />
              <KpiCard label="Unsubscribes" value={overview.unsubscribes.sms + overview.unsubscribes.email} icon={<UserX className="size-4" />} tone="bg-slate-500/10 text-slate-600 dark:text-slate-400" />
            </div>
          </div>

          <div>
            <SectionHeader title="Leads Analytics" description="New lead volume, pipeline status, and source mix." />
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              <ChartCard title="Leads Over Time" description="New leads created each day in the selected range." className="xl:col-span-2">
                {overview.leads.overTime.length === 0 || overview.leads.total === 0 ? (
                  <EmptyChartState message="No leads were created in this period." />
                ) : (
                  <div className="h-[260px]">
                    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                      <AreaChart data={overview.leads.overTime} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={theme.palette[1]} stopOpacity={0.32} />
                            <stop offset="95%" stopColor={theme.palette[1]} stopOpacity={0.02} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid vertical={false} stroke={theme.grid} strokeDasharray="3 3" />
                        <XAxis
                          dataKey="date"
                          tickLine={false}
                          axisLine={false}
                          tick={{ fontSize: 11, fill: theme.axis, fontWeight: 600 }}
                          tickFormatter={(value: string) => fmtDateMDT(`${value}T12:00:00.000Z`, { year: undefined })}
                          minTickGap={24}
                        />
                        <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={34} tick={{ fontSize: 11, fill: theme.axis, fontWeight: 600 }} />
                        <Tooltip
                          content={<OverviewTooltip />}
                          cursor={{ stroke: theme.cursor, strokeWidth: 1.5 }}
                          wrapperStyle={{ zIndex: 100, pointerEvents: "none" }}
                        />
                        <Area
                          type="monotone"
                          dataKey="count"
                          name="New Leads"
                          stroke={theme.palette[1]}
                          fill={`url(#${gradientId})`}
                          strokeWidth={2.5}
                          dot={{ r: 2.5, fill: theme.palette[1], stroke: theme.palette[1] }}
                          activeDot={{ r: 5, fill: "#fff", stroke: theme.palette[1], strokeWidth: 2 }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </ChartCard>

              <ChartCard title="Lead Status" description="Where leads currently sit in the pipeline.">
                <StatusDonut data={overview.leads.byStatus} palette={leadStatusPalette} emptyMessage="No leads were created in this period." centerLabel="leads" />
              </ChartCard>

              <ChartCard title="Lead Sources" description="Top 10 acquisition sources for this period.">
                {sourceChartData.length === 0 ? (
                  <EmptyChartState message="No leads with a recognized source in this period." />
                ) : (
                  <div className="h-[260px]">
                    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                      <BarChart data={sourceChartData} layout="vertical" margin={{ top: 4, right: 24, left: 8, bottom: 4 }}>
                        <CartesianGrid horizontal={false} stroke={theme.grid} strokeDasharray="3 3" />
                        <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: theme.axis, fontWeight: 600 }} />
                        <YAxis
                          type="category"
                          dataKey="name"
                          tickLine={false}
                          axisLine={false}
                          width={110}
                          tick={{ fontSize: 11, fill: theme.axis, fontWeight: 600 }}
                        />
                        <Tooltip content={<OverviewTooltip />} cursor={{ fill: theme.cursor }} wrapperStyle={{ zIndex: 100, pointerEvents: "none" }} />
                        <Bar dataKey="value" name="Leads" radius={[0, 4, 4, 0]}>
                          {sourceChartData.map((entry, index) => (
                            <Cell key={entry.name} fill={theme.palette[index % theme.palette.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </ChartCard>
            </div>
          </div>

          <div>
            <SectionHeader title="Campaign Performance" description="SMS and email campaign delivery outcomes." />
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
              <ChartCard title="SMS Campaigns" description="Send outcome by recipient status.">
                {smsHasActivity ? (
                  <StatusDonut data={overview.smsCampaigns} palette={(key, i) => statusColor(key, ["#10b981", "#ef4444", "#64748b"][i % 3])} emptyMessage="No SMS campaign activity in this period." centerLabel="recipients" />
                ) : (
                  <EmptyChartState message="No SMS campaigns were sent in this period." />
                )}
              </ChartCard>

              <ChartCard title="SMS Delivery Status" description="Carrier-confirmed outcome for sent texts.">
                {sum(overview.smsDeliveryStatus) > 0 ? (
                  <StatusDonut data={overview.smsDeliveryStatus} palette={(key, i) => statusColor(key, ["#3b82f6", "#10b981", "#ef4444"][i % 3])} emptyMessage="No carrier delivery confirmations yet." centerLabel="sent" />
                ) : (
                  <EmptyChartState message="No carrier delivery confirmations yet for this period." />
                )}
              </ChartCard>

              <ChartCard title="Email Campaigns" description="Send outcome by recipient status.">
                {emailHasActivity ? (
                  <StatusDonut data={overview.emailCampaigns} palette={(key, i) => statusColor(key, ["#10b981", "#ef4444", "#64748b", "#f59e0b"][i % 4])} emptyMessage="No email campaign activity in this period." centerLabel="recipients" />
                ) : (
                  <EmptyChartState message="No email campaigns were sent in this period." />
                )}
              </ChartCard>
            </div>
          </div>

          <div>
            <SectionHeader title="Price Drop & Re-engagement" description="Automated outreach triggered by inventory changes." />
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              <ChartCard title="Price Drop Emails" description="Outcome of automated price-drop notifications.">
                {sum(overview.priceDropEmails) > 0 ? (
                  <StatusDonut data={overview.priceDropEmails} palette={(key, i) => statusColor(key, ["#10b981", "#ef4444", "#64748b"][i % 3])} emptyMessage="No price drop emails in this period." centerLabel="emails" />
                ) : (
                  <EmptyChartState message="No vehicle price drops triggered an email in this period." />
                )}
              </ChartCard>

              <ChartCard title="Vehicle Re-engagement" description="Outcome of AI-generated re-engagement texts.">
                {sum(overview.vehicleReengagement) > 0 ? (
                  <StatusDonut data={overview.vehicleReengagement} palette={(key, i) => statusColor(key, ["#10b981", "#f59e0b", "#ef4444", "#64748b"][i % 4])} emptyMessage="No re-engagement activity in this period." centerLabel="attempts" />
                ) : (
                  <EmptyChartState message="No vehicle re-engagement activity in this period." />
                )}
              </ChartCard>
            </div>
          </div>

          <div>
            <SectionHeader title="Unsubscribes" description="Customers who opted out of automated messages." />
            <ChartCard title="SMS vs. Email Unsubscribes" description="Opt-outs recorded in this period.">
              {overview.unsubscribes.sms + overview.unsubscribes.email > 0 ? (
                <StatusDonut
                  data={{ sms: overview.unsubscribes.sms, email: overview.unsubscribes.email }}
                  palette={(key, i) => statusColor(key, ["#3b82f6", "#8b5cf6"][i % 2])}
                  emptyMessage="No unsubscribes in this period."
                  centerLabel="opt-outs"
                />
              ) : (
                <EmptyChartState message="No customers unsubscribed in this period." />
              )}
            </ChartCard>
          </div>

          <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Tag className="size-3" />
            Generated {fmtLongDateTimeMDT(new Date().toISOString())} (Mountain Time). Demo Lab leads are excluded from the Leads totals.
          </p>
        </div>
      )}
    </div>
  )
}
