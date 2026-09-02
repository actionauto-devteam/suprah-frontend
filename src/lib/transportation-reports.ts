import { Quote } from "@/types/transportation"
import { Load } from "@/types/load"
import { getLoadReportRate } from "@/lib/report-filter-engine"
import { formatScheduleDate } from "@/utils/calendar.utils"

export interface LoadSummary {
  total: number
  delivered: number
  inTransit: number
  assigned: number
  posted: number
  cancelled: number
  avgRate: number
  totalRate: number
  totalMiles: number
  avgDeliveryDays: number
  onTimeRate: number
}

export interface QuoteSummary {
  total: number
  pending: number
  accepted: number
  rejected: number
  booked: number
  avgRate: number
  totalRate: number
  totalMiles: number
  conversionRate: number
  enclosedCount: number
  inoperableCount: number
}

function loadData(l: Load) {
  return {
    rate: getLoadReportRate(l),
    miles: l.pricing?.miles || 0,
    enclosedTrailer: l.trailerType?.toLowerCase().includes('enclosed'),
    firstName: l.pickupLocation?.contactName?.split(' ')[0] || "",
    lastName: l.pickupLocation?.contactName?.split(' ').slice(1).join(' ') || ""
  }
}

export function buildLoadSummary(loads: Load[]): LoadSummary {
  const total = loads.length
  const delivered = loads.filter(s => s.status === "Delivered").length
  const inTransit = loads.filter(s => s.status === "In-Transit" || s.status === "Picked Up").length
  const assigned = loads.filter(s => s.status === "Assigned" || s.status === "Accepted").length
  const posted = loads.filter(s => s.status === "Posted").length
  const cancelled = loads.filter(s => s.status === "Cancelled").length
  
  const rates = loads.map(s => loadData(s).rate).filter(r => r > 0)
  const totalRate = rates.reduce((a, b) => a + b, 0)
  const avgRate = rates.length > 0 ? totalRate / rates.length : 0
  
  const miles = loads.map(s => loadData(s).miles).filter(m => m > 0)
  const totalMiles = miles.reduce((a, b) => a + b, 0)

  const deliveryDays = loads
    .filter(s => s.pickedUpAt && s.deliveredAt)
    .map(s => {
      const p = new Date(s.pickedUpAt!).getTime()
      const d = new Date(s.deliveredAt!).getTime()
      return (d - p) / 86_400_000
    })
    
  const avgDeliveryDays = deliveryDays.length > 0
    ? deliveryDays.reduce((a, b) => a + b, 0) / deliveryDays.length
    : 0

  const active = total - cancelled
  const onTimeRate = active > 0 ? Math.round((delivered / active) * 100) : 0

  return { total, delivered, inTransit, assigned, posted, cancelled, avgRate, totalRate, totalMiles, avgDeliveryDays, onTimeRate }
}

export function buildQuoteSummary(quotes: Quote[]): QuoteSummary {
  const total = quotes.length
  const pending = quotes.filter(q => q.status === "pending").length
  const accepted = quotes.filter(q => q.status === "accepted").length
  const rejected = quotes.filter(q => q.status === "rejected").length
  const booked = quotes.filter(q => q.status === "booked").length
  const rates = quotes.map(q => q.rate || 0).filter(r => r > 0)
  const totalRate = rates.reduce((a, b) => a + b, 0)
  const avgRate = rates.length > 0 ? totalRate / rates.length : 0
  const miles = quotes.map(q => q.miles || 0).filter(m => m > 0)
  const totalMiles = miles.reduce((a, b) => a + b, 0)
  const conversionRate = total > 0 ? Math.round((booked / total) * 100) : 0
  const enclosedCount = quotes.filter(q => q.enclosedTrailer).length
  const inoperableCount = quotes.filter(q => q.vehicleInoperable).length

  return { total, pending, accepted, rejected, booked, avgRate, totalRate, totalMiles, conversionRate, enclosedCount, inoperableCount }
}

export function fmtDate(d?: string): string {
  if (!d) return "—"
  const date = new Date(d)
  if (Number.isNaN(date.getTime())) return "—"
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "America/Denver" })
}

export function fmtCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount)
}

export function fmtNumber(num: number): string {
  return new Intl.NumberFormat("en-US").format(Math.round(num))
}

