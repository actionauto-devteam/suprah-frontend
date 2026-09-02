import type { DriverProfile } from "@/types/driver-profile";
import type { UserProfile } from "@/types/user";

export type ReadinessLevel =
  | "not_configured"
  | "in_progress"
  | "under_review"
  | "ready"
  | "needs_attention"
  | "unavailable";

export interface ReadinessCheck {
  key: string;
  label: string;
  complete: boolean;
}

export interface EquipmentReadiness {
  level: "not_configured" | "in_progress" | "ready";
  complete: boolean;
  percent: number;
  completed: number;
  total: number;
  checks: ReadinessCheck[];
  missing: ReadinessCheck[];
}

export interface VerificationReadiness {
  level: ReadinessLevel;
  ready: boolean;
  label: string;
  detail: string;
}

export interface DriverReadiness {
  ready: boolean;
  level: "ready" | "needs_attention";
  label: "Ready" | "Needs Attention";
  emailVerified: boolean;
  equipment: EquipmentReadiness;
  verification: VerificationReadiness;
  blockingCount: number;
}

export interface EquipmentReadinessInput {
  trailerType?: string | null;
  customTrailerName?: string | null;
  maxVehicleCapacity?: number | null;
  truckMake?: string | null;
  truckModel?: string | null;
  truckYear?: number | null;
  vin?: string | null;
  plateNumber?: string | null;
}

const hasText = (value: unknown) =>
  typeof value === "string" && value.trim().length > 0;

const hasPositiveNumber = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) && value > 0;

/**
 * UI readiness only.
 *
 * IMPORTANT:
 * - This does not change dispatcher/driver load eligibility.
 * - It does not replace backend compatibility validation.
 * - It intentionally ignores optional rig details such as color, engine,
 *   GVWR, trailer make/model, DOT/MC, axle count, and special features.
 */
export function getEquipmentReadiness(
  equipment: EquipmentReadinessInput | null | undefined,
): EquipmentReadiness {
  const trailerConfigured = hasText(equipment?.trailerType);

  const checks: ReadinessCheck[] = [
    {
      key: "trailerType",
      label: "Trailer Type",
      complete: trailerConfigured,
    },
    {
      key: "maxVehicleCapacity",
      label: "Vehicle Capacity",
      // DriverProfile currently has a server default of 1. Capacity therefore
      // counts only after a real trailer type exists.
      complete:
        trailerConfigured && hasPositiveNumber(equipment?.maxVehicleCapacity),
    },
    {
      key: "truckMake",
      label: "Truck Make",
      complete: hasText(equipment?.truckMake),
    },
    {
      key: "truckModel",
      label: "Truck Model",
      complete: hasText(equipment?.truckModel),
    },
    {
      key: "truckYear",
      label: "Truck Year",
      complete: hasPositiveNumber(equipment?.truckYear),
    },
    {
      key: "vin",
      label: "VIN",
      complete: hasText(equipment?.vin),
    },
    {
      key: "plateNumber",
      label: "License Plate",
      complete: hasText(equipment?.plateNumber),
    },
  ];

  if (String(equipment?.trailerType || "").trim() === "other") {
    checks.push({
      key: "customTrailerName",
      label: "Custom Trailer Name",
      complete: hasText(equipment?.customTrailerName),
    });
  }

  const completed = checks.filter((check) => check.complete).length;
  const total = checks.length;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
  const complete = completed === total;

  return {
    level: complete
      ? "ready"
      : completed === 0
        ? "not_configured"
        : "in_progress",
    complete,
    percent,
    completed,
    total,
    checks,
    missing: checks.filter((check) => !check.complete),
  };
}

export function getVerificationReadiness(
  driverProfile: DriverProfile | null | undefined,
): VerificationReadiness {
  if (!driverProfile) {
    return {
      level: "unavailable",
      ready: false,
      label: "Unavailable",
      detail: "Driver Verification status could not be loaded.",
    };
  }

  if (driverProfile.isComplianceExpired) {
    return {
      level: "needs_attention",
      ready: false,
      label: "Needs Attention",
      detail: "A compliance credential has expired.",
    };
  }

  const status = String(driverProfile.verificationStatus || "unverified");

  switch (status) {
    case "verified":
      return {
        level: "ready",
        ready: true,
        label: "Verified",
        detail: "Driver Verification is approved.",
      };

    case "under_review":
      return {
        level: "under_review",
        ready: false,
        label: "Under Review",
        detail: "The verification package is awaiting review.",
      };

    case "in_progress":
    case "pending":
      return {
        level: "in_progress",
        ready: false,
        label: "In Progress",
        detail: "Driver Verification still has incomplete steps.",
      };

    case "rejected":
      return {
        level: "needs_attention",
        ready: false,
        label: "Needs Attention",
        detail: "Driver Verification requires correction or resubmission.",
      };

    case "not_started":
    case "unverified":
    default:
      return {
        level: "not_configured",
        ready: false,
        label: "Not Started",
        detail: "Driver Verification has not been completed.",
      };
  }
}

/**
 * Driver Readiness is a read-only UI summary. It deliberately does not become
 * another authorization/eligibility gate.
 */
export function getDriverReadiness(
  accountProfile: UserProfile | null | undefined,
  driverProfile: DriverProfile | null | undefined,
): DriverReadiness {
  const emailVerified = Boolean(
    accountProfile?.securityStatus?.emailVerified,
  );
  const equipment = getEquipmentReadiness(driverProfile);
  const verification = getVerificationReadiness(driverProfile);

  const blockingCount =
    Number(!emailVerified) +
    Number(!verification.ready) +
    Number(!equipment.complete);

  const ready = blockingCount === 0;

  return {
    ready,
    level: ready ? "ready" : "needs_attention",
    label: ready ? "Ready" : "Needs Attention",
    emailVerified,
    equipment,
    verification,
    blockingCount,
  };
}