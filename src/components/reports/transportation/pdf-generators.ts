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
