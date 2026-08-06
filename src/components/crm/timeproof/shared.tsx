"use client"

import * as React from "react"
import { ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

/* ─────────────────────────────────────────────────────────────────────────
   Shared types/utilities/components between the employee TimeProof clock
   page and the admin per-user TimeProof view — previously duplicated
   verbatim across both files.
───────────────────────────────────────────────────────────────────────── */

export interface DayData {
  sessions: { in: string; out: string | null; duration: number; isLive: boolean }[]
  totalSeconds: number
  breakSeconds?: number
  weekTotalSeconds?: number
}

export const MDT_OFFSET_MS = -6 * 60 * 60 * 1000
export const toMDTDate = (d: Date) => new Date(d.getTime() + MDT_OFFSET_MS)

export const toDateStr = (d: Date) => {
  const m = toMDTDate(d)
  return `${m.getUTCFullYear()}-${String(m.getUTCMonth() + 1).padStart(2, "0")}-${String(m.getUTCDate()).padStart(2, "0")}`
}

// A day's break badge on the calendar (grid or mobile list) turns red once
// that day's total break time hit 1h10m+ — 10 minutes past the official 1h
// limit, matching the grace window already used elsewhere (admin gets
// notified at 1h05m; this is a visually louder, retrospective flag once it
// went further still). Below this it stays the normal orange.
export const BREAK_OVER_LIMIT_SECONDS = 70 * 60

// De-minimis cutoff for leftover minutes past a full hour, mirrors backend's
// computeExactPayout. 0 = no cutoff (pay every exact minute) until Erik gives a number.
export const PAYROLL_DE_MINIMIS_SECONDS = 0
export function computeExactPayout(totalSeconds: number, hourlyRate: number) {
  const wholeHourSeconds = Math.floor(totalSeconds / 3600) * 3600
  const remainderSeconds = totalSeconds - wholeHourSeconds
  const payableSeconds = wholeHourSeconds + (remainderSeconds < PAYROLL_DE_MINIMIS_SECONDS ? 0 : remainderSeconds)
  return (payableSeconds / 3600) * hourlyRate
}

export const fmtHHMM = (seconds: number) => {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
}

export const fmtHuman = (seconds: number) => {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h === 0 && m === 0) return "0m"
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

export const getDayColor = (seconds: number, isToday: boolean) => {
  if (isToday && seconds === 0)
    return { bg: "bg-amber-400/10 border-amber-400/40", bar: "bg-muted/40", text: "text-muted-foreground/75" }
  if (seconds === 0) return { bg: "", bar: "", text: "" }
  return { bg: "bg-blue-950/[0.07] border-blue-500/20", bar: "bg-blue-700", text: "text-white" }
}

export const StatCard = ({ label, value, sub, icon: Icon, accent = false, amber = false }: {
  label: string; value: string; sub?: string; icon: React.ElementType; accent?: boolean; amber?: boolean
}) => (
  <div className={`rounded-xl border px-4 py-3.5 space-y-2 ${
    accent ? "border-emerald-500/30 bg-emerald-50/60 dark:bg-emerald-950/20"
    : amber ? "border-amber-500/25 bg-amber-50/40 dark:bg-amber-950/15"
    : "border-border/40 bg-card"}`}>
    <div className="flex items-center justify-between">
      <p className="text-[11px] font-black uppercase tracking-[0.22em] text-muted-foreground/75">{label}</p>
      <Icon className={`h-3.5 w-3.5 ${accent ? "text-emerald-600" : amber ? "text-amber-500" : "text-muted-foreground/70"}`} />
    </div>
    <p className={`text-2xl font-black tracking-tight leading-none ${
      accent ? "text-emerald-700 dark:text-emerald-300" : amber ? "text-amber-700 dark:text-amber-300" : ""}`}>
      {value}
    </p>
    {sub && <p className="text-[12px] text-muted-foreground/75 leading-none">{sub}</p>}
  </div>
)

/* ─────────────────────────────────────────────────────────────────────────
   Payslip HTML template — previously duplicated verbatim between the
   employee TimeProof page and the admin per-user page.
───────────────────────────────────────────────────────────────────────── */
export function generatePayslipHtml(p: {
  fullName: string
  username: string
  role: string
  periodFull: string
  payDayLabel: string
  renderedFull: string
  billedLabel: string
  rateNum: number
  payoutUSD: number
  phpPayout?: { amountPHP: number; rate: number } | null
}): string {
  const generatedAt = new Date().toLocaleString("en-US", {
    month: "long", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true,
  })
  const phpRow = p.phpPayout
    ? `<tr><td>Gross Pay (PHP)</td><td class="amount">₱${p.phpPayout.amountPHP.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td></tr>
       <tr class="note-row"><td>Exchange Rate</td><td class="amount">1 USD = ₱${p.phpPayout.rate.toFixed(2)}</td></tr>`
    : ""

  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8">
<title>Payslip — ${p.fullName} — ${p.periodFull}</title>
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
  @media print { body { padding: 24px 32px; } @page { size: A4; margin: 20mm; } }
</style></head><body>
  <div class="header"><div class="company">Action Auto</div><div class="doc-title">Employee Payslip</div></div>
  <div class="meta-grid">
    <div class="row"><span class="meta-label">Employee</span><span class="meta-value">${p.fullName}</span></div>
    <div class="row"><span class="meta-label">Username</span><span class="meta-value">${p.username}</span></div>
    <div class="row"><span class="meta-label">Role</span><span class="meta-value">${p.role}</span></div>
    <div class="row"><span class="meta-label">Pay Period</span><span class="meta-value">${p.periodFull}</span></div>
    <div class="row"><span class="meta-label">Pay Date</span><span class="meta-value">${p.payDayLabel}</span></div>
    <div class="row"><span class="meta-label">Generated</span><span class="meta-value">${generatedAt}</span></div>
  </div>
  <p class="section-title">Earnings Breakdown</p>
  <table>
    <tr><td>Hours Rendered</td><td class="amount">${p.renderedFull}</td></tr>
    <tr><td>Hours Billed</td><td class="amount">${p.billedLabel}</td></tr>
    <tr><td>Hourly Rate</td><td class="amount">$${p.rateNum.toFixed(2)} / hr</td></tr>
    <tr class="total-row"><td>Gross Pay (USD)</td><td class="amount">$${p.payoutUSD.toFixed(2)}</td></tr>
    ${phpRow}
  </table>
  <div class="verified">✓ Hours verified via Action Auto Timeproof System — server-validated timestamps</div>
  <div class="sig-area">
    <div class="sig-box">Employee Signature</div>
    <div class="sig-box">Authorized Signature</div>
  </div>
  <div class="footer">ACTION AUTO · CONFIDENTIAL · ${new Date().getFullYear()}</div>
  <script>window.onload = function() { window.print(); }<\/script>
</body></html>`
}

/** Opens a new tab and writes the given HTML into it (used for print/PDF exports). */
export function openHtmlForPrint(html: string) {
  const win = window.open("", "_blank")
  if (!win) return
  win.document.write(html)
  win.document.close()
}

/* ─────────────────────────────────────────────────────────────────────────
   Timecard (pay-period summary) — per-day breakdown table requested by HR
   as an ADP-style report: Day / Time In / Time Out / Total Break / Total,
   plus a Total Hours / Total Income footer, for an arbitrary date range.
───────────────────────────────────────────────────────────────────────── */
export interface TimecardRow {
  dateStr: string
  dayLabel: string
  timeIn: string
  timeOut: string
  totalBreak: string
  totalSeconds: number
  total: string
}

const fmtMDTTime = (iso: string) => {
  const d = toMDTDate(new Date(iso))
  let h = d.getUTCHours()
  const m = d.getUTCMinutes()
  const ampm = h >= 12 ? "PM" : "AM"
  h = h % 12
  if (h === 0) h = 12
  return `${h}:${String(m).padStart(2, "0")} ${ampm}`
}

const fmtHHMMSS = (seconds: number) => {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
}

/** Builds one row per calendar day from startDateStr to endDateStr (inclusive), both "YYYY-MM-DD". */
export function buildTimecardRows(calendar: Record<string, DayData>, startDateStr: string, endDateStr: string): TimecardRow[] {
  const rows: TimecardRow[] = []
  const cursor = new Date(startDateStr + "T12:00:00.000Z")
  const end = new Date(endDateStr + "T12:00:00.000Z")
  while (cursor.getTime() <= end.getTime()) {
    const dateStr = `${cursor.getUTCFullYear()}-${String(cursor.getUTCMonth() + 1).padStart(2, "0")}-${String(cursor.getUTCDate()).padStart(2, "0")}`
    const weekday = cursor.toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" })
    const day = calendar[dateStr]
    const sessions = day?.sessions ?? []

    const timeIn = sessions.length ? sessions.map((s) => fmtMDTTime(s.in)).join(" / ") : "—"
    const timeOut = sessions.length
      ? sessions.map((s) => (s.out ? fmtMDTTime(s.out) : s.isLive ? "Active" : "—")).join(" / ")
      : "—"

    rows.push({
      dateStr,
      dayLabel: weekday,
      timeIn,
      timeOut,
      totalBreak: fmtHHMM(day?.breakSeconds ?? 0),
      totalSeconds: day?.totalSeconds ?? 0,
      total: fmtHHMMSS(day?.totalSeconds ?? 0),
    })

    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }
  return rows
}

export function generateTimecardHtml(p: {
  fullName: string
  rateNum: number
  startDateStr: string
  endDateStr: string
  rows: TimecardRow[]
  /** Set false for an on-screen preview (e.g. inside an iframe) so it doesn't
   *  immediately pop the print dialog on every re-render. Defaults to true. */
  autoPrint?: boolean
}): string {
  const totalSeconds = p.rows.reduce((sum, r) => sum + r.totalSeconds, 0)
  const totalWholeHours = Math.floor(totalSeconds / 3600)
  const totalIncome = totalWholeHours * p.rateNum
  const generatedAt = new Date().toLocaleString("en-US", {
    month: "long", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true,
  })

  const rowsHtml = p.rows.map((r, i) => `
    <tr>
      <td>${i + 1} — ${r.dayLabel}</td>
      <td>${r.timeIn}</td>
      <td>${r.timeOut}</td>
      <td>${r.totalBreak}</td>
      <td class="amount">${r.total}</td>
    </tr>`).join("")

  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8">
<title>Timecard — ${p.fullName} — ${p.startDateStr} to ${p.endDateStr}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, Helvetica, sans-serif; color: #111; background: #fff; padding: 48px 56px; max-width: 820px; margin: 0 auto; }
  .header { text-align: center; padding-bottom: 20px; border-bottom: 2px solid #111; margin-bottom: 24px; }
  .company { font-size: 22px; font-weight: 900; letter-spacing: 4px; text-transform: uppercase; }
  .doc-title { font-size: 12px; letter-spacing: 3px; text-transform: uppercase; color: #555; margin-top: 4px; }
  .meta-grid { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 6px 24px; margin-bottom: 24px; }
  .meta-grid .row { display: flex; flex-direction: column; gap: 1px; }
  .meta-label { font-size: 9px; text-transform: uppercase; letter-spacing: 1.5px; color: #888; font-weight: 700; }
  .meta-value { font-size: 13px; font-weight: 600; color: #111; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
  thead td { font-size: 9px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px; color: #555; border-bottom: 2px solid #111; padding: 8px 10px; }
  table td { padding: 8px 10px; font-size: 11.5px; border-bottom: 1px solid #eee; }
  table td:first-child { color: #222; font-weight: 600; }
  table td.amount { text-align: right; font-family: 'Courier New', monospace; font-weight: 700; }
  .totals { display: flex; justify-content: space-between; border-top: 2px solid #111; padding-top: 14px; margin-top: 4px; }
  .totals .item { font-size: 13px; font-weight: 900; }
  .verified { background: #f0fdf4; border: 1px solid #86efac; border-radius: 6px; padding: 10px 14px; font-size: 10px; color: #166534; margin: 24px 0; }
  .sig-area { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 8px; }
  .sig-box { border-top: 1px solid #bbb; padding-top: 6px; font-size: 10px; color: #888; text-align: center; }
  .footer { text-align: center; font-size: 9px; color: #bbb; margin-top: 32px; border-top: 1px solid #eee; padding-top: 12px; letter-spacing: 1px; }
  @media print { body { padding: 24px 32px; } @page { size: A4 landscape; margin: 16mm; } }
</style></head><body>
  <div class="header"><div class="company">Action Auto</div><div class="doc-title">Timecard — Pay Period Summary</div></div>
  <div class="meta-grid">
    <div class="row"><span class="meta-label">Employee</span><span class="meta-value">${p.fullName}</span></div>
    <div class="row"><span class="meta-label">Rate / hr</span><span class="meta-value">$${p.rateNum.toFixed(2)}</span></div>
    <div class="row"><span class="meta-label">Date Start</span><span class="meta-value">${p.startDateStr}</span></div>
    <div class="row"><span class="meta-label">Date End</span><span class="meta-value">${p.endDateStr}</span></div>
  </div>
  <table>
    <thead><tr><td>Day</td><td>Time In</td><td>Time Out</td><td>Total Break</td><td>Total</td></tr></thead>
    <tbody>${rowsHtml}</tbody>
  </table>
  <div class="totals">
    <div class="item">Total Hours: ${fmtHHMMSS(totalSeconds)}</div>
    <div class="item">Total Income: $${totalIncome.toFixed(2)}</div>
  </div>
  <div class="verified">✓ Hours verified via Action Auto Timeproof System — server-validated timestamps</div>
  <div class="sig-area">
    <div class="sig-box">Employee Signature</div>
    <div class="sig-box">Authorized Signature</div>
  </div>
  <div class="footer">ACTION AUTO · CONFIDENTIAL · Generated ${generatedAt}</div>
  ${p.autoPrint === false ? "" : "<script>window.onload = function() { window.print(); }<\/script>"}
</body></html>`
}

/* ─────────────────────────────────────────────────────────────────────────
   Idle Log — read-only export of when the user went idle (tray-detected
   inactivity), for a given date range. No edit controls — export/print only.
───────────────────────────────────────────────────────────────────────── */
export interface IdlePeriod {
  date: string
  idleStart: string
  idleEnd: string | null
  durationSeconds: number
}

const fmtMDTDateTime = (iso: string) => {
  const d = toMDTDate(new Date(iso))
  const weekday = d.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" })
  const month = d.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" })
  const day = d.getUTCDate()
  return `${weekday} ${month} ${day}, ${fmtMDTTime(iso)}`
}

export function generateIdleLogHtml(p: {
  fullName: string
  startDateStr: string
  endDateStr: string
  periods: IdlePeriod[]
  autoPrint?: boolean
}): string {
  const totalSeconds = p.periods.reduce((sum, r) => sum + r.durationSeconds, 0)
  const generatedAt = new Date().toLocaleString("en-US", {
    month: "long", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true,
  })

  const rowsHtml = p.periods.length
    ? p.periods.map((r, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${fmtMDTDateTime(r.idleStart)}</td>
      <td>${r.idleEnd ? fmtMDTDateTime(r.idleEnd) : "Ongoing"}</td>
      <td class="amount">${fmtHHMM(r.durationSeconds)}</td>
    </tr>`).join("")
    : `<tr><td colspan="4" class="empty">No idle periods recorded for this range.</td></tr>`

  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8">
<title>Idle Log — ${p.fullName} — ${p.startDateStr} to ${p.endDateStr}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, Helvetica, sans-serif; color: #111; background: #fff; padding: 48px 56px; max-width: 720px; margin: 0 auto; }
  .header { text-align: center; padding-bottom: 20px; border-bottom: 2px solid #111; margin-bottom: 24px; }
  .company { font-size: 22px; font-weight: 900; letter-spacing: 4px; text-transform: uppercase; }
  .doc-title { font-size: 12px; letter-spacing: 3px; text-transform: uppercase; color: #555; margin-top: 4px; }
  .meta-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6px 24px; margin-bottom: 24px; }
  .meta-grid .row { display: flex; flex-direction: column; gap: 1px; }
  .meta-label { font-size: 9px; text-transform: uppercase; letter-spacing: 1.5px; color: #888; font-weight: 700; }
  .meta-value { font-size: 13px; font-weight: 600; color: #111; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
  thead td { font-size: 9px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px; color: #555; border-bottom: 2px solid #111; padding: 8px 10px; }
  table td { padding: 8px 10px; font-size: 11.5px; border-bottom: 1px solid #eee; }
  table td:first-child { color: #222; font-weight: 600; }
  table td.amount { text-align: right; font-family: 'Courier New', monospace; font-weight: 700; }
  table td.empty { text-align: center; color: #999; padding: 24px 10px; }
  .totals { display: flex; justify-content: space-between; border-top: 2px solid #111; padding-top: 14px; margin-top: 4px; }
  .totals .item { font-size: 13px; font-weight: 900; }
  .note { background: #f8f8f8; border: 1px solid #e0e0e0; border-radius: 6px; padding: 10px 14px; font-size: 10px; color: #666; margin: 24px 0; }
  .footer { text-align: center; font-size: 9px; color: #bbb; margin-top: 32px; border-top: 1px solid #eee; padding-top: 12px; letter-spacing: 1px; }
  @media print { body { padding: 24px 32px; } @page { size: A4; margin: 20mm; } }
</style></head><body>
  <div class="header"><div class="company">Action Auto</div><div class="doc-title">Idle Activity Log</div></div>
  <div class="meta-grid">
    <div class="row"><span class="meta-label">Employee</span><span class="meta-value">${p.fullName}</span></div>
    <div class="row"><span class="meta-label">Date Start</span><span class="meta-value">${p.startDateStr}</span></div>
    <div class="row"><span class="meta-label">Date End</span><span class="meta-value">${p.endDateStr}</span></div>
  </div>
  <table>
    <thead><tr><td>#</td><td>Idle Start</td><td>Idle End</td><td>Duration</td></tr></thead>
    <tbody>${rowsHtml}</tbody>
  </table>
  <div class="totals">
    <div class="item">Total Idle Time: ${fmtHHMM(totalSeconds)}</div>
    <div class="item">Occurrences: ${p.periods.length}</div>
  </div>
  <div class="note">Derived from tray-detected inactivity (10+ minutes without keyboard/mouse input) while clocked in. Days without tray data are excluded, not counted as idle. This is a read-only record — not editable.</div>
  <div class="footer">ACTION AUTO · CONFIDENTIAL · Generated ${generatedAt}</div>
  ${p.autoPrint === false ? "" : "<script>window.onload = function() { window.print(); }<\/script>"}
</body></html>`
}

export const MonthCalendar = ({ year, month, calendar, onSelectDay, isLive }: {
  year: number; month: number; calendar: Record<string, DayData>
  onSelectDay: (ds: string) => void; isLive: boolean
}) => {
  const todayStr = toDateStr(new Date())
  const firstDay = new Date(year, month, 1)
  const startOffset = firstDay.getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: (number | null)[] = [...Array(startOffset).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)]
  while (cells.length % 7 !== 0) cells.push(null)
  const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

  return (
    <div className="w-full">
      <div className="grid grid-cols-7 border-b border-border/30">
        {DAYS.map((d) => (
          <div key={d} className="py-2.5 text-center text-[12px] font-bold uppercase tracking-widest text-muted-foreground/75 border-r border-border/20 last:border-r-0">{d}</div>
        ))}
      </div>
      {Array.from({ length: cells.length / 7 }, (_, wi) => (
        <div key={wi} className="grid grid-cols-7 border-b border-border/20 last:border-b-0">
          {cells.slice(wi * 7, wi * 7 + 7).map((dayNum, di) => {
            if (dayNum === null) return <div key={di} className="border-r border-border/20 last:border-r-0 bg-muted/5 min-h-16 sm:min-h-20" />
            const ds = `${year}-${String(month + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`
            const data = calendar[ds]
            const isToday = ds === todayStr
            const isFuture = ds > todayStr
            const hasData = !!data && data.totalSeconds > 0
            const colors = getDayColor(data?.totalSeconds ?? 0, isToday)
            const isCurrentlyLive = isToday && isLive
            return (
              <div key={di}
                onClick={() => !isFuture && onSelectDay(ds)}
                className={[
                  "border-r border-border/20 last:border-r-0 min-h-16 sm:min-h-20 p-2 flex flex-col gap-1 transition-all duration-100",
                  isFuture ? "opacity-30 cursor-default select-none" : "cursor-pointer hover:bg-muted/20",
                  isToday || hasData ? `border ${colors.bg}` : "",
                ].filter(Boolean).join(" ")}
              >
                <div className="flex items-start justify-between">
                  <span className={isToday
                    ? "h-5 w-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[12px] font-black"
                    : isFuture ? "text-sm font-bold text-muted-foreground/70"
                    : "text-sm font-bold text-muted-foreground/80"}>
                    {dayNum}
                  </span>
                  {isCurrentlyLive && <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse mt-0.5" />}
                </div>
                {(hasData || (!!data?.weekTotalSeconds && data.weekTotalSeconds > 0)) && (
                  <div className="mt-auto space-y-0.5">
                    {hasData && (
                      <>
                        <div className={`rounded-[5px] px-1.5 py-1 text-center ${colors.bar}`}>
                          <span className={`text-[13px] font-black font-mono ${colors.text}`}>{fmtHHMM(data.totalSeconds)}</span>
                        </div>
                        {!!data.breakSeconds && data.breakSeconds > 0 && (
                          <div className={`rounded-[5px] px-1.5 py-0.5 text-center ${data.breakSeconds >= BREAK_OVER_LIMIT_SECONDS ? "bg-red-500/90" : "bg-orange-500/80"}`}>
                            <span className="text-[12px] font-bold font-mono text-white">{fmtHHMM(data.breakSeconds)}</span>
                          </div>
                        )}
                      </>
                    )}
                    {!!data?.weekTotalSeconds && data.weekTotalSeconds > 0 && (
                      <div className="rounded-[5px] px-1.5 py-0.5 text-center bg-emerald-600/90">
                        <span className="text-[12px] font-bold font-mono text-white">{fmtHHMM(data.weekTotalSeconds)}</span>
                      </div>
                    )}
                  </div>
                )}
                {isToday && !hasData && (
                  <div className="mt-auto">
                    <div className="rounded-[5px] px-1.5 py-1 bg-muted/25 text-center">
                      <span className="text-[12px] text-muted-foreground/70 font-mono">--:--</span>
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

// Mobile/PWA list view — day-by-day rows grouped by week with a "Week total"
// separator, used in place of MonthCalendar's 7-column grid on narrow
// screens (the grid's fixed columns get cramped on phone widths). Previously
// only defined locally in the employee's own timeproof-clock page; moved here
// so the admin per-user view can share the exact same mobile UI.
export const MobileCalendarList = ({ year, month, calendar, onSelectDay, isLive }: {
  year: number; month: number; calendar: Record<string, DayData>
  onSelectDay: (ds: string) => void; isLive: boolean
}) => {
  const todayStr = toDateStr(new Date())
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

  type DayEntry = { ds: string; day: number; dow: number; data?: DayData; isToday: boolean; isFuture: boolean }
  type Week = { days: DayEntry[]; weekTotal: number }

  const weeks: Week[] = []
  let cur: DayEntry[] = []
  for (let d = 1; d <= daysInMonth; d++) {
    const ds = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`
    const dow = new Date(year, month, d).getDay()
    cur.push({ ds, day: d, dow, data: calendar[ds], isToday: ds === todayStr, isFuture: ds > todayStr })
    if (dow === 6 || d === daysInMonth) {
      weeks.push({ days: cur, weekTotal: cur.reduce((s, e) => s + (e.data?.totalSeconds ?? 0), 0) })
      cur = []
    }
  }

  return (
    <div>
      {weeks.map((week, wi) => {
        const hasAct = week.days.some(e => !!e.data?.totalSeconds)
        if (week.days.every(e => e.isFuture)) return null
        return (
          <div key={wi}>
            {week.days.map(({ ds, day, dow, data, isToday, isFuture }) => {
              if (isFuture) return null
              const hasData = !!data?.totalSeconds && data.totalSeconds > 0
              return (
                <div key={ds}
                  onClick={() => (hasData || isToday) && onSelectDay(ds)}
                  className={cn(
                    "flex items-center gap-4 px-4 py-3.5 border-b border-border/10 transition-colors",
                    hasData || isToday ? "cursor-pointer active:bg-muted/20" : "cursor-default"
                  )}
                >
                  <div className="w-11 shrink-0 flex flex-col items-center gap-0.5">
                    <span className={cn("text-[11px] font-bold uppercase tracking-widest",
                      isToday ? "text-emerald-500" : "text-muted-foreground/75")}>{DOW[dow]}</span>
                    <span className={cn("text-2xl font-black tabular-nums leading-none",
                      isToday ? "text-emerald-500" : "text-foreground/70")}>{day}</span>
                  </div>

                  <div className="flex-1 min-w-0 flex items-center gap-2.5">
                    {hasData ? (
                      <>
                        {isToday && isLive && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />}
                        <span className="text-[18px] font-black font-mono tabular-nums text-foreground tracking-tight leading-none">
                          {fmtHHMM(data!.totalSeconds)}
                        </span>
                        {!!data!.breakSeconds && data!.breakSeconds > 0 && (
                          data!.breakSeconds! >= BREAK_OVER_LIMIT_SECONDS ? (
                            <span className="text-[12px] font-bold font-mono text-red-500 bg-red-500/10 px-2 py-0.5 rounded-full border border-red-500/20">
                              {fmtHHMM(data!.breakSeconds)} brk
                            </span>
                          ) : (
                            <span className="text-[12px] font-bold font-mono text-orange-400/80 bg-orange-500/8 px-2 py-0.5 rounded-full border border-orange-500/15">
                              {fmtHHMM(data!.breakSeconds)} brk
                            </span>
                          )
                        )}
                      </>
                    ) : isToday ? (
                      <span className="text-base text-muted-foreground/75 font-medium">Not clocked in yet</span>
                    ) : (
                      <span className="text-lg font-mono text-muted-foreground/70">—</span>
                    )}
                  </div>

                  {hasData && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/70 shrink-0" />}
                </div>
              )
            })}
            {hasAct && (
              <div className="flex items-center gap-4 px-4 py-2.5 bg-emerald-500/5 border-b border-emerald-500/10">
                <div className="w-11 shrink-0" />
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground/70">Week total</span>
                  <span className="text-base font-black font-mono text-emerald-600 dark:text-emerald-400">{fmtHHMM(week.weekTotal)}</span>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
