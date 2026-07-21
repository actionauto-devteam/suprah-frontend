"use client";

import * as React from "react";
import { useAuth } from "@/providers/AuthProvider";
import { apiClient } from "@/lib/api-client";
import {
  FileText,
  Archive,
  MapPin,
  CreditCard,
  Truck,
  CheckSquare,
  Calendar,
  Database,
  Users,
  Search,
  X,
  RefreshCw,
  Sparkles,
  Menu,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  Download,
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
import { ReportCard } from "@/components/reports/ReportCard";
import { ReportPreviewModal } from "@/components/reports/ReportPreviewModal";
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
  saveGeneratedReportFile,
  type ReportFileCategory,
} from "@/lib/report-files";

function safeText(value: unknown, fallback = "—"): string {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function percentage(part: number, whole: number): string {
  return whole > 0 ? `${Math.round((part / whole) * 100)}%` : "0%";
}

function addFooter(doc: any, label: string, generatedAt: string) {
  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page += 1) {
    doc.setPage(page);
    const width = doc.internal.pageSize.getWidth();
    const height = doc.internal.pageSize.getHeight();
    doc.setDrawColor(226, 232, 240);
    doc.line(14, height - 12, width - 14, height - 12);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(`Suprah AI • ${label}`, 14, height - 7);
    doc.text(generatedAt, width / 2, height - 7, { align: "center" });
    doc.text(`Page ${page} of ${pages}`, width - 14, height - 7, {
      align: "right",
    });
  }
}

