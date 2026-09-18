import type { AppointmentStatus, EntryType } from "@/types/appointment";

export const APPOINTMENT_STATUSES: AppointmentStatus[] = [
  "scheduled",
  "confirmed",
  "completed",
  "cancelled",
  "no-show",
];

export const ENTRY_TYPES: EntryType[] = ["appointment", "event", "task", "reminder"];

export interface AppointmentStatusStyle {
  label: string;
  pill: string;
  badge: string;
  bar: string;
  dot: string;
}

export const APPOINTMENT_STATUS_CONFIG: Record<AppointmentStatus, AppointmentStatusStyle> = {
  confirmed: {
    label: "Confirmed",
    pill: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30 dark:text-emerald-400",
    badge: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30 dark:text-emerald-400",
    bar: "bg-emerald-500",
    dot: "bg-emerald-500",
  },
  scheduled: {
    label: "Scheduled",
    pill: "bg-blue-500/10 text-blue-700 border-blue-500/30 dark:text-blue-400",
    badge: "bg-blue-500/10 text-blue-700 border-blue-500/30 dark:text-blue-400",
    bar: "bg-blue-500",
    dot: "bg-blue-500",
  },
  completed: {
    label: "Completed",
    pill: "bg-gray-500/10 text-gray-700 border-gray-400/30 dark:text-gray-400",
    badge: "bg-gray-500/10 text-gray-700 border-gray-400/30 dark:text-gray-400",
    bar: "bg-gray-400",
    dot: "bg-gray-400",
  },
  cancelled: {
    label: "Cancelled",
    pill: "bg-red-500/10 text-red-700 border-red-500/30 dark:text-red-400",
    badge: "bg-red-500/10 text-red-700 border-red-500/30 dark:text-red-400",
    bar: "bg-red-500",
    dot: "bg-red-500",
  },
  "no-show": {
    label: "No-show",
    pill: "bg-amber-500/10 text-amber-700 border-amber-500/30 dark:text-amber-400",
    badge: "bg-amber-500/10 text-amber-700 border-amber-500/30 dark:text-amber-400",
    bar: "bg-amber-500",
    dot: "bg-amber-500",
  },
};

export function getAppointmentStatusStyle(status: string): AppointmentStatusStyle {
  return APPOINTMENT_STATUS_CONFIG[status as AppointmentStatus] ?? APPOINTMENT_STATUS_CONFIG.scheduled;
}

export interface EntryTypeStyle {
  label: string;
  chip: string;
  dot: string;
  popover: string;
  badge: string;
}

export const ENTRY_TYPE_CONFIG: Record<EntryType, EntryTypeStyle> = {
  appointment: {
    label: "Appointment",
    chip: "bg-violet-500/15 text-violet-800 dark:text-violet-300 border-l-2 border-violet-500 hover:bg-violet-500/25",
    dot: "bg-violet-500",
    popover: "bg-violet-500/10 text-violet-800 dark:text-violet-200 border-violet-500/25",
    badge: "bg-violet-500/10 text-violet-700 border-violet-500/30 dark:text-violet-400",
  },
  event: {
    label: "Event",
    chip: "bg-blue-500/15 text-blue-800 dark:text-blue-300 border-l-2 border-blue-500 hover:bg-blue-500/25",
    dot: "bg-blue-500",
    popover: "bg-blue-500/10 text-blue-800 dark:text-blue-200 border-blue-500/25",
    badge: "bg-blue-500/10 text-blue-700 border-blue-500/30 dark:text-blue-400",
  },
  task: {
    label: "Task",
    chip: "bg-orange-500/15 text-orange-800 dark:text-orange-300 border-l-2 border-orange-500 hover:bg-orange-500/25",
    dot: "bg-orange-500",
    popover: "bg-orange-500/10 text-orange-800 dark:text-orange-200 border-orange-500/25",
    badge: "bg-orange-500/10 text-orange-700 border-orange-500/30 dark:text-orange-400",
  },
  reminder: {
    label: "Reminder",
    chip: "bg-pink-500/15 text-pink-800 dark:text-pink-300 border-l-2 border-pink-500 hover:bg-pink-500/25",
    dot: "bg-pink-500",
    popover: "bg-pink-500/10 text-pink-800 dark:text-pink-200 border-pink-500/25",
    badge: "bg-pink-500/10 text-pink-700 border-pink-500/30 dark:text-pink-400",
  },
};

