import {
  AuctionListing,
  AuctionListingPayload,
  REQUIRED_PHOTO_SLOTS,
  PHOTO_SLOT_META,
} from "@/lib/api/auctionListings";

export interface WizardForm {
  ownedVehicleId: string;
  vin: string;
  year: string;
  make: string;
  model: string;
  trim: string;
  bodyStyle: string;
  mileage: string;
  transmission: string;
  fuelType: string;
  driveTrain: string;
  engine: string;
  exteriorColor: string;
  interiorColor: string;
  doors: string;
  seats: string;
  condition: "" | "EXCELLENT" | "GOOD" | "FAIR" | "POOR";
  titleStatus: "" | "CLEAN" | "SALVAGE" | "REBUILT" | "LIEN";
  ownersCount: string;
  keysCount: string;
  hasAccidentHistory: boolean;
  accidentNotes: string;
  hasServiceHistory: boolean;
  knownIssues: string;
  features: string[];
  askingPrice: string;
  isNegotiable: boolean;
  description: string;
  contactPreference: "APP" | "PHONE" | "EMAIL";
}

export const EMPTY_FORM: WizardForm = {
  ownedVehicleId: "",
  vin: "",
  year: "",
  make: "",
  model: "",
  trim: "",
  bodyStyle: "",
  mileage: "",
  transmission: "",
  fuelType: "",
  driveTrain: "",
  engine: "",
  exteriorColor: "",
  interiorColor: "",
  doors: "",
  seats: "",
  condition: "",
  titleStatus: "",
  ownersCount: "",
  keysCount: "",
  hasAccidentHistory: false,
  accidentNotes: "",
  hasServiceHistory: false,
  knownIssues: "",
  features: [],
  askingPrice: "",
  isNegotiable: false,
  description: "",
  contactPreference: "APP",
};

export const hydrateForm = (l: AuctionListing): WizardForm => ({
  ownedVehicleId: l.ownedVehicleId ?? "",
  vin: l.vin ?? "",
  year: l.year ?? "",
  make: l.make ?? "",
  model: l.model ?? "",
  trim: l.trim ?? "",
  bodyStyle: l.bodyStyle ?? "",
  mileage: l.mileage != null ? String(l.mileage) : "",
  transmission: l.transmission ?? "",
  fuelType: l.fuelType ?? "",
  driveTrain: l.driveTrain ?? "",
  engine: l.engine ?? "",
  exteriorColor: l.exteriorColor ?? "",
  interiorColor: l.interiorColor ?? "",
  doors: l.doors != null ? String(l.doors) : "",
  seats: l.seats != null ? String(l.seats) : "",
  condition: l.condition ?? "",
  titleStatus: l.titleStatus ?? "",
  ownersCount: l.ownersCount != null ? String(l.ownersCount) : "",
  keysCount: l.keysCount != null ? String(l.keysCount) : "",
  hasAccidentHistory: l.hasAccidentHistory ?? false,
  accidentNotes: l.accidentNotes ?? "",
  hasServiceHistory: l.hasServiceHistory ?? false,
  knownIssues: l.knownIssues ?? "",
  features: l.features ?? [],
  askingPrice: l.askingPrice != null ? String(l.askingPrice) : "",
  isNegotiable: l.isNegotiable ?? false,
  description: l.description ?? "",
  contactPreference: l.contactPreference ?? "APP",
});

const num = (v: string) => {
  const n = Number(v);
  return v !== "" && !isNaN(n) ? n : undefined;
};

const str = (v: string) => (v.trim() !== "" ? v.trim() : undefined);

export const toPayload = (f: WizardForm): AuctionListingPayload => ({
  ownedVehicleId: str(f.ownedVehicleId),
  vin: str(f.vin)?.toUpperCase(),
  year: str(f.year),
  make: str(f.make),
  model: str(f.model),
  trim: str(f.trim),
  bodyStyle: str(f.bodyStyle),
  mileage: num(f.mileage),
  transmission: str(f.transmission),
  fuelType: str(f.fuelType),
  driveTrain: str(f.driveTrain),
  engine: str(f.engine),
  exteriorColor: str(f.exteriorColor),
  interiorColor: str(f.interiorColor),
  doors: num(f.doors),
  seats: num(f.seats),
  condition: f.condition || undefined,
  titleStatus: f.titleStatus || undefined,
  ownersCount: num(f.ownersCount),
  keysCount: num(f.keysCount),
  hasAccidentHistory: f.hasAccidentHistory,
  accidentNotes: str(f.accidentNotes),
  hasServiceHistory: f.hasServiceHistory,
  knownIssues: str(f.knownIssues),
  features: f.features,
  askingPrice: num(f.askingPrice),
  isNegotiable: f.isNegotiable,
  description: str(f.description),
  contactPreference: f.contactPreference,
});

