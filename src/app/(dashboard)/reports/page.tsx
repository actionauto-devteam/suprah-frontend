"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
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
  createDefaultFiltersByReport,
  REPORT_LABELS,
  type ReportId,
} from "@/types/report-filters";
import {
  filterLeads,
  filterLoads,
  filterPayments,
  filterPayouts,
  filterQuotes,
  getReportPeriodLabel,
} from "@/lib/report-filter-engine";
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

function getTrend(current: number, previous: number, suffix = "vs previous month"): TrendInfo {
  if (current === previous) {
    return { label: `No change ${suffix}`, direction: "flat" };
  }

  if (previous === 0) {
    return current > 0
      ? { label: `New activity ${suffix}`, direction: "up" }
      : { label: `No activity ${suffix}`, direction: "flat" };
  }

  const change = Math.round(((current - previous) / Math.abs(previous)) * 100);
  return {
    label: `${change > 0 ? "+" : ""}${change}% ${suffix}`,
    direction: change > 0 ? "up" : "down",
  };
}

function getRateTrend(current: number, previous: number): TrendInfo {
  const difference = Math.round((current - previous) * 10) / 10;

  if (difference === 0) {
    return { label: "No change vs previous month", direction: "flat" };
  }

  return {
    label: `${difference > 0 ? "+" : ""}${difference} pts vs previous month`,
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

export default function ReportsPage() {
  const { getToken } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = React.useState<TabValue>("ALL");
  const [selectedMonth, setSelectedMonth] = React.useState(
    new Date().getMonth(),
  );
  const [selectedYear, setSelectedYear] = React.useState(
    new Date().getFullYear(),
  );
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [isPeriodControlExpanded, setIsPeriodControlExpanded] =
    React.useState(false);

  const isPeriodControlOpen = isPeriodControlExpanded;

  const [reportData, setReportData] = React.useState<ReportData | null>(null);
  const [previousReportData, setPreviousReportData] = React.useState<ReportData | null>(null);
  const [rawLoads, setRawLoads] = React.useState<Load[]>([]);
  const [rawQuotes, setRawQuotes] = React.useState<TransportQuote[]>([]);
  const [rawPayments, setRawPayments] = React.useState<Payment[]>([]);
  const [rawPayouts, setRawPayouts] = React.useState<DriverPayout[]>([]);
  const [rawLeads, setRawLeads] = React.useState<Lead[]>([]);

  const [filtersByReport, setFiltersByReport] = React.useState(() =>
    createDefaultFiltersByReport(
      new Date(selectedYear, selectedMonth, 1),
    ),
  );

  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [isMultiSelectMode, setIsMultiSelectMode] = React.useState(false);
  const [downloading, setDownloading] = React.useState<string | null>(null);
  const [showTransportationAnalytics, setShowTransportationAnalytics] = React.useState(true);
  const [showOperationalAnalytics, setShowOperationalAnalytics] = React.useState(true);

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
      const month = selectedMonth + 1;
      const previousPeriod = new Date(selectedYear, selectedMonth - 1, 1);
      const previousMonth = previousPeriod.getMonth() + 1;
      const previousYear = previousPeriod.getFullYear();

      const reportQuery = `report=true&month=${month}&year=${selectedYear}&limit=5000`;
      const previousReportQuery = `report=true&month=${previousMonth}&year=${previousYear}&limit=5000`;

      const [
        lRes,
        allLoadsRes,
        qRes,
        pRes,
        allPaymentsRes,
        payRes,
        allPayoutsRes,
        previousLoadsRes,
        previousPaymentsRes,
        previousPayoutsRes,
        allLeadsRes,
      ] = await Promise.all([
        apiClient.get(`/api/loads?${reportQuery}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        apiClient.get(`/api/loads?page=1&limit=5000`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        apiClient.get(`/api/quotes?page=1&limit=5000`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        apiClient.get(`/api/payments?${reportQuery}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        apiClient.get(`/api/payments?page=1&limit=5000`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        apiClient.get(`/api/driver-payouts?${reportQuery}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        apiClient.get(`/api/driver-payouts?page=1&limit=5000`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        apiClient.get(`/api/loads?${previousReportQuery}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        apiClient.get(`/api/payments?${previousReportQuery}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        apiClient.get(`/api/driver-payouts?${previousReportQuery}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        apiClient.get("/api/leads?page=1&limit=5000&sortBy=newest", {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const loadPayload = lRes.data?.data;
      const allLoadsPayload = allLoadsRes.data?.data;
      const paymentPayload = pRes.data?.data;
      const allPaymentsPayload = allPaymentsRes.data?.data;
      const payoutPayload = payRes.data?.data;
      const allPayoutPayload =
        allPayoutsRes.data?.data ?? allPayoutsRes.data;
      const previousLoadPayload = previousLoadsRes.data?.data;
      const previousPaymentPayload = previousPaymentsRes.data?.data;
      const previousPayoutPayload = previousPayoutsRes.data?.data;
      const leadPayload = allLeadsRes.data?.data;

      const loads = Array.isArray(loadPayload)
        ? loadPayload
        : Array.isArray(loadPayload?.loads)
          ? loadPayload.loads
          : [];

      const allLoads = Array.isArray(allLoadsPayload)
        ? allLoadsPayload
        : Array.isArray(allLoadsPayload?.loads)
          ? allLoadsPayload.loads
          : [];

      const payments = Array.isArray(paymentPayload)
        ? paymentPayload
        : Array.isArray(paymentPayload?.payments)
          ? paymentPayload.payments
          : [];

      const allPayments = Array.isArray(allPaymentsPayload)
        ? allPaymentsPayload
        : Array.isArray(allPaymentsPayload?.payments)
          ? allPaymentsPayload.payments
          : [];

      const payouts = Array.isArray(payoutPayload)
        ? payoutPayload
        : Array.isArray(payoutPayload?.payouts)
          ? payoutPayload.payouts
          : [];
      const allPayouts = Array.isArray(allPayoutPayload)
        ? allPayoutPayload
        : Array.isArray(allPayoutPayload?.payouts)
          ? allPayoutPayload.payouts
          : [];
      const quotes = Array.isArray(qRes.data?.data)
        ? qRes.data.data
        : Array.isArray(qRes.data?.data?.quotes)
          ? qRes.data.data.quotes
          : [];

      const previousLoads = Array.isArray(previousLoadPayload)
        ? previousLoadPayload
        : Array.isArray(previousLoadPayload?.loads)
          ? previousLoadPayload.loads
          : [];
      const previousPayments = Array.isArray(previousPaymentPayload)
        ? previousPaymentPayload
        : Array.isArray(previousPaymentPayload?.payments)
          ? previousPaymentPayload.payments
          : [];
      const previousPayouts = Array.isArray(previousPayoutPayload)
        ? previousPayoutPayload
        : Array.isArray(previousPayoutPayload?.payouts)
          ? previousPayoutPayload.payouts
          : [];
      const allLeads: Lead[] = Array.isArray(leadPayload)
        ? leadPayload
        : Array.isArray(leadPayload?.leads)
          ? leadPayload.leads
          : [];

      // Reuse the lead data that the overview already loaded when opening
      // Lead Status or Lead Source. This avoids a second large API request.
      writeLeadReportCache(allLeads);

      const isLeadInPeriod = (
        lead: Lead,
        targetMonth: number,
        targetYear: number,
      ): boolean => {
        const createdAt = new Date(lead.createdAt);

        if (Number.isNaN(createdAt.getTime())) {
          return false;
        }

        return (
          createdAt.getFullYear() === targetYear &&
          createdAt.getMonth() + 1 === targetMonth
        );
      };

      const leads = allLeads.filter((lead) =>
        isLeadInPeriod(lead, month, selectedYear),
      );

      const previousLeads = allLeads.filter((lead) =>
        isLeadInPeriod(lead, previousMonth, previousYear),
      );
      
      setReportData({
        loads,
        payments,
        payouts,
        leads,
      });
      setPreviousReportData({
        loads: previousLoads,
        payments: previousPayments,
        payouts: previousPayouts,
        leads: previousLeads,
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
  }, [getToken, selectedMonth, selectedYear]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  React.useEffect(() => {
    const referenceDate = `${selectedYear}-${String(
      selectedMonth + 1,
    ).padStart(2, "0")}-01`;

    setFiltersByReport((current) => {
      const next = { ...current };

      (Object.keys(next) as ReportId[]).forEach((reportId) => {
        next[reportId] = {
          ...next[reportId],
          referenceDate,
        };
      });

      return next;
    });
  }, [selectedMonth, selectedYear]);

  // ─── Filter Logic ───────────────────────────────────────────────────────────

  const monthLabel = `${MONTHS[selectedMonth]} ${selectedYear}`;
  const workspaceReferenceDate = `${selectedYear}-${String(
    selectedMonth + 1,
  ).padStart(2, "0")}-01`;
  const openReportWorkspace = React.useCallback(
    (reportId: ReportId) => {
      router.push(
        `/reports/${reportId}?referenceDate=${workspaceReferenceDate}`,
      );
    },
    [router, workspaceReferenceDate],
  );
  const previousPeriodDate = new Date(selectedYear, selectedMonth - 1, 1);
  const previousMonthLabel = `${MONTHS[previousPeriodDate.getMonth()]} ${previousPeriodDate.getFullYear()}`;

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

  const previousQuotes = React.useMemo(() => {
    const previousKey = `${previousPeriodDate.getFullYear()}-${String(
      previousPeriodDate.getMonth() + 1,
    ).padStart(2, "0")}`;

    return rawQuotes.filter((quote) => quote.createdAt?.startsWith(previousKey));
  }, [rawQuotes, previousPeriodDate]);

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

  const revenueTotal = billingSummary.revenueCollected;
  const payoutTotal = billingSummary.paidDriverCosts;

  const driverPayoutTotal = React.useMemo(
    () =>
      filteredDriverPayouts.reduce(
        (total, payout) => total + Number(payout.amount || 0),
        0,
      ),
    [filteredDriverPayouts],
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

  const previousBillingSummary = React.useMemo(
    () =>
      getBillingSummary(
        previousReportData?.payments || [],
        previousReportData?.payouts || [],
      ),
    [previousReportData?.payments, previousReportData?.payouts],
  );

  const previousRevenueTotal = previousBillingSummary.revenueCollected;
  const previousPayoutTotal = previousBillingSummary.paidDriverCosts;

  const previousDriverPayoutTotal = React.useMemo(
    () =>
      (previousReportData?.payouts || []).reduce(
        (total, payout) => total + Number(payout.amount || 0),
        0,
      ),
    [previousReportData?.payouts],
  );

  const deliveredLoads = filteredLoads.filter(
    (load) => load.status === "Delivered",
  ).length;
  const previousDeliveredLoads =
    previousReportData?.loads.filter((load) => load.status === "Delivered")
      .length || 0;
  const totalLoads = filteredLoads.length;
  const previousTotalLoads = previousReportData?.loads.length || 0;
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
    const leads = previousReportData?.leads ?? [];

    return {
      total: leads.length,
      new: leads.filter((lead) => lead.status === "New").length,
      contacted: leads.filter((lead) => lead.status === "Contacted").length,
      pending: leads.filter((lead) => lead.status === "Pending").length,
      appointment: leads.filter((lead) => Boolean(lead.appointment)).length,
      closed: leads.filter((lead) => lead.status === "Closed").length,
    };
  }, [previousReportData?.leads]);

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
    const leads = previousReportData?.leads ?? [];
    const sources = buildLeadSourceSummary(leads);

    return {
      total: leads.length,
      topSource: sources[0]?.source ?? "No source",
      topSourceCount: sources[0]?.count ?? 0,
      uniqueSources: sources.length,
      unknownCount: countUnknownSources(sources),
    };
  }, [previousReportData?.leads]);

  const previousLoadSummary = React.useMemo(
    () => buildLoadSummary(previousReportData?.loads || []),
    [previousReportData?.loads],
  );
  const previousQuoteSummary = React.useMemo(
    () => buildQuoteSummary(previousQuotes),
    [previousQuotes],
  );

  const succeededPayments = filteredBillingPayments.filter(
    (payment) => payment.status === "succeeded",
  ).length;
  const pendingPayments = filteredBillingPayments.filter((payment) =>
    ["pending", "processing"].includes(payment.status),
  ).length;

  // ─── Actions ────────────────────────────────────────────────────────────────

  const toggleSelect = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const visibleReportIds = React.useMemo(() => {
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

  const startMultiSelect = () => {
    setIsMultiSelectMode((current) => {
      const next = !current;

      if (!next) {
        setSelected(new Set());
      }

      return next;
    });
  };

  React.useEffect(() => {
    setSelected((current) => {
      const next = new Set(
        Array.from(current).filter((id) => visibleReportIds.includes(id)),
      );

      return next.size === current.size ? current : next;
    });

    setIsMultiSelectMode(false);
  }, [visibleReportIds]);

  const downloadReport = async (
    id: string,
    format: ExportFormat = "pdf",
  ) => {
    const reportId = id as ReportId;
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

    setDownloading(id);

    try {
      let blob: Blob | null = null;
      const extension = format === "xlsx" ? "xlsx" : "pdf";
      let filename = `Report_${id}_${safePeriodLabel}.${extension}`;
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
    reportIds?: string[],
  ) => {
    const picks = reportIds ?? Array.from(selected);
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
            : "opacity-80 hover:opacity-100"
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
              : `Choose report period: ${MONTHS[selectedMonth]} ${selectedYear}`
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

          {isPeriodControlOpen && (
            <>
              <span className="whitespace-nowrap text-sm font-semibold">
                {MONTHS[selectedMonth]} {selectedYear}
              </span>
              <ChevronUp className="size-4 text-muted-foreground" />
            </>
          )}
        </button>

        {isPeriodControlOpen && (
          <div
            id="report-period-panel"
            className="flex max-w-[calc(100vw-1rem)] items-center gap-2 rounded-2xl border border-border/80 bg-background/95 p-2 shadow-xl backdrop-blur-xl animate-in fade-in-0 zoom-in-95 duration-150"
          >
            <Select
              value={String(selectedMonth)}
              onValueChange={(value) =>
                setSelectedMonth(Number(value))
              }
            >
              <SelectTrigger
                size="sm"
                className="h-10 w-auto min-w-[7.5rem] max-w-[11rem] items-center rounded-xl border border-border bg-muted/50 px-3 text-left text-xs font-semibold leading-none shadow-none [&>span]:flex [&>span]:h-full [&>span]:items-center [&>span]:whitespace-nowrap focus:ring-0 min-[430px]:text-sm"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent
                position="popper"
                align="start"
                className="border-border bg-popover text-popover-foreground shadow-xl"
              >
                {MONTHS.map((month, index) => (
                  <SelectItem key={month} value={String(index)}>
                    {month}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={String(selectedYear)}
              onValueChange={(value) =>
                setSelectedYear(Number(value))
              }
            >
              <SelectTrigger
                size="sm"
                className="h-10 w-auto min-w-[5.5rem] items-center rounded-xl border border-border bg-muted/50 px-3 text-left text-xs font-semibold leading-none shadow-none [&>span]:flex [&>span]:h-full [&>span]:items-center [&>span]:whitespace-nowrap focus:ring-0 min-[430px]:text-sm"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent
                position="popper"
                align="end"
                className="min-w-22 border-border bg-popover text-popover-foreground shadow-xl"
              >
                {Array.from(
                  { length: 5 },
                  (_, index) => new Date().getFullYear() - 3 + index,
                ).map((year) => (
                  <SelectItem key={year} value={String(year)}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
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
                <p className="hidden text-xs text-muted-foreground sm:block">
                  Open focused report workspaces, review results, and export operational reports.
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
              <p className="mt-1 text-sm text-muted-foreground">
                Key results for {monthLabel}, compared with {previousMonthLabel}.
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
              trend={getTrend(revenueTotal, previousRevenueTotal)}
              emphasis
            />
            <StatBox
              label="Net Position"
              value={formatCurrency(netRevenue)}
              sub="Collected revenue less paid driver costs"
              icon={WalletCards}
              color="text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/40"
              accentClass="bg-violet-500"
              trend={getTrend(netRevenue, previousNetRevenue)}
              emphasis
            />
            <StatBox
              label="Delivered Loads"
              value={deliveredLoads}
              sub={`${Math.round(deliveryRate)}% delivery rate`}
              icon={CheckSquare}
              color="text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40"
              accentClass="bg-emerald-500"
              trend={getTrend(deliveredLoads, previousDeliveredLoads)}
            />
            <StatBox
              label="Total Loads"
              value={totalLoads}
              sub="Loads in selected period"
              icon={Truck}
              color="text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40"
              accentClass="bg-blue-500"
              trend={getTrend(totalLoads, previousTotalLoads)}
            />
            <StatBox
              label="Paid Driver Costs"
              value={formatCurrency(payoutTotal)}
              sub="Completed driver payouts"
              icon={Users}
              color="text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40"
              accentClass="bg-amber-500"
              trend={getTrend(payoutTotal, previousPayoutTotal)}
              inverseTrend
            />
          </div>
        </section>

        <RecentReports />

        <div className="min-w-0">
          <main className="w-full min-w-0 space-y-3.5">
            <div className="flex min-w-0 flex-wrap items-end justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-bold tracking-tight text-foreground sm:text-xl">
                  {activeTab === "ALL" ? "Available Reports" : activeTab}
                </h2>
                <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
                  Open a report to filter, review, save, share, and export its results
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

            <div className="grid min-w-0 items-stretch gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(100%,20rem),1fr))]">
              {(activeTab === "ALL" || activeTab === "Transportation") && (
                <>
                  <ReportCard
                    title="Unified Load Report"
                    subtitle="Logistics & Delivery"
                    description="Full delivery cycles, carrier payouts, and logistics efficiency tracking."
                    category="Logistics"
                    categoryClass="text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/40"
                    period={reportPeriodLabels["load-report"]}
                    trend={getRateTrend(loadSummary.onTimeRate, previousLoadSummary.onTimeRate)}
                    stats={[
                      {
                        icon: <Truck className="size-3" />,
                        label: `${filteredLoads.length} active`,
                      },
                      {
                        icon: <Database className="size-3" />,
                        label: "System Sync",
                      },
                    ]}
                    highlights={[
                      {
                        label: "Success Rate",
                        value: `${loadSummary.onTimeRate}%`,
                        color: "text-emerald-600 dark:text-emerald-400",
                      },
                      {
                        label: "Total Revenue",
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
                    onPreview={() => {
                      setTransportPreview("load");
                    }}
                  />
                  <ReportCard
                    title="Quotes & Drafts"
                    subtitle="Sales & Conversion"
                    description="Market quote history, conversion rates and pending logistics drafts."
                    category="Transportation"
                    categoryClass="text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-950/40"
                    period={reportPeriodLabels["quote-report"]}
                    trend={getRateTrend(quoteSummary.conversionRate, previousQuoteSummary.conversionRate)}
                    stats={[
                      {
                        icon: <FileText className="size-3" />,
                        label: `${filteredQuotes.length} quotes`,
                      },
                      {
                        icon: <Users className="size-3" />,
                        label: "Client Direct",
                      },
                    ]}
                    highlights={[
                      {
                        label: "Conv. Rate",
                        value: `${quoteSummary.conversionRate}%`,
                        color: "text-amber-600 dark:text-amber-400",
                      },
                      {
                        label: "Avg Rate",
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
                    onPreview={() => {
                      setTransportPreview("quote");
                    }}
                  />
                </>
              )}
              {(activeTab === "ALL" || activeTab === "CRM") && (
                <ReportCard
                  title="Lead Status Report"
                  subtitle="CRM Pipeline Overview"
                  description="A clear overview of lead volume, pipeline activity, appointments, and closed opportunities."
                  category="CRM & Leads"
                  categoryClass="text-cyan-600 dark:text-cyan-400 border-cyan-200 dark:border-cyan-500/30 bg-cyan-50 dark:bg-cyan-950/40"
                  period={reportPeriodLabels["lead-status-report"]}
                  trend={getTrend(leadStats.total, previousLeadStats.total)}
                  stats={[
                    {
                      icon: <Users className="size-3" />,
                      label: `${leadStats.total} lead${
                        leadStats.total === 1 ? "" : "s"
                      }`,
                    },
                    {
                      icon: <Calendar className="size-3" />,
                      label: `${leadStats.appointment} appointment${
                        leadStats.appointment === 1 ? "" : "s"
                      }`,
                    },
                  ]}
                  highlights={[
                    {
                      label: "Closed",
                      value: leadStats.closed,
                      color: "text-emerald-600 dark:text-emerald-400",
                    },
                    {
                      label: "Pending",
                      value: leadStats.pending,
                      color: "text-amber-600 dark:text-amber-400",
                    },
                  ]}
                  isSelected={selected.has("lead-status-report")}
                  selectionMode={isMultiSelectMode}
                  isDownloading={downloading === "lead-status-report"}
                  onToggle={() => toggleSelect("lead-status-report")}
                  onDownload={(format) =>
                    downloadReport("lead-status-report", format)
                  }
                  onOpen={() => openReportWorkspace("lead-status-report")}
                    onPreview={() => {
                    setCrmPreview("lead-status");
                  }}
                />
              )}

              {(activeTab === "ALL" || activeTab === "CRM") && (
                <ReportCard
                  title="Lead Source Report"
                  subtitle="Lead Acquisition Overview"
                  description="Shows where customer inquiries are coming from and identifies the channels producing the most leads."
                  category="CRM & Leads"
                  categoryClass="text-cyan-600 dark:text-cyan-400 border-cyan-200 dark:border-cyan-500/30 bg-cyan-50 dark:bg-cyan-950/40"
                  period={reportPeriodLabels["lead-source-report"]}
                  trend={getTrend(
                    leadSourceStats.total,
                    previousLeadSourceStats.total,
                  )}
                  stats={[
                    {
                      icon: <Users className="size-3" />,
                      label: `${leadSourceStats.total} lead${
                        leadSourceStats.total === 1 ? "" : "s"
                      }`,
                    },
                    {
                      icon: <Database className="size-3" />,
                      label: `${leadSourceStats.uniqueSources} source${
                        leadSourceStats.uniqueSources === 1 ? "" : "s"
                      }`,
                    },
                  ]}
                  highlights={[
                    {
                      label: "Top Source",
                      value: leadSourceStats.topSource,
                      color: "text-cyan-600 dark:text-cyan-400",
                    },
                    {
                      label: "Top Leads",
                      value: leadSourceStats.topSourceCount,
                      color: "text-foreground",
                    },
                  ]}
                  isSelected={selected.has("lead-source-report")}
                  selectionMode={isMultiSelectMode}
                  isDownloading={downloading === "lead-source-report"}
                  onToggle={() => toggleSelect("lead-source-report")}
                  onDownload={(format) =>
                    downloadReport("lead-source-report", format)
                  }
                  onOpen={() => openReportWorkspace("lead-source-report")}
                    onPreview={() => {
                    setCrmPreview("lead-source");
                  }}
                />
              )}

              {(activeTab === "ALL" || activeTab === "Driver Reports") && (
                <ReportCard
                  title="Driver Performance"
                  subtitle="Fleet Analytics"
                  description="Individual driver metrics, completion rates and settlement logs."
                  category="Operations"
                  categoryClass="text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-500/30 bg-blue-50 dark:bg-blue-950/40"
                  period={reportPeriodLabels["driver-report"]}
                  trend={getTrend(driverPayoutTotal, previousDriverPayoutTotal)}
                  stats={[
                    { icon: <Truck className="size-3" />, label: "Fleet Wide" },
                    {
                      icon: <CheckSquare className="size-3" />,
                      label: "Compliance",
                    },
                  ]}
                  highlights={[
                    {
                      label: "Delivery Rate",
                      value: `${driverDeliveryRate}%`,
                      color: "text-blue-600 dark:text-blue-400",
                    },
                    {
                      label: "Payouts",
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
                    onPreview={() => {
                    setPreviewType("DRIVER");
                  }}
                />
              )}

              {(activeTab === "ALL" || activeTab === "Billings") && (
                <ReportCard
                  title="Billings & Revenue"
                  subtitle="Financial Audit"
                  description="Customer payments, driver costs, payment outcomes, and revenue after completed payouts."
                  category="Finance"
                  categoryClass="text-violet-600 dark:text-violet-400 border-violet-200 dark:border-violet-500/30 bg-violet-50 dark:bg-violet-950/40"
                  period={reportPeriodLabels["billing-report"]}
                  trend={getTrend(revenueTotal, previousRevenueTotal)}
                  stats={[
                    {
                      icon: <CreditCard className="size-3" />,
                      label: "Bank Sync",
                    },
                    {
                      icon: <Search className="size-3" />,
                      label: "Audit Ready",
                    },
                  ]}
                  highlights={[
                    {
                      label: "Collected",
                      value: formatCurrency(revenueTotal),
                      color: "text-violet-600 dark:text-violet-400",
                    },
                    {
                      label: "Vol.",
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
                    onPreview={() => {
                    setPreviewType("BILLING");
                  }}
                />
              )}
            </div>


            {(activeTab === "ALL" || activeTab === "Transportation") && (
              <section className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-sm">
                <button onClick={() => setShowTransportationAnalytics((value) => !value)} className="flex w-full items-center justify-between gap-4 px-4 py-3.5 text-left transition-colors hover:bg-muted/35 sm:px-5 sm:py-4">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-foreground sm:text-base">Transportation Analytics</p>
                    <p className="mt-1 break-words text-xs leading-relaxed text-muted-foreground sm:text-sm">
                      {filteredLoads.length} loads · {filteredQuotes.length} quotes · {deliveredLoads} delivered · {Math.round(deliveryRate)}% delivery rate
                    </p>
                  </div>
                  {showTransportationAnalytics ? <ChevronUp className="size-5 text-primary" /> : <ChevronDown className="size-5 text-muted-foreground" />}
                </button>
                {showTransportationAnalytics && <div className="min-w-0 overflow-x-auto border-t border-border/70 p-3 sm:p-4 lg:p-5"><TransportationAnalytics loads={filteredLoads} quotes={filteredQuotes} rawLoads={rawLoads} rawQuotes={rawQuotes} monthLabel={monthLabel} /></div>}
              </section>
            )}

            <section className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-sm">
              <button onClick={() => setShowOperationalAnalytics((value) => !value)} className="flex w-full items-center justify-between gap-4 px-4 py-3.5 text-left transition-colors hover:bg-muted/35 sm:px-5 sm:py-4">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-foreground sm:text-base">Operational Analytics</p>
                  <p className="mt-1 break-words text-xs leading-relaxed text-muted-foreground sm:text-sm">
                    {formatCurrency(revenueTotal)} collected · {formatCurrency(netRevenue)} after driver costs · {succeededPayments} successful · {pendingPayments} pending
                  </p>
                </div>
                {showOperationalAnalytics ? <ChevronUp className="size-5 text-primary" /> : <ChevronDown className="size-5 text-muted-foreground" />}
              </button>
              {showOperationalAnalytics && <div className="min-w-0 overflow-x-auto border-t border-border/70 p-3 sm:p-4 lg:p-5"><ReportsAnalytics loads={filteredLoads} rawPayments={rawPayments} monthLabel={monthLabel} /></div>}
            </section>
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

          <p className="mt-2 min-h-[2.25rem] break-words text-xs leading-relaxed text-muted-foreground" title={sub}>
            {sub}
          </p>

          <div
            className={`flex min-w-0 items-start gap-1.5 pt-3 text-[11px] font-semibold ${
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