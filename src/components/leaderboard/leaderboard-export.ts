import {
  applyFootersToAllPages,
  drawReportPageHeader,
  drawSectionTitle,
  drawSummaryCards,
  ensurePdfSectionSpace,
  formatGeneratedAt,
  generateDocId,
  getLastAutoTableY,
  loadReportLogo,
  TABLE_ALTERNATE_ROW,
  TABLE_BODY_ROW,
  TABLE_BODY_STYLES,
  TABLE_HEAD_STYLES_PRIMARY,
  TABLE_HEAD_STYLES_SECONDARY,
} from "@/utils/reportPdfTemplate"

export type ExportScope = "calls" | "full"
export type ExportFormat = "csv" | "doc" | "pdf"

export interface RecordKpis {
  callsTotal: number
  callsMade: number
  callsAnswered: number
  callsConnected: number
  talkTimeSec: number
  leadsCreated: number
  leadsContacted: number
  leadsConverted: number
  conversionRate: number
  appointmentsCompleted: number
  messagesSent: number
  textsSent: number
  chatsSent: number
  emailsSent: number
  followUpsSent: number
  transactionsCompleted: number
  onboardingsCompleted: number
  avgResponseTimeMin: number
  responsesCount: number
  totalScore: number
}

export interface LeaderboardRecords {
  organizationName?: string
  period: { label: string; from: string; to: string; timezone: string }
  scope: ExportScope
  generatedAt: string
  totals: RecordKpis & { missedCalls: number; incomingCalls: number; activeUsers: number }
  people: Array<{ rank: number; name: string; email: string; role: string; kpis: RecordKpis }>
  checkpoints: {
    date: string
    times: string[]
    rows: Array<{ userId: string; fullName: string; counts: Array<number | null>; total: number }>
    teamCounts: Array<number | null>
    teamTotal: number
  } | null
  calls: Array<{ when: string; employee: string; direction: string; result: string; customer: string; number: string; duration: string }>
  callsTruncated: boolean
  activity: Array<{ when: string; employee: string; action: string; customer: string; detail: string }>
  activityTruncated: boolean
}

interface Table {
  title: string
  head: string[]
  rows: string[][]
  note?: string
}

export function formatTalkTime(totalSec: number): string {
  const sec = Math.max(0, Math.round(totalSec || 0))
  const hours = Math.floor(sec / 3600)
  const minutes = Math.floor((sec % 3600) / 60)
  const seconds = sec % 60
  if (hours) return `${hours}h ${minutes}m`
  if (minutes) return `${minutes}m ${seconds}s`
  return `${seconds}s`
}

function reportTitle(records: LeaderboardRecords): string {
  return records.scope === "calls" ? "Call Counts" : "Leaderboard Full Record"
}

function summaryCards(records: LeaderboardRecords): Array<{ label: string; value: string }> {
  const t = records.totals
  const callCards = [
    { label: "Total calls", value: String(t.callsTotal) },
    { label: "Outgoing calls", value: String(t.callsMade) },
    { label: "Incoming answered", value: String(t.callsAnswered) },
    { label: "Missed incoming", value: String(t.missedCalls) },
    { label: "Talk time", value: formatTalkTime(t.talkTimeSec) },
  ]
  if (records.scope === "calls") return callCards
  return [
    ...callCards,
    { label: "Messages sent", value: String(t.messagesSent) },
    { label: "Follow-ups", value: String(t.followUpsSent) },
    { label: "New leads", value: String(t.leadsCreated) },
    { label: "Leads sold", value: String(t.leadsConverted) },
    { label: "Appointments", value: String(t.appointmentsCompleted) },
    { label: "Sales recorded", value: String(t.transactionsCompleted) },
    { label: "Customers added", value: String(t.onboardingsCompleted) },
    { label: "Avg response", value: `${t.avgResponseTimeMin} min` },
    { label: "Active team members", value: String(t.activeUsers) },
  ]
}

