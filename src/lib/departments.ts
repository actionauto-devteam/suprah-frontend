export const DEPARTMENTS = [
  { key: "SalesAndFinance", label: "Sales & Finance", color: "emerald" },
  { key: "Accounting",      label: "Accounting",      color: "sky"     },
  { key: "Recon",           label: "Recon",           color: "amber"   },
  { key: "Marketing",       label: "Marketing",       color: "pink"    },
  { key: "OnlineTeam",      label: "Online Team",     color: "violet"  },
  { key: "WebDevTeam",      label: "Web Dev",         color: "blue"    },
  { key: "WholesaleTeam",   label: "Wholesale",       color: "orange"  },
  { key: "BuyingTeam",      label: "Buying",          color: "teal"    },
  { key: "OperationsTeam",  label: "Operations",      color: "rose"    },
  { key: "LotTechTeam",     label: "Lot Tech",        color: "indigo"  },
  { key: "FundingTeam",     label: "Funding",         color: "lime"    },
  { key: "ProspectsTeam",   label: "Prospects",       color: "cyan"    },
  { key: "PriceCheckTeam",  label: "Price Check",     color: "fuchsia" },
] as const;

export type DepartmentKey = typeof DEPARTMENTS[number]["key"];

export const DEPT_LABELS: Record<string, string> = Object.fromEntries(
  DEPARTMENTS.map((d) => [d.key, d.label])
);

export const DEPT_COLORS: Record<string, string> = Object.fromEntries(
  DEPARTMENTS.map((d) => [d.key, d.color])
);

export function deptLabel(raw: string | undefined | null): string {
  if (!raw) return "No Department";
  return DEPT_LABELS[raw] ?? raw;
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

const DEPT_NEUTRAL_HEX = "#9ca3af";

export function deptColorHex(raw: string | undefined | null): string {
  if (!raw) return DEPT_NEUTRAL_HEX;
  const dept = DEPARTMENTS.find((d) => d.key === raw || d.label === raw);
  return dept ? DEPT_COLOR_HEX[dept.color] : DEPT_NEUTRAL_HEX;
}

export const MOBILE_MONITORING_DEPARTMENTS: string[] = ["LotTechTeam"];

export function isMobileMonitoringDept(raw: string | undefined | null): boolean {
  if (!raw) return false;
  return MOBILE_MONITORING_DEPARTMENTS.some(
    (key) => raw === key || raw === DEPT_LABELS[key]
  );
}

export const TIME_EDIT_EXEMPT_DEPARTMENTS: string[] = ["WebDevTeam"];

export function isTimeEditExempt(raw: string | undefined | null): boolean {
  if (!raw) return false;
  return TIME_EDIT_EXEMPT_DEPARTMENTS.some(
    (key) => raw === key || raw === DEPT_LABELS[key]
  );
}

export const MANDATORY_LOCATION_DEPARTMENTS: string[] = ["LotTechTeam"];

export function isMandatoryLocationDept(dept?: string | null): boolean {
  return !!dept && MANDATORY_LOCATION_DEPARTMENTS.includes(dept);
}
