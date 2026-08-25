const EXPORT_TIME_ZONE = "America/Denver";

export interface AppointmentDashboardExportRecord {
  _id?: string;
  title?: string;
  startTime: Date | string;
  endTime: Date | string;
  type?: string;
  status?: string;
  source?: string;
  customerBooking?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
  };
  crmUser?: {
    fullName?: string;
    email?: string;
  };
}

export interface AppointmentDashboardExportOptions {
  periodLabel: string;
  viewMode: "day" | "month";
  statusFilter: string;
  typeFilter: string;
  searchQuery: string;
}

const COLORS = {
  navy: "0F172A",
  green: "108460",
  darkGreen: "0B7454",
  white: "FFFFFF",
  text: "1E293B",
  mutedText: "64748B",
  border: "CBD5E1",
  lightBorder: "E2E8F0",
  lightGray: "F8FAFC",
  mediumGray: "F1F5F9",
  greenSoft: "D1FAE5",
  amberSoft: "FEF3C7",
  amber: "D97706",
  redSoft: "FEE2E2",
  red: "DC2626",
  blueSoft: "DBEAFE",
  blue: "2563EB",
} as const;

const SAFE_FORMULA_PREFIX = /^[\s]*[=+\-@]/;

function safeText(value: unknown, fallback = "—"): string {
  const text = String(value ?? "").trim();
  const resolved = text || fallback;
  return SAFE_FORMULA_PREFIX.test(resolved) ? `'${resolved}` : resolved;
}

function formatDate(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: EXPORT_TIME_ZONE,
  });
}

function formatTime(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: EXPORT_TIME_ZONE,
  });
}

function formatGeneratedAt(value: Date): string {
  return value.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: EXPORT_TIME_ZONE,
  });
}

function formatDuration(startValue: Date | string, endValue: Date | string): string {
  const start = startValue instanceof Date ? startValue : new Date(startValue);
  const end = endValue instanceof Date ? endValue : new Date(endValue);
  const minutes = Math.round((end.getTime() - start.getTime()) / 60_000);
  if (!Number.isFinite(minutes) || minutes < 0) return "—";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder === 0 ? `${hours}h` : `${hours}h ${remainder}m`;
}

