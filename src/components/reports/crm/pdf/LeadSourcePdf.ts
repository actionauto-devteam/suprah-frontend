import type { Lead } from "@/types/lead";
import {
  applyFootersToAllPages,
  drawContinuedLabel,
  drawEmptyState,
  drawReportPageHeader,
  drawSectionTitle,
  drawSummaryCards,
  embedFonts,
  formatGeneratedAt,
  generateDocId,
  loadLogoBase64,
  TABLE_ALTERNATE_ROW,
  TABLE_BODY_ROW,
  TABLE_BODY_STYLES,
  TABLE_HEAD_STYLES_PRIMARY,
  TABLE_HEAD_STYLES_SECONDARY,
} from "@/utils/reportPdfTemplate";

function safeText(value: unknown, fallback = "—"): string {
  const text = String(value ?? "").trim();

  return text || fallback;
}

function formatLeadName(lead: Lead): string {
  const name = [lead.firstName, lead.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();

  return name || safeText(lead.senderName, "Unnamed lead");
}

function formatVehicle(lead: Lead): string {
  return (
    [lead.vehicle?.year, lead.vehicle?.make, lead.vehicle?.model]
      .filter(Boolean)
      .join(" ")
      .trim() || "—"
  );
}

function formatDate(value: unknown): string {
  if (!value) {
    return "—";
  }

  const date = new Date(String(value));

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function normalizeSource(value: unknown): string {
  const source = String(value ?? "").trim();

  return source || "Unknown";
}

function percentage(part: number, whole: number): string {
  return whole > 0 ? `${((part / whole) * 100).toFixed(1)}%` : "0.0%";
}

interface LeadSourceDistributionRow {
  rank: number;
  source: string;
  count: number;
  percentage: string;
}

interface LeadSourceSummary {
  totalLeads: number;
  uniqueSources: number;
  topSource: string;
  topSourceLeads: number;
  unknownSources: number;
  sourceCoverage: string;
}

function buildSourceDistribution(
  leads: Lead[],
): LeadSourceDistributionRow[] {
  const counts = new Map<string, number>();

  leads.forEach((lead) => {
    const source = normalizeSource(lead.source);

    counts.set(source, (counts.get(source) ?? 0) + 1);
  });

  return Array.from(counts.entries())
    .sort(([sourceA, countA], [sourceB, countB]) => {
      return countB - countA || sourceA.localeCompare(sourceB);
    })
    .map(([source, count], index) => ({
      rank: index + 1,
      source,
      count,
      percentage: percentage(count, leads.length),
    }));
}

function buildSourceSummary(
  leads: Lead[],
  distribution: LeadSourceDistributionRow[],
): LeadSourceSummary {
  const topSource = distribution[0];

  const unknownSources =
    distribution.find(
      (item) => item.source.toLowerCase() === "unknown",
    )?.count ?? 0;

  const identifiedSources = Math.max(
    leads.length - unknownSources,
    0,
  );

  return {
    totalLeads: leads.length,
    uniqueSources: distribution.length,
    topSource: topSource?.source ?? "—",
    topSourceLeads: topSource?.count ?? 0,
    unknownSources,
    sourceCoverage: percentage(identifiedSources, leads.length),
  };
}

export async function generateLeadSourcePdf(
  leads: Lead[],
  monthLabel: string,
): Promise<Blob> {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;

  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });

  const [logoBase64, fonts] = await Promise.all([
    loadLogoBase64(),
    embedFonts(doc),
  ]);

  const distribution = buildSourceDistribution(leads);
  const summary = buildSourceSummary(leads, distribution);

  const generatedAtLabel = formatGeneratedAt(new Date());
  const documentId = generateDocId("CRM-LSRC");

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const left = 14;
  const right = pageWidth - 14;
  const contentWidth = right - left;

  const reportTitle = "Lead Source Report";

  const drawHeader = (subtitle?: string): void => {
    drawReportPageHeader(doc, {
      reportTitle,
      orgName: "Action Auto Utah",
      periodLabel: monthLabel,
      subtitle,
      logoBase64,
      pageWidth,
      left,
      right,
      fonts,
    });
  };

  const drawSection = (title: string, y: number): void => {
    drawSectionTitle(doc, {
      title,
      y,
      left,
      right,
      pageWidth,
      fonts,
    });
  };

  const drawNoData = (
    y: number,
    message: string,
    sub: string,
  ): void => {
    drawEmptyState(doc, {
      y,
      message,
      sub,
      left,
      right,
      contentWidth,
      pageWidth,
      fonts,
    });
  };

  /*
   * Page 1
   * Lead acquisition summary and source distribution.
   */
  drawHeader("Lead acquisition and marketing channel overview");

  drawSection("Report Summary", 31);

  const summaryBottomY = drawSummaryCards(doc, {
    cards: [
      {
        label: "Total Leads",
        value: String(summary.totalLeads),
      },
      {
        label: "Unique Sources",
        value: String(summary.uniqueSources),
      },
      {
        label: "Top Source",
        value: summary.topSource,
      },
      {
        label: "Top Source Leads",
        value: String(summary.topSourceLeads),
      },
      {
        label: "Unknown Sources",
        value: String(summary.unknownSources),
      },
      {
        label: "Source Coverage",
        value: summary.sourceCoverage,
      },
    ],
    y: 34,
    left,
    contentWidth,
    fonts,
  });

  const distributionTitleY = summaryBottomY + 10;

  drawSection("Source Distribution", distributionTitleY);

  if (distribution.length === 0) {
    drawNoData(
      distributionTitleY + 4,
      "No lead source data is available.",
      "Source analytics will appear once leads are recorded for the selected period.",
    );
  } else {
    autoTable(doc, {
      startY: distributionTitleY + 3,
      showHead: "everyPage",
      pageBreak: "auto",
      rowPageBreak: "avoid",
      head: [
        [
          "Rank",
          "Lead Source",
          "Lead Count",
          "Percentage",
        ],
      ],
      body: distribution.map((item) => [
        String(item.rank),
        item.source,
        String(item.count),
        item.percentage,
      ]),
      theme: "grid",
      margin: {
        top: 31,
        left,
        right: pageWidth - right,
        bottom: 20,
      },
      styles: {
        ...TABLE_BODY_STYLES,
        font: fonts.body,
        overflow: "linebreak",
        valign: "middle",
      },
      headStyles: {
        ...TABLE_HEAD_STYLES_SECONDARY,
        font: fonts.heading,
        fontStyle: "bold",
      },
      alternateRowStyles: TABLE_ALTERNATE_ROW,
      bodyStyles: TABLE_BODY_ROW,
      columnStyles: {
        0: {
          cellWidth: 24,
          halign: "center",
        },
        1: {
          cellWidth: 118,
        },
        2: {
          cellWidth: 42,
          halign: "right",
        },
        3: {
          cellWidth: 42,
          halign: "right",
        },
      },
      didDrawPage: (data) => {
        if (data.pageNumber <= 1) {
          return;
        }

        drawHeader("Lead acquisition and marketing channel overview");
        drawContinuedLabel(doc, right, fonts);
      },
    });
  }

  /*
   * Page 2
   * Detailed lead ledger.
   */
  doc.addPage();

  drawHeader("Detailed acquisition records");
  drawSection("Lead Details", 31);

  if (leads.length === 0) {
    drawNoData(
      35,
      "No lead records are available.",
      "Lead details will appear once inquiries are recorded for the selected period.",
    );
  } else {
    autoTable(doc, {
      startY: 34,
      showHead: "everyPage",
      pageBreak: "auto",
      rowPageBreak: "avoid",
      head: [
        [
          "Lead",
          "Email",
          "Phone",
          "Vehicle",
          "Source",
          "Status",
          "Created",
        ],
      ],
      body: leads.map((lead) => [
        formatLeadName(lead),
        safeText(lead.email || lead.senderEmail),
        safeText(lead.phone),
        formatVehicle(lead),
        normalizeSource(lead.source),
        safeText(lead.status, "Unknown"),
        formatDate(lead.createdAt),
      ]),
      theme: "grid",
      margin: {
        top: 31,
        left,
        right: pageWidth - right,
        bottom: 20,
      },
      styles: {
        ...TABLE_BODY_STYLES,
        font: fonts.body,
        overflow: "linebreak",
        valign: "middle",
      },
      headStyles: {
        ...TABLE_HEAD_STYLES_PRIMARY,
        font: fonts.heading,
        fontStyle: "bold",
      },
      alternateRowStyles: TABLE_ALTERNATE_ROW,
      bodyStyles: TABLE_BODY_ROW,
      columnStyles: {
        0: {
          cellWidth: 34,
        },
        1: {
          cellWidth: 47,
        },
        2: {
          cellWidth: 27,
        },
        3: {
          cellWidth: 40,
        },
        4: {
          cellWidth: 31,
        },
        5: {
          cellWidth: 28,
        },
        6: {
          cellWidth: 28,
        },
      },
      didDrawPage: (data) => {
        if (data.pageNumber <= 1) {
          return;
        }

        drawHeader("Detailed acquisition records");
        drawContinuedLabel(doc, right, fonts);
      },
    });
  }

  /*
   * Apply a standardized footer after all pages have been generated.
   */
  applyFootersToAllPages(doc, {
    docId: documentId,
    generatedAtLabel,
    reportTitle,
    orgName: "Action Auto Utah",
    supportEmail: "support@actionautoutah.com",
    pageWidth,
    pageHeight,
    left,
    right,
    fonts,
  });

  return doc.output("blob");
}