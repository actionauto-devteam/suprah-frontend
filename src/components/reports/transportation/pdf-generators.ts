import { Quote } from "@/types/transportation";
import { Load } from "@/types/load";
import {
  buildShipmentSummary,
  buildQuoteSummary,
  fmtCurrency,
  fmtNumber,
  shipmentCustomer,
  shipmentVehicle,
  shipmentVin,
  shipmentRate,
  shipmentTransportType,
  driverName,
  quoteCustomer,
  quoteVehicle,
  quoteFromAddr,
  quoteToAddr,
  quoteEta,
  quoteTransportType,
} from "./helpers";
import {
  loadLogoBase64,
  generateDocId,
  formatGeneratedAt,
  drawReportPageHeader,
  drawContinuedLabel,
  drawSectionTitle,
  drawEmptyState,
  drawSummaryCards,
  applyFootersToAllPages,
  embedFonts,
  TABLE_BODY_STYLES,
  TABLE_HEAD_STYLES_PRIMARY,
  TABLE_HEAD_STYLES_SECONDARY,
  TABLE_ALTERNATE_ROW,
  TABLE_BODY_ROW,
} from "@/utils/reportPdfTemplate";

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export { triggerDownload };

export async function generateShipmentReportPdf(
  shipments: Load[],
  monthLabel: string,
): Promise<Blob> {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const doc = new jsPDF({ orientation: "landscape" });
  const summary = buildShipmentSummary(shipments);

  const [logoBase64, fonts] = await Promise.all([
    loadLogoBase64(),
    embedFonts(doc),
  ]);
  const docId = generateDocId("SHP");
  const generatedAt = new Date();
  const generatedAtLabel = formatGeneratedAt(generatedAt);

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const left = 14;
  const right = pageWidth - 14;
  const contentWidth = right - left;

  const headerOpts = (subtitle?: string) => ({
    reportTitle: "Shipment Report",
    periodLabel: monthLabel,
    subtitle,
    logoBase64,
    pageWidth,
    left,
    right,
    fonts,
  });

  const sectionOpts = (title: string, y: number) => ({
    title,
    y,
    left,
    right,
    fonts,
  });

  const emptyOpts = (y: number, msg: string, sub: string) => ({
    y,
    message: msg,
    sub,
    left,
    right,
    contentWidth,
    pageWidth,
    fonts,
  });

  const footerOpts = {
    docId,
    generatedAtLabel,
    reportTitle: "Shipment Report",
    pageWidth,
    pageHeight,
    left,
    right,
    fonts,
  };

  drawReportPageHeader(doc, headerOpts());
  drawSectionTitle(doc, sectionOpts("Summary", 31));

  const cardBottomY = drawSummaryCards(doc, {
    cards: [
      { label: "Total Shipments", value: String(summary.total) },
      { label: "Delivered", value: String(summary.delivered) },
      {
        label: "In Transit",
        value: String(summary.inRoute + summary.dispatched),
      },
      { label: "Available", value: String(summary.available) },
      { label: "Revenue", value: fmtCurrency(summary.totalRate) },
      { label: "Success Rate", value: `${summary.onTimeRate}%` },
    ],
    y: 34,
    left,
    contentWidth,
  });

  const s1TitleY = cardBottomY + 10;
  drawSectionTitle(doc, sectionOpts("Shipments", s1TitleY));

  if (shipments.length === 0) {
    drawEmptyState(
      doc,
      emptyOpts(
        s1TitleY + 4,
        "No shipment data for this period.",
        "Data will appear here once shipments are recorded.",
      ),
    );
  } else {
    autoTable(doc, {
      startY: s1TitleY + 3,
      head: [
        [
          "Tracking #",
          "Status",
          "Customer",
          "Vehicle",
          "VIN",
          "Origin",
          "Destination",
          "Type",
          "Rate",
          "Driver",
        ],
      ],
      body: shipments.map((s) => [
        s.loadNumber || "—",
        s.status,
        shipmentCustomer(s),
        shipmentVehicle(s),
        shipmentVin(s),
        s.pickupLocation ? `${s.pickupLocation.city}, ${s.pickupLocation.state}` : "—",
        s.deliveryLocation ? `${s.deliveryLocation.city}, ${s.deliveryLocation.state}` : "—",
        shipmentTransportType(s),
        fmtCurrency(shipmentRate(s)),
        driverName(s),
      ]),
      margin: { left, right: 14, bottom: 20, top: 30 },
      styles: TABLE_BODY_STYLES,
      headStyles: TABLE_HEAD_STYLES_PRIMARY,
      alternateRowStyles: TABLE_ALTERNATE_ROW,
      bodyStyles: TABLE_BODY_ROW,
      columnStyles: {
        0: { cellWidth: 24, font: "courier" },
        1: { cellWidth: 20 },
        2: { cellWidth: 28 },
        3: { cellWidth: 28 },
        4: { cellWidth: 24, font: "courier" },
        5: { cellWidth: 26 },
        6: { cellWidth: 26 },
        7: { cellWidth: 18 },
        8: { cellWidth: 22, halign: "right" },
        9: { cellWidth: 26 },
      },
      didDrawPage: (data: any) => {
        if (data.pageNumber > 1) {
          drawReportPageHeader(doc, headerOpts("Shipment Report (continued)"));
          drawContinuedLabel(doc, right);
        }
      },
    });
  }

  // ── Page 2: Analytics ────────────────────────────────────────────────────
  doc.addPage();
  drawReportPageHeader(doc, headerOpts("Shipment Report • Analytics"));

  // Status breakdown
  drawSectionTitle(doc, sectionOpts("Status Breakdown", 31));

  const statusGroups: Record<string, Load[]> = {};
  shipments.forEach((s) => {
    if (!statusGroups[s.status]) statusGroups[s.status] = [];
    statusGroups[s.status].push(s);
  });

  const breakdownRows = Object.entries(statusGroups)
    .sort((a, b) => b[1].length - a[1].length)
    .map(([status, items]) => {
      const totalRate = items.reduce(
        (sum, s) => sum + (s.pricing?.estimatedRate ?? s.pricing?.carrierPayAmount ?? 0),
        0,
      );
      const avgRate = items.length > 0 ? totalRate / items.length : 0;
      const withDriver = items.filter((s) => s.assignedDriverId).length;
      const pct =
        shipments.length > 0
          ? `${Math.round((items.length / shipments.length) * 100)}%`
          : "0%";
      return [
        status,
        String(items.length),
        pct,
        fmtCurrency(totalRate),
        fmtCurrency(avgRate),
        String(withDriver),
      ];
    });

  if (breakdownRows.length === 0) {
    drawEmptyState(
      doc,
      emptyOpts(
        35,
        "No status data.",
        "Status analytics will appear once shipments are recorded.",
      ),
    );
  } else {
    autoTable(doc, {
      startY: 34,
      head: [
        [
          "Status",
          "Count",
          "Percentage",
          "Total Revenue",
          "Avg Rate",
          "With Driver",
        ],
      ],
      body: breakdownRows,
      margin: { left, right: 14, bottom: 20 },
      styles: TABLE_BODY_STYLES,
      headStyles: TABLE_HEAD_STYLES_PRIMARY,
      alternateRowStyles: TABLE_ALTERNATE_ROW,
      columnStyles: {
        1: { halign: "right" },
        2: { halign: "right" },
        3: { halign: "right" },
        4: { halign: "right" },
        5: { halign: "right" },
      },
    });
  }

  // Route analysis
  const routeMap = new Map<
    string,
    { count: number; totalRate: number; totalMiles: number }
  >();
  shipments.forEach((s) => {
    const key = `${s.pickupLocation ? `${s.pickupLocation.city}, ${s.pickupLocation.state}` : "?"} → ${s.deliveryLocation ? `${s.deliveryLocation.city}, ${s.deliveryLocation.state}` : "?"}`;
    const ex = routeMap.get(key) || { count: 0, totalRate: 0, totalMiles: 0 };
    ex.count++;
    ex.totalRate += s.pricing?.estimatedRate ?? s.pricing?.carrierPayAmount ?? 0;
    ex.totalMiles += s.pricing?.miles ?? 0;
    routeMap.set(key, ex);
  });

  const routeRows = Array.from(routeMap.entries())
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 15)
    .map(([route, data]) => [
      route,
      String(data.count),
      fmtNumber(data.totalMiles),
      fmtCurrency(data.totalRate),
      fmtCurrency(data.count > 0 ? data.totalRate / data.count : 0),
    ]);

  const lastY = (doc as any).lastAutoTable?.finalY ?? 76;
  const routeTitleY = lastY + 12;
  drawSectionTitle(doc, sectionOpts("Route Analysis", routeTitleY));

  if (routeRows.length === 0) {
    drawEmptyState(
      doc,
      emptyOpts(
        routeTitleY + 4,
        "No route data.",
        "Route analytics appear once shipments are recorded.",
      ),
    );
  } else {
    autoTable(doc, {
      startY: routeTitleY + 3,
      head: [
        ["Route", "Shipments", "Total Miles", "Total Revenue", "Avg Rate"],
      ],
      body: routeRows,
      margin: { left, right: 14, bottom: 20 },
      styles: TABLE_BODY_STYLES,
      headStyles: TABLE_HEAD_STYLES_SECONDARY,
      alternateRowStyles: TABLE_ALTERNATE_ROW,
      columnStyles: {
        1: { halign: "right" },
        2: { halign: "right" },
        3: { halign: "right" },
        4: { halign: "right" },
      },
    });
  }

  applyFootersToAllPages(doc, footerOpts);

  return doc.output("blob");
}