function buildTables(records: LeaderboardRecords): Table[] {
  const tables: Table[] = []
  const callHead = ["Rank", "Name", "Total calls", "Outgoing", "Incoming answered", "Connected outgoing", "Talk time"]
  const callRow = (person: LeaderboardRecords["people"][number]) => [
    String(person.rank),
    person.name,
    String(person.kpis.callsTotal),
    String(person.kpis.callsMade),
    String(person.kpis.callsAnswered),
    String(person.kpis.callsConnected),
    formatTalkTime(person.kpis.talkTimeSec),
  ]

  if (records.scope === "calls") {
    tables.push({ title: "Calls per team member", head: callHead, rows: records.people.map(callRow) })
  } else {
    tables.push({
      title: "Team members",
      head: ["Rank", "Name", "Calls", "Outgoing", "Answered", "Talk time", "Messages", "Follow-ups", "Leads", "Sold", "Conv %", "Appts", "Sales", "Customers added", "Avg response", "Points"],
      rows: records.people.map((person) => [
        String(person.rank),
        person.name,
        String(person.kpis.callsTotal),
        String(person.kpis.callsMade),
        String(person.kpis.callsAnswered),
        formatTalkTime(person.kpis.talkTimeSec),
        String(person.kpis.messagesSent),
        String(person.kpis.followUpsSent),
        String(person.kpis.leadsCreated),
        String(person.kpis.leadsConverted),
        `${person.kpis.conversionRate}%`,
        String(person.kpis.appointmentsCompleted),
        String(person.kpis.transactionsCompleted),
        String(person.kpis.onboardingsCompleted),
        person.kpis.responsesCount ? `${person.kpis.avgResponseTimeMin} min` : "-",
        String(Math.round(person.kpis.totalScore)),
      ]),
    })
  }

  if (records.checkpoints) {
    const cp = records.checkpoints
    const cell = (value: number | null) => (value === null ? "-" : String(value))
    tables.push({
      title: `Call checkpoints (${records.period.label})`,
      head: ["Name", ...cp.times.map((time) => `By ${time}`), "Whole day"],
      rows: [
        ...cp.rows.map((row) => [row.fullName, ...row.counts.map(cell), String(row.total)]),
        ["Whole team", ...cp.teamCounts.map(cell), String(cp.teamTotal)],
      ],
    })
  }

  tables.push({
    title: "Every call",
    head: ["When (Mountain Time)", "Team member", "Direction", "Result", "Customer", "Number", "Talk time"],
    rows: records.calls.map((call) => [call.when, call.employee, call.direction, call.result, call.customer, call.number, call.duration]),
    note: records.callsTruncated ? "Only the first 10,000 calls are included. Pick a shorter period to get the rest." : undefined,
  })

  if (records.scope === "full") {
    tables.push({
      title: "Every activity",
      head: ["When (Mountain Time)", "Team member", "What happened", "Customer", "Details"],
      rows: records.activity.map((item) => [item.when, item.employee, item.action, item.customer, item.detail]),
      note: records.activityTruncated ? "Only the first 10,000 activities are included. Pick a shorter period to get the rest." : undefined,
    })
  }

  return tables
}

function csvCell(value: string): string {
  const text = String(value ?? "")
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe
}

export function buildCsv(records: LeaderboardRecords): string {
  const lines: string[] = []
  const push = (cells: string[]) => lines.push(cells.map(csvCell).join(","))
  push([reportTitle(records)])
  if (records.organizationName) push(["Organization", records.organizationName])
  push(["Period", records.period.label])
  push(["Times shown in", "Mountain Time (Denver)"])
  push(["Generated", formatGeneratedAt(new Date(records.generatedAt))])
  lines.push("")
  push(["Summary"])
  for (const card of summaryCards(records)) push([card.label, card.value])
  for (const table of buildTables(records)) {
    lines.push("")
    push([table.title])
    if (table.note) push([table.note])
    push(table.head)
    if (!table.rows.length) push(["No records in this period"])
    for (const row of table.rows) push(row)
  }
  return `﻿${lines.join("\r\n")}\r\n`
}

function escapeHtml(value: string): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

