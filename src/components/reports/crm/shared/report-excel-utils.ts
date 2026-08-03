import type { CellObject, WorkBook, WorkSheet } from "xlsx-js-style";
import type { ReportExportContext } from "@/components/reports/export/report-export-context";
import {
  formatExportTimestamp,
} from "@/components/reports/export/report-export-context";
import type {
  ReportAnalyticsModel,
  ReportAnalyticsSeries,
} from "@/components/reports/analytics/report-analytics-data";

export type ExcelModule = typeof import("xlsx-js-style");

export const COLORS = {
  navy: "0F172A",
  darkNavy: "111827",
  green: "108460",
  darkGreen: "0B7454",
  lightGreen: "ECFDF5",
  lighterGreen: "F0FDF4",
  white: "FFFFFF",
  text: "1E293B",
  mutedText: "64748B",
  border: "CBD5E1",
  lightBorder: "E2E8F0",
  lightGray: "F8FAFC",
  mediumGray: "F1F5F9",
  warning: "F59E0B",
  red: "DC2626",
  blue: "2563EB",
  greenSoft: "D1FAE5",
  amberSoft: "FEF3C7",
  amber: "D97706",
  redSoft: "FEE2E2",
  columnSoft: "F8FAFC",
  columnAltSoft: "F1F8F5",
} as const;

const BRANDED_ANALYTICS_SHEETS = new WeakSet<object>();
const DANGEROUS_EXCEL_PREFIX = /^[\s]*[=+\-@]/;

/** Prevents imported text from being interpreted as an Excel formula. */
export function safeText(value: unknown, fallback = "—"): string {
  const text = String(value ?? "").trim();
  const resolved = text || fallback;
  return DANGEROUS_EXCEL_PREFIX.test(resolved) ? `'${resolved}` : resolved;
}

export function formatDate(value: unknown): string {
  const date = toExcelDate(value);
  return date instanceof Date
    ? date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: "America/Denver",
      })
    : "—";
}

export function toExcelDate(value: unknown): Date | undefined {
  if (!value) return undefined;

  if (value instanceof Date) {
    const copy = new Date(value);
    return Number.isNaN(copy.getTime()) ? undefined : copy;
  }

  const text = String(value).trim();
  const dateOnly = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateOnly) {
    const localDate = new Date(
      Number(dateOnly[1]),
      Number(dateOnly[2]) - 1,
      Number(dateOnly[3]),
    );
    return Number.isNaN(localDate.getTime()) ? undefined : localDate;
  }

  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export function formatGeneratedAt(date: Date): string {
  return formatExportTimestamp(date);
}

export function ensureCell(
  XLSX: ExcelModule,
  worksheet: WorkSheet,
  row: number,
  column: number,
): CellObject {
  const address = XLSX.utils.encode_cell({ r: row, c: column });
  if (!worksheet[address]) worksheet[address] = { t: "s", v: "" };
  return worksheet[address] as CellObject;
}

export function applyRangeStyle(
  XLSX: ExcelModule,
  worksheet: WorkSheet,
  range: string,
  style: Record<string, unknown>,
): void {
  const decoded = XLSX.utils.decode_range(range);
  for (let row = decoded.s.r; row <= decoded.e.r; row += 1) {
    for (let column = decoded.s.c; column <= decoded.e.c; column += 1) {
      ensureCell(XLSX, worksheet, row, column).s = style;
    }
  }
}

export function applyTableBorders(
  XLSX: ExcelModule,
  worksheet: WorkSheet,
  startRow: number,
  endRow: number,
  startColumn: number,
  endColumn: number,
): void {
  for (let row = startRow; row <= endRow; row += 1) {
    for (let column = startColumn; column <= endColumn; column += 1) {
      const cell = ensureCell(XLSX, worksheet, row, column);
      cell.s = {
        ...(cell.s ?? {}),
        border: thinBorder(),
      };
    }
  }
}

export function setExcelColumns(worksheet: WorkSheet, widths: number[]): void {
  worksheet["!cols"] = widths.map((wch) => ({ wch }));
}

