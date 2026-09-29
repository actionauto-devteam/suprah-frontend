// Mirrors suprah-backend/src/constants/loadStatus.ts. Change both together.

/** A driver has the load: assigned and not yet delivered. */
export const ACTIVE_LOAD_STATUSES = ["Assigned", "Accepted", "Picked Up", "In-Transit"] as const;

/** The driver accepted the load, so GPS tracking applies. */
export const GPS_TRACKING_LOAD_STATUSES = ["Accepted", "Picked Up", "In-Transit"] as const;

/** The vehicles are on the trailer. */
export const VEHICLES_ON_BOARD_STATUSES = ["Picked Up", "In-Transit"] as const;

const includesStatus = (list: readonly string[], status: unknown) =>
  list.includes(String(status ?? ""));

export const isActiveLoadStatus = (status: unknown) => includesStatus(ACTIVE_LOAD_STATUSES, status);
export const isGpsTrackingLoadStatus = (status: unknown) => includesStatus(GPS_TRACKING_LOAD_STATUSES, status);
export const hasVehiclesOnBoard = (status: unknown) => includesStatus(VEHICLES_ON_BOARD_STATUSES, status);
