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
