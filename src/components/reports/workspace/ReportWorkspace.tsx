"use client";

import * as React from "react";
import {
  ArrowLeft,
  Calendar,
  Database,
  Copy,
  FileSpreadsheet,
  FileText,
  Loader2,
  RefreshCw,
  Share2,
  Sparkles,
} from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

import ReportFilters from "@/components/reports/ReportFilters";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/providers/AuthProvider";
import { useOrg } from "@/hooks/useOrg";
import { apiClient } from "@/lib/api-client";
import {
  filterLeads,
  filterLoads,
  filterPayments,
  filterPayouts,
  filterQuotes,
  getReportPeriodLabel,
} from "@/lib/report-filter-engine";
import {
  buildFilenameFilterSuffix,
  buildReportFilterChips,
  parseReportColumnPreferences,
  parseReportFilters,
  serializeReportColumnPreferences,
  serializeReportFilters,
  serializeSharedReportPeriod,
  sharedReportPeriodFromFilters,
  SHARED_REPORT_PERIOD_STORAGE_KEY,
  type ReportColumnPreferences,
} from "@/lib/report-filter-query";
import {
  buildLoadSummary,
  buildQuoteSummary,
} from "@/lib/transportation-reports";
import {
  buildLeadSourceSummary,
  buildLeadStatusSummary,
  calculateSourceCoverage,
  countActiveLeads,
  countUnknownSources,
} from "@/components/reports/crm/utils/crm-preview-utils";
import {
  createDefaultReportFilterState,
  getReportFilterConfig,
  REPORT_LABELS,
  type DynamicReportFilterOptions,
  type ReportFilterOption,
  type ReportFilterState,
  type ReportId,
} from "@/types/report-filters";
import type { Payment } from "@/types/billing";
import type { DriverPayout } from "@/types/driver-payout";
import type { Lead } from "@/types/lead";
import type { Load } from "@/types/load";
import type { Quote } from "@/types/transportation";
import { formatCurrency } from "@/utils/format";
import { saveGeneratedReportFile, type ReportFileCategory } from "@/lib/report-files";
import { createReportExportContext } from "@/components/reports/export/report-export-context";
import { getBillingSummary } from "@/components/reports/finance/shared/billing-report-utils";
import {
  readLeadReportCache,
  writeLeadReportCache,
} from "@/components/reports/crm/shared/lead-report-cache";
import ReportAnalyticsPanel from "@/components/reports/analytics/ReportAnalyticsPanel";

import { generateBillingRevenueExcel } from "@/components/reports/finance/excel/BillingRevenueExcel";
import { generateBillingRevenuePdf } from "@/components/reports/finance/pdf/BillingRevenuePdf";
import { generateLeadSourceExcel } from "@/components/reports/crm/excel/LeadSourceExcel";
import { generateLeadStatusExcel } from "@/components/reports/crm/excel/LeadStatusExcel";
import { generateLeadSourcePdf } from "@/components/reports/crm/pdf/LeadSourcePdf";
import { generateLeadStatusPdf } from "@/components/reports/crm/pdf/LeadStatusPdf";
import {
  generateLoadReportPdf,
  generateQuoteReportPdf,
} from "@/components/reports/transportation/TransportationPreviewModal";
import {
  generateQuoteReportExcel,
  generateShipmentReportExcel,
} from "@/components/reports/transportation/pdf-generators";

import SavedReportViews from "./SavedReportViews";
import ReportWorkspacePreview from "./ReportWorkspacePreview";
import {
  generateDriverPerformanceExcel,
  generateDriverPerformancePdf,
} from "./driver-report-export";

interface ReportWorkspaceProps {
  reportId: ReportId;
}

interface WorkspaceData {
  loads: Load[];
  quotes: Quote[];
  leads: Lead[];
  payments: Payment[];
  payouts: DriverPayout[];
}

interface SummaryMetric {
  label: string;
  value: string | number;
  description: string;
}

