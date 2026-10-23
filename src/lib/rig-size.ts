// The rig's overall size (truck and trailer together, loaded) from the
// Equipment page. Truck routes are planned around it so they avoid low
// bridges and roads too short for the rig. Must match RIG_HEIGHT_INCHES and
// RIG_LENGTH_FEET in the backend's validations/load.validation.ts.

export const RIG_HEIGHT_INCHES = { min: 72, max: 192 } as const; // 6 ft to 16 ft
export const RIG_LENGTH_FEET = { min: 20, max: 100 } as const;

/** 162 -> "13 ft 6 in". */
export function formatRigHeight(inches: number | null | undefined): string | undefined {
  if (typeof inches !== "number" || !Number.isFinite(inches) || inches <= 0) return undefined;
  const whole = Math.round(inches);
  const feet = Math.floor(whole / 12);
  const rest = whole % 12;
  return rest ? `${feet} ft ${rest} in` : `${feet} ft`;
}

/** 75 -> "75 ft". */
export function formatRigLength(feet: number | null | undefined): string | undefined {
  if (typeof feet !== "number" || !Number.isFinite(feet) || feet <= 0) return undefined;
  return `${Math.round(feet)} ft`;
}
