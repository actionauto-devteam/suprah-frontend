import type { Load } from "@/types/load";

// Mirrors canStaffDeleteLoad in suprah-backend/src/services/loadLifecyclePolicy.ts.
// Active loads have a driver relying on them and must be released through
// Driver Tracker (Remove) instead of being deleted.
const CLOSED_DELETABLE_STATUSES = new Set(["Cancelled", "Delivered"]);
const UNASSIGNED_DELETABLE_STATUSES = new Set(["Draft", "Posted"]);

/** Returns why a load can't be deleted, or null when deletion is allowed. */
export function getLoadDeleteBlockReason(
  load: Pick<Load, "status" | "assignedDriverId">,
): string | null {
  if (CLOSED_DELETABLE_STATUSES.has(load.status)) return null;
  if (UNASSIGNED_DELETABLE_STATUSES.has(load.status) && !load.assignedDriverId) {
    return null;
  }
  return `${load.status} loads with an assigned driver can't be deleted. Remove the driver in Driver Tracker first.`;
}