export function loadCustomer(l: Load): string {
  const pickup = l.pickupLocation
  const delivery = l.deliveryLocation
  return (
    pickup?.companyName ||
    pickup?.contactName ||
    [pickup?.firstName, pickup?.lastName].filter(Boolean).join(" ") ||
    pickup?.email ||
    delivery?.companyName ||
    delivery?.contactName ||
    [delivery?.firstName, delivery?.lastName].filter(Boolean).join(" ") ||
    delivery?.email ||
    "—"
  )
}

export function loadVehicle(l: Load): string {
  if (l.vehicles && l.vehicles.length > 0) {
    const v = l.vehicles[0]
    return `${v.year || ''} ${v.make || ''} ${v.model || ''}`.trim() || "—"
  }
  return "—"
}

export function loadVin(l: Load): string {
  return l.vehicles?.[0]?.vin || "—"
}

export function loadStock(l: Load): string {
  return l.vehicles?.[0]?.lotNumber || "—"
}

export function loadRate(l: Load): number {
  return getLoadReportRate(l)
}

export function loadMiles(l: Load): number {
  return l.pricing?.miles || 0
}

export function loadTransportType(l: Load): string {
  return l.trailerType || "Open"
}

export function loadRoute(l: Load): string {
  return `${l.pickupLocation.city}, ${l.pickupLocation.state} → ${l.deliveryLocation.city}, ${l.deliveryLocation.state}`
}

