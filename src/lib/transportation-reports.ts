import { Quote } from "@/types/transportation"
import { Load } from "@/types/load"

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
    rate: l.pricing?.carrierPayAmount || l.pricing?.estimatedRate || 0,
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
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "America/Denver" })
}

export function fmtCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount)
}

export function fmtNumber(num: number): string {
  return new Intl.NumberFormat("en-US").format(Math.round(num))
}

export function loadCustomer(l: Load): string {
  return l.pickupLocation?.contactName || l.deliveryLocation?.contactName || "—"
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
  return l.pricing?.carrierPayAmount || l.pricing?.estimatedRate || 0
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
  if (typeof driver === "object") return driver.name || "Unknown"
  return "Assigned"
}

export function quoteCustomer(q: Quote): string {
  return `${q.firstName || ''} ${q.lastName || ''}`.trim() || "—"
}

export function quoteVehicle(q: Quote): string {
  if (q.vehicleId) {
    return `${q.vehicleId.year || ''} ${q.vehicleId.make || ''} ${q.vehicleId.modelName || ''}`.trim() || "—"
  }
  return q.vehicleName || "—"
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

export function generateBolHtml(load: Load): string {
  const generatedAt = new Date().toLocaleString("en-US", {
    month: "long", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true, timeZone: "America/Denver",
  })

  const vehicleRows = (load.vehicles || []).map((v, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${escapeHtml(`${v.year || ""} ${v.make || ""} ${v.model || ""}`.trim() || "N/A")}</td>
      <td>${escapeHtml(v.vin || "N/A")}</td>
      <td>${escapeHtml(v.color || "N/A")}</td>
      <td>${escapeHtml(v.condition || "N/A")}</td>
      <td>${escapeHtml(v.lotNumber || "N/A")}</td>
    </tr>`).join("")

  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8">
<title>BOL — ${escapeHtml(load.loadNumber)}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, Helvetica, sans-serif; color: #111; background: #fff; padding: 40px 48px; max-width: 800px; margin: 0 auto; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #111; padding-bottom: 16px; margin-bottom: 20px; }
  .company { font-size: 20px; font-weight: 900; letter-spacing: 3px; text-transform: uppercase; }
  .doc-title { font-size: 11px; letter-spacing: 2px; text-transform: uppercase; color: #555; margin-top: 4px; }
  .load-number { text-align: right; font-size: 14px; font-weight: 700; }
  .load-meta { text-align: right; font-size: 10px; color: #666; margin-top: 2px; }
  .route-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 20px; }
  .route-box { border: 1px solid #ddd; border-radius: 6px; padding: 12px 14px; }
  .route-label { font-size: 9px; font-weight: 900; text-transform: uppercase; letter-spacing: 1.5px; color: #888; margin-bottom: 6px; }
  .route-value { font-size: 12px; line-height: 1.6; }
  .dates-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 20px; font-size: 11px; }
  .dates-grid .item-label { font-size: 9px; text-transform: uppercase; letter-spacing: 1px; color: #888; font-weight: 700; }
  .section-title { font-size: 9px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; color: #444; margin-bottom: 8px; border-bottom: 1px solid #ddd; padding-bottom: 4px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
  table th, table td { padding: 8px 10px; font-size: 11px; border-bottom: 1px solid #eee; text-align: left; }
  table th { background: #f4f4f5; font-size: 9px; text-transform: uppercase; letter-spacing: 1px; color: #666; }
  .financials { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 24px; }
  .financials .amount { font-size: 15px; font-weight: 900; }
  .financials .label { font-size: 9px; text-transform: uppercase; letter-spacing: 1px; color: #888; font-weight: 700; }
  .sig-area { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 32px; }
  .sig-box { border-top: 1px solid #bbb; padding-top: 6px; font-size: 10px; color: #888; text-align: center; }
  .footer { text-align: center; font-size: 9px; color: #bbb; margin-top: 32px; border-top: 1px solid #eee; padding-top: 12px; letter-spacing: 1px; }
  @media print { body { padding: 20px 28px; } @page { size: letter; margin: 15mm; } }
</style></head><body>
  <div class="header">
    <div>
      <div class="company">Action Auto</div>
      <div class="doc-title">Bill of Lading</div>
    </div>
    <div>
      <div class="load-number">${escapeHtml(load.loadNumber)}</div>
      <div class="load-meta">${escapeHtml(load.status)} · Generated ${escapeHtml(generatedAt)}</div>
    </div>
  </div>

  <div class="route-grid">
    <div class="route-box">
      <div class="route-label">Pickup</div>
      <div class="route-value">${bolAddressBlock(load.pickupLocation)}</div>
    </div>
    <div class="route-box">
      <div class="route-label">Delivery</div>
      <div class="route-value">${bolAddressBlock(load.deliveryLocation)}</div>
    </div>
  </div>

  <div class="dates-grid">
    <div><div class="item-label">First Available</div>${escapeHtml(fmtDate(load.dates?.firstAvailable))}</div>
    <div><div class="item-label">Pickup Deadline</div>${escapeHtml(fmtDate(load.dates?.pickupDeadline))}</div>
    <div><div class="item-label">Delivery Deadline</div>${escapeHtml(fmtDate(load.dates?.deliveryDeadline))}</div>
  </div>

  <p class="section-title">Vehicles (${load.vehicles?.length || 0}) · ${escapeHtml(loadTransportType(load))}</p>
  <table>
    <thead><tr><th>#</th><th>Vehicle</th><th>VIN</th><th>Color</th><th>Condition</th><th>Lot #</th></tr></thead>
    <tbody>${vehicleRows}</tbody>
  </table>

  <div class="financials">
    <div><div class="label">Carrier Pay</div><div class="amount">${fmtCurrency(load.pricing?.carrierPayAmount || 0)}</div></div>
    <div><div class="label">COD / COP</div><div class="amount">${fmtCurrency(load.pricing?.copCodAmount || 0)}</div></div>
    <div><div class="label">Total Miles</div><div class="amount">${fmtNumber(load.pricing?.miles || 0)}</div></div>
  </div>

  <div class="sig-area">
    <div class="sig-box">Shipper / Pickup Signature</div>
    <div class="sig-box">Carrier / Delivery Signature</div>
  </div>
  <div class="footer">ACTION AUTO · BILL OF LADING · ${escapeHtml(load.loadNumber)}</div>
</body></html>`
}
