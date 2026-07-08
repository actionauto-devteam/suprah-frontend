import { jsPDF } from "jspdf";
import { Load, LoadStatus } from "@/types/load";

export type ShipmentPDFResult = "saved" | "cancelled" | "initiated";
export type LoadPDFResult = ShipmentPDFResult;

// ─── Font loader ─────────────────────────────────────────────────────────────
async function loadFontBase64(url: string): Promise<string> {
  try {
    const res = await fetch(url);
    if (!res.ok) return "";
    const buf = await res.arrayBuffer();
    const bytes = new Uint8Array(buf);
    let bin = "";
    bytes.forEach((b) => (bin += String.fromCharCode(b)));
    return btoa(bin);
  } catch {
    return "";
  }
}

// ─── Logo loader (same pattern as reportPdfTemplate) ─────────────────────────
async function loadLogoBase64(): Promise<string> {
  try {
    const res = await fetch("/icon-192x192.png");
    if (!res.ok) return "";
    const buf = await res.arrayBuffer();
    const bytes = new Uint8Array(buf);
    let bin = "";
    bytes.forEach((b) => (bin += String.fromCharCode(b)));
    return "data:image/png;base64," + btoa(bin);
  } catch {
    return "";
  }
}

// Google Fonts GitHub — stable permanent TTF URLs
const FONT_URLS = {
  poppinsSemiBold:
    "https://raw.githubusercontent.com/google/fonts/main/ofl/poppins/Poppins-SemiBold.ttf",
  interRegular:
    "https://raw.githubusercontent.com/google/fonts/main/ofl/inter/static/Inter-Regular.ttf",
  interMedium:
    "https://raw.githubusercontent.com/google/fonts/main/ofl/inter/static/Inter-Medium.ttf",
};

/**
 * Embed custom fonts into a jsPDF instance.
 * Falls back gracefully to helvetica if a font fails to load.
 */
async function embedFonts(pdf: jsPDF): Promise<{
  heading: string;
  body: string;
  mono: string;
}> {
  const [poppins, interR, interM] = await Promise.all([
    loadFontBase64(FONT_URLS.poppinsSemiBold),
    loadFontBase64(FONT_URLS.interRegular),
    loadFontBase64(FONT_URLS.interMedium),
  ]);

  let heading = "helvetica";
  let body = "helvetica";
  let mono = "courier";

  if (poppins) {
    pdf.addFileToVFS("Poppins-SemiBold.ttf", poppins);
    pdf.addFont("Poppins-SemiBold.ttf", "Poppins", "bold");
    heading = "Poppins";
  }
  if (interR) {
    pdf.addFileToVFS("Inter-Regular.ttf", interR);
    pdf.addFont("Inter-Regular.ttf", "Inter", "normal");
    body = "Inter";
  }
  if (interM) {
    pdf.addFileToVFS("Inter-Medium.ttf", interM);
    pdf.addFont("Inter-Medium.ttf", "Inter", "medium");
    mono = "Inter";
  }

  return { heading, body, mono };
}

/**
 * Generate and download a professional PDF of shipment details
 * Action Auto Utah — Powered by Supra AI
 */
