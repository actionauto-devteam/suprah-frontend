import {
  buildReportAnalyticsModel,
  hasReportAnalyticsChartData,
} from "@/components/reports/analytics/report-analytics-data";
import { drawReportAnalyticsCharts } from "@/components/reports/export/report-pdf-analytics";
import type { DriverPayout } from "@/types/driver-payout";
import type { Load } from "@/types/load";
import type { ReportExportContextInput } from "@/components/reports/export/report-export-context";
import { normalizeReportExportContext } from "@/components/reports/export/report-export-context";
import {
  displayText,
  formatCurrencyValue,
  formatDateTimeValue,
  formatLoadVehicles,
  formatLocationShort,
  formatNumberValue,
  loadDriverName,
  loadPodStatus,
  payoutLoadNumber,
  payoutRoute,
} from "@/components/reports/export/report-export-formatters";
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
import {
  appendStandardWorkbookSheets,
  createDataSheet,
  createReportAnalyticsSheet,
  type ExcelColumn,
  type SummaryMetric,
  writeWorkbookBlob,
} from "@/components/reports/crm/shared/report-excel-utils";

interface DriverAnalyticsRow {
  driver: string;
  assignedLoads: number;
  deliveredLoads: number;
  deliveryRate: number;
  mileage: number;
  podApproved: number;
  payoutTotal: number;
  paidPayoutTotal: number;
}

function getContext(
  input: ReportExportContextInput,
  loads: Load[],
  payouts: DriverPayout[],
) {
  const assignedCount = loads.filter((load) => Boolean(load.assignedDriverId)).length;
  return normalizeReportExportContext(input, {
    reportId: "driver-report",
    title: "Driver Performance",
    description:
      "Driver workload, delivery completion, route mileage, proof-of-delivery progress, and settlement activity.",
    recordCount: assignedCount + payouts.length,
    sectionCounts: {
      "Assigned Load Records": assignedCount,
      "Settlement Records": payouts.length,
    },
  });
}

function buildDriverAnalytics(
  loads: Load[],
  payouts: DriverPayout[],
): DriverAnalyticsRow[] {
  const rows = new Map<string, DriverAnalyticsRow>();

  loads
    .filter((load) => Boolean(load.assignedDriverId))
    .forEach((load) => {
      const driver = loadDriverName(load);
      const current = rows.get(driver) ?? {
        driver,
        assignedLoads: 0,
        deliveredLoads: 0,
        deliveryRate: 0,
        mileage: 0,
        podApproved: 0,
        payoutTotal: 0,
        paidPayoutTotal: 0,
      };
      current.assignedLoads += 1;
      if (load.status === "Delivered") current.deliveredLoads += 1;
      current.mileage += Number(load.pricing?.miles || 0);
      if (load.proofOfDelivery?.confirmedAt) current.podApproved += 1;
      rows.set(driver, current);
    });

  payouts.forEach((payout) => {
    const driver = displayText(payout.driverName || payout.driverEmail, "Unknown Driver");
    const current = rows.get(driver) ?? {
      driver,
      assignedLoads: 0,
      deliveredLoads: 0,
      deliveryRate: 0,
      mileage: 0,
      podApproved: 0,
      payoutTotal: 0,
      paidPayoutTotal: 0,
    };
    const amount = Number(payout.amount || 0);
    current.payoutTotal += amount;
    if (payout.status === "paid") current.paidPayoutTotal += amount;
    rows.set(driver, current);
  });

  return Array.from(rows.values())
    .map((row) => ({
      ...row,
      deliveryRate:
        row.assignedLoads > 0
          ? (row.deliveredLoads / row.assignedLoads) * 100
          : 0,
    }))
    .sort(
      (first, second) =>
        second.deliveredLoads - first.deliveredLoads ||
        second.assignedLoads - first.assignedLoads ||
        first.driver.localeCompare(second.driver),
    );
}

