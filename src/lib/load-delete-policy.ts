import type { Load } from "@/types/load";
import { hasVehiclesOnBoard } from "@/lib/load-status";

// Mirrors canStaffDeleteLoad and staffDeleteBlockedMessage in
// suprah-backend/src/services/loadLifecyclePolicy.ts. A load a driver has is
// cancelled instead (before pickup) and can be deleted after that. Delivered
// loads are the record of the driver's work and pay and are never deleted.
const CLOSED_DELETABLE_STATUSES = new Set(["Cancelled"]);
const UNASSIGNED_DELETABLE_STATUSES = new Set(["Draft", "Posted"]);

/** Returns why a load can't be deleted, or null when deletion is allowed. */
export function getLoadDeleteBlockReason(
  load: Pick<Load, "status" | "assignedDriverId">,
): string | null {
  if (load.status === "Delivered") {
    return "Delivered loads are kept as the record of the driver's work and pay, so they can't be deleted.";
  }
  if (CLOSED_DELETABLE_STATUSES.has(load.status)) return null;
  if (UNASSIGNED_DELETABLE_STATUSES.has(load.status) && !load.assignedDriverId) {
    return null;
  }
  if (hasVehiclesOnBoard(load.status)) {
    return `${load.status} loads can't be deleted while the vehicles are on the driver's truck. Finish the delivery, or use Reassign in Driver Tracker.`;
  }
  return "Loads with a driver can't be deleted. If the shipment isn't happening, open the load and choose Cancel load. You can delete it after that.";
}
