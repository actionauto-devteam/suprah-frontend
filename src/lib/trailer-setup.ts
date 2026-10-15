import type { DriverLoadCompatibility } from "@/types/driver-tracking";

/** Where a driver sets their trailer type and how many vehicles it carries. */
export const EQUIPMENT_PAGE_PATH = "/driver/equipment";

/**
 * Why a driver can't request a load because of their trailer, in plain words,
 * or null when the load fits. A driver who never set up their trailer still
 * has the default capacity of 1, so they're asked to set it up instead of
 * being told their trailer carries 1 vehicle.
 */
export function trailerFitProblem(
  compatibility: DriverLoadCompatibility | undefined,
): { title: string; detail: string } | null {
  if (!compatibility || compatibility.capacity.status === "match") return null;
  const { capacity, trailer } = compatibility;

  if (!trailer.driverTrailerType) {
    return {
      title: "Set up your trailer first",
      detail:
        "On the Equipment page, choose your trailer type and how many vehicles it carries. Then you can request this load.",
    };
  }

  if (capacity.status === "exceeded" && capacity.maxVehicles != null) {
    const required = capacity.requiredVehicles;
    return {
      title: "This load needs a bigger trailer",
      detail: `This load has ${required} vehicle${required === 1 ? "" : "s"}, but your trailer is set to carry ${capacity.maxVehicles}. If your trailer can carry more, update it on the Equipment page.`,
    };
  }

  return {
    title: "We couldn't check this load against your trailer",
    detail: "Check your trailer details on the Equipment page, or message Dispatch about this load.",
  };
}
