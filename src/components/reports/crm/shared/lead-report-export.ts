import {
  buildReportAnalyticsModel,
  hasReportAnalyticsChartData,
} from "@/components/reports/analytics/report-analytics-data";
import { drawReportAnalyticsCharts } from "@/components/reports/export/report-pdf-analytics";
import type { Lead } from "@/types/lead";
import type { ReportExportContextInput } from "@/components/reports/export/report-export-context";
import { normalizeReportExportContext } from "@/components/reports/export/report-export-context";
import {
  displayText,
  formatDateValue,
  leadAppointment,
  leadName,
  leadPendingStatus,
  leadReadStatus,
  leadVehicle,
} from "@/components/reports/export/report-export-formatters";
import {
  buildLeadSourceSummary,
  buildLeadStatusSummary,
  calculateSourceCoverage,
  countActiveLeads,
  countUnknownSources,
  countUnknownStatuses,
} from "@/components/reports/crm/utils/crm-preview-utils";
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

type LeadReportKind = "status" | "source";

function getContext(
  kind: LeadReportKind,
  input: ReportExportContextInput,
  leads: Lead[],
) {
  return normalizeReportExportContext(input, {
    reportId: kind === "status" ? "lead-status-report" : "lead-source-report",
    title: kind === "status" ? "Lead Status Report" : "Lead Source Report",
    description:
      kind === "status"
        ? "Lead activity grouped by current status, including customer contact, vehicle interest, engagement state, appointments, and reporting dates."
        : "Lead acquisition performance by source, including source coverage, customer contact, vehicle interest, engagement state, and reporting dates.",
    recordCount: leads.length,
    sectionCounts: { "Lead Records": leads.length },
  });
}

function leadDetailColumns(): ExcelColumn<Lead>[] {
  return [
    { label: "Customer", width: 28, value: leadName },
    { label: "Email", width: 34, value: (lead) => lead.email || lead.senderEmail },
    { label: "Phone", width: 20, value: (lead) => lead.phone },
    { label: "Subject", width: 48, value: (lead) => lead.subject },
    { label: "Status", width: 18, value: (lead) => lead.status, type: "status", align: "center" },
    { label: "Source", width: 22, value: (lead) => lead.source },
    { label: "Vehicle", width: 28, value: leadVehicle },
    { label: "Read Status", width: 16, value: leadReadStatus, type: "status", align: "center" },
    { label: "Reply Status", width: 18, value: leadPendingStatus, type: "status", align: "center" },
    { label: "Appointment", width: 48, value: leadAppointment, align: "left" },
    { label: "Comments", width: 52, value: (lead) => lead.comments },
    { label: "Message Body", width: 70, value: (lead) => lead.body },
    { label: "Created", width: 20, value: (lead) => lead.createdAt, type: "datetime" },
    { label: "Updated", width: 20, value: (lead) => lead.updatedAt, type: "datetime" },
  ];
}

