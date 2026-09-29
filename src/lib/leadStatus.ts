import type { LucideIcon } from "lucide-react";
import {
  Mail,
  Eye,
  Phone,
  PhoneCall,
  PhoneIncoming,
  CalendarClock,
  Activity,
  Calendar,
  CalendarCheck,
  MapPin,
  Clock3,
  Wrench,
  PackageX,
  ThumbsDown,
  MinusCircle,
  AlertTriangle,
  Ban,
  ShoppingBag,
  CheckCircle2,
  CreditCard,
  Wifi,
  XCircle,
} from "lucide-react";

/**
 * Single source of truth for Lead.status, mirroring
 * suprah-backend/src/constants/leadStatus.ts. Kept in sync manually since
 * the two repos don't share a package — update both together.
 */
export type LeadStatusCategory = "None" | "Active" | "MissedOpportunity" | "DeadLead" | "Sold" | "ClosedLegacy";

export const LEAD_STATUS_CATEGORY_ORDER: LeadStatusCategory[] = [
  "None",
  "Active",
  "MissedOpportunity",
  "DeadLead",
  "Sold",
  "ClosedLegacy",
];

export const LEAD_STATUS_CATEGORY_LABEL: Record<LeadStatusCategory, string> = {
  None: "New",
  Active: "Active",
  MissedOpportunity: "Missed Opportunity",
  DeadLead: "Dead Lead",
  Sold: "Sold",
  ClosedLegacy: "Closed",
};

export const LEAD_STATUS_CATEGORIES: Record<LeadStatusCategory, string[]> = {
  None: ["New", "Viewed"],
  Active: [
    "Contacted",
    "Pending",
    "Appointment Set",
    "In Process",
    "Attempted to Contact",
    "Contact in Future",
    "Declined",
    "Appointment Scheduled",
    "Rescheduled",
    "Came to Dealership",
    "No Longer Interested",
    "Appointment Confirmed",
    "Working",
    "2nd Attempt to Contact",
    "3rd Attempt to Contact",
    "4th Attempt to Contact",
    "Pending Recon",
    "Vehicle Not InStock",
  ],
  MissedOpportunity: ["Missed Opportunity"],
  DeadLead: ["Bought Elsewhere", "Bad Lead", "Do Not Contact"],
  Sold: ["Sold", "In Finance", "Online Financing"],
  ClosedLegacy: ["Closed"],
};

export const LEAD_STATUS_VALUES: string[] = LEAD_STATUS_CATEGORY_ORDER.flatMap(
  (category) => LEAD_STATUS_CATEGORIES[category],
);

export type LeadStatus = string;

export const LEAD_STATUS_CATEGORY_OF: Record<string, LeadStatusCategory> = LEAD_STATUS_CATEGORY_ORDER.reduce(
  (acc, category) => {
    for (const status of LEAD_STATUS_CATEGORIES[category]) acc[status] = category;
    return acc;
  },
  {} as Record<string, LeadStatusCategory>,
);

export const NURTURE_ELIGIBLE_STATUSES: string[] = [
  ...LEAD_STATUS_CATEGORIES.None,
  ...LEAD_STATUS_CATEGORIES.Active,
];

export const TERMINAL_LEAD_STATUSES: string[] = [
  ...LEAD_STATUS_CATEGORIES.DeadLead,
  ...LEAD_STATUS_CATEGORIES.Sold,
  ...LEAD_STATUS_CATEGORIES.ClosedLegacy,
];

export const REASON_REQUIRED_STATUSES: string[] = [
  ...LEAD_STATUS_CATEGORIES.DeadLead,
  ...LEAD_STATUS_CATEGORIES.ClosedLegacy,
];

export interface LeadStatusStyle {
  label: string;
  category: LeadStatusCategory;
  bg: string;
  text: string;
  border: string;
  dot: string;
  icon: LucideIcon;
}

const SKY = {
  bg: "bg-sky-500/12 dark:bg-sky-500/16",
  text: "text-sky-800 dark:text-sky-300",
  border: "border-sky-600/30 dark:border-sky-400/30",
  dot: "bg-sky-600 dark:bg-sky-400",
};
const VIOLET = {
  bg: "bg-violet-500/12 dark:bg-violet-500/16",
  text: "text-violet-800 dark:text-violet-300",
  border: "border-violet-600/30 dark:border-violet-400/30",
  dot: "bg-violet-600 dark:bg-violet-400",
};
const AMBER = {
  bg: "bg-amber-500/12 dark:bg-amber-500/16",
  text: "text-amber-800 dark:text-amber-300",
  border: "border-amber-600/30 dark:border-amber-400/30",
  dot: "bg-amber-600 dark:bg-amber-400",
};
const EMERALD = {
  bg: "bg-emerald-500/12 dark:bg-emerald-500/16",
  text: "text-emerald-700 dark:text-emerald-300",
  border: "border-emerald-600/30 dark:border-emerald-400/30",
  dot: "bg-emerald-600 dark:bg-emerald-400",
};
const TEAL = {
  bg: "bg-teal-500/12 dark:bg-teal-500/16",
  text: "text-teal-800 dark:text-teal-300",
  border: "border-teal-600/30 dark:border-teal-400/30",
  dot: "bg-teal-600 dark:bg-teal-400",
};
const ORANGE = {
  bg: "bg-orange-500/12 dark:bg-orange-500/16",
  text: "text-orange-800 dark:text-orange-300",
  border: "border-orange-600/30 dark:border-orange-400/30",
  dot: "bg-orange-600 dark:bg-orange-400",
};
const ROSE = {
  bg: "bg-rose-500/12 dark:bg-rose-500/16",
  text: "text-rose-800 dark:text-rose-300",
  border: "border-rose-600/30 dark:border-rose-400/30",
  dot: "bg-rose-600 dark:bg-rose-400",
};
const GREEN = {
  bg: "bg-green-500/14 dark:bg-green-500/18",
  text: "text-green-800 dark:text-green-300",
  border: "border-green-600/30 dark:border-green-400/30",
  dot: "bg-green-600 dark:bg-green-400",
};
const SLATE = {
  bg: "bg-slate-500/10 dark:bg-slate-400/12",
  text: "text-slate-700 dark:text-slate-300",
  border: "border-slate-500/25 dark:border-slate-400/25",
  dot: "bg-slate-600 dark:bg-slate-400",
};

