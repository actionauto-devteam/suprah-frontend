/**
 * The note staff see on a quote card about its inventory vehicle: a customer
 * request closed because the car left the marketplace, or a car that was sold
 * or removed from inventory. Null when there's nothing to say.
 */
export function quoteVehicleNotice(quote: {
  status?: string
  closedReason?: string | null
  vehicleState?: string | null
}): { label: string; tone: "stopped" | "info" } | null {
  if (String(quote.status ?? "").toLowerCase() === "rejected" && quote.closedReason === "vehicle_unavailable") {
    return { label: "Closed: vehicle no longer available", tone: "stopped" }
  }
  if (quote.vehicleState === "removed") return { label: "No longer in inventory", tone: "stopped" }
  if (quote.vehicleState === "sold") return { label: "Vehicle sold", tone: "info" }
  return null
}
