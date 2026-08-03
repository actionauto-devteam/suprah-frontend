import type { ReportId } from "@/types/report-filters";

export interface ReportExportFilter {
  label: string;
  value: string;
}

export interface ReportExportContext {
  reportId: ReportId;
  title: string;
  description: string;
  periodLabel: string;
  appliedFilters: ReportExportFilter[];
  generatedAt: Date;
  recordCount: number;
  sectionCounts?: Record<string, number>;
  organizationName: string;
  productName: string;
}

export type ReportExportContextInput = string | ReportExportContext;

interface ReportExportDefaults {
  reportId: ReportId;
  title: string;
  description: string;
  recordCount: number;
  sectionCounts?: Record<string, number>;
}

export const REPORT_EXPORT_DESCRIPTIONS: Record<ReportId, string> = {
  "load-report":
    "Operational load activity, customer contacts, vehicles, routes, pricing, timelines, drivers, and proof-of-delivery status.",
  "quote-report":
    "Quote and draft activity covering customer contacts, vehicles, routes, pricing, transport requirements, and conversion status.",
  "lead-status-report":
    "Lead activity grouped by current status, including customer contact, vehicle interest, engagement state, appointments, and reporting dates.",
  "lead-source-report":
    "Lead acquisition performance by source, including source coverage, customer contact, vehicle interest, engagement state, and reporting dates.",
  "driver-report":
    "Driver workload, delivery completion, route mileage, proof-of-delivery progress, and settlement activity.",
  "billing-report":
    "Customer payment activity, payment outcomes, driver payout costs, and revenue after completed driver costs.",
};

export function normalizeReportExportContext(
  input: ReportExportContextInput,
  defaults: ReportExportDefaults,
): ReportExportContext {
  if (typeof input !== "string") {
    return {
      ...input,
      title: input.title || defaults.title,
      description:
        input.description ||
        defaults.description ||
        REPORT_EXPORT_DESCRIPTIONS[defaults.reportId],
      recordCount:
        Number.isFinite(input.recordCount) && input.recordCount >= 0
          ? input.recordCount
          : defaults.recordCount,
      sectionCounts: input.sectionCounts ?? defaults.sectionCounts,
      organizationName: input.organizationName || "Action Auto Utah",
      productName: input.productName || "Suprah AI Reports",
      generatedAt:
        input.generatedAt instanceof Date &&
        !Number.isNaN(input.generatedAt.getTime())
          ? input.generatedAt
          : new Date(),
      appliedFilters: Array.isArray(input.appliedFilters)
        ? input.appliedFilters.filter(
            (item) => item.label.trim() && item.value.trim(),
          )
        : [],
    };
  }

  return {
    reportId: defaults.reportId,
    title: defaults.title,
    description:
      defaults.description || REPORT_EXPORT_DESCRIPTIONS[defaults.reportId],
    periodLabel: input || "Selected Period",
    appliedFilters: [],
    generatedAt: new Date(),
    recordCount: defaults.recordCount,
    sectionCounts: defaults.sectionCounts,
    organizationName: "Action Auto Utah",
    productName: "Suprah AI Reports",
  };
}

export function createReportExportContext(input: {
  reportId: ReportId;
  title: string;
  description?: string;
  periodLabel: string;
  recordCount: number;
  sectionCounts?: Record<string, number>;
  filterLabels?: string[];
  organizationName?: string;
  productName?: string;
  generatedAt?: Date;
}): ReportExportContext {
  const appliedFilters = (input.filterLabels ?? [])
    .map((label) => label.trim())
    .filter(Boolean)
    .map((label) => {
      const separatorIndex = label.indexOf(":");

      if (separatorIndex < 0) {
        return { label: "Filter", value: label };
      }

      return {
        label: label.slice(0, separatorIndex).trim() || "Filter",
        value: label.slice(separatorIndex + 1).trim() || "Applied",
      };
    });

  return {
    reportId: input.reportId,
    title: input.title,
    description:
      input.description || REPORT_EXPORT_DESCRIPTIONS[input.reportId],
    periodLabel: input.periodLabel || "Selected Period",
    appliedFilters,
    generatedAt: input.generatedAt ?? new Date(),
    recordCount: Math.max(0, input.recordCount),
    sectionCounts: input.sectionCounts,
    organizationName: input.organizationName || "Action Auto Utah",
    productName: input.productName || "Suprah AI Reports",
  };
}

export function formatExportTimestamp(date: Date): string {
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Denver",
  });
}

export function formatFilterValue(
  context: ReportExportContext,
): string {
  if (context.appliedFilters.length === 0) {
    return "No additional filters applied";
  }

  return context.appliedFilters
    .map((filter) => `${filter.label}: ${filter.value}`)
    .join(" • ");
}

export function getContextMetadataRows(
  context: ReportExportContext,
): Array<[string, string | number | Date]> {
  const rows: Array<[string, string | number | Date]> = [
    ["Report", context.title],
    ["Description", context.description],
    ["Organization", context.organizationName],
    ["Reporting Period", context.periodLabel],
    ["Generated At", context.generatedAt],
    ["Record Count", context.recordCount],
  ];

  Object.entries(context.sectionCounts ?? {}).forEach(([label, count]) => {
    rows.push([label, count]);
  });

  if (context.appliedFilters.length === 0) {
    rows.push(["Applied Filters", "No additional filters applied"]);
  } else {
    context.appliedFilters.forEach((filter, index) => {
      rows.push([
        index === 0 ? "Applied Filters" : "",
        `${filter.label}: ${filter.value}`,
      ]);
    });
  }

  return rows;
}
