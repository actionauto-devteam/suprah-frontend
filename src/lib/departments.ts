// Mirrors DEPARTMENTS from DayPulsePage.tsx — single source of truth for department config
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

// Departments that use the mobile-only TimeProof monitoring profile: no desktop
// tray app, no screenshot capture, and GPS "stationary" time (not desktop idle)
// as their idle signal. Add more department keys here if another department
// needs the same mobile-monitoring profile — do not hardcode department name
// checks elsewhere in the codebase.
export const MOBILE_MONITORING_DEPARTMENTS: string[] = ["LotTechTeam"];

export function isMobileMonitoringDept(raw: string | undefined | null): boolean {
  if (!raw) return false;
  return MOBILE_MONITORING_DEPARTMENTS.some(
    (key) => raw === key || raw === DEPT_LABELS[key]
  );
}

// Departments whose TimeLog entries and screenshots admins may NOT edit/exclude
// (mirrors suprah-backend/src/config/departmentMonitoring.ts — keep in sync).
export const TIME_EDIT_EXEMPT_DEPARTMENTS: string[] = ["WebDevTeam"];

export function isTimeEditExempt(raw: string | undefined | null): boolean {
  if (!raw) return false;
  return TIME_EDIT_EXEMPT_DEPARTMENTS.some(
    (key) => raw === key || raw === DEPT_LABELS[key]
  );
}
