import type {
  DriverLoadCompatibility,
  DriverTrackingItem,
} from "@/types/driver-tracking";
import {
  matchPreferredRoute,
  normalizePreferredRouteState,
} from "@/lib/preferred-route";

const VALID_WEEKDAYS = new Set([
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
]);

export interface DriverLoadLike {
  requestedPickupDate?: string | Date | null;
  dates?: {
    firstAvailable?: string | Date | null;
    pickupDeadline?: string | Date | null;
  } | null;
  vehicleCount?: number | null;
  vehicles?: unknown[] | null;
  trailerTypeRequired?: string | null;
  trailerType?: string | null;
  pickupLocation?: {
    city?: string | null;
    state?: string | null;
    zip?: string | null;
    coordinates?: { lat: number; lng: number } | null;
  } | null;
  deliveryLocation?: {
    city?: string | null;
    state?: string | null;
    zip?: string | null;
    coordinates?: { lat: number; lng: number } | null;
  } | null;
  originState?: string | null;
  destinationState?: string | null;
}

function normalizeWeekdays(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [
    ...new Set(
      value
        .map((day) => String(day ?? "").trim().toLowerCase())
        .filter((day) => VALID_WEEKDAYS.has(day)),
    ),
  ];
}

function normalizeTrailerType(value: unknown): string | null {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
  return normalized || null;
}

function getPickupDate(load: DriverLoadLike): Date | null {
  const raw =
    load.dates?.firstAvailable ??
    load.dates?.pickupDeadline ??
    load.requestedPickupDate ??
    null;
  if (!raw) return null;
  const date = raw instanceof Date ? raw : new Date(raw);
  return Number.isFinite(date.getTime()) ? date : null;
}

function getPickupDay(date: Date | null): string | null {
  if (!date) return null;
  return [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ][date.getUTCDay()] ?? null;
}

function distanceMiles(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const toRad = (degrees: number) => (degrees * Math.PI) / 180;
  const radius = 3959;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) *
      Math.cos(toRad(b.lat)) *
      Math.sin(dLng / 2) ** 2;
  return Math.round(radius * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x)));
}

