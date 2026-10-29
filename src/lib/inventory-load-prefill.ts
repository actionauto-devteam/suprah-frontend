// ─── Create Load from Inventory ──────────────────────────────────────────────
// "Create Load" on an Inventory vehicle opens the Create Load page with that
// vehicle in the link. The VIN is kept so the server links the load to the
// inventory vehicle. Values come from the address bar, so they are trimmed
// and capped here; the server validates the load as usual.

export interface InventoryLoadVehicle {
  vin: string
  year: number | ""
  make: string
  model: string
  stockNumber: string
}

const clean = (value: string | null, max: number) => String(value ?? "").trim().slice(0, max)

/** The Inventory vehicle in the Create Load link, or null when there is none. */
export function inventoryVehicleFromParams(params: { get(name: string): string | null }): InventoryLoadVehicle | null {
  // Drop spaces and symbols before capping, so a stray space can't cut the VIN short.
  const vin = clean(params.get("vin"), 40).toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 17)
  const make = clean(params.get("make"), 60)
  const model = clean(params.get("model"), 60)
  const stockNumber = clean(params.get("stockNumber"), 40)
  const yearText = clean(params.get("year"), 4)
  const yearNumber = /^\d{4}$/.test(yearText) ? Number(yearText) : NaN
  const year = yearNumber >= 1900 && yearNumber <= new Date().getFullYear() + 2 ? yearNumber : ""
  if (!vin && !make && !model) return null
  return { vin, year, make, model, stockNumber }
}

/** "2021 Toyota Camry", falling back to the VIN or stock number. */
export function inventoryVehicleLabel(vehicle: InventoryLoadVehicle): string {
  const name = [vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(" ")
  if (name) return name
  if (vehicle.vin) return `VIN ${vehicle.vin}`
  return vehicle.stockNumber ? `stock #${vehicle.stockNumber}` : "this vehicle"
}