function thinBorder() {
  return {
    top: { style: "thin", color: { rgb: COLORS.lightBorder } },
    bottom: { style: "thin", color: { rgb: COLORS.lightBorder } },
    left: { style: "thin", color: { rgb: COLORS.lightBorder } },
    right: { style: "thin", color: { rgb: COLORS.lightBorder } },
  };
}

function statusColors(status: string): { fill: string; font: string } {
  const normalized = status.toLowerCase();
  if (
    normalized.includes("deliver") ||
    normalized.includes("paid") ||
    normalized.includes("succeed") ||
    normalized.includes("approved") ||
    normalized.includes("booked")
  ) {
    return { fill: COLORS.greenSoft, font: COLORS.darkGreen };
  }
  if (
    normalized.includes("pending") ||
    normalized.includes("processing") ||
    normalized.includes("submitted") ||
    normalized.includes("assigned") ||
    normalized.includes("posted")
  ) {
    return { fill: COLORS.amberSoft, font: COLORS.amber };
  }
  if (
    normalized.includes("failed") ||
    normalized.includes("cancel") ||
    normalized.includes("reject") ||
    normalized.includes("closed")
  ) {
    return { fill: COLORS.redSoft, font: COLORS.red };
  }
  return { fill: COLORS.lightGreen, font: COLORS.blue };
}

export type ExcelValueType =
  | "text"
  | "number"
  | "currency"
  | "percentage"
  | "date"
  | "datetime"
  | "status";

export interface ExcelColumn<T> {
  label: string;
  width: number;
  value: (record: T) => unknown;
  type?: ExcelValueType;
  align?: "left" | "center" | "right";
}

function resolveColumnAlignment<T>(
  column: ExcelColumn<T>,
): "left" | "center" | "right" {
  if (column.align) return column.align;

  const label = column.label.toLowerCase();
  const shouldStayLeft = /customer|driver|name|email|phone|contact|description|subject|note|message|address|origin|destination|route|vehicle|vin|reason|organization|company/.test(label);
  const shouldCenter = /status|source|method|currency|trailer|condition|type|pod|read|reply|appointment|created|updated|date|time|eta|units|invoice|load #|payout #|stock|state|color|\bid\b/.test(label);

  if (!shouldStayLeft && shouldCenter) return "center";

  switch (column.type) {
    case "number":
    case "currency":
    case "percentage":
      return "right";
    case "date":
    case "datetime":
    case "status":
      return "center";
    default:
      return "left";
  }
}


function estimateWrappedLines(value: unknown, columnWidth: number): number {
  const text = String(value ?? "");
  if (!text) return 1;
  const usableCharacters = Math.max(10, Math.floor(columnWidth * 1.3));
  return text
    .split(/\r?\n/)
    .reduce(
      (total, line) =>
        total + Math.max(1, Math.ceil(line.length / usableCharacters)),
      0,
    );
}

function rowHeightForValues(
  values: unknown[],
  widths: number[],
  minimum = 30,
): number {
  const lines = values.reduce<number>(
    (maximum, value, index) =>
      Math.max(maximum, estimateWrappedLines(value, widths[index] ?? 18)),
    1,
  );
  return Math.min(409, Math.max(minimum, 12 + lines * 14));
}

export interface SummaryMetric {
  label: string;
  value: string | number;
  type?: "number" | "currency" | "percentage" | "text";
  description?: string;
}

function normalizeExcelValue(value: unknown, type: ExcelValueType): unknown {
  if (type === "date" || type === "datetime") {
    return toExcelDate(value) ?? "—";
  }
  if (type === "number" || type === "currency" || type === "percentage") {
    const number = Number(value ?? 0);
    return Number.isFinite(number) ? number : 0;
  }
  return safeText(value);
}

function numberFormatFor(type: ExcelValueType): string | undefined {
  if (type === "currency") return "$#,##0.00;[Red]-$#,##0.00";
  if (type === "percentage") return "0.0%";
  if (type === "number") return "#,##0";
  if (type === "date") return "mmm d, yyyy";
  if (type === "datetime") return "mmm d, yyyy h:mm AM/PM";
  return undefined;
}

