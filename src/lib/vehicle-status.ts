import type { InventoryShippingState } from "@/lib/vehicle-shipping"

/**
 * "Change status" on an Inventory car (decided 2026-11-02): staff set a car
 * Ready for Sale, In Recon or Sold, for example to put a car back after
 * testing or to mark a sale the feed hasn't caught up with. "In Transit" isn't
 * offered: loads set it at pickup and change it again at delivery.
 */
export const CHANGEABLE_VEHICLE_STATUSES = ["Ready for Sale", "In Recon", "Sold"] as const
export type ChangeableVehicleStatus = (typeof CHANGEABLE_VEHICLE_STATUSES)[number]

/** What each status means for the dealership and its customers, in plain words. */
export const VEHICLE_STATUS_CHOICES: Record<ChangeableVehicleStatus, string> = {
  "Ready for Sale": "Shown on the marketplace, so customers can ask about it and request shipping.",
  "In Recon": "Hidden from the marketplace while the car is being prepared.",
  Sold: "Hidden from the marketplace. Customers still waiting on a shipping request for it are told it's no longer available.",
}

const ON_THE_WAY = new Set(["Picked Up", "In-Transit"])

/** True while the car is on a load that's been picked up: delivery sets its status. */
export function isVehicleOnTheWay(state: InventoryShippingState | null | undefined): boolean {
  return state?.kind === "load" && ON_THE_WAY.has(state.load.status)
}

/**
 * The car's status now, when the server refused a change because someone else
 * changed the car meanwhile (2026-11-16), so the window can show it. Null for
 * any other failure.
 */
export function statusChangedByOthers(error: unknown): string | null {
  const response = (error as { response?: { status?: number; data?: { errors?: unknown } } } | null)?.response
  if (response?.status !== 409) return null
  const errors: unknown[] = Array.isArray(response.data?.errors) ? response.data.errors : []
  const conflict = errors.find(
    (item): item is { type: string; status?: unknown } =>
      Boolean(item) && (item as { type?: unknown }).type === "vehicle_status_changed",
  )
  return conflict && typeof conflict.status === "string" && conflict.status.trim() ? conflict.status.trim() : null
}

/** The confirmation after a change. */
export function vehicleStatusChangedMessage(vehicleLabel: string, status: ChangeableVehicleStatus): string {
  const label = vehicleLabel.trim() || "This car"
  return `${label} is now ${status}.`
}
