"use client";

import * as React from "react";
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
  SlidersHorizontal,
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
import { ReportExportMenu } from "@/components/reports/ReportExportMenu";
import { ReportPreviewModal } from "@/components/reports/ReportPreviewModal";
import {
  CRMPreviewModal,
  type CRMReportType,
} from "@/components/reports/crm/CRMPreviewModal";
import { generateLeadStatusPdf } from "@/components/reports/crm/pdf/LeadStatusPdf";
import { generateLeadSourcePdf } from "@/components/reports/crm/pdf/LeadSourcePdf";
import { generateLeadStatusExcel } from "@/components/reports/crm/excel/LeadStatusExcel";
import { generateLeadSourceExcel } from "@/components/reports/crm/excel/LeadSourceExcel";
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

function safeText(value: unknown, fallback = "—"): string {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function percentage(part: number, whole: number): string {
  return whole > 0 ? `${Math.round((part / whole) * 100)}%` : "0%";
}

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

function drawHeader(
  doc: any,
  title: string,
  subtitle: string,
  period: string,
  accent: [number, number, number] = [16, 185, 129],
) {
  const width = doc.internal.pageSize.getWidth();
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, width, 25, "F");
  doc.setFillColor(...accent);
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
  valueColor: [number, number, number] = [5, 150, 105],
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
    doc.setTextColor(...valueColor);
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
  const operationsBlue: [number, number, number] = [37, 99, 235];
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
    operationsBlue,
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
  ], 32, operationsBlue);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);
  doc.text("Driver Load Activity", 14, 58);

  autoTable(doc, {
    startY: 61,
    showHead: "everyPage",
    rowPageBreak: "avoid",
    pageBreak: "auto",
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
    margin: { top: 42, left: 14, right: 14, bottom: 18 },
    styles: {
      fontSize: 7.2,
      cellPadding: 2.4,
      overflow: "linebreak",
      valign: "middle",
      textColor: [30, 41, 59],
    },
    headStyles: {
      fillColor: operationsBlue,
      textColor: 255,
      fontStyle: "bold",
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    didDrawPage: (data) => {
      if (data.pageNumber > 1) {
        drawHeader(
          doc,
          "Suprah AI Driver Performance",
          "Driver Load Activity • Continued",
          monthLabel,
          operationsBlue,
        );
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(30, 41, 59);
        doc.text("Driver Load Activity", 14, 40);
      }
    },
  });


  // Keep the Driver Performance download consistent with its preview.
  // Driver payout records are shown in Billings & Revenue and are not
  // duplicated as an extra settlement page here.

  doc.addPage();
  drawHeader(
    doc,
    "Suprah AI Driver Settlements",
    "Driver payout ledger",
    monthLabel,
    operationsBlue,
  );

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);
  doc.text("Driver Settlement Details", 14, 32);

  autoTable(doc, {
    startY: 35,
    showHead: "everyPage",
    rowPageBreak: "avoid",
    pageBreak: "auto",
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
        : [
            [
              "No payout records for this period",
              "",
              "",
              "",
              "",
              "",
              "",
              "",
            ],
          ],
    margin: { top: 42, left: 14, right: 14, bottom: 18 },
    styles: {
      fontSize: 7.2,
      cellPadding: 2.4,
      overflow: "linebreak",
      valign: "middle",
      textColor: [30, 41, 59],
    },
    headStyles: {
      fillColor: operationsBlue,
      textColor: 255,
      fontStyle: "bold",
    },
    alternateRowStyles: { fillColor: [239, 246, 255] },
    columnStyles: { 4: { halign: "right" } },
    didDrawPage: (data) => {
      if (data.pageNumber > 1) {
        drawHeader(
          doc,
          "Suprah AI Driver Settlements",
          "Driver payout ledger • Continued",
          monthLabel,
          operationsBlue,
        );
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(30, 41, 59);
        doc.text("Driver Settlement Details", 14, 40);
      }
    },
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
  const financeViolet: [number, number, number] = [124, 58, 237];
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
    financeViolet,
  );
  drawSummaryCards(doc, [
    { label: "Transactions", value: String(payments.length) },
    { label: "Succeeded", value: String(succeeded.length) },
    { label: "Gross Revenue", value: formatCurrency(grossRevenue) },
    { label: "Pending", value: formatCurrency(pendingRevenue) },
    { label: "Driver Costs", value: formatCurrency(driverCosts) },
    { label: "Net Position", value: formatCurrency(netPosition) },
  ], 32, financeViolet);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);
  doc.text("Customer Payments to Dealer", 14, 58);

  autoTable(doc, {
    startY: 61,
    showHead: "everyPage",
    rowPageBreak: "avoid",
    pageBreak: "auto",
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
    margin: { top: 42, left: 14, right: 14, bottom: 18 },
    styles: {
      fontSize: 7.2,
      cellPadding: 2.4,
      overflow: "linebreak",
      valign: "middle",
      textColor: [30, 41, 59],
    },
    headStyles: {
      fillColor: financeViolet,
      textColor: 255,
      fontStyle: "bold",
    },
    alternateRowStyles: { fillColor: [250, 245, 255] },
    columnStyles: { 3: { halign: "right" } },
    didDrawPage: (data) => {
      if (data.pageNumber > 1) {
        drawHeader(
          doc,
          "Suprah AI Billings & Revenue",
          "Customer Payments to Dealer • Continued",
          monthLabel,
          financeViolet,
        );
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(30, 41, 59);
        doc.text("Customer Payments to Dealer", 14, 40);
      }
    },
  });

  doc.addPage();
  drawHeader(
    doc,
    "Suprah AI Billings & Revenue",
    "Driver Payouts from Dealer",
    monthLabel,
    financeViolet,
  );

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);
  doc.text("Driver Payouts from Dealer", 14, 40);

  autoTable(doc, {
    startY: 43,
    showHead: "everyPage",
    rowPageBreak: "avoid",
    pageBreak: "auto",
    head: [
      [
        "Driver",
        "Payout #",
        "Load",
        "Description",
        "Amount",
        "Status",
        "Paid At",
      ],
    ],
    body:
      payouts.length > 0
        ? payouts.map((payout) => [
            safeText(payout.driverName),
            safeText(payout.payoutNumber),
            typeof payout.loadId === "object"
              ? safeText(
                  payout.loadId.loadNumber || payout.loadId.trackingNumber,
                )
              : safeText(payout.loadId),
            safeText(payout.description),
            formatCurrency(Number(payout.amount || 0)),
            safeText(payout.status),
            fmtDate(payout.paidAt),
          ])
        : [
            [
              "No payout activity for this period",
              "",
              "",
              "",
              "",
              "",
              "",
            ],
          ],
    margin: { top: 42, left: 14, right: 14, bottom: 18 },
    styles: {
      fontSize: 7.2,
      cellPadding: 2.4,
      overflow: "linebreak",
      valign: "middle",
      textColor: [30, 41, 59],
    },
    headStyles: {
      fillColor: financeViolet,
      textColor: 255,
      fontStyle: "bold",
    },
    alternateRowStyles: { fillColor: [240, 253, 250] },
    columnStyles: { 4: { halign: "right" } },
    didDrawPage: (data) => {
      if (data.pageNumber > 1) {
        drawHeader(
          doc,
          "Suprah AI Billings & Revenue",
          "Driver Payouts from Dealer • Continued",
          monthLabel,
          financeViolet,
        );
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(30, 41, 59);
        doc.text("Driver Payouts from Dealer", 14, 40);
      }
    },
  });

  addFooter(doc, "Billings & Revenue", generatedAt);
  return doc.output("blob");
}




