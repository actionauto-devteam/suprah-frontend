export const MAX_VEHICLES = 20;

export type PostType = "load-board" | "assign-carrier";

// Restored: LocationFields' location-type Select iterates this; the
// LocationType union is derived from it so Select values assign cleanly.
export const LOCATION_TYPES = [
  "dealership",
  "auction",
  "residence",
  "business",
  "port",
  "other",
] as const;

export type LocationType = (typeof LOCATION_TYPES)[number];

// Restored: state dropdown source (two-letter codes, matching the "UT"
// input style used across the form).
export const US_STATES: readonly string[] = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","DC","FL","GA","HI","ID","IL",
  "IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE",
  "NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD",
  "TN","TX","UT","VT","VA","WA","WV","WI","WY",
];

// Restored: state → representative ZIP (capital city). LocationFields
// assigns this straight into the zip field when a state is selected
// (update.zip = STATE_ZIP_MAP[val]), so values are strings — which also
// preserves New England's leading zeros.
export const STATE_ZIP_MAP: Record<string, string> = {
  AL: "36104", AK: "99801", AZ: "85001", AR: "72201", CA: "95814",
  CO: "80202", CT: "06103", DE: "19901", DC: "20001", FL: "32301",
  GA: "30303", HI: "96813", ID: "83702", IL: "62701", IN: "46204",
  IA: "50309", KS: "66603", KY: "40601", LA: "70802", ME: "04330",
  MD: "21401", MA: "02108", MI: "48933", MN: "55102", MS: "39201",
  MO: "65101", MT: "59601", NE: "68508", NV: "89701", NH: "03301",
  NJ: "08608", NM: "87501", NY: "12207", NC: "27601", ND: "58501",
  OH: "43215", OK: "73102", OR: "97301", PA: "17101", RI: "02903",
  SC: "29201", SD: "57501", TN: "37201", TX: "78701", UT: "84101",
  VT: "05602", VA: "23219", WA: "98501", WV: "25301", WI: "53703",
  WY: "82001",
};

// LocationFields binds Company Name → `name` and Street Address → `address`
// (the canonical keys shared with the backend zod locationBlockSchema and
// the Mongoose locationSchema — `address` is REQUIRED there, so nothing may
// bind to a differently-named key like `street`). `country`, `phoneExt`,
// and `notes` are newer optional fields; they must exist in ALL THREE
// places (here, load.validation.ts, Load.model.ts) or zod/Mongoose strip
// them silently.
export interface LocationBlock {
  name?: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  country?: string;
  phone?: string;
  phoneExt?: string;
  email?: string;
  contactName?: string;
  locationType?: LocationType | "";
  notes?: string;
}

export type VehicleCondition = "Operable" | "Inoperable";

// Restored: VehicleSection's condition dropdown iterates this
export const VEHICLE_CONDITIONS = ["Operable", "Inoperable"] as const;

export interface LoadVehicle {
  /** Client-side row key only — stripped before submit */
  id: string;
  vehicleId?: string;
  vin?: string;
  year?: number | string;
  make?: string;
  model?: string;
  color?: string;
  condition: VehicleCondition;
  imageUrl?: string;
  /** Inspect step — set once uploaded (edit mode) or after create-mode's post-submit upload */
  inspectionPhotoUrl?: string;
}

// Required strings (empty defaults) — DatesSection binds inputs directly
// (value={value.firstAvailable}) and includes a Date Notes textarea.
export interface LoadDates {
  firstAvailable: string;
  pickupDeadline: string;
  deliveryDeadline: string;
  notes: string;
}

export function emptyDates(): LoadDates {
  return { firstAvailable: "", pickupDeadline: "", deliveryDeadline: "", notes: "" };
}

// Required strings (empty-string defaults), NOT optionals — the team's
// AdditionalInfoSection reads value.notes.length / value.instructions.length
// directly. Initialize via emptyAdditionalInfo().
export interface LoadAdditionalInfo {
  visibility: "public" | "private";
  notes: string;
  instructions: string;
  referenceNumber: string;
}

export function emptyAdditionalInfo(): LoadAdditionalInfo {
  return { visibility: "public", notes: "", instructions: "", referenceNumber: "" };
}

export interface LoadContract {
  agreedToTerms: boolean;
  /** PNG data URL from the SignaturePad; auto-loaded from the user profile */
  signatureDataUrl?: string | null;
  signerName?: string;
}

export interface LoadPricingInput {
  /**
   * Dispatcher's $/mi rate. Kept in two-way sync with carrierPayAmount by
   * the Pricing step (pay = pricePerMile × estimate.miles) and PERSISTED on
   * the load so cards/detail views can show "$X.XX/mi".
   * Must match:
   *   · validations/load.validation.ts (backend zod: pricingInputSchema)
   *   · models/Load.model.ts (pricing.pricePerMile)
   */
  pricePerMile?: number;
  carrierPayAmount?: number;
  copCodAmount?: number;
}

export const TRAILER_TYPE_OPTIONS: Array<{
  value: string;
  label: string;
  capacity: number;
}> = [
  { value: "open_3car_wedge", label: "Open 3-Car Wedge", capacity: 3 },
  { value: "open_2car", label: "Open 2-Car", capacity: 2 },
  { value: "enclosed_2car", label: "Enclosed 2-Car", capacity: 2 },
  { value: "enclosed_3car", label: "Enclosed 3-Car", capacity: 3 },
  { value: "flatbed", label: "Flatbed", capacity: 2 },
  { value: "hotshot", label: "Hotshot", capacity: 1 },
  { value: "dually_flatbed", label: "Dually Flatbed", capacity: 1 },
  { value: "gooseneck", label: "Gooseneck", capacity: 2 },
  { value: "lowboy", label: "Lowboy", capacity: 1 },
  { value: "step_deck", label: "Step Deck", capacity: 2 },
  { value: "9car_stinger", label: "9-Car Stinger", capacity: 9 },
  { value: "7car_stinger", label: "7-Car Stinger", capacity: 7 },
  { value: "5car_open", label: "5-Car Open", capacity: 5 },
  { value: "rgn", label: "RGN", capacity: 2 },
  { value: "double_drop", label: "Double Drop", capacity: 2 },
  { value: "power_only", label: "Power Only", capacity: 0 },
  { value: "other", label: "Other", capacity: MAX_VEHICLES },
];

export function trailerCapacity(trailerType: string): number | undefined {
  return TRAILER_TYPE_OPTIONS.find((t) => t.value === trailerType)?.capacity;
}

export function emptyLocation(): LocationBlock {
  // Every field LocationFields binds gets an empty-string default so its
  // inputs stay controlled from the first render (no undefined→string flip).
  return {
    name: "",
    address: "",
    city: "",
    state: "",
    zip: "",
    // New loads are US-based by default. The field remains editable and
    // optional in the backend contract.
    country: "US",
    phone: "",
    phoneExt: "",
    email: "",
    contactName: "",
    locationType: "",
    notes: "",
  };
}

export function emptyVehicle(): LoadVehicle {
  return {
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `v-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    vin: "",
    year: "",
    make: "",
    model: "",
    color: "",
    condition: "Operable",
  };
}