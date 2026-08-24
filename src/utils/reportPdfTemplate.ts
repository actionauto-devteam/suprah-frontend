import type { ReportExportContext } from "@/components/reports/export/report-export-context";
import {
  formatExportTimestamp,
} from "@/components/reports/export/report-export-context";

export interface FontSet {
  heading: string;
  headingWeight: string;
  body: string;
  mono: string;
  monoWeight: string;
}

export const FALLBACK_FONTS: FontSet = {
  heading: "helvetica",
  headingWeight: "bold",
  body: "helvetica",
  mono: "courier",
  monoWeight: "normal",
};

export async function embedFonts(_doc: unknown): Promise<FontSet> {
  return FALLBACK_FONTS;
}

export interface LoadedReportLogo {
  dataUrl: string;
  aspectRatio: number;
}

function imageToCroppedDataUrl(image: HTMLImageElement): LoadedReportLogo {
  const sourceCanvas = document.createElement("canvas");
  sourceCanvas.width = image.naturalWidth;
  sourceCanvas.height = image.naturalHeight;
  const sourceContext = sourceCanvas.getContext("2d", {
    willReadFrequently: true,
  });

  if (!sourceContext) {
    return {
      dataUrl: sourceCanvas.toDataURL("image/png"),
      aspectRatio: image.naturalWidth / Math.max(1, image.naturalHeight),
    };
  }

  sourceContext.drawImage(image, 0, 0);
  const pixels = sourceContext.getImageData(
    0,
    0,
    sourceCanvas.width,
    sourceCanvas.height,
  );

  let minX = sourceCanvas.width;
  let minY = sourceCanvas.height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < sourceCanvas.height; y += 1) {
    for (let x = 0; x < sourceCanvas.width; x += 1) {
      const index = (y * sourceCanvas.width + x) * 4;
      const red = pixels.data[index];
      const green = pixels.data[index + 1];
      const blue = pixels.data[index + 2];
      const alpha = pixels.data[index + 3];
      const isVisible = alpha > 20 && Math.max(red, green, blue) > 28;

      if (isVisible) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }

  if (maxX < minX || maxY < minY) {
    return {
      dataUrl: sourceCanvas.toDataURL("image/png"),
      aspectRatio: image.naturalWidth / Math.max(1, image.naturalHeight),
    };
  }

  const padding = 5;
  minX = Math.max(0, minX - padding);
  minY = Math.max(0, minY - padding);
  maxX = Math.min(sourceCanvas.width - 1, maxX + padding);
  maxY = Math.min(sourceCanvas.height - 1, maxY + padding);

  const width = Math.max(1, maxX - minX + 1);
  const height = Math.max(1, maxY - minY + 1);
  const outputCanvas = document.createElement("canvas");
  outputCanvas.width = width;
  outputCanvas.height = height;
  const outputContext = outputCanvas.getContext("2d");

  if (!outputContext) {
    return {
      dataUrl: sourceCanvas.toDataURL("image/png"),
      aspectRatio: image.naturalWidth / Math.max(1, image.naturalHeight),
    };
  }

  outputContext.drawImage(
    sourceCanvas,
    minX,
    minY,
    width,
    height,
    0,
    0,
    width,
    height,
  );

  return {
    dataUrl: outputCanvas.toDataURL("image/png"),
    aspectRatio: width / Math.max(1, height),
  };
}

export async function loadReportLogo(): Promise<LoadedReportLogo | null> {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return null;
  }

  try {
    const response = await fetch("/icon-192x192.png");
    if (!response.ok) return null;
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);

    try {
      const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const nextImage = new Image();
        nextImage.onload = () => resolve(nextImage);
        nextImage.onerror = () => reject(new Error("Could not load report logo"));
        nextImage.src = objectUrl;
      });

      return imageToCroppedDataUrl(image);
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  } catch {
    return null;
  }
}

/** Backward-compatible loader used by older callers. */
export async function loadLogoBase64(): Promise<string | null> {
  return (await loadReportLogo())?.dataUrl ?? null;
}

