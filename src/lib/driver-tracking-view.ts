import type { DriverTrackingItem } from "@/types/driver-tracking";

export const LOCATION_FRESH_MS = 90_000;
export function validCoordinates(value: unknown): value is { lat: number; lng: number } {
  if (!value || typeof value !== "object") return false;
  const { lat, lng } = value as { lat: unknown; lng: unknown };
  return typeof lat === "number" && typeof lng === "number" && Number.isFinite(lat) && Number.isFinite(lng)
    && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

function timestamp(value: string | null | undefined) {
  return value ? new Date(value).getTime() : NaN;
}

export function trackingState(driver: Pick<DriverTrackingItem, "coords" | "isSharing" | "locationRecordedAt" | "lastSeenAt">, now: number) {
  if (!validCoordinates(driver.coords)) return { kind: "unavailable", label: "Location unavailable" } as const;
  const measured = timestamp(driver.locationRecordedAt);
  const received = timestamp(driver.lastSeenAt);
  // Receipt time is not proof of a fresh measurement from a legacy client.
  if (!Number.isFinite(measured) || !Number.isFinite(received) || measured > now + 60_000 || received > now + 60_000) {
    return { kind: "unverified", label: "Location age unverified" } as const;
  }
  if (now - measured > LOCATION_FRESH_MS || now - received > LOCATION_FRESH_MS) {
    return { kind: "outdated", label: "Outdated location" } as const;
  }
  if (!driver.isSharing) return { kind: "stopped", label: "Sharing stopped" } as const;
  return { kind: "live", label: "Fresh GPS" } as const;
}

export function formatTrackingTime(value: string | null | undefined) {
  const time = timestamp(value);
  if (!Number.isFinite(time)) return "Not available";
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Denver", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", second: "2-digit", timeZoneName: "short",
  }).format(time);
}

/** Membership, permissions, loads and profile always come from the authoritative snapshot. */
export function mergeDirectorySnapshot(previous: DriverTrackingItem[], snapshot: DriverTrackingItem[]) {
  const byId = new Map(previous.map(driver => [driver.id, driver]));
  return snapshot.map(driver => {
    const old = byId.get(driver.id);
    if (!old || driver.canViewExactGps !== true || !validCoordinates(driver.coords) || !validCoordinates(old.coords)) return driver;
    if (!(timestamp(old.lastSeenAt) > timestamp(driver.lastSeenAt))) return driver;
    return { ...driver, coords: old.coords, lastSeenAt: old.lastSeenAt, locationRecordedAt: old.locationRecordedAt,
      accuracy: old.accuracy, isSharing: old.isSharing };
  });
}

type LocationEvent = Partial<Pick<DriverTrackingItem, "coords" | "lastSeenAt" | "locationRecordedAt" | "accuracy" | "status" | "isSharing">>;
export function mergeLocationEvent(driver: DriverTrackingItem, event: LocationEvent): DriverTrackingItem {
  // Explicit clearing must not be lost to an old timestamp, for example after access revocation.
  if (event.coords === null) return { ...driver, coords: null, locationRecordedAt: null, accuracy: null, isSharing: false, canViewExactGps: false };
  if (event.coords !== undefined && !validCoordinates(event.coords)) return driver;
  if (!Number.isFinite(timestamp(event.lastSeenAt)) || timestamp(event.lastSeenAt) < timestamp(driver.lastSeenAt)) return driver;
  if (driver.canViewExactGps === false && event.coords !== undefined) return driver;
  if (event.coords !== undefined && Number.isFinite(timestamp(driver.locationRecordedAt)) &&
      (!Number.isFinite(timestamp(event.locationRecordedAt)) || timestamp(event.locationRecordedAt) < timestamp(driver.locationRecordedAt))) return driver;
  return { ...driver,
    coords: event.coords === undefined ? driver.coords : event.coords,
    lastSeenAt: event.lastSeenAt ?? driver.lastSeenAt,
    locationRecordedAt: event.locationRecordedAt === undefined ? driver.locationRecordedAt : event.locationRecordedAt,
    accuracy: event.accuracy === undefined ? driver.accuracy : event.accuracy,
    status: event.status ?? driver.status,
    isSharing: event.isSharing ?? driver.isSharing,
  };
}