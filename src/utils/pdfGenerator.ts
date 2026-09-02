import { jsPDF } from "jspdf";
import { Load, LoadStatus } from "@/types/load";
import { formatScheduleDate } from "@/utils/calendar.utils";

export type ShipmentPDFResult = "saved" | "cancelled" | "initiated";
export type LoadPDFResult = ShipmentPDFResult;

// ─── Asset loaders ────────────────────────────────────────────────────────────
async function loadFontBase64(url: string): Promise<string> {
  try {
    const res = await fetch(url);
    if (!res.ok) return "";

    const buf = await res.arrayBuffer();
    const bytes = new Uint8Array(buf);
    let bin = "";

    bytes.forEach((byte) => {
      bin += String.fromCharCode(byte);
    });

    return btoa(bin);
  } catch {
    return "";
  }
}

async function loadLogoBase64(): Promise<string> {
  try {
    const res = await fetch("/icon-192x192.png");
    if (!res.ok) return "";

    const buf = await res.arrayBuffer();
    const bytes = new Uint8Array(buf);
    let bin = "";

    bytes.forEach((byte) => {
      bin += String.fromCharCode(byte);
    });

    return `data:image/png;base64,${btoa(bin)}`;
  } catch {
    return "";
  }
}

const FONT_URLS = {
  poppinsSemiBold:
    "https://raw.githubusercontent.com/google/fonts/main/ofl/poppins/Poppins-SemiBold.ttf",
  interRegular:
    "https://raw.githubusercontent.com/google/fonts/main/ofl/inter/static/Inter-Regular.ttf",
  interMedium:
    "https://raw.githubusercontent.com/google/fonts/main/ofl/inter/static/Inter-Medium.ttf",
};

async function embedFonts(pdf: jsPDF): Promise<{
  heading: string;
  body: string;
  medium: string;
}> {
  const [poppins, interRegular, interMedium] = await Promise.all([
    loadFontBase64(FONT_URLS.poppinsSemiBold),
    loadFontBase64(FONT_URLS.interRegular),
    loadFontBase64(FONT_URLS.interMedium),
  ]);

  let heading = "helvetica";
  let body = "helvetica";
  let medium = "helvetica";

  if (poppins) {
    pdf.addFileToVFS("Poppins-SemiBold.ttf", poppins);
    pdf.addFont("Poppins-SemiBold.ttf", "Poppins", "bold");
    heading = "Poppins";
  }

  if (interRegular) {
    pdf.addFileToVFS("Inter-Regular.ttf", interRegular);
    pdf.addFont("Inter-Regular.ttf", "Inter", "normal");
    body = "Inter";
  }

  if (interMedium) {
    pdf.addFileToVFS("Inter-Medium.ttf", interMedium);
    pdf.addFont("Inter-Medium.ttf", "Inter", "medium");
    medium = "Inter";
  }

  return { heading, body, medium };
}

// ─── General helpers ──────────────────────────────────────────────────────────
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

function safeText(value: unknown, fallback = "N/A"): string {
  if (value === null || value === undefined) return fallback;

  const text = String(value).trim();
  return text.length > 0 ? text : fallback;
}

function formatCurrency(value?: number): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "N/A";

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value?: string): string {
  if (!value) return "Not Scheduled";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not Scheduled";

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "America/Denver",
  });
}

function getStatusColor(status?: LoadStatus): string {
  switch (status) {
    case "Posted":
      return "#f59e0b";
    case "Assigned":
      return "#3b82f6";
    case "Accepted":
      return "#8b5cf6";
    case "Picked Up":
      return "#f97316";
    case "In-Transit":
      return "#0ea5e9";
    case "Delivered":
      return "#10b981";
    case "Cancelled":
      return "#ef4444";
    default:
      return "#64748b";
  }
}

/**
 * Generates the downloadable Load Documentation / Load Manifest PDF.
 *
 * Readability is prioritized for print preview, saved PDF, and physical print:
 * - larger minimum font sizes
 * - more line height and character spacing
 * - roomier information rows and cards
 * - wider usable value areas
 * - wrapped route and long text without squeezing the typography
 *
 * Normal load records still fit on a single A4 page while preserving a
 * comfortable bottom safety area so content is not compressed toward the footer.
 */
