import {
  buildReportAnalyticsModel,
  hasReportAnalyticsChartData,
} from "@/components/reports/analytics/report-analytics-data";
import { drawReportAnalyticsCharts } from "@/components/reports/export/report-pdf-analytics";
import type { Payment } from "@/types/billing";
import type { DriverPayout } from "@/types/driver-payout";
import type { ReportExportContextInput } from "@/components/reports/export/report-export-context";
import { normalizeReportExportContext } from "@/components/reports/export/report-export-context";
import {
  displayText,
  formatCurrencyValue,
  formatDateTimeValue,
  payoutLoadNumber,
} from "@/components/reports/export/report-export-formatters";
import {
  buildPaymentStatusSummary,
  buildPayoutStatusSummary,
  getBillingSummary,
  sortPayments,
  sortPayouts,
} from "@/components/reports/finance/shared/billing-report-utils";
import {
  applyFootersToAllPages,
  drawContinuedLabel,
  drawEmptyState,
  drawReportMetadata,
  drawReportPageHeader,
  drawSectionTitle,
  drawSummaryCards,
  ensurePdfSectionSpace,
  formatGeneratedAt,
  getLastAutoTableY,
  generateDocId,
  loadReportLogo,
  TABLE_ALTERNATE_ROW,
  TABLE_BODY_ROW,
  TABLE_BODY_STYLES,
  TABLE_HEAD_STYLES_PRIMARY,
  TABLE_HEAD_STYLES_SECONDARY,
} from "@/utils/reportPdfTemplate";

