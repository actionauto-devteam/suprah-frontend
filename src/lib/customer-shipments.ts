import type { CustomerShipment, CustomerShipmentStage } from "@/lib/api/customerQuoteRequests"

// ─── My Shipments: wording ────────────────────────────────────────────────────
// What a customer reads about each shipment. Plain words; never the
// dealership's notes. From the moment a driver accepts, the customer sees that
// driver's full name, photo and truck (decided 2026-11-05), never their phone
// or email.

export interface ShipmentStageMeta {
  label: string
  description: string
  tone: "waiting" | "progress" | "done" | "stopped"
}

export const SHIPMENT_STAGE_META: Record<CustomerShipmentStage, ShipmentStageMeta> = {
  waiting: {
    label: "Waiting for the dealership",
    description: "The dealership has your request and will get back to you.",
    tone: "waiting",
  },
  accepted: {
    label: "Accepted",
    description: "The dealership accepted your request and will contact you to arrange the details.",
    tone: "progress",
  },
  booked: {
    label: "Booked",
    description: "Your shipment is booked. We'll let you know when a driver accepts it.",
    tone: "progress",
  },
  finding_driver: {
    label: "Finding a new driver",
    description:
      "The driver who had your vehicle can no longer take it, so the dealership is finding a new one. We'll let you know when one accepts.",
    tone: "waiting",
  },
  driver_accepted: {
    label: "Driver accepted",
    description: "A driver accepted your shipment and will pick up your vehicle next.",
    tone: "progress",
  },
  picked_up: {
    label: "Picked up",
    description: "Your vehicle was picked up and will be on its way soon.",
    tone: "progress",
  },
  on_the_way: {
    label: "On the way",
    description: "Your vehicle is on its way to you.",
    tone: "progress",
  },
  arrived: {
    label: "Driver arrived",
    description: "Your driver arrived at the delivery address with your vehicle.",
    tone: "progress",
  },
  delivered: {
    label: "Delivered",
    description: "Your vehicle was delivered. If something isn't right, contact the dealership.",
    tone: "done",
  },
  declined: {
    label: "Declined",
    description: "The dealership declined this request. Contact them if you have questions.",
    tone: "stopped",
  },
  unavailable: {
    label: "No longer available",
    description: "This vehicle is no longer available, so the request was closed.",
    tone: "stopped",
  },
  withdrawn: {
    label: "Withdrawn",
    description: "You withdrew this request. The dealership has been told.",
    tone: "stopped",
  },
  cancelled: {
    label: "Cancelled",
    description: "The dealership cancelled this shipment. Contact them if you have questions.",
    tone: "stopped",
  },
}

export type ShipmentStepState = "done" | "current" | "upcoming"

export type ShipmentStepKey = "requested" | "booked" | "driver_accepted" | "picked_up" | "on_the_way" | "arrived" | "delivered"

export interface ShipmentStep {
  key: ShipmentStepKey
  label: string
  state: ShipmentStepState
  at: string | null
}

const ALL_STEPS: Array<Pick<ShipmentStep, "key" | "label">> = [
  { key: "requested", label: "Requested" },
  { key: "booked", label: "Booked" },
  { key: "driver_accepted", label: "Driver accepted" },
  { key: "picked_up", label: "Picked up" },
  { key: "on_the_way", label: "On the way" },
  { key: "arrived", label: "Arrived" },
  { key: "delivered", label: "Delivered" },
]

/** The step each stage has reached (a key from ALL_STEPS). */
const STAGE_STEP: Record<CustomerShipmentStage, ShipmentStepKey> = {
  waiting: "requested",
  accepted: "requested",
  declined: "requested",
  unavailable: "requested",
  withdrawn: "requested",
  booked: "booked",
  // Back to waiting for a driver: the booking still stands.
  finding_driver: "booked",
  cancelled: "booked",
  driver_accepted: "driver_accepted",
  picked_up: "picked_up",
  on_the_way: "on_the_way",
  arrived: "arrived",
  delivered: "delivered",
}

/**
 * The steps a shipment goes through, for the progress line: from Requested
 * (or from Booked, for a shipment the dealership booked for the customer) to
 * Delivered. A request that was declined, closed or cancelled shows none.
 */
export function shipmentSteps(
  entry: Pick<CustomerShipment, "stage" | "requestedAt" | "shipment"> & Partial<Pick<CustomerShipment, "kind">>,
): ShipmentStep[] | null {
  if (SHIPMENT_STAGE_META[entry.stage].tone === "stopped") return null
  const steps = entry.kind === "shared" ? ALL_STEPS.filter((step) => step.key !== "requested") : ALL_STEPS
  const reached = steps.findIndex((step) => step.key === STAGE_STEP[entry.stage])
  const shipment = entry.shipment
  const times: Record<ShipmentStepKey, string | null> = {
    requested: entry.requestedAt ?? null,
    booked: shipment?.bookedAt ?? null,
    driver_accepted: shipment?.driverAcceptedAt ?? null,
    picked_up: shipment?.pickedUpAt ?? null,
    on_the_way: shipment?.onTheWayAt ?? null,
    arrived: shipment?.arrivedAt ?? null,
    delivered: shipment?.deliveredAt ?? null,
  }
  return steps.map((step, index) => ({
    ...step,
    state: index < reached || (index === reached && entry.stage === "delivered") ? "done" : index === reached ? "current" : "upcoming",
    at: index <= reached ? times[step.key] : null,
  }))
}

/** The latest step reached, for the one-line summary under the progress bar. */
export function currentShipmentStep(steps: ShipmentStep[] | null): { step: ShipmentStep; position: number; total: number } | null {
  if (!steps || steps.length === 0) return null
  const currentIndex = steps.findIndex((step) => step.state === "current")
  const index = currentIndex >= 0 ? currentIndex : steps.length - 1
  return { step: steps[index], position: index + 1, total: steps.length }
}

/** "MR" for "Mark Reyes", for a driver without a photo. */
export function driverInitials(name: string | null | undefined): string {
  const parts = String(name ?? "").trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "?"
  const first = parts[0][0] ?? ""
  const last = parts.length > 1 ? parts[parts.length - 1][0] ?? "" : ""
  return `${first}${last}`.toUpperCase()
}

/** "Oct 12, 2:30 PM" in Mountain Time, the dealership's time zone. */
export function formatShipmentDate(iso: string | null | undefined): string {
  if (!iso) return ""
  const date = new Date(iso)
  if (!Number.isFinite(date.getTime())) return ""
  return date.toLocaleString("en-US", {
    timeZone: "America/Denver",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

/**
 * "Nov 3, 2026" for a delivery deadline. Schedule dates are calendar days
 * stored at UTC midnight, so this reads the day the way the load page does
 * (formatScheduleDate) and never shows the day before. "" when there's none.
 */
export function formatExpectedByDate(iso: string | null | undefined): string {
  const match = typeof iso === "string" ? /^(\d{4})-(\d{2})-(\d{2})/.exec(iso.trim()) : null
  if (!match) return ""
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12))
  if (!Number.isFinite(date.getTime())) return ""
  return date.toLocaleDateString("en-US", { timeZone: "UTC", month: "short", day: "numeric", year: "numeric" })
}

/** "$950" for an estimated shipping price, or "" when there's none. */
export function formatShipmentPrice(rate: number | null | undefined): string {
  if (typeof rate !== "number" || !Number.isFinite(rate)) return ""
  return `$${Math.round(rate).toLocaleString("en-US")}`
}
