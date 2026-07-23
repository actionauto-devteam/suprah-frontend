export type DepartmentEntry = {
  key: string;
  label: string;
  color: string;
  isMobileMonitoringDept: boolean;
  isTimeEditExempt: boolean;
  isMandatoryLocationDept: boolean;
  locationRequiredForTimeproof: boolean;
  isActive?: boolean;
  isDefault?: boolean;
  sortOrder?: number;
  memberCount?: number;
  createdAt?: string;
  updatedAt?: string;
};

// Seed defaults so every consumer works before the live list has loaded (or if
// DepartmentsProvider hasn't mounted yet, e.g. in a test). DepartmentsProvider overwrites
// this array in place from GET /api/departments once it resolves — components that read
// DEPARTMENTS directly (via .map()) or call the helper functions below always see the
// latest admin-managed list without needing to consume a hook themselves.
export const DEPARTMENTS: DepartmentEntry[] = [
  { key: "SalesAndFinance", label: "Sales & Finance", color: "emerald", isMobileMonitoringDept: false, isTimeEditExempt: false, isMandatoryLocationDept: false, locationRequiredForTimeproof: true },
  { key: "Accounting", label: "Accounting", color: "sky", isMobileMonitoringDept: false, isTimeEditExempt: false, isMandatoryLocationDept: false, locationRequiredForTimeproof: true },
  { key: "Recon", label: "Recon", color: "amber", isMobileMonitoringDept: false, isTimeEditExempt: false, isMandatoryLocationDept: false, locationRequiredForTimeproof: true },
  { key: "Marketing", label: "Marketing", color: "pink", isMobileMonitoringDept: false, isTimeEditExempt: false, isMandatoryLocationDept: false, locationRequiredForTimeproof: true },
  { key: "OnlineTeam", label: "Online Team", color: "violet", isMobileMonitoringDept: false, isTimeEditExempt: false, isMandatoryLocationDept: false, locationRequiredForTimeproof: true },
  { key: "WebDevTeam", label: "Web Dev", color: "blue", isMobileMonitoringDept: false, isTimeEditExempt: true, isMandatoryLocationDept: false, locationRequiredForTimeproof: true },
  { key: "WholesaleTeam", label: "Wholesale", color: "orange", isMobileMonitoringDept: false, isTimeEditExempt: false, isMandatoryLocationDept: false, locationRequiredForTimeproof: true },
  { key: "BuyingTeam", label: "Buying", color: "teal", isMobileMonitoringDept: false, isTimeEditExempt: false, isMandatoryLocationDept: false, locationRequiredForTimeproof: true },
  { key: "OperationsTeam", label: "Operations", color: "rose", isMobileMonitoringDept: false, isTimeEditExempt: false, isMandatoryLocationDept: false, locationRequiredForTimeproof: true },
  { key: "LotTechTeam", label: "Lot Tech", color: "indigo", isMobileMonitoringDept: true, isTimeEditExempt: false, isMandatoryLocationDept: true, locationRequiredForTimeproof: true },
  { key: "FundingTeam", label: "Funding", color: "lime", isMobileMonitoringDept: false, isTimeEditExempt: false, isMandatoryLocationDept: false, locationRequiredForTimeproof: true },
  { key: "ProspectsTeam", label: "Prospects", color: "cyan", isMobileMonitoringDept: false, isTimeEditExempt: false, isMandatoryLocationDept: false, locationRequiredForTimeproof: true },
  { key: "PriceCheckTeam", label: "Price Check", color: "fuchsia", isMobileMonitoringDept: false, isTimeEditExempt: false, isMandatoryLocationDept: false, locationRequiredForTimeproof: true },
];

export const DEPT_COLORS: Record<string, string> = Object.fromEntries(
  DEPARTMENTS.map((d) => [d.key, d.color])
);

let listeners: Array<() => void> = [];

export function setDepartments(list: DepartmentEntry[]) {
  DEPARTMENTS.length = 0;
  DEPARTMENTS.push(...list);

  for (const key of Object.keys(DEPT_COLORS)) delete DEPT_COLORS[key];
  for (const d of DEPARTMENTS) DEPT_COLORS[d.key] = d.color;

  listeners.forEach((fn) => fn());
}

export function onDepartmentsChange(fn: () => void): () => void {
  listeners.push(fn);
  return () => {
    listeners = listeners.filter((l) => l !== fn);
  };
}

export type DepartmentKey = string;

export function deptLabel(raw: string | undefined | null): string {
  if (!raw) return "No Department";
  const entry = DEPARTMENTS.find((d) => d.key === raw);
  return entry ? entry.label : raw;
}

export const DEPT_COLOR_HEX: Record<string, string> = {
  emerald: "#10b981",
  sky: "#0ea5e9",
  amber: "#f59e0b",
  pink: "#ec4899",
  violet: "#8b5cf6",
  blue: "#3b82f6",
  orange: "#f97316",
  teal: "#14b8a6",
  rose: "#f43f5e",
  indigo: "#6366f1",
  lime: "#84cc16",
  cyan: "#06b6d4",
  fuchsia: "#d946ef",
};

// Fixed palette — badge classes for these are hand-written as literal Tailwind class strings
// elsewhere (DEPT_BADGE_CLASS in LocatorMapLegend.tsx, DEPT_STYLES in DayPulsePage.tsx) so
// Tailwind's scanner can see them at build time. A new admin-created department must pick
// one of these, not an arbitrary color.
export const DEPT_COLOR_PALETTE = Object.keys(DEPT_COLOR_HEX);

const DEPT_NEUTRAL_HEX = "#9ca3af";

export function deptColorHex(raw: string | undefined | null): string {
  if (!raw) return DEPT_NEUTRAL_HEX;
  const dept = DEPARTMENTS.find((d) => d.key === raw || d.label === raw);
  return dept ? (DEPT_COLOR_HEX[dept.color] ?? DEPT_NEUTRAL_HEX) : DEPT_NEUTRAL_HEX;
}

export function isMobileMonitoringDept(raw: string | undefined | null): boolean {
  if (!raw) return false;
  const dept = DEPARTMENTS.find((d) => d.key === raw || d.label === raw);
  return !!dept?.isMobileMonitoringDept;
}

export function isTimeEditExempt(raw: string | undefined | null): boolean {
  if (!raw) return false;
  const dept = DEPARTMENTS.find((d) => d.key === raw || d.label === raw);
  return !!dept?.isTimeEditExempt;
}

export function isMandatoryLocationDept(dept?: string | null): boolean {
  if (!dept) return false;
  const entry = DEPARTMENTS.find((d) => d.key === dept || d.label === dept);
  return !!entry?.isMandatoryLocationDept;
}
