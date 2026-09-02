import {
  MAX_VEHICLES,
  trailerCapacity,
  LocationBlock,
  LoadVehicle,
  LoadDates,
  LoadContract,
  PostType,
} from "./types";
import { mountainTodayDateKey, scheduleDateKey } from "@/utils/calendar.utils";

// ─── Create Load: client-side validation ─────────────────────────────────────
// Mirrors the backend rules in validations/load.validation.ts and
// controllers/load.controller.ts so users get instant feedback instead of a
// round-trip 400. The backend remains the authority.

export interface ValidationIssue {
  field: string;
  message: string;
}

export interface StepValidation {
  valid: boolean;
  issues: ValidationIssue[];
  /** Non-blocking notices (e.g. trailer capacity) shown as warnings */
  warnings: string[];
}

const ok = (warnings: string[] = []): StepValidation => ({
  valid: true,
  issues: [],
  warnings,
});

const ZIP_RE = /^\d{5}(-\d{4})?$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateLocation(
  loc: LocationBlock,
  prefix: "pickup" | "delivery",
): StepValidation {
  const issues: ValidationIssue[] = [];
  if (!loc.address?.trim())
    issues.push({ field: `${prefix}.address`, message: "Address is required" });
  if (!loc.city?.trim())
    issues.push({ field: `${prefix}.city`, message: "City is required" });
  if (!loc.state?.trim())
    issues.push({ field: `${prefix}.state`, message: "State is required" });
  if (!ZIP_RE.test(loc.zip?.trim() ?? ""))
    issues.push({ field: `${prefix}.zip`, message: "ZIP code must be 5 digits" });
  if (loc.email && loc.email.trim() && !EMAIL_RE.test(loc.email.trim()))
    issues.push({ field: `${prefix}.email`, message: "Invalid email address" });
  return { valid: issues.length === 0, issues, warnings: [] };
}

export function validateVehicles(
  vehicles: LoadVehicle[],
  trailerType: string,
): StepValidation {
  const issues: ValidationIssue[] = [];
  const warnings: string[] = [];

  if (!vehicles.length) {
    issues.push({ field: "vehicles", message: "Add at least one vehicle" });
  }

  // PLATFORM HARD LIMIT: 20 vehicles per load (both workflows)
  if (vehicles.length > MAX_VEHICLES) {
    issues.push({
      field: "vehicles",
      message: `A load can include at most ${MAX_VEHICLES} vehicles`,
    });
  }

  // Duplicate VIN check (matches backend DUPLICATE_VIN rule)
  const vins = vehicles
    .map((v) => v.vin?.trim().toUpperCase())
    .filter((v): v is string => Boolean(v));
  const seen = new Set<string>();
  for (const vin of vins) {
    if (seen.has(vin)) {
      issues.push({
        field: "vehicles",
        message: `Duplicate VIN: ${vin}`,
      });
      break;
    }
    seen.add(vin);
  }

  for (const [i, v] of vehicles.entries()) {
    if (v.vin && v.vin.trim().length > 17) {
      issues.push({
        field: `vehicles.${i}.vin`,
        message: "VIN must be at most 17 characters",
      });
    }
    const yearNum = v.year === "" || v.year == null ? undefined : Number(v.year);
    if (yearNum !== undefined && (Number.isNaN(yearNum) || yearNum < 1900 || yearNum > 2100)) {
      issues.push({
        field: `vehicles.${i}.year`,
        message: "Enter a valid year",
      });
    }
  }

  // Trailer capacity is ADVISORY, not blocking — the backend accepts the
  // load and returns the same warning. Dispatcher decides.
  const rated = trailerCapacity(trailerType);
  if (rated !== undefined && vehicles.length > rated) {
    warnings.push(
      `This load has ${vehicles.length} vehicles but the selected trailer is rated for ${rated}. Multiple trips or a larger trailer may be required.`,
    );
  }

  return { valid: issues.length === 0, issues, warnings };
}

export function validateDates(dates: LoadDates): StepValidation {
  const issues: ValidationIssue[] = [];

  // Schedule fields are Mountain business-calendar dates. Comparing
  // YYYY-MM-DD keys prevents the viewer device timezone or UTC parsing from
  // moving a selected day across midnight.
  const today = mountainTodayDateKey();
  const first = scheduleDateKey(dates.firstAvailable);
  const pickupBy = scheduleDateKey(dates.pickupDeadline);
  const deliverBy = scheduleDateKey(dates.deliveryDeadline);

  if (first && first < today) {
    issues.push({
      field: "dates.firstAvailable",
      message: "Cannot select a date in the past",
    });
  }

  if (first && pickupBy && pickupBy < first) {
    issues.push({
      field: "dates.pickupDeadline",
      message: "Pickup deadline can't be before the first available date",
    });
  }
  if (pickupBy && deliverBy && deliverBy < pickupBy) {
    issues.push({
      field: "dates.deliveryDeadline",
      message: "Delivery deadline can't be before the pickup deadline",
    });
  }

  return { valid: issues.length === 0, issues, warnings: [] };
}

export function validateContract(contract: LoadContract): StepValidation {
  const issues: ValidationIssue[] = [];
  if (!contract.agreedToTerms) {
    issues.push({
      field: "contract.agreedToTerms",
      message: "You must agree to the transport terms",
    });
  }
  return { valid: issues.length === 0, issues, warnings: [] };
}

export function validateAssignment(
  postType: PostType,
  selectedDriverId: string | null,
  makeAvailable: boolean,
): StepValidation {
  // "Make it Available Load": publishing without a driver is a first-class
  // outcome — the load goes to the Available Loads pool for drivers to
  // request. A driver is only required when the dispatcher is assigning
  // directly.
  if (postType === "assign-carrier" && !makeAvailable && !selectedDriverId) {
    return {
      valid: false,
      issues: [
        {
          field: "driverId",
          message:
            'Select a driver, or choose "Make it Available Load" to publish without one',
        },
      ],
      warnings: [],
    };
  }
  return ok();
}

export function validateAll(input: {
  postType: PostType;
  pickup: LocationBlock;
  delivery: LocationBlock;
  vehicles: LoadVehicle[];
  trailerType: string;
  dates: LoadDates;
  contract: LoadContract;
  selectedDriverId: string | null;
  makeAvailable: boolean;
}): StepValidation {
  const parts = [
    validateLocation(input.pickup, "pickup"),
    validateLocation(input.delivery, "delivery"),
    validateVehicles(input.vehicles, input.trailerType),
    validateDates(input.dates),
    validateContract(input.contract),
    validateAssignment(
      input.postType,
      input.selectedDriverId,
      input.makeAvailable,
    ),
  ];
  const issues = parts.flatMap((p) => p.issues);
  const warnings = parts.flatMap((p) => p.warnings);
  return { valid: issues.length === 0, issues, warnings };
}