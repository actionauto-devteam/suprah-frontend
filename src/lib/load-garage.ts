/**
 * Whether a delivered customer request's car can go to the customer's My
 * Garage, as the load page's server answer says (see the backend's
 * loadGarageTransfer.service). Null or missing means the load page shows
 * nothing about it.
 */
export type LoadGarageState =
  | { state: "available"; customerName: string; vehicleLabel?: string }
  | { state: "done"; customerName: string; vehicleLabel?: string }
  | { state: "other_dealership"; customerName: string; vehicleLabel?: string }
  | { state: "no_inventory_car"; customerName: string; vehicleLabel?: string }

/** The short note under the load number, or "" when the button says it all (or nothing applies). */
export function garageStatusNote(garage: LoadGarageState | null | undefined): string {
  if (!garage) return ""
  const customer = garage.customerName || "The customer"
  const car = garage.vehicleLabel || "car"
  switch (garage.state) {
    case "done":
      return `The ${car} is in ${customer}'s My Garage.`
    case "other_dealership":
      return `${customer} is registered with another dealership, so this car can't be added to their My Garage from here.`
    case "no_inventory_car":
      return "This car isn't in your Inventory anymore, so it can't be added to the customer's My Garage from here."
    default:
      return ""
  }
}
