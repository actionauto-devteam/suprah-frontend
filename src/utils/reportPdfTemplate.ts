/**
 * Shared PDF Report Template — Action Auto Utah
 * All exported reports use these helpers to guarantee a unified design system.
 *
 * Typography (QA spec):
 *   Headings        → Poppins SemiBold  (falls back to helvetica bold)
 *   Body / Data     → Inter Regular     (falls back to helvetica normal)
 *   Tracking / VIN  → Inter Medium      (falls back to courier normal)
 */

// ── Font types ─────────────────────────────────────────────────────────────────────

export interface FontSet {
  /** Font name for headings (Poppins or 'helvetica') */
  heading: string;
  /** Weight string for heading font ('bold') */
  headingWeight: string;
  /** Font name for body text (Inter or 'helvetica') */
  body: string;
  /** Font name for tracking/VIN mono text (Inter or 'courier') */
  mono: string;
  /** Weight string for mono font ('medium' when Inter is loaded, else 'normal') */
  monoWeight: string;
}

export const FALLBACK_FONTS: FontSet = {
  heading: "helvetica",
  headingWeight: "bold",
  body: "helvetica",
  mono: "courier",
  monoWeight: "normal",
};

// ── Font loading helpers ─────────────────────────────────────────────────────────

async function _fetchFontBase64(url: string): Promise<string> {
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

const FONT_URLS = {
  poppinsSemiBold:
    "https://raw.githubusercontent.com/google/fonts/main/ofl/poppins/Poppins-SemiBold.ttf",
  interRegular:
    "https://raw.githubusercontent.com/google/fonts/main/ofl/inter/static/Inter-Regular.ttf",
  interMedium:
    "https://raw.githubusercontent.com/google/fonts/main/ofl/inter/static/Inter-Medium.ttf",
};

/**
 * Download and embed Poppins + Inter into the jsPDF instance.
 * Always resolves — falls back to helvetica/courier on any network error.
 */
export async function embedFonts(doc: any): Promise<FontSet> {
  const [poppins, interR, interM] = await Promise.all([
    _fetchFontBase64(FONT_URLS.poppinsSemiBold),
    _fetchFontBase64(FONT_URLS.interRegular),
    _fetchFontBase64(FONT_URLS.interMedium),
  ]);

  const fonts: FontSet = { ...FALLBACK_FONTS };

  if (poppins) {
    doc.addFileToVFS("Poppins-SemiBold.ttf", poppins);
    doc.addFont("Poppins-SemiBold.ttf", "Poppins", "bold");
    fonts.heading = "Poppins";
    fonts.headingWeight = "bold";
  }
  if (interR) {
    doc.addFileToVFS("Inter-Regular.ttf", interR);
    doc.addFont("Inter-Regular.ttf", "Inter", "normal");
    fonts.body = "Inter";
  }
  if (interM) {
    doc.addFileToVFS("Inter-Medium.ttf", interM);
    doc.addFont("Inter-Medium.ttf", "Inter", "medium");
    fonts.mono = "Inter";
    fonts.monoWeight = "medium";
  }

  return fonts;
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ReportHeaderOptions {
  reportTitle: string;
  orgName?: string;
  periodLabel: string;
  /** Optional subtitle shown under the org name (left column) */
  subtitle?: string;
  /** Pre-loaded logo base64 string (data:image/png;base64,…) or null */
  logoBase64: string | null;
  pageWidth: number;
  left: number;
  right: number;
  fonts?: FontSet;
}

export interface SectionTitleOptions {
  title: string;
  y: number;
  left: number;
  right: number;
  pageWidth?: number;
  fonts?: FontSet;
}

export interface EmptyStateOptions {
  y: number;
  message: string;
  sub: string;
  left: number;
  right: number;
  contentWidth: number;
  pageWidth: number;
  fonts?: FontSet;
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
  cardH?: number;
  cardGap?: number;
  fonts?: FontSet;
}

export interface FooterOptions {
  docId: string;
  generatedAtLabel: string;
  reportTitle: string;
  orgName?: string;
  supportEmail?: string;
  pageWidth: number;
  pageHeight: number;
  left: number;
  right: number;
  fonts?: FontSet;
}

// ── Logo loader ───────────────────────────────────────────────────────────────

/**
 * Fetch the app icon from /icon-192x192.png and return a data-URL string
 * suitable for jsPDF addImage().  Returns null on any failure so callers can
 * fall back gracefully to the text "AA" badge.
 */
export async function loadLogoBase64(): Promise<string | null> {
  try {
    const res = await fetch("/icon-192x192.png");
    if (!res.ok) return null;
    const blob = await res.blob();
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

// ── Document ID generator ─────────────────────────────────────────────────────

/** Generates a unique document ID, e.g. "RPT-20260430-A3F2" */
export function generateDocId(prefix = "RPT"): string {
  const now = new Date();
  const date = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${prefix}-${date}-${rand}`;
}

/** Format a Date to "Apr 30, 2026, 07:08 AM" */
export function formatGeneratedAt(date: Date): string {
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Denver",
  });
}

// ── Header ────────────────────────────────────────────────────────────────────

/**
 * Draw the standardized branded header on the current page.
 * Height: 24 mm.  Content starts after the optional separator line at ~26.5 mm.
 */
export function drawReportPageHeader(
  doc: any,
  opts: ReportHeaderOptions,
): void {
  const {
    reportTitle,
    orgName = "Action Auto Utah",
    periodLabel,
    subtitle,
    logoBase64,
    pageWidth,
    left,
    right,
    fonts = FALLBACK_FONTS,
  } = opts;

  // Dark band
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 24, "F");
  // Tone panel (right 38%)
  doc.setFillColor(19, 35, 57);
  doc.rect(pageWidth * 0.62, 0, pageWidth * 0.38, 24, "F");
  // Green accent strip
  doc.setFillColor(34, 197, 94);
  doc.rect(0, 0, 4, 24, "F");

  // Logo or AA badge
  if (logoBase64) {
    try {
      // Render logo as a 10×10 rounded square
      doc.addImage(logoBase64, "PNG", left, 7, 10, 10);
    } catch {
      _drawAaBadge(doc, left);
    }
  } else {
    _drawAaBadge(doc, left);
  }

  // Org name — Poppins SemiBold (heading font)
  doc.setTextColor(255, 255, 255);
  doc.setFont(fonts.heading, fonts.headingWeight);
  doc.setFontSize(11);
  doc.text(orgName, left + 13, 10.8);

  // Subtitle — Inter Regular (body font)
  doc.setFont(fonts.body, "normal");
  doc.setFontSize(7);
  doc.setTextColor(188, 199, 215);
  doc.text(subtitle || reportTitle, left + 13, 15.2);

  // Report title (right) — Poppins SemiBold
  doc.setFont(fonts.heading, fonts.headingWeight);
  doc.setFontSize(8.8);
  doc.setTextColor(255, 255, 255);
  doc.text(reportTitle, right, 10.8, { align: "right" });

  // Period label — Inter Regular
  doc.setFont(fonts.body, "normal");
  doc.setFontSize(7);
  doc.setTextColor(188, 199, 215);
  doc.text(`Period: ${periodLabel}`, right, 15.2, { align: "right" });

  // Separator line
  doc.setDrawColor(198, 208, 222);
  doc.setLineWidth(0.2);
  doc.line(left, 26.5, right, 26.5);
}

function _drawAaBadge(doc: any, left: number): void {
  doc.setFillColor(16, 185, 129);
  doc.roundedRect(left, 6.8, 10, 10, 1.5, 1.5, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.text("AA", left + 5, 13, { align: "center" });
}

// ── Continuation label ────────────────────────────────────────────────────────

/** Draws a small "(continued)" label in the top-right corner of the header. */
export function drawContinuedLabel(
  doc: any,
  right: number,
  fonts: FontSet = FALLBACK_FONTS,
): void {
  doc.setTextColor(188, 199, 215);
  doc.setFont(fonts.body, "normal");
  doc.setFontSize(7);
  doc.text("(continued)", right, 20.5, { align: "right" });
}

// ── Section title ─────────────────────────────────────────────────────────────

/**
 * Bold uppercase section label with a trailing hairline divider.
 * Uses Poppins-equivalent weight: helvetica bold, 9 pt.
 */
export function drawSectionTitle(doc: any, opts: SectionTitleOptions): void {
  const { title, y, left, right, fonts = FALLBACK_FONTS } = opts;

  // QA spec: Poppins SemiBold for section headings
  doc.setFont(fonts.heading, fonts.headingWeight);
  doc.setFontSize(9);
  doc.setTextColor(31, 41, 55);
  doc.text(title.toUpperCase(), left, y);

  const lineStart = left + doc.getTextWidth(title.toUpperCase()) + 3;
  doc.setDrawColor(224, 230, 238);
  doc.setLineWidth(0.18);
  doc.line(lineStart, y - 0.8, right, y - 0.8);
}

// ── Empty state ───────────────────────────────────────────────────────────────

export function drawEmptyState(doc: any, opts: EmptyStateOptions): void {
  const {
    y,
    message,
    sub,
    left,
    contentWidth,
    pageWidth,
    fonts = FALLBACK_FONTS,
  } = opts;

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(223, 231, 241);
  doc.setLineWidth(0.15);
  doc.roundedRect(left, y, contentWidth, 36, 2, 2, "FD");

  doc.setFont(fonts.heading, fonts.headingWeight);
  doc.setFontSize(10);
  doc.setTextColor(140, 152, 168);
  doc.text("—", pageWidth / 2, y + 14, { align: "center" });

  doc.setFontSize(8.5);
  doc.setTextColor(87, 96, 110);
  doc.text(message, pageWidth / 2, y + 22, { align: "center" });

  doc.setFont(fonts.body, "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(126, 137, 154);
  doc.text(sub, pageWidth / 2, y + 29, { align: "center" });
}

// ── Summary cards ─────────────────────────────────────────────────────────────

/**
 * Renders a row of summary stat cards.
 * Returns the bottom Y coordinate of the card row.
 */
export function drawSummaryCards(doc: any, opts: SummaryCardsOptions): number {
  const {
    cards,
    y,
    left,
    contentWidth,
    cardH = 16,
    cardGap = 4,
    fonts = FALLBACK_FONTS,
  } = opts;
  const cardW = (contentWidth - cardGap * (cards.length - 1)) / cards.length;

  cards.forEach((card, i) => {
    const x = left + i * (cardW + cardGap);

    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(223, 231, 241);
    doc.setLineWidth(0.15);
    doc.roundedRect(x, y, cardW, cardH, 1.8, 1.8, "FD");

    // Label — Inter Regular (body)
    doc.setFont(fonts.body, "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(107, 114, 128);
    doc.text(card.label, x + 3, y + 5.2);

    // Value — Poppins SemiBold (heading)
    doc.setFont(fonts.heading, fonts.headingWeight);
    doc.setFontSize(10);
    doc.setTextColor(16, 132, 96);
    doc.text(card.value, x + 3, y + 12);
  });

  return y + cardH;
}

// ── Table shared styles ───────────────────────────────────────────────────────

/** Standard table styles to spread into every autoTable call */
export const TABLE_BODY_STYLES = {
  fontSize: 7.2,
  cellPadding: { top: 2.6, right: 2.8, bottom: 2.6, left: 2.8 },
  minCellHeight: 7,
  textColor: [36, 44, 56] as [number, number, number],
  lineColor: [226, 232, 240] as [number, number, number],
  lineWidth: 0.12,
};

/** Primary table head style (green) */
export const TABLE_HEAD_STYLES_PRIMARY = {
  fillColor: [16, 132, 96] as [number, number, number],
  textColor: [255, 255, 255] as [number, number, number],
  fontStyle: "bold" as const,
  halign: "left" as const,
  fontSize: 7.5,
};

/** Secondary table head style (darker green — for analytics tables) */
export const TABLE_HEAD_STYLES_SECONDARY = {
  fillColor: [11, 116, 84] as [number, number, number],
  textColor: [255, 255, 255] as [number, number, number],
  fontStyle: "bold" as const,
  halign: "left" as const,
  fontSize: 7.5,
};

export const TABLE_ALTERNATE_ROW = {
  fillColor: [247, 250, 248] as [number, number, number],
};

export const TABLE_BODY_ROW = {
  fillColor: [255, 255, 255] as [number, number, number],
};

// ── Footer ────────────────────────────────────────────────────────────────────

/**
 * Draw a standardized footer on the given page number.
 *
 * Layout:
 *   LEFT:   Action Auto Utah • support@actionautoutah.com
 *   CENTER: Document ID: XXX • Generated: Apr 30, 2026, 07:08 AM
 *   RIGHT:  Page X of Y
 */
export function drawPageFooter(
  doc: any,
  pageNum: number,
  totalPages: number,
  opts: FooterOptions,
): void {
  const {
    docId,
    generatedAtLabel,
    orgName = "Action Auto Utah",
    supportEmail = "support@actionautoutah.com",
    pageWidth,
    pageHeight,
    left,
    right,
    fonts = FALLBACK_FONTS,
  } = opts;

  const footerY = pageHeight - 8;

  // Separator
  doc.setDrawColor(224, 230, 238);
  doc.setLineWidth(0.2);
  doc.line(left, footerY - 4, right, footerY - 4);

  // Line 1 — center: Doc ID + generated time  |  right: page number
  doc.setFont(fonts.body, "normal");
  doc.setFontSize(6.8);
  doc.setTextColor(115, 125, 141);
  doc.text(
    `Document ID: ${docId}  •  Generated: ${generatedAtLabel}`,
    pageWidth / 2,
    footerY,
    { align: "center" },
  );
  doc.setFont(fonts.heading, fonts.headingWeight);
  doc.text(`Page ${pageNum} of ${totalPages}`, right, footerY, {
    align: "right",
  });

  // Line 2 — center: company info
  doc.setFont(fonts.body, "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  doc.text(`${orgName}  •  ${supportEmail}`, pageWidth / 2, footerY + 4, {
    align: "center",
  });
}

/**
 * Apply standardized footers to every page in the document.
 * Call this AFTER all pages and content have been added.
 */
export function applyFootersToAllPages(doc: any, opts: FooterOptions): void {
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    drawPageFooter(doc, i, totalPages, opts);
  }
}
