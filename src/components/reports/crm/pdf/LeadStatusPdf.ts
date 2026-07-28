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
  if (!value) return "—";

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

function percentage(part: number, whole: number): string {
  return whole > 0 ? `${Math.round((part / whole) * 100)}%` : "0%";
}

function normalizeStatus(value: unknown): string {
  const status = String(value ?? "").trim();
  return status || "Unknown";
}

interface LeadStatusSummary {
  total: number;
  newLeads: number;
  contacted: number;
  pending: number;
  appointments: number;
  closed: number;
  unknown: number;
}

interface LeadStatusDistributionRow {
  status: string;
  count: number;
  percentage: string;
}

function buildLeadStatusSummary(leads: Lead[]): LeadStatusSummary {
  const summary: LeadStatusSummary = {
    total: leads.length,
    newLeads: 0,
    contacted: 0,
    pending: 0,
    appointments: 0,
    closed: 0,
    unknown: 0,
  };

  leads.forEach((lead) => {
    switch (lead.status) {
      case "New":
        summary.newLeads += 1;
        break;

      case "Contacted":
        summary.contacted += 1;
        break;

      case "Pending":
        summary.pending += 1;
        break;

      case "Appointment Set":
        summary.appointments += 1;
        break;

      case "Closed":
        summary.closed += 1;
        break;

      default:
        summary.unknown += 1;
        break;
    }
  });

  return summary;
}

function buildStatusDistribution(
  leads: Lead[],
): LeadStatusDistributionRow[] {
  const counts = new Map<string, number>();

  leads.forEach((lead) => {
    const status = normalizeStatus(lead.status);

    counts.set(status, (counts.get(status) ?? 0) + 1);
  });

  const preferredOrder = [
    "New",
    "Contacted",
    "Pending",
    "Appointment Set",
    "Closed",
    "Unknown",
  ];

  return Array.from(counts.entries())
    .sort(([statusA, countA], [statusB, countB]) => {
      const indexA = preferredOrder.indexOf(statusA);
      const indexB = preferredOrder.indexOf(statusB);

      if (indexA !== -1 && indexB !== -1) {
        return indexA - indexB;
      }

      if (indexA !== -1) {
        return -1;
      }

      if (indexB !== -1) {
        return 1;
      }

      return countB - countA || statusA.localeCompare(statusB);
    })
    .map(([status, count]) => ({
      status,
      count,
      percentage: percentage(count, leads.length),
    }));
}

export async function generateLeadStatusPdf(
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

  const summary = buildLeadStatusSummary(leads);
  const distributionRows = buildStatusDistribution(leads);

  const generatedAtLabel = formatGeneratedAt(new Date());
  const documentId = generateDocId("CRM-LS");

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const left = 14;
  const right = pageWidth - 14;
  const contentWidth = right - left;

  const reportTitle = "Lead Status Report";

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

  drawHeader("CRM pipeline and lead activity overview");

  drawSection("Report Summary", 31);

  const summaryBottomY = drawSummaryCards(doc, {
    cards: [
      {
        label: "Total Leads",
        value: String(summary.total),
      },
      {
        label: "New",
        value: String(summary.newLeads),
      },
      {
        label: "Contacted",
        value: String(summary.contacted),
      },
      {
        label: "Pending",
        value: String(summary.pending),
      },
      {
        label: "Appointments",
        value: String(summary.appointments),
      },
      {
        label: "Closed",
        value: String(summary.closed),
      },
    ],
    y: 34,
    left,
    contentWidth,
    fonts,
  });

  const distributionTitleY = summaryBottomY + 10;

  drawSection("Lead Status Distribution", distributionTitleY);

  if (distributionRows.length === 0) {
    drawNoData(
      distributionTitleY + 4,
      "No lead status data is available.",
      "Status distribution will appear once leads are recorded for the selected period.",
    );
  } else {
    autoTable(doc, {
      startY: distributionTitleY + 3,
      head: [["Status", "Lead Count", "Percentage"]],
      body: distributionRows.map((row) => [
        row.status,
        row.count.toString(),
        row.percentage,
      ]),
      theme: "grid",
      margin: {
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
          cellWidth: 100,
        },
        1: {
          cellWidth: 42,
          halign: "right",
        },
        2: {
          cellWidth: 42,
          halign: "right",
        },
      },
    });
  }

  doc.addPage();

  drawHeader("Detailed lead records");
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
        safeText(lead.source, "Unknown"),
        normalizeStatus(lead.status),
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

        drawHeader("Detailed lead records");
        drawContinuedLabel(doc, right, fonts);
      },
    });
  }

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