export function createSummarySheet(
  XLSX: ExcelModule,
  context: ReportExportContext,
  metrics: SummaryMetric[],
): WorkSheet {
  const rows: unknown[][] = [
    [safeText(context.organizationName)],
    [safeText(`${context.productName} — ${context.title}`)],
    [safeText(context.description)],
    [
      safeText(`Period: ${context.periodLabel}`),
      safeText(`Generated: ${formatExportTimestamp(context.generatedAt)}`),
      safeText(`Records: ${context.recordCount.toLocaleString("en-US")}`),
    ],
    [],
    ["Summary Metric", "Value", "Explanation"],
    ...metrics.map((metric) => [
      safeText(metric.label),
      typeof metric.value === "string" ? safeText(metric.value) : metric.value,
      safeText(metric.description, ""),
    ]),
  ];
  const sheet = XLSX.utils.aoa_to_sheet(rows, { cellDates: true });
  sheet["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 2 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 2 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: 2 } },
  ];
  setExcelColumns(sheet, [38, 26, 76]);

  applyRangeStyle(XLSX, sheet, "A1:C1", {
    fill: { fgColor: { rgb: COLORS.navy } },
    font: { color: { rgb: COLORS.white }, bold: true, sz: 19 },
    alignment: { horizontal: "center", vertical: "center", wrapText: true },
  });
  applyRangeStyle(XLSX, sheet, "A2:C2", {
    fill: { fgColor: { rgb: COLORS.green } },
    font: { color: { rgb: COLORS.white }, bold: true, sz: 14 },
    alignment: { horizontal: "center", vertical: "center", wrapText: true },
  });
  applyRangeStyle(XLSX, sheet, "A3:C3", {
    fill: { fgColor: { rgb: COLORS.lightGray } },
    font: { color: { rgb: COLORS.mutedText }, sz: 10.5 },
    alignment: { horizontal: "left", vertical: "center", wrapText: true },
  });
  applyRangeStyle(XLSX, sheet, "A6:C6", {
    fill: { fgColor: { rgb: COLORS.navy } },
    font: { color: { rgb: COLORS.white }, bold: true, sz: 11.5 },
    alignment: { horizontal: "center", vertical: "center", wrapText: true },
    border: thinBorder(),
  });

  metrics.forEach((metric, index) => {
    const row = index + 7;
    const fill = row % 2 === 0 ? COLORS.mediumGray : COLORS.white;
    applyRangeStyle(XLSX, sheet, `A${row}:C${row}`, {
      fill: { fgColor: { rgb: fill } },
      font: { color: { rgb: COLORS.text }, sz: 11 },
      alignment: { vertical: "center", wrapText: true },
      border: thinBorder(),
    });
    const valueCell = sheet[`B${row}`];
    if (valueCell) {
      valueCell.s = {
        ...(valueCell.s ?? {}),
        font: { color: { rgb: COLORS.darkGreen }, bold: true, sz: 12 },
        alignment: { horizontal: "center", vertical: "center", wrapText: true },
      };
      if (metric.type === "currency") valueCell.z = "$#,##0.00;[Red]-$#,##0.00";
      if (metric.type === "percentage") valueCell.z = "0.0%";
      if (metric.type === "number") valueCell.z = "#,##0";
    }
    const labelCell = sheet[`A${row}`];
    if (labelCell) {
      labelCell.s = {
        ...(labelCell.s ?? {}),
        font: { color: { rgb: COLORS.text }, bold: true, sz: 11 },
        alignment: { horizontal: "center", vertical: "center", wrapText: true },
      };
    }
    const explanationCell = sheet[`C${row}`];
    if (explanationCell) {
      explanationCell.s = {
        ...(explanationCell.s ?? {}),
        font: { color: { rgb: COLORS.mutedText }, sz: 10.5 },
        alignment: { horizontal: "left", vertical: "center", wrapText: true, indent: 1 },
      };
    }
  });

  applyRangeStyle(XLSX, sheet, "A4:C4", {
    fill: { fgColor: { rgb: COLORS.mediumGray } },
    font: { color: { rgb: COLORS.mutedText }, bold: true, sz: 10 },
    alignment: { horizontal: "center", vertical: "center", wrapText: true },
    border: thinBorder(),
  });

  sheet["!freeze"] = { xSplit: 0, ySplit: 6 };
  sheet["!sheetView"] = [{ showGridLines: false, zoomScale: 95 }];
  sheet["!rows"] = [
    { hpt: 34 },
    { hpt: 28 },
    { hpt: rowHeightForValues([context.description], [72], 44) },
    { hpt: 26 },
    { hpt: 8 },
    { hpt: 30 },
    ...metrics.map((metric) => ({
      hpt: rowHeightForValues(
        [metric.label, metric.value, metric.description ?? ""],
        [38, 26, 76],
        36,
      ),
    })),
  ];
  return sheet;
}

