import type { DriverTrackingItem } from "@/types/driver-tracking";
import { trackingState } from "@/lib/driver-tracking-view";

/** Reasons come only from the already-authorized directory and requests. */
export function driverAttentionReasons(driver: DriverTrackingItem, now: number, pendingRequestDriverIds: readonly string[] = []): string[] {
  const reasons: string[] = [];
  if (driver.statusRequest) reasons.push(driver.statusRequest.priority === "emergency" ? "Emergency request" : driver.statusRequest.status === "approved_awaiting_reassignment" ? "Awaiting reassignment" : "Work availability request");
  if (driver.shipments.some(load => load.releaseRequest?.status === "pending")) reasons.push("Load release pending");
  if (pendingRequestDriverIds.includes(String(driver.driver?.id ?? driver.id))) reasons.push("Load request pending");
  const trackingExpected = driver.shipments.some(load => ["Accepted", "Picked Up", "In-Transit"].includes(load.status ?? ""));
  // A driver who is not obliged to share, or whose location we cannot access,
  // must not be presented as a tracking failure to this dispatcher.
  if (trackingExpected && driver.canViewExactGps === true) {
    const state = trackingState(driver, now);
    if (state.kind !== "live") reasons.push(state.label);
  }
  return reasons;
}

export function relativeLocationTime(value: string | null | undefined, now: number): string {
  if (!value) return "Not available";
  const time = Date.parse(value);
  if (!Number.isFinite(time) || time > now + 30000) return "Time unavailable";
  const seconds = Math.max(0, Math.floor((now - time) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}