export interface RequirementItem {
  key: string;
  label: string;
  step: number;
  done: boolean;
}

export const getRequirements = (
  form: WizardForm,
  listing?: AuctionListing | null,
): RequirementItem[] => {
  const slots = new Set((listing?.photos ?? []).map((p) => p.slot));
  return [
    { key: "vin", label: "VIN (17 characters)", step: 1, done: form.vin.trim().length === 17 },
    { key: "year", label: "Year", step: 1, done: !!form.year.trim() },
    { key: "make", label: "Make", step: 1, done: !!form.make.trim() },
    { key: "model", label: "Model", step: 1, done: !!form.model.trim() },
    { key: "mileage", label: "Mileage", step: 1, done: Number(form.mileage) > 0 },
    { key: "transmission", label: "Transmission", step: 1, done: !!form.transmission },
    { key: "fuelType", label: "Fuel type", step: 1, done: !!form.fuelType },
    { key: "exteriorColor", label: "Exterior color", step: 1, done: !!form.exteriorColor.trim() },
    { key: "condition", label: "Condition", step: 2, done: !!form.condition },
    { key: "titleStatus", label: "Title status", step: 2, done: !!form.titleStatus },
    ...REQUIRED_PHOTO_SLOTS.map((slot) => ({
      key: `photo:${slot}`,
      label: `${PHOTO_SLOT_META[slot].label} photo`,
      step: 3,
      done: slots.has(slot),
    })),
    { key: "askingPrice", label: "Asking price", step: 4, done: Number(form.askingPrice) > 0 },
    { key: "description", label: "Description", step: 4, done: !!form.description.trim() },
  ];
};

export const FIELD_STEP_MAP: Record<string, number> = {
  vin: 1,
  year: 1,
  make: 1,
  model: 1,
  mileage: 1,
  transmission: 1,
  fuelType: 1,
  exteriorColor: 1,
  condition: 2,
  titleStatus: 2,
  askingPrice: 4,
  description: 4,
};

export const stepForMissingField = (field: string) =>
  field.startsWith("photo:") ? 3 : (FIELD_STEP_MAP[field] ?? 1);

export const BODY_STYLES = ["Sedan", "SUV", "Truck", "Coupe", "Hatchback", "Convertible", "Wagon", "Van", "Other"];
export const TRANSMISSIONS = ["Automatic", "Manual", "CVT", "Other"];
export const FUEL_TYPES = ["Gasoline", "Diesel", "Hybrid", "Plug-in Hybrid", "Electric"];
export const DRIVETRAINS = ["FWD", "RWD", "AWD", "4WD"];

export const CONDITIONS: { value: WizardForm["condition"]; label: string; description: string }[] = [
  { value: "EXCELLENT", label: "Excellent", description: "Like new, no visible flaws, runs perfectly" },
  { value: "GOOD", label: "Good", description: "Minor wear, well maintained, no major issues" },
  { value: "FAIR", label: "Fair", description: "Noticeable wear or cosmetic flaws, runs fine" },
  { value: "POOR", label: "Poor", description: "Mechanical or body issues that need attention" },
];

export const TITLE_STATUSES: { value: WizardForm["titleStatus"]; label: string; description: string }[] = [
  { value: "CLEAN", label: "Clean", description: "No accidents or damage on record" },
  { value: "SALVAGE", label: "Salvage", description: "Declared a total loss by an insurer" },
  { value: "REBUILT", label: "Rebuilt", description: "Salvage vehicle repaired and re-titled" },
  { value: "LIEN", label: "Lien", description: "A loan is still owed on the vehicle" },
];

export const FEATURE_OPTIONS = [
  "Sunroof / Moonroof",
  "Leather Seats",
  "Heated Seats",
  "Ventilated Seats",
  "Navigation",
  "Backup Camera",
  "Blind Spot Monitor",
  "Adaptive Cruise Control",
  "Apple CarPlay / Android Auto",
  "Bluetooth",
  "Premium Audio",
  "Third-Row Seats",
  "Tow Package",
  "Remote Start",
  "Keyless Entry",
  "Alloy Wheels",
  "Roof Rack",
];

export const CONTACT_PREFERENCES: { value: WizardForm["contactPreference"]; label: string }[] = [
  { value: "APP", label: "In-app messages" },
  { value: "PHONE", label: "Phone call" },
  { value: "EMAIL", label: "Email" },
];

export type FormPatch = (partial: Partial<WizardForm>) => void;