function titleCase(value: unknown, fallback = "—"): string {
  const text = String(value ?? "").trim();
  if (!text) return fallback;
  return text
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function statusStyle(status: string) {
  const normalized = status.toLowerCase();
  if (normalized.includes("cancel") || normalized.includes("reject")) {
    return { fill: COLORS.redSoft, font: COLORS.red };
  }
  if (normalized.includes("schedule") || normalized.includes("pending")) {
    return { fill: COLORS.amberSoft, font: COLORS.amber };
  }
  if (normalized.includes("confirm") || normalized.includes("complete")) {
    return { fill: COLORS.greenSoft, font: COLORS.darkGreen };
  }
  return { fill: COLORS.blueSoft, font: COLORS.blue };
}

function thinBorder() {
  return {
    top: { style: "thin", color: { rgb: COLORS.lightBorder } },
    bottom: { style: "thin", color: { rgb: COLORS.lightBorder } },
    left: { style: "thin", color: { rgb: COLORS.lightBorder } },
    right: { style: "thin", color: { rgb: COLORS.lightBorder } },
  };
}

function estimateRowHeight(values: unknown[], widths: number[]): number {
  let lines = 1;
  values.forEach((value, index) => {
    const text = String(value ?? "");
    const width = Math.max(10, widths[index] ?? 18);
    const estimated = text.split(/\r?\n/).reduce(
      (total, line) => total + Math.max(1, Math.ceil(line.length / Math.max(10, Math.floor(width * 1.25)))),
      0,
    );
    lines = Math.max(lines, estimated);
  });
  return Math.min(120, Math.max(28, 10 + lines * 14));
}

function getCustomerName(record: AppointmentDashboardExportRecord): string {
  const first = record.customerBooking?.firstName ?? "";
  const last = record.customerBooking?.lastName ?? "";
  const name = `${first} ${last}`.trim();
  return name || safeText(record.title, "—");
}

export async function generateAppointmentDashboardExcel(
  records: AppointmentDashboardExportRecord[],
  options: AppointmentDashboardExportOptions,
): Promise<Blob> {
  const XLSX = await import("xlsx-js-style");
  const workbook = XLSX.utils.book_new();
  const generatedAt = new Date();

  const headers = [
    "Customer Name",
    "Email",
    "Phone",
    "Appointment Date",
    "Appointment Time",
    "Duration",
    "Type",
    "Status",
    "CRM User",
    "Source",
  ];

  const body = records.map((record) => [
    safeText(getCustomerName(record)),
    safeText(record.customerBooking?.email),
    safeText(record.customerBooking?.phone),
    formatDate(record.startTime),
    formatTime(record.startTime),
    formatDuration(record.startTime, record.endTime),
    titleCase(record.type, "Appointment"),
    titleCase(record.status, "Scheduled"),
    safeText(record.crmUser?.fullName, "—"),
    titleCase(record.source, "Manual"),
  ]);

  const statusLabel = options.statusFilter === "all" ? "All statuses" : titleCase(options.statusFilter);
  const typeLabel = options.typeFilter === "all" ? "All types" : titleCase(options.typeFilter);
  const searchLabel = options.searchQuery.trim() || "None";
  const viewLabel = options.viewMode === "month" ? "Monthly view" : "Daily view";

  const rows: unknown[][] = [
    ["SUPRAH.AI"],
    ["Service Hub Appointment Export"],
    [`${options.periodLabel} • ${viewLabel} • Mountain Time (America/Denver)`],
    [`Records: ${records.length} • Status: ${statusLabel} • Type: ${typeLabel} • Search: ${searchLabel}`],
    [`Generated: ${formatGeneratedAt(generatedAt)} MT`],
    [],
    headers,
    ...(body.length ? body : [["No appointments match the current Service Hub filters.", ...headers.slice(1).map(() => "")]]),
  ];

  const sheet = XLSX.utils.aoa_to_sheet(rows);
  const columnWidths = [28, 38, 22, 20, 18, 16, 20, 18, 28, 20];
  sheet["!cols"] = columnWidths.map((wch) => ({ wch }));
  sheet["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 9 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 9 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: 9 } },
    { s: { r: 3, c: 0 }, e: { r: 3, c: 9 } },
    { s: { r: 4, c: 0 }, e: { r: 4, c: 9 } },
  ];

  const applyRangeStyle = (range: string, style: Record<string, unknown>) => {
    const decoded = XLSX.utils.decode_range(range);
    for (let r = decoded.s.r; r <= decoded.e.r; r += 1) {
      for (let c = decoded.s.c; c <= decoded.e.c; c += 1) {
        const address = XLSX.utils.encode_cell({ r, c });
        if (!sheet[address]) sheet[address] = { t: "s", v: "" };
        sheet[address].s = style;
      }
    }
  };

  applyRangeStyle("A1:J1", {
    fill: { fgColor: { rgb: COLORS.navy } },
    font: { color: { rgb: COLORS.white }, bold: true, sz: 19 },
    alignment: { horizontal: "center", vertical: "center", wrapText: true },
  });
  applyRangeStyle("A2:J2", {
    fill: { fgColor: { rgb: COLORS.green } },
    font: { color: { rgb: COLORS.white }, bold: true, sz: 14 },
    alignment: { horizontal: "center", vertical: "center", wrapText: true },
  });
  applyRangeStyle("A3:J5", {
    fill: { fgColor: { rgb: COLORS.lightGray } },
    font: { color: { rgb: COLORS.mutedText }, sz: 10.5 },
    alignment: { horizontal: "left", vertical: "center", wrapText: true },
  });
  applyRangeStyle("A7:J7", {
    fill: { fgColor: { rgb: COLORS.navy } },
    font: { color: { rgb: COLORS.white }, bold: true, sz: 11 },
    alignment: { horizontal: "center", vertical: "center", wrapText: true },
    border: thinBorder(),
  });

  const dataStartRow = 8;
  const dataEndRow = Math.max(dataStartRow, dataStartRow + body.length - 1);

  for (let row = dataStartRow; row <= dataEndRow; row += 1) {
    const fill = row % 2 === 0 ? COLORS.white : COLORS.mediumGray;
    for (let col = 0; col < headers.length; col += 1) {
      const address = XLSX.utils.encode_cell({ r: row - 1, c: col });
      const cell = sheet[address];
      if (!cell) continue;
      cell.s = {
        fill: { fgColor: { rgb: fill } },
        font: { color: { rgb: COLORS.text }, sz: 10.5, bold: col === 0 },
        alignment: {
          horizontal: [2, 3, 4, 5, 6, 7, 9].includes(col) ? "center" : "left",
          vertical: "center",
          wrapText: true,
        },
        border: thinBorder(),
      };

      // Phone numbers are identifiers, not numeric values. Force the Phone
      // column to Excel Text format so leading `+` / zeroes are preserved and
      // Excel cannot display values as scientific notation (for example
      // 6.31E+11).
      if (col === 2) {
        cell.t = "s";
        cell.v = String(cell.v ?? "");
        cell.z = "@";
      }
    }

    if (body.length) {
      const statusAddress = XLSX.utils.encode_cell({ r: row - 1, c: 7 });
      const statusCell = sheet[statusAddress];
      if (statusCell) {
        const tone = statusStyle(String(statusCell.v ?? ""));
        statusCell.s = {
          ...(statusCell.s ?? {}),
          fill: { fgColor: { rgb: tone.fill } },
          font: { color: { rgb: tone.font }, bold: true, sz: 10.5 },
          alignment: { horizontal: "center", vertical: "center", wrapText: true },
          border: thinBorder(),
        };
      }
    }
  }

  sheet["!rows"] = [
    { hpt: 34 },
    { hpt: 28 },
    { hpt: 22 },
    { hpt: 22 },
    { hpt: 22 },
    { hpt: 8 },
    { hpt: 30 },
    ...(body.length ? body : [[rows[7]?.[0] ?? ""]]).map((row) => ({
      hpt: estimateRowHeight(row as unknown[], columnWidths),
    })),
  ];

  sheet["!autofilter"] = { ref: `A7:J${dataEndRow}` };
  sheet["!freeze"] = { xSplit: 0, ySplit: 7 };
  sheet["!sheetView"] = [{ showGridLines: false, zoomScale: 90 }];
  sheet["!pageSetup"] = {
    orientation: "landscape",
    fitToWidth: 1,
    fitToHeight: 0,
  };
  sheet["!margins"] = {
    left: 0.3,
    right: 0.3,
    top: 0.45,
    bottom: 0.45,
    header: 0.2,
    footer: 0.2,
  };

  XLSX.utils.book_append_sheet(workbook, sheet, "Appointments");

  const output = XLSX.write(workbook, {
    bookType: "xlsx",
    type: "array",
    cellStyles: true,
  });

  return new Blob([output], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}