export function generateDocId(prefix = "RPT"): string {
  const now = new Date();
  const date = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  const random = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${prefix}-${date}-${random}`;
}

export function formatGeneratedAt(date: Date): string {
  return formatExportTimestamp(date);
}

export interface ReportHeaderOptions {
  reportTitle: string;
  orgName?: string;
  productName?: string;
  periodLabel: string;
  subtitle?: string;
  logoBase64?: string | null;
  logo?: LoadedReportLogo | null;
  pageWidth: number;
  left: number;
  right: number;
  fonts?: FontSet;
}

export function drawReportPageHeader(
  doc: any,
  options: ReportHeaderOptions,
): void {
  const {
    reportTitle,
    orgName = "Your Dealership",
    productName = "Suprah.AI Reports",
    periodLabel,
    subtitle,
    logoBase64,
    logo,
    pageWidth,
    left,
    right,
    fonts = FALLBACK_FONTS,
  } = options;

  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 27, "F");
  doc.setFillColor(18, 45, 66);
  doc.rect(pageWidth * 0.64, 0, pageWidth * 0.36, 27, "F");
  doc.setFillColor(16, 185, 129);
  doc.rect(0, 0, 4, 27, "F");

  const image = logo?.dataUrl ?? logoBase64 ?? null;
  if (image) {
    try {
      const ratio = logo?.aspectRatio ?? 1;
      const maxWidth = 30;
      const maxHeight = 12;
      const width = ratio >= 1 ? maxWidth : maxHeight * ratio;
      const height = ratio >= 1 ? maxWidth / ratio : maxHeight;
      const safeWidth = Math.min(maxWidth, width);
      const safeHeight = Math.min(maxHeight, height);
      doc.addImage(
        image,
        "PNG",
        left,
        7.2 + (maxHeight - safeHeight) / 2,
        safeWidth,
        safeHeight,
      );
    } catch {
      drawFallbackBadge(doc, left);
    }
  } else {
    drawFallbackBadge(doc, left);
  }

  const brandTextX = left + 34;
  doc.setTextColor(255, 255, 255);
  doc.setFont(fonts.heading, fonts.headingWeight);
  doc.setFontSize(10.5);
  doc.text(orgName, brandTextX, 10.8);

  doc.setFont(fonts.body, "normal");
  doc.setFontSize(7.2);
  doc.setTextColor(190, 204, 220);
  doc.text(productName, brandTextX, 15.2);

  const safeTitle = doc.splitTextToSize(reportTitle, pageWidth * 0.31);
  doc.setFont(fonts.heading, fonts.headingWeight);
  doc.setFontSize(9.2);
  doc.setTextColor(255, 255, 255);
  doc.text(safeTitle.slice(0, 2), right, 9.7, { align: "right" });

  doc.setFont(fonts.body, "normal");
  doc.setFontSize(6.8);
  doc.setTextColor(190, 204, 220);
  const periodText = doc.splitTextToSize(
    `Period: ${periodLabel}`,
    pageWidth * 0.31,
  );
  doc.text(periodText.slice(0, 2), right, 20.2, { align: "right" });

  if (subtitle) {
    doc.setFont(fonts.body, "normal");
    doc.setFontSize(6.4);
    doc.setTextColor(100, 116, 139);
    const subtitleLines = doc.splitTextToSize(subtitle, right - left);
    doc.text(subtitleLines.slice(0, 2), left, 31.5);
  }

  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.2);
  doc.line(left, subtitle ? 39 : 30, right, subtitle ? 39 : 30);
}

function drawFallbackBadge(doc: any, left: number): void {
  doc.setFillColor(16, 185, 129);
  doc.roundedRect(left, 7.2, 12, 12, 2, 2, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.text("SA", left + 6, 14.7, { align: "center" });
}

export function drawContinuedLabel(
  doc: any,
  right: number,
  fonts: FontSet = FALLBACK_FONTS,
): void {
  doc.setFont(fonts.body, "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(190, 204, 220);
  doc.text("Continued", right, 24, { align: "right" });
}

export interface MetadataOptions {
  context: ReportExportContext;
  y: number;
  left: number;
  right: number;
  pageWidth: number;
  fonts?: FontSet;
}

/** Draws complete metadata and returns the first safe Y coordinate below it. */
export function drawReportMetadata(
  doc: any,
  options: MetadataOptions,
): number {
  const {
    context,
    y,
    left,
    right,
    fonts = FALLBACK_FONTS,
  } = options;
  const contentWidth = right - left;
  const descriptionLines = doc.splitTextToSize(
    context.description,
    contentWidth - 8,
  );
  const boxHeight = Math.max(20, 14 + Math.min(2, descriptionLines.length) * 3.8);

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(left, y, contentWidth, boxHeight, 2, 2, "FD");
  doc.setFillColor(16, 185, 129);
  doc.roundedRect(left, y, 2.4, boxHeight, 1.2, 1.2, "F");

  doc.setFont(fonts.heading, fonts.headingWeight);
  doc.setFontSize(7.5);
  doc.setTextColor(51, 65, 85);
  doc.text("REPORT OVERVIEW", left + 5, y + 5);

  doc.setFont(fonts.body, "normal");
  doc.setFontSize(7.1);
  doc.setTextColor(71, 85, 105);
  doc.text(
    `Records: ${context.recordCount.toLocaleString("en-US")}  |  Generated: ${formatExportTimestamp(context.generatedAt)}`,
    right - 4,
    y + 5,
    { align: "right" },
  );
  doc.text(descriptionLines.slice(0, 2), left + 5, y + 11);

  return y + boxHeight + 6;
}

export interface SectionTitleOptions {
  title: string;
  y: number;
  left: number;
  right: number;
  fonts?: FontSet;
}

export function drawSectionTitle(doc: any, options: SectionTitleOptions): void {
  const { title, y, left, right, fonts = FALLBACK_FONTS } = options;
  const label = title.toUpperCase();
  doc.setFont(fonts.heading, fonts.headingWeight);
  doc.setFontSize(8.9);
  doc.setTextColor(30, 41, 59);
  doc.text(label, left, y);
  const lineStart = Math.min(right - 8, left + doc.getTextWidth(label) + 3);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.18);
  doc.line(lineStart, y - 0.8, right, y - 0.8);
}

export interface SummaryCard {
  label: string;
  value: string;
}

export interface SummaryCardsOptions {
  cards: SummaryCard[];
  y: number;
  left: number;
  contentWidth: number;
  maxPerRow?: number;
  cardH?: number;
  cardGap?: number;
  fonts?: FontSet;
  valueColor?: [number, number, number];
}

/** Draws summary cards over one or more rows and returns the bottom Y value. */
export function drawSummaryCards(
  doc: any,
  options: SummaryCardsOptions,
): number {
  const {
    cards,
    y,
    left,
    contentWidth,
    maxPerRow = 5,
    cardH = 18,
    cardGap = 4,
    fonts = FALLBACK_FONTS,
    valueColor = [16, 132, 96],
  } = options;

  if (cards.length === 0) return y;

  const columns = Math.min(maxPerRow, cards.length);
  const cardWidth = (contentWidth - cardGap * (columns - 1)) / columns;
  const rows = Math.ceil(cards.length / columns);

  cards.forEach((card, index) => {
    const row = Math.floor(index / columns);
    const column = index % columns;
    const x = left + column * (cardWidth + cardGap);
    const cardY = y + row * (cardH + cardGap);

    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(x, cardY, cardWidth, cardH, 1.8, 1.8, "FD");

    doc.setFont(fonts.body, "normal");
    doc.setFontSize(6.6);
    doc.setTextColor(100, 116, 139);
    const labelLines = doc.splitTextToSize(card.label, cardWidth - 6);
    doc.text(labelLines.slice(0, 2), x + 3, cardY + 4.8);

    doc.setFont(fonts.heading, fonts.headingWeight);
    doc.setFontSize(9.7);
    doc.setTextColor(...valueColor);
    const valueLines = doc.splitTextToSize(card.value, cardWidth - 6);
    doc.text(valueLines.slice(0, 2), x + 3, cardY + 12.2);
  });

  return y + rows * cardH + (rows - 1) * cardGap;
}


export interface PdfSectionSpaceOptions {
  currentY: number;
  pageHeight: number;
  minHeight: number;
  topY?: number;
  footerReserve?: number;
  forceNewPage?: boolean;
  onNewPage: () => void;
}

/**
 * Prevents section headings and the first rows of a table from being orphaned
 * at the bottom of a page. Returns the safe Y coordinate for the section.
 */
export function ensurePdfSectionSpace(
  doc: any,
  options: PdfSectionSpaceOptions,
): number {
  const {
    currentY,
    pageHeight,
    minHeight,
    topY = 35,
    footerReserve = 22,
    forceNewPage = false,
    onNewPage,
  } = options;

  const availableBottom = pageHeight - footerReserve;
  if (forceNewPage || currentY + minHeight > availableBottom) {
    doc.addPage();
    onNewPage();
    return topY;
  }

  return currentY;
}

interface AutoTableState {
  finalY?: number;
}

interface JsPdfWithAutoTable {
  lastAutoTable?: AutoTableState;
}

/**
 * Reads the bottom position created by jspdf-autotable without relying on an
 * undeclared jsPDF property in TypeScript.
 */
export function getLastAutoTableY(
  doc: unknown,
  fallback: number,
): number {
  const finalY = (doc as JsPdfWithAutoTable).lastAutoTable?.finalY;
  return typeof finalY === "number" && Number.isFinite(finalY)
    ? finalY
    : fallback;
}

export interface EmptyStateOptions {
  y: number;
  message: string;
  sub: string;
  left: number;
  contentWidth: number;
  pageWidth: number;
  fonts?: FontSet;
}

export function drawEmptyState(doc: any, options: EmptyStateOptions): void {
  const {
    y,
    message,
    sub,
    left,
    contentWidth,
    pageWidth,
    fonts = FALLBACK_FONTS,
  } = options;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(223, 231, 241);
  doc.roundedRect(left, y, contentWidth, 38, 2, 2, "FD");
  doc.setFont(fonts.heading, fonts.headingWeight);
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text(message, pageWidth / 2, y + 17, { align: "center" });
  doc.setFont(fonts.body, "normal");
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  const lines = doc.splitTextToSize(sub, contentWidth - 20);
  doc.text(lines.slice(0, 3), pageWidth / 2, y + 24, { align: "center" });
}

export const TABLE_BODY_STYLES = {
  fontSize: 7,
  cellPadding: { top: 2.5, right: 2.6, bottom: 2.5, left: 2.6 },
  minCellHeight: 7.2,
  overflow: "linebreak" as const,
  valign: "middle" as const,
  textColor: [36, 44, 56] as [number, number, number],
  lineColor: [226, 232, 240] as [number, number, number],
  lineWidth: 0.12,
};

export const TABLE_HEAD_STYLES_PRIMARY = {
  fillColor: [16, 132, 96] as [number, number, number],
  textColor: [255, 255, 255] as [number, number, number],
  fontStyle: "bold" as const,
  halign: "left" as const,
  valign: "middle" as const,
  overflow: "linebreak" as const,
  fontSize: 7.2,
  cellPadding: { top: 2.8, right: 2.6, bottom: 2.8, left: 2.6 },
};

export const TABLE_HEAD_STYLES_SECONDARY = {
  fillColor: [30, 64, 175] as [number, number, number],
  textColor: [255, 255, 255] as [number, number, number],
  fontStyle: "bold" as const,
  halign: "left" as const,
  valign: "middle" as const,
  overflow: "linebreak" as const,
  fontSize: 7.2,
  cellPadding: { top: 2.8, right: 2.6, bottom: 2.8, left: 2.6 },
};

export const TABLE_ALTERNATE_ROW = {
  fillColor: [247, 250, 248] as [number, number, number],
};

export const TABLE_BODY_ROW = {
  fillColor: [255, 255, 255] as [number, number, number],
};

export interface FooterOptions {
  docId: string;
  generatedAtLabel: string;
  reportTitle: string;
  orgName?: string;
  productName?: string;
  supportEmail?: string;
  pageWidth: number;
  pageHeight: number;
  left: number;
  right: number;
  fonts?: FontSet;
}

export function drawPageFooter(
  doc: any,
  pageNumber: number,
  totalPages: number,
  options: FooterOptions,
): void {
  const {
    docId,
    generatedAtLabel,
    reportTitle,
    orgName = "Your Dealership",
    productName = "Suprah.AI Reports",
    pageWidth,
    pageHeight,
    left,
    right,
    fonts = FALLBACK_FONTS,
  } = options;
  const footerY = pageHeight - 8;

  doc.setDrawColor(224, 230, 238);
  doc.line(left, footerY - 4, right, footerY - 4);
  doc.setFont(fonts.body, "normal");
  doc.setFontSize(6.2);
  doc.setTextColor(100, 116, 139);
  doc.text(`${orgName} • ${productName} • ${reportTitle}`, left, footerY);
  doc.text(
    `${docId} • ${generatedAtLabel}`,
    pageWidth / 2,
    footerY,
    { align: "center" },
  );
  doc.setFont(fonts.heading, fonts.headingWeight);
  doc.text(`Page ${pageNumber} of ${totalPages}`, right, footerY, {
    align: "right",
  });
}

export function applyFootersToAllPages(
  doc: any,
  options: FooterOptions,
): void {
  const totalPages = doc.getNumberOfPages();
  for (let page = 1; page <= totalPages; page += 1) {
    doc.setPage(page);
    drawPageFooter(doc, page, totalPages, options);
  }
}
