import {
  buildReportAnalyticsModel,
  hasReportAnalyticsChartData,
} from "@/components/reports/analytics/report-analytics-data";
import { drawReportAnalyticsCharts } from "@/components/reports/export/report-pdf-analytics";
import type { Load } from "@/types/load";
import type { Quote } from "@/types/transportation";
import type { ReportExportContextInput } from "@/components/reports/export/report-export-context";
import {
  normalizeReportExportContext,
} from "@/components/reports/export/report-export-context";
import {
  countBy,
  displayText,
  formatCurrencyValue,
  formatDateTimeValue,
  formatDateValue,
  formatLoadVehicles,
  formatLoadVins,
  formatLocation,
  formatNumberValue,
  loadDriverName,
  loadPodStatus,
  loadPrimaryContact,
  loadPrimaryContactDetails,
  loadRateValue,
  quoteCondition,
  quoteContact,
  quoteCustomerName,
  quoteEta,
  quoteStockNumber,
  quoteTrailer,
  quoteVehicleDescription,
  quoteVin,
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
import {
  buildLoadSummary,
  buildQuoteSummary,
} from "@/lib/transportation-reports";

function loadContext(
  input: ReportExportContextInput,
  loads: Load[],
) {
  return normalizeReportExportContext(input, {
    reportId: "load-report",
    title: "Unified Load Report",
    description:
      "Operational load activity, customer contacts, vehicles, routes, pricing, timelines, drivers, and proof-of-delivery status.",
    recordCount: loads.length,
    sectionCounts: { "Load Records": loads.length },
  });
}

function quoteContext(
  input: ReportExportContextInput,
  quotes: Quote[],
) {
  return normalizeReportExportContext(input, {
    reportId: "quote-report",
    title: "Quotes & Drafts",
    description:
      "Quote and draft activity covering customer contacts, vehicles, routes, pricing, transport requirements, and conversion status.",
    recordCount: quotes.length,
    sectionCounts: { "Quote Records": quotes.length },
  });
}

export async function generateLoadReportPdf(
  loads: Load[],
  contextInput: ReportExportContextInput,
): Promise<Blob> {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const doc = new jsPDF({ orientation: "landscape" });
  const context = loadContext(contextInput, loads);
  const summary = buildLoadSummary(loads);
  const analyticsModel = buildReportAnalyticsModel({
    reportId: "load-report",
    loads,
    periodContext: { label: context.periodLabel },
  });
  const logo = await loadReportLogo();
  const docId = generateDocId("LOAD");
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

  drawSectionTitle(doc, {
    title: "Executive Summary",
    y: cursorY,
    left,
    right,
  });
  cursorY = drawSummaryCards(doc, {
    y: cursorY + 3,
    left,
    contentWidth,
    maxPerRow: 6,
    cards: [
      { label: "Total Loads", value: String(summary.total) },
      { label: "Delivered", value: String(summary.delivered) },
      { label: "In Transit", value: String(summary.inTransit) },
      { label: "Total Miles", value: formatNumberValue(summary.totalMiles) },
      { label: "Load Revenue", value: formatCurrencyValue(summary.totalRate) },
      { label: "Delivery Rate", value: `${summary.onTimeRate}%` },
    ],
  }) + 7;

  const statusBreakdown = countBy(loads, (load) => load.status);
  const trailerBreakdown = countBy(loads, (load) => load.trailerType || "Open");

  drawSectionTitle(doc, {
    title: "Operational Breakdown",
    y: cursorY,
    left,
    right,
  });
  autoTable(doc, {
    startY: cursorY + 3,
    head: [["Load Status", "Loads", "Share", "Transport Type", "Loads", "Share"]],
    body: Array.from({
      length: Math.max(statusBreakdown.length, trailerBreakdown.length, 1),
    }).map((_, index) => [
      statusBreakdown[index]?.label ?? "",
      statusBreakdown[index]?.count ?? "",
      statusBreakdown[index]
        ? `${statusBreakdown[index].percentage.toFixed(1)}%`
        : "",
      trailerBreakdown[index]?.label ?? "",
      trailerBreakdown[index]?.count ?? "",
      trailerBreakdown[index]
        ? `${trailerBreakdown[index].percentage.toFixed(1)}%`
        : "",
    ]),
    margin: { top: 34, left, right: pageWidth - right, bottom: 18 },
    styles: TABLE_BODY_STYLES,
    headStyles: TABLE_HEAD_STYLES_SECONDARY,
    alternateRowStyles: TABLE_ALTERNATE_ROW,
    bodyStyles: TABLE_BODY_ROW,
    columnStyles: {
      0: { cellWidth: 42 },
      1: { cellWidth: 22, halign: "center" },
      2: { cellWidth: 22, halign: "center" },
      3: { cellWidth: 42 },
      4: { cellWidth: 22, halign: "center" },
      5: { cellWidth: 22, halign: "center" },
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

  if (loads.length > 0) {
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

  drawSectionTitle(doc, {
    title: "Detailed Load Records",
    y: cursorY,
    left,
    right,
  });

  if (loads.length === 0) {
    drawEmptyState(doc, {
      y: cursorY + 4,
      message: "No load records match the selected filters.",
      sub: "Change the report period or filters to include load activity.",
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
        "Load #",
        "Status",
        "Customer / Contact",
        "Vehicles",
        "VINs",
        "Origin",
        "Destination",
        "Trailer",
        "Miles",
        "Load Rate",
        "Driver",
      ]],
      body: loads.map((load) => [
        displayText(load.loadNumber),
        displayText(load.status),
        loadPrimaryContactDetails(load),
        formatLoadVehicles(load),
        formatLoadVins(load),
        formatLocation(load.pickupLocation),
        formatLocation(load.deliveryLocation),
        displayText(load.trailerType, "Open"),
        formatNumberValue(load.pricing?.miles),
        formatCurrencyValue(loadRateValue(load)),
        loadDriverName(load),
      ]),
      margin: { top: 34, left, right: pageWidth - right, bottom: 18 },
      styles: { ...TABLE_BODY_STYLES, fontSize: 6.2, minCellHeight: 8.5 },
      headStyles: { ...TABLE_HEAD_STYLES_PRIMARY, fontSize: 6.45 },
      alternateRowStyles: TABLE_ALTERNATE_ROW,
      bodyStyles: TABLE_BODY_ROW,
      columnStyles: {
        0: { cellWidth: 19, halign: "center" },
        1: { cellWidth: 18, halign: "center" },
        2: { cellWidth: 27 },
        3: { cellWidth: 28 },
        4: { cellWidth: 27 },
        5: { cellWidth: 31 },
        6: { cellWidth: 31 },
        7: { cellWidth: 16, halign: "center" },
        8: { cellWidth: 15, halign: "right" },
        9: { cellWidth: 20, halign: "right" },
        10: { cellWidth: 25 },
      },
      didDrawPage: (data: { pageNumber: number }) => {
        if (data.pageNumber > 1) drawHeader(true);
      },
    });

    cursorY = getLastAutoTableY(doc, cursorY) + 8;
    cursorY = ensurePdfSectionSpace(doc, {
      currentY: cursorY,
      pageHeight,
      minHeight: 72,
      topY: 35,
      onNewPage: () => drawHeader(true),
    });

    drawSectionTitle(doc, {
      title: "Load Timeline & Proof of Delivery",
      y: cursorY,
      left,
      right,
    });
    autoTable(doc, {
      startY: cursorY + 3,
      showHead: "everyPage",
      pageBreak: "auto",
      rowPageBreak: "avoid",
      head: [[
        "Load #",
        "Created",
        "Assigned",
        "Accepted",
        "Picked Up",
        "Delivered",
        "POD Status",
        "POD Submitted",
        "POD Confirmed",
      ]],
      body: loads.map((load) => [
        displayText(load.loadNumber),
        formatDateTimeValue(load.createdAt),
        formatDateTimeValue(load.assignedAt),
        formatDateTimeValue(load.acceptedAt || load.driverAcceptedAt),
        formatDateTimeValue(load.pickedUpAt),
        formatDateTimeValue(load.deliveredAt),
        loadPodStatus(load),
        formatDateTimeValue(load.proofOfDelivery?.submittedAt),
        formatDateTimeValue(load.proofOfDelivery?.confirmedAt),
      ]),
      margin: { top: 34, left, right: pageWidth - right, bottom: 18 },
      styles: { ...TABLE_BODY_STYLES, fontSize: 6.2 },
      headStyles: TABLE_HEAD_STYLES_SECONDARY,
      alternateRowStyles: TABLE_ALTERNATE_ROW,
      bodyStyles: TABLE_BODY_ROW,
      columnStyles: {
        0: { cellWidth: 23, halign: "center" },
        1: { cellWidth: 29, halign: "center" },
        2: { cellWidth: 29, halign: "center" },
        3: { cellWidth: 29, halign: "center" },
        4: { cellWidth: 29, halign: "center" },
        5: { cellWidth: 29, halign: "center" },
        6: { cellWidth: 26, halign: "center" },
        7: { cellWidth: 29, halign: "center" },
        8: { cellWidth: 29, halign: "center" },
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

export async function generateQuoteReportPdf(
  quotes: Quote[],
  contextInput: ReportExportContextInput,
): Promise<Blob> {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const doc = new jsPDF({ orientation: "landscape" });
  const context = quoteContext(contextInput, quotes);
  const summary = buildQuoteSummary(quotes);
  const analyticsModel = buildReportAnalyticsModel({
    reportId: "quote-report",
    quotes,
    periodContext: { label: context.periodLabel },
  });
  const logo = await loadReportLogo();
  const docId = generateDocId("QUOTE");
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
    maxPerRow: 6,
    valueColor: [217, 119, 6],
    cards: [
      { label: "Total Quotes", value: String(summary.total) },
      { label: "Booked", value: String(summary.booked) },
      { label: "Pending", value: String(summary.pending) },
      { label: "Conversion", value: `${summary.conversionRate}%` },
      { label: "Total Value", value: formatCurrencyValue(summary.totalRate) },
      { label: "Average Rate", value: formatCurrencyValue(summary.avgRate) },
    ],
  }) + 7;

  const statusBreakdown = countBy(quotes, (quote) => quote.status);
  const trailerBreakdown = countBy(quotes, quoteTrailer);
  drawSectionTitle(doc, { title: "Quote Breakdown", y: cursorY, left, right });
  autoTable(doc, {
    startY: cursorY + 3,
    head: [["Quote Status", "Quotes", "Share", "Trailer", "Quotes", "Share"]],
    body: Array.from({ length: Math.max(statusBreakdown.length, trailerBreakdown.length, 1) }).map((_, index) => [
      statusBreakdown[index]?.label ?? "",
      statusBreakdown[index]?.count ?? "",
      statusBreakdown[index] ? `${statusBreakdown[index].percentage.toFixed(1)}%` : "",
      trailerBreakdown[index]?.label ?? "",
      trailerBreakdown[index]?.count ?? "",
      trailerBreakdown[index] ? `${trailerBreakdown[index].percentage.toFixed(1)}%` : "",
    ]),
    margin: { top: 34, left, right: pageWidth - right, bottom: 18 },
    tableWidth: contentWidth,
    styles: {
      ...TABLE_BODY_STYLES,
      overflow: "linebreak",
      valign: "middle",
    },
    headStyles: TABLE_HEAD_STYLES_SECONDARY,
    alternateRowStyles: TABLE_ALTERNATE_ROW,
    bodyStyles: TABLE_BODY_ROW,
    columnStyles: {
      0: { cellWidth: contentWidth * 0.27 },
      1: { cellWidth: contentWidth * 0.11, halign: "center" },
      2: { cellWidth: contentWidth * 0.12, halign: "center" },
      3: { cellWidth: contentWidth * 0.27 },
      4: { cellWidth: contentWidth * 0.11, halign: "center" },
      5: { cellWidth: contentWidth * 0.12, halign: "center" },
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

  if (quotes.length > 0) {
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
  drawSectionTitle(doc, { title: "Detailed Quote Records", y: cursorY, left, right });

  if (quotes.length === 0) {
    drawEmptyState(doc, {
      y: cursorY + 4,
      message: "No quote records match the selected filters.",
      sub: "Change the report period or filters to include quote activity.",
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
        "Customer",
        "Contact",
        "Vehicle",
        "VIN / Stock",
        "Origin",
        "Destination",
        "Miles",
        "Rate",
        "Trailer",
        "Condition",
        "Units",
        "Status",
        "Created",
      ]],
      body: quotes.map((quote) => [
        quoteCustomerName(quote),
        quoteContact(quote),
        quoteVehicleDescription(quote),
        `${quoteVin(quote)}\nStock: ${quoteStockNumber(quote)}`,
        displayText(quote.fromAddress || quote.fromZip),
        displayText(quote.toAddress || quote.toZip),
        formatNumberValue(quote.miles),
        formatCurrencyValue(quote.rate),
        quoteTrailer(quote),
        quoteCondition(quote),
        String(quote.units || 1),
        displayText(quote.status),
        formatDateValue(quote.createdAt),
      ]),
      margin: { top: 34, left, right: pageWidth - right, bottom: 18 },
      styles: { ...TABLE_BODY_STYLES, fontSize: 6.1, minCellHeight: 8.5 },
      headStyles: { ...TABLE_HEAD_STYLES_PRIMARY, fontSize: 6.35 },
      alternateRowStyles: TABLE_ALTERNATE_ROW,
      bodyStyles: TABLE_BODY_ROW,
      columnStyles: {
        0: { cellWidth: 22 },
        1: { cellWidth: 25 },
        2: { cellWidth: 25, halign: "center" },
        3: { cellWidth: 25 },
        4: { cellWidth: 27 },
        5: { cellWidth: 27 },
        6: { cellWidth: 14, halign: "right" },
        7: { cellWidth: 17, halign: "right" },
        8: { cellWidth: 15, halign: "center" },
        9: { cellWidth: 17, halign: "center" },
        10: { cellWidth: 12, halign: "center" },
        11: { cellWidth: 17, halign: "center" },
        12: { cellWidth: 20, halign: "center" },
      },
      didDrawPage: (data: { pageNumber: number }) => {
        if (data.pageNumber > 1) drawHeader(true);
      },
    });

    cursorY = getLastAutoTableY(doc, cursorY) + 8;
    cursorY = ensurePdfSectionSpace(doc, {
      currentY: cursorY,
      pageHeight,
      minHeight: 70,
      topY: 35,
      onNewPage: () => drawHeader(true),
    });
    drawSectionTitle(doc, { title: "Quote Delivery Expectations", y: cursorY, left, right });
    autoTable(doc, {
      startY: cursorY + 3,
      head: [["Customer", "Route", "ETA", "Vehicle Location", "Created By", "Organization"]],
      body: quotes.map((quote) => [
        quoteCustomerName(quote),
        `${displayText(quote.fromAddress || quote.fromZip)} → ${displayText(quote.toAddress || quote.toZip)}`,
        quoteEta(quote),
        displayText(quote.vehicleLocation),
        displayText(quote.createdBy?.name || quote.createdBy?.email),
        displayText(quote.organization?.name),
      ]),
      margin: { top: 34, left, right: pageWidth - right, bottom: 18 },
      styles: TABLE_BODY_STYLES,
      headStyles: TABLE_HEAD_STYLES_SECONDARY,
      alternateRowStyles: TABLE_ALTERNATE_ROW,
      bodyStyles: TABLE_BODY_ROW,
      columnStyles: {
        0: { cellWidth: 34 },
        1: { cellWidth: 84 },
        2: { cellWidth: 25, halign: "center" },
        3: { cellWidth: 35 },
        4: { cellWidth: 38 },
        5: { cellWidth: 38 },
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

export async function generateShipmentReportPdf(
  loads: Load[],
  context: ReportExportContextInput,
): Promise<Blob> {
  return generateLoadReportPdf(loads, context);
}

export async function generateShipmentReportExcel(
  loads: Load[],
  contextInput: ReportExportContextInput,
): Promise<Blob> {
  const XLSX = await import("xlsx-js-style");
  const workbook = XLSX.utils.book_new();
  const context = loadContext(contextInput, loads);
  const summary = buildLoadSummary(loads);
  const analyticsModel = buildReportAnalyticsModel({
    reportId: "load-report",
    periodContext: { label: context.periodLabel },
    loads,
  });

  const detailColumns: ExcelColumn<Load>[] = [
    { label: "Load #", width: 18, value: (load) => load.loadNumber },
    { label: "Status", width: 16, value: (load) => load.status, type: "status", align: "center" },
    { label: "Customer / Primary Contact", width: 28, value: loadPrimaryContact },
    { label: "Contact Details", width: 38, value: loadPrimaryContactDetails },
    { label: "Vehicles", width: 42, value: formatLoadVehicles },
    { label: "VINs", width: 34, value: formatLoadVins },
    { label: "Origin", width: 42, value: (load) => formatLocation(load.pickupLocation) },
    { label: "Destination", width: 42, value: (load) => formatLocation(load.deliveryLocation) },
    { label: "Trailer", width: 16, value: (load) => load.trailerType || "Open" },
    { label: "Mileage", width: 14, value: (load) => load.pricing?.miles ?? 0, type: "number", align: "right" },
    { label: "Load Rate", width: 16, value: loadRateValue, type: "currency", align: "right" },
    { label: "Carrier Pay", width: 16, value: (load) => load.pricing?.carrierPayAmount ?? 0, type: "currency", align: "right" },
    { label: "Estimated Rate", width: 16, value: (load) => load.pricing?.estimatedRate ?? 0, type: "currency", align: "right" },
    { label: "COD / COP", width: 16, value: (load) => load.pricing?.copCodAmount ?? 0, type: "currency", align: "right" },
    { label: "Driver", width: 28, value: loadDriverName },
    { label: "Created", width: 20, value: (load) => load.createdAt, type: "datetime" },
    { label: "Assigned", width: 20, value: (load) => load.assignedAt, type: "datetime" },
    { label: "Picked Up", width: 20, value: (load) => load.pickedUpAt, type: "datetime" },
    { label: "Delivered", width: 20, value: (load) => load.deliveredAt, type: "datetime" },
    { label: "POD Status", width: 18, value: loadPodStatus, type: "status", align: "center" },
    { label: "POD Submitted", width: 20, value: (load) => load.proofOfDelivery?.submittedAt, type: "datetime" },
    { label: "POD Confirmed", width: 20, value: (load) => load.proofOfDelivery?.confirmedAt, type: "datetime" },
  ];

  const vehicleRows = loads.flatMap((load) =>
    load.vehicles.map((vehicle, index) => ({ load, vehicle, index })),
  );
  const vehicleColumns: ExcelColumn<(typeof vehicleRows)[number]>[] = [
    { label: "Load #", width: 18, value: ({ load }) => load.loadNumber },
    { label: "Vehicle #", width: 12, value: ({ index }) => index + 1, type: "number", align: "center" },
    { label: "Year", width: 10, value: ({ vehicle }) => vehicle.year, type: "number", align: "center" },
    { label: "Make", width: 18, value: ({ vehicle }) => vehicle.make },
    { label: "Model", width: 22, value: ({ vehicle }) => vehicle.model },
    { label: "VIN", width: 26, value: ({ vehicle }) => vehicle.vin },
    { label: "Color", width: 14, value: ({ vehicle }) => vehicle.color },
    { label: "Condition", width: 16, value: ({ vehicle }) => vehicle.condition, type: "status" },
    { label: "Vehicle Type", width: 18, value: ({ vehicle }) => vehicle.vehicleType },
    { label: "Lot #", width: 16, value: ({ vehicle }) => vehicle.lotNumber },
    { label: "License Plate", width: 18, value: ({ vehicle }) => vehicle.licensePlate },
    { label: "License State", width: 14, value: ({ vehicle }) => vehicle.licenseState },
    { label: "Carrier Notes", width: 48, value: ({ vehicle }) => vehicle.carrierNotes },
  ];

  const metrics: SummaryMetric[] = [
    { label: "Total Loads", value: summary.total, type: "number", description: "All filtered load records." },
    { label: "Delivered Loads", value: summary.delivered, type: "number", description: "Loads currently marked Delivered." },
    { label: "In-Transit Loads", value: summary.inTransit, type: "number", description: "Picked-up and in-transit loads." },
    { label: "Cancelled Loads", value: summary.cancelled, type: "number", description: "Loads marked Cancelled." },
    { label: "Total Mileage", value: summary.totalMiles, type: "number", description: "Mileage across filtered loads." },
    { label: "Resolved Load Revenue", value: summary.totalRate, type: "currency", description: "Carrier pay with estimated-rate fallback." },
    { label: "Average Load Rate", value: summary.avgRate, type: "currency", description: "Average positive resolved load rate." },
    { label: "Delivery Rate", value: summary.onTimeRate / 100, type: "percentage", description: "Delivered loads compared with non-cancelled loads." },
  ];

  appendStandardWorkbookSheets({
    XLSX,
    workbook,
    context,
    summaryMetrics: metrics,
    detailSheet: createDataSheet(XLSX, loads, detailColumns, "No load records match the selected filters."),
    analyticsSheet: createReportAnalyticsSheet(XLSX, analyticsModel),
    extraSheets: [
      {
        name: "Vehicle Details",
        sheet: createDataSheet(XLSX, vehicleRows, vehicleColumns, "No vehicle records are attached to the selected loads."),
      },
    ],
  });

  return writeWorkbookBlob(XLSX, workbook);
}

export async function generateQuoteReportExcel(
  quotes: Quote[],
  contextInput: ReportExportContextInput,
): Promise<Blob> {
  const XLSX = await import("xlsx-js-style");
  const workbook = XLSX.utils.book_new();
  const context = quoteContext(contextInput, quotes);
  const summary = buildQuoteSummary(quotes);
  const analyticsModel = buildReportAnalyticsModel({
    reportId: "quote-report",
    periodContext: { label: context.periodLabel },
    quotes,
  });

  const detailColumns: ExcelColumn<Quote>[] = [
    { label: "Customer", width: 26, value: quoteCustomerName },
    { label: "Email", width: 32, value: (quote) => quote.email },
    { label: "Phone", width: 20, value: (quote) => quote.phone },
    { label: "Vehicle", width: 30, value: quoteVehicleDescription },
    { label: "VIN", width: 26, value: quoteVin },
    { label: "Stock #", width: 18, value: quoteStockNumber },
    { label: "Origin", width: 42, value: (quote) => quote.fromAddress || quote.fromZip },
    { label: "Destination", width: 42, value: (quote) => quote.toAddress || quote.toZip },
    { label: "Origin ZIP", width: 14, value: (quote) => quote.fromZip },
    { label: "Destination ZIP", width: 16, value: (quote) => quote.toZip },
    { label: "Mileage", width: 14, value: (quote) => quote.miles, type: "number", align: "right" },
    { label: "Rate", width: 16, value: (quote) => quote.rate, type: "currency", align: "right" },
    { label: "Status", width: 16, value: (quote) => quote.status, type: "status", align: "center" },
    { label: "Trailer", width: 16, value: quoteTrailer },
    { label: "Condition", width: 16, value: quoteCondition, type: "status" },
    { label: "Units", width: 10, value: (quote) => quote.units || 1, type: "number", align: "center" },
    { label: "ETA", width: 16, value: quoteEta },
    { label: "Vehicle Location", width: 28, value: (quote) => quote.vehicleLocation },
    { label: "Created By", width: 28, value: (quote) => quote.createdBy?.name || quote.createdBy?.email },
    { label: "Created", width: 20, value: (quote) => quote.createdAt, type: "datetime" },
  ];

  const metrics: SummaryMetric[] = [
    { label: "Total Quotes", value: summary.total, type: "number", description: "All filtered quote and draft records." },
    { label: "Booked Quotes", value: summary.booked, type: "number", description: "Quotes marked Booked." },
    { label: "Pending Quotes", value: summary.pending, type: "number", description: "Quotes still awaiting a booking decision." },
    { label: "Rejected Quotes", value: summary.rejected, type: "number", description: "Quotes marked Rejected." },
    { label: "Total Quote Value", value: summary.totalRate, type: "currency", description: "Combined value of positive quote rates." },
    { label: "Average Quote Rate", value: summary.avgRate, type: "currency", description: "Average positive quote rate." },
    { label: "Total Mileage", value: summary.totalMiles, type: "number", description: "Mileage across filtered quote records." },
    { label: "Conversion Rate", value: summary.conversionRate / 100, type: "percentage", description: "Booked quotes compared with all filtered quotes." },
    { label: "Enclosed Trailer Requests", value: summary.enclosedCount, type: "number", description: "Quotes requesting enclosed transport." },
    { label: "Inoperable Vehicles", value: summary.inoperableCount, type: "number", description: "Quotes for inoperable vehicles." },
  ];

  appendStandardWorkbookSheets({
    XLSX,
    workbook,
    context,
    summaryMetrics: metrics,
    detailSheet: createDataSheet(XLSX, quotes, detailColumns, "No quote records match the selected filters."),
    analyticsSheet: createReportAnalyticsSheet(XLSX, analyticsModel),
  });
  return writeWorkbookBlob(XLSX, workbook);
}

export function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}