type ExportFormat = "pdf" | "xlsx";

function createBrowserDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

function safeWorkbookText(value: unknown, fallback = "—"): string {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function workbookDate(value: unknown): string {
  if (!value) return "—";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function setExcelColumns(worksheet: any, widths: number[]) {
  worksheet["!cols"] = widths.map((wch) => ({ wch }));
}


const EXCEL_REPORT_COLORS = {
  navy: "0F172A",
  green: "10B981",
  greenDark: "047857",
  greenSoft: "D1FAE5",
  blueSoft: "DBEAFE",
  blue: "2563EB",
  amberSoft: "FEF3C7",
  amber: "D97706",
  redSoft: "FEE2E2",
  red: "DC2626",
  graySoft: "F1F5F9",
  columnSoft: "F8FAFC",
  columnAltSoft: "F1F8F5",
  gray: "64748B",
  white: "FFFFFF",
  border: "CBD5E1",
  text: "1E293B",
};

function styleExcelCell(
  worksheet: any,
  address: string,
  style: Record<string, unknown>,
) {
  if (!worksheet[address]) worksheet[address] = { t: "s", v: "" };
  worksheet[address].s = style;
}

function styleExcelRange(
  XLSX: any,
  worksheet: any,
  range: string,
  style: Record<string, unknown>,
) {
  const decoded = XLSX.utils.decode_range(range);
  for (let row = decoded.s.r; row <= decoded.e.r; row += 1) {
    for (let col = decoded.s.c; col <= decoded.e.c; col += 1) {
      styleExcelCell(
        worksheet,
        XLSX.utils.encode_cell({ r: row, c: col }),
        style,
      );
    }
  }
}

function workbookStatusStyle(status: string) {
  const normalized = status.toLowerCase();

  if (normalized.includes("deliver") || normalized.includes("paid")) {
    return {
      fill: EXCEL_REPORT_COLORS.greenSoft,
      font: EXCEL_REPORT_COLORS.greenDark,
    };
  }

  if (
    normalized.includes("pending") ||
    normalized.includes("processing") ||
    normalized.includes("submitted")
  ) {
    return {
      fill: EXCEL_REPORT_COLORS.amberSoft,
      font: EXCEL_REPORT_COLORS.amber,
    };
  }

  if (
    normalized.includes("failed") ||
    normalized.includes("cancel") ||
    normalized.includes("reject")
  ) {
    return {
      fill: EXCEL_REPORT_COLORS.redSoft,
      font: EXCEL_REPORT_COLORS.red,
    };
  }

  return {
    fill: EXCEL_REPORT_COLORS.blueSoft,
    font: EXCEL_REPORT_COLORS.blue,
  };
}

function styleWorkbookSummary(
  XLSX: any,
  worksheet: any,
  metricEndRow: number,
) {
  worksheet["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 1 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 1 } },
  ];

  styleExcelRange(XLSX, worksheet, "A1:B1", {
    fill: { fgColor: { rgb: EXCEL_REPORT_COLORS.navy } },
    font: {
      color: { rgb: EXCEL_REPORT_COLORS.white },
      bold: true,
      sz: 18,
    },
    alignment: { horizontal: "center", vertical: "center" },
  });

  styleExcelRange(XLSX, worksheet, "A2:B2", {
    fill: { fgColor: { rgb: EXCEL_REPORT_COLORS.green } },
    font: {
      color: { rgb: EXCEL_REPORT_COLORS.white },
      bold: true,
      sz: 13,
    },
    alignment: { horizontal: "center", vertical: "center" },
  });

  styleExcelRange(XLSX, worksheet, "A5:B5", {
    fill: { fgColor: { rgb: EXCEL_REPORT_COLORS.navy } },
    font: {
      color: { rgb: EXCEL_REPORT_COLORS.white },
      bold: true,
      sz: 11,
    },
    alignment: { horizontal: "center", vertical: "center" },
    border: {
      top: { style: "thin", color: { rgb: EXCEL_REPORT_COLORS.border } },
      bottom: { style: "thin", color: { rgb: EXCEL_REPORT_COLORS.border } },
      left: { style: "thin", color: { rgb: EXCEL_REPORT_COLORS.border } },
      right: { style: "thin", color: { rgb: EXCEL_REPORT_COLORS.border } },
    },
  });

  for (let row = 6; row <= metricEndRow; row += 1) {
    const fill =
      row % 2 === 0
        ? EXCEL_REPORT_COLORS.graySoft
        : EXCEL_REPORT_COLORS.white;

    styleExcelRange(XLSX, worksheet, `A${row}:B${row}`, {
      fill: { fgColor: { rgb: fill } },
      font: { color: { rgb: EXCEL_REPORT_COLORS.text }, sz: 11 },
      border: {
        bottom: { style: "thin", color: { rgb: EXCEL_REPORT_COLORS.border } },
        left: { style: "thin", color: { rgb: EXCEL_REPORT_COLORS.border } },
        right: { style: "thin", color: { rgb: EXCEL_REPORT_COLORS.border } },
      },
      alignment: { vertical: "center" },
    });

    styleExcelCell(worksheet, `B${row}`, {
      fill: { fgColor: { rgb: fill } },
      font: {
        color: { rgb: EXCEL_REPORT_COLORS.text },
        bold: true,
        sz: 12,
      },
      alignment: { horizontal: "center", vertical: "center" },
      border: {
        bottom: { style: "thin", color: { rgb: EXCEL_REPORT_COLORS.border } },
        left: { style: "thin", color: { rgb: EXCEL_REPORT_COLORS.border } },
        right: { style: "thin", color: { rgb: EXCEL_REPORT_COLORS.border } },
      },
    });
  }

  worksheet["!cols"] = [{ wch: 28 }, { wch: 22 }];
  worksheet["!rows"] = [
    { hpt: 28 },
    { hpt: 22 },
    { hpt: 18 },
    { hpt: 8 },
    { hpt: 22 },
  ];
  worksheet["!freeze"] = { xSplit: 0, ySplit: 5 };
  worksheet["!sheetView"] = [{ showGridLines: false }];
}

function styleWorkbookData(
  XLSX: any,
  worksheet: any,
  rowCount: number,
  columnCount: number,
  statusColumnIndex?: number,
  centerColumns: number[] = [],
  rightColumns: number[] = [],
  emphasisColumns: number[] = [],
  currencyColumns: number[] = [],
  dateColumns: number[] = [],
) {
  if (rowCount <= 0) return;

  const lastColumn = XLSX.utils.encode_col(columnCount - 1);
  const lastRow = rowCount + 1;

  styleExcelRange(XLSX, worksheet, `A1:${lastColumn}1`, {
    fill: { fgColor: { rgb: EXCEL_REPORT_COLORS.navy } },
    font: {
      color: { rgb: EXCEL_REPORT_COLORS.white },
      bold: true,
      sz: 11.5,
    },
    alignment: {
      horizontal: "center",
      vertical: "center",
      wrapText: true,
    },
    border: {
      top: { style: "thin", color: { rgb: EXCEL_REPORT_COLORS.green } },
      bottom: { style: "medium", color: { rgb: EXCEL_REPORT_COLORS.green } },
      left: { style: "thin", color: { rgb: EXCEL_REPORT_COLORS.border } },
      right: { style: "thin", color: { rgb: EXCEL_REPORT_COLORS.border } },
    },
  });

  for (let row = 2; row <= lastRow; row += 1) {
    for (let columnIndex = 0; columnIndex < columnCount; columnIndex += 1) {
      const address = `${XLSX.utils.encode_col(columnIndex)}${row}`;
      if (!worksheet[address]) continue;

      const isOddExcelColumn = (columnIndex + 1) % 2 === 1;

      // Very subtle column contrast:
      // odd columns remain neutral; even columns receive a light Suprah tint.
      const fill =
        row % 2 === 0
          ? isOddExcelColumn
            ? EXCEL_REPORT_COLORS.columnSoft
            : EXCEL_REPORT_COLORS.columnAltSoft
          : isOddExcelColumn
            ? EXCEL_REPORT_COLORS.white
            : "F5FBF8";

      const isCentered = centerColumns.includes(columnIndex);
      const isRightAligned = rightColumns.includes(columnIndex);
      const isEmphasized = emphasisColumns.includes(columnIndex);
      const isCurrency = currencyColumns.includes(columnIndex);
      const isDate = dateColumns.includes(columnIndex);

      styleExcelCell(worksheet, address, {
        fill: { fgColor: { rgb: fill } },
        font: {
          color: {
            rgb: isCurrency
              ? EXCEL_REPORT_COLORS.greenDark
              : isDate
                ? EXCEL_REPORT_COLORS.gray
                : EXCEL_REPORT_COLORS.text,
          },
          bold: isCurrency || isEmphasized || isRightAligned,
          sz: isEmphasized ? 11 : 10.5,
        },
        alignment: {
          horizontal: isCurrency || isRightAligned
            ? "right"
            : isDate || isCentered
              ? "center"
              : "left",
          vertical: "center",
          wrapText: true,
          indent: isCurrency || isRightAligned || isDate || isCentered ? 0 : 1,
        },
        border: {
          bottom: { style: "thin", color: { rgb: EXCEL_REPORT_COLORS.border } },
          left: { style: "hair", color: { rgb: EXCEL_REPORT_COLORS.border } },
          right: { style: "hair", color: { rgb: EXCEL_REPORT_COLORS.border } },
        },
      });
    }

    // Status colors take priority over the alternating-column treatment.
    if (statusColumnIndex !== undefined) {
      const address = `${XLSX.utils.encode_col(statusColumnIndex)}${row}`;
      const status = safeWorkbookText(worksheet[address]?.v, "");
      const colors = workbookStatusStyle(status);

      styleExcelCell(worksheet, address, {
        fill: { fgColor: { rgb: colors.fill } },
        font: { color: { rgb: colors.font }, bold: true, sz: 10.5 },
        alignment: { horizontal: "center", vertical: "center" },
        border: {
          bottom: { style: "thin", color: { rgb: EXCEL_REPORT_COLORS.border } },
          left: { style: "hair", color: { rgb: EXCEL_REPORT_COLORS.border } },
          right: { style: "hair", color: { rgb: EXCEL_REPORT_COLORS.border } },
        },
      });
    }
  }

  worksheet["!autofilter"] = { ref: `A1:${lastColumn}${lastRow}` };
  worksheet["!freeze"] = { xSplit: 0, ySplit: 1 };
  worksheet["!sheetView"] = [{ showGridLines: false }];
  worksheet["!rows"] = [
    { hpt: 34 },
    ...Array.from({ length: rowCount }, () => ({ hpt: 25 })),
  ];
}

async function generateDriverPerformanceExcel(
  loads: Load[],
  payouts: DriverPayout[],
  monthLabel: string,
): Promise<Blob> {
  const XLSX = await import("xlsx-js-style");
  const workbook = XLSX.utils.book_new();

  const assigned = loads.filter((load) => Boolean(load.assignedDriverId));
  const delivered = assigned.filter((load) => load.status === "Delivered");
  const approved = assigned.filter((load) =>
    Boolean(load.proofOfDelivery?.confirmedAt),
  );
  const payoutTotal = payouts.reduce(
    (sum, payout) => sum + Number(payout.amount || 0),
    0,
  );

  const summarySheet = XLSX.utils.aoa_to_sheet([
    ["SUPRAH AI — DRIVER PERFORMANCE REPORT"],
    [monthLabel],
    ["Generated", new Date().toLocaleString("en-US")],
    [],
    ["Summary Metric", "Value"],
    ["Assigned Loads", assigned.length],
    ["Delivered", delivered.length],
    [
      "Delivery Rate",
      assigned.length > 0 ? delivered.length / assigned.length : 0,
    ],
    ["POD Approved", approved.length],
    ["Total Payouts", payoutTotal],
  ]);
  styleWorkbookSummary(XLSX, summarySheet, 10);
  summarySheet["B8"] = {
    t: "n",
    v: assigned.length > 0 ? delivered.length / assigned.length : 0,
    z: "0%",
  };
  summarySheet["B10"] = {
    t: "n",
    v: payoutTotal,
    z: "$#,##0.00",
  };
  XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");

  const loadRows = assigned.map((load) => ({
    Driver: driverName(load),
    Load: safeWorkbookText(load.loadNumber),
    Vehicle: loadVehicle(load),
    Customer: loadCustomer(load),
    Route: loadRoute(load),
    Status: safeWorkbookText(load.status),
    Delivered: workbookDate(load.deliveredAt),
    POD: load.proofOfDelivery?.confirmedAt
      ? "Approved"
      : load.proofOfDelivery?.submittedAt
        ? "Pending"
        : "Not submitted",
  }));
  const loadSheet = XLSX.utils.json_to_sheet(loadRows);
  setExcelColumns(loadSheet, [27, 20, 28, 27, 38, 17, 18, 19]);
  styleWorkbookData(
    XLSX,
    loadSheet,
    loadRows.length,
    8,
    5,
    [1, 5, 6, 7],
    [],
    [0, 2, 3],
    [],
    [6],
  );

  XLSX.utils.book_append_sheet(workbook, loadSheet, "Driver Activity");

  const payoutRows = payouts.map((payout) => ({
    "Payout #": safeWorkbookText(payout.payoutNumber),
    Driver: safeWorkbookText(payout.driverName),
    Load:
      typeof payout.loadId === "object"
        ? safeWorkbookText(
            payout.loadId.loadNumber || payout.loadId.trackingNumber,
          )
        : safeWorkbookText(payout.loadId),
    Description: safeWorkbookText(payout.description),
    Amount: Number(payout.amount || 0),
    Status: safeWorkbookText(payout.status),
    "Paid At": workbookDate(payout.paidAt),
    "Failure Reason": safeWorkbookText(payout.failureReason),
  }));
  const payoutSheet = XLSX.utils.json_to_sheet(payoutRows);
  setExcelColumns(payoutSheet, [20, 27, 20, 36, 18, 16, 18, 30]);
  styleWorkbookData(
    XLSX,
    payoutSheet,
    payoutRows.length,
    8,
    5,
    [0, 2, 5, 6],
    [4],
    [1],
    [4],
    [6],
  );
  for (let row = 2; row <= payoutRows.length + 1; row += 1) {
    if (payoutSheet[`E${row}`]) payoutSheet[`E${row}`].z = "$#,##0.00";
  }
  XLSX.utils.book_append_sheet(workbook, payoutSheet, "Settlements");

  const output = XLSX.write(workbook, {
    bookType: "xlsx",
    type: "array",
    cellStyles: true,
  });

  return new Blob([output], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

async function generateBillingRevenueExcel(
  payments: Payment[],
  payouts: DriverPayout[],
  monthLabel: string,
): Promise<Blob> {
  const XLSX = await import("xlsx-js-style");
  const workbook = XLSX.utils.book_new();

  const succeeded = payments.filter(
    (payment) => payment.status === "succeeded",
  );
  const pending = payments.filter((payment) =>
    ["pending", "processing"].includes(payment.status),
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

  const summarySheet = XLSX.utils.aoa_to_sheet([
    ["SUPRAH AI — BILLINGS & REVENUE REPORT"],
    [monthLabel],
    ["Generated", new Date().toLocaleString("en-US")],
    [],
    ["Summary Metric", "Value"],
    ["Transactions", payments.length],
    ["Succeeded", succeeded.length],
    ["Gross Revenue", grossRevenue],
    ["Pending Revenue", pendingRevenue],
    ["Driver Costs", driverCosts],
    ["Net Position", netPosition],
  ]);
  styleWorkbookSummary(XLSX, summarySheet, 11);
  for (const cell of ["B8", "B9", "B10", "B11"]) {
    if (summarySheet[cell]) summarySheet[cell].z = "$#,##0.00";
  }
  XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");

  const paymentRows = payments.map((payment) => ({
    Invoice: safeWorkbookText(payment.invoiceNumber),
    Customer: safeWorkbookText(payment.customerName),
    Description: safeWorkbookText(payment.description),
    Amount: Number(payment.amount || 0),
    Status: safeWorkbookText(payment.status),
    Method: safeWorkbookText(payment.paymentMethod),
    "Paid At": workbookDate(payment.paidAt),
    "Due Date": workbookDate(payment.dueDate),
  }));
  const paymentSheet = XLSX.utils.json_to_sheet(paymentRows);
  setExcelColumns(paymentSheet, [20, 28, 38, 18, 16, 20, 18, 18]);
  styleWorkbookData(
    XLSX,
    paymentSheet,
    paymentRows.length,
    8,
    4,
    [0, 4, 5, 6, 7],
    [3],
    [1],
    [3],
    [6, 7],
  );
  for (let row = 2; row <= paymentRows.length + 1; row += 1) {
    if (paymentSheet[`D${row}`]) paymentSheet[`D${row}`].z = "$#,##0.00";
  }
  XLSX.utils.book_append_sheet(workbook, paymentSheet, "Customer Payments");

  const payoutRows = payouts.map((payout) => ({
    Driver: safeWorkbookText(payout.driverName),
    "Payout #": safeWorkbookText(payout.payoutNumber),
    Load:
      typeof payout.loadId === "object"
        ? safeWorkbookText(
            payout.loadId.loadNumber || payout.loadId.trackingNumber,
          )
        : safeWorkbookText(payout.loadId),
    Description: safeWorkbookText(payout.description),
    Amount: Number(payout.amount || 0),
    Status: safeWorkbookText(payout.status),
    "Paid At": workbookDate(payout.paidAt),
  }));
  const payoutSheet = XLSX.utils.json_to_sheet(payoutRows);
  setExcelColumns(payoutSheet, [28, 20, 20, 38, 18, 16, 18]);
  styleWorkbookData(
    XLSX,
    payoutSheet,
    payoutRows.length,
    7,
    5,
    [1, 2, 5, 6],
    [4],
    [0],
    [4],
    [6],
  );
  for (let row = 2; row <= payoutRows.length + 1; row += 1) {
    if (payoutSheet[`E${row}`]) payoutSheet[`E${row}`].z = "$#,##0.00";
  }
  XLSX.utils.book_append_sheet(workbook, payoutSheet, "Driver Payouts");

  const output = XLSX.write(workbook, {
    bookType: "xlsx",
    type: "array",
    cellStyles: true,
  });

  return new Blob([output], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
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

  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [isMultiSelectMode, setIsMultiSelectMode] = React.useState(false);
  const [downloading, setDownloading] = React.useState<string | null>(null);
  const searchQuery = "";
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
  const previousPeriodDate = new Date(selectedYear, selectedMonth - 1, 1);
  const previousMonthLabel = `${MONTHS[previousPeriodDate.getMonth()]} ${previousPeriodDate.getFullYear()}`;

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

  const previousQuotes = React.useMemo(() => {
    const previousKey = `${previousPeriodDate.getFullYear()}-${String(
      previousPeriodDate.getMonth() + 1,
    ).padStart(2, "0")}`;

    return rawQuotes.filter((quote) => quote.createdAt?.startsWith(previousKey));
  }, [rawQuotes, previousPeriodDate]);

  const loadSummary = React.useMemo(() => {
    return buildLoadSummary(filteredLoads);
  }, [filteredLoads]);

  const quoteSummary = React.useMemo(() => {
    return buildQuoteSummary(filteredQuotes);
  }, [filteredQuotes]);

  const revenueTotal = React.useMemo(
    () =>
      (reportData?.payments || [])
        .filter((payment) => payment.status === "succeeded")
        .reduce((total, payment) => total + Number(payment.amount || 0), 0),
    [reportData?.payments],
  );

  const payoutTotal = React.useMemo(
    () =>
      (reportData?.payouts || []).reduce(
        (total, payout) => total + Number(payout.amount || 0),
        0,
      ),
    [reportData?.payouts],
  );

  const previousRevenueTotal = React.useMemo(
    () =>
      (previousReportData?.payments || [])
        .filter((payment) => payment.status === "succeeded")
        .reduce((total, payment) => total + Number(payment.amount || 0), 0),
    [previousReportData?.payments],
  );

  const previousPayoutTotal = React.useMemo(
    () =>
      (previousReportData?.payouts || []).reduce(
        (total, payout) => total + Number(payout.amount || 0),
        0,
      ),
    [previousReportData?.payouts],
  );

  const deliveredLoads =
    reportData?.loads.filter((load) => load.status === "Delivered").length || 0;
  const previousDeliveredLoads =
    previousReportData?.loads.filter((load) => load.status === "Delivered")
      .length || 0;
  const totalLoads = reportData?.loads.length || 0;
  const previousTotalLoads = previousReportData?.loads.length || 0;
  const deliveryRate = totalLoads > 0 ? (deliveredLoads / totalLoads) * 100 : 0;
  const previousDeliveryRate =
    previousTotalLoads > 0
      ? (previousDeliveredLoads / previousTotalLoads) * 100
      : 0;
  const netRevenue = revenueTotal - payoutTotal;
  const previousNetRevenue = previousRevenueTotal - previousPayoutTotal;

  const leadStats = React.useMemo(() => {
    const leads = reportData?.leads ?? [];

    return {
      total: leads.length,
      new: leads.filter((lead) => lead.status === "New").length,
      contacted: leads.filter((lead) => lead.status === "Contacted").length,
      pending: leads.filter((lead) => lead.status === "Pending").length,
      appointment: leads.filter(
        (lead) => lead.status === "Appointment Set",
      ).length,
      closed: leads.filter((lead) => lead.status === "Closed").length,
    };
  }, [reportData?.leads]);



  const previousLeadStats = React.useMemo(() => {
    const leads = previousReportData?.leads ?? [];

    return {
      total: leads.length,
      new: leads.filter((lead) => lead.status === "New").length,
      contacted: leads.filter((lead) => lead.status === "Contacted").length,
      pending: leads.filter((lead) => lead.status === "Pending").length,
      appointment: leads.filter(
        (lead) => lead.status === "Appointment Set",
      ).length,
      closed: leads.filter((lead) => lead.status === "Closed").length,
    };
  }, [previousReportData?.leads]);

  const leadSourceStats = React.useMemo(() => {
    const leads = reportData?.leads ?? [];

    const sourceCounts = leads.reduce<Record<string, number>>((counts, lead) => {
      const source = String(lead.source ?? "").trim() || "Unknown";

      counts[source] = (counts[source] ?? 0) + 1;

      return counts;
    }, {});

    const sources = Object.entries(sourceCounts)
      .map(([source, count]) => ({
        source,
        count,
        percentage:
          leads.length > 0
            ? Math.round((count / leads.length) * 100)
            : 0,
      }))
      .sort((a, b) => b.count - a.count);

    return {
      total: leads.length,
      sources,
      topSource: sources[0]?.source ?? "No source",
      topSourceCount: sources[0]?.count ?? 0,
      uniqueSources: sources.length,
      unknownCount: sourceCounts.Unknown ?? 0,
    };
  }, [reportData?.leads]);

  const previousLeadSourceStats = React.useMemo(() => {
  const leads = previousReportData?.leads ?? [];

  const sourceCounts = leads.reduce<Record<string, number>>(
    (counts, lead) => {
      const source = String(lead.source ?? "").trim() || "Unknown";

      counts[source] = (counts[source] ?? 0) + 1;

      return counts;
    },
    {},
  );

  const sources = Object.entries(sourceCounts)
    .map(([source, count]) => ({
      source,
      count,
    }))
    .sort((a, b) => b.count - a.count);

  return {
    total: leads.length,
    topSource: sources[0]?.source ?? "No source",
    topSourceCount: sources[0]?.count ?? 0,
    uniqueSources: sources.length,
    unknownCount: sourceCounts.Unknown ?? 0,
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

  const succeededPayments =
    reportData?.payments.filter((payment) => payment.status === "succeeded")
      .length || 0;
  const pendingPayments =
    reportData?.payments.filter((payment) =>
      ["pending", "processing"].includes(payment.status),
    ).length || 0;

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
    setDownloading(id);
    try {
      let blob: Blob | null = null;
      const extension = format === "xlsx" ? "xlsx" : "pdf";
      let filename = `Report_${id}_${monthLabel.replace(" ", "_")}.${extension}`;
      let category: ReportFileCategory = "transportation";

      if (id === "load-report") {
        blob =
          format === "xlsx"
            ? await generateShipmentReportExcel(filteredLoads, monthLabel)
            : await generateLoadReportPdf(filteredLoads, monthLabel);
        filename = `Suprah_AI_Unified_Load_Report_${monthLabel.replace(" ", "_")}.${extension}`;
        category = "transportation";
      } else if (id === "quote-report") {
        blob =
          format === "xlsx"
            ? await generateQuoteReportExcel(filteredQuotes, monthLabel)
            : await generateQuoteReportPdf(filteredQuotes, monthLabel);
        filename = `Suprah_AI_Quotes_Drafts_${monthLabel.replace(" ", "_")}.${extension}`;
        category = "transportation";
      } else if (id === "driver-report") {
        blob =
          format === "xlsx"
            ? await generateDriverPerformanceExcel(
                filteredLoads,
                reportData?.payouts || [],
                monthLabel,
              )
            : await generateDriverPerformancePdf(
                filteredLoads,
                reportData?.payouts || [],
                monthLabel,
              );
        filename = `Suprah_AI_Driver_Performance_${monthLabel.replace(" ", "_")}.${extension}`;
        category = "driver";
      } else if (id === "billing-report") {
          blob =
            format === "xlsx"
              ? await generateBillingRevenueExcel(
                  reportData?.payments || [],
                  reportData?.payouts || [],
                  monthLabel,
                )
              : await generateBillingRevenuePdf(
                  reportData?.payments || [],
                  reportData?.payouts || [],
                  monthLabel,
                );

          filename = `Suprah_AI_Billings_Revenue_${monthLabel.replace(
            " ",
            "_",
          )}.${extension}`;

          category = "billings";
        } else if (id === "lead-status-report") {
            blob =
              format === "xlsx"
                ? await generateLeadStatusExcel(
                    reportData?.leads ?? [],
                    monthLabel,
                  )
                : await generateLeadStatusPdf(
                    reportData?.leads ?? [],
                    monthLabel,
                  );

            const safeMonthLabel = monthLabel
              .replace(/\s+/g, "_")
              .replace(/[^\w-]/g, "");

            filename =
              format === "xlsx"
                ? `Suprah_AI_Lead_Status_${safeMonthLabel}.xlsx`
                : `Suprah_AI_Lead_Status_${safeMonthLabel}.pdf`;

            category = "crm";
          } else if (id === "lead-source-report") {
            blob =
              format === "xlsx"
                ? await generateLeadSourceExcel(
                    reportData?.leads ?? [],
                    monthLabel,
                  )
                : await generateLeadSourcePdf(
                    reportData?.leads ?? [],
                    monthLabel,
                  );

            const safeMonthLabel = monthLabel
              .replace(/\s+/g, "_")
              .replace(/[^\w-]/g, "");

            filename =
              format === "xlsx"
                ? `Suprah_AI_Lead_Source_${safeMonthLabel}.xlsx`
                : `Suprah_AI_Lead_Source_${safeMonthLabel}.pdf`;

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
                  Preview, generate, organize, and export operational reports.
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
              label="Gross Revenue"
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
              sub="Revenue after driver payouts"
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
              label="Driver Payouts"
              value={formatCurrency(payoutTotal)}
              sub={`${pendingPayments} payment${pendingPayments === 1 ? "" : "s"} pending`}
              icon={Users}
              color="text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40"
              accentClass="bg-amber-500"
              trend={getTrend(payoutTotal, previousPayoutTotal)}
              inverseTrend
            />
          </div>
        </section>

        <div className="min-w-0">
          <main className="w-full min-w-0 space-y-3.5">
            <div className="flex min-w-0 flex-wrap items-end justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-bold tracking-tight text-foreground sm:text-xl">
                  {activeTab === "ALL" ? "Available Reports" : activeTab}
                </h2>
                <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
                  Showing results for {monthLabel}
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
                    period={monthLabel}
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
                    onPreview={() => setTransportPreview("load")}
                  />
                  <ReportCard
                    title="Quotes & Drafts"
                    subtitle="Sales & Conversion"
                    description="Market quote history, conversion rates and pending logistics drafts."
                    category="Transportation"
                    categoryClass="text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-950/40"
                    period={monthLabel}
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
                    onPreview={() => setTransportPreview("quote")}
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
                  period={monthLabel}
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
                  onPreview={() => setCrmPreview("lead-status")}
                />
              )}

              {(activeTab === "ALL" || activeTab === "CRM") && (
                <ReportCard
                  title="Lead Source Report"
                  subtitle="Lead Acquisition Overview"
                  description="Shows where customer inquiries are coming from and identifies the channels producing the most leads."
                  category="CRM & Leads"
                  categoryClass="text-cyan-600 dark:text-cyan-400 border-cyan-200 dark:border-cyan-500/30 bg-cyan-50 dark:bg-cyan-950/40"
                  period={monthLabel}
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
                  onPreview={() => setCrmPreview("lead-source")}
                />
              )}

              {(activeTab === "ALL" || activeTab === "Driver Reports") && (
                <ReportCard
                  title="Driver Performance"
                  subtitle="Fleet Analytics"
                  description="Individual driver metrics, completion rates and settlement logs."
                  category="Operations"
                  categoryClass="text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-500/30 bg-blue-50 dark:bg-blue-950/40"
                  period={monthLabel}
                  trend={getTrend(payoutTotal, previousPayoutTotal)}
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
                  selectionMode={isMultiSelectMode}
                  isDownloading={downloading === "driver-report"}
                  onToggle={() => toggleSelect("driver-report")}
                  onDownload={(format) => downloadReport("driver-report", format)}
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
                  period={monthLabel}
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
                  selectionMode={isMultiSelectMode}
                  isDownloading={downloading === "billing-report"}
                  onToggle={() => toggleSelect("billing-report")}
                  onDownload={(format) => downloadReport("billing-report", format)}
                  onPreview={() => setPreviewType("BILLING")}
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
                    {formatCurrency(revenueTotal)} gross · {formatCurrency(netRevenue)} net · {succeededPayments} successful · {pendingPayments} pending
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
        monthLabel={monthLabel}
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
        leads={reportData?.leads ?? []}
        monthLabel={monthLabel}
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
        loads={reportData?.loads ?? []}
        payments={reportData?.payments ?? []}
        payouts={reportData?.payouts ?? []}
        monthLabel={monthLabel}
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