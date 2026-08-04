"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";
import { apiClient } from "@/lib/api-client";
import {
  FileText,
  Archive,
  MapPin,
  CreditCard,
  DollarSign,
  Truck,
  CheckSquare,
  Calendar,
  Database,
  Users,
  Search,
  RefreshCw,
  Sparkles,
  ChevronDown,
  ChevronUp,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  WalletCards,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { formatCurrency } from "@/utils/format";
import { Payment } from "@/types/billing";
import { DriverPayout } from "@/types/driver-payout";
import type { Lead } from "@/types/lead";
import { ReportCard } from "@/components/reports/ReportCard";
import RecentReports from "@/components/reports/workspace/RecentReports";
import { ReportExportMenu } from "@/components/reports/ReportExportMenu";
import { ReportPreviewModal } from "@/components/reports/ReportPreviewModal";
import {
  ALL_REPORT_PERIODS,
  createDefaultFiltersByReport,
  PERIOD_LABELS,
  REPORT_LABELS,
  type ReportFilterState,
  type ReportId,
  type ReportPeriod,
} from "@/types/report-filters";
import {
  filterLeads,
  filterLoads,
  filterPayments,
  filterPayouts,
  filterQuotes,
  getReportPeriodLabel,
  createPreviousReportPeriodFilters,
} from "@/lib/report-filter-engine";
import {
  applySharedReportPeriod,
  parseSharedReportPeriod,
  serializeSharedReportPeriod,
  SHARED_REPORT_PERIOD_STORAGE_KEY,
  type SharedReportPeriodState,
} from "@/lib/report-filter-query";
import {
  CRMPreviewModal,
  type CRMReportType,
} from "@/components/reports/crm/CRMPreviewModal";
import { generateLeadStatusPdf } from "@/components/reports/crm/pdf/LeadStatusPdf";
import { generateLeadSourcePdf } from "@/components/reports/crm/pdf/LeadSourcePdf";
import { generateLeadStatusExcel } from "@/components/reports/crm/excel/LeadStatusExcel";
import { generateLeadSourceExcel } from "@/components/reports/crm/excel/LeadSourceExcel";
import { generateBillingRevenuePdf } from "@/components/reports/finance/pdf/BillingRevenuePdf";
import { generateBillingRevenueExcel } from "@/components/reports/finance/excel/BillingRevenueExcel";
import { getBillingSummary } from "@/components/reports/finance/shared/billing-report-utils";
import { writeLeadReportCache } from "@/components/reports/crm/shared/lead-report-cache";
import {
  buildLeadSourceSummary,
  countUnknownSources,
} from "@/components/reports/crm/utils/crm-preview-utils";
import { ReportsAnalytics } from "@/components/reports/ReportsAnalytics";
import { LeadAnalyticsOverview } from "@/components/reports/crm/LeadAnalyticsOverview";
import { Quote as TransportQuote } from "@/types/transportation";
import { Load } from "@/types/load";
import { TransportationAnalytics } from "@/components/reports/transportation/TransportationAnalytics";
import {
  TransportationPreviewModal,
  generateLoadReportPdf,
  generateQuoteReportPdf,
} from "@/components/reports/transportation/TransportationPreviewModal";
import {
  buildLoadSummary,
  buildQuoteSummary,
  driverName,
  fmtCurrency as transportFmtCurrency,
  fmtDate,
  loadCustomer,
  loadRoute,
  loadVehicle,
} from "@/lib/transportation-reports";
import {
  generateQuoteReportExcel,
  generateShipmentReportExcel,
} from "@/components/reports/transportation/pdf-generators";
import {
  saveGeneratedReportFile,
  type ReportFileCategory,
} from "@/lib/report-files";
import { createReportExportContext } from "@/components/reports/export/report-export-context";
import {
  generateDriverPerformanceExcel,
  generateDriverPerformancePdf,
} from "@/components/reports/workspace/driver-report-export";

type TrendDirection = "up" | "down" | "flat";

interface TrendInfo {
  label: string;
  direction: TrendDirection;
}

function getTrend(current: number, previous: number): TrendInfo {
  if (current === 0 && previous === 0) {
    return {
      label: "No records to compare yet",
      direction: "flat",
    };
  }

  if (previous === 0) {
    return current > 0
      ? { label: "New activity in the selected period", direction: "up" }
      : { label: "No records in the earlier period", direction: "flat" };
  }

  if (current === previous) {
    return { label: "Same as the earlier period", direction: "flat" };
  }

  const change = Math.round(((current - previous) / Math.abs(previous)) * 100);
  const amount = Math.abs(change);
  return {
    label: `${amount}% ${change > 0 ? "more" : "less"} than the earlier period`,
    direction: change > 0 ? "up" : "down",
  };
}

function getRateTrend(current: number, previous: number): TrendInfo {
  if (current === 0 && previous === 0) {
    return {
      label: "No rate to compare yet",
      direction: "flat",
    };
  }

  if (previous === 0) {
    return current > 0
      ? { label: "New rate available in the selected period", direction: "up" }
      : { label: "No rate recorded in the earlier period", direction: "flat" };
  }

  const difference = Math.round((current - previous) * 10) / 10;

  if (difference === 0) {
    return { label: "Same rate as the earlier period", direction: "flat" };
  }

  return {
    label: `${Math.abs(difference)} points ${difference > 0 ? "higher" : "lower"} than the earlier period`,
    direction: difference > 0 ? "up" : "down",
  };
}

type ExportFormat = "pdf" | "xlsx";

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

type TabValue =
  | "ALL"
  | "Transportation"
  | "CRM"
  | "Driver Reports"
  | "Billings";

interface ReportData {
  loads: Load[];
  payments: Payment[];
  payouts: DriverPayout[];
  leads: Lead[];
}

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const CATEGORIES = [
  { id: "ALL", label: "All Reports", icon: Archive },
  { id: "Transportation", label: "Transportation", icon: Truck },
  { id: "CRM", label: "CRM & Leads", icon: Users },
  { id: "Driver Reports", label: "Driver Reports", icon: MapPin },
  { id: "Billings", label: "Billings & Finance", icon: CreditCard },
];


function formatDateInput(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function dateFromInput(value: string): Date {
  const parsed = new Date(`${value}T12:00:00`);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function sameSharedPeriod(
  first: SharedReportPeriodState,
  second: SharedReportPeriodState,
): boolean {
  return (
    first.period === second.period &&
    first.referenceDate === second.referenceDate &&
    first.dateRange.from === second.dateRange.from &&
    first.dateRange.to === second.dateRange.to
  );
}

export default function ReportsPage() {
  const { getToken } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchString = searchParams.toString();
  const defaultReferenceDate = React.useRef(formatDateInput(new Date()));
  const lastWrittenQuery = React.useRef("");
  const periodControlRef = React.useRef<HTMLDivElement | null>(null);
  const mainCustomFromRef = React.useRef<HTMLInputElement | null>(null);

  const [activeTab, setActiveTab] = React.useState<TabValue>("ALL");
  const [sharedPeriod, setSharedPeriod] =
    React.useState<SharedReportPeriodState>(() =>
      parseSharedReportPeriod(
        new URLSearchParams(searchString),
        defaultReferenceDate.current,
      ),
    );
  const [isRefreshing, setIsRefreshing] = React.useState(true);
  const [isPeriodControlExpanded, setIsPeriodControlExpanded] =
    React.useState(false);
  const [periodControlAttention, setPeriodControlAttention] =
    React.useState(false);

  const isPeriodControlOpen = isPeriodControlExpanded;

  const [reportData, setReportData] = React.useState<ReportData | null>(null);
  const isInitialLoading = reportData === null;
  const [rawLoads, setRawLoads] = React.useState<Load[]>([]);
  const [rawQuotes, setRawQuotes] = React.useState<TransportQuote[]>([]);
  const [rawPayments, setRawPayments] = React.useState<Payment[]>([]);
  const [rawPayouts, setRawPayouts] = React.useState<DriverPayout[]>([]);
  const [rawLeads, setRawLeads] = React.useState<Lead[]>([]);

  const filtersByReport = React.useMemo(() => {
    const defaults = createDefaultFiltersByReport(
      dateFromInput(sharedPeriod.referenceDate),
    );

    (Object.keys(defaults) as ReportId[]).forEach((reportId) => {
      defaults[reportId] = applySharedReportPeriod(
        defaults[reportId],
        sharedPeriod,
      );
    });

    return defaults;
  }, [sharedPeriod]);

  const [selected, setSelected] = React.useState<Set<ReportId>>(
    new Set<ReportId>(),
  );
  const [isMultiSelectMode, setIsMultiSelectMode] = React.useState(false);
  const [downloading, setDownloading] = React.useState<ReportId | null>(null);
  const [showTransportationAnalytics, setShowTransportationAnalytics] = React.useState(true);
  const [showOperationalAnalytics, setShowOperationalAnalytics] = React.useState(true);
  const [showLeadAnalytics, setShowLeadAnalytics] = React.useState(true);

  const [previewType, setPreviewType] = React.useState<string | null>(null);
  const [transportPreview, setTransportPreview] = React.useState<
    "load" | "quote" | null
  >(null);
  const [crmPreview, setCrmPreview] =
  React.useState<CRMReportType | null>(null);

  const fetchData = React.useCallback(async () => {
    setIsRefreshing(true);

    try {
      const token = await getToken();
      const headers = { Authorization: `Bearer ${token}` };

      const [
        allLoadsRes,
        quotesRes,
        allPaymentsRes,
        allPayoutsRes,
        allLeadsRes,
      ] = await Promise.all([
        apiClient.get("/api/loads?page=1&limit=5000", { headers }),
        apiClient.get("/api/quotes?page=1&limit=5000", { headers }),
        apiClient.get("/api/payments?page=1&limit=5000", { headers }),
        apiClient.get("/api/driver-payouts?page=1&limit=5000", {
          headers,
        }),
        apiClient.get("/api/leads?page=1&limit=5000&sortBy=newest", {
          headers,
        }),
      ]);

      const allLoadsPayload = allLoadsRes.data?.data;
      const allPaymentsPayload = allPaymentsRes.data?.data;
      const allPayoutPayload =
        allPayoutsRes.data?.data ?? allPayoutsRes.data;
      const leadPayload = allLeadsRes.data?.data;

      const allLoads: Load[] = Array.isArray(allLoadsPayload)
        ? allLoadsPayload
        : Array.isArray(allLoadsPayload?.loads)
          ? allLoadsPayload.loads
          : [];

      const allPayments: Payment[] = Array.isArray(allPaymentsPayload)
        ? allPaymentsPayload
        : Array.isArray(allPaymentsPayload?.payments)
          ? allPaymentsPayload.payments
          : [];

      const allPayouts: DriverPayout[] = Array.isArray(allPayoutPayload)
        ? allPayoutPayload
        : Array.isArray(allPayoutPayload?.payouts)
          ? allPayoutPayload.payouts
          : [];

      const quotes: TransportQuote[] = Array.isArray(quotesRes.data?.data)
        ? quotesRes.data.data
        : Array.isArray(quotesRes.data?.data?.quotes)
          ? quotesRes.data.data.quotes
          : [];

      const allLeads: Lead[] = Array.isArray(leadPayload)
        ? leadPayload
        : Array.isArray(leadPayload?.leads)
          ? leadPayload.leads
          : [];

      writeLeadReportCache(allLeads);

      setReportData({
        loads: allLoads,
        payments: allPayments,
        payouts: allPayouts,
        leads: allLeads,
      });
      setRawLoads(allLoads);
      setRawQuotes(quotes);
      setRawPayments(allPayments);
      setRawPayouts(allPayouts);
      setRawLeads(allLeads);
    } catch (error) {
      console.error("Report fetch error:", error);
      toast.error("Failed to load report data");
    } finally {
      setIsRefreshing(false);
    }
  }, [getToken]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  React.useEffect(() => {
    if (searchString === lastWrittenQuery.current) return;

    const next = parseSharedReportPeriod(
      new URLSearchParams(searchString),
      defaultReferenceDate.current,
    );

    setSharedPeriod((current) =>
      sameSharedPeriod(current, next) ? current : next,
    );
  }, [searchString]);

  React.useEffect(() => {
    const timeout = window.setTimeout(() => {
      const params = serializeSharedReportPeriod(sharedPeriod);
      const next = params.toString();
      lastWrittenQuery.current = next;

      if (next !== searchString) {
        router.replace(next ? `${pathname}?${next}` : pathname, {
          scroll: false,
        });
      }
    }, 120);

    return () => window.clearTimeout(timeout);
  }, [pathname, router, searchString, sharedPeriod]);

  React.useEffect(() => {
    const consumeWorkspacePeriod = () => {
      try {
        const stored = window.sessionStorage.getItem(
          SHARED_REPORT_PERIOD_STORAGE_KEY,
        );
        if (!stored) return;

        window.sessionStorage.removeItem(
          SHARED_REPORT_PERIOD_STORAGE_KEY,
        );
        const next = parseSharedReportPeriod(
          new URLSearchParams(stored),
          defaultReferenceDate.current,
        );
        setSharedPeriod((current) =>
          sameSharedPeriod(current, next) ? current : next,
        );
      } catch {
        // Period transfer is a convenience. Storage failures must not block
        // the Reports page.
      }
    };

    consumeWorkspacePeriod();
    window.addEventListener("pageshow", consumeWorkspacePeriod);

    return () =>
      window.removeEventListener("pageshow", consumeWorkspacePeriod);
  }, []);

  // ─── Filter Logic ───────────────────────────────────────────────────────────

  const monthLabel = getReportPeriodLabel(
    filtersByReport["load-report"],
  );
  const analyticsReferenceDate =
    sharedPeriod.period === "custom"
      ? sharedPeriod.dateRange.to ??
        sharedPeriod.dateRange.from ??
        sharedPeriod.referenceDate
      : sharedPeriod.referenceDate;

  const openReportWorkspace = React.useCallback(
    (reportId: ReportId) => {
      try {
        window.sessionStorage.removeItem(
          SHARED_REPORT_PERIOD_STORAGE_KEY,
        );
      } catch {
        // Storage is optional.
      }

      const params = serializeSharedReportPeriod(sharedPeriod);
      const query = params.toString();
      router.push(
        query
          ? `/reports/${reportId}?${query}`
          : `/reports/${reportId}`,
      );
    },
    [router, sharedPeriod],
  );

  const openPeriodControl = React.useCallback(() => {
    setIsPeriodControlExpanded(true);
    setPeriodControlAttention(true);
    window.scrollTo({ top: 0, behavior: "smooth" });

    window.requestAnimationFrame(() => {
      periodControlRef.current?.focus();
    });

    window.setTimeout(
      () => setPeriodControlAttention(false),
      5_000,
    );
  }, []);

  const updateSharedPeriod = React.useCallback(
    (patch: Partial<SharedReportPeriodState>) => {
      setSharedPeriod((current) => ({
        ...current,
        ...patch,
        dateRange:
          patch.dateRange !== undefined
            ? { ...patch.dateRange }
            : current.dateRange,
      }));
      setPeriodControlAttention(false);
    },
    [],
  );

  const handleMainPeriodChange = React.useCallback(
    (value: string) => {
      const period = value as ReportPeriod;

      updateSharedPeriod({
        period,
        dateRange:
          period === "custom"
            ? sharedPeriod.dateRange
            : { from: undefined, to: undefined },
      });

      if (period === "custom") {
        window.requestAnimationFrame(() => {
          mainCustomFromRef.current?.focus();
        });
      }
    },
    [sharedPeriod.dateRange, updateSharedPeriod],
  );

  const filteredLoads = React.useMemo(
    () => filterLoads(rawLoads, filtersByReport["load-report"]),
    [filtersByReport, rawLoads],
  );

  const filteredQuotes = React.useMemo(
    () => filterQuotes(rawQuotes, filtersByReport["quote-report"]),
    [filtersByReport, rawQuotes],
  );

  const filteredLeadStatus = React.useMemo(
    () =>
      filterLeads(
        rawLeads,
        filtersByReport["lead-status-report"],
      ),
    [filtersByReport, rawLeads],
  );

  const filteredLeadSource = React.useMemo(
    () =>
      filterLeads(
        rawLeads,
        filtersByReport["lead-source-report"],
      ),
    [filtersByReport, rawLeads],
  );

  const filteredDriverLoads = React.useMemo(
    () => filterLoads(rawLoads, filtersByReport["driver-report"]),
    [filtersByReport, rawLoads],
  );

  const filteredDriverPayouts = React.useMemo(
    () =>
      filterPayouts(
        rawPayouts,
        filtersByReport["driver-report"],
      ),
    [filtersByReport, rawPayouts],
  );

  const filteredBillingPayments = React.useMemo(
    () =>
      filterPayments(
        rawPayments,
        filtersByReport["billing-report"],
      ),
    [filtersByReport, rawPayments],
  );

  const filteredBillingPayouts = React.useMemo(
    () =>
      filterPayouts(
        rawPayouts,
        filtersByReport["billing-report"],
      ),
    [filtersByReport, rawPayouts],
  );

  const reportPeriodLabels = React.useMemo(
    () => ({
      "load-report": getReportPeriodLabel(
        filtersByReport["load-report"],
      ),
      "quote-report": getReportPeriodLabel(
        filtersByReport["quote-report"],
      ),
      "lead-status-report": getReportPeriodLabel(
        filtersByReport["lead-status-report"],
      ),
      "lead-source-report": getReportPeriodLabel(
        filtersByReport["lead-source-report"],
      ),
      "driver-report": getReportPeriodLabel(
        filtersByReport["driver-report"],
      ),
      "billing-report": getReportPeriodLabel(
        filtersByReport["billing-report"],
      ),
    }),
    [filtersByReport],
  );

  const previousFiltersByReport = React.useMemo<
    Record<ReportId, ReportFilterState | null>
  >(
    () => ({
      "load-report": createPreviousReportPeriodFilters(
        filtersByReport["load-report"],
      ),
      "quote-report": createPreviousReportPeriodFilters(
        filtersByReport["quote-report"],
      ),
      "lead-status-report": createPreviousReportPeriodFilters(
        filtersByReport["lead-status-report"],
      ),
      "lead-source-report": createPreviousReportPeriodFilters(
        filtersByReport["lead-source-report"],
      ),
      "driver-report": createPreviousReportPeriodFilters(
        filtersByReport["driver-report"],
      ),
      "billing-report": createPreviousReportPeriodFilters(
        filtersByReport["billing-report"],
      ),
    }),
    [filtersByReport],
  );

  const previousPeriodLabel = React.useMemo(() => {
    const previous = previousFiltersByReport["load-report"];
    return previous
      ? getReportPeriodLabel(previous)
      : "no earlier comparison period";
  }, [previousFiltersByReport]);

  const hasPreviousComparison =
    previousFiltersByReport["load-report"] !== null;

  const displayTrend = React.useCallback(
    (current: number, previous: number): TrendInfo =>
      hasPreviousComparison
        ? getTrend(current, previous)
        : {
            label: "No earlier period available for comparison",
            direction: "flat",
          },
    [hasPreviousComparison],
  );

  const displayRateTrend = React.useCallback(
    (current: number, previous: number): TrendInfo =>
      hasPreviousComparison
        ? getRateTrend(current, previous)
        : {
            label: "No earlier period available for comparison",
            direction: "flat",
          },
    [hasPreviousComparison],
  );

  const previousFilteredLoads = React.useMemo(() => {
    const previous = previousFiltersByReport["load-report"];
    return previous ? filterLoads(rawLoads, previous) : [];
  }, [previousFiltersByReport, rawLoads]);

  const previousFilteredQuotes = React.useMemo(() => {
    const previous = previousFiltersByReport["quote-report"];
    return previous ? filterQuotes(rawQuotes, previous) : [];
  }, [previousFiltersByReport, rawQuotes]);

  const previousFilteredLeadStatus = React.useMemo(() => {
    const previous = previousFiltersByReport["lead-status-report"];
    return previous ? filterLeads(rawLeads, previous) : [];
  }, [previousFiltersByReport, rawLeads]);

  const previousFilteredLeadSource = React.useMemo(() => {
    const previous = previousFiltersByReport["lead-source-report"];
    return previous ? filterLeads(rawLeads, previous) : [];
  }, [previousFiltersByReport, rawLeads]);

  const previousFilteredDriverPayouts = React.useMemo(() => {
    const previous = previousFiltersByReport["driver-report"];
    return previous ? filterPayouts(rawPayouts, previous) : [];
  }, [previousFiltersByReport, rawPayouts]);

  const previousFilteredBillingPayments = React.useMemo(() => {
    const previous = previousFiltersByReport["billing-report"];
    return previous ? filterPayments(rawPayments, previous) : [];
  }, [previousFiltersByReport, rawPayments]);

  const previousFilteredBillingPayouts = React.useMemo(() => {
    const previous = previousFiltersByReport["billing-report"];
    return previous ? filterPayouts(rawPayouts, previous) : [];
  }, [previousFiltersByReport, rawPayouts]);

  const loadSummary = React.useMemo(
    () => buildLoadSummary(filteredLoads),
    [filteredLoads],
  );

  const quoteSummary = React.useMemo(
    () => buildQuoteSummary(filteredQuotes),
    [filteredQuotes],
  );

  const billingSummary = React.useMemo(
    () => getBillingSummary(filteredBillingPayments, filteredBillingPayouts),
    [filteredBillingPayments, filteredBillingPayouts],
  );

  const previousLoadSummary = React.useMemo(
    () => buildLoadSummary(previousFilteredLoads),
    [previousFilteredLoads],
  );

  const previousQuoteSummary = React.useMemo(
    () => buildQuoteSummary(previousFilteredQuotes),
    [previousFilteredQuotes],
  );

  const previousBillingSummary = React.useMemo(
    () =>
      getBillingSummary(
        previousFilteredBillingPayments,
        previousFilteredBillingPayouts,
      ),
    [
      previousFilteredBillingPayments,
      previousFilteredBillingPayouts,
    ],
  );

  const revenueTotal = billingSummary.revenueCollected;
  const payoutTotal = billingSummary.paidDriverCosts;
  const previousRevenueTotal = previousBillingSummary.revenueCollected;
  const previousPayoutTotal = previousBillingSummary.paidDriverCosts;

  const driverPayoutTotal = React.useMemo(
    () =>
      filteredDriverPayouts.reduce(
        (total, payout) => total + Number(payout.amount || 0),
        0,
      ),
    [filteredDriverPayouts],
  );

  const previousDriverPayoutTotal = React.useMemo(
    () =>
      previousFilteredDriverPayouts.reduce(
        (total, payout) => total + Number(payout.amount || 0),
        0,
      ),
    [previousFilteredDriverPayouts],
  );

  const driverAssignedLoads = React.useMemo(
    () => filteredDriverLoads.filter((load) => Boolean(load.assignedDriverId)),
    [filteredDriverLoads],
  );

  const driverDeliveredLoads = React.useMemo(
    () => driverAssignedLoads.filter((load) => load.status === "Delivered"),
    [driverAssignedLoads],
  );

  const driverDeliveryRate =
    driverAssignedLoads.length > 0
      ? Math.round((driverDeliveredLoads.length / driverAssignedLoads.length) * 100)
      : 0;

  const deliveredLoads = filteredLoads.filter(
    (load) => load.status === "Delivered",
  ).length;
  const previousDeliveredLoads = previousFilteredLoads.filter(
    (load) => load.status === "Delivered",
  ).length;
  const totalLoads = filteredLoads.length;
  const previousTotalLoads = previousFilteredLoads.length;
  const deliveryRate = totalLoads > 0 ? (deliveredLoads / totalLoads) * 100 : 0;
  const previousDeliveryRate =
    previousTotalLoads > 0
      ? (previousDeliveredLoads / previousTotalLoads) * 100
      : 0;
  const netRevenue = billingSummary.netPosition;
  const previousNetRevenue = previousBillingSummary.netPosition;

  const leadStats = React.useMemo(() => {
    const leads = filteredLeadStatus;

    return {
      total: leads.length,
      new: leads.filter((lead) => lead.status === "New").length,
      contacted: leads.filter((lead) => lead.status === "Contacted").length,
      pending: leads.filter((lead) => lead.status === "Pending").length,
      appointment: leads.filter((lead) => Boolean(lead.appointment)).length,
      closed: leads.filter((lead) => lead.status === "Closed").length,
    };
  }, [filteredLeadStatus]);

  const previousLeadStats = React.useMemo(() => {
    const leads = previousFilteredLeadStatus;

    return {
      total: leads.length,
      new: leads.filter((lead) => lead.status === "New").length,
      contacted: leads.filter((lead) => lead.status === "Contacted").length,
      pending: leads.filter((lead) => lead.status === "Pending").length,
      appointment: leads.filter((lead) => Boolean(lead.appointment)).length,
      closed: leads.filter((lead) => lead.status === "Closed").length,
    };
  }, [previousFilteredLeadStatus]);

  const leadSourceStats = React.useMemo(() => {
    const leads = filteredLeadSource;
    const sources = buildLeadSourceSummary(leads);
    const unknownCount = countUnknownSources(sources);

    return {
      total: leads.length,
      sources,
      topSource: sources[0]?.source ?? "No source",
      topSourceCount: sources[0]?.count ?? 0,
      uniqueSources: sources.length,
      unknownCount,
    };
  }, [filteredLeadSource]);

  const previousLeadSourceStats = React.useMemo(() => {
    const sources = buildLeadSourceSummary(
      previousFilteredLeadSource,
    );

    return {
      total: previousFilteredLeadSource.length,
      topSource: sources[0]?.source ?? "No source",
      topSourceCount: sources[0]?.count ?? 0,
      uniqueSources: sources.length,
      unknownCount: countUnknownSources(sources),
    };
  }, [previousFilteredLeadSource]);

  const succeededPayments = filteredBillingPayments.filter(
    (payment) => payment.status === "succeeded",
  ).length;
  const pendingPayments = filteredBillingPayments.filter((payment) =>
    ["pending", "processing"].includes(payment.status),
  ).length;

  const reportAvailability = React.useMemo<Record<ReportId, boolean>>(
    () => ({
      "load-report": filteredLoads.length > 0,
      "quote-report": filteredQuotes.length > 0,
      "lead-status-report": filteredLeadStatus.length > 0,
      "lead-source-report": filteredLeadSource.length > 0,
      "driver-report":
        driverAssignedLoads.length > 0 || filteredDriverPayouts.length > 0,
      "billing-report":
        filteredBillingPayments.length > 0 || filteredBillingPayouts.length > 0,
    }),
    [
      driverAssignedLoads.length,
      filteredBillingPayments.length,
      filteredBillingPayouts.length,
      filteredDriverPayouts.length,
      filteredLeadSource.length,
      filteredLeadStatus.length,
      filteredLoads.length,
      filteredQuotes.length,
    ],
  );
  const hasSelectedPeriodData = Object.values(reportAvailability).some(Boolean);

  // ─── Actions ────────────────────────────────────────────────────────────────

  const toggleSelect = (id: ReportId) => {
    setSelected((current) => {
      const next = new Set<ReportId>(current);

      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }

      return next;
    });
  };

  const visibleReportIds = React.useMemo<ReportId[]>(() => {
    if (activeTab === "Transportation") {
      return ["load-report", "quote-report"];
    }

    if (activeTab === "CRM") {
      return [
        "lead-status-report",
        "lead-source-report",
      ];
    }

    if (activeTab === "Driver Reports") {
      return ["driver-report"];
    }

    if (activeTab === "Billings") {
      return ["billing-report"];
    }

    return [
      "load-report",
      "quote-report",
      "lead-status-report",
      "lead-source-report",
      "driver-report",
      "billing-report",
    ];
  }, [activeTab]);

  const getReportCardLayoutClass = React.useCallback(
    (reportId: ReportId): string => {
      const reportCount = visibleReportIds.length;
      const reportIndex = visibleReportIds.indexOf(reportId);

      if (reportCount <= 1) return "md:col-span-6";
      if (reportCount === 2) return "md:col-span-3";
      if (reportCount === 3) return "md:col-span-3 xl:col-span-2";
      if (reportCount === 4) return "md:col-span-3 xl:col-span-3";

      if (reportCount === 5) {
        return `md:col-span-3 xl:col-span-2 ${
          reportIndex === 3 ? "xl:col-start-2" : ""
        }`;
      }

      return "md:col-span-3 xl:col-span-2";
    },
    [visibleReportIds],
  );

  const startMultiSelect = () => {
    setIsMultiSelectMode((current) => {
      const next = !current;

      if (!next) {
        setSelected(new Set<ReportId>());
      }

      return next;
    });
  };

  React.useEffect(() => {
    setSelected((current) => {
      const next = new Set<ReportId>(
        Array.from(current).filter((id) =>
          visibleReportIds.includes(id),
        ),
      );

      return next.size === current.size ? current : next;
    });

    setIsMultiSelectMode(false);
  }, [visibleReportIds]);

  const downloadReport = async (
    reportId: ReportId,
    format: ExportFormat = "pdf",
  ) => {
    const periodLabel = reportPeriodLabels[reportId];
    const reportRecordCount =
      reportId === "load-report"
        ? filteredLoads.length
        : reportId === "quote-report"
          ? filteredQuotes.length
          : reportId === "lead-status-report"
            ? filteredLeadStatus.length
            : reportId === "lead-source-report"
              ? filteredLeadSource.length
              : reportId === "driver-report"
                ? filteredDriverLoads.filter((load) => Boolean(load.assignedDriverId)).length +
                  filteredDriverPayouts.length
                : filteredBillingPayments.length + filteredBillingPayouts.length;
    const exportContext = createReportExportContext({
      reportId,
      title: REPORT_LABELS[reportId],
      periodLabel,
      recordCount: reportRecordCount,
      sectionCounts:
        reportId === "driver-report"
          ? {
              "Assigned Load Records": filteredDriverLoads.filter((load) => Boolean(load.assignedDriverId)).length,
              "Settlement Records": filteredDriverPayouts.length,
            }
          : reportId === "billing-report"
            ? {
                "Customer Payment Records": filteredBillingPayments.length,
                "Driver Payout Records": filteredBillingPayouts.length,
              }
            : undefined,
    });
    const safePeriodLabel = periodLabel
      .replace(/\s+/g, "_")
      .replace(/[^\w-]/g, "");

    setDownloading(reportId);

    try {
      let blob: Blob | null = null;
      const extension = format === "xlsx" ? "xlsx" : "pdf";
      let filename = `Report_${reportId}_${safePeriodLabel}.${extension}`;
      let category: ReportFileCategory = "transportation";

      if (reportId === "load-report") {
        blob =
          format === "xlsx"
            ? await generateShipmentReportExcel(
                filteredLoads,
                exportContext,
              )
            : await generateLoadReportPdf(
                filteredLoads,
                exportContext,
              );
        filename = `Suprah_AI_Unified_Load_Report_${safePeriodLabel}.${extension}`;
        category = "transportation";
      } else if (reportId === "quote-report") {
        blob =
          format === "xlsx"
            ? await generateQuoteReportExcel(
                filteredQuotes,
                exportContext,
              )
            : await generateQuoteReportPdf(
                filteredQuotes,
                exportContext,
              );
        filename = `Suprah_AI_Quotes_Drafts_${safePeriodLabel}.${extension}`;
        category = "transportation";
      } else if (reportId === "driver-report") {
        blob =
          format === "xlsx"
            ? await generateDriverPerformanceExcel(
                filteredDriverLoads,
                filteredDriverPayouts,
                exportContext,
              )
            : await generateDriverPerformancePdf(
                filteredDriverLoads,
                filteredDriverPayouts,
                exportContext,
              );
        filename = `Suprah_AI_Driver_Performance_${safePeriodLabel}.${extension}`;
        category = "driver";
      } else if (reportId === "billing-report") {
        blob =
          format === "xlsx"
            ? await generateBillingRevenueExcel(
                filteredBillingPayments,
                filteredBillingPayouts,
                exportContext,
              )
            : await generateBillingRevenuePdf(
                filteredBillingPayments,
                filteredBillingPayouts,
                exportContext,
              );
        filename = `Suprah_AI_Billings_Revenue_${safePeriodLabel}.${extension}`;
        category = "billings";
      } else if (reportId === "lead-status-report") {
        blob =
          format === "xlsx"
            ? await generateLeadStatusExcel(
                filteredLeadStatus,
                exportContext,
              )
            : await generateLeadStatusPdf(
                filteredLeadStatus,
                exportContext,
              );
        filename = `Suprah_AI_Lead_Status_${safePeriodLabel}.${extension}`;
        category = "crm";
      } else if (reportId === "lead-source-report") {
        blob =
          format === "xlsx"
            ? await generateLeadSourceExcel(
                filteredLeadSource,
                exportContext,
              )
            : await generateLeadSourcePdf(
                filteredLeadSource,
                exportContext,
              );
        filename = `Suprah_AI_Lead_Source_${safePeriodLabel}.${extension}`;
        category = "crm";
      }

      if (blob) {
        await saveGeneratedReportFile({
          name: filename,
          category,
          type: format === "xlsx" ? "XLSX" : "PDF",
          blob,
        });

        createBrowserDownload(blob, filename);

        toast.success(
          `${format === "xlsx" ? "Excel workbook" : "PDF report"} downloaded and saved to Generated Files`,
        );
      }
    } catch (err) {
      console.error(err);
      toast.error(
        `Failed to generate ${format === "xlsx" ? "Excel" : "PDF"} report`,
      );
    } finally {
      setDownloading(null);
    }
  };

  const bulkDownload = async (
    format: ExportFormat,
    reportIds?: ReportId[],
  ) => {
    const picks: ReportId[] = reportIds ?? Array.from(selected);
    if (picks.length === 0) return;

    await toast.promise(
      (async () => {
        for (const id of picks) {
          await downloadReport(id, format);
        }
      })(),
      {
        loading: `Generating ${picks.length} ${format === "xlsx" ? "Excel" : "PDF"} report${picks.length === 1 ? "" : "s"}...`,
        success: `All ${format === "xlsx" ? "Excel" : "PDF"} reports generated successfully`,
        error: "Some reports failed to generate",
      },
    );
  };

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen min-w-0 bg-background text-foreground pb-[calc(5.5rem+env(safe-area-inset-bottom))] 2xl:pb-5">
      <div
        aria-label="Report period controls"
        className={`fixed right-2 top-[calc(4.5rem+env(safe-area-inset-top))] z-[60] flex max-w-[calc(100vw-1rem)] flex-col items-end gap-2 transition-all duration-200 min-[430px]:right-3 sm:right-4 lg:right-4 lg:top-[calc(4rem+env(safe-area-inset-top))] xl:right-6 ${
          isPeriodControlOpen
            ? "opacity-100"
            : "opacity-85 hover:opacity-100"
        }`}
      >
        <button
          type="button"
          onClick={() =>
            setIsPeriodControlExpanded((value) => !value)
          }
          className={`inline-flex items-center justify-center rounded-xl border bg-background/95 text-foreground shadow-lg backdrop-blur-xl transition-all duration-200 hover:border-primary/45 hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 ${
            isPeriodControlOpen
              ? "h-10 gap-2 border-primary/30 px-3"
              : "size-11 border-primary/20 px-0"
          } ${
            periodControlAttention
              ? "border-primary ring-4 ring-primary/25"
              : ""
          }`}
          aria-expanded={isPeriodControlOpen}
          aria-controls="report-period-panel"
          aria-label={
            isPeriodControlOpen
              ? "Collapse report period controls"
              : "Expand report period controls"
          }
          title={
            isPeriodControlOpen
              ? "Collapse report period controls"
              : `Choose report period: ${monthLabel}`
          }
        >
          <span
            className={`flex items-center justify-center rounded-lg bg-primary/10 text-primary transition-all duration-200 ${
              isPeriodControlOpen ? "size-7" : "size-8"
            }`}
          >
            <Calendar
              className={isPeriodControlOpen ? "size-4" : "size-[18px]"}
              aria-hidden="true"
            />
          </span>

          {isPeriodControlOpen ? (
            <>
              <span className="max-w-56 truncate text-sm font-semibold">
                {monthLabel}
              </span>
              <ChevronUp className="size-4 text-muted-foreground" />
            </>
          ) : null}
        </button>

        {isPeriodControlOpen ? (
          <div
            ref={periodControlRef}
            id="report-period-panel"
            tabIndex={-1}
            className={`w-[min(34rem,calc(100vw-1rem))] rounded-2xl border bg-background/98 p-3 shadow-2xl backdrop-blur-xl outline-none animate-in fade-in-0 zoom-in-95 duration-150 ${
              periodControlAttention
                ? "border-primary ring-4 ring-primary/20"
                : "border-border/80"
            }`}
          >
            {periodControlAttention ? (
              <div
                role="status"
                aria-live="polite"
                className="mb-3 flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-sm font-semibold text-foreground"
              >
                <Calendar className="size-4 shrink-0 text-primary" />
                Choose the reporting period here.
              </div>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1.5">
                <span className="block text-xs font-bold text-foreground">
                  Reporting period
                </span>
                <Select
                  value={sharedPeriod.period}
                  onValueChange={handleMainPeriodChange}
                >
                  <SelectTrigger className="h-10 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent
                    position="popper"
                    align="end"
                    className="border-border bg-popover text-popover-foreground shadow-xl"
                  >
                    {ALL_REPORT_PERIODS.map((period) => (
                      <SelectItem key={period} value={period}>
                        {PERIOD_LABELS[period]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>

              {sharedPeriod.period !== "all" &&
              sharedPeriod.period !== "custom" ? (
                <label className="space-y-1.5">
                  <span className="block text-xs font-bold text-foreground">
                    Reference date
                  </span>
                  <input
                    type="date"
                    value={sharedPeriod.referenceDate}
                    onChange={(event) =>
                      updateSharedPeriod({
                        referenceDate: event.target.value,
                      })
                    }
                    className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </label>
              ) : null}
            </div>

            {sharedPeriod.period === "custom" ? (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="space-y-1.5">
                  <span className="block text-xs font-bold text-foreground">
                    From date
                  </span>
                  <input
                    ref={mainCustomFromRef}
                    type="date"
                    value={sharedPeriod.dateRange.from ?? ""}
                    max={sharedPeriod.dateRange.to}
                    onChange={(event) =>
                      updateSharedPeriod({
                        dateRange: {
                          ...sharedPeriod.dateRange,
                          from: event.target.value || undefined,
                        },
                      })
                    }
                    className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </label>

                <label className="space-y-1.5">
                  <span className="block text-xs font-bold text-foreground">
                    To date
                  </span>
                  <input
                    type="date"
                    value={sharedPeriod.dateRange.to ?? ""}
                    min={sharedPeriod.dateRange.from}
                    onChange={(event) =>
                      updateSharedPeriod({
                        dateRange: {
                          ...sharedPeriod.dateRange,
                          to: event.target.value || undefined,
                        },
                      })
                    }
                    className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </label>
              </div>
            ) : null}

            <p className="mt-3 text-xs font-medium leading-5 text-slate-600 dark:text-slate-300">
              The selected period is used by the overview, report cards, analytics, previews, PDF files, and Excel files.
            </p>
          </div>
        ) : null}
      </div>

      <div className="sticky top-0 z-30 border-b border-border/70 bg-background/95 pt-14 backdrop-blur-xl lg:pt-0">
        <div className="mx-auto w-full max-w-[1880px] px-3 py-2.5 sm:px-4 sm:py-3 lg:pr-20 xl:px-5 xl:pr-24">
          <div className="flex min-w-0 items-center">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
                <Sparkles className="size-4.5" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h1 className="truncate text-base font-bold tracking-tight text-foreground sm:text-xl">
                    Suprah AI Reports
                  </h1>
                  <span className="hidden rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary sm:inline-flex">
                    Local Workspace
                  </span>
                </div>
                <p className="hidden text-sm leading-relaxed text-slate-600 dark:text-slate-300 sm:block">
                  Open a report, review the details, and download a copy for your team.
                </p>
              </div>
            </div>

          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-[1880px] min-w-0 space-y-4 px-3 py-3 sm:px-4 sm:py-4 xl:px-5">
        <section aria-label="Reporting overview" className="min-w-0 space-y-3.5">
          <div className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-[1.65rem]">
                Reporting Overview
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                {hasPreviousComparison
                  ? `Key results for ${monthLabel}, compared with ${previousPeriodLabel}.`
                  : `Key results for ${monthLabel}. An earlier comparison is not available.`}
              </p>
            </div>
          </div>

          <div className="grid min-w-0 items-stretch gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(100%,13.5rem),1fr))]">
            <StatBox
              label="Revenue Collected"
              value={formatCurrency(revenueTotal)}
              sub={`${succeededPayments} successful payment${succeededPayments === 1 ? "" : "s"}`}
              icon={DollarSign}
              color="text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/40"
              accentClass="bg-violet-500"
              trend={displayTrend(revenueTotal, previousRevenueTotal)}
              emphasis
            />
            <StatBox
              label="Net Position"
              value={formatCurrency(netRevenue)}
              sub="Collected revenue less paid driver costs"
              icon={WalletCards}
              color="text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/40"
              accentClass="bg-violet-500"
              trend={displayTrend(netRevenue, previousNetRevenue)}
              emphasis
            />
            <StatBox
              label="Delivered Loads"
              value={deliveredLoads}
              sub={`${Math.round(deliveryRate)}% delivery rate`}
              icon={CheckSquare}
              color="text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40"
              accentClass="bg-emerald-500"
              trend={displayTrend(deliveredLoads, previousDeliveredLoads)}
            />
            <StatBox
              label="Total Loads"
              value={totalLoads}
              sub="Loads in selected period"
              icon={Truck}
              color="text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40"
              accentClass="bg-blue-500"
              trend={displayTrend(totalLoads, previousTotalLoads)}
            />
            <StatBox
              label="Paid Driver Costs"
              value={formatCurrency(payoutTotal)}
              sub="Completed driver payouts"
              icon={Users}
              color="text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40"
              accentClass="bg-amber-500"
              trend={displayTrend(payoutTotal, previousPayoutTotal)}
              inverseTrend
            />
          </div>

          {!isInitialLoading && !hasSelectedPeriodData ? (
            <div className="rounded-2xl border border-amber-500/60 bg-amber-50 p-4 shadow-sm dark:border-amber-400/35 dark:bg-amber-950/35 sm:p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Database className="size-5 shrink-0 text-amber-700 dark:text-amber-300" />
                    <h3 className="text-base font-extrabold text-slate-950 dark:text-amber-50 sm:text-lg">
                      No report data available for the selected period
                    </h3>
                  </div>
                  <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-slate-800 dark:text-slate-200">
                    The report cards and charts are ready, but no matching records were found for {monthLabel}. Refresh the data or choose a different reporting period to continue.
                  </p>
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="gap-2 border-slate-300 bg-white font-semibold text-slate-900 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
                    onClick={() => fetchData()}
                    disabled={isRefreshing}
                  >
                    <RefreshCw className={`size-4 ${isRefreshing ? "animate-spin" : ""}`} />
                    Refresh
                  </Button>
                  <Button
                    type="button"
                    className="gap-2 bg-emerald-600 font-semibold text-white hover:bg-emerald-700 dark:bg-emerald-500 dark:text-slate-950 dark:hover:bg-emerald-400"
                    onClick={openPeriodControl}
                  >
                    <Calendar className="size-4" />
                    Change Date Range
                  </Button>
                </div>
              </div>
            </div>
          ) : null}
        </section>

        <RecentReports />

        <div className="min-w-0">
          <main className="w-full min-w-0 space-y-3.5">
            <div className="flex min-w-0 flex-wrap items-end justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-bold tracking-tight text-foreground sm:text-xl">
                  {activeTab === "ALL" ? "Available Reports" : activeTab}
                </h2>
                <p className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                  Choose a report to review dealership activity, adjust the date range, and download the results.
                </p>
              </div>

              <div className="flex max-w-full flex-wrap items-center justify-start gap-2 sm:justify-end">
                <Button
                  variant={isMultiSelectMode ? "secondary" : "outline"}
                  size="sm"
                  className="h-9 gap-2 rounded-lg px-3 text-xs font-semibold sm:text-sm"
                  onClick={startMultiSelect}
                >
                  <CheckSquare className="size-3.5" />
                  {isMultiSelectMode ? "Cancel Select" : "Select Multiple"}
                </Button>

                {!isMultiSelectMode && (
                  <ReportExportMenu
                    label="Export"
                    onDownload={(format) =>
                      bulkDownload(format, visibleReportIds)
                    }
                    isDownloading={!!downloading}
                  />
                )}

                {isMultiSelectMode && selected.size > 0 && (
                  <ReportExportMenu
                    label="Export"
                    selectedCount={selected.size}
                    onDownload={(format) => bulkDownload(format)}
                    isDownloading={!!downloading}
                  />
                )}
              </div>
            </div>

            <div className="mx-auto grid w-full max-w-[1480px] min-w-0 grid-cols-1 items-stretch gap-3 md:grid-cols-6">
              {(activeTab === "ALL" || activeTab === "Transportation") && (
                <>
                  <ReportCard
                    className={getReportCardLayoutClass("load-report")}
                    title="Unified Load Report"
                    subtitle="Vehicle Delivery Overview"
                    description="Track vehicle deliveries, routes, assigned drivers, mileage, and transport costs in one place."
                    category="Logistics"
                    categoryClass="text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/40"
                    period={reportPeriodLabels["load-report"]}
                    trend={displayRateTrend(loadSummary.onTimeRate, previousLoadSummary.onTimeRate)}
                    stats={[
                      {
                        icon: <Truck className="size-4" />,
                        label: `${filteredLoads.length} load${filteredLoads.length === 1 ? "" : "s"}`,
                      },
                      {
                        icon: <Database className="size-4" />,
                        label: "Current Report Data",
                      },
                    ]}
                    highlights={[
                      {
                        label: "Delivery Rate",
                        value: `${loadSummary.onTimeRate}%`,
                        color: "text-emerald-600 dark:text-emerald-400",
                      },
                      {
                        label: "Total Load Value",
                        value: transportFmtCurrency(loadSummary.totalRate),
                        color: "text-foreground",
                      },
                    ]}
                    isSelected={selected.has("load-report")}
                    selectionMode={isMultiSelectMode}
                    isDownloading={downloading === "load-report"}
                    onToggle={() => toggleSelect("load-report")}
                    onDownload={(format) => downloadReport("load-report", format)}
                    onOpen={() => openReportWorkspace("load-report")}
                    onPreview={() => setTransportPreview("load")}
                  />
                  <ReportCard
                    className={getReportCardLayoutClass("quote-report")}
                    title="Quotes & Drafts"
                    subtitle="Customer Quote Activity"
                    description="Review customer quote requests, bookings, quoted prices, and sales progress."
                    category="Transportation"
                    categoryClass="text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-950/40"
                    period={reportPeriodLabels["quote-report"]}
                    trend={displayRateTrend(quoteSummary.conversionRate, previousQuoteSummary.conversionRate)}
                    stats={[
                      {
                        icon: <FileText className="size-4" />,
                        label: `${filteredQuotes.length} customer quote${filteredQuotes.length === 1 ? "" : "s"}`,
                      },
                      {
                        icon: <Users className="size-4" />,
                        label: "Customer Requests",
                      },
                    ]}
                    highlights={[
                      {
                        label: "Booking Rate",
                        value: `${quoteSummary.conversionRate}%`,
                        color: "text-amber-600 dark:text-amber-400",
                      },
                      {
                        label: "Average Quote",
                        value: transportFmtCurrency(quoteSummary.avgRate),
                        color: "text-foreground",
                      },
                    ]}
                    isSelected={selected.has("quote-report")}
                    selectionMode={isMultiSelectMode}
                    isDownloading={downloading === "quote-report"}
                    onToggle={() => toggleSelect("quote-report")}
                    onDownload={(format) => downloadReport("quote-report", format)}
                    onOpen={() => openReportWorkspace("quote-report")}
                    onPreview={() => setTransportPreview("quote")}
                  />
                </>
              )}
              {(activeTab === "ALL" || activeTab === "CRM") && (
                <ReportCard
                  className={getReportCardLayoutClass("lead-status-report")}
                  title="Lead Status Report"
                  subtitle="Lead Follow-up Overview"
                  description="See which customer leads are new, being contacted, scheduled, waiting for follow-up, or completed."
                  category="CRM & Leads"
                  categoryClass="text-cyan-600 dark:text-cyan-400 border-cyan-200 dark:border-cyan-500/30 bg-cyan-50 dark:bg-cyan-950/40"
                  period={reportPeriodLabels["lead-status-report"]}
                  trend={displayTrend(leadStats.total, previousLeadStats.total)}
                  stats={[
                    {
                      icon: <Users className="size-4" />,
                      label: `${leadStats.total} lead${leadStats.total === 1 ? "" : "s"}`,
                    },
                    {
                      icon: <Calendar className="size-4" />,
                      label: `${leadStats.appointment} scheduled`,
                    },
                  ]}
                  highlights={[
                    {
                      label: "Completed Leads",
                      value: leadStats.closed,
                      color: "text-emerald-600 dark:text-emerald-400",
                    },
                    {
                      label: "Needs Follow-up",
                      value: leadStats.pending,
                      color: "text-amber-600 dark:text-amber-400",
                    },
                  ]}
                  isSelected={selected.has("lead-status-report")}
                  selectionMode={isMultiSelectMode}
                  isDownloading={downloading === "lead-status-report"}
                  onToggle={() => toggleSelect("lead-status-report")}
                  onDownload={(format) => downloadReport("lead-status-report", format)}
                  onOpen={() => openReportWorkspace("lead-status-report")}
                  onPreview={() => setCrmPreview("lead-status")}
                />
              )}

              {(activeTab === "ALL" || activeTab === "CRM") && (
                <ReportCard
                  className={getReportCardLayoutClass("lead-source-report")}
                  title="Lead Source Report"
                  subtitle="Customer Inquiry Sources"
                  description="See which websites, referrals, and sales channels are bringing customer inquiries to the dealership."
                  category="CRM & Leads"
                  categoryClass="text-cyan-600 dark:text-cyan-400 border-cyan-200 dark:border-cyan-500/30 bg-cyan-50 dark:bg-cyan-950/40"
                  period={reportPeriodLabels["lead-source-report"]}
                  trend={displayTrend(leadSourceStats.total, previousLeadSourceStats.total)}
                  stats={[
                    {
                      icon: <Users className="size-4" />,
                      label: `${leadSourceStats.total} lead${leadSourceStats.total === 1 ? "" : "s"}`,
                    },
                    {
                      icon: <Database className="size-4" />,
                      label: `${leadSourceStats.uniqueSources} lead source${leadSourceStats.uniqueSources === 1 ? "" : "s"}`,
                    },
                  ]}
                  highlights={[
                    {
                      label: "Leading Source",
                      value: leadSourceStats.topSource,
                      color: "text-cyan-600 dark:text-cyan-400",
                    },
                    {
                      label: "Leads from Top Source",
                      value: leadSourceStats.topSourceCount,
                      color: "text-foreground",
                    },
                  ]}
                  isSelected={selected.has("lead-source-report")}
                  selectionMode={isMultiSelectMode}
                  isDownloading={downloading === "lead-source-report"}
                  onToggle={() => toggleSelect("lead-source-report")}
                  onDownload={(format) => downloadReport("lead-source-report", format)}
                  onOpen={() => openReportWorkspace("lead-source-report")}
                  onPreview={() => setCrmPreview("lead-source")}
                />
              )}

              {(activeTab === "ALL" || activeTab === "Driver Reports") && (
                <ReportCard
                  className={getReportCardLayoutClass("driver-report")}
                  title="Driver Performance"
                  subtitle="Driver Delivery Results"
                  description="Compare assigned deliveries, completed loads, proof of delivery, and driver payments."
                  category="Operations"
                  categoryClass="text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-500/30 bg-blue-50 dark:bg-blue-950/40"
                  period={reportPeriodLabels["driver-report"]}
                  trend={displayTrend(driverPayoutTotal, previousDriverPayoutTotal)}
                  stats={[
                    { icon: <Truck className="size-4" />, label: "All Drivers" },
                    {
                      icon: <CheckSquare className="size-4" />,
                      label: `${driverAssignedLoads.length} assigned load${driverAssignedLoads.length === 1 ? "" : "s"}`,
                    },
                  ]}
                  highlights={[
                    {
                      label: "Delivery Completion",
                      value: `${driverDeliveryRate}%`,
                      color: "text-blue-600 dark:text-blue-400",
                    },
                    {
                      label: "Driver Payments",
                      value: formatCurrency(driverPayoutTotal),
                      color: "text-foreground",
                    },
                  ]}
                  isSelected={selected.has("driver-report")}
                  selectionMode={isMultiSelectMode}
                  isDownloading={downloading === "driver-report"}
                  onToggle={() => toggleSelect("driver-report")}
                  onDownload={(format) => downloadReport("driver-report", format)}
                  onOpen={() => openReportWorkspace("driver-report")}
                  onPreview={() => setPreviewType("DRIVER")}
                />
              )}

              {(activeTab === "ALL" || activeTab === "Billings") && (
                <ReportCard
                  className={getReportCardLayoutClass("billing-report")}
                  title="Billings & Revenue"
                  subtitle="Payments and Costs"
                  description="Review customer payments, driver costs, refunds, and the revenue remaining after expenses."
                  category="Finance"
                  categoryClass="text-violet-600 dark:text-violet-400 border-violet-200 dark:border-violet-500/30 bg-violet-50 dark:bg-violet-950/40"
                  period={reportPeriodLabels["billing-report"]}
                  trend={displayTrend(revenueTotal, previousRevenueTotal)}
                  stats={[
                    {
                      icon: <CreditCard className="size-4" />,
                      label: "Payment Records",
                    },
                    {
                      icon: <Search className="size-4" />,
                      label: "Ready to Review",
                    },
                  ]}
                  highlights={[
                    {
                      label: "Payments Collected",
                      value: formatCurrency(revenueTotal),
                      color: "text-violet-600 dark:text-violet-400",
                    },
                    {
                      label: "Payment Records",
                      value: filteredBillingPayments.length,
                      color: "text-foreground",
                    },
                  ]}
                  isSelected={selected.has("billing-report")}
                  selectionMode={isMultiSelectMode}
                  isDownloading={downloading === "billing-report"}
                  onToggle={() => toggleSelect("billing-report")}
                  onDownload={(format) => downloadReport("billing-report", format)}
                  onOpen={() => openReportWorkspace("billing-report")}
                  onPreview={() => setPreviewType("BILLING")}
                />
              )}
            </div>


            {(activeTab === "ALL" || activeTab === "Transportation") && (
              <section className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-sm">
                <button onClick={() => setShowTransportationAnalytics((value) => !value)} className="flex w-full items-center justify-between gap-4 px-4 py-3.5 text-left transition-colors hover:bg-muted/35 sm:px-5 sm:py-4">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-foreground sm:text-base">Transportation Analytics</p>
                    <p className="mt-1 break-words text-sm font-medium leading-6 text-slate-700 dark:text-slate-300">
                      {filteredLoads.length} loads · {filteredQuotes.length} quotes · {deliveredLoads} delivered · {Math.round(deliveryRate)}% delivery rate
                    </p>
                  </div>
                  {showTransportationAnalytics ? <ChevronUp className="size-5 text-primary" /> : <ChevronDown className="size-5 text-muted-foreground" />}
                </button>
                {showTransportationAnalytics && <div className="min-w-0 overflow-x-auto border-t border-border/70 p-3 sm:p-4 lg:p-5"><TransportationAnalytics
                  loads={filteredLoads}
                  quotes={filteredQuotes}
                  rawLoads={rawLoads}
                  rawQuotes={rawQuotes}
                  monthLabel={monthLabel}
                /></div>}
              </section>
            )}

            <section className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-sm">
              <button onClick={() => setShowOperationalAnalytics((value) => !value)} className="flex w-full items-center justify-between gap-4 px-4 py-3.5 text-left transition-colors hover:bg-muted/35 sm:px-5 sm:py-4">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-foreground sm:text-base">Operational Analytics</p>
                  <p className="mt-1 break-words text-sm font-medium leading-6 text-slate-700 dark:text-slate-300">
                    {formatCurrency(revenueTotal)} collected · {formatCurrency(netRevenue)} after driver costs · {succeededPayments} successful · {pendingPayments} pending
                  </p>
                </div>
                {showOperationalAnalytics ? <ChevronUp className="size-5 text-primary" /> : <ChevronDown className="size-5 text-muted-foreground" />}
              </button>
              {showOperationalAnalytics && <div className="min-w-0 overflow-x-auto border-t border-border/70 p-3 sm:p-4 lg:p-5"><ReportsAnalytics
                loads={filteredLoads}
                rawPayments={rawPayments}
                monthLabel={monthLabel}
              /></div>}
            </section>

            {(activeTab === "ALL" || activeTab === "CRM") && (
              <section className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-sm">
                <button
                  type="button"
                  onClick={() => setShowLeadAnalytics((value) => !value)}
                  className="flex w-full items-center justify-between gap-4 px-4 py-3.5 text-left transition-colors hover:bg-muted/35 sm:px-5 sm:py-4"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-foreground sm:text-base">
                      Lead & Customer Inquiry Analytics
                    </p>
                    <p className="mt-1 break-words text-sm font-medium leading-6 text-slate-700 dark:text-slate-300">
                      {leadStats.total} customer leads · {leadStats.appointment} scheduled follow-ups · leading source: {leadSourceStats.topSource}
                    </p>
                  </div>
                  {showLeadAnalytics ? (
                    <ChevronUp className="size-5 text-primary" />
                  ) : (
                    <ChevronDown className="size-5 text-muted-foreground" />
                  )}
                </button>
                {showLeadAnalytics ? (
                  <div className="min-w-0 overflow-x-auto border-t border-border/70 p-3 sm:p-4 lg:p-5">
                    <LeadAnalyticsOverview
                      leads={filteredLeadStatus}
                      rawLeads={rawLeads}
                      monthLabel={monthLabel}
                      referenceDate={analyticsReferenceDate}
                    />
                  </div>
                ) : null}
              </section>
            )}
          </main>
        </div>
      </div>

      {selected.size > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 px-3 pb-[calc(.75rem+env(safe-area-inset-bottom))] pt-3 shadow-2xl backdrop-blur-xl 2xl:hidden">
          <div className="mx-auto flex max-w-lg items-center gap-3"><div className="min-w-0 flex-1"><p className="text-sm font-bold text-foreground">{selected.size} report{selected.size === 1 ? "" : "s"} selected</p><p className="truncate text-xs text-muted-foreground">
                  {isMultiSelectMode
                    ? selected.size > 0
                      ? "Export only the selected reports"
                      : "Tap report cards to select them"
                    : "Ready to generate and save"}
                </p></div><ReportExportMenu
  label="Export"
  selectedCount={selected.size}
  size="default"
  menuAlign="right"
  onDownload={(format) => bulkDownload(format)}
  isDownloading={!!downloading}
/></div>
        </div>
      )}

      {/* ── Modals & Previews ── */}
      <TransportationPreviewModal
        open={!!transportPreview}
        onClose={() => setTransportPreview(null)}
        reportType={transportPreview ?? "load"}
        loads={filteredLoads}
        quotes={filteredQuotes}
        monthLabel={
          transportPreview === "quote"
            ? reportPeriodLabels["quote-report"]
            : reportPeriodLabels["load-report"]
        }
        isDownloading={
          downloading === "load-report" ||
          downloading === "quote-report"
        }
        onDownload={(format) =>
          downloadReport(
            transportPreview === "load"
              ? "load-report"
              : "quote-report",
            format,
          )
        }
      />

      <CRMPreviewModal
        open={crmPreview !== null}
        onClose={() => setCrmPreview(null)}
        reportType={crmPreview ?? "lead-status"}
        leads={
          crmPreview === "lead-source"
            ? filteredLeadSource
            : filteredLeadStatus
        }
        monthLabel={
          crmPreview === "lead-source"
            ? reportPeriodLabels["lead-source-report"]
            : reportPeriodLabels["lead-status-report"]
        }
        isDownloading={
          downloading === "lead-status-report" ||
          downloading === "lead-source-report"
        }
        onDownload={(format) => {
          if (crmPreview === "lead-status") {
            downloadReport("lead-status-report", format);
          } else if (crmPreview === "lead-source") {
            downloadReport("lead-source-report", format);
          }
        }}
      />

      <ReportPreviewModal
        open={!!previewType}
        onClose={() => setPreviewType(null)}
        reportType={
          previewType?.toLowerCase() as "driver" | "billing"
        }
        loads={
          previewType === "DRIVER" ? filteredDriverLoads : []
        }
        payments={filteredBillingPayments}
        payouts={
          previewType === "DRIVER"
            ? filteredDriverPayouts
            : filteredBillingPayouts
        }
        monthLabel={
          previewType === "DRIVER"
            ? reportPeriodLabels["driver-report"]
            : reportPeriodLabels["billing-report"]
        }
        isDownloading={
          downloading ===
          (previewType === "DRIVER"
            ? "driver-report"
            : "billing-report")
        }
        onDownload={(format) => {
          if (previewType === "DRIVER") {
            downloadReport("driver-report", format);
          } else if (previewType === "BILLING") {
            downloadReport("billing-report", format);
          }
        }}
      />
    </div>
  );
}


function StatBox({
  label,
  value,
  sub,
  icon: Icon,
  color,
  accentClass,
  trend,
  emphasis = false,
  inverseTrend = false,
}: {
  label: string;
  value: string | number;
  sub: string;
  icon: any;
  color: string;
  accentClass: string;
  trend: TrendInfo;
  emphasis?: boolean;
  inverseTrend?: boolean;
}) {
  const isPositive = inverseTrend
    ? trend.direction === "down"
    : trend.direction === "up";
  const isNegative = inverseTrend
    ? trend.direction === "up"
    : trend.direction === "down";

  const TrendIcon =
    trend.direction === "up"
      ? ArrowUpRight
      : trend.direction === "down"
        ? ArrowDownRight
        : Minus;

  return (
    <div
      className={`group relative grid min-h-[168px] min-w-0 grid-rows-[auto_auto_1fr_auto] overflow-hidden rounded-xl border bg-card p-4 pt-5 shadow-sm transition-colors hover:border-primary/30 ${
        emphasis
          ? "border-primary/25 bg-linear-to-br from-primary/[0.05] via-card to-card"
          : "border-border/80"
      }`}
    >
      <div
        aria-hidden="true"
        className={`absolute inset-x-0 top-0 h-[3px] rounded-t-xl ${accentClass}`}
      />

      <div className="flex min-w-0 items-start gap-3">
        <div className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${color}`}>
          <Icon className="size-5" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-1.5">
            <div className="min-w-0">
              <p className="min-h-[1rem] break-words text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                {label}
              </p>
              <p className="mt-2 min-h-[2rem] break-words text-2xl font-bold leading-none tracking-tight text-foreground sm:text-[1.9rem]">
                {value}
              </p>
            </div>
            {emphasis && (
              <span className="shrink-0 rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-primary">
                Key
              </span>
            )}
          </div>

          <p className="mt-2 min-h-[2.5rem] break-words text-sm leading-6 text-slate-700 dark:text-slate-300" title={sub}>
            {sub}
          </p>

          <div
            className={`flex min-w-0 items-start gap-1.5 pt-3 text-xs font-semibold ${
              isPositive
                ? "text-emerald-600 dark:text-emerald-400"
                : isNegative
                  ? "text-red-600 dark:text-red-400"
                  : "text-muted-foreground"
            }`}
          >
            <TrendIcon className="mt-0.5 size-3.5 shrink-0" />
            <span className="min-w-0 break-words leading-snug">{trend.label}</span>
          </div>
        </div>
      </div>
    </div>
  );
}