const EMPTY_DATA: WorkspaceData = {
  loads: [],
  quotes: [],
  leads: [],
  payments: [],
  payouts: [],
};

const RECENT_REPORTS_STORAGE_KEY = "suprah-recent-reports";

interface RecentReportEntry {
  reportId: ReportId;
  label: string;
  href: string;
  visitedAt: string;
}

const REPORT_DESCRIPTIONS: Record<ReportId, string> = {
  "load-report":
    "Review complete load activity, delivery status, routes, mileage, load rates, and assigned drivers.",
  "quote-report":
    "Analyze quote history, rates, mileage, customer demand, and conversion outcomes.",
  "lead-status-report":
    "Inspect lead pipeline activity, follow-up states, appointments, and closed opportunities.",
  "lead-source-report":
    "Understand which acquisition sources are producing the strongest lead volume.",
  "driver-report":
    "Review driver assignments, deliveries, proof-of-delivery activity, and settlement records.",
  "billing-report":
    "Audit customer payments, driver payouts, gross revenue, and net operating position.",
};

const REPORT_FILE_PREFIX: Record<ReportId, string> = {
  "load-report": "Suprah_AI_Unified_Load_Report",
  "quote-report": "Suprah_AI_Quotes_Drafts",
  "lead-status-report": "Suprah_AI_Lead_Status",
  "lead-source-report": "Suprah_AI_Lead_Source",
  "driver-report": "Suprah_AI_Driver_Performance",
  "billing-report": "Suprah_AI_Billings_Revenue",
};

const REPORT_CATEGORY: Record<ReportId, ReportFileCategory> = {
  "load-report": "transportation",
  "quote-report": "transportation",
  "lead-status-report": "crm",
  "lead-source-report": "crm",
  "driver-report": "driver",
  "billing-report": "billings",
};

function dateFromInput(value: string | null): Date {
  if (!value) return new Date();
  const parsed = new Date(`${value}T12:00:00`);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function extractCollection<T>(response: unknown, key: string): T[] {
  const root = response as Record<string, any>;
  const candidates = [root?.data?.data, root?.data, root];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate as T[];
    if (candidate && Array.isArray(candidate[key])) {
      return candidate[key] as T[];
    }
  }

  return [];
}

function toOptions(values: Array<string | undefined | null>): ReportFilterOption[] {
  return Array.from(
    new Set(values.map((value) => String(value ?? "").trim()).filter(Boolean)),
  )
    .sort((first, second) => first.localeCompare(second))
    .map((value) => ({ label: value, value }));
}

function createBrowserDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

