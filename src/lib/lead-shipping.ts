import type { ShippingQuoteFormData, Vehicle } from "@/types/inventory"

/**
 * "Create shipping quote" on a CRM lead (decided 2026-10-30): offered on leads
 * in the Sold group, and pre-filled from the lead so staff only confirm the
 * delivery address and the route.
 */

/** The lead statuses in the CRM's Sold group (see the backend's leadStatus constants). */
export const SOLD_LEAD_STATUSES = ["Sold", "In Finance", "Online Financing"] as const

export function isSoldLeadStatus(status: unknown): boolean {
  return typeof status === "string" && (SOLD_LEAD_STATUSES as readonly string[]).includes(status)
}

const US_STATES = new Set([
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "DC", "FL", "GA", "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME",
  "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI",
  "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
])

type DestinationFields = Pick<ShippingQuoteFormData, "toStreetAddress" | "toCity" | "toState" | "zipCode">

/**
 * Splits a lead's free-text address ("123 Main St, Denver, CO 80202") into the
 * quote's destination fields. When it can't be split reliably, the text goes
 * in the street line and staff fill in the rest; nothing is guessed.
 */
export function leadAddressToDestination(address: unknown): Partial<DestinationFields> {
  const text = typeof address === "string" ? address.replace(/\s+/g, " ").trim().slice(0, 200) : ""
  if (!text) return {}
  // Comma by comma from the end: [street…], city, "ST 12345" (or ST, 12345), optional country.
  const parts = text.split(",").map((part) => part.trim()).filter(Boolean)
  if (parts.length && /^(usa?|united states)$/i.test(parts[parts.length - 1])) parts.pop()
  let zip = ""
  if (parts.length && /^\d{5}(-\d{4})?$/.test(parts[parts.length - 1])) zip = parts.pop() as string
  const stateZip = /^([A-Za-z]{2})(?: (\d{5}(?:-\d{4})?))?$/.exec(parts[parts.length - 1] ?? "")
  if (parts.length < 2 || !stateZip || !US_STATES.has(stateZip[1].toUpperCase()) || (zip && stateZip[2])) {
    return { toStreetAddress: text }
  }
  parts.pop()
  const city = parts.pop() as string
  const street = parts.join(", ")
  const zipCode = zip || stateZip[2] || ""
  return {
    ...(street ? { toStreetAddress: street } : {}),
    toCity: city,
    toState: stateZip[1].toUpperCase(),
    ...(zipCode ? { zipCode } : {}),
  }
}

/** The quote window's starting values for a lead. */
export function leadQuoteInitialData(lead: {
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
  address?: string
}): Partial<ShippingQuoteFormData> {
  return {
    firstName: String(lead.firstName ?? "").trim(),
    lastName: String(lead.lastName ?? "").trim(),
    email: String(lead.email ?? "").trim(),
    phone: String(lead.phone ?? "").trim(),
    ...leadAddressToDestination(lead.address),
  }
}

/** An Inventory car as the vehicles list returns it (only what the quote window uses). */
export interface InventoryVehicleRow {
  _id?: string
  id?: string
  stockNumber?: string
  year?: number
  make?: string
  modelName?: string
  model?: string
  trim?: string
  price?: number
  mileage?: number
  vin?: string
  images?: string[]
  image?: string
  location?: string
  exteriorColor?: string
  color?: string
  transmission?: string
  fuelType?: string
}

/** An Inventory car from the vehicles list, shaped the way Transportation's quote window expects. */
export function inventoryVehicleFromApi(v: InventoryVehicleRow): Vehicle {
  return {
    id: String(v._id ?? v.id ?? ""),
    stockNumber: v.stockNumber || "N/A",
    year: v.year || 0,
    make: v.make || "Unknown",
    model: v.modelName || v.model || "Unknown",
    trim: v.trim || "",
    price: v.price || 0,
    mileage: v.mileage || 0,
    vin: v.vin || "N/A",
    image: v.images?.[0] || v.image || "",
    location: v.location || "Unknown",
    color: v.exteriorColor || v.color || "N/A",
    transmission: v.transmission || "Automatic",
    fuelType: v.fuelType || "Gasoline",
  }
}

/** The confirmation after a quote is created from a lead. */
export function leadQuoteCreatedMessage(rate: unknown): string {
  const value = Number(rate)
  return Number.isFinite(value) && value > 0
    ? `Quote created. Estimated shipping: $${Math.round(value).toLocaleString("en-US")}. You'll find it under Quotes in Transportation.`
    : "Quote created. You'll find it under Quotes in Transportation."
}