const ENTRY_TYPE_DEFAULT_STYLE: EntryTypeStyle = {
  label: "Other",
  chip: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-l-2 border-emerald-500 hover:bg-emerald-500/25",
  dot: "bg-emerald-500",
  popover: "bg-emerald-500/10 text-emerald-800 dark:text-emerald-200 border-emerald-500/25",
  badge: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30 dark:text-emerald-400",
};

export function getEntryTypeStyle(entryType: string): EntryTypeStyle {
  return ENTRY_TYPE_CONFIG[entryType as EntryType] ?? ENTRY_TYPE_DEFAULT_STYLE;
}

export type GuestResponseStatus = "accepted" | "declined" | "pending";

export const GUEST_STATUS_CONFIG: Record<GuestResponseStatus, { label: string; badge: string }> = {
  accepted: {
    label: "Accepted",
    badge: "border-emerald-500 text-emerald-700 bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-400",
  },
  declined: {
    label: "Declined",
    badge: "border-red-500 text-red-700 bg-red-50 dark:bg-red-950/30 dark:text-red-400",
  },
  pending: {
    label: "Pending",
    badge: "border-border text-muted-foreground",
  },
};

export const SERVICE_HUB_STATUS_TONE: Record<string, { dot: string; bar: string; badge: string }> = {
  scheduled: {
    dot: "bg-sky-500",
    bar: "bg-gradient-to-b from-sky-400 to-sky-500",
    badge: "bg-sky-500/10 text-sky-700 border-sky-500/25 dark:text-sky-400",
  },
  confirmed: {
    dot: "bg-teal-500",
    bar: "bg-gradient-to-b from-teal-400 to-teal-500",
    badge: "bg-teal-500/10 text-teal-700 border-teal-500/25 dark:text-teal-400",
  },
  completed: {
    dot: "bg-emerald-500",
    bar: "bg-gradient-to-b from-emerald-400 to-emerald-500",
    badge: "bg-emerald-500/10 text-emerald-700 border-emerald-500/25 dark:text-emerald-400",
  },
  cancelled: {
    dot: "bg-rose-500",
    bar: "bg-gradient-to-b from-rose-400 to-rose-500",
    badge: "bg-rose-500/10 text-rose-700 border-rose-500/25 dark:text-rose-400",
  },
};

export const SERVICE_HUB_TYPE_BADGE: Record<string, string> = {
  appointment: "bg-violet-500/10 text-violet-700 border-violet-500/25 dark:text-violet-400",
  "test-drive": "bg-amber-500/10 text-amber-700 border-amber-500/25 dark:text-amber-400",
  "phone-call": "bg-blue-500/10 text-blue-700 border-blue-500/25 dark:text-blue-400",
  meeting: "bg-teal-500/10 text-teal-700 border-teal-500/25 dark:text-teal-400",
  event: "bg-pink-500/10 text-pink-700 border-pink-500/25 dark:text-pink-400",
  task: "bg-orange-500/10 text-orange-700 border-orange-500/25 dark:text-orange-400",
  reminder: "bg-teal-500/10 text-teal-700 border-teal-500/25 dark:text-teal-400",
};

export const SERVICE_HUB_SOURCE_BADGE: Record<string, string> = {
  sms: "bg-emerald-500/10 text-emerald-700 border-emerald-500/25 dark:text-emerald-400",
  phone: "bg-blue-500/10 text-blue-700 border-blue-500/25 dark:text-blue-400",
  email: "bg-violet-500/10 text-violet-700 border-violet-500/25 dark:text-violet-400",
  lead: "bg-amber-500/10 text-amber-700 border-amber-500/25 dark:text-amber-400",
  booking: "bg-teal-500/10 text-teal-700 border-teal-500/25 dark:text-teal-400",
  manual: "bg-gray-500/10 text-gray-700 border-gray-400/25 dark:text-gray-400",
};

export function getServiceHubBadgeClass(map: Record<string, string>, key: string) {
  return map[key.toLowerCase()] ?? "bg-muted text-muted-foreground border-border";
}
