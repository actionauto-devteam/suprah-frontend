import type { ReportFileCategory } from "@/lib/report-files";

export type ReportCategory = ReportFileCategory;

export interface FileEntry {
  id: string;
  name: string;
  createdAt: number;
  date: string;
  sizeBytes: number;
  size: string;
  type: string;
  category: ReportCategory;
}

export type ShareTarget = { type: "reports-area" } | { type: "file"; file: FileEntry };

export type SettingsSection =
  | "account"
  | "locations"
  | "security"
  | "notifications"
  | "integrations";

export const SYSTEM_SETTINGS_STORAGE_KEY = "action-auto-system-settings";

export type SystemSettings = {
  account: {
    dealershipName: string;
    primaryLocation: string;
    autoSyncDms: boolean;
    publicConditionReports: boolean;
  };
  locations: {
    defaultIntakeLocation: string;
    inventoryHoldWindowDays: string;
    autoAssignNearestLot: boolean;
  };
  security: {
    requireMfaForStaff: boolean;
    strictRoleEnforcement: boolean;
    sessionTimeoutMinutes: string;
  };
  notifications: {
    emailAlerts: boolean;
    pushNotifications: boolean;
    dailyDigestTime: string;
  };
  integrations: Record<string, never>;
};

export const DEFAULT_SYSTEM_SETTINGS: SystemSettings = {
  account: {
    dealershipName: "Your Dealership",
    primaryLocation: "Lehi, UT",
    autoSyncDms: true,
    publicConditionReports: true,
  },
  locations: {
    defaultIntakeLocation: "Lehi, UT",
    inventoryHoldWindowDays: "14",
    autoAssignNearestLot: true,
  },
  security: {
    requireMfaForStaff: true,
    strictRoleEnforcement: true,
    sessionTimeoutMinutes: "30",
  },
  notifications: {
    emailAlerts: true,
    pushNotifications: true,
    dailyDigestTime: "08:00 AM",
  },
  integrations: {},
};

export const CATEGORY_LABELS: Record<ReportCategory, string> = {
  transportation: "Transportation",
  driver: "Driver Reports",
  billings: "Billings",
  crm: "CRM & Leads",
};

export function formatRelativeFileTime(createdAt: number): string {
  const diffMs = Date.now() - createdAt;
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diffMs < minute) return "Just now";
  if (diffMs < hour) {
    const mins = Math.max(1, Math.floor(diffMs / minute));
    return `${mins} min${mins === 1 ? "" : "s"} ago`;
  }
  if (diffMs < day) {
    const hrs = Math.max(1, Math.floor(diffMs / hour));
    return `${hrs} hour${hrs === 1 ? "" : "s"} ago`;
  }
  if (diffMs < 2 * day) return "Yesterday";

  return new Date(createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "America/Denver",
  });
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb.toFixed(1)} MB`;
  const gb = mb / 1024;
  return `${gb.toFixed(1)} GB`;
}