export function createDataSheet<T>(
  XLSX: ExcelModule,
  records: T[],
  columns: ExcelColumn<T>[],
  emptyMessage: string,
): WorkSheet {
  const header = columns.map((column) => column.label);
  const body = records.length
    ? records.map((record) =>
        columns.map((column) =>
          normalizeExcelValue(record ? column.value(record) : undefined, column.type ?? "text"),
        ),
      )
    : [[safeText(emptyMessage), ...columns.slice(1).map(() => "")]];
  const sheet = XLSX.utils.aoa_to_sheet([header, ...body], { cellDates: true });
  setExcelColumns(sheet, columns.map((column) => column.width));
  styleWorkbookData(
    XLSX,
    sheet,
    Math.max(records.length, 1),
    columns.length,
    columns
      .map((column, index) => (column.type === "status" ? index : -1))
      .filter((index) => index >= 0),
    columns
      .map((column, index) =>
        resolveColumnAlignment(column) === "center" ? index : -1,
      )
      .filter((index) => index >= 0),
    columns
      .map((column, index) =>
        resolveColumnAlignment(column) === "right" ? index : -1,
      )
      .filter((index) => index >= 0),
    columns.length > 0 ? [0] : [],
    columns
      .map((column, index) => (column.type === "currency" ? index : -1))
      .filter((index) => index >= 0),
    columns
      .map((column, index) =>
        column.type === "date" || column.type === "datetime" ? index : -1,
      )
      .filter((index) => index >= 0),
  );

  sheet["!rows"] = [
    { hpt: 34 },
    ...body.map((row) => ({
      hpt: rowHeightForValues(
        row,
        columns.map((column) => column.width),
      ),
    })),
  ];

  for (let row = 2; row <= body.length + 1; row += 1) {
    columns.forEach((column, columnIndex) => {
      const address = `${XLSX.utils.encode_col(columnIndex)}${row}`;
      const cell = sheet[address];
      if (!cell) return;
      const format = numberFormatFor(column.type ?? "text");
      if (format) cell.z = format;
    });
  }

  sheet["!pageSetup"] = {
    orientation: columns.length > 8 ? "landscape" : "portrait",
    fitToWidth: 1,
    fitToHeight: 0,
  };
  sheet["!margins"] = {
    left: 0.35,
    right: 0.35,
    top: 0.5,
    bottom: 0.5,
    header: 0.2,
    footer: 0.2,
  };

  return sheet;
}

function formatAnalyticsValue(
  value: number,
  series?: ReportAnalyticsSeries,
): string {
  if (series?.format === "currency") {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(value);
  }
  if (series?.format === "percentage") return `${value.toFixed(1)}%`;
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: Number.isInteger(value) ? 0 : 1,
  }).format(value);
}

function analyticsVisualBar(
  value: number,
  maximum: number,
  series?: ReportAnalyticsSeries,
  width = 18,
): string {
  const ratio = maximum > 0 ? Math.min(1, Math.abs(value) / maximum) : 0;
  const filled = Math.round(ratio * width);
  const bar = `${"█".repeat(filled)}${"░".repeat(Math.max(0, width - filled))}`;
  return `${value < 0 ? "−" : ""}${bar} ${formatAnalyticsValue(Math.abs(value), series)}`;
}

