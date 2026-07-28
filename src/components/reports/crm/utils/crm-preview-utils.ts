import type { Lead } from "@/types/lead";

export interface LeadStatusSummaryItem {
  status: string;
  count: number;
  percentage: number;
}

export interface LeadSourceSummaryItem {
  source: string;
  count: number;
  percentage: number;
}

type LeadWithOptionalFields = Lead & {
  _id?: string;
  firstName?: string;
  lastName?: string;
  senderName?: string;
  email?: string;
  phone?: string;
  status?: string;
  source?: string;
  createdAt?: string;
  updatedAt?: string;
  vehicle?: {
    year?: string | number;
    make?: string;
    model?: string;
  };
};

/**
 * Converts an unknown value to a safe display string.
 */
export function safeText(
  value: unknown,
  fallback = "—",
): string {
  const text = String(value ?? "").trim();

  return text || fallback;
}

/**
 * Converts values such as:
 * - new_lead
 * - in-progress
 *
 * Into:
 * - New Lead
 * - In Progress
 */
export function normalizeLabel(
  value: unknown,
  fallback = "Unknown",
): string {
  const text = String(value ?? "")
    .trim()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");

  if (!text) {
    return fallback;
  }

  return text.replace(/\b\w/g, (character) =>
    character.toUpperCase(),
  );
}

/**
 * Formats a date for report previews.
 */