export const generateLoadPDF = async (
  load: Load,
): Promise<LoadPDFResult> => {
  const pdf = new jsPDF("p", "mm", "a4");
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  // Get data
  const vehicle = load.vehicles?.[0];
  const vehicleName = vehicle
    ? `${vehicle.year || ''} ${vehicle.make || ''} ${vehicle.model || ''}`.trim()
    : "N/A";

  // Updated color system aligned with dashboard
  const colors = {
    page: "#f8fafc",
    card: "#ffffff",
    border: "#dbe3ee",
    headerDark: "#0f172a",
    headerTone: "#132339",
    brand: "#22c55e",
    brandDark: "#16a34a",
    text: "#111827",
    textMuted: "#6b7280",
    textSoft: "#94a3b8",
  };

  // Helper function to format dates
  const formatDate = (date?: string) => {
    if (!date) return "Not Scheduled";
    return new Date(date).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
      timeZone: "America/Denver",
    });
  };

  // Helper function to get status color
  const getStatusColor = (status: LoadStatus) => {
    switch (status) {
      case "Posted":
        return "#f59e0b";
      case "Delivered":
        return "#10b981";
      case "Cancelled":
        return "#ef4444";
      case "In-Transit":
        return "#3b82f6";
      case "Accepted":
        return "#8b5cf6";
      case "Picked Up":
        return "#f97316";
      default:
        return "#6b7280";
    }
  };

  const marginX = 14;
  const contentWidth = pageWidth - marginX * 2;
  let yPosition = 12;
  const generatedAt = new Date();

  const currentDate = generatedAt.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "America/Denver",
  });

  // Load logo + embed fonts in parallel
  const [logoBase64, fonts] = await Promise.all([
    loadLogoBase64(),
    embedFonts(pdf),
  ]);

  // Font aliases for QA spec
  // heading  → Poppins SemiBold (falls back to helvetica bold)
  // body     → Inter Regular    (falls back to helvetica normal)
  // mono     → Inter Medium     (falls back to courier normal)
  const F = fonts;

  const drawPageBackground = () => {
    const bg = hexToRgb(colors.page);
    pdf.setFillColor(bg.r, bg.g, bg.b);
    pdf.rect(0, 0, pageWidth, pageHeight, "F");
  };

  const drawHeader = (isContinuation = false) => {
    drawPageBackground();

    const dark = hexToRgb(colors.headerDark);
    const tone = hexToRgb(colors.headerTone);
    const brand = hexToRgb(colors.brand);

    pdf.setFillColor(dark.r, dark.g, dark.b);
    pdf.rect(0, 0, pageWidth, 34, "F");
    pdf.setFillColor(tone.r, tone.g, tone.b);
    pdf.rect(pageWidth * 0.62, 0, pageWidth * 0.38, 34, "F");
    pdf.setFillColor(brand.r, brand.g, brand.b);
    pdf.rect(0, 0, 5, 34, "F");

    // Logo image (10×10 mm) or "AA" badge fallback
    if (logoBase64) {
      pdf.addImage(logoBase64, "PNG", marginX, 8, 10, 10);
    } else {
      pdf.setFillColor(brand.r, brand.g, brand.b);
      pdf.roundedRect(marginX, 8, 10, 10, 2, 2, "F");
      pdf.setTextColor(255, 255, 255);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(7);
      pdf.text("AA", marginX + 5, 14.5, { align: "center" });
    }

    // Company name — Poppins SemiBold (heading font)
    pdf.setTextColor(255, 255, 255);
    pdf.setFont(F.heading, "bold");
    pdf.setFontSize(13);
    pdf.text("ACTION AUTO UTAH", marginX + 14, 13);
    pdf.setFont(F.body, "normal");
    pdf.setFontSize(7.5);
    pdf.text("Powered by Supra AI", marginX + 14, 17.5);

    // Right side — Poppins SemiBold for title, Inter Regular for meta
    pdf.setFont(F.heading, "bold");
    pdf.setFontSize(10.5);
    pdf.text("Load Documentation", pageWidth - marginX, 12.5, {
      align: "right",
    });
    pdf.setFont(F.body, "normal");
    pdf.setFontSize(7.5);
    pdf.text(`Issue Date: ${currentDate}`, pageWidth - marginX, 17, {
      align: "right",
    });
    pdf.text(`Report Type: Load Manifest`, pageWidth - marginX, 21, {
      align: "right",
    });

    pdf.setDrawColor(46, 58, 77);
    pdf.setLineWidth(0.3);
    pdf.line(marginX, 26.5, pageWidth - marginX, 26.5);

    if (isContinuation) {
      pdf.setTextColor(188, 199, 215);
      pdf.setFont(F.body, "normal");
      pdf.setFontSize(7.2);
      pdf.text("Continued", pageWidth - marginX, 30.5, { align: "right" });
    }

    yPosition = 42;
  };

  const ensureSpace = (neededHeight: number) => {
    if (yPosition + neededHeight <= pageHeight - 26) return;
    pdf.addPage();
    drawHeader(true);
  };

  const drawSectionTitle = (title: string) => {
    pdf.setTextColor(17, 24, 39);
    // QA spec: Poppins SemiBold for section headings
    pdf.setFont(F.heading, "bold");
    pdf.setFontSize(10.5);
    pdf.text(title, marginX, yPosition);

    const lineStart = marginX + pdf.getTextWidth(title) + 3;
    pdf.setDrawColor(198, 208, 222);
    pdf.setLineWidth(0.35);
    pdf.line(lineStart, yPosition - 0.8, pageWidth - marginX, yPosition - 0.8);
    yPosition += 5;
  };

  const drawCard = (x: number, y: number, width: number, height: number) => {
    const card = hexToRgb(colors.card);
    pdf.setFillColor(card.r, card.g, card.b);
    pdf.setDrawColor(216, 225, 237);
    pdf.setLineWidth(0.35);
    pdf.roundedRect(x, y, width, height, 2.2, 2.2, "FD");
  };

  const drawKeyValueRows = (
    rows: Array<{ label: string; value: string }>,
    valueX: number,
    rowHeight = 8.5,
  ) => {
    rows.forEach((row, index) => {
      const rowY = yPosition + index * rowHeight;
      if (index % 2 === 1) {
        pdf.setFillColor(250, 252, 255);
        pdf.rect(marginX + 1.2, rowY - 4.8, contentWidth - 2.4, rowHeight, "F");
      }

      // QA spec: labels = Inter Medium (uppercase), values = Inter Regular
      pdf.setTextColor(100, 116, 139);
      pdf.setFont(F.mono, F.mono === "Inter" ? "medium" : "bold");
      pdf.setFontSize(7.8);
      pdf.text(row.label.toUpperCase(), marginX + 5, rowY);

      pdf.setTextColor(30, 41, 59);
      pdf.setFont(F.body, "normal");
      pdf.setFontSize(8.7);
      pdf.text(row.value || "N/A", valueX, rowY);
    });

    yPosition += rows.length * rowHeight + 2;
  };

  drawHeader(false);

  // Hero: Load Number / Vehicle / Status
  ensureSpace(27);
  drawCard(marginX, yPosition, contentWidth, 23);

  // QA spec: label = Inter Medium, tracking number = Inter Medium, vehicle = Inter Regular
  pdf.setTextColor(100, 116, 139);
  pdf.setFont(F.mono, F.mono === "Inter" ? "medium" : "bold");
  pdf.setFontSize(8);
  pdf.text("Load Number", marginX + 5, yPosition + 7);

  pdf.setTextColor(17, 24, 39);
  pdf.setFont(F.mono, F.mono === "Inter" ? "medium" : "bold");
  pdf.setFontSize(13);
  pdf.text(
    load.loadNumber || "Not Assigned",
    marginX + 5,
    yPosition + 14.5,
  );

  pdf.setTextColor(100, 116, 139);
  pdf.setFont(F.mono, F.mono === "Inter" ? "medium" : "bold");
  pdf.setFontSize(7.8);
  pdf.text("Primary Vehicle", marginX + 5, yPosition + 19.5);
  pdf.setTextColor(36, 52, 76);
  pdf.setFont(F.body, "normal");
  pdf.setFontSize(8.3);
  pdf.text(vehicleName, marginX + 30, yPosition + 19.5);

  const statusColor = getStatusColor(load.status);
  const statusRgb = hexToRgb(statusColor);
  const statusText = (load.status || "Unknown").toUpperCase();
  pdf.setFont(F.heading, "bold");
  pdf.setFontSize(8);
  const statusWidth = Math.max(42, pdf.getTextWidth(statusText) + 16);
  const statusX = pageWidth - marginX - statusWidth;
  pdf.setFillColor(statusRgb.r, statusRgb.g, statusRgb.b);
  pdf.roundedRect(statusX, yPosition + 5.2, statusWidth, 8.4, 4, 4, "F");
  pdf.setTextColor(255, 255, 255);
  pdf.text(statusText, statusX + statusWidth / 2, yPosition + 10.9, {
    align: "center",
  });

  yPosition += 30;

  // Customer Information (if available in load.customer)
  ensureSpace(40);
  drawSectionTitle("Customer Information");
  const customerRows = [
    {
      label: "Customer Name",
      value: load.pickupLocation?.contactName || "N/A",
    },
    { label: "Contact Phone", value: load.pickupLocation?.phone || "N/A" },
    { label: "Contact Email", value: load.pickupLocation?.email || "N/A" },
  ];
  const customerCardHeight = customerRows.length * 8.5 + 4;
  drawCard(marginX, yPosition - 1.2, contentWidth, customerCardHeight);
  drawKeyValueRows(customerRows, marginX + 60);
  yPosition += 3;

  // Vehicle Information (Iterate through all vehicles if needed, but here we show primary)
  ensureSpace(48);
  drawSectionTitle("Vehicle Information");
  const vehicleRows = [
    { label: "Vehicle", value: vehicleName },
    { label: "VIN Number", value: vehicle?.vin || "N/A" },
    {
      label: "Stock Number",
      value: vehicle?.lotNumber || "N/A",
    },
    { label: "Condition", value: vehicle?.condition || "Operable" },
  ];
  const vehicleCardHeight = vehicleRows.length * 8.5 + 4;
  drawCard(marginX, yPosition - 1.2, contentWidth, vehicleCardHeight);
  drawKeyValueRows(vehicleRows, marginX + 60);
  yPosition += 3;

  // Route Information
  ensureSpace(38);
  drawSectionTitle("Route Information");
  drawCard(marginX, yPosition - 1.2, contentWidth, 29);

  const routeX = marginX + 7;
  const routeTop = yPosition + 5;
  pdf.setDrawColor(205, 214, 229);
  pdf.setLineWidth(0.9);
  pdf.line(routeX, routeTop + 2.5, routeX, routeTop + 12.5);

  pdf.setFillColor(34, 197, 94);
  pdf.circle(routeX, routeTop, 2.5, "F");
  pdf.setTextColor(100, 116, 139);
  pdf.setFont(F.mono, F.mono === "Inter" ? "medium" : "bold");
  pdf.setFontSize(7.6);
  pdf.text("ORIGIN", routeX + 6, routeTop - 0.8);
  pdf.setTextColor(30, 41, 59);
  pdf.setFont(F.body, "normal");
  pdf.setFontSize(9);
  pdf.text(`${load.pickupLocation.city}, ${load.pickupLocation.state} ${load.pickupLocation.zip || ''}`, routeX + 6, routeTop + 3.8);

  pdf.setFillColor(239, 68, 68);
  pdf.circle(routeX, routeTop + 15.2, 2.5, "F");
  pdf.setTextColor(100, 116, 139);
  pdf.setFont(F.mono, F.mono === "Inter" ? "medium" : "bold");
  pdf.setFontSize(7.6);
  pdf.text("DESTINATION", routeX + 6, routeTop + 14.6);
  pdf.setTextColor(30, 41, 59);
  pdf.setFont(F.body, "normal");
  pdf.setFontSize(9);
  pdf.text(`${load.deliveryLocation.city}, ${load.deliveryLocation.state} ${load.deliveryLocation.zip || ""}`.trim(), routeX + 6, routeTop + 19);

  yPosition += 34;

  // Load Timeline
  const timelineData = [
    {
      label: "Pickup Deadline",
      date: formatDate(load.dates?.pickupDeadline),
    },
    { label: "Actual Pickup", date: formatDate(load.pickedUpAt) },
    {
      label: "Delivery Deadline",
      date: formatDate(load.dates?.deliveryDeadline),
    },
    { label: "Actual Delivery", date: formatDate(load.deliveredAt) },
  ];

  ensureSpace(58);
  drawSectionTitle("Load Timeline");
  const timelineCardHeight = timelineData.length * 9 + 5;
  drawCard(marginX, yPosition - 1.2, contentWidth, timelineCardHeight);

  timelineData.forEach((item, index) => {
    const rowY = yPosition + index * 9;
    if (index % 2 === 1) {
      pdf.setFillColor(250, 252, 255);
      pdf.rect(marginX + 1.2, rowY - 5, contentWidth - 2.4, 9, "F");
    }

    const stepColor = index === 0 ? [37, 99, 235] : [99, 102, 241];
    pdf.setFillColor(stepColor[0], stepColor[1], stepColor[2]);
    pdf.circle(marginX + 7, rowY - 0.2, 2.3, "F");
    pdf.setTextColor(255, 255, 255);
    pdf.setFont(F.heading, "bold");
    pdf.setFontSize(6.8);
    pdf.text(String(index + 1), marginX + 7, rowY + 0.9, { align: "center" });

    // QA spec: label = Inter Medium, date = Inter Regular
    pdf.setTextColor(71, 85, 105);
    pdf.setFont(F.mono, F.mono === "Inter" ? "medium" : "bold");
    pdf.setFontSize(8.1);
    pdf.text(item.label, marginX + 12, rowY);

    pdf.setTextColor(30, 41, 59);
    pdf.setFont(F.body, "normal");
    pdf.setFontSize(8.6);
    pdf.text(item.date, pageWidth - marginX - 4, rowY, { align: "right" });
  });

  yPosition += timelineData.length * 9 + 8;

  // Pricing & Financials
  ensureSpace(56);
  drawSectionTitle("Financial Details");

  const pricingRows = [
    {
      label: "Carrier Pay",
      value: load.pricing?.carrierPayAmount != null ? `$${load.pricing.carrierPayAmount.toLocaleString()}` : "N/A",
    },
    {
      label: "COP/COD Amount",
      value: load.pricing?.copCodAmount != null ? `$${load.pricing.copCodAmount.toLocaleString()}` : "None",
    },
    { label: "Payment Method", value: "Direct Deposit" },
  ];

  const pricingCardHeight = pricingRows.length * 8.5 + 4;
  drawCard(marginX, yPosition - 1.2, contentWidth, pricingCardHeight);
  drawKeyValueRows(pricingRows, marginX + 60);

  // ✅ rateBoxY captured AFTER drawKeyValueRows advances yPosition
  ensureSpace(22);
  const rateBoxY = yPosition + 2;
  const brand = hexToRgb(colors.brandDark);
  const brandSoft = hexToRgb(colors.brand);
  pdf.setFillColor(brand.r, brand.g, brand.b);
  pdf.roundedRect(marginX, rateBoxY, contentWidth, 15, 2, 2, "F");
  pdf.setFillColor(brandSoft.r, brandSoft.g, brandSoft.b);
  pdf.rect(marginX, rateBoxY, contentWidth * 0.28, 15, "F");
  pdf.setTextColor(255, 255, 255);
  // QA spec: Poppins SemiBold for rate label, Inter Medium for amount
  pdf.setFont(F.heading, "bold");
  pdf.setFontSize(8.5);
  pdf.text("TOTAL TRANSPORT RATE", marginX + 5, rateBoxY + 6.2);
  pdf.setFont(F.mono, F.mono === "Inter" ? "medium" : "bold");
  pdf.setFontSize(15);
  pdf.text(
    `$${load.pricing?.carrierPayAmount?.toLocaleString() || "N/A"}`,
    marginX + 5,
    rateBoxY + 12.3,
  );
  pdf.setFont(F.body, "normal");
  pdf.setFontSize(8.2);
  pdf.text("USD", pageWidth - marginX - 5, rateBoxY + 12.1, { align: "right" });

  // ── Footer on all pages (QA spec) ────────────────────────────────────────
  // Line 1 (center): Document ID: TRK-xxx • Generated: Apr 30, 2026, 07:08 AM • Page X of Y
  // Line 2 (center): Action Auto Utah • support@actionautoutah.com
  const totalPages = pdf.getNumberOfPages();
  const genLabel = generatedAt.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  const docIdLabel = load.loadNumber || load._id;

  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    const footerY = pageHeight - 10;
    pdf.setDrawColor(220, 228, 239);
    pdf.setLineWidth(0.3);
    pdf.line(marginX, footerY - 6, pageWidth - marginX, footerY - 6);

    // Line 1 — center: metadata  |  right: page number
    pdf.setFont(F.body, "normal");
    pdf.setFontSize(6.8);
    pdf.setTextColor(100, 116, 139);
    pdf.text(
      `Document ID: ${docIdLabel}  •  Generated: ${genLabel}`,
      pageWidth / 2,
      footerY - 2,
      { align: "center" },
    );
    pdf.setFont(F.heading, "bold");
    pdf.text(`Page ${i} of ${totalPages}`, pageWidth - marginX, footerY - 2, {
      align: "right",
    });

    // Line 2 — left: company  |  center: email
    pdf.setFont(F.body, "normal");
    pdf.setFontSize(6.5);
    pdf.setTextColor(148, 163, 184);
    pdf.text(
      "Action Auto Utah  •  support@actionautoutah.com",
      pageWidth / 2,
      footerY + 3,
      { align: "center" },
    );
  }

  // ============================================
  // SAVE PDF
  // ============================================
  const fileName = `ActionAutoUtah_Load_${load.loadNumber || load._id}.pdf`;
  const pdfBlob = pdf.output("blob");

  if (typeof window !== "undefined" && "showSaveFilePicker" in window) {
    try {
      const fileHandle = await (window as any).showSaveFilePicker({
        suggestedName: fileName,
        types: [
          {
            description: "PDF Document",
            accept: { "application/pdf": [".pdf"] },
          },
        ],
      });

      const writable = await fileHandle.createWritable();
      await writable.write(pdfBlob);
      await writable.close();
      return "saved";
    } catch (error: any) {
      if (error?.name === "AbortError") {
        return "cancelled";
      }
      throw error;
    }
  }

  await (pdf as any).save(fileName, { returnPromise: true });
  return "initiated";
};

// Helper function to convert hex to RGB
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16),
    }
    : { r: 0, g: 0, b: 0 };
}