/**
 * Creates the branded Excel analytics worksheet from the same shared model
 * used by the workspace and PDF exports. This keeps category totals and trend
 * values synchronized across all report formats without requiring native
 * Excel chart objects.
 */
export function createReportAnalyticsSheet(
  XLSX: ExcelModule,
  model: ReportAnalyticsModel,
): WorkSheet {
  const visibleCharts = model.charts.filter((chart) =>
    chart.data.some((point) =>
      chart.series.some((series) => {
        const value = Number(point[series.key] ?? 0);
        return Number.isFinite(value) && value !== 0;
      }),
    ),
  );
  const maximumSeriesCount = Math.max(
    1,
    ...visibleCharts.map((chart) => chart.series.length),
  );
  const columnCount = maximumSeriesCount + 2;
  const rows: unknown[][] = [
    [safeText(model.title)],
    ["SUPRAH ANALYTICS"],
    [safeText(model.description, "Analytics for the selected report records.")],
    [],
  ];
  const chartSections: Array<{
    titleRow: number;
    descriptionRow: number;
    headerRow: number;
    dataStartRow: number;
    dataEndRow: number;
    chart: ReportAnalyticsModel["charts"][number];
  }> = [];

  if (visibleCharts.length === 0) {
    rows.push(["No analytics data is available for the selected records."]);
  } else {
    visibleCharts.forEach((chart) => {
      const titleRow = rows.length;
      rows.push([safeText(chart.title)]);
      const descriptionRow = rows.length;
      rows.push([safeText(chart.description)]);
      const headerRow = rows.length;
      rows.push([
        "Category / Period",
        ...chart.series.map((series) => safeText(series.label)),
        ...Array(maximumSeriesCount - chart.series.length).fill(""),
        "Visual Scale",
      ]);
      const dataStartRow = rows.length;
      const maximum = Math.max(
        1,
        ...chart.data.flatMap((point) =>
          chart.series.map((series) =>
            Math.abs(Number(point[series.key] ?? 0)),
          ),
        ),
      );

      chart.data.forEach((point) => {
        const values = chart.series.map((series) => {
          const value = Number(point[series.key] ?? 0);
          return Number.isFinite(value) ? value : 0;
        });
        const primaryValue = values[0] ?? 0;
        rows.push([
          safeText(point.label),
          ...values.map((value, index) =>
            chart.series[index]?.format === "percentage" ? value / 100 : value,
          ),
          ...Array(maximumSeriesCount - chart.series.length).fill(""),
          analyticsVisualBar(primaryValue, maximum, chart.series[0]),
        ]);
      });

      const dataEndRow = Math.max(dataStartRow, rows.length - 1);
      chartSections.push({
        titleRow,
        descriptionRow,
        headerRow,
        dataStartRow,
        dataEndRow,
        chart,
      });
      rows.push([]);
    });
  }

  const sheet = XLSX.utils.aoa_to_sheet(rows, { cellDates: true });
  const lastColumn = XLSX.utils.encode_col(columnCount - 1);
  sheet["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: columnCount - 1 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: columnCount - 1 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: columnCount - 1 } },
  ];

  chartSections.forEach(({ titleRow, descriptionRow }) => {
    sheet["!merges"]?.push(
      { s: { r: titleRow, c: 0 }, e: { r: titleRow, c: columnCount - 1 } },
      {
        s: { r: descriptionRow, c: 0 },
        e: { r: descriptionRow, c: columnCount - 1 },
      },
    );
  });

  setExcelColumns(sheet, [32, ...Array(maximumSeriesCount).fill(18), 38]);
  applyRangeStyle(XLSX, sheet, `A1:${lastColumn}1`, {
    fill: { fgColor: { rgb: COLORS.navy } },
    font: { color: { rgb: COLORS.white }, bold: true, sz: 18 },
    alignment: { horizontal: "center", vertical: "center", wrapText: true },
  });
  applyRangeStyle(XLSX, sheet, `A2:${lastColumn}2`, {
    fill: { fgColor: { rgb: COLORS.green } },
    font: { color: { rgb: COLORS.white }, bold: true, sz: 12 },
    alignment: { horizontal: "center", vertical: "center" },
  });
  applyRangeStyle(XLSX, sheet, `A3:${lastColumn}3`, {
    fill: { fgColor: { rgb: COLORS.lightGray } },
    font: { color: { rgb: COLORS.mutedText }, sz: 10.5 },
    alignment: { horizontal: "left", vertical: "center", wrapText: true },
  });

  chartSections.forEach((section, chartIndex) => {
    const titleExcelRow = section.titleRow + 1;
    const descriptionExcelRow = section.descriptionRow + 1;
    const headerExcelRow = section.headerRow + 1;
    applyRangeStyle(XLSX, sheet, `A${titleExcelRow}:${lastColumn}${titleExcelRow}`, {
      fill: { fgColor: { rgb: chartIndex % 2 === 0 ? COLORS.darkNavy : COLORS.darkGreen } },
      font: { color: { rgb: COLORS.white }, bold: true, sz: 12 },
      alignment: { horizontal: "left", vertical: "center", wrapText: true, indent: 1 },
    });
    applyRangeStyle(XLSX, sheet, `A${descriptionExcelRow}:${lastColumn}${descriptionExcelRow}`, {
      fill: { fgColor: { rgb: COLORS.lightGreen } },
      font: { color: { rgb: COLORS.mutedText }, italic: true, sz: 10 },
      alignment: { horizontal: "left", vertical: "center", wrapText: true, indent: 1 },
    });
    applyRangeStyle(XLSX, sheet, `A${headerExcelRow}:${lastColumn}${headerExcelRow}`, {
      fill: { fgColor: { rgb: COLORS.green } },
      font: { color: { rgb: COLORS.white }, bold: true, sz: 10.5 },
      alignment: { horizontal: "center", vertical: "center", wrapText: true },
      border: thinBorder(),
    });

    for (let rowIndex = section.dataStartRow; rowIndex <= section.dataEndRow; rowIndex += 1) {
      const excelRow = rowIndex + 1;
      const fill = rowIndex % 2 === 0 ? COLORS.white : COLORS.mediumGray;
      applyRangeStyle(XLSX, sheet, `A${excelRow}:${lastColumn}${excelRow}`, {
        fill: { fgColor: { rgb: fill } },
        font: { color: { rgb: COLORS.text }, sz: 10.5 },
        alignment: { vertical: "center", wrapText: true },
        border: thinBorder(),
      });
      const categoryCell = sheet[`A${excelRow}`];
      if (categoryCell) {
        categoryCell.s = {
          ...(categoryCell.s ?? {}),
          font: { color: { rgb: COLORS.text }, bold: true, sz: 10.5 },
          alignment: { horizontal: "left", vertical: "center", wrapText: true, indent: 1 },
        };
      }

      section.chart.series.forEach((series, seriesIndex) => {
        const column = XLSX.utils.encode_col(seriesIndex + 1);
        const cell = sheet[`${column}${excelRow}`];
        if (!cell) return;
        cell.s = {
          ...(cell.s ?? {}),
          font: { color: { rgb: COLORS.darkGreen }, bold: true, sz: 10.5 },
          alignment: { horizontal: "right", vertical: "center" },
        };
        if (series.format === "currency") cell.z = "$#,##0.00;[Red]-$#,##0.00";
        else if (series.format === "percentage") cell.z = "0.0%";
        else cell.z = "#,##0.##";
      });

      const visualColumn = XLSX.utils.encode_col(columnCount - 1);
      const visualCell = sheet[`${visualColumn}${excelRow}`];
      if (visualCell) {
        visualCell.s = {
          ...(visualCell.s ?? {}),
          font: { color: { rgb: COLORS.blue }, bold: true, name: "Consolas", sz: 9.5 },
          alignment: { horizontal: "left", vertical: "center" },
        };
      }
    }
  });

  sheet["!freeze"] = { xSplit: 0, ySplit: 4 };
  sheet["!sheetView"] = [{ showGridLines: false, zoomScale: 90 }];
  sheet["!pageSetup"] = {
    orientation: columnCount >= 6 ? "landscape" : "portrait",
    fitToWidth: 1,
    fitToHeight: 0,
  };
  sheet["!margins"] = {
    left: 0.35,
    right: 0.35,
    top: 0.5,
    bottom: 0.5,
    header: 0.2,
    footer: 0.2,
  };
  sheet["!rows"] = rows.map((row, index) => {
    if (index === 0) return { hpt: 34 };
    if (index === 1) return { hpt: 24 };
    if (index === 2) return { hpt: rowHeightForValues(row, [92], 40) };
    if (row.length === 0) return { hpt: 10 };
    return { hpt: rowHeightForValues(row, [32, ...Array(maximumSeriesCount).fill(18), 38], 28) };
  });
  BRANDED_ANALYTICS_SHEETS.add(sheet as object);
  return sheet;
}