export const generateLoadPDF = async (
  load: Load,
  dealerName: string = "Your Dealership",
): Promise<LoadPDFResult> => {
  const pdf = new jsPDF("p", "mm", "a4");
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  const marginX = 12;
  const contentWidth = pageWidth - marginX * 2;
  const generatedAt = new Date();

  const colors = {
    page: "#f8fafc",
    card: "#ffffff",
    border: "#dbe3ee",
    divider: "#e7edf5",
    headerDark: "#0f172a",
    headerTone: "#132339",
    brand: "#22c55e",
    brandDark: "#16a34a",
    text: "#111827",
    textMuted: "#64748b",
    textSoft: "#94a3b8",
    softFill: "#f8fafc",
    alternateFill: "#f4f7fb",
  };

  const [logoBase64, fonts] = await Promise.all([
    loadLogoBase64(),
    embedFonts(pdf),
  ]);

  const F = fonts;

  const setFillHex = (hex: string) => {
    const rgb = hexToRgb(hex);
    pdf.setFillColor(rgb.r, rgb.g, rgb.b);
  };

  const setTextHex = (hex: string) => {
    const rgb = hexToRgb(hex);
    pdf.setTextColor(rgb.r, rgb.g, rgb.b);
  };

  const setDrawHex = (hex: string) => {
    const rgb = hexToRgb(hex);
    pdf.setDrawColor(rgb.r, rgb.g, rgb.b);
  };

  const drawRoundedCard = (
    x: number,
    y: number,
    width: number,
    height: number,
    radius = 2.2,
  ) => {
    setFillHex(colors.card);
    setDrawHex(colors.border);
    pdf.setLineWidth(0.3);
    pdf.roundedRect(x, y, width, height, radius, radius, "FD");
  };

  const drawSectionHeader = (
    title: string,
    x: number,
    y: number,
    width: number,
  ) => {
    setTextHex(colors.text);
    pdf.setFont(F.heading, "bold");
    pdf.setFontSize(9.8);
    pdf.setCharSpace(0.08);
    pdf.text(title, x, y);
    pdf.setCharSpace(0);

    const titleWidth = pdf.getTextWidth(title);
    setDrawHex("#cbd5e1");
    pdf.setLineWidth(0.25);
    pdf.line(x + titleWidth + 3, y - 0.7, x + width, y - 0.7);
  };

  const fitText = (
    text: string,
    maxWidth: number,
    maxLines = 2,
  ): string[] => {
    const lines = pdf.splitTextToSize(safeText(text), maxWidth) as string[];
    return lines.slice(0, maxLines);
  };

  const drawWrappedValue = (
    value: string,
    x: number,
    y: number,
    maxWidth: number,
    maxLines = 2,
    fontSize = 9,
    align: "left" | "right" = "left",
  ) => {
    setTextHex(colors.text);
    pdf.setFont(F.body, "normal");
    pdf.setFontSize(fontSize);
    pdf.setCharSpace(0.025);

    const lines = fitText(value, maxWidth, maxLines);
    pdf.text(lines, x, y, {
      align,
      lineHeightFactor: 1.3,
    });
    pdf.setCharSpace(0);
  };

  const drawLabel = (
    label: string,
    x: number,
    y: number,
    align: "left" | "right" = "left",
  ) => {
    setTextHex(colors.textMuted);
    pdf.setFont(F.medium, F.medium === "Inter" ? "medium" : "bold");
    pdf.setFontSize(7.6);
    pdf.setCharSpace(0.1);
    pdf.text(label.toUpperCase(), x, y, { align });
    pdf.setCharSpace(0);
  };

  const drawCompactRows = (
    rows: Array<{ label: string; value: string }>,
    x: number,
    y: number,
    width: number,
    rowHeight = 10,
    labelWidth = 36,
  ) => {
    rows.forEach((row, index) => {
      const rowTop = y + index * rowHeight;

      if (index % 2 === 1) {
        setFillHex(colors.alternateFill);
        pdf.rect(x + 0.8, rowTop, width - 1.6, rowHeight, "F");
      }

      const baselineY = rowTop + rowHeight * 0.62;

      drawLabel(row.label, x + 4, baselineY);
      drawWrappedValue(
        row.value,
        x + labelWidth,
        baselineY,
        width - labelWidth - 5,
        1,
        8.9,
      );
    });
  };

  // ─── Page background ───────────────────────────────────────────────────────
  setFillHex(colors.page);
  pdf.rect(0, 0, pageWidth, pageHeight, "F");

  // ─── Header ────────────────────────────────────────────────────────────────
  const headerHeight = 28;
  setFillHex(colors.headerDark);
  pdf.rect(0, 0, pageWidth, headerHeight, "F");

  setFillHex(colors.headerTone);
  pdf.rect(pageWidth * 0.64, 0, pageWidth * 0.36, headerHeight, "F");

  setFillHex(colors.brand);
  pdf.rect(0, 0, 4.5, headerHeight, "F");

  if (logoBase64) {
    pdf.addImage(logoBase64, "PNG", marginX, 6.2, 9, 9);
  } else {
    setFillHex(colors.brand);
    pdf.roundedRect(marginX, 6.2, 9, 9, 1.5, 1.5, "F");
    pdf.setTextColor(255, 255, 255);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(6.5);
    pdf.text("AA", marginX + 4.5, 11.9, { align: "center" });
  }

  pdf.setTextColor(255, 255, 255);
  pdf.setFont(F.heading, "bold");
  pdf.setFontSize(12);
  pdf.setCharSpace(0.08);
  pdf.text(dealerName.toUpperCase(), marginX + 12.5, 11);
  pdf.setCharSpace(0);

  pdf.setFont(F.body, "normal");
  pdf.setFontSize(7.4);
  pdf.text("Powered by Suprah.AI", marginX + 12.5, 15.8);

  const issueDate = generatedAt.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "America/Denver",
  });

  pdf.setFont(F.heading, "bold");
  pdf.setFontSize(10);
  pdf.setCharSpace(0.06);
  pdf.text("Load Documentation", pageWidth - marginX, 9.5, {
    align: "right",
  });
  pdf.setCharSpace(0);

  pdf.setFont(F.body, "normal");
  pdf.setFontSize(7.2);
  pdf.text(`Issue Date: ${issueDate}`, pageWidth - marginX, 14.2, {
    align: "right",
  });
  pdf.text("Report Type: Load Manifest", pageWidth - marginX, 18.4, {
    align: "right",
  });

  setDrawHex("#334155");
  pdf.setLineWidth(0.25);
  pdf.line(marginX, 22.3, pageWidth - marginX, 22.3);

  let y = 33;

  // ─── Hero summary ──────────────────────────────────────────────────────────
  const heroHeight = 19;
  drawRoundedCard(marginX, y, contentWidth, heroHeight);

  const vehicle = load.vehicles?.[0];
  const vehicleName = vehicle
    ? `${vehicle.year || ""} ${vehicle.make || ""} ${vehicle.model || ""}`.trim()
    : "N/A";

  drawLabel("Load Number", marginX + 5, y + 5.8);
  setTextHex(colors.text);
  pdf.setFont(F.medium, F.medium === "Inter" ? "medium" : "bold");
  pdf.setFontSize(12.5);

  const loadNumber = safeText(load.loadNumber, "Not Assigned");
  const loadNumberLines = fitText(loadNumber, 72, 1);
  pdf.text(loadNumberLines, marginX + 5, y + 13);

  drawLabel("Primary Vehicle", marginX + 84, y + 5.8);
  drawWrappedValue(vehicleName, marginX + 84, y + 13, 59, 1, 9);

  const statusText = safeText(load.status, "Unknown").toUpperCase();
  const statusColor = getStatusColor(load.status);
  const statusRgb = hexToRgb(statusColor);

  pdf.setFont(F.heading, "bold");
  pdf.setFontSize(8);
  const statusWidth = Math.min(
    42,
    Math.max(28, pdf.getTextWidth(statusText) + 10),
  );
  const statusX = pageWidth - marginX - statusWidth - 4;

  pdf.setFillColor(statusRgb.r, statusRgb.g, statusRgb.b);
  pdf.roundedRect(statusX, y + 5, statusWidth, 8.8, 4.4, 4.4, "F");
  pdf.setTextColor(255, 255, 255);
  pdf.text(statusText, statusX + statusWidth / 2, y + 10.8, {
    align: "center",
  });

  y += heroHeight + 7;

  // ─── Customer + Vehicle information ───────────────────────────────────────
  const gap = 5;
  const halfWidth = (contentWidth - gap) / 2;
  const infoTitleY = y;

  drawSectionHeader("Customer Information", marginX, infoTitleY, halfWidth);
  drawSectionHeader(
    "Vehicle Information",
    marginX + halfWidth + gap,
    infoTitleY,
    halfWidth,
  );

  y += 4.5;

  const infoCardHeight = 40;
  drawRoundedCard(marginX, y, halfWidth, infoCardHeight);
  drawRoundedCard(
    marginX + halfWidth + gap,
    y,
    halfWidth,
    infoCardHeight,
  );

  const customerRows = [
    {
      label: "Customer",
      value: safeText(load.pickupLocation?.contactName),
    },
    {
      label: "Phone",
      value: safeText(load.pickupLocation?.phone),
    },
    {
      label: "Email",
      value: safeText(load.pickupLocation?.email),
    },
  ];

  const vehicleRows = [
    {
      label: "Vehicle",
      value: vehicleName,
    },
    {
      label: "VIN",
      value: safeText(vehicle?.vin),
    },
    {
      label: "Stock",
      value: safeText(vehicle?.lotNumber),
    },
    {
      label: "Condition",
      value: safeText(vehicle?.condition, "Operable"),
    },
  ];

  drawCompactRows(
    customerRows,
    marginX,
    y + 1.2,
    halfWidth,
    11.2,
    30,
  );
  drawCompactRows(
    vehicleRows,
    marginX + halfWidth + gap,
    y + 0.9,
    halfWidth,
    9.5,
    30,
  );

  y += infoCardHeight + 7;

  // ─── Route information ─────────────────────────────────────────────────────
  drawSectionHeader("Route Information", marginX, y, contentWidth);
  y += 4.5;

  const routeHeight = 32;
  drawRoundedCard(marginX, y, contentWidth, routeHeight);

  const routePadding = 6;
  const routeColumnGap = 8;
  const routeColumnWidth = (contentWidth - routePadding * 2 - routeColumnGap) / 2;
  const routeLeftX = marginX + routePadding;
  const routeRightX = routeLeftX + routeColumnWidth + routeColumnGap;

  const pickupLocation = [
    load.pickupLocation?.street,
    [load.pickupLocation?.city, load.pickupLocation?.state]
      .filter(Boolean)
      .join(", "),
    load.pickupLocation?.zip,
  ]
    .filter(Boolean)
    .join(" ");

  const deliveryLocation = [
    load.deliveryLocation?.street,
    [load.deliveryLocation?.city, load.deliveryLocation?.state]
      .filter(Boolean)
      .join(", "),
    load.deliveryLocation?.zip,
  ]
    .filter(Boolean)
    .join(" ");

  setFillHex("#dcfce7");
  pdf.circle(routeLeftX + 2, y + 9, 2.8, "F");
  setFillHex("#22c55e");
  pdf.circle(routeLeftX + 2, y + 9, 1.55, "F");

  drawLabel("Origin", routeLeftX + 7, y + 6.4);
  drawWrappedValue(
    safeText(pickupLocation, "Location not provided"),
    routeLeftX + 7,
    y + 12.4,
    routeColumnWidth - 9,
    2,
    9.1,
  );

  setDrawHex(colors.divider);
  pdf.setLineWidth(0.25);
  pdf.line(
    marginX + contentWidth / 2,
    y + 4,
    marginX + contentWidth / 2,
    y + routeHeight - 4,
  );

  setFillHex("#fee2e2");
  pdf.circle(routeRightX + 2, y + 9, 2.8, "F");
  setFillHex("#ef4444");
  pdf.circle(routeRightX + 2, y + 9, 1.55, "F");

  drawLabel("Destination", routeRightX + 7, y + 6.4);
  drawWrappedValue(
    safeText(deliveryLocation, "Location not provided"),
    routeRightX + 7,
    y + 12.4,
    routeColumnWidth - 9,
    2,
    9.1,
  );

  y += routeHeight + 7;

  // ─── Timeline ──────────────────────────────────────────────────────────────
  drawSectionHeader("Load Timeline", marginX, y, contentWidth);
  y += 4.5;

  const timelineHeight = 34;
  drawRoundedCard(marginX, y, contentWidth, timelineHeight);

  const timelineItems = [
    {
      number: "1",
      label: "Pickup Deadline",
      value: formatScheduleDate(load.dates?.pickupDeadline),
    },
    {
      number: "2",
      label: "Actual Pickup",
      value: formatDate(load.pickedUpAt),
    },
    {
      number: "3",
      label: "Delivery Deadline",
      value: formatScheduleDate(load.dates?.deliveryDeadline),
    },
    {
      number: "4",
      label: "Actual Delivery",
      value: formatDate(load.deliveredAt),
    },
  ];

  const timelineCellWidth = contentWidth / 2;
  const timelineCellHeight = timelineHeight / 2;

  timelineItems.forEach((item, index) => {
    const column = index % 2;
    const row = Math.floor(index / 2);
    const cellX = marginX + column * timelineCellWidth;
    const cellY = y + row * timelineCellHeight;

    if (row === 1) {
      setFillHex(colors.alternateFill);
      pdf.rect(
        cellX + 0.8,
        cellY,
        timelineCellWidth - 1.6,
        timelineCellHeight - 0.8,
        "F",
      );
    }

    if (column === 1) {
      setDrawHex(colors.divider);
      pdf.setLineWidth(0.25);
      pdf.line(cellX, cellY + 2, cellX, cellY + timelineCellHeight - 2);
    }

    const circleColor = index === 0 ? "#2563eb" : "#6366f1";
    setFillHex(circleColor);
    pdf.circle(cellX + 7, cellY + 8, 2.6, "F");

    pdf.setTextColor(255, 255, 255);
    pdf.setFont(F.heading, "bold");
    pdf.setFontSize(7);
    pdf.text(item.number, cellX + 7, cellY + 8.9, {
      align: "center",
    });

    drawLabel(item.label, cellX + 12, cellY + 6.4);
    drawWrappedValue(
      item.value,
      cellX + 12,
      cellY + 12,
      timelineCellWidth - 17,
      1,
      8.8,
    );
  });

  y += timelineHeight + 7;

  // ─── Financial summary ─────────────────────────────────────────────────────
  drawSectionHeader("Financial Details", marginX, y, contentWidth);
  y += 4.5;

  const financeHeight = 36;
  const financeLeftWidth = contentWidth * 0.58;
  const totalRateWidth = contentWidth - financeLeftWidth - gap;

  drawRoundedCard(marginX, y, financeLeftWidth, financeHeight);

  const financeRows = [
    {
      label: "Carrier Pay",
      value: formatCurrency(load.pricing?.carrierPayAmount),
    },
    {
      label: "COP/COD",
      value:
        load.pricing?.copCodAmount != null
          ? formatCurrency(load.pricing.copCodAmount)
          : "None",
    },
    {
      label: "Payment",
      value: "Direct Deposit",
    },
  ];

  drawCompactRows(
    financeRows,
    marginX,
    y + 1.2,
    financeLeftWidth,
    10.8,
    35,
  );

  const totalRateX = marginX + financeLeftWidth + gap;
  const rateGreen = hexToRgb(colors.brandDark);
  const rateGreenSoft = hexToRgb(colors.brand);

  pdf.setFillColor(rateGreen.r, rateGreen.g, rateGreen.b);
  pdf.roundedRect(
    totalRateX,
    y,
    totalRateWidth,
    financeHeight,
    2.2,
    2.2,
    "F",
  );

  pdf.setFillColor(rateGreenSoft.r, rateGreenSoft.g, rateGreenSoft.b);
  pdf.roundedRect(
    totalRateX,
    y,
    totalRateWidth,
    9,
    2.2,
    2.2,
    "F",
  );
  pdf.rect(totalRateX, y + 5, totalRateWidth, 4, "F");

  pdf.setTextColor(255, 255, 255);
  pdf.setFont(F.heading, "bold");
  pdf.setFontSize(8);
  pdf.text(
    "TOTAL TRANSPORT RATE",
    totalRateX + totalRateWidth / 2,
    y + 6,
    { align: "center" },
  );

  pdf.setFont(F.medium, F.medium === "Inter" ? "medium" : "bold");
  pdf.setFontSize(16.5);
  pdf.text(
    formatCurrency(load.pricing?.carrierPayAmount),
    totalRateX + totalRateWidth / 2,
    y + 21.2,
    { align: "center" },
  );

  pdf.setFont(F.body, "normal");
  pdf.setFontSize(7.4);
  pdf.text("USD", totalRateX + totalRateWidth / 2, y + 28.2, {
    align: "center",
  });

  // ─── Footer ────────────────────────────────────────────────────────────────
  const footerY = pageHeight - 10;
  const generatedLabel = generatedAt.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Denver",
  });
  const docIdLabel = safeText(load.loadNumber || load._id);

  setDrawHex("#dce4ef");
  pdf.setLineWidth(0.25);
  pdf.line(marginX, footerY - 6, pageWidth - marginX, footerY - 6);

  pdf.setFont(F.body, "normal");
  pdf.setFontSize(7);
  setTextHex(colors.textMuted);
  pdf.text(
    `Document ID: ${docIdLabel}  •  Generated: ${generatedLabel}`,
    pageWidth / 2,
    footerY - 2,
    { align: "center" },
  );

  pdf.setFont(F.heading, "bold");
  pdf.text("Page 1 of 1", pageWidth - marginX, footerY - 2, {
    align: "right",
  });

  pdf.setFont(F.body, "normal");
  pdf.setFontSize(6.9);
  setTextHex(colors.textSoft);
  pdf.text(
    dealerName,
    pageWidth / 2,
    footerY + 2.8,
    { align: "center" },
  );

  // ─── Save PDF ──────────────────────────────────────────────────────────────
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