function safePeriodFileLabel(value: string): string {
  return value
    .replace(/[^a-zA-Z0-9_-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 70);
}

function SummaryCards({ metrics }: { metrics: SummaryMetric[] }) {
  return (
    <div className="grid min-w-0 gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(100%,12rem),1fr))]">
      {metrics.map((metric) => (
        <div
          key={metric.label}
          className="min-w-0 rounded-xl border border-border/80 bg-card p-4 shadow-sm"
        >
          <p className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
            {metric.label}
          </p>
          <p className="mt-2 break-words text-2xl font-bold tracking-tight text-foreground">
            {metric.value}
          </p>
          <p className="mt-2 text-sm leading-5 text-slate-700 dark:text-slate-300">
            {metric.description}
          </p>
        </div>
      ))}
    </div>
  );
}

export default function ReportWorkspace({ reportId }: ReportWorkspaceProps) {
  const { getToken } = useAuth();
  const { organization } = useOrg();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchString = searchParams.toString();

  const initialReferenceDate = React.useRef(
    searchParams.get("referenceDate") ??
      new Date().toISOString().slice(0, 10),
  );

  const defaultFilters = React.useMemo(
    () =>
      createDefaultReportFilterState(
        reportId,
        dateFromInput(initialReferenceDate.current),
      ),
    [reportId],
  );

  const [filters, setFilters] = React.useState<ReportFilterState>(() =>
    parseReportFilters(new URLSearchParams(searchString), defaultFilters),
  );
  const [columnPreferences, setColumnPreferences] =
    React.useState<ReportColumnPreferences>(() =>
      parseReportColumnPreferences(searchParams.get("columns")),
    );
  const [data, setData] = React.useState<WorkspaceData>(EMPTY_DATA);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [periodAttention, setPeriodAttention] = React.useState(false);
  const [downloading, setDownloading] = React.useState<"pdf" | "xlsx" | null>(
    null,
  );
  const lastWrittenQuery = React.useRef("");
  const filtersSectionRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (searchString === lastWrittenQuery.current) return;
    const params = new URLSearchParams(searchString);
    const parsed = parseReportFilters(params, defaultFilters);
    setFilters(parsed);
    setColumnPreferences(parseReportColumnPreferences(params.get("columns")));
  }, [defaultFilters, searchString]);

  React.useEffect(() => {
    const timeout = window.setTimeout(() => {
      const params = serializeReportFilters(filters, defaultFilters);
      const serializedColumns =
        serializeReportColumnPreferences(columnPreferences);
      if (serializedColumns) params.set("columns", serializedColumns);
      else params.delete("columns");
      const next = params.toString();
      lastWrittenQuery.current = next;

      if (next !== searchString) {
        router.replace(next ? `${pathname}?${next}` : pathname, {
          scroll: false,
        });
      }
    }, 180);

    return () => window.clearTimeout(timeout);
  }, [
    columnPreferences,
    defaultFilters,
    filters,
    pathname,
    router,
    searchString,
  ]);

  React.useEffect(() => {
    try {
      const sharedParams = serializeSharedReportPeriod(
        sharedReportPeriodFromFilters(filters),
      );
      window.sessionStorage.setItem(
        SHARED_REPORT_PERIOD_STORAGE_KEY,
        sharedParams.toString(),
      );
    } catch {
      // Period sharing is a convenience. Storage failures must not interrupt
      // the report workspace.
    }
  }, [filters.dateRange.from, filters.dateRange.to, filters.period, filters.referenceDate]);

  React.useEffect(() => {
    const timeout = window.setTimeout(() => {
      try {
        const stored = JSON.parse(
          window.localStorage.getItem(RECENT_REPORTS_STORAGE_KEY) ?? "[]",
        );
        const current: RecentReportEntry[] = Array.isArray(stored)
          ? stored
          : [];
        const href = searchString ? `${pathname}?${searchString}` : pathname;
        const entry: RecentReportEntry = {
          reportId,
          label: REPORT_LABELS[reportId],
          href,
          visitedAt: new Date().toISOString(),
        };
        const next = [
          entry,
          ...current.filter((item) => item.reportId !== reportId),
        ].slice(0, 5);
        window.localStorage.setItem(
          RECENT_REPORTS_STORAGE_KEY,
          JSON.stringify(next),
        );
      } catch {
        // Recent reports are a convenience feature; storage failures should
        // never interrupt the report workspace.
      }
    }, 450);

    return () => window.clearTimeout(timeout);
  }, [pathname, reportId, searchString]);

  const fetchData = React.useCallback(
    async (background = false) => {
      const isLeadReport =
        reportId === "lead-status-report" ||
        reportId === "lead-source-report";

      if (background) setRefreshing(true);
      else setLoading(true);

      try {
        const token = await getToken();

        if (!background && isLeadReport) {
          const cachedLeads = token ? readLeadReportCache(token) : null;

          if (cachedLeads) {
            setData({
              ...EMPTY_DATA,
              leads: cachedLeads,
            });
            return;
          }
        }

        const headers = { Authorization: `Bearer ${token}` };
        const next: WorkspaceData = { ...EMPTY_DATA };

        if (reportId === "load-report") {
          const response = await apiClient.get("/api/loads?page=1&limit=5000", {
            headers,
          });
          next.loads = extractCollection<Load>(response, "loads");
        } else if (reportId === "quote-report") {
          const response = await apiClient.get("/api/quotes?page=1&limit=5000", {
            headers,
          });
          next.quotes = extractCollection<Quote>(response, "quotes");
        } else if (
          reportId === "lead-status-report" ||
          reportId === "lead-source-report"
        ) {
          const response = await apiClient.get(
            "/api/leads?page=1&limit=5000&sortBy=newest",
            { headers },
          );
          next.leads = extractCollection<Lead>(response, "leads");
          if (token) writeLeadReportCache(next.leads, token);
        } else if (reportId === "driver-report") {
          const [loadResponse, payoutResponse] = await Promise.all([
            apiClient.get("/api/loads?page=1&limit=5000", { headers }),
            apiClient.get("/api/driver-payouts?page=1&limit=5000", {
              headers,
            }),
          ]);
          next.loads = extractCollection<Load>(loadResponse, "loads");
          next.payouts = extractCollection<DriverPayout>(
            payoutResponse,
            "payouts",
          );
        } else {
          const [paymentResponse, payoutResponse] = await Promise.all([
            apiClient.get("/api/payments?page=1&limit=5000", { headers }),
            apiClient.get("/api/driver-payouts?page=1&limit=5000", {
              headers,
            }),
          ]);
          next.payments = extractCollection<Payment>(
            paymentResponse,
            "payments",
          );
          next.payouts = extractCollection<DriverPayout>(
            payoutResponse,
            "payouts",
          );
        }

        setData(next);
      } catch (error) {
        console.error("Report workspace fetch failed:", error);
        toast.error("Failed to load report data");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [getToken, reportId],
  );

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const dynamicOptions = React.useMemo<DynamicReportFilterOptions>(() => {
    const driverMap = new Map<string, string>();

    data.loads.forEach((load) => {
      const assigned = load.assignedDriverId;
      if (!assigned) return;
      if (typeof assigned === "string") {
        driverMap.set(assigned, assigned);
      } else {
        driverMap.set(
          assigned._id,
          assigned.name ?? assigned.email ?? assigned._id,
        );
      }
    });

    data.payouts.forEach((payout) => {
      const id =
        typeof payout.driverId === "string"
          ? payout.driverId
          : payout.driverId?._id;
      if (!id) return;
      driverMap.set(id, payout.driverName || id);
    });

    return {
      drivers: Array.from(driverMap.entries())
        .map(([value, label]) => ({ value, label }))
        .sort((a, b) => a.label.localeCompare(b.label)),
      pickupStates: toOptions(
        data.loads.map((load) => load.pickupLocation?.state),
      ),
      deliveryStates: toOptions(
        data.loads.map((load) => load.deliveryLocation?.state),
      ),
      leadSources: toOptions(data.leads.map((lead) => lead.source)),
      paymentMethods: toOptions(
        data.payments.map((payment) => payment.paymentMethod),
      ),
    };
  }, [data]);

  const config = React.useMemo(
    () => getReportFilterConfig(reportId, dynamicOptions),
    [dynamicOptions, reportId],
  );

  const filteredLoads = React.useMemo(
    () => filterLoads(data.loads, filters),
    [data.loads, filters],
  );
  const filteredQuotes = React.useMemo(
    () => filterQuotes(data.quotes, filters),
    [data.quotes, filters],
  );
  const filteredLeads = React.useMemo(
    () => filterLeads(data.leads, filters),
    [data.leads, filters],
  );
  const filteredPayments = React.useMemo(
    () => filterPayments(data.payments, filters),
    [data.payments, filters],
  );
  const filteredPayouts = React.useMemo(
    () => filterPayouts(data.payouts, filters),
    [data.payouts, filters],
  );

  const totalCount = React.useMemo(() => {
    if (reportId === "load-report") return data.loads.length;
    if (reportId === "quote-report") return data.quotes.length;
    if (reportId === "lead-status-report" || reportId === "lead-source-report") {
      return data.leads.length;
    }
    if (reportId === "driver-report") {
      return (
        data.loads.filter((load) => Boolean(load.assignedDriverId)).length +
        data.payouts.length
      );
    }
    return data.payments.length + data.payouts.length;
  }, [data, reportId]);

  const filteredCount = React.useMemo(() => {
    if (reportId === "load-report") return filteredLoads.length;
    if (reportId === "quote-report") return filteredQuotes.length;
    if (reportId === "lead-status-report" || reportId === "lead-source-report") {
      return filteredLeads.length;
    }
    if (reportId === "driver-report") {
      return (
        filteredLoads.filter((load) => Boolean(load.assignedDriverId)).length +
        filteredPayouts.length
      );
    }
    return filteredPayments.length + filteredPayouts.length;
  }, [
    filteredLeads,
    filteredLoads,
    filteredPayments,
    filteredPayouts,
    filteredQuotes,
    reportId,
  ]);

  const resultLabel = `Showing ${filteredCount.toLocaleString()} of ${totalCount.toLocaleString()}`;
  const periodLabel = getReportPeriodLabel(filters);
  const analyticsPeriodContext = React.useMemo(
    () => ({
      period: filters.period,
      referenceDate: filters.referenceDate,
      from: filters.dateRange.from,
      to: filters.dateRange.to,
      label: periodLabel,
    }),
    [
      filters.dateRange.from,
      filters.dateRange.to,
      filters.period,
      filters.referenceDate,
      periodLabel,
    ],
  );
  const chips = React.useMemo(
    () => buildReportFilterChips(filters, defaultFilters, config),
    [config, defaultFilters, filters],
  );

  const summaryMetrics = React.useMemo<SummaryMetric[]>(() => {
    if (reportId === "load-report") {
      const summary = buildLoadSummary(filteredLoads);
      return [
        {
          label: "Filtered Loads",
          value: filteredLoads.length,
          description: `${resultLabel} load records`,
        },
        {
          label: "Delivered",
          value: summary.delivered,
          description: `${summary.onTimeRate}% delivery efficiency`,
        },
        {
          label: "In Transit",
          value: summary.inTransit,
          description: "Loads currently moving",
        },
        {
          label: "Total Load Rate",
          value: formatCurrency(summary.totalRate),
          description: "Carrier pay when available; otherwise estimated rate",
        },
      ];
    }

    if (reportId === "quote-report") {
      const summary = buildQuoteSummary(filteredQuotes);
      return [
        {
          label: "Filtered Quotes",
          value: filteredQuotes.length,
          description: `${resultLabel} quote records`,
        },
        {
          label: "Booked",
          value: summary.booked,
          description: `${summary.conversionRate}% conversion rate`,
        },
        {
          label: "Total Value",
          value: formatCurrency(summary.totalRate),
          description: "Combined quote value",
        },
        {
          label: "Average Rate",
          value: formatCurrency(summary.avgRate),
          description: "Average rate per quote",
        },
      ];
    }

    if (reportId === "lead-status-report") {
      const statusSummary = buildLeadStatusSummary(filteredLeads);
      const active = countActiveLeads(statusSummary);
      const appointments = filteredLeads.filter((lead) => Boolean(lead.appointment)).length;
      const pendingReplies = filteredLeads.filter((lead) => lead.isPending === true).length;
      return [
        { label: "Filtered Leads", value: filteredLeads.length, description: resultLabel },
        { label: "Active Leads", value: active, description: "Leads still in an active workflow" },
        { label: "Appointments", value: appointments, description: "Leads with appointment details" },
        { label: "Pending Replies", value: pendingReplies, description: "Leads awaiting a reply" },
      ];
    }

    if (reportId === "lead-source-report") {
      const sourceSummary = buildLeadSourceSummary(filteredLeads);
      const unknownSources = countUnknownSources(sourceSummary);
      const coverage = calculateSourceCoverage(filteredLeads.length, unknownSources);
      return [
        { label: "Filtered Leads", value: filteredLeads.length, description: resultLabel },
        { label: "Unique Sources", value: sourceSummary.length, description: "Normalized sources represented" },
        { label: "Top Source", value: sourceSummary[0]?.source ?? "—", description: `${sourceSummary[0]?.count ?? 0} leads` },
        { label: "Source Coverage", value: `${coverage.toFixed(1)}%`, description: `${unknownSources} unknown source records` },
      ];
    }

    if (reportId === "driver-report") {
      const assigned = filteredLoads.filter((load) => Boolean(load.assignedDriverId));
      const delivered = assigned.filter((load) => load.status === "Delivered");
      const podApproved = assigned.filter((load) => Boolean(load.proofOfDelivery?.confirmedAt));
      const payoutTotal = filteredPayouts.reduce(
        (sum, payout) => sum + Number(payout.amount || 0),
        0,
      );
      return [
        { label: "Assigned Loads", value: assigned.length, description: `${filteredLoads.length} filtered load records` },
        { label: "Delivered", value: delivered.length, description: assigned.length ? `${Math.round((delivered.length / assigned.length) * 100)}% completion` : "0% completion" },
        { label: "POD Approved", value: podApproved.length, description: "Dealer-confirmed deliveries" },
        { label: "Settlements", value: formatCurrency(payoutTotal), description: `${filteredPayouts.length} payout records` },
      ];
    }

    const billingSummary = getBillingSummary(
      filteredPayments,
      filteredPayouts,
    );
    return [
      { label: "Revenue Collected", value: formatCurrency(billingSummary.revenueCollected), description: `${filteredPayments.length} payment records` },
      { label: "Paid Driver Costs", value: formatCurrency(billingSummary.paidDriverCosts), description: `${filteredPayouts.length} payout records` },
      { label: "Revenue After Driver Costs", value: formatCurrency(billingSummary.netPosition), description: "Collected revenue less paid driver costs" },
      { label: "Successful", value: billingSummary.successfulPaymentCount, description: resultLabel },
    ];
  }, [
    filteredLeads,
    filteredLoads,
    filteredPayments,
    filteredPayouts,
    filteredQuotes,
    reportId,
    resultLabel,
  ]);

  const openCustomDateRange = React.useCallback(() => {
    setFilters((current) => ({
      ...current,
      period: "custom",
    }));
    setPeriodAttention(true);

    window.requestAnimationFrame(() => {
      filtersSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });

    window.setTimeout(() => setPeriodAttention(false), 5_000);
  }, []);

  const returnToReports = React.useCallback(() => {
    const params = serializeSharedReportPeriod(
      sharedReportPeriodFromFilters(filters),
    );
    const query = params.toString();

    router.push(query ? `/reports?${query}` : "/reports");
  }, [filters, router]);

  const resetFilters = React.useCallback(() => {
    setFilters(structuredClone(defaultFilters));
  }, [defaultFilters]);

  const copyShareLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Report link copied");
    } catch {
      toast.error("Could not copy the report link");
    }
  };

  const downloadReport = async (format: "pdf" | "xlsx") => {
    setDownloading(format);

    try {
      const exportContext = createReportExportContext({
        reportId,
        title: REPORT_LABELS[reportId],
        periodLabel,
        organizationName: organization?.name,
        recordCount: filteredCount,
        sectionCounts:
          reportId === "driver-report"
            ? {
                "Assigned Load Records": filteredLoads.filter((load) => Boolean(load.assignedDriverId)).length,
                "Settlement Records": filteredPayouts.length,
              }
            : reportId === "billing-report"
              ? {
                  "Customer Payment Records": filteredPayments.length,
                  "Driver Payout Records": filteredPayouts.length,
                }
              : undefined,
        filterLabels: chips
          .filter((chip) => chip.group !== "period")
          .map((chip) => chip.label),
      });
      const filterSuffix = buildFilenameFilterSuffix(chips);
      const periodFileLabel = safePeriodFileLabel(periodLabel);
      const extension = format === "pdf" ? "pdf" : "xlsx";
      const filename = `${REPORT_FILE_PREFIX[reportId]}_${periodFileLabel}${filterSuffix}.${extension}`;
      let blob: Blob;

      if (reportId === "load-report") {
        blob =
          format === "pdf"
            ? await generateLoadReportPdf(filteredLoads, exportContext)
            : await generateShipmentReportExcel(filteredLoads, exportContext);
      } else if (reportId === "quote-report") {
        blob =
          format === "pdf"
            ? await generateQuoteReportPdf(filteredQuotes, exportContext)
            : await generateQuoteReportExcel(filteredQuotes, exportContext);
      } else if (reportId === "lead-status-report") {
        blob =
          format === "pdf"
            ? await generateLeadStatusPdf(filteredLeads, exportContext)
            : await generateLeadStatusExcel(filteredLeads, exportContext);
      } else if (reportId === "lead-source-report") {
        blob =
          format === "pdf"
            ? await generateLeadSourcePdf(filteredLeads, exportContext)
            : await generateLeadSourceExcel(filteredLeads, exportContext);
      } else if (reportId === "driver-report") {
        blob =
          format === "pdf"
            ? await generateDriverPerformancePdf(
                filteredLoads,
                filteredPayouts,
                exportContext,
              )
            : await generateDriverPerformanceExcel(
                filteredLoads,
                filteredPayouts,
                exportContext,
              );
      } else {
        blob =
          format === "pdf"
            ? await generateBillingRevenuePdf(
                filteredPayments,
                filteredPayouts,
                exportContext,
              )
            : await generateBillingRevenueExcel(
                filteredPayments,
                filteredPayouts,
                exportContext,
              );
      }

      await saveGeneratedReportFile({
        name: filename,
        category: REPORT_CATEGORY[reportId],
        type: format === "pdf" ? "PDF" : "XLSX",
        blob,
      });
      createBrowserDownload(blob, filename);
      toast.success(
        `${format === "pdf" ? "PDF" : "Excel"} downloaded with ${filteredCount.toLocaleString()} filtered records`,
      );
    } catch (error) {
      console.error("Report export failed:", error);
      toast.error(`Failed to generate ${format === "pdf" ? "PDF" : "Excel"}`);
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="min-h-screen min-w-0 bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/95 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-[1880px] flex-wrap items-center justify-between gap-3 px-3 py-3 sm:px-4 xl:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="shrink-0"
              onClick={returnToReports}
              aria-label="Back to reports"
            >
              <ArrowLeft className="size-5" />
            </Button>
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <Sparkles className="size-5" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-lg font-bold tracking-tight sm:text-xl">
                {REPORT_LABELS[reportId]}
              </h1>
              <p className="hidden text-xs text-muted-foreground sm:block">
                {periodLabel} · {resultLabel}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 gap-2"
              onClick={() => fetchData(true)}
              disabled={refreshing}
            >
              <RefreshCw className={`size-4 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 gap-2"
              onClick={copyShareLink}
            >
              <Share2 className="size-4" />
              Share
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 gap-2"
              onClick={() => downloadReport("pdf")}
              disabled={downloading !== null || loading}
              title={`Download ${filteredCount} filtered records as PDF`}
            >
              {downloading === "pdf" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <FileText className="size-4 text-red-500" />
              )}
              PDF ({filteredCount})
            </Button>
            <Button
              type="button"
              size="sm"
              className="h-9 gap-2"
              onClick={() => downloadReport("xlsx")}
              disabled={downloading !== null || loading}
              title={`Download ${filteredCount} filtered records as Excel`}
            >
              {downloading === "xlsx" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <FileSpreadsheet className="size-4" />
              )}
              Excel ({filteredCount})
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1880px] min-w-0 space-y-4 px-3 py-4 sm:px-4 xl:px-5">
        <section className="flex min-w-0 flex-col gap-3 rounded-xl border border-border/80 bg-card p-4 shadow-sm lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 max-w-3xl">
            <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              {REPORT_LABELS[reportId]}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {REPORT_DESCRIPTIONS[reportId]}
            </p>
          </div>

          <div className="flex min-w-0 flex-col gap-2 lg:items-end">
            <SavedReportViews
              reportId={reportId}
              filters={filters}
              columns={columnPreferences}
              onApply={(savedFilters, savedColumns) => {
                setFilters({
                  ...savedFilters,
                  // Ignore date choices stored by older saved views.
                  dateField: defaultFilters.dateField,
                });
                setColumnPreferences(savedColumns);
              }}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 self-start gap-2 text-xs text-muted-foreground lg:self-end"
              onClick={copyShareLink}
            >
              <Copy className="size-3.5" />
              Copy current filtered view
            </Button>
          </div>
        </section>

        <div ref={filtersSectionRef}>
          <ReportFilters
            config={config}
            filters={filters}
            defaultFilters={defaultFilters}
            onChange={setFilters}
            onReset={resetFilters}
            resultLabel={resultLabel}
            periodAttention={periodAttention}
          />
        </div>

        {loading ? (
          <div className="flex min-h-72 items-center justify-center rounded-xl border border-border/80 bg-card">
            <div className="text-center">
              <Loader2 className="mx-auto size-7 animate-spin text-primary" />
              <p className="mt-3 text-sm font-semibold text-foreground">
                Loading report data
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Preparing the workspace and available filter options.
              </p>
            </div>
          </div>
        ) : (
          <>
            {filteredCount === 0 ? (
              <section className="rounded-2xl border border-amber-500/60 bg-amber-50 p-4 shadow-sm dark:border-amber-400/35 dark:bg-amber-950/35 sm:p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Database className="size-5 shrink-0 text-amber-700 dark:text-amber-300" />
                      <h3 className="text-base font-extrabold text-slate-950 dark:text-amber-50 sm:text-lg">
                        No report data available for this date range
                      </h3>
                    </div>
                    <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-slate-800 dark:text-slate-200">
                      No matching records were found for {periodLabel}. Refresh the report or choose another date range to continue.
                    </p>
                  </div>

                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="gap-2 border-slate-300 bg-white font-semibold text-slate-900 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
                      onClick={() => fetchData(true)}
                      disabled={refreshing}
                    >
                      <RefreshCw className={`size-4 ${refreshing ? "animate-spin" : ""}`} />
                      Refresh
                    </Button>
                    <Button
                      type="button"
                      className="gap-2 bg-emerald-600 font-semibold text-white hover:bg-emerald-700 dark:bg-emerald-500 dark:text-slate-950 dark:hover:bg-emerald-400"
                      onClick={openCustomDateRange}
                    >
                      <Calendar className="size-4" />
                      Change Date Range
                    </Button>
                  </div>
                </div>
              </section>
            ) : null}

            <SummaryCards metrics={summaryMetrics} />
            {filteredCount > 0 ? (
              <ReportAnalyticsPanel
              reportId={reportId}
              loads={filteredLoads}
              quotes={filteredQuotes}
              leads={filteredLeads}
              payments={filteredPayments}
              payouts={filteredPayouts}
                periodContext={analyticsPeriodContext}
              />
            ) : null}
            <ReportWorkspacePreview
              reportId={reportId}
              loads={filteredLoads}
              quotes={filteredQuotes}
              leads={filteredLeads}
              payments={filteredPayments}
              payouts={filteredPayouts}
              columnPreferences={columnPreferences}
              onColumnPreferencesChange={setColumnPreferences}
            />
          </>
        )}
      </main>
    </div>
  );
}