export async function generateLeadReportPdf(
  kind: LeadReportKind,
  leads: Lead[],
  contextInput: ReportExportContextInput,
): Promise<Blob> {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const doc = new jsPDF({ orientation: "landscape" });
  const context = getContext(kind, contextInput, leads);
  const logo = await loadReportLogo();
  const docId = generateDocId(kind === "status" ? "LEAD-STATUS" : "LEAD-SOURCE");
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const left = 12;
  const right = pageWidth - 12;
  const contentWidth = right - left;
  const statusSummary = buildLeadStatusSummary(leads);
  const sourceSummary = buildLeadSourceSummary(leads);
  const activeLeads = countActiveLeads(statusSummary);
  const unknownStatuses = countUnknownStatuses(statusSummary);
  const unknownSources = countUnknownSources(sourceSummary);
  const sourceCoverage = calculateSourceCoverage(leads.length, unknownSources);
  const appointments = leads.filter((lead) => Boolean(lead.appointment)).length;
  const unread = leads.filter((lead) => lead.isRead !== true).length;
  const pendingReply = leads.filter((lead) => lead.isPending === true).length;
  const primaryBreakdown = kind === "status" ? statusSummary : sourceSummary;
  const analyticsModel = buildReportAnalyticsModel({
    reportId: kind === "status" ? "lead-status-report" : "lead-source-report",
    periodContext: { label: context.periodLabel },
    leads,
  });

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
    valueColor: [8, 145, 178],
    cards:
      kind === "status"
        ? [
            { label: "Total Leads", value: String(leads.length) },
            { label: "Active Leads", value: String(activeLeads) },
            { label: "Appointments", value: String(appointments) },
            { label: "Unread", value: String(unread) },
            { label: "Pending Reply", value: String(pendingReply) },
            { label: "Unknown Status", value: String(unknownStatuses) },
          ]
        : [
            { label: "Total Leads", value: String(leads.length) },
            { label: "Unique Sources", value: String(sourceSummary.length) },
            { label: "Top Source", value: sourceSummary[0]?.source ?? "—" },
            { label: "Source Coverage", value: `${sourceCoverage.toFixed(1)}%` },
            { label: "Unknown Source", value: String(unknownSources) },
            { label: "Appointments", value: String(appointments) },
          ],
  }) + 7;

  drawSectionTitle(doc, {
    title: kind === "status" ? "Status Breakdown" : "Source Breakdown",
    y: cursorY,
    left,
    right,
  });
  autoTable(doc, {
    startY: cursorY + 3,
    head: [[kind === "status" ? "Lead Status" : "Lead Source", "Leads", "Share"]],
    body:
      primaryBreakdown.length > 0
        ? primaryBreakdown.map((item) => [
            kind === "status" ? "status" in item ? item.status : "" : "source" in item ? item.source : "",
            item.count,
            `${item.percentage.toFixed(1)}%`,
          ])
        : [["No breakdown data", 0, "0.0%"]],
    margin: { top: 34, left, right, bottom: 18 },
    styles: TABLE_BODY_STYLES,
    headStyles: TABLE_HEAD_STYLES_SECONDARY,
    alternateRowStyles: TABLE_ALTERNATE_ROW,
    bodyStyles: TABLE_BODY_ROW,
    columnStyles: {
      0: { cellWidth: 90 },
      1: { cellWidth: 30, halign: "center" },
      2: { cellWidth: 30, halign: "center" },
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

  if (leads.length > 0) {
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

  drawSectionTitle(doc, { title: "Detailed Lead Records", y: cursorY, left, right });

  if (leads.length === 0) {
    drawEmptyState(doc, {
      y: cursorY + 4,
      message: "No lead records match the selected filters.",
      sub: "Change the report period or filters to include lead activity.",
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
        "Subject",
        "Status",
        "Source",
        "Vehicle",
        "Read",
        "Reply",
        "Appointment",
        "Created",
        "Updated",
      ]],
      body: leads.map((lead) => [
        leadName(lead),
        [lead.email || lead.senderEmail, lead.phone].filter(Boolean).join("\n") || "—",
        displayText(lead.subject),
        displayText(lead.status),
        displayText(lead.source, "Unknown"),
        leadVehicle(lead),
        leadReadStatus(lead),
        leadPendingStatus(lead),
        leadAppointment(lead),
        formatDateValue(lead.createdAt),
        formatDateValue(lead.updatedAt),
      ]),
      margin: { top: 34, left, right, bottom: 18 },
      styles: { ...TABLE_BODY_STYLES, fontSize: 6.35, minCellHeight: 8.5 },
      headStyles: { ...TABLE_HEAD_STYLES_PRIMARY, fontSize: 6.6 },
      alternateRowStyles: TABLE_ALTERNATE_ROW,
      bodyStyles: TABLE_BODY_ROW,
      columnStyles: {
        0: { cellWidth: 23 },
        1: { cellWidth: 30 },
        2: { cellWidth: 34 },
        3: { cellWidth: 19, halign: "center" },
        4: { cellWidth: 21, halign: "center" },
        5: { cellWidth: 26 },
        6: { cellWidth: 14, halign: "center" },
        7: { cellWidth: 16, halign: "center" },
        8: { cellWidth: 32 },
        9: { cellWidth: 20, halign: "center" },
        10: { cellWidth: 20, halign: "center" },
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

export async function generateLeadReportExcel(
  kind: LeadReportKind,
  leads: Lead[],
  contextInput: ReportExportContextInput,
): Promise<Blob> {
  const XLSX = await import("xlsx-js-style");
  const workbook = XLSX.utils.book_new();
  const context = getContext(kind, contextInput, leads);
  const statusSummary = buildLeadStatusSummary(leads);
  const sourceSummary = buildLeadSourceSummary(leads);
  const activeLeads = countActiveLeads(statusSummary);
  const unknownStatuses = countUnknownStatuses(statusSummary);
  const unknownSources = countUnknownSources(sourceSummary);
  const sourceCoverage = calculateSourceCoverage(leads.length, unknownSources);
  const appointments = leads.filter((lead) => Boolean(lead.appointment)).length;
  const unread = leads.filter((lead) => lead.isRead !== true).length;
  const pendingReply = leads.filter((lead) => lead.isPending === true).length;

  const analyticsModel = buildReportAnalyticsModel({
    reportId: kind === "status" ? "lead-status-report" : "lead-source-report",
    periodContext: { label: context.periodLabel },
    leads,
  });

  const metrics: SummaryMetric[] =
    kind === "status"
      ? [
          { label: "Total Leads", value: leads.length, type: "number", description: "All filtered lead records." },
          { label: "Active Leads", value: activeLeads, type: "number", description: "Leads not in a closed, lost, rejected, won, or converted status." },
          { label: "Appointments", value: appointments, type: "number", description: "Leads with appointment information." },
          { label: "Unread Leads", value: unread, type: "number", description: "Lead conversations not marked read." },
          { label: "Pending Replies", value: pendingReply, type: "number", description: "Leads currently marked as pending a reply." },
          { label: "Unknown Status", value: unknownStatuses, type: "number", description: "Leads without a recognized status." },
          { label: "Most Common Status", value: statusSummary[0]?.status ?? "—", type: "text", description: `${statusSummary[0]?.count ?? 0} lead records.` },
        ]
      : [
          { label: "Total Leads", value: leads.length, type: "number", description: "All filtered lead records." },
          { label: "Unique Sources", value: sourceSummary.length, type: "number", description: "Distinct normalized lead sources." },
          { label: "Top Source", value: sourceSummary[0]?.source ?? "—", type: "text", description: `${sourceSummary[0]?.count ?? 0} lead records.` },
          { label: "Source Coverage", value: sourceCoverage / 100, type: "percentage", description: "Share of leads with a recognized source." },
          { label: "Unknown Sources", value: unknownSources, type: "number", description: "Leads without a recognized source." },
          { label: "Appointments", value: appointments, type: "number", description: "Leads with appointment information." },
          { label: "Pending Replies", value: pendingReply, type: "number", description: "Leads currently marked as pending a reply." },
        ];

  appendStandardWorkbookSheets({
    XLSX,
    workbook,
    context,
    summaryMetrics: metrics,
    detailSheet: createDataSheet(XLSX, leads, leadDetailColumns(), "No lead records match the selected filters."),
    analyticsSheet: createReportAnalyticsSheet(XLSX, analyticsModel),
  });
  return writeWorkbookBlob(XLSX, workbook);
}
