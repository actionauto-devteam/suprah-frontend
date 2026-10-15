import type { Load } from "@/types/load"

// "I've arrived" at a stop: the driver taps it on arrival, and Dispatch sees
// how long they waited there before pickup or delivery.

export type ArrivalStop = "pickup" | "delivery"

/** The stop a driver can say they've arrived at, for this load status. */
export function arrivalStopFor(status?: string | null): ArrivalStop | null {
  if (status === "Accepted") return "pickup"
  if (status === "Picked Up" || status === "In-Transit") return "delivery"
  return null
}

/**
 * When the assigned driver said they arrived at this stop (ISO), or null.
 * An arrival recorded by an earlier driver, before a reassignment, is ignored.
 */
export function arrivalAt(
  load: Pick<Load, "arrivals" | "assignedDriverId"> | null | undefined,
  stop: ArrivalStop,
): string | null {
  const arrival = load?.arrivals?.[stop]
  if (!arrival?.at) return null
  if (arrival.driverId) {
    const assigned =
      typeof load?.assignedDriverId === "object" ? load.assignedDriverId?._id : load?.assignedDriverId
    if (!assigned || String(assigned) !== String(arrival.driverId)) return null
  }
  return arrival.at
}

/** "35 min", "1 h 20 min" between an ISO time and `untilMs`. */
export function formatWait(fromIso: string, untilMs: number): string {
  const minutes = Math.max(0, Math.round((untilMs - new Date(fromIso).getTime()) / 60_000))
  if (!Number.isFinite(minutes)) return ""
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest ? `${hours} h ${rest} min` : `${hours} h`
}