export async function generateDriverPerformancePdf(
  loads: Load[],
  payouts: DriverPayout[],
  contextInput: ReportExportContextInput,
): Promise<Blob> {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const doc = new jsPDF({ orientation: "landscape" });
  const assignedLoads = loads.filter((load) => Boolean(load.assignedDriverId));
  const delivered = assignedLoads.filter((load) => load.status === "Delivered");
  const podApproved = assignedLoads.filter((load) => Boolean(load.proofOfDelivery?.confirmedAt));
  const podPending = assignedLoads.filter(
    (load) => load.proofOfDelivery?.submittedAt && !load.proofOfDelivery?.confirmedAt,
  );
  const totalMiles = assignedLoads.reduce(
    (sum, load) => sum + Number(load.pricing?.miles || 0),
    0,
  );
  const paidPayoutTotal = payouts
    .filter((payout) => payout.status === "paid")
    .reduce((sum, payout) => sum + Number(payout.amount || 0), 0);
  const deliveryRate =
    assignedLoads.length > 0
      ? (delivered.length / assignedLoads.length) * 100
      : 0;
  const context = getContext(contextInput, loads, payouts);
  const analytics = buildDriverAnalytics(loads, payouts);
  const analyticsModel = buildReportAnalyticsModel({
    reportId: "driver-report",
    periodContext: { label: context.periodLabel },
    loads,
    payouts,
  });
  const logo = await loadReportLogo();
  const docId = generateDocId("DRIVER");
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
    valueColor: [37, 99, 235],
    cards: [
      { label: "Assigned Loads", value: String(assignedLoads.length) },
      { label: "Delivered", value: String(delivered.length) },
      { label: "Delivery Rate", value: `${deliveryRate.toFixed(1)}%` },
      { label: "Total Miles", value: formatNumberValue(totalMiles) },
      { label: "POD Approved", value: String(podApproved.length) },
      { label: "POD Pending", value: String(podPending.length) },
      { label: "Paid Settlements", value: formatCurrencyValue(paidPayoutTotal) },
    ],
  }) + 7;

  drawSectionTitle(doc, { title: "Driver Analytics", y: cursorY, left, right });
  autoTable(doc, {
    startY: cursorY + 3,
    head: [[
      "Driver",
      "Assigned",
      "Delivered",
      "Delivery Rate",
      "Mileage",
      "POD Approved",
      "All Settlements",
      "Paid Settlements",
    ]],
    body:
      analytics.length > 0
        ? analytics.map((row) => [
            row.driver,
            row.assignedLoads,
            row.deliveredLoads,
            `${row.deliveryRate.toFixed(1)}%`,
            formatNumberValue(row.mileage),
            row.podApproved,
            formatCurrencyValue(row.payoutTotal),
            formatCurrencyValue(row.paidPayoutTotal),
          ])
        : [["No driver activity", 0, 0, "0.0%", 0, 0, "$0", "$0"]],
    margin: { top: 34, left, right, bottom: 18 },
    styles: TABLE_BODY_STYLES,
    headStyles: TABLE_HEAD_STYLES_SECONDARY,
    alternateRowStyles: TABLE_ALTERNATE_ROW,
    bodyStyles: TABLE_BODY_ROW,
    columnStyles: {
      0: { cellWidth: 48 },
      1: { cellWidth: 25, halign: "center" },
      2: { cellWidth: 25, halign: "center" },
      3: { cellWidth: 30, halign: "center" },
      4: { cellWidth: 30, halign: "right" },
      5: { cellWidth: 28, halign: "center" },
      6: { cellWidth: 35, halign: "right" },
      7: { cellWidth: 35, halign: "right" },
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

  if (assignedLoads.length > 0 || payouts.length > 0) {
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
  drawSectionTitle(doc, { title: "Driver Load Activity", y: cursorY, left, right });

  if (assignedLoads.length === 0) {
    drawEmptyState(doc, {
      y: cursorY + 4,
      message: "No assigned load records match the selected filters.",
      sub: "Change the report period or filters to include driver load activity.",
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
        "Driver",
        "Load #",
        "Vehicle",
        "Origin",
        "Destination",
        "Status",
        "Miles",
        "Assigned",
        "Delivered",
        "POD",
      ]],
      body: assignedLoads.map((load) => [
        loadDriverName(load),
        displayText(load.loadNumber),
        formatLoadVehicles(load),
        formatLocationShort(load.pickupLocation),
        formatLocationShort(load.deliveryLocation),
        displayText(load.status),
        formatNumberValue(load.pricing?.miles),
        formatDateTimeValue(load.assignedAt),
        formatDateTimeValue(load.deliveredAt),
        loadPodStatus(load),
      ]),
      margin: { top: 34, left, right, bottom: 18 },
      styles: { ...TABLE_BODY_STYLES, fontSize: 6.35, minCellHeight: 8.5 },
      headStyles: TABLE_HEAD_STYLES_PRIMARY,
      alternateRowStyles: TABLE_ALTERNATE_ROW,
      bodyStyles: TABLE_BODY_ROW,
      columnStyles: {
        0: { cellWidth: 31 },
        1: { cellWidth: 22, halign: "center" },
        2: { cellWidth: 32 },
        3: { cellWidth: 28 },
        4: { cellWidth: 28 },
        5: { cellWidth: 21, halign: "center" },
        6: { cellWidth: 18, halign: "right" },
        7: { cellWidth: 28, halign: "center" },
        8: { cellWidth: 28, halign: "center" },
        9: { cellWidth: 26, halign: "center" },
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
  drawSectionTitle(doc, { title: "Driver Settlements", y: cursorY, left, right });

  if (payouts.length === 0) {
    drawEmptyState(doc, {
      y: cursorY + 4,
      message: "No driver settlement records match the selected filters.",
      sub: "Settlement activity will appear here once driver payouts are available.",
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
        "Route",
        "Description",
        "Amount",
        "Status",
        "Paid At",
        "Failure / Notes",
      ]],
      body: payouts.map((payout) => [
        displayText(payout.payoutNumber),
        [payout.driverName, payout.driverEmail].filter(Boolean).join("\n") || "—",
        payoutLoadNumber(payout),
        payoutRoute(payout),
        displayText(payout.description),
        formatCurrencyValue(payout.amount),
        displayText(payout.status),
        formatDateTimeValue(payout.paidAt),
        [payout.failureReason, payout.notes].filter(Boolean).join("\n") || "—",
      ]),
      margin: { top: 34, left, right, bottom: 18 },
      styles: { ...TABLE_BODY_STYLES, fontSize: 6.35, minCellHeight: 8.5 },
      headStyles: TABLE_HEAD_STYLES_SECONDARY,
      alternateRowStyles: TABLE_ALTERNATE_ROW,
      bodyStyles: TABLE_BODY_ROW,
      columnStyles: {
        0: { cellWidth: 23, halign: "center" },
        1: { cellWidth: 32 },
        2: { cellWidth: 22, halign: "center" },
        3: { cellWidth: 38 },
        4: { cellWidth: 45 },
        5: { cellWidth: 22, halign: "right" },
        6: { cellWidth: 19, halign: "center" },
        7: { cellWidth: 27, halign: "center" },
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

export async function generateDriverPerformanceExcel(
  loads: Load[],
  payouts: DriverPayout[],
  contextInput: ReportExportContextInput,
): Promise<Blob> {
  const XLSX = await import("xlsx-js-style");
  const workbook = XLSX.utils.book_new();
  const assignedLoads = loads.filter((load) => Boolean(load.assignedDriverId));
  const delivered = assignedLoads.filter((load) => load.status === "Delivered");
  const podApproved = assignedLoads.filter((load) => Boolean(load.proofOfDelivery?.confirmedAt));
  const podPending = assignedLoads.filter(
    (load) => load.proofOfDelivery?.submittedAt && !load.proofOfDelivery?.confirmedAt,
  );
  const totalMiles = assignedLoads.reduce(
    (sum, load) => sum + Number(load.pricing?.miles || 0),
    0,
  );
  const payoutTotal = payouts.reduce(
    (sum, payout) => sum + Number(payout.amount || 0),
    0,
  );
  const paidPayoutTotal = payouts
    .filter((payout) => payout.status === "paid")
    .reduce((sum, payout) => sum + Number(payout.amount || 0), 0);
  const context = getContext(contextInput, loads, payouts);
  const analyticsModel = buildReportAnalyticsModel({
    reportId: "driver-report",
    periodContext: { label: context.periodLabel },
    loads,
    payouts,
  });

  const loadColumns: ExcelColumn<Load>[] = [
    { label: "Driver", width: 30, value: loadDriverName },
    { label: "Load #", width: 18, value: (load) => load.loadNumber },
    { label: "Vehicle", width: 40, value: formatLoadVehicles },
    { label: "Origin", width: 28, value: (load) => formatLocationShort(load.pickupLocation) },
    { label: "Destination", width: 28, value: (load) => formatLocationShort(load.deliveryLocation) },
    { label: "Status", width: 16, value: (load) => load.status, type: "status", align: "center" },
    { label: "Mileage", width: 14, value: (load) => load.pricing?.miles ?? 0, type: "number", align: "right" },
    { label: "Assigned", width: 20, value: (load) => load.assignedAt, type: "datetime" },
    { label: "Accepted", width: 20, value: (load) => load.acceptedAt || load.driverAcceptedAt, type: "datetime" },
    { label: "Picked Up", width: 20, value: (load) => load.pickedUpAt, type: "datetime" },
    { label: "Delivered", width: 20, value: (load) => load.deliveredAt, type: "datetime" },
    { label: "POD Status", width: 18, value: loadPodStatus, type: "status", align: "center" },
    { label: "POD Submitted", width: 20, value: (load) => load.proofOfDelivery?.submittedAt, type: "datetime" },
    { label: "POD Confirmed", width: 20, value: (load) => load.proofOfDelivery?.confirmedAt, type: "datetime" },
    { label: "POD Note", width: 44, value: (load) => load.proofOfDelivery?.note },
  ];

  const payoutColumns: ExcelColumn<DriverPayout>[] = [
    { label: "Payout #", width: 18, value: (payout) => payout.payoutNumber },
    { label: "Driver", width: 28, value: (payout) => payout.driverName },
    { label: "Driver Email", width: 32, value: (payout) => payout.driverEmail },
    { label: "Load", width: 20, value: payoutLoadNumber },
    { label: "Route", width: 38, value: payoutRoute },
    { label: "Description", width: 48, value: (payout) => payout.description },
    { label: "Amount", width: 16, value: (payout) => payout.amount, type: "currency", align: "right" },
    { label: "Currency", width: 12, value: (payout) => payout.currency },
    { label: "Status", width: 16, value: (payout) => payout.status, type: "status", align: "center" },
    { label: "Paid At", width: 20, value: (payout) => payout.paidAt, type: "datetime" },
    { label: "Failure Reason", width: 38, value: (payout) => payout.failureReason },
    { label: "Notes", width: 44, value: (payout) => payout.notes },
    { label: "Created", width: 20, value: (payout) => payout.createdAt, type: "datetime" },
    { label: "Updated", width: 20, value: (payout) => payout.updatedAt, type: "datetime" },
  ];

  const metrics: SummaryMetric[] = [
    { label: "Assigned Loads", value: assignedLoads.length, type: "number", description: "Filtered load records with an assigned driver." },
    { label: "Delivered Loads", value: delivered.length, type: "number", description: "Assigned loads marked Delivered." },
    { label: "Delivery Rate", value: assignedLoads.length ? delivered.length / assignedLoads.length : 0, type: "percentage", description: "Delivered assigned loads compared with all assigned loads." },
    { label: "Total Mileage", value: totalMiles, type: "number", description: "Mileage across assigned load activity." },
    { label: "POD Approved", value: podApproved.length, type: "number", description: "Loads with dealer-confirmed proof of delivery." },
    { label: "POD Pending Approval", value: podPending.length, type: "number", description: "Submitted proofs of delivery awaiting confirmation." },
    { label: "All Settlement Value", value: payoutTotal, type: "currency", description: "Value of every filtered driver payout record." },
    { label: "Paid Settlement Value", value: paidPayoutTotal, type: "currency", description: "Value of payouts marked Paid." },
  ];

  appendStandardWorkbookSheets({
    XLSX,
    workbook,
    context,
    summaryMetrics: metrics,
    detailSheet: createDataSheet(XLSX, assignedLoads, loadColumns, "No assigned driver load records match the selected filters."),
    analyticsSheet: createReportAnalyticsSheet(XLSX, analyticsModel),
    extraSheets: [
      {
        name: "Driver Settlements",
        sheet: createDataSheet(XLSX, payouts, payoutColumns, "No driver settlement records match the selected filters."),
      },
    ],
  });
  return writeWorkbookBlob(XLSX, workbook);
}