export function styleSuprahAnalyticsSheet(
  XLSX: ExcelModule,
  worksheet: WorkSheet,
): void {
  if (BRANDED_ANALYTICS_SHEETS.has(worksheet as object)) return;
  const range = worksheet["!ref"] ? XLSX.utils.decode_range(worksheet["!ref"]) : null;
  if (!range) return;
  const lastColumn = XLSX.utils.encode_col(range.e.c);

  applyRangeStyle(XLSX, worksheet, `A1:${lastColumn}1`, {
    fill: { fgColor: { rgb: COLORS.green } },
    font: { color: { rgb: COLORS.white }, bold: true, sz: 11.5 },
    alignment: { horizontal: "center", vertical: "center", wrapText: true },
    border: thinBorder(),
  });

  worksheet["!freeze"] = { xSplit: 0, ySplit: 1 };
  worksheet["!sheetView"] = [{ showGridLines: false, zoomScale: 95 }];
  worksheet["!pageSetup"] = {
    orientation: range.e.c >= 6 ? "landscape" : "portrait",
    fitToWidth: 1,
    fitToHeight: 0,
  };
}

export function appendStandardWorkbookSheets(input: {
  XLSX: ExcelModule;
  workbook: WorkBook;
  context: ReportExportContext;
  summaryMetrics: SummaryMetric[];
  detailSheet: WorkSheet;
  analyticsSheet: WorkSheet;
  extraSheets?: Array<{ name: string; sheet: WorkSheet }>;
}): void {
  const { XLSX, workbook, context, summaryMetrics, detailSheet, analyticsSheet, extraSheets = [] } = input;
  const summarySheet = createSummarySheet(XLSX, context, summaryMetrics);
  styleSuprahAnalyticsSheet(XLSX, analyticsSheet);

  XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");
  XLSX.utils.book_append_sheet(workbook, analyticsSheet, "Analytics");
  XLSX.utils.book_append_sheet(workbook, detailSheet, "Detailed Records");
  extraSheets.forEach(({ name, sheet }) => XLSX.utils.book_append_sheet(workbook, sheet, name.slice(0, 31)));
}