export function calcDuration(pickedUp?: string, delivered?: string): string {
  if (!pickedUp || !delivered) return "—"
  const diff = new Date(delivered).getTime() - new Date(pickedUp).getTime()
  const days = Math.floor(diff / 86_400_000)
  const hours = Math.floor((diff % 86_400_000) / 3_600_000)
  if (days > 0) return `${days}d ${hours}h`
  const minutes = Math.floor((diff % 3_600_000) / 60_000)
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`
}

export function driverName(l: Load): string {
  const driver = l.assignedDriverId
  if (!driver) return "Unassigned"
  if (typeof driver === "string") return driver
  return driver.name || driver.email || driver._id || "Assigned"
}

export function quoteCustomer(q: Quote): string {
  return `${q.firstName || ''} ${q.lastName || ''}`.trim() || "—"
}

export function quoteVehicle(q: Quote): string {
  if (q.vehicleName) return q.vehicleName
  if (q.vehicleId) {
    return `${q.vehicleId.year || ''} ${q.vehicleId.make || ''} ${q.vehicleId.modelName || ''}`.trim() || q.vehicleId.vin || "—"
  }
  return q.vin || "—"
}

export function quoteFromAddr(q: Quote): string {
  return q.fromAddress || "—"
}

export function quoteToAddr(q: Quote): string {
  return q.toAddress || "—"
}

export function quoteEta(q: Quote): string {
  if (q.eta) {
    return `${q.eta.min}-${q.eta.max}d`
  }
  return "—"
}

export function quoteTransportType(q: Quote): string {
  return q.enclosedTrailer ? "Enclosed" : "Open"
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

function bolAddressBlock(loc: Load["pickupLocation"]): string {
  const lines = [
    loc.companyName,
    loc.contactName,
    loc.street,
    [loc.city, loc.state, loc.zip].filter(Boolean).join(", "),
    loc.phone,
  ].filter((v): v is string => !!v && v.trim().length > 0)
  return lines.map(l => escapeHtml(l)).join("<br/>") || "N/A"
}

export function generateBolHtml(load: Load, companyName: string = "Your Dealership"): string {
  const generatedAt = new Date().toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "America/Denver",
  })

  const vehicles = load.vehicles || []
  const vehicleRows = vehicles.length > 0
    ? vehicles.map((v, i) => `
      <tr>
        <td class="cell-index">${i + 1}</td>
        <td class="cell-vehicle">${escapeHtml(`${v.year || ""} ${v.make || ""} ${v.model || ""}`.trim() || "N/A")}</td>
        <td class="cell-vin">${escapeHtml(v.vin || "N/A")}</td>
        <td>${escapeHtml(v.color || "N/A")}</td>
        <td>${escapeHtml(v.condition || "N/A")}</td>
        <td>${escapeHtml(v.lotNumber || "N/A")}</td>
      </tr>`).join("")
    : `<tr><td colspan="6" class="empty-cell">No vehicles are attached to this load.</td></tr>`

  const instructions = load.additionalInfo?.instructions?.trim()
  const notes = load.additionalInfo?.notes?.trim()
  const hasNotes = Boolean(instructions || notes)

  const noteBlocks = [
    instructions
      ? `<div class="note-block"><div class="note-label">Carrier Instructions</div><div class="note-text">${escapeHtml(instructions)}</div></div>`
      : "",
    notes
      ? `<div class="note-block"><div class="note-label">Internal Notes</div><div class="note-text">${escapeHtml(notes)}</div></div>`
      : "",
  ].filter(Boolean).join("")

  const contractName = load.contract?.signerName?.trim()
  const contractMeta = load.contract?.agreedToTerms
    ? `Signed${contractName ? ` by ${escapeHtml(contractName)}` : ""}${load.contract?.signedAt ? ` on ${escapeHtml(fmtDate(load.contract.signedAt))}` : ""}`
    : "No signed contract recorded"

  const statusClass = String(load.status || "").toLowerCase().replace(/[^a-z]+/g, "-")

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>BOL — ${escapeHtml(load.loadNumber)}</title>
  <style>
    :root {
      --ink: #172033;
      --muted: #667085;
      --line: #d9dee8;
      --soft: #f5f7fa;
      --soft-blue: #eef5ff;
      --soft-green: #edf9f2;
      --blue: #2563eb;
      --green: #15803d;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    html {
      background: #eef1f5;
    }

    body {
      width: 8.5in;
      max-width: 8.5in;
      min-height: 11in;
      margin: 0 auto;
      padding: 0.28in;
      background: #ffffff;
      color: var(--ink);
      font-family: Arial, Helvetica, sans-serif;
      font-size: 11.5pt;
      line-height: 1.4;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .document {
      width: 100%;
      min-width: 0;
    }

    .header {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      align-items: start;
      gap: 18px;
      padding-bottom: 10px;
      margin-bottom: 10px;
      border-bottom: 2px solid var(--ink);
    }

    .brand {
      min-width: 0;
    }

    .company {
      font-size: 19px;
      font-weight: 900;
      letter-spacing: 2.6px;
      line-height: 1;
      text-transform: uppercase;
    }

    .doc-title {
      margin-top: 4px;
      color: var(--muted);
      font-size: 9px;
      font-weight: 800;
      letter-spacing: 1.8px;
      text-transform: uppercase;
    }

    .header-meta {
      min-width: 210px;
      text-align: right;
    }

    .load-number {
      font-size: 14px;
      font-weight: 900;
      overflow-wrap: anywhere;
    }

    .status-row {
      display: flex;
      justify-content: flex-end;
      align-items: center;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 5px;
    }

    .status {
      display: inline-flex;
      align-items: center;
      border: 1px solid #cfd5df;
      border-radius: 999px;
      padding: 2px 8px;
      background: var(--soft);
      color: #344054;
      font-size: 8px;
      font-weight: 900;
      letter-spacing: .7px;
      text-transform: uppercase;
      white-space: nowrap;
    }

    .status-delivered { border-color: #a7e2bd; background: #edf9f2; color: #15803d; }
    .status-in-transit { border-color: #a8d8f0; background: #eef8ff; color: #0369a1; }
    .status-picked-up { border-color: #f5d48c; background: #fff8e8; color: #a16207; }
    .status-assigned { border-color: #b9cdfb; background: #eef5ff; color: #1d4ed8; }
    .status-accepted { border-color: #d4bafb; background: #f6f0ff; color: #7e22ce; }
    .status-cancelled { border-color: #f4b4b4; background: #fff0f0; color: #b42318; }

    .generated {
      color: var(--muted);
      font-size: 8px;
      white-space: nowrap;
    }

    .route-grid {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
      gap: 8px;
      margin-bottom: 8px;
    }

    .route-box {
      min-width: 0;
      border: 1px solid var(--line);
      border-radius: 7px;
      padding: 9px 10px;
      overflow: hidden;
      break-inside: avoid;
    }

    .route-box.pickup { background: var(--soft-blue); }
    .route-box.delivery { background: var(--soft-green); }

    .route-label,
    .section-title,
    .item-label,
    .note-label,
    .metric-label {
      font-size: 8px;
      font-weight: 900;
      letter-spacing: 1px;
      text-transform: uppercase;
    }

    .route-label {
      margin-bottom: 4px;
    }

    .pickup .route-label { color: var(--blue); }
    .delivery .route-label { color: var(--green); }

    .route-value {
      min-width: 0;
      color: #273142;
      font-size: 10px;
      line-height: 1.45;
      overflow-wrap: anywhere;
      word-break: break-word;
    }

    .dates-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 7px;
      margin-bottom: 8px;
    }

    .date-item,
    .metric {
      min-width: 0;
      border: 1px solid var(--line);
      border-radius: 6px;
      padding: 7px 9px;
      background: #fff;
      overflow: hidden;
    }

    .item-label,
    .metric-label {
      margin-bottom: 2px;
      color: var(--muted);
    }

    .date-value,
    .metric-value {
      font-weight: 800;
      overflow-wrap: anywhere;
    }

    .section {
      margin-bottom: 8px;
      break-inside: avoid;
    }

    .section-title {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      margin-bottom: 5px;
      padding-bottom: 4px;
      border-bottom: 1px solid var(--line);
      color: #344054;
    }

    .section-title span:last-child {
      color: var(--muted);
      font-size: 8px;
      letter-spacing: .5px;
      white-space: nowrap;
    }

    .table-wrap {
      width: 100%;
      overflow: hidden;
      border: 1px solid var(--line);
      border-radius: 7px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
    }

    th,
    td {
      min-width: 0;
      padding: 5px 6px;
      border-right: 1px solid #e8ebf0;
      border-bottom: 1px solid #e8ebf0;
      text-align: left;
      vertical-align: middle;
      overflow-wrap: anywhere;
      word-break: break-word;
    }

    th:last-child,
    td:last-child { border-right: 0; }
    tbody tr:last-child td { border-bottom: 0; }

    th {
      background: var(--soft);
      color: #475467;
      font-size: 7.5px;
      font-weight: 900;
      letter-spacing: .6px;
      text-transform: uppercase;
    }

    td {
      color: #344054;
      font-size: 8.5px;
    }

    th:nth-child(1), td:nth-child(1) { width: 5%; text-align: center; }
    th:nth-child(2), td:nth-child(2) { width: 25%; }
    th:nth-child(3), td:nth-child(3) { width: 29%; }
    th:nth-child(4), td:nth-child(4) { width: 12%; }
    th:nth-child(5), td:nth-child(5) { width: 16%; }
    th:nth-child(6), td:nth-child(6) { width: 13%; }

    .cell-index { font-weight: 900; }
    .cell-vehicle { font-weight: 800; }
    .cell-vin { font-family: "Courier New", monospace; font-size: 8px; }
    .empty-cell { padding: 12px; color: var(--muted); font-style: italic; text-align: center; }

    .summary-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 7px;
      margin-bottom: 8px;
    }

    .metric-value {
      font-size: 12px;
      line-height: 1.15;
    }

    .bottom-grid {
      display: grid;
      grid-template-columns: ${hasNotes ? "minmax(0, 1.35fr) minmax(0, .65fr)" : "1fr"};
      gap: 8px;
      align-items: stretch;
      margin-top: 2px;
    }

    .panel {
      min-width: 0;
      border: 1px solid var(--line);
      border-radius: 7px;
      padding: 8px 9px;
      overflow: hidden;
      break-inside: avoid;
    }

    .notes-grid {
      display: grid;
      grid-template-columns: ${instructions && notes ? "1fr 1fr" : "1fr"};
      gap: 7px;
    }

    .note-block {
      min-width: 0;
      padding: 7px;
      border: 1px solid #e5e9f0;
      border-radius: 5px;
      background: var(--soft);
      overflow: hidden;
    }

    .note-label {
      margin-bottom: 3px;
      color: var(--muted);
    }

    .note-text {
      max-height: 66px;
      color: #344054;
      font-size: 8.5px;
      line-height: 1.35;
      white-space: pre-wrap;
      overflow: hidden;
      overflow-wrap: anywhere;
      word-break: break-word;
    }

    .contract-line {
      color: #344054;
      font-size: 8.5px;
      line-height: 1.4;
      overflow-wrap: anywhere;
    }

    .signature-area {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 18px;
      margin-top: 17px;
      padding: 0 2px;
    }

    .signature-box {
      min-width: 0;
      padding-top: 5px;
      border-top: 1px solid #98a2b3;
      color: var(--muted);
      font-size: 8px;
      text-align: center;
    }

    .footer {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      margin-top: 10px;
      padding-top: 6px;
      border-top: 1px solid #eaecf0;
      color: #98a2b3;
      font-size: 7px;
      letter-spacing: .5px;
      text-transform: uppercase;
    }



    @media screen {
      body {
        box-shadow: 0 10px 34px rgba(15, 23, 42, 0.14);
      }

      .header {
        gap: 14pt;
        padding-bottom: 9pt;
        margin-bottom: 9pt;
      }

      .route-grid {
        gap: 7pt;
        margin-bottom: 7pt;
      }

      .route-box {
        padding: 9pt 10pt;
      }

      .dates-grid {
        gap: 6pt;
        margin-bottom: 7pt;
      }

      .date-item,
      .metric {
        padding: 7pt 8pt;
      }

      .section {
        margin-bottom: 8pt;
      }

      .section-title {
        margin-bottom: 5pt;
        padding-bottom: 4pt;
      }

      .summary-grid {
        gap: 6pt;
        margin-bottom: 8pt;
      }

      .bottom-grid {
        gap: 7pt;
        margin-top: 3pt;
      }

      .panel {
        padding: 8pt 9pt;
      }

      .note-block {
        padding: 7pt;
      }

      .signature-area {
        gap: 18pt;
        margin-top: 20pt;
      }

      .company { font-size: 20pt; }
      .doc-title { font-size: 10pt; }
      .load-number { font-size: 15pt; }
      .generated { font-size: 9pt; }
      .status { font-size: 9pt; padding: 2.5pt 8pt; }

      .route-label,
      .section-title,
      .item-label,
      .note-label,
      .metric-label {
        font-size: 9pt;
      }

      .route-value {
        font-size: 10.5pt;
        line-height: 1.45;
      }

      .date-value,
      .contract-line {
        font-size: 10.5pt;
      }

      th {
        font-size: 8.5pt;
        padding: 5.5pt;
      }

      td {
        font-size: 9.5pt;
        padding: 5.5pt;
      }

      .cell-vin {
        font-size: 9pt;
      }

      .metric-value {
        font-size: 13.5pt;
      }

      .note-text {
        max-height: none;
        overflow: visible;
        font-size: 9.5pt;
        line-height: 1.4;
      }

      .signature-box {
        font-size: 9pt;
      }

      .footer {
        margin-top: 9pt;
        padding-top: 6pt;
        font-size: 8pt;
      }

      .table-wrap {
        overflow: visible;
      }

      table {
        width: 100%;
        table-layout: fixed;
      }
    }

    @media print {
      @page {
        size: Letter portrait;
        margin: 0.28in;
      }

      html,
      body {
        width: 100% !important;
        max-width: none !important;
        min-width: 0 !important;
        height: auto !important;
        min-height: 0 !important;
        margin: 0 !important;
        padding: 0 !important;
        overflow: visible !important;
        background: #ffffff !important;
      }

      body {
        color: #172033 !important;
        font-size: 11.5pt;
        line-height: 1.4;
        box-shadow: none !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }

      .document {
        width: 100% !important;
        max-width: none !important;
        min-width: 0 !important;
        margin: 0 !important;
        padding: 0 !important;
        overflow: visible !important;
      }

      .header {
        gap: 14pt;
        padding-bottom: 9pt;
        margin-bottom: 9pt;
      }

      .route-grid {
        gap: 7pt;
        margin-bottom: 7pt;
      }

      .route-box {
        padding: 9pt 10pt;
      }

      .dates-grid {
        gap: 6pt;
        margin-bottom: 7pt;
      }

      .date-item,
      .metric {
        padding: 7pt 8pt;
      }

      .section {
        margin-bottom: 8pt;
      }

      .section-title {
        margin-bottom: 5pt;
        padding-bottom: 4pt;
      }

      .summary-grid {
        gap: 6pt;
        margin-bottom: 8pt;
      }

      .bottom-grid {
        gap: 7pt;
        margin-top: 3pt;
      }

      .panel {
        padding: 8pt 9pt;
      }

      .note-block {
        padding: 7pt;
      }

      .signature-area {
        gap: 18pt;
        margin-top: 20pt;
      }

      /* Keep individual content groups intact, but allow the overall BOL to
         paginate naturally. Avoiding a break on the whole document can make
         Chromium shrink a page to satisfy the constraint. */
      .header,
      .route-box,
      .date-item,
      .metric,
      .panel,
      .note-block,
      .signature-area,
      tr {
        break-inside: avoid;
        page-break-inside: avoid;
      }

      .section,
      .route-grid,
      .dates-grid,
      .summary-grid,
      .bottom-grid {
        break-inside: auto;
        page-break-inside: auto;
      }

      /* Readable physical print sizes. */
      .company { font-size: 20pt; }
      .doc-title { font-size: 10pt; }
      .load-number { font-size: 15pt; }
      .generated { font-size: 9pt; }
      .status { font-size: 9pt; padding: 2.5pt 8pt; }

      .route-label,
      .section-title,
      .item-label,
      .note-label,
      .metric-label {
        font-size: 9pt;
      }

      .route-value {
        font-size: 10.5pt;
        line-height: 1.45;
      }

      .date-value,
      .contract-line {
        font-size: 10.5pt;
      }

      th {
        font-size: 8.5pt;
        padding: 5.5pt;
      }

      td {
        font-size: 9.5pt;
        padding: 5.5pt;
      }

      .cell-vin {
        font-size: 9pt;
      }

      .metric-value {
        font-size: 13.5pt;
      }

      .note-text {
        max-height: none;
        overflow: visible;
        font-size: 9.5pt;
        line-height: 1.4;
      }

      .signature-box {
        font-size: 9pt;
      }

      .footer {
        margin-top: 9pt;
        padding-top: 6pt;
        font-size: 8pt;
      }

      .table-wrap {
        overflow: visible;
      }

      table {
        width: 100%;
        table-layout: fixed;
      }
    }
  </style>
</head>
<body>
  <main class="document">
    <header class="header">
      <div class="brand">
        <div class="company">${escapeHtml(companyName)}</div>
        <div class="doc-title">Bill of Lading</div>
      </div>
      <div class="header-meta">
        <div class="load-number">${escapeHtml(load.loadNumber)}</div>
        <div class="status-row">
          <span class="status status-${statusClass}">${escapeHtml(load.status || "Unknown")}</span>
          <span class="generated">Generated ${escapeHtml(generatedAt)} MT</span>
        </div>
      </div>
    </header>

    <section class="route-grid">
      <div class="route-box pickup">
        <div class="route-label">Pickup</div>
        <div class="route-value">${bolAddressBlock(load.pickupLocation)}</div>
      </div>
      <div class="route-box delivery">
        <div class="route-label">Delivery</div>
        <div class="route-value">${bolAddressBlock(load.deliveryLocation)}</div>
      </div>
    </section>

    <section class="dates-grid">
      <div class="date-item">
        <div class="item-label">First Available</div>
        <div class="date-value">${escapeHtml(formatScheduleDate(load.dates?.firstAvailable))}</div>
      </div>
      <div class="date-item">
        <div class="item-label">Pickup Deadline</div>
        <div class="date-value">${escapeHtml(formatScheduleDate(load.dates?.pickupDeadline))}</div>
      </div>
      <div class="date-item">
        <div class="item-label">Delivery Deadline</div>
        <div class="date-value">${escapeHtml(formatScheduleDate(load.dates?.deliveryDeadline))}</div>
      </div>
    </section>

    <section class="section">
      <div class="section-title">
        <span>Vehicle Information</span>
        <span>${vehicles.length} vehicle${vehicles.length === 1 ? "" : "s"} · ${escapeHtml(loadTransportType(load))}</span>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Vehicle</th>
              <th>VIN</th>
              <th>Color</th>
              <th>Condition</th>
              <th>Lot #</th>
            </tr>
          </thead>
          <tbody>${vehicleRows}</tbody>
        </table>
      </div>
    </section>

    <section class="summary-grid">
      <div class="metric">
        <div class="metric-label">Carrier Pay</div>
        <div class="metric-value">${fmtCurrency(load.pricing?.carrierPayAmount || 0)}</div>
      </div>
      <div class="metric">
        <div class="metric-label">COD / COP</div>
        <div class="metric-value">${fmtCurrency(load.pricing?.copCodAmount || 0)}</div>
      </div>
      <div class="metric">
        <div class="metric-label">Total Miles</div>
        <div class="metric-value">${fmtNumber(load.pricing?.miles || 0)}</div>
      </div>
      <div class="metric">
        <div class="metric-label">Transport Type</div>
        <div class="metric-value">${escapeHtml(loadTransportType(load))}</div>
      </div>
    </section>

    <section class="bottom-grid">
      ${hasNotes ? `
      <div class="panel">
        <div class="section-title"><span>Notes & Instructions</span></div>
        <div class="notes-grid">${noteBlocks}</div>
      </div>` : ""}

      <div class="panel">
        <div class="section-title"><span>Contract</span></div>
        <div class="contract-line">${contractMeta}</div>
        <div class="signature-area">
          <div class="signature-box">Shipper / Pickup Signature</div>
          <div class="signature-box">Carrier / Delivery Signature</div>
        </div>
      </div>
    </section>

    <footer class="footer">
      <span>${escapeHtml(companyName)} · Bill of Lading</span>
      <span>${escapeHtml(load.loadNumber)}</span>
    </footer>
  </main>
</body>
</html>`
}