import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Tone = "success" | "warning" | "danger" | "neutral" | "info";

const TONE_CLASSES: Record<Tone, string> = {
  success:
    "bg-emerald-500/10 text-emerald-600 border-emerald-200 dark:text-emerald-400 dark:border-emerald-500/30",
  warning:
    "bg-amber-500/10 text-amber-600 border-amber-200 dark:text-amber-400 dark:border-amber-500/30",
  danger:
    "bg-red-500/10 text-red-600 border-red-200 dark:text-red-400 dark:border-red-500/30",
  neutral:
    "bg-muted text-muted-foreground border-border",
  info: "bg-blue-500/10 text-blue-600 border-blue-200 dark:text-blue-400 dark:border-blue-500/30",
};

type StatusEntry = { label: string; tone: Tone };

// One status→{label,tone} map per domain, in place of the color logic that
// used to be duplicated (and drifted slightly differently) across
// admin/drivers/columns.tsx, admin/organizations/columns.tsx, and
// driver-detail-view.tsx.
const DOMAINS = {
  driverVerification: {
    not_started: { label: "Not Started", tone: "neutral" },
    unverified: { label: "Unverified", tone: "neutral" },
    pending: { label: "Pending", tone: "warning" },
    in_progress: { label: "In Progress", tone: "warning" },
    under_review: { label: "Under Review", tone: "warning" },
    verified: { label: "Verified", tone: "success" },
  },
  driverApplication: {
    pending: { label: "Pending", tone: "warning" },
    approved: { label: "Approved", tone: "success" },
    rejected: { label: "Rejected", tone: "danger" },
  },
  driverOperational: {
    active: { label: "Active", tone: "success" },
    on_leave: { label: "On Leave", tone: "warning" },
    maintenance: { label: "Maintenance", tone: "neutral" },
  },
  documentReview: {
    pending: { label: "Under Review", tone: "warning" },
    approved: { label: "Verified", tone: "success" },
    rejected: { label: "Rejected", tone: "danger" },
    missing: { label: "Missing", tone: "neutral" },
  },
  orgStatus: {
    active: { label: "Active", tone: "success" },
    suspended: { label: "Suspended", tone: "danger" },
    archived: { label: "Archived", tone: "neutral" },
  },
  dealershipStatus: {
    active: { label: "Active", tone: "success" },
    suspended: { label: "Suspended", tone: "danger" },
    archived: { label: "Archived", tone: "neutral" },
    pending: { label: "Pending", tone: "warning" },
    invited: { label: "Invited", tone: "info" },
    dismissed: { label: "Dismissed", tone: "neutral" },
  },
  payout: {
    pending: { label: "Pending", tone: "warning" },
    approved: { label: "Approved", tone: "success" },
    paid: { label: "Paid", tone: "success" },
    rejected: { label: "Rejected", tone: "danger" },
  },
  activeStatus: {
    active: { label: "Active", tone: "success" },
    suspended: { label: "Suspended", tone: "danger" },
  },
} satisfies Record<string, Record<string, StatusEntry>>;

export type StatusDomain = keyof typeof DOMAINS;

interface StatusBadgeProps {
  status?: string | null;
  domain: StatusDomain;
  className?: string;
}

export function StatusBadge({ status, domain, className }: StatusBadgeProps) {
  const map = DOMAINS[domain] as Record<string, StatusEntry>;
  const key = String(status ?? "").trim();
  const entry: StatusEntry = map[key] ?? {
    label: key ? key.replace(/_/g, " ") : "Unknown",
    tone: "neutral",
  };

  return (
    <Badge
      variant="outline"
      className={cn("capitalize", TONE_CLASSES[entry.tone], className)}
    >
      {entry.label}
    </Badge>
  );
}