export function formatLeadDate(value: unknown): string {
  if (!value) {
    return "—";
  }

  const date = new Date(String(value));

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Returns the best available display name for a lead.
 */
export function getLeadName(lead: Lead): string {
  const typedLead = lead as LeadWithOptionalFields;

  const firstName = safeText(typedLead.firstName, "");
  const lastName = safeText(typedLead.lastName, "");

  const fullName = `${firstName} ${lastName}`.trim();

  if (fullName) {
    return fullName;
  }

  return safeText(typedLead.senderName, "Unnamed Lead");
}

/**
 * Returns the lead's unique identifier.
 */
export function getLeadId(
  lead: Lead,
  fallback: string,
): string {
  const typedLead = lead as LeadWithOptionalFields;

  return safeText(typedLead._id, fallback);
}

/**
 * Returns the lead email.
 */
export function getLeadEmail(lead: Lead): string {
  const typedLead = lead as LeadWithOptionalFields;

  return safeText(typedLead.email);
}

/**
 * Returns the lead phone number.
 */
export function getLeadPhone(lead: Lead): string {
  const typedLead = lead as LeadWithOptionalFields;

  return safeText(typedLead.phone);
}

/**
 * Returns a normalized status label.
 */
export function getLeadStatus(lead: Lead): string {
  const typedLead = lead as LeadWithOptionalFields;

  return normalizeLabel(typedLead.status, "Unknown");
}

/**
 * Returns a normalized source label.
 */
export function getLeadSource(lead: Lead): string {
  const typedLead = lead as LeadWithOptionalFields;

  return normalizeLabel(typedLead.source, "Unknown");
}

/**
 * Returns the lead creation date.
 */
export function getLeadCreatedAt(lead: Lead): string {
  const typedLead = lead as LeadWithOptionalFields;

  return formatLeadDate(typedLead.createdAt);
}

/**
 * Returns a readable vehicle description.
 */
export function getLeadVehicle(lead: Lead): string {
  const typedLead = lead as LeadWithOptionalFields;
  const vehicle = typedLead.vehicle;

  if (!vehicle) {
    return "—";
  }

  const description = [
    safeText(vehicle.year, ""),
    safeText(vehicle.make, ""),
    safeText(vehicle.model, ""),
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  return description || "—";
}

/**
 * Returns the Tailwind classes used for a lead status badge.
 */
export function leadStatusBadgeClass(
  status: string,
): string {
  const normalizedStatus = status.toLowerCase();

  if (
    normalizedStatus.includes("won") ||
    normalizedStatus.includes("converted") ||
    normalizedStatus.includes("qualified")
  ) {
    return [
      "bg-emerald-50 text-emerald-700 border-emerald-200",
      "dark:bg-emerald-950/60 dark:text-emerald-300",
      "dark:border-emerald-800",
    ].join(" ");
  }

  if (
    normalizedStatus === "new" ||
    normalizedStatus.includes("new lead") ||
    normalizedStatus.includes("open")
  ) {
    return [
      "bg-blue-50 text-blue-700 border-blue-200",
      "dark:bg-blue-950/60 dark:text-blue-300",
      "dark:border-blue-800",
    ].join(" ");
  }

  if (
    normalizedStatus.includes("contact") ||
    normalizedStatus.includes("follow up") ||
    normalizedStatus.includes("progress") ||
    normalizedStatus.includes("pending")
  ) {
    return [
      "bg-amber-50 text-amber-700 border-amber-200",
      "dark:bg-amber-950/60 dark:text-amber-300",
      "dark:border-amber-800",
    ].join(" ");
  }

  if (
    normalizedStatus.includes("lost") ||
    normalizedStatus.includes("cancel") ||
    normalizedStatus.includes("rejected") ||
    normalizedStatus.includes("closed")
  ) {
    return [
      "bg-red-50 text-red-700 border-red-200",
      "dark:bg-red-950/60 dark:text-red-300",
      "dark:border-red-800",
    ].join(" ");
  }

  return "bg-muted text-muted-foreground border-border";
}

/**
 * Determines whether a lead is considered active.
 */
export function isActiveLeadStatus(
  status: string,
): boolean {
  const normalizedStatus = status.toLowerCase();

  return !(
    normalizedStatus.includes("lost") ||
    normalizedStatus.includes("cancel") ||
    normalizedStatus.includes("rejected") ||
    normalizedStatus.includes("closed") ||
    normalizedStatus.includes("converted") ||
    normalizedStatus.includes("won")
  );
}

/**
 * Builds the status distribution used by the Lead Status report.
 */
export function buildLeadStatusSummary(
  leads: Lead[],
): LeadStatusSummaryItem[] {
  const counts = leads.reduce<Record<string, number>>(
    (result, lead) => {
      const status = getLeadStatus(lead);

      result[status] = (result[status] ?? 0) + 1;

      return result;
    },
    {},
  );

  return Object.entries(counts)
    .map(([status, count]) => ({
      status,
      count,
      percentage:
        leads.length > 0
          ? Math.round((count / leads.length) * 1000) / 10
          : 0,
    }))
    .sort((first, second) => {
      if (second.count !== first.count) {
        return second.count - first.count;
      }

      return first.status.localeCompare(second.status);
    });
}

/**
 * Builds the source distribution used by the Lead Source report.
 */
export function buildLeadSourceSummary(
  leads: Lead[],
): LeadSourceSummaryItem[] {
  const counts = leads.reduce<Record<string, number>>(
    (result, lead) => {
      const source = getLeadSource(lead);

      result[source] = (result[source] ?? 0) + 1;

      return result;
    },
    {},
  );

  return Object.entries(counts)
    .map(([source, count]) => ({
      source,
      count,
      percentage:
        leads.length > 0
          ? Math.round((count / leads.length) * 1000) / 10
          : 0,
    }))
    .sort((first, second) => {
      if (second.count !== first.count) {
        return second.count - first.count;
      }

      return first.source.localeCompare(second.source);
    });
}

/**
 * Returns the number of active leads.
 */
export function countActiveLeads(
  summary: LeadStatusSummaryItem[],
): number {
  return summary
    .filter((item) => isActiveLeadStatus(item.status))
    .reduce((total, item) => total + item.count, 0);
}

/**
 * Returns the count of leads with an unknown status.
 */
export function countUnknownStatuses(
  summary: LeadStatusSummaryItem[],
): number {
  return (
    summary.find(
      (item) => item.status.toLowerCase() === "unknown",
    )?.count ?? 0
  );
}

/**
 * Returns the count of leads with an unknown source.
 */
export function countUnknownSources(
  summary: LeadSourceSummaryItem[],
): number {
  return (
    summary.find(
      (item) => item.source.toLowerCase() === "unknown",
    )?.count ?? 0
  );
}

/**
 * Returns the percentage of leads with a recognized source.
 */
export function calculateSourceCoverage(
  totalLeads: number,
  unknownSourceCount: number,
): number {
  if (totalLeads === 0) {
    return 0;
  }

  return (
    Math.round(
      ((totalLeads - unknownSourceCount) / totalLeads) *
        1000,
    ) / 10
  );
}