function drawHeader(doc: any, title: string, subtitle: string, period: string) {
  const width = doc.internal.pageSize.getWidth();
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, width, 25, "F");
  doc.setFillColor(16, 185, 129);
  doc.roundedRect(14, 7, 10, 10, 2, 2, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("S", 19, 13.7, { align: "center" });
  doc.setFontSize(13);
  doc.text(title, 29, 11.5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(203, 213, 225);
  doc.text(subtitle, 29, 17);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text(period, width - 14, 11.5, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setTextColor(203, 213, 225);
  doc.text("Generated locally in Suprah AI", width - 14, 17, {
    align: "right",
  });
}

function drawSummaryCards(
  doc: any,
  items: Array<{ label: string; value: string }>,
  startY = 32,
) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const gap = 4;
  const left = 14;
  const available = pageWidth - 28;
  const cardWidth = (available - gap * (items.length - 1)) / items.length;

  items.forEach((item, index) => {
    const x = left + index * (cardWidth + gap);
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(x, startY, cardWidth, 17, 2, 2, "FD");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(item.label, x + 3, startY + 5.5);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(5, 150, 105);
    doc.text(item.value, x + 3, startY + 12.5);
  });
}

async function generateDriverPerformancePdf(
  loads: Load[],
  payouts: DriverPayout[],
  monthLabel: string,
): Promise<Blob> {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const doc = new jsPDF({ orientation: "landscape" });
  const generatedAt = new Date().toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  const assigned = loads.filter((load) => Boolean(load.assignedDriverId));
  const delivered = assigned.filter((load) => load.status === "Delivered");
  const approved = assigned.filter((load) =>
    Boolean(load.proofOfDelivery?.confirmedAt),
  );
  const paidPayouts = payouts.filter((payout) => payout.status === "paid");
  const payoutTotal = payouts.reduce(
    (sum, payout) => sum + Number(payout.amount || 0),
    0,
  );

  drawHeader(
    doc,
    "Suprah AI Driver Performance",
    "Fleet productivity and settlement report",
    monthLabel,
  );
  drawSummaryCards(doc, [
    { label: "Assigned Loads", value: String(assigned.length) },
    { label: "Delivered", value: String(delivered.length) },
    {
      label: "Delivery Rate",
      value: percentage(delivered.length, assigned.length),
    },
    { label: "POD Approved", value: String(approved.length) },
    { label: "Total Payouts", value: formatCurrency(payoutTotal) },
    { label: "Paid Settlements", value: String(paidPayouts.length) },
  ]);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);
  doc.text("Driver Load Activity", 14, 58);

  autoTable(doc, {
    startY: 61,
    head: [
      [
        "Driver",
        "Load",
        "Vehicle",
        "Customer",
        "Route",
        "Status",
        "Delivered",
        "POD",
      ],
    ],
    body:
      assigned.length > 0
        ? assigned.map((load) => [
            driverName(load),
            safeText(load.loadNumber),
            loadVehicle(load),
            loadCustomer(load),
            loadRoute(load),
            safeText(load.status),
            fmtDate(load.deliveredAt),
            load.proofOfDelivery?.confirmedAt
              ? "Approved"
              : load.proofOfDelivery?.submittedAt
                ? "Pending"
                : "Not submitted",
          ])
        : [
            [
              "No assigned driver activity for this period",
              "",
              "",
              "",
              "",
              "",
              "",
              "",
            ],
          ],
    margin: { left: 14, right: 14, bottom: 18 },
    styles: { fontSize: 7.2, cellPadding: 2.4, textColor: [30, 41, 59] },
    headStyles: { fillColor: [5, 150, 105], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  });

  doc.addPage();
  drawHeader(
    doc,
    "Suprah AI Driver Settlements",
    "Driver payout ledger",
    monthLabel,
  );
  autoTable(doc, {
    startY: 32,
    head: [
      [
        "Payout #",
        "Driver",
        "Load",
        "Description",
        "Amount",
        "Status",
        "Paid At",
        "Failure Reason",
      ],
    ],
    body:
      payouts.length > 0
        ? payouts.map((payout) => [
            safeText(payout.payoutNumber),
            safeText(payout.driverName),
            typeof payout.loadId === "object"
              ? safeText(
                  payout.loadId.loadNumber || payout.loadId.trackingNumber,
                )
              : safeText(payout.loadId),
            safeText(payout.description),
            formatCurrency(Number(payout.amount || 0)),
            safeText(payout.status),
            fmtDate(payout.paidAt),
            safeText(payout.failureReason),
          ])
        : [["No payout records for this period", "", "", "", "", "", "", ""]],
    margin: { left: 14, right: 14, bottom: 18 },
    styles: { fontSize: 7.2, cellPadding: 2.4, textColor: [30, 41, 59] },
    headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: { 4: { halign: "right" } },
  });

  addFooter(doc, "Driver Performance", generatedAt);
  return doc.output("blob");
}

async function generateBillingRevenuePdf(
  payments: Payment[],
  payouts: DriverPayout[],
  monthLabel: string,
): Promise<Blob> {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const doc = new jsPDF({ orientation: "landscape" });
  const generatedAt = new Date().toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  const succeeded = payments.filter(
    (payment) => payment.status === "succeeded",
  );
  const pending = payments.filter((payment) =>
    ["pending", "processing"].includes(payment.status),
  );
  const failed = payments.filter((payment) =>
    ["failed", "cancelled"].includes(payment.status),
  );
  const grossRevenue = succeeded.reduce(
    (sum, payment) => sum + Number(payment.amount || 0),
    0,
  );
  const pendingRevenue = pending.reduce(
    (sum, payment) => sum + Number(payment.amount || 0),
    0,
  );
  const driverCosts = payouts.reduce(
    (sum, payout) => sum + Number(payout.amount || 0),
    0,
  );
  const netPosition = grossRevenue - driverCosts;

  drawHeader(
    doc,
    "Suprah AI Billings & Revenue",
    "Payment audit and operating margin report",
    monthLabel,
  );
  drawSummaryCards(doc, [
    { label: "Transactions", value: String(payments.length) },
    { label: "Succeeded", value: String(succeeded.length) },
    { label: "Gross Revenue", value: formatCurrency(grossRevenue) },
    { label: "Pending", value: formatCurrency(pendingRevenue) },
    { label: "Driver Costs", value: formatCurrency(driverCosts) },
    { label: "Net Position", value: formatCurrency(netPosition) },
  ]);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);
  doc.text("Payment Ledger", 14, 58);

  autoTable(doc, {
    startY: 61,
    head: [
      [
        "Invoice",
        "Customer",
        "Description",
        "Amount",
        "Status",
        "Method",
        "Paid At",
        "Due Date",
      ],
    ],
    body:
      payments.length > 0
        ? payments.map((payment) => [
            safeText(payment.invoiceNumber),
            safeText(payment.customerName),
            safeText(payment.description),
            formatCurrency(Number(payment.amount || 0)),
            safeText(payment.status),
            safeText(payment.paymentMethod),
            fmtDate(payment.paidAt),
            fmtDate(payment.dueDate),
          ])
        : [["No billing activity for this period", "", "", "", "", "", "", ""]],
    margin: { left: 14, right: 14, bottom: 18 },
    styles: { fontSize: 7.2, cellPadding: 2.4, textColor: [30, 41, 59] },
    headStyles: {
      fillColor: [124, 58, 237],
      textColor: 255,
      fontStyle: "bold",
    },
    alternateRowStyles: { fillColor: [250, 245, 255] },
    columnStyles: { 3: { halign: "right" } },
  });

  doc.addPage();
  drawHeader(
    doc,
    "Suprah AI Financial Audit",
    "Status summary and payout reconciliation",
    monthLabel,
  );

  const statusRows = [
    [
      "Succeeded",
      String(succeeded.length),
      formatCurrency(grossRevenue),
      percentage(succeeded.length, payments.length),
    ],
    [
      "Pending / Processing",
      String(pending.length),
      formatCurrency(pendingRevenue),
      percentage(pending.length, payments.length),
    ],
    [
      "Failed / Cancelled",
      String(failed.length),
      formatCurrency(failed.reduce((s, p) => s + Number(p.amount || 0), 0)),
      percentage(failed.length, payments.length),
    ],
  ];

  autoTable(doc, {
    startY: 32,
    head: [["Payment Status", "Count", "Amount", "Share"]],
    body: statusRows,
    margin: { left: 14, right: 14 },
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      1: { halign: "right" },
      2: { halign: "right" },
      3: { halign: "right" },
    },
  });

  const finalY = (doc as any).lastAutoTable?.finalY ?? 65;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);
  doc.text("Driver Payout Reconciliation", 14, finalY + 12);

  autoTable(doc, {
    startY: finalY + 15,
    head: [["Driver", "Payout #", "Amount", "Status", "Paid At"]],
    body:
      payouts.length > 0
        ? payouts.map((payout) => [
            safeText(payout.driverName),
            safeText(payout.payoutNumber),
            formatCurrency(Number(payout.amount || 0)),
            safeText(payout.status),
            fmtDate(payout.paidAt),
          ])
        : [["No payout activity for this period", "", "", "", ""]],
    margin: { left: 14, right: 14, bottom: 18 },
    styles: { fontSize: 7.5, cellPadding: 2.6 },
    headStyles: { fillColor: [5, 150, 105], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [240, 253, 250] },
    columnStyles: { 2: { halign: "right" } },
  });

  addFooter(doc, "Billings & Revenue", generatedAt);
  return doc.output("blob");
}