export function evaluateDriverLoadCompatibility(
  driver: DriverTrackingItem | null | undefined,
  load: DriverLoadLike,
): DriverLoadCompatibility {
  const availableDays = normalizeWeekdays(driver?.availability?.availableDays);
  const pickupDate = getPickupDate(load);
  const pickupDay = getPickupDay(pickupDate);
  const availabilityStatus =
    availableDays.length === 0 || !pickupDay
      ? "unknown"
      : availableDays.includes(pickupDay)
        ? "match"
        : "off_schedule";

  const requiredVehicles = Array.isArray(load.vehicles)
    ? load.vehicles.length
    : Number.isFinite(Number(load.vehicleCount))
      ? Math.max(0, Number(load.vehicleCount))
      : 0;
  const configuredCapacity = Number(driver?.equipment?.maxVehicleCapacity);
  const maxVehicles =
    Number.isFinite(configuredCapacity) && configuredCapacity > 0
      ? configuredCapacity
      : null;
  const capacityStatus =
    requiredVehicles <= 0 || maxVehicles == null
      ? "unknown"
      : maxVehicles >= requiredVehicles
        ? "match"
        : "exceeded";

  const requiredTrailerType = normalizeTrailerType(
    load.trailerTypeRequired ?? load.trailerType,
  );
  const driverTrailerType = normalizeTrailerType(driver?.equipment?.trailerType);
  const trailerStatus =
    !requiredTrailerType || !driverTrailerType
      ? "unknown"
      : requiredTrailerType === driverTrailerType
        ? "match"
        : "mismatch";

  const pickupCoords = load.pickupLocation?.coordinates ?? null;
  const homeBase = driver?.logistics?.homeBase ?? null;
  const homeBaseCoords = homeBase?.coordinates ?? null;
  const serviceRadiusMiles = driver?.logistics?.serviceRadiusMiles ?? null;
  const serviceDistance =
    pickupCoords && homeBaseCoords
      ? distanceMiles(homeBaseCoords, pickupCoords)
      : null;
  const serviceAreaStatus =
    serviceRadiusMiles == null || serviceDistance == null
      ? "unknown"
      : serviceDistance <= serviceRadiusMiles
        ? "within"
        : "outside";

  const originState = normalizePreferredRouteState(
    load.pickupLocation?.state ?? load.originState,
  );
  const destinationState = normalizePreferredRouteState(
    load.deliveryLocation?.state ?? load.destinationState,
  );
  const originCity = String(load.pickupLocation?.city ?? "").trim() || null;
  const destinationCity =
    String(load.deliveryLocation?.city ?? "").trim() || null;
  const preferredRoutes = Array.isArray(driver?.logistics?.preferredRoutes)
    ? driver!.logistics!.preferredRoutes
        .map((route) => String(route ?? "").trim())
        .filter(Boolean)
    : [];
  let preferredRouteStatus: "preferred" | "not_preferred" | "unknown" =
    "unknown";
  let matchedRoute: string | null = null;
  let preferredRouteMatchLevel: "city" | "mixed" | "state" | null = null;

  if (originState && destinationState && preferredRoutes.length > 0) {
    preferredRouteStatus = "not_preferred";
    for (const route of preferredRoutes) {
      const match = matchPreferredRoute(route, {
        originState,
        originCity,
        destinationState,
        destinationCity,
      });
      if (match.matches) {
        preferredRouteStatus = "preferred";
        matchedRoute = route;
        preferredRouteMatchLevel = match.matchLevel;
        break;
      }
    }
  }

  const liveCoords = driver?.isSharing ? driver.coords : null;
  const proximityOrigin = liveCoords ?? homeBaseCoords;
  const proximitySource = liveCoords
    ? "live_gps"
    : homeBaseCoords
      ? "home_base"
      : null;
  const distanceToPickupMiles =
    pickupCoords && proximityOrigin
      ? distanceMiles(proximityOrigin, pickupCoords)
      : null;

  const warnings: string[] = [];
  if (availabilityStatus === "off_schedule") {
    warnings.push("outside_regular_availability");
  }
  if (capacityStatus === "exceeded") {
    warnings.push("vehicle_capacity_exceeded");
  } else if (capacityStatus === "unknown") {
    warnings.push("vehicle_capacity_unknown");
  }
  if (trailerStatus === "mismatch") warnings.push("trailer_mismatch");

  return {
    availability: {
      status: availabilityStatus,
      pickupDate: pickupDate?.toISOString() ?? null,
      pickupDay,
      availableDays,
    },
    capacity: {
      status: capacityStatus,
      requiredVehicles,
      maxVehicles,
    },
    trailer: {
      status: trailerStatus,
      requiredTrailerType,
      driverTrailerType,
    },
    serviceArea: {
      status: serviceAreaStatus,
      serviceRadiusMiles,
      distanceFromHomeBaseToPickupMiles: serviceDistance,
      homeBaseLabel:
        homeBase && (homeBase.city || homeBase.state)
          ? [homeBase.city, homeBase.state].filter(Boolean).join(", ")
          : null,
    },
    preferredRoute: {
      status: preferredRouteStatus,
      originState,
      originCity,
      destinationState,
      destinationCity,
      matchedRoute,
      matchLevel: preferredRouteMatchLevel,
      preferredRoutes,
    },
    proximity: {
      distanceToPickupMiles,
      source: proximitySource,
      lastSeenAt: driver?.lastSeenAt ?? null,
    },
    requiresAvailabilityOverride: availabilityStatus === "off_schedule",
    requiresCapacityOverride: capacityStatus !== "match",
    driverRequestAllowed: capacityStatus === "match",
    recommended:
      availabilityStatus !== "off_schedule" &&
      capacityStatus === "match" &&
      trailerStatus !== "mismatch",
    warnings,
  };
}

export function compatibilityRank(compatibility: DriverLoadCompatibility) {
  // Hard/strong compatibility continues to dominate ranking.
  if (compatibility.capacity.status === "exceeded") return 1000;
  if (compatibility.capacity.status === "unknown") return 900;

  let score = 0;
  if (compatibility.availability.status === "off_schedule") score += 200;
  if (compatibility.availability.status === "unknown") score += 40;
  if (compatibility.trailer.status === "mismatch") score += 100;
  if (compatibility.trailer.status === "unknown") score += 15;

  // Recommendation-only factors. They never block assignment.
  const serviceAreaStatus = compatibility.serviceArea?.status ?? "unknown";
  const preferredRouteStatus =
    compatibility.preferredRoute?.status ?? "unknown";
  if (serviceAreaStatus === "outside") score += 60;
  if (serviceAreaStatus === "unknown") score += 10;
  if (preferredRouteStatus === "not_preferred") score += 25;
  if (preferredRouteStatus === "unknown") score += 5;

  const miles = compatibility.proximity?.distanceToPickupMiles ?? null;
  if (typeof miles === "number" && Number.isFinite(miles)) {
    score += Math.min(80, Math.round(miles / 25));
  } else {
    score += 8;
  }

  return score;
}

export function titleCaseDay(day: string | null | undefined) {
  if (!day) return null;
  return `${day.slice(0, 1).toUpperCase()}${day.slice(1)}`;
}

export function extractCompatibilityFromError(
  error: any,
): DriverLoadCompatibility | null {
  const errors = error?.response?.data?.errors;
  if (!Array.isArray(errors)) return null;
  const entry = errors.find(
    (item: any) => item?.type === "driver_load_compatibility",
  );
  return entry?.compatibility ?? null;
}