export function writeWorkbookBlob(XLSX: ExcelModule, workbook: WorkBook): Blob {
  const array = XLSX.write(workbook, {
    bookType: "xlsx",
    type: "array",
    cellStyles: true,
    compression: true,
  });
  return new Blob([array], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

/** Backward-compatible styling helpers retained for older workbook code. */
export function styleWorkbookSummary(
  XLSX: ExcelModule,
  worksheet: WorkSheet,
  metricEndRow: number,
): void {
  applyRangeStyle(XLSX, worksheet, "A1:B1", {
    fill: { fgColor: { rgb: COLORS.navy } },
    font: { color: { rgb: COLORS.white }, bold: true, sz: 18 },
    alignment: { horizontal: "center", vertical: "center", wrapText: true },
  });
  if (metricEndRow >= 5) {
    applyRangeStyle(XLSX, worksheet, "A5:B5", {
      fill: { fgColor: { rgb: COLORS.navy } },
      font: { color: { rgb: COLORS.white }, bold: true },
      alignment: { horizontal: "center", vertical: "center" },
      border: thinBorder(),
    });
  }
  worksheet["!freeze"] = { xSplit: 0, ySplit: 5 };
  worksheet["!sheetView"] = [{ showGridLines: false, zoomScale: 95 }];
}

export function styleWorkbookData(
  XLSX: ExcelModule,
  worksheet: WorkSheet,
  rowCount: number,
  columnCount: number,
  statusColumnIndexes: number | number[] = [],
  centerColumns: number[] = [],
  rightColumns: number[] = [],
  emphasisColumns: number[] = [],
  currencyColumns: number[] = [],
  dateColumns: number[] = [],
): void {
  if (columnCount <= 0) return;
  const lastColumn = XLSX.utils.encode_col(columnCount - 1);
  const lastRow = Math.max(2, rowCount + 1);
  applyRangeStyle(XLSX, worksheet, `A1:${lastColumn}1`, {
    fill: { fgColor: { rgb: COLORS.navy } },
    font: { color: { rgb: COLORS.white }, bold: true, sz: 11.5 },
    alignment: { horizontal: "center", vertical: "center", wrapText: true },
    border: thinBorder(),
  });

  for (let row = 2; row <= lastRow; row += 1) {
    for (let column = 0; column < columnCount; column += 1) {
      const address = `${XLSX.utils.encode_col(column)}${row}`;
      const cell = worksheet[address];
      if (!cell) continue;
      const fill = row % 2 === 0 ? COLORS.columnSoft : COLORS.white;
      const horizontal = rightColumns.includes(column) || currencyColumns.includes(column)
        ? "right"
        : centerColumns.includes(column) || dateColumns.includes(column)
          ? "center"
          : "left";
      cell.s = {
        fill: { fgColor: { rgb: fill } },
        font: {
          color: { rgb: currencyColumns.includes(column) ? COLORS.darkGreen : COLORS.text },
          bold: emphasisColumns.includes(column) || currencyColumns.includes(column),
          sz: 10.5,
        },
        alignment: {
          horizontal,
          vertical: "center",
          wrapText: true,
          indent: horizontal === "left" ? 1 : 0,
        },
        border: thinBorder(),
      };
    }

    const statusIndexes = Array.isArray(statusColumnIndexes)
      ? statusColumnIndexes
      : [statusColumnIndexes];

    statusIndexes
      .filter((column) => column >= 0 && column < columnCount)
      .forEach((column) => {
        const address = `${XLSX.utils.encode_col(column)}${row}`;
        const cell = worksheet[address];
        if (!cell) return;

        const colors = statusColors(safeText(cell.v, ""));
        cell.s = {
          ...(cell.s ?? {}),
          fill: { fgColor: { rgb: colors.fill } },
          font: { color: { rgb: colors.font }, bold: true, sz: 10.5 },
          alignment: {
            horizontal: "center",
            vertical: "center",
            wrapText: true,
          },
        };
      });
  }

  worksheet["!autofilter"] = { ref: `A1:${lastColumn}${lastRow}` };
  worksheet["!freeze"] = { xSplit: 0, ySplit: 1 };
  worksheet["!sheetView"] = [{ showGridLines: false, zoomScale: 95 }];
  worksheet["!rows"] = [
    { hpt: 38 },
    ...Array.from({ length: Math.max(1, rowCount) }, () => ({ hpt: 30 })),
  ];
}

export function styleFinancialAnalysisSheet(
  XLSX: ExcelModule,
  worksheet: WorkSheet,
): void {
  const range = worksheet["!ref"] ? XLSX.utils.decode_range(worksheet["!ref"]) : null;
  if (!range) return;
  styleWorkbookData(
    XLSX,
    worksheet,
    Math.max(1, range.e.r),
    range.e.c + 1,
  );
}