type TabValue = "ALL" | "Transportation" | "Driver Reports" | "Billings";

interface ReportData {
  loads: Load[];
  payments: Payment[];
  payouts: DriverPayout[];
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

const CATEGORIES: { id: TabValue; label: string; icon: any }[] = [
  { id: "ALL", label: "All Reports", icon: Archive },
  { id: "Transportation", label: "Transportation", icon: Truck },
  { id: "Driver Reports", label: "Driver Reports", icon: MapPin },
  { id: "Billings", label: "Billings & Finance", icon: CreditCard },
];

export default function ReportsPage() {
  const { getToken } = useAuth();
  const [activeTab, setActiveTab] = React.useState<TabValue>("ALL");
  const [selectedMonth, setSelectedMonth] = React.useState(
    new Date().getMonth(),
  );
  const [selectedYear, setSelectedYear] = React.useState(
    new Date().getFullYear(),
  );
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  const [reportData, setReportData] = React.useState<ReportData | null>(null);
  const [rawLoads, setRawLoads] = React.useState<Load[]>([]);
  const [rawQuotes, setRawQuotes] = React.useState<TransportQuote[]>([]);
  const [rawPayments, setRawPayments] = React.useState<Payment[]>([]);

  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [downloading, setDownloading] = React.useState<string | null>(null);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [showTransportationAnalytics, setShowTransportationAnalytics] = React.useState(false);
  const [showOperationalAnalytics, setShowOperationalAnalytics] = React.useState(false);

  const [previewType, setPreviewType] = React.useState<string | null>(null);
  const [transportPreview, setTransportPreview] = React.useState<
    "load" | "quote" | null
  >(null);

  const fetchData = React.useCallback(async () => {
    setIsRefreshing(true);
    try {
      const token = await getToken();
      const month = selectedMonth + 1;
      const monthStr = String(month).padStart(2, "0");
      const yearMonth = `${selectedYear}-${monthStr}`;
      const reportQuery = `report=true&month=${month}&year=${selectedYear}&limit=5000`;

      const [lRes, qRes, pRes, payRes] = await Promise.all([
        apiClient.get(`/api/loads?${reportQuery}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        apiClient.get(`/api/quotes?page=1&limit=100`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        apiClient.get(`/api/payments?${reportQuery}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        apiClient.get(`/api/driver-payouts?${reportQuery}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const loadPayload = lRes.data?.data;
      const paymentPayload = pRes.data?.data;
      const payoutPayload = payRes.data?.data;

      const loads = Array.isArray(loadPayload)
        ? loadPayload
        : Array.isArray(loadPayload?.loads)
          ? loadPayload.loads
          : [];
      const payments = Array.isArray(paymentPayload)
        ? paymentPayload
        : Array.isArray(paymentPayload?.payments)
          ? paymentPayload.payments
          : [];
      const payouts = Array.isArray(payoutPayload)
        ? payoutPayload
        : Array.isArray(payoutPayload?.payouts)
          ? payoutPayload.payouts
          : [];
      const quotes = Array.isArray(qRes.data?.data)
        ? qRes.data.data
        : Array.isArray(qRes.data?.data?.quotes)
          ? qRes.data.data.quotes
          : [];

      setReportData({ loads, payments, payouts });
      setRawLoads(loads);
      setRawQuotes(quotes);
      setRawPayments(payments);
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

  // ─── Filter Logic ───────────────────────────────────────────────────────────

  const monthLabel = `${MONTHS[selectedMonth]} ${selectedYear}`;

  const filteredLoads = React.useMemo(() => {
    if (!reportData?.loads) return [];
    return reportData.loads.filter((l) => {
      const q = searchQuery.toLowerCase();
      return (
        l.loadNumber?.toLowerCase().includes(q) ||
        l.pickupLocation?.city?.toLowerCase().includes(q) ||
        l.deliveryLocation?.city?.toLowerCase().includes(q)
      );
    });
  }, [reportData?.loads, searchQuery]);

  const filteredQuotes = React.useMemo(() => {
    if (!rawQuotes) return [];
    // Filter quotes by the selected year/month based on createdAt
    const monthStr = String(selectedMonth + 1).padStart(2, "0");
    const yearMonth = `${selectedYear}-${monthStr}`;
    return rawQuotes.filter((q) => {
      const matchesDate = q.createdAt?.startsWith(yearMonth);
      if (!matchesDate) return false;
      const query = searchQuery.toLowerCase();
      return (
        q.firstName?.toLowerCase().includes(query) ||
        q.lastName?.toLowerCase().includes(query) ||
        q.fromAddress?.toLowerCase().includes(query) ||
        q.toAddress?.toLowerCase().includes(query)
      );
    });
  }, [rawQuotes, selectedMonth, selectedYear, searchQuery]);

  const loadSummary = React.useMemo(() => {
    return buildLoadSummary(filteredLoads);
  }, [filteredLoads]);

  const quoteSummary = React.useMemo(() => {
    return buildQuoteSummary(filteredQuotes);
  }, [filteredQuotes]);

  const revenueTotal = React.useMemo(() => {
    if (!reportData?.payments) return 0;
    return reportData.payments.reduce((acc, p) => acc + (p.amount || 0), 0);
  }, [reportData?.payments]);

  const payoutTotal = React.useMemo(() => {
    if (!reportData?.payouts) return 0;
    return reportData.payouts.reduce((acc, p) => acc + (p.amount || 0), 0);
  }, [reportData?.payouts]);

  // ─── Actions ────────────────────────────────────────────────────────────────

  const toggleSelect = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const toggleAll = () => {
    const allIds =
      activeTab === "ALL"
        ? ["driver-report", "billing-report", "load-report", "quote-report"]
        : activeTab === "Transportation"
          ? ["load-report", "quote-report"]
          : activeTab === "Driver Reports"
            ? ["driver-report"]
            : ["billing-report"];

    if (selected.size === allIds.length) setSelected(new Set());
    else setSelected(new Set(allIds));
  };

  const downloadReport = async (id: string) => {
    setDownloading(id);
    try {
      let blob: Blob | null = null;
      let filename = `Report_${id}_${monthLabel.replace(" ", "_")}.pdf`;
      let category: ReportFileCategory = "transportation";

      if (id === "load-report") {
        blob = await generateLoadReportPdf(filteredLoads, monthLabel);
        category = "transportation";
      } else if (id === "quote-report") {
        blob = await generateQuoteReportPdf(filteredQuotes, monthLabel);
        category = "transportation";
      } else if (id === "driver-report") {
        blob = await generateDriverPerformancePdf(
          filteredLoads,
          reportData?.payouts || [],
          monthLabel,
        );
        filename = `Suprah_AI_Driver_Performance_${monthLabel.replace(" ", "_")}.pdf`;
        category = "driver";
      } else if (id === "billing-report") {
        blob = await generateBillingRevenuePdf(
          reportData?.payments || [],
          reportData?.payouts || [],
          monthLabel,
        );
        filename = `Suprah_AI_Billings_Revenue_${monthLabel.replace(" ", "_")}.pdf`;
        category = "billings";
      } else {
        throw new Error(`Unknown report type: ${id}`);
      }

      if (blob) {
        // Save to internal db
        await saveGeneratedReportFile({
          name: filename,
          category,
          blob,
        });
        // Trigger browser download
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
        toast.success("Report downloaded and saved to Generated Files");
      }
    } catch (err) {
      console.error(err);
      toast.error(`Failed to generate ${id}`);
    } finally {
      setDownloading(null);
    }
  };

  const bulkDownload = async () => {
    const picks = Array.from(selected);
    if (picks.length === 0) return;

    toast.promise(
      (async () => {
        for (const id of picks) {
          await downloadReport(id);
        }
      })(),
      {
        loading: `Generating ${picks.length} reports...`,
        success: "All reports generated successfully",
        error: "Some reports failed to generate",
      },
    );
  };

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen min-w-0 overflow-x-hidden bg-background pb-[calc(7rem+env(safe-area-inset-bottom))] lg:pb-8">
      <div className="sticky top-0 z-30 border-b border-border bg-card/90 backdrop-blur-xl">
        <div className="mx-auto w-full max-w-7xl px-3 py-3 sm:px-5 sm:py-4 xl:px-6">
          <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20 sm:size-11 sm:rounded-2xl">
                <Sparkles className="size-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="truncate text-lg font-bold tracking-tight text-foreground sm:text-2xl">Suprah AI Reports</h1>
                  <span className="hidden rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary sm:inline-flex">Local Workspace</span>
                </div>
                <p className="hidden text-sm text-muted-foreground sm:block">Preview, generate, organize, and export operational reports.</p>
              </div>
            </div>

            <div className="grid w-full grid-cols-[auto_1fr] items-center gap-2 sm:flex sm:w-auto sm:shrink-0">
              <Button variant="outline" size="icon" className="size-10 rounded-xl lg:hidden" onClick={() => setIsMobileMenuOpen(true)} aria-label="Open report filters">
                <Menu className="size-4" />
              </Button>
              <Button variant="outline" size="sm" className="hidden h-10 gap-2 rounded-xl sm:inline-flex" onClick={fetchData} disabled={isRefreshing}>
                <RefreshCw className={`size-4 ${isRefreshing ? "animate-spin" : ""}`} /> Refresh
              </Button>
              <div className="min-w-0 flex items-center gap-1 rounded-xl border border-border bg-muted/50 p-1">
                <Calendar className="ml-1 hidden size-4 text-muted-foreground sm:block" />
                <Select value={String(selectedMonth)} onValueChange={(value) => setSelectedMonth(Number(value))}>
                  <SelectTrigger size="sm" className="h-8 min-w-0 flex-1 border-0 bg-transparent px-2 text-xs font-semibold shadow-none focus:ring-0 sm:w-28 sm:flex-none sm:text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent position="popper" align="start" className="border-border bg-popover text-popover-foreground shadow-xl">
                    {MONTHS.map((month, index) => <SelectItem key={month} value={String(index)}>{month}</SelectItem>)}
                  </SelectContent>
                </Select>
                <div className="h-4 w-px bg-border" />
                <Select value={String(selectedYear)} onValueChange={(value) => setSelectedYear(Number(value))}>
                  <SelectTrigger size="sm" className="h-8 w-20 border-0 bg-transparent px-2 text-xs font-semibold shadow-none focus:ring-0 sm:w-22 sm:text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent position="popper" align="end" className="min-w-22 border-border bg-popover text-popover-foreground shadow-xl">
                    {Array.from({ length: 5 }, (_, index) => new Date().getFullYear() - 3 + index).map((year) => <SelectItem key={year} value={String(year)}>{year}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>
      </div>

      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button className="absolute inset-0 bg-black/55 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} aria-label="Close filters" />
          <aside className="absolute inset-y-0 left-0 flex w-[86%] max-w-sm flex-col border-r border-border bg-card shadow-2xl">
            <div className="flex items-center justify-between border-b border-border p-4">
              <div><p className="text-sm font-bold text-foreground">Reports Menu</p><p className="text-xs text-muted-foreground">Categories and filters</p></div>
              <Button variant="ghost" size="icon" className="size-9" onClick={() => setIsMobileMenuOpen(false)}><X className="size-4" /></Button>
            </div>
            <div className="flex-1 space-y-5 overflow-y-auto p-4">
              <nav className="space-y-1">
                {CATEGORIES.map((cat) => (
                  <button key={cat.id} onClick={() => { setActiveTab(cat.id); setIsMobileMenuOpen(false); }} className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all ${activeTab === cat.id ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
                    <cat.icon className="size-4.5" />{cat.label}
                  </button>
                ))}
              </nav>
              <div className="space-y-3">
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Global Filters</p>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search reports..." className="h-11 w-full rounded-xl border border-border bg-background pl-10 pr-10 text-sm outline-none focus:ring-2 focus:ring-primary/20" />
                  {searchQuery && <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"><X className="size-4" /></button>}
                </div>
                <Button variant="outline" className="h-11 w-full justify-start gap-2 rounded-xl border-dashed" onClick={() => setSearchQuery("")}><Database className="size-4" />Reset Filters</Button>
              </div>
            </div>
          </aside>
        </div>
      )}

      <div className="mx-auto w-full max-w-7xl min-w-0 space-y-4 px-3 py-4 sm:px-5 sm:py-6 xl:px-6">
        <div className="flex gap-2 overflow-x-auto pb-1 lg:hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {CATEGORIES.map((cat) => (
            <button key={cat.id} onClick={() => setActiveTab(cat.id)} className={`flex h-10 shrink-0 items-center gap-2 rounded-full border px-4 text-xs font-semibold transition-all ${activeTab === cat.id ? "border-primary bg-primary text-primary-foreground shadow-md shadow-primary/20" : "border-border bg-card text-muted-foreground"}`}><cat.icon className="size-3.5" />{cat.label}</button>
          ))}
        </div>

        <div className="relative lg:hidden">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search loads, routes, and customers..." className="h-11 w-full rounded-xl border border-border bg-card pl-10 pr-10 text-sm shadow-sm outline-none focus:ring-2 focus:ring-primary/20" />
          {searchQuery && <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:bg-muted"><X className="size-3.5" /></button>}
        </div>

        <div className="grid min-w-0 grid-cols-2 gap-3 lg:grid-cols-4">
          <StatBox label="Total Loads" value={reportData?.loads.length || 0} sub="Current period" icon={Truck} color="text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40" />
          <StatBox label="Delivered" value={reportData?.loads.filter((s) => s.status === "Delivered").length || 0} sub="Successful cycles" icon={CheckSquare} color="text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40" />
          <StatBox label="Revenue" value={formatCurrency(reportData?.payments.reduce((s, p) => s + p.amount, 0) || 0)} sub="Successful payments" icon={CreditCard} color="text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/40" />
          <StatBox label="Driver Payouts" value={formatCurrency(reportData?.payouts.reduce((s, p) => s + p.amount, 0) || 0)} sub="Completed settlements" icon={Users} color="text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40" />
        </div>

        <div className="grid min-w-0 grid-cols-1 items-start gap-4 lg:grid-cols-12">
          <aside className="hidden space-y-4 lg:col-span-3 lg:block">
            <div className="rounded-2xl border border-border bg-card p-2 shadow-sm">
              <nav className="space-y-1">{CATEGORIES.map((cat) => <button key={cat.id} onClick={() => setActiveTab(cat.id)} className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all ${activeTab === cat.id ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}><cat.icon className="size-4.5" />{cat.label}</button>)}</nav>
            </div>
            <div className="rounded-2xl border border-border/50 bg-muted/30 p-5">
              <h3 className="mb-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">Global Filters</h3>
              <div className="space-y-4"><div className="relative"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search reports..." className="w-full rounded-xl border border-border bg-background py-2 pl-10 pr-10 text-sm outline-none focus:ring-2 focus:ring-primary/20" />{searchQuery && <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"><X className="size-3.5" /></button>}</div><Button variant="outline" className="h-11 w-full justify-start gap-2 rounded-xl border-dashed" onClick={() => setSearchQuery("")}><Database className="size-4" />Reset Filters</Button></div>
            </div>
          </aside>

          <main className="min-w-0 space-y-4 lg:col-span-9">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0"><h2 className="truncate text-lg font-bold text-foreground">{activeTab === "ALL" ? "Available Reports" : activeTab}</h2><p className="text-xs text-muted-foreground">Showing results for {monthLabel}</p></div>
              <div className="flex shrink-0 items-center gap-1"><Button variant="ghost" size="sm" className="h-9 rounded-lg px-2 sm:px-3" onClick={toggleAll}>{selected.size > 0 ? "Deselect" : "Select All"}</Button>{selected.size > 0 && <Button size="sm" className="hidden h-9 gap-2 rounded-lg shadow-md sm:inline-flex" onClick={bulkDownload}><CheckSquare className="size-4" />Export ({selected.size})</Button>}</div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(activeTab === "ALL" || activeTab === "Transportation") && (
                <>
                  <ReportCard
                    title="Unified Load Report"
                    subtitle="Logistics & Delivery"
                    description="Full delivery cycles, carrier payouts, and logistics efficiency tracking."
                    category="Logistics"
                    categoryClass="text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/40"
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
                    isDownloading={downloading === "load-report"}
                    onToggle={() => toggleSelect("load-report")}
                    onDownload={() => downloadReport("load-report")}
                    onPreview={() => setTransportPreview("load")}
                  />
                  <ReportCard
                    title="Quotes & Drafts"
                    subtitle="Sales & Conversion"
                    description="Market quote history, conversion rates and pending logistics drafts."
                    category="Transportation"
                    categoryClass="text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-950/40"
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
                    isDownloading={downloading === "quote-report"}
                    onToggle={() => toggleSelect("quote-report")}
                    onDownload={() => downloadReport("quote-report")}
                    onPreview={() => setTransportPreview("quote")}
                  />
                </>
              )}

              {(activeTab === "ALL" || activeTab === "Driver Reports") && (
                <ReportCard
                  title="Driver Performance"
                  subtitle="Fleet Analytics"
                  description="Individual driver metrics, completion rates and settlement logs."
                  category="Operations"
                  categoryClass="text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-500/30 bg-blue-50 dark:bg-blue-950/40"
                  stats={[
                    { icon: <Truck className="size-3" />, label: "Fleet Wide" },
                    {
                      icon: <CheckSquare className="size-3" />,
                      label: "Compliance",
                    },
                  ]}
                  highlights={[
                    {
                      label: "Avg Score",
                      value: "98.2",
                      color: "text-blue-600 dark:text-blue-400",
                    },
                    {
                      label: "Payouts",
                      value: formatCurrency(payoutTotal),
                      color: "text-foreground",
                    },
                  ]}
                  isSelected={selected.has("driver-report")}
                  isDownloading={downloading === "driver-report"}
                  onToggle={() => toggleSelect("driver-report")}
                  onDownload={() => downloadReport("driver-report")}
                  onPreview={() => setPreviewType("DRIVER")}
                />
              )}

              {(activeTab === "ALL" || activeTab === "Billings") && (
                <ReportCard
                  title="Billings & Revenue"
                  subtitle="Financial Audit"
                  description="Complete financial audit of succeeding payments and gross revenue."
                  category="Finance"
                  categoryClass="text-violet-600 dark:text-violet-400 border-violet-200 dark:border-violet-500/30 bg-violet-50 dark:bg-violet-950/40"
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
                      label: "Gross",
                      value: formatCurrency(revenueTotal),
                      color: "text-violet-600 dark:text-violet-400",
                    },
                    {
                      label: "Vol.",
                      value: rawPayments.length,
                      color: "text-foreground",
                    },
                  ]}
                  isSelected={selected.has("billing-report")}
                  isDownloading={downloading === "billing-report"}
                  onToggle={() => toggleSelect("billing-report")}
                  onDownload={() => downloadReport("billing-report")}
                  onPreview={() => setPreviewType("BILLING")}
                />
              )}
            </div>


            {(activeTab === "ALL" || activeTab === "Transportation") && (
              <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                <button onClick={() => setShowTransportationAnalytics((value) => !value)} className="flex w-full items-center justify-between gap-3 p-4 text-left sm:p-5">
                  <div><p className="font-bold text-foreground">Transportation Analytics</p><p className="text-xs text-muted-foreground">Loads, quotes, and route performance</p></div>
                  {showTransportationAnalytics ? <ChevronUp className="size-5 text-primary" /> : <ChevronDown className="size-5 text-muted-foreground" />}
                </button>
                {showTransportationAnalytics && <div className="min-w-0 overflow-hidden border-t border-border p-2 sm:p-4"><TransportationAnalytics loads={filteredLoads} quotes={filteredQuotes} rawLoads={rawLoads} rawQuotes={rawQuotes} monthLabel={monthLabel} /></div>}
              </section>
            )}

            <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
              <button onClick={() => setShowOperationalAnalytics((value) => !value)} className="flex w-full items-center justify-between gap-3 p-4 text-left sm:p-5">
                <div><p className="font-bold text-foreground">Operational Analytics</p><p className="text-xs text-muted-foreground">Revenue and operational performance overview</p></div>
                {showOperationalAnalytics ? <ChevronUp className="size-5 text-primary" /> : <ChevronDown className="size-5 text-muted-foreground" />}
              </button>
              {showOperationalAnalytics && <div className="min-w-0 overflow-hidden border-t border-border p-2 sm:p-4"><ReportsAnalytics loads={rawLoads} rawPayments={rawPayments} monthLabel={monthLabel} /></div>}
            </section>
          </main>
        </div>
      </div>

      <Button size="icon" className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] right-4 z-20 size-12 rounded-full shadow-xl shadow-primary/25 sm:hidden" onClick={fetchData} disabled={isRefreshing} aria-label="Refresh reports"><RefreshCw className={`size-5 ${isRefreshing ? "animate-spin" : ""}`} /></Button>

      {selected.size > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 px-3 pb-[calc(.75rem+env(safe-area-inset-bottom))] pt-3 shadow-2xl backdrop-blur-xl lg:hidden">
          <div className="mx-auto flex max-w-lg items-center gap-3"><div className="min-w-0 flex-1"><p className="text-sm font-bold text-foreground">{selected.size} report{selected.size === 1 ? "" : "s"} selected</p><p className="truncate text-xs text-muted-foreground">Ready to generate and save</p></div><Button className="h-11 gap-2 rounded-xl px-5" onClick={bulkDownload} disabled={!!downloading}><Download className="size-4" />Export</Button></div>
        </div>
      )}

      {/* ── Modals & Previews ── */}
      <TransportationPreviewModal
        open={!!transportPreview}
        onClose={() => setTransportPreview(null)}
        reportType={transportPreview || "load"}
        loads={filteredLoads}
        quotes={filteredQuotes}
        monthLabel={monthLabel}
        isDownloading={
          downloading === "load-report" || downloading === "quote-report"
        }
        onDownload={() =>
          downloadReport(
            transportPreview === "load" ? "load-report" : "quote-report",
          )
        }
      />

      <ReportPreviewModal
        open={!!previewType}
        onClose={() => setPreviewType(null)}
        reportType={previewType?.toLowerCase() as "driver" | "billing"}
        loads={reportData?.loads || []}
        payments={reportData?.payments || []}
        payouts={reportData?.payouts || []}
        monthLabel={monthLabel}
        isDownloading={
          downloading ===
          (previewType === "DRIVER" ? "driver-report" : "billing-report")
        }
        onDownload={() => {
          if (previewType === "DRIVER") downloadReport("driver-report");
          else if (previewType === "BILLING") downloadReport("billing-report");
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
}: {
  label: string;
  value: string | number;
  sub: string;
  icon: any;
  color: string;
}) {
  return (
    <div className="group min-w-[180px] flex-1 rounded-2xl border border-border bg-card p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md sm:min-w-0 sm:p-5">
      <div className="flex items-center justify-between mb-3">
        <div
          className={`size-10 rounded-xl flex items-center justify-center ${color}`}
        >
          <Icon className="size-5" />
        </div>
      </div>
      <div>
        <p className="break-words text-lg font-bold tracking-tight text-foreground sm:text-2xl">
          {value}
        </p>
        <p className="text-xs font-semibold text-foreground/80 mt-0.5">
          {label}
        </p>
        <p className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wider font-medium">
          {sub}
        </p>
      </div>
    </div>
  );
}