export async function generateQuoteReportPdf(
  quotes: Quote[],
  monthLabel: string,
): Promise<Blob> {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const doc = new jsPDF({ orientation: "landscape" });
  const summary = buildQuoteSummary(quotes);

  const logoBase64 = await loadLogoBase64();
  const docId = generateDocId("QUO");
  const generatedAt = new Date();
  const generatedAtLabel = formatGeneratedAt(generatedAt);

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const left = 14;
  const right = pageWidth - 14;
  const contentWidth = right - left;

  const headerOpts = (subtitle?: string) => ({
    reportTitle: "Quotes & Drafts Report",
    periodLabel: monthLabel,
    subtitle,
    logoBase64,
    pageWidth,
    left,
    right,
  });

  const sectionOpts = (title: string, y: number) => ({ title, y, left, right });

  const emptyOpts = (y: number, msg: string, sub: string) => ({
    y,
    message: msg,
    sub,
    left,
    right,
    contentWidth,
    pageWidth,
  });

  const footerOpts = {
    docId,
    generatedAtLabel,
    reportTitle: "Quotes & Drafts Report",
    pageWidth,
    pageHeight,
    left,
    right,
  };

  drawReportPageHeader(doc, headerOpts());
  drawSectionTitle(doc, sectionOpts("Summary", 31));

  const cardBottomY = drawSummaryCards(doc, {
    cards: [
      { label: "Total Quotes", value: String(summary.total) },
      { label: "Booked", value: String(summary.booked) },
      { label: "Conversion", value: `${summary.conversionRate}%` },
      { label: "Pending", value: String(summary.pending) },
      { label: "Total Value", value: fmtCurrency(summary.totalRate) },
      { label: "Avg Rate", value: fmtCurrency(summary.avgRate) },
    ],
    y: 34,
    left,
    contentWidth,
  });

  const quotesTitleY = cardBottomY + 10;
  drawSectionTitle(doc, sectionOpts("All Quotes & Drafts", quotesTitleY));

  if (quotes.length === 0) {
    drawEmptyState(
      doc,
      emptyOpts(
        quotesTitleY + 4,
        "No quotes for this period.",
        "Quotes and drafts will appear once created.",
      ),
    );
  } else {
    autoTable(doc, {
      startY: quotesTitleY + 3,
      head: [
        [
          "Customer",
          "Vehicle",
          "From",
          "To",
          "Miles",
          "Rate",
          "ETA",
          "Type",
          "Units",
          "Status",
        ],
      ],
      body: quotes.map((q) => [
        quoteCustomer(q),
        quoteVehicle(q),
        quoteFromAddr(q),
        quoteToAddr(q),
        fmtNumber(q.miles || 0),
        fmtCurrency(q.rate || 0),
        quoteEta(q),
        quoteTransportType(q),
        String(q.units || 1),
        q.status,
      ]),
      margin: { left, right: 14, bottom: 20, top: 30 },
      styles: TABLE_BODY_STYLES,
      headStyles: TABLE_HEAD_STYLES_PRIMARY,
      alternateRowStyles: TABLE_ALTERNATE_ROW,
      bodyStyles: TABLE_BODY_ROW,
      columnStyles: {
        4: { halign: "right" },
        5: { halign: "right" },
        8: { halign: "right" },
      },
      didDrawPage: (data: any) => {
        if (data.pageNumber > 1) {
          drawReportPageHeader(doc, headerOpts("Quotes & Drafts (continued)"));
          drawContinuedLabel(doc, right);
        }
      },
    });
  }

  // ── Page 2: Analytics ────────────────────────────────────────────────────
  doc.addPage();
  drawReportPageHeader(doc, headerOpts("Quotes & Drafts • Analytics"));
  drawSectionTitle(doc, sectionOpts("Quote Status Breakdown", 31));

  const statusMap: Record<string, Quote[]> = {};
  quotes.forEach((q) => {
    const key = q.status || "unknown";
    if (!statusMap[key]) statusMap[key] = [];
    statusMap[key].push(q);
  });

  const statusRows = Object.entries(statusMap).map(([status, items]) => {
    const totalRate = items.reduce((sum, q) => sum + (q.rate || 0), 0);
    const avgRate = items.length > 0 ? totalRate / items.length : 0;
    const totalMiles = items.reduce((sum, q) => sum + (q.miles || 0), 0);
    return [
      status.charAt(0).toUpperCase() + status.slice(1),
      String(items.length),
      `${Math.round((items.length / quotes.length) * 100)}%`,
      fmtCurrency(totalRate),
      fmtCurrency(avgRate),
      fmtNumber(totalMiles),
    ];
  });

  if (quotes.length === 0 || statusRows.length === 0) {
    drawEmptyState(
      doc,
      emptyOpts(
        35,
        "No quote status data.",
        "Status analytics will appear once quotes exist.",
      ),
    );
  } else {
    autoTable(doc, {
      startY: 34,
      head: [
        [
          "Status",
          "Count",
          "Percentage",
          "Total Value",
          "Avg Rate",
          "Total Miles",
        ],
      ],
      body: statusRows,
      margin: { left, right: 14, bottom: 20 },
      styles: TABLE_BODY_STYLES,
      headStyles: TABLE_HEAD_STYLES_PRIMARY,
      alternateRowStyles: TABLE_ALTERNATE_ROW,
      columnStyles: {
        1: { halign: "right" },
        2: { halign: "right" },
        3: { halign: "right" },
        4: { halign: "right" },
        5: { halign: "right" },
      },
    });
  }

  const lastY = (doc as any).lastAutoTable?.finalY ?? 70;
  if (lastY < 150) {
    const analysisTitleY = lastY + 12;
    drawSectionTitle(
      doc,
      sectionOpts("Vehicle & Service Analysis", analysisTitleY),
    );

    const enclosed = quotes.filter((q) => q.enclosedTrailer).length;
    const open = quotes.length - enclosed;
    const inoperable = quotes.filter((q) => q.vehicleInoperable).length;
    const operable = quotes.length - inoperable;
    const multiUnit = quotes.filter((q) => q.units > 1).length;
    const pct = (n: number) =>
      `${quotes.length > 0 ? Math.round((n / quotes.length) * 100) : 0}%`;

    autoTable(doc, {
      startY: analysisTitleY + 3,
      head: [["Metric", "Count", "Percentage"]],
      body: [
        ["Enclosed Trailer", String(enclosed), pct(enclosed)],
        ["Open Trailer", String(open), pct(open)],
        ["Inoperable Vehicles", String(inoperable), pct(inoperable)],
        ["Operable Vehicles", String(operable), pct(operable)],
        ["Multi-Unit Shipments", String(multiUnit), pct(multiUnit)],
      ],
      margin: { left, right: 110, bottom: 20 },
      styles: TABLE_BODY_STYLES,
      headStyles: TABLE_HEAD_STYLES_SECONDARY,
      alternateRowStyles: TABLE_ALTERNATE_ROW,
      columnStyles: {
        1: { halign: "right" },
        2: { halign: "right" },
      },
    });
  }

  applyFootersToAllPages(doc, footerOpts);

  return doc.output("blob");
}