export async function generateBillingRevenuePdf(
  payments: Payment[],
  payouts: DriverPayout[],
  contextInput: ReportExportContextInput,
): Promise<Blob> {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const doc = new jsPDF({ orientation: "landscape" });
  const context = normalizeReportExportContext(contextInput, {
    reportId: "billing-report",
    title: "Billings & Revenue",
    description:
      "Customer payment activity, payment outcomes, driver payout costs, and revenue after completed driver costs.",
    recordCount: payments.length + payouts.length,
    sectionCounts: {
      "Customer Payment Records": payments.length,
      "Driver Payout Records": payouts.length,
    },
  });
  const summary = getBillingSummary(payments, payouts);
  const sortedPayments = sortPayments(payments);
  const sortedPayouts = sortPayouts(payouts);
  const paymentBreakdown = buildPaymentStatusSummary(payments);
  const payoutBreakdown = buildPayoutStatusSummary(payouts);
  const analyticsModel = buildReportAnalyticsModel({
    reportId: "billing-report",
    periodContext: { label: context.periodLabel },
    payments,
    payouts,
  });
  const logo = await loadReportLogo();
  const docId = generateDocId("BILLING");
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const left = 12;
  const right = pageWidth - 12;
  const contentWidth = right - left;

  const drawHeader = (continued = false) => {
    drawReportPageHeader(doc, {
      reportTitle: context.title,
      orgName: context.organizationName,
      productName: context.productName,
      periodLabel: context.periodLabel,
      subtitle: continued ? undefined : context.description,
      logo,
      pageWidth,
      left,
      right,
    });
    if (continued) drawContinuedLabel(doc, right);
  };

  drawHeader();
  let cursorY = drawReportMetadata(doc, {
    context,
    y: 42,
    left,
    right,
    pageWidth,
  });
  drawSectionTitle(doc, { title: "Executive Summary", y: cursorY, left, right });
  cursorY = drawSummaryCards(doc, {
    y: cursorY + 3,
    left,
    contentWidth,
    maxPerRow: 7,
    valueColor: [124, 58, 237],
    cards: [
      { label: "Revenue Collected", value: formatCurrencyValue(summary.revenueCollected) },
      { label: "Pending Revenue", value: formatCurrencyValue(summary.pendingRevenue) },
      { label: "Failed Value", value: formatCurrencyValue(summary.failedPaymentValue) },
      { label: "Refunded Value", value: formatCurrencyValue(summary.refundedAmount) },
      { label: "Paid Driver Costs", value: formatCurrencyValue(summary.paidDriverCosts) },
      { label: "Pending Driver Costs", value: formatCurrencyValue(summary.pendingDriverCosts) },
      { label: "Revenue After Costs", value: formatCurrencyValue(summary.netPosition) },
    ],
  }) + 7;

  drawSectionTitle(doc, { title: "Financial Breakdown", y: cursorY, left, right });
  autoTable(doc, {
    startY: cursorY + 3,
    head: [["Payment Status", "Transactions", "Amount", "Share", "Payout Status", "Payouts", "Amount", "Share"]],
    body: Array.from({ length: Math.max(paymentBreakdown.length, payoutBreakdown.length, 1) }).map((_, index) => [
      paymentBreakdown[index]?.status ?? "",
      paymentBreakdown[index]?.count ?? "",
      paymentBreakdown[index] ? formatCurrencyValue(paymentBreakdown[index].amount) : "",
      paymentBreakdown[index] ? `${paymentBreakdown[index].percentage.toFixed(1)}%` : "",
      payoutBreakdown[index]?.status ?? "",
      payoutBreakdown[index]?.count ?? "",
      payoutBreakdown[index] ? formatCurrencyValue(payoutBreakdown[index].amount) : "",
      payoutBreakdown[index] ? `${payoutBreakdown[index].percentage.toFixed(1)}%` : "",
    ]),
    margin: { top: 34, left, right, bottom: 18 },
    styles: TABLE_BODY_STYLES,
    headStyles: TABLE_HEAD_STYLES_SECONDARY,
    alternateRowStyles: TABLE_ALTERNATE_ROW,
    bodyStyles: TABLE_BODY_ROW,
    columnStyles: {
      0: { cellWidth: 34 },
      1: { cellWidth: 25, halign: "center" },
      2: { cellWidth: 35, halign: "right" },
      3: { cellWidth: 24, halign: "center" },
      4: { cellWidth: 34 },
      5: { cellWidth: 25, halign: "center" },
      6: { cellWidth: 35, halign: "right" },
      7: { cellWidth: 24, halign: "center" },
    },
    didDrawPage: (data: { pageNumber: number }) => {
      if (data.pageNumber > 1) drawHeader(true);
    },
  });

  cursorY = getLastAutoTableY(doc, cursorY) + 8;
  const hasAnalytics = analyticsModel.charts.some(hasReportAnalyticsChartData);

  if (hasAnalytics) {
    doc.addPage();
    drawHeader(true);
    drawReportAnalyticsCharts(doc, analyticsModel, {
      left,
      right,
      startY: 39,
      pageWidth,
      maxCharts: 2,
    });
  }

  if (sortedPayments.length > 0 || sortedPayouts.length > 0) {
    doc.addPage();
    drawHeader(true);
    cursorY = 35;
  } else {
    cursorY = ensurePdfSectionSpace(doc, {
      currentY: cursorY,
      pageHeight,
      minHeight: 50,
      topY: 35,
      onNewPage: () => drawHeader(true),
    });
  }
  drawSectionTitle(doc, { title: "Customer Payments", y: cursorY, left, right });

  if (sortedPayments.length === 0) {
    drawEmptyState(doc, {
      y: cursorY + 4,
      message: "No customer payment records match the selected filters.",
      sub: "Payment activity will appear here when matching transactions are available.",
      left,
      contentWidth,
      pageWidth,
    });
  } else {
    autoTable(doc, {
      startY: cursorY + 3,
      showHead: "everyPage",
      pageBreak: "auto",
      rowPageBreak: "avoid",
      head: [[
        "Invoice",
        "Customer",
        "Contact",
        "Description",
        "Source",
        "Method",
        "Amount",
        "Status",
        "Paid / Created",
        "Due Date",
      ]],
      body: sortedPayments.map((payment) => [
        displayText(payment.invoiceNumber),
        displayText(payment.customerName, "Unknown Customer"),
        [payment.customerEmail, payment.customerPhone].filter(Boolean).join("\n") || "—",
        displayText(payment.description),
        displayText(payment.source),
        displayText(payment.paymentMethod),
        formatCurrencyValue(payment.amount),
        displayText(payment.status),
        formatDateTimeValue(payment.paidAt || payment.createdAt),
        formatDateTimeValue(payment.dueDate),
      ]),
      margin: { top: 34, left, right, bottom: 18 },
      styles: { ...TABLE_BODY_STYLES, fontSize: 6.35, minCellHeight: 8.5 },
      headStyles: TABLE_HEAD_STYLES_PRIMARY,
      alternateRowStyles: TABLE_ALTERNATE_ROW,
      bodyStyles: TABLE_BODY_ROW,
      columnStyles: {
        0: { cellWidth: 23, halign: "center" },
        1: { cellWidth: 27 },
        2: { cellWidth: 32 },
        3: { cellWidth: 45 },
        4: { cellWidth: 18, halign: "center" },
        5: { cellWidth: 20, halign: "center" },
        6: { cellWidth: 21, halign: "right" },
        7: { cellWidth: 19, halign: "center" },
        8: { cellWidth: 28, halign: "center" },
        9: { cellWidth: 25, halign: "center" },
      },
      didDrawPage: (data: { pageNumber: number }) => {
        if (data.pageNumber > 1) drawHeader(true);
      },
    });
  }

  cursorY = getLastAutoTableY(doc, cursorY + 40) + 8;
  cursorY = ensurePdfSectionSpace(doc, {
    currentY: cursorY,
    pageHeight,
    minHeight: 76,
    topY: 35,
    onNewPage: () => drawHeader(true),
  });
  drawSectionTitle(doc, { title: "Driver Payouts", y: cursorY, left, right });

  if (sortedPayouts.length === 0) {
    drawEmptyState(doc, {
      y: cursorY + 4,
      message: "No driver payout records match the selected filters.",
      sub: "Payout activity will appear here when matching settlements are available.",
      left,
      contentWidth,
      pageWidth,
    });
  } else {
    autoTable(doc, {
      startY: cursorY + 3,
      showHead: "everyPage",
      pageBreak: "auto",
      rowPageBreak: "avoid",
      head: [[
        "Payout #",
        "Driver",
        "Load",
        "Description",
        "Amount",
        "Status",
        "Paid / Created",
        "Failure Reason",
        "Notes",
      ]],
      body: sortedPayouts.map((payout) => [
        displayText(payout.payoutNumber),
        [payout.driverName, payout.driverEmail].filter(Boolean).join("\n") || "—",
        payoutLoadNumber(payout),
        displayText(payout.description),
        formatCurrencyValue(payout.amount),
        displayText(payout.status),
        formatDateTimeValue(payout.paidAt || payout.createdAt),
        displayText(payout.failureReason),
        displayText(payout.notes),
      ]),
      margin: { top: 34, left, right, bottom: 18 },
      styles: { ...TABLE_BODY_STYLES, fontSize: 6.35, minCellHeight: 8.5 },
      headStyles: TABLE_HEAD_STYLES_SECONDARY,
      alternateRowStyles: TABLE_ALTERNATE_ROW,
      bodyStyles: TABLE_BODY_ROW,
      columnStyles: {
        0: { cellWidth: 23, halign: "center" },
        1: { cellWidth: 32 },
        2: { cellWidth: 23, halign: "center" },
        3: { cellWidth: 45 },
        4: { cellWidth: 22, halign: "right" },
        5: { cellWidth: 20, halign: "center" },
        6: { cellWidth: 28, halign: "center" },
        7: { cellWidth: 32 },
        8: { cellWidth: 32 },
      },
      didDrawPage: (data: { pageNumber: number }) => {
        if (data.pageNumber > 1) drawHeader(true);
      },
    });
  }

  applyFootersToAllPages(doc, {
    docId,
    generatedAtLabel: formatGeneratedAt(context.generatedAt),
    reportTitle: context.title,
    orgName: context.organizationName,
    productName: context.productName,
    pageWidth,
    pageHeight,
    left,
    right,
  });
  return doc.output("blob");
}
