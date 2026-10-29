import type { CustomerShipment, CustomerShipmentStage } from "@/lib/api/customerQuoteRequests"

// ─── My Shipments: wording ────────────────────────────────────────────────────
// What a customer reads about each of their shipping requests. Plain words;
// never the dealership's notes, the driver, or the driver's location.

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
    description: "Your shipment is booked. We'll let you know when it's on the way.",
    tone: "progress",
  },
  picked_up: {
    label: "Picked up",
    description: "Your vehicle was picked up from the dealership.",
    tone: "progress",
  },
  on_the_way: {
    label: "On the way",
    description: "Your vehicle is on its way to you.",
    tone: "progress",
  },
  delivered: {
    label: "Delivered",
    description: "Your vehicle was delivered.",
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
  cancelled: {
    label: "Cancelled",
    description: "The dealership cancelled this shipment. Contact them if you have questions.",
    tone: "stopped",
  },
}

export type ShipmentStepState = "done" | "current" | "upcoming"

export interface ShipmentStep {
  key: "requested" | "booked" | "on_the_way" | "delivered"
  label: string
  state: ShipmentStepState
  at: string | null
}

const STEP_ORDER: Record<CustomerShipmentStage, number> = {
  waiting: 0,
  accepted: 0,
  declined: 0,
  unavailable: 0,
  booked: 1,
  cancelled: 1,
  picked_up: 2,
  on_the_way: 2,
  delivered: 3,
}

/**
 * The four steps a shipment goes through, for the progress line. A request
 * that was declined, closed or cancelled shows no progress line.
 */
export function shipmentSteps(entry: Pick<CustomerShipment, "stage" | "requestedAt" | "shipment">): ShipmentStep[] | null {
  if (SHIPMENT_STAGE_META[entry.stage].tone === "stopped") return null
  const reached = STEP_ORDER[entry.stage]
  const at = [
    entry.requestedAt,
    entry.shipment?.bookedAt ?? null,
    entry.shipment?.onTheWayAt ?? entry.shipment?.pickedUpAt ?? null,
    entry.shipment?.deliveredAt ?? null,
  ]
  const steps: Array<Pick<ShipmentStep, "key" | "label">> = [
    { key: "requested", label: "Requested" },
    { key: "booked", label: "Booked" },
    { key: "on_the_way", label: "On the way" },
    { key: "delivered", label: "Delivered" },
  ]
  return steps.map((step, index) => ({
    ...step,
    state: index < reached || (index === reached && entry.stage === "delivered") ? "done" : index === reached ? "current" : "upcoming",
    at: index <= reached ? at[index] : null,
  }))
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

/** "$950" for an estimated shipping price, or "" when there's none. */
export function formatShipmentPrice(rate: number | null | undefined): string {
  if (typeof rate !== "number" || !Number.isFinite(rate)) return ""
  return `$${Math.round(rate).toLocaleString("en-US")}`
}