type ExcelCellValue = string | number | boolean | Date | null | undefined;

const EXCEL_COLORS = {
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

function safeExcelText(value: unknown, fallback = "—"): string {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function excelDate(value: unknown): string {
  if (!value) return "—";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function setWorksheetColumns(worksheet: any, widths: number[]) {
  worksheet["!cols"] = widths.map((wch) => ({ wch }));
}

function applyCellStyle(
  worksheet: any,
  address: string,
  style: Record<string, unknown>,
) {
  if (!worksheet[address]) worksheet[address] = { t: "s", v: "" };
  worksheet[address].s = style;
}

function applyRangeStyle(
  XLSX: any,
  worksheet: any,
  range: string,
  style: Record<string, unknown>,
) {
  const decoded = XLSX.utils.decode_range(range);
  for (let row = decoded.s.r; row <= decoded.e.r; row += 1) {
    for (let col = decoded.s.c; col <= decoded.e.c; col += 1) {
      applyCellStyle(
        worksheet,
        XLSX.utils.encode_cell({ r: row, c: col }),
        style,
      );
    }
  }
}

function getStatusStyle(status: string) {
  switch ((status || "").toLowerCase()) {
    case "draft":
      return { fill: "E2E8F0", font: "64748B" };
    case "posted":
    case "pending":
      return { fill: "FEF3C7", font: "F59E0B" };
    case "assigned":
      return { fill: "EDE9FE", font: "8B5CF6" };
    case "accepted":
      return { fill: "F3E8FF", font: "A855F7" };
    case "picked up":
      return { fill: "CFFAFE", font: "06B6D4" };
    case "in-transit":
    case "booked":
      return { fill: "DBEAFE", font: "2563EB" };
    case "delivered":
      return { fill: "DCFCE7", font: "10B981" };
    case "cancelled":
    case "rejected":
      return { fill: "FEE2E2", font: "EF4444" };
    default:
      return { fill: EXCEL_COLORS.graySoft, font: EXCEL_COLORS.text };
  }
}
function styleSummarySheet(
  XLSX: any,
  worksheet: any,
  title: string,
  monthLabel: string,
  metricStartRow: number,
  metricEndRow: number,
) {
  worksheet["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 1 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 1 } },
  ];

  // Suprah AI branded report title.
  applyRangeStyle(XLSX, worksheet, "A1:B1", {
    fill: { fgColor: { rgb: EXCEL_COLORS.navy } },
    font: {
      color: { rgb: EXCEL_COLORS.white },
      bold: true,
      sz: 20,
    },
    alignment: {
      horizontal: "center",
      vertical: "center",
      shrinkToFit: true,
    },
    border: {
      bottom: {
        style: "medium",
        color: { rgb: EXCEL_COLORS.green },
      },
    },
  });

  // Selected reporting period.
  applyRangeStyle(XLSX, worksheet, "A2:B2", {
    fill: { fgColor: { rgb: EXCEL_COLORS.green } },
    font: {
      color: { rgb: EXCEL_COLORS.white },
      bold: true,
      sz: 14,
    },
    alignment: { horizontal: "center", vertical: "center" },
  });

  // Generated metadata.
  applyRangeStyle(XLSX, worksheet, "A3:B3", {
    fill: { fgColor: { rgb: "F8FAFC" } },
    font: { color: { rgb: EXCEL_COLORS.gray }, sz: 10 },
    alignment: { vertical: "center" },
    border: {
      bottom: { style: "thin", color: { rgb: EXCEL_COLORS.border } },
    },
  });
  applyCellStyle(worksheet, "A3", {
    fill: { fgColor: { rgb: "F8FAFC" } },
    font: { color: { rgb: EXCEL_COLORS.gray }, bold: true, sz: 10 },
    alignment: { vertical: "center" },
    border: {
      bottom: { style: "thin", color: { rgb: EXCEL_COLORS.border } },
    },
  });
  applyCellStyle(worksheet, "B3", {
    fill: { fgColor: { rgb: "F8FAFC" } },
    font: { color: { rgb: EXCEL_COLORS.text }, sz: 10 },
    alignment: { horizontal: "right", vertical: "center" },
    border: {
      bottom: { style: "thin", color: { rgb: EXCEL_COLORS.border } },
    },
  });

  applyRangeStyle(XLSX, worksheet, `A${metricStartRow}:B${metricStartRow}`, {
    fill: { fgColor: { rgb: EXCEL_COLORS.navy } },
    font: {
      color: { rgb: EXCEL_COLORS.white },
      bold: true,
      sz: 12,
    },
    alignment: { horizontal: "center", vertical: "center" },
    border: {
      top: { style: "thin", color: { rgb: EXCEL_COLORS.border } },
      bottom: { style: "thin", color: { rgb: EXCEL_COLORS.border } },
      left: { style: "thin", color: { rgb: EXCEL_COLORS.border } },
      right: { style: "thin", color: { rgb: EXCEL_COLORS.border } },
    },
  });

  for (let row = metricStartRow + 1; row <= metricEndRow; row += 1) {
    const label = safeExcelText(worksheet[`A${row}`]?.v, "");
    const normalizedLabel = label.toLowerCase();
    const isKeyMetric =
      normalizedLabel.includes("revenue") ||
      normalizedLabel.includes("value") ||
      normalizedLabel.includes("success") ||
      normalizedLabel.includes("conversion");

    const fill = isKeyMetric
      ? EXCEL_COLORS.greenSoft
      : row % 2 === 0
        ? EXCEL_COLORS.graySoft
        : EXCEL_COLORS.white;

    const valueFont = isKeyMetric
      ? EXCEL_COLORS.greenDark
      : EXCEL_COLORS.text;

    applyRangeStyle(XLSX, worksheet, `A${row}:B${row}`, {
      fill: { fgColor: { rgb: fill } },
      font: { color: { rgb: EXCEL_COLORS.text }, sz: 11.5 },
      border: {
        bottom: { style: "thin", color: { rgb: EXCEL_COLORS.border } },
        left: { style: "thin", color: { rgb: EXCEL_COLORS.border } },
        right: { style: "thin", color: { rgb: EXCEL_COLORS.border } },
      },
      alignment: { vertical: "center" },
    });

    applyCellStyle(worksheet, `A${row}`, {
      fill: { fgColor: { rgb: fill } },
      font: {
        color: { rgb: EXCEL_COLORS.text },
        bold: isKeyMetric,
        sz: 11.5,
      },
      alignment: { horizontal: "left", vertical: "center" },
      border: {
        bottom: { style: "thin", color: { rgb: EXCEL_COLORS.border } },
        left: { style: "thin", color: { rgb: EXCEL_COLORS.border } },
        right: { style: "thin", color: { rgb: EXCEL_COLORS.border } },
      },
    });

    applyCellStyle(worksheet, `B${row}`, {
      fill: { fgColor: { rgb: fill } },
      font: {
        color: { rgb: valueFont },
        bold: true,
        sz: isKeyMetric ? 13.5 : 12.5,
      },
      border: {
        bottom: { style: "thin", color: { rgb: EXCEL_COLORS.border } },
        left: { style: "thin", color: { rgb: EXCEL_COLORS.border } },
        right: { style: "thin", color: { rgb: EXCEL_COLORS.border } },
      },
      alignment: { horizontal: "center", vertical: "center" },
    });
  }

  const rowHeights: Array<{ hpt: number }> = [];
  rowHeights[0] = { hpt: 34 };
  rowHeights[1] = { hpt: 25 };
  rowHeights[2] = { hpt: 21 };
  rowHeights[3] = { hpt: 10 };
  rowHeights[metricStartRow - 1] = { hpt: 25 };

  for (let row = metricStartRow; row < metricEndRow; row += 1) {
    rowHeights[row] = { hpt: 24 };
  }

  worksheet["!rows"] = rowHeights;
  setWorksheetColumns(worksheet, [36, 28]);
  worksheet["!freeze"] = { xSplit: 0, ySplit: metricStartRow };
  worksheet["!sheetView"] = [{ showGridLines: false }];
}

function styleDataSheet(
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

  applyRangeStyle(XLSX, worksheet, `A1:${lastColumn}1`, {
    fill: { fgColor: { rgb: EXCEL_COLORS.navy } },
    font: {
      color: { rgb: EXCEL_COLORS.white },
      bold: true,
      sz: 11.5,
    },
    alignment: {
      horizontal: "center",
      vertical: "center",
      wrapText: true,
    },
    border: {
      top: { style: "thin", color: { rgb: EXCEL_COLORS.green } },
      bottom: { style: "medium", color: { rgb: EXCEL_COLORS.green } },
      left: { style: "thin", color: { rgb: EXCEL_COLORS.border } },
      right: { style: "thin", color: { rgb: EXCEL_COLORS.border } },
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
            ? EXCEL_COLORS.columnSoft
            : EXCEL_COLORS.columnAltSoft
          : isOddExcelColumn
            ? EXCEL_COLORS.white
            : "F5FBF8";

      const isCentered = centerColumns.includes(columnIndex);
      const isRightAligned = rightColumns.includes(columnIndex);
      const isEmphasized = emphasisColumns.includes(columnIndex);
      const isCurrency = currencyColumns.includes(columnIndex);
      const isDate = dateColumns.includes(columnIndex);

      applyCellStyle(worksheet, address, {
        fill: { fgColor: { rgb: fill } },
        font: {
          color: {
            rgb: isCurrency
              ? EXCEL_COLORS.greenDark
              : isDate
                ? EXCEL_COLORS.gray
                : EXCEL_COLORS.text,
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
          bottom: { style: "thin", color: { rgb: EXCEL_COLORS.border } },
          left: { style: "hair", color: { rgb: EXCEL_COLORS.border } },
          right: { style: "hair", color: { rgb: EXCEL_COLORS.border } },
        },
      });
    }

    // Status colors take priority over the alternating-column treatment.
    if (statusColumnIndex !== undefined) {
      const address = `${XLSX.utils.encode_col(statusColumnIndex)}${row}`;
      const status = safeExcelText(worksheet[address]?.v, "");
      const colors = getStatusStyle(status);

      applyCellStyle(worksheet, address, {
        fill: { fgColor: { rgb: colors.fill } },
        font: { color: { rgb: colors.font }, bold: true, sz: 10.5 },
        alignment: { horizontal: "center", vertical: "center" },
        border: {
          bottom: { style: "thin", color: { rgb: EXCEL_COLORS.border } },
          left: { style: "hair", color: { rgb: EXCEL_COLORS.border } },
          right: { style: "hair", color: { rgb: EXCEL_COLORS.border } },
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

export async function generateShipmentReportExcel(
  shipments: Load[],
  monthLabel: string,
): Promise<Blob> {
  const XLSX = await import("xlsx-js-style");
  const workbook = XLSX.utils.book_new();
  const summary = buildShipmentSummary(shipments);
  const generatedAt = new Date().toLocaleString("en-US");

  const summaryRows: ExcelCellValue[][] = [
    ["SUPRAH AI — UNIFIED LOAD REPORT"],
    [monthLabel],
    ["Generated", generatedAt],
    [],
    ["Summary Metric", "Value"],
    ["Total Shipments", summary.total],
    ["Delivered", summary.delivered],
    ["In Transit", summary.inRoute + summary.dispatched],
    ["Available", summary.available],
    ["Total Revenue", summary.totalRate],
    ["Success Rate", summary.onTimeRate / 100],
  ];

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryRows);
  summarySheet["B10"] = {
    t: "n",
    v: Number(summary.totalRate || 0),
    z: "$#,##0.00",
  };
  summarySheet["B11"] = {
    t: "n",
    v: Number(summary.onTimeRate || 0) / 100,
    z: "0%",
  };
  styleSummarySheet(
    XLSX,
    summarySheet,
    "Unified Load Report",
    monthLabel,
    5,
    11,
  );
  XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");

  const detailRows = shipments.map((shipment) => ({
    "Tracking #": shipment.loadNumber || "—",
    Status: safeExcelText(shipment.status),
    Customer: shipmentCustomer(shipment),
    Vehicle: shipmentVehicle(shipment),
    VIN: shipmentVin(shipment),
    Origin: shipment.pickupLocation
      ? `${shipment.pickupLocation.city}, ${shipment.pickupLocation.state}`
      : "—",
    Destination: shipment.deliveryLocation
      ? `${shipment.deliveryLocation.city}, ${shipment.deliveryLocation.state}`
      : "—",
    "Transport Type": shipmentTransportType(shipment),
    Rate: Number(shipmentRate(shipment) || 0),
    Driver: driverName(shipment),
    "Created Date": excelDate(shipment.createdAt),
    "Delivered Date": excelDate(shipment.deliveredAt),
  }));

  const detailSheet = XLSX.utils.json_to_sheet(detailRows);
  setWorksheetColumns(
    detailSheet,
    [18, 16, 24, 24, 20, 24, 24, 18, 15, 22, 16, 16],
  );
  for (let row = 2; row <= detailRows.length + 1; row += 1) {
    if (detailSheet[`I${row}`]) detailSheet[`I${row}`].z = "$#,##0.00";
  }
  styleDataSheet(
    XLSX,
    detailSheet,
    detailRows.length,
    12,
    1,
    [1, 7, 9, 10, 11],
    [8],
    [2, 3],
    [8],
    [10, 11],
  );
  XLSX.utils.book_append_sheet(workbook, detailSheet, "Load Details");

  const statusMap = new Map<string, { count: number; revenue: number }>();
  shipments.forEach((shipment) => {
    const status = safeExcelText(shipment.status, "Unknown");
    const current = statusMap.get(status) || { count: 0, revenue: 0 };
    current.count += 1;
    current.revenue += Number(shipmentRate(shipment) || 0);
    statusMap.set(status, current);
  });

  const statusRows = Array.from(statusMap.entries()).map(([status, values]) => ({
    Status: status,
    Count: values.count,
    Percentage: shipments.length > 0 ? values.count / shipments.length : 0,
    "Total Revenue": values.revenue,
    "Average Rate": values.count > 0 ? values.revenue / values.count : 0,
  }));

  const statusSheet = XLSX.utils.json_to_sheet(statusRows);
  setWorksheetColumns(statusSheet, [18, 12, 14, 18, 18]);
  for (let row = 2; row <= statusRows.length + 1; row += 1) {
    if (statusSheet[`C${row}`]) statusSheet[`C${row}`].z = "0%";
    if (statusSheet[`D${row}`]) statusSheet[`D${row}`].z = "$#,##0.00";
    if (statusSheet[`E${row}`]) statusSheet[`E${row}`].z = "$#,##0.00";
  }
  styleDataSheet(
    XLSX,
    statusSheet,
    statusRows.length,
    5,
    0,
    [0, 1, 2],
    [3, 4],
    [0],
    [3, 4],
    [],
  );
  XLSX.utils.book_append_sheet(workbook, statusSheet, "Status Analysis");

  const output = XLSX.write(workbook, {
    bookType: "xlsx",
    type: "array",
    cellStyles: true,
  });

  return new Blob([output], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

export async function generateQuoteReportExcel(
  quotes: Quote[],
  monthLabel: string,
): Promise<Blob> {
  const XLSX = await import("xlsx-js-style");
  const workbook = XLSX.utils.book_new();
  const summary = buildQuoteSummary(quotes);
  const generatedAt = new Date().toLocaleString("en-US");

  const summaryRows: ExcelCellValue[][] = [
    ["SUPRAH AI — QUOTES & DRAFTS REPORT"],
    [monthLabel],
    ["Generated", generatedAt],
    [],
    ["Summary Metric", "Value"],
    ["Total Quotes", summary.total],
    ["Booked", summary.booked],
    ["Conversion Rate", summary.conversionRate / 100],
    ["Pending", summary.pending],
    ["Total Value", summary.totalRate],
    ["Average Rate", summary.avgRate],
  ];

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryRows);
  summarySheet["B8"] = {
    t: "n",
    v: Number(summary.conversionRate || 0) / 100,
    z: "0%",
  };
  summarySheet["B10"] = {
    t: "n",
    v: Number(summary.totalRate || 0),
    z: "$#,##0.00",
  };
  summarySheet["B11"] = {
    t: "n",
    v: Number(summary.avgRate || 0),
    z: "$#,##0.00",
  };
  styleSummarySheet(
    XLSX,
    summarySheet,
    "Quotes & Drafts Report",
    monthLabel,
    5,
    11,
  );
  XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");

  const detailRows = quotes.map((quote) => ({
    Customer: quoteCustomer(quote),
    Vehicle: quoteVehicle(quote),
    From: quoteFromAddr(quote),
    To: quoteToAddr(quote),
    Miles: Number(quote.miles || 0),
    Rate: Number(quote.rate || 0),
    ETA: quoteEta(quote),
    "Transport Type": quoteTransportType(quote),
    Units: Number(quote.units || 1),
    Status: safeExcelText(quote.status),
    "Created Date": excelDate(quote.createdAt),
  }));

  const detailSheet = XLSX.utils.json_to_sheet(detailRows);
  setWorksheetColumns(
    detailSheet,
    [24, 24, 28, 28, 12, 15, 18, 18, 10, 14, 16],
  );
  for (let row = 2; row <= detailRows.length + 1; row += 1) {
    if (detailSheet[`F${row}`]) detailSheet[`F${row}`].z = "$#,##0.00";
  }
  styleDataSheet(
    XLSX,
    detailSheet,
    detailRows.length,
    11,
    9,
    [4, 6, 7, 8, 9, 10],
    [5],
    [0, 1],
    [5],
    [10],
  );
  XLSX.utils.book_append_sheet(workbook, detailSheet, "Quote Details");

  const statusMap = new Map<
    string,
    { count: number; value: number; miles: number }
  >();

  quotes.forEach((quote) => {
    const status = safeExcelText(quote.status, "Unknown");
    const current = statusMap.get(status) || {
      count: 0,
      value: 0,
      miles: 0,
    };
    current.count += 1;
    current.value += Number(quote.rate || 0);
    current.miles += Number(quote.miles || 0);
    statusMap.set(status, current);
  });

  const statusRows = Array.from(statusMap.entries()).map(([status, values]) => ({
    Status: status,
    Count: values.count,
    Percentage: quotes.length > 0 ? values.count / quotes.length : 0,
    "Total Value": values.value,
    "Average Rate": values.count > 0 ? values.value / values.count : 0,
    "Total Miles": values.miles,
  }));

  const statusSheet = XLSX.utils.json_to_sheet(statusRows);
  setWorksheetColumns(statusSheet, [18, 12, 14, 18, 18, 16]);
  for (let row = 2; row <= statusRows.length + 1; row += 1) {
    if (statusSheet[`C${row}`]) statusSheet[`C${row}`].z = "0%";
    if (statusSheet[`D${row}`]) statusSheet[`D${row}`].z = "$#,##0.00";
    if (statusSheet[`E${row}`]) statusSheet[`E${row}`].z = "$#,##0.00";
  }
  styleDataSheet(
    XLSX,
    statusSheet,
    statusRows.length,
    6,
    0,
    [0, 1, 2, 5],
    [3, 4],
    [0],
    [3, 4],
    [],
  );
  XLSX.utils.book_append_sheet(workbook, statusSheet, "Status Analysis");

  const output = XLSX.write(workbook, {
    bookType: "xlsx",
    type: "array",
    cellStyles: true,
  });

  return new Blob([output], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}