export function buildWordHtml(records: LeaderboardRecords): string {
  const title = reportTitle(records)
  const cards = summaryCards(records)
    .map((card) => `<tr><td>${escapeHtml(card.label)}</td><td><b>${escapeHtml(card.value)}</b></td></tr>`)
    .join("")
  const tables = buildTables(records)
    .map((table) => {
      const head = table.head.map((cell) => `<th>${escapeHtml(cell)}</th>`).join("")
      const body = table.rows.length
        ? table.rows.map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`).join("")
        : `<tr><td colspan="${table.head.length}">No records in this period</td></tr>`
      const note = table.note ? `<p class="note">${escapeHtml(table.note)}</p>` : ""
      return `<h2>${escapeHtml(table.title)}</h2>${note}<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`
    })
    .join("")
  return `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>
@page { size: 11in 8.5in; margin: 0.6in; mso-page-orientation: landscape; }
body { font-family: Calibri, Arial, sans-serif; font-size: 10pt; color: #1e293b; }
h1 { font-size: 18pt; color: #0f172a; margin: 0 0 4pt; }
h2 { font-size: 12pt; color: #10846a; margin: 16pt 0 6pt; }
p.meta { color: #475569; margin: 0 0 2pt; }
p.note { color: #b45309; margin: 0 0 4pt; }
table { border-collapse: collapse; width: 100%; }
th { background: #10846a; color: #ffffff; text-align: left; padding: 4pt; border: 1px solid #cbd5e1; }
td { padding: 4pt; border: 1px solid #cbd5e1; }
</style></head><body>
<h1>${escapeHtml(title)}</h1>
${records.organizationName ? `<p class="meta">${escapeHtml(records.organizationName)}</p>` : ""}
<p class="meta">Period: ${escapeHtml(records.period.label)}</p>
<p class="meta">Times shown in Mountain Time (Denver)</p>
<p class="meta">Generated: ${escapeHtml(formatGeneratedAt(new Date(records.generatedAt)))}</p>
<h2>Summary</h2><table><tbody>${cards}</tbody></table>
${tables}
</body></html>`
}

export async function buildPdf(records: LeaderboardRecords): Promise<Blob> {
  const { jsPDF } = await import("jspdf")
  const autoTable = (await import("jspdf-autotable")).default
  const doc = new jsPDF({ orientation: "landscape" })
  const title = reportTitle(records)
  const logo = await loadReportLogo()
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const left = 12
  const right = pageWidth - 12
  const contentWidth = right - left
  const orgName = records.organizationName || undefined

  const drawHeader = () =>
    drawReportPageHeader(doc, {
      reportTitle: title,
      orgName,
      periodLabel: `${records.period.label} - Mountain Time`,
      logo,
      pageWidth,
      left,
      right,
    })

  drawHeader()
  let y = 37
  drawSectionTitle(doc, { title: "Summary", y, left, right })
  y = drawSummaryCards(doc, { cards: summaryCards(records), y: y + 3, left, contentWidth, maxPerRow: 7 }) + 9

  for (const [index, table] of buildTables(records).entries()) {
    y = ensurePdfSectionSpace(doc, { currentY: y, pageHeight, minHeight: 28, onNewPage: drawHeader })
    drawSectionTitle(doc, { title: table.title, y, left, right })
    y += 3
    if (table.note) {
      doc.setFont("helvetica", "normal")
      doc.setFontSize(7)
      doc.setTextColor(180, 83, 9)
      doc.text(table.note, left, y + 2)
      y += 5
    }
    autoTable(doc, {
      startY: y,
      margin: { left, right: pageWidth - right, top: 35, bottom: 18 },
      head: [table.head],
      body: table.rows.length ? table.rows : [[{ content: "No records in this period", colSpan: table.head.length }]],
      styles: TABLE_BODY_STYLES,
      headStyles: index % 2 === 0 ? TABLE_HEAD_STYLES_PRIMARY : TABLE_HEAD_STYLES_SECONDARY,
      bodyStyles: TABLE_BODY_ROW,
      alternateRowStyles: TABLE_ALTERNATE_ROW,
      didDrawPage: (hook: { pageNumber: number }) => {
        if (hook.pageNumber > 1) drawHeader()
      },
    } as never)
    y = getLastAutoTableY(doc, y) + 10
  }

  applyFootersToAllPages(doc, {
    docId: generateDocId(records.scope === "calls" ? "CALLS" : "LEADERBOARD"),
    generatedAtLabel: formatGeneratedAt(new Date(records.generatedAt)),
    reportTitle: title,
    orgName,
    pageWidth,
    pageHeight,
    left,
    right,
  })
  return doc.output("blob")
}

export function exportFileName(records: LeaderboardRecords, format: ExportFormat): string {
  const base = records.scope === "calls" ? "call-counts" : "leaderboard-full-record"
  const range = records.period.from === records.period.to ? records.period.from : `${records.period.from}_to_${records.period.to}`
  return `${base}_${range}.${format}`
}

export async function buildExportBlob(records: LeaderboardRecords, format: ExportFormat): Promise<Blob> {
  if (format === "csv") return new Blob([buildCsv(records)], { type: "text/csv;charset=utf-8" })
  if (format === "doc") return new Blob(["﻿", buildWordHtml(records)], { type: "application/msword" })
  return buildPdf(records)
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  link.style.display = "none"
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
}