export const LEAD_STATUS_CONFIG: Record<string, LeadStatusStyle> = {
  New: { label: "New", category: "None", icon: Mail, ...EMERALD },
  Viewed: { label: "Viewed", category: "None", icon: Eye, ...TEAL },

  Contacted: { label: "Contacted", category: "Active", icon: Phone, ...SKY },
  Pending: { label: "Pending", category: "Active", icon: Clock3, ...AMBER },
  "Appointment Set": { label: "Appt. Set", category: "Active", icon: Calendar, ...VIOLET },
  "In Process": { label: "In Process", category: "Active", icon: Activity, ...SKY },
  "Attempted to Contact": { label: "Attempted to Contact", category: "Active", icon: PhoneCall, ...SKY },
  "Contact in Future": { label: "Contact in Future", category: "Active", icon: CalendarClock, ...SKY },
  Declined: { label: "Declined", category: "Active", icon: ThumbsDown, ...AMBER },
  "Appointment Scheduled": { label: "Appt. Scheduled", category: "Active", icon: Calendar, ...VIOLET },
  Rescheduled: { label: "Rescheduled", category: "Active", icon: CalendarClock, ...VIOLET },
  "Came to Dealership": { label: "Came to Dealership", category: "Active", icon: MapPin, ...VIOLET },
  "No Longer Interested": { label: "No Longer Interested", category: "Active", icon: MinusCircle, ...AMBER },
  "Appointment Confirmed": { label: "Appt. Confirmed", category: "Active", icon: CalendarCheck, ...VIOLET },
  Working: { label: "Working", category: "Active", icon: Activity, ...SKY },
  "2nd Attempt to Contact": { label: "2nd Attempt", category: "Active", icon: PhoneCall, ...SKY },
  "3rd Attempt to Contact": { label: "3rd Attempt", category: "Active", icon: PhoneCall, ...SKY },
  "4th Attempt to Contact": { label: "4th Attempt", category: "Active", icon: PhoneCall, ...SKY },
  "Pending Recon": { label: "Pending Recon", category: "Active", icon: Wrench, ...AMBER },
  "Vehicle Not InStock": { label: "Not In Stock", category: "Active", icon: PackageX, ...AMBER },

  "Missed Opportunity": { label: "Missed Opportunity", category: "MissedOpportunity", icon: AlertTriangle, ...ORANGE },

  "Bought Elsewhere": { label: "Bought Elsewhere", category: "DeadLead", icon: ShoppingBag, ...ROSE },
  "Bad Lead": { label: "Bad Lead", category: "DeadLead", icon: ThumbsDown, ...ROSE },
  "Do Not Contact": { label: "Do Not Contact", category: "DeadLead", icon: Ban, ...ROSE },

  Sold: { label: "Sold", category: "Sold", icon: CheckCircle2, ...GREEN },
  "In Finance": { label: "In Finance", category: "Sold", icon: CreditCard, ...GREEN },
  "Online Financing": { label: "Online Financing", category: "Sold", icon: Wifi, ...GREEN },

  Closed: { label: "Closed", category: "ClosedLegacy", icon: XCircle, ...SLATE },

  // UI-only synthetic filter bucket used by LeadsTab.tsx — NOT a real Lead.status
  // value, never sent to the backend. Kept here purely for styling reuse.
  "Inbound Calls": { label: "Inbound", category: "None", icon: PhoneIncoming, ...TEAL },
};

const DEFAULT_STATUS_STYLE: LeadStatusStyle = { label: "Unknown", category: "None", icon: Mail, ...SLATE };

export function getLeadStatusStyle(status: string): LeadStatusStyle {
  return LEAD_STATUS_CONFIG[status] ?? DEFAULT_STATUS_STYLE;
}

/** Flat, grouped {value,label,group} list for a native <select>/<optgroup> control. */
export const LEAD_STATUS_SELECT_OPTIONS: Array<{ value: string; label: string; group: string }> =
  LEAD_STATUS_CATEGORY_ORDER.flatMap((category) =>
    LEAD_STATUS_CATEGORIES[category].map((status) => ({
      value: status,
      label: getLeadStatusStyle(status).label,
      group: LEAD_STATUS_CATEGORY_LABEL[category],
    })),
  );
