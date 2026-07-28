import type { Lead } from "@/types/lead";
import type {
  CellObject,
  WorkSheet,
} from "xlsx-js-style";

type ExcelModule = typeof import("xlsx-js-style");

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
  percentage: number;
}

const COLORS = {
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
};

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

function formatGeneratedAt(date: Date): string {
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function normalizeStatus(value: unknown): string {
  const status = String(value ?? "").trim();

  return status || "Unknown";
}

function buildStatusSummary(leads: Lead[]): LeadStatusSummary {
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
  const statusCounts = new Map<string, number>();

  leads.forEach((lead) => {
    const status = normalizeStatus(lead.status);

    statusCounts.set(status, (statusCounts.get(status) ?? 0) + 1);
  });

  const preferredOrder = [
    "New",
    "Contacted",
    "Pending",
    "Appointment Set",
    "Closed",
    "Unknown",
  ];

  return Array.from(statusCounts.entries())
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
      percentage: leads.length > 0 ? count / leads.length : 0,
    }));
}

function ensureCell(
  XLSX: ExcelModule,
  worksheet: WorkSheet,
  row: number,
  column: number,
): CellObject {
  const address = XLSX.utils.encode_cell({
    r: row,
    c: column,
  });

  if (!worksheet[address]) {
    worksheet[address] = {
      t: "s",
      v: "",
    };
  }

  return worksheet[address] as CellObject;
}

function applyRangeStyle(
  XLSX: ExcelModule,
  worksheet: WorkSheet,
  range: string,
  style: Record<string, unknown>,
): void {
  const decodedRange = XLSX.utils.decode_range(range);

  for (
    let row = decodedRange.s.r;
    row <= decodedRange.e.r;
    row += 1
  ) {
    for (
      let column = decodedRange.s.c;
      column <= decodedRange.e.c;
      column += 1
    ) {
      const cell = ensureCell(XLSX, worksheet, row, column);

      cell.s = style;
    }
  }
}

function applyTableBorders(
  XLSX: ExcelModule,
  worksheet: WorkSheet,
  startRow: number,
  endRow: number,
  startColumn: number,
  endColumn: number,
): void {
  for (let row = startRow; row <= endRow; row += 1) {
    for (
      let column = startColumn;
      column <= endColumn;
      column += 1
    ) {
      const cell = ensureCell(XLSX, worksheet, row, column);

      cell.s = {
        ...(cell.s ?? {}),
        border: {
          top: {
            style: "thin",
            color: { rgb: COLORS.lightBorder },
          },
          bottom: {
            style: "thin",
            color: { rgb: COLORS.lightBorder },
          },
          left: {
            style: "thin",
            color: { rgb: COLORS.lightBorder },
          },
          right: {
            style: "thin",
            color: { rgb: COLORS.lightBorder },
          },
        },
      };
    }
  }
}

function getStatusFillColor(status: string): string {
  switch (status) {
    case "New":
      return "DBEAFE";

    case "Contacted":
      return "EDE9FE";

    case "Pending":
      return "FEF3C7";

    case "Appointment Set":
      return "CFFAFE";

    case "Closed":
      return "DCFCE7";

    default:
      return "F1F5F9";
  }
}

function getStatusFontColor(status: string): string {
  switch (status) {
    case "New":
      return "1D4ED8";

    case "Contacted":
      return "6D28D9";

    case "Pending":
      return "B45309";

    case "Appointment Set":
      return "0E7490";

    case "Closed":
      return "15803D";

    default:
      return "475569";
  }
}

function createSummarySheet(
  XLSX: ExcelModule,
  leads: Lead[],
  monthLabel: string,
  generatedAt: string,
): WorkSheet {
  const summary = buildStatusSummary(leads);
  const distribution = buildStatusDistribution(leads);

  const distributionRows =
    distribution.length > 0
      ? distribution.map((row) => [
          row.status,
          row.count,
          row.percentage,
        ])
      : [["No status data available", 0, 0]];

  const worksheet = XLSX.utils.aoa_to_sheet([
    ["ACTION AUTO UTAH — LEAD STATUS REPORT", "", ""],
    [monthLabel, "", ""],
    [`Generated: ${generatedAt}`, "", ""],
    [],
    ["REPORT SUMMARY", "", ""],
    ["Metric", "Value", "Percentage"],
    [
      "Total Leads",
      summary.total,
      summary.total > 0 ? 1 : 0,
    ],
    [
      "New",
      summary.newLeads,
      summary.total > 0 ? summary.newLeads / summary.total : 0,
    ],
    [
      "Contacted",
      summary.contacted,
      summary.total > 0 ? summary.contacted / summary.total : 0,
    ],
    [
      "Pending",
      summary.pending,
      summary.total > 0 ? summary.pending / summary.total : 0,
    ],
    [
      "Appointment Set",
      summary.appointments,
      summary.total > 0
        ? summary.appointments / summary.total
        : 0,
    ],
    [
      "Closed",
      summary.closed,
      summary.total > 0 ? summary.closed / summary.total : 0,
    ],
    [
      "Unknown",
      summary.unknown,
      summary.total > 0 ? summary.unknown / summary.total : 0,
    ],
    [],
    ["STATUS DISTRIBUTION", "", ""],
    ["Status", "Lead Count", "Percentage"],
    ...distributionRows,
  ]);

  worksheet["!merges"] = [
    {
      s: { r: 0, c: 0 },
      e: { r: 0, c: 2 },
    },
    {
      s: { r: 1, c: 0 },
      e: { r: 1, c: 2 },
    },
    {
      s: { r: 2, c: 0 },
      e: { r: 2, c: 2 },
    },
    {
      s: { r: 4, c: 0 },
      e: { r: 4, c: 2 },
    },
    {
      s: { r: 14, c: 0 },
      e: { r: 14, c: 2 },
    },
  ];

  worksheet["!cols"] = [
    { wch: 30 },
    { wch: 18 },
    { wch: 18 },
  ];

  worksheet["!rows"] = [
    { hpt: 29 },
    { hpt: 22 },
    { hpt: 18 },
    { hpt: 8 },
    { hpt: 21 },
    { hpt: 25 },
  ];

  worksheet["!freeze"] = {
    xSplit: 0,
    ySplit: 6,
  };

  worksheet["!sheetView"] = [
    {
      showGridLines: false,
    },
  ];

  applyRangeStyle(XLSX, worksheet, "A1:C1", {
    fill: {
      fgColor: {
        rgb: COLORS.navy,
      },
    },
    font: {
      color: {
        rgb: COLORS.white,
      },
      bold: true,
      sz: 18,
    },
    alignment: {
      horizontal: "center",
      vertical: "center",
    },
  });

  applyRangeStyle(XLSX, worksheet, "A2:C2", {
    fill: {
      fgColor: {
        rgb: COLORS.green,
      },
    },
    font: {
      color: {
        rgb: COLORS.white,
      },
      bold: true,
      sz: 13,
    },
    alignment: {
      horizontal: "center",
      vertical: "center",
    },
  });

  applyRangeStyle(XLSX, worksheet, "A3:C3", {
    fill: {
      fgColor: {
        rgb: COLORS.darkNavy,
      },
    },
    font: {
      color: {
        rgb: "CBD5E1",
      },
      italic: true,
      sz: 10,
    },
    alignment: {
      horizontal: "center",
      vertical: "center",
    },
  });

  for (const range of ["A5:C5", "A15:C15"]) {
    applyRangeStyle(XLSX, worksheet, range, {
      fill: {
        fgColor: {
          rgb: COLORS.darkGreen,
        },
      },
      font: {
        color: {
          rgb: COLORS.white,
        },
        bold: true,
        sz: 11,
      },
      alignment: {
        horizontal: "center",
        vertical: "center",
      },
    });
  }

  for (const range of ["A6:C6", "A16:C16"]) {
    applyRangeStyle(XLSX, worksheet, range, {
      fill: {
        fgColor: {
          rgb: COLORS.navy,
        },
      },
      font: {
        color: {
          rgb: COLORS.white,
        },
        bold: true,
        sz: 10.5,
      },
      alignment: {
        horizontal: "center",
        vertical: "center",
      },
      border: {
        top: {
          style: "thin",
          color: { rgb: COLORS.border },
        },
        bottom: {
          style: "thin",
          color: { rgb: COLORS.border },
        },
        left: {
          style: "thin",
          color: { rgb: COLORS.border },
        },
        right: {
          style: "thin",
          color: { rgb: COLORS.border },
        },
      },
    });
  }

  for (let row = 6; row <= 12; row += 1) {
    for (let column = 0; column <= 2; column += 1) {
      const cell = ensureCell(XLSX, worksheet, row, column);

      cell.s = {
        fill: {
          fgColor: {
            rgb:
              row % 2 === 0
                ? COLORS.lightGreen
                : COLORS.white,
          },
        },
        font: {
          color: {
            rgb: COLORS.text,
          },
          bold: column === 1,
          sz: 10.5,
        },
        alignment: {
          horizontal:
            column === 0 ? "left" : "center",
          vertical: "center",
        },
        border: {
          top: {
            style: "thin",
            color: { rgb: COLORS.lightBorder },
          },
          bottom: {
            style: "thin",
            color: { rgb: COLORS.lightBorder },
          },
          left: {
            style: "thin",
            color: { rgb: COLORS.lightBorder },
          },
          right: {
            style: "thin",
            color: { rgb: COLORS.lightBorder },
          },
        },
      };
    }

    const percentageCell = ensureCell(XLSX, worksheet, row, 2);

    percentageCell.z = "0.0%";
  }

  const distributionStartRow = 16;
  const distributionEndRow =
    distributionStartRow + distributionRows.length - 1;

  for (
    let row = distributionStartRow;
    row <= distributionEndRow;
    row += 1
  ) {
    const excelRowNumber = row + 1;

    for (let column = 0; column <= 2; column += 1) {
      const cell = ensureCell(XLSX, worksheet, row, column);

      cell.s = {
        fill: {
          fgColor: {
            rgb:
              excelRowNumber % 2 === 0
                ? COLORS.lighterGreen
                : COLORS.white,
          },
        },
        font: {
          color: {
            rgb: COLORS.text,
          },
          bold: column === 0,
          sz: 10.5,
        },
        alignment: {
          horizontal:
            column === 0 ? "left" : "center",
          vertical: "center",
        },
        border: {
          top: {
            style: "thin",
            color: { rgb: COLORS.lightBorder },
          },
          bottom: {
            style: "thin",
            color: { rgb: COLORS.lightBorder },
          },
          left: {
            style: "thin",
            color: { rgb: COLORS.lightBorder },
          },
          right: {
            style: "thin",
            color: { rgb: COLORS.lightBorder },
          },
        },
      };
    }

    const percentageCell = ensureCell(XLSX, worksheet, row, 2);

    percentageCell.z = "0.0%";
  }

  worksheet["!autofilter"] = {
    ref: `A16:C${Math.max(16, distributionEndRow + 1)}`,
  };

  return worksheet;
}

function createLeadDetailsSheet(
  XLSX: ExcelModule,
  leads: Lead[],
  monthLabel: string,
  generatedAt: string,
): WorkSheet {
  const sortedLeads = [...leads].sort((leadA, leadB) => {
    const dateA = new Date(leadA.createdAt).getTime();
    const dateB = new Date(leadB.createdAt).getTime();

    const safeDateA = Number.isNaN(dateA) ? 0 : dateA;
    const safeDateB = Number.isNaN(dateB) ? 0 : dateB;

    return safeDateB - safeDateA;
  });

  const detailRows =
    sortedLeads.length > 0
      ? sortedLeads.map((lead, index) => [
          index + 1,
          formatLeadName(lead),
          safeText(lead.email || lead.senderEmail),
          safeText(lead.phone),
          formatVehicle(lead),
          safeText(lead.source, "Unknown"),
          normalizeStatus(lead.status),
          formatDate(lead.createdAt),
        ])
      : [
          [
            1,
            "No lead records available",
            "—",
            "—",
            "—",
            "—",
            "—",
            "—",
          ],
        ];

  const worksheet = XLSX.utils.aoa_to_sheet([
    [
      "ACTION AUTO UTAH — LEAD STATUS DETAILS",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
    ],
    [
      monthLabel,
      "",
      "",
      "",
      "",
      "",
      "",
      "",
    ],
    [
      `Generated: ${generatedAt}`,
      "",
      "",
      "",
      "",
      "",
      "",
      "",
    ],
    [],
    [
      "LEAD DETAILS",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
    ],
    [
      "#",
      "Lead Name",
      "Email",
      "Phone",
      "Vehicle Interest",
      "Lead Source",
      "Lead Status",
      "Created Date",
    ],
    ...detailRows,
  ]);

  worksheet["!merges"] = [
    {
      s: { r: 0, c: 0 },
      e: { r: 0, c: 7 },
    },
    {
      s: { r: 1, c: 0 },
      e: { r: 1, c: 7 },
    },
    {
      s: { r: 2, c: 0 },
      e: { r: 2, c: 7 },
    },
    {
      s: { r: 4, c: 0 },
      e: { r: 4, c: 7 },
    },
  ];

  worksheet["!cols"] = [
    { wch: 7 },
    { wch: 26 },
    { wch: 34 },
    { wch: 18 },
    { wch: 30 },
    { wch: 22 },
    { wch: 20 },
    { wch: 18 },
  ];

  worksheet["!rows"] = [
    { hpt: 29 },
    { hpt: 22 },
    { hpt: 18 },
    { hpt: 8 },
    { hpt: 21 },
    { hpt: 25 },
  ];

  worksheet["!freeze"] = {
    xSplit: 0,
    ySplit: 6,
  };

  worksheet["!sheetView"] = [
    {
      showGridLines: false,
    },
  ];

  worksheet["!autofilter"] = {
    ref: `A6:H${Math.max(
      6,
      detailRows.length + 6,
    )}`,
  };

  applyRangeStyle(
    XLSX,
    worksheet,
    "A1:H1",
    {
      fill: {
        fgColor: {
          rgb: COLORS.navy,
        },
      },
      font: {
        color: {
          rgb: COLORS.white,
        },
        bold: true,
        sz: 18,
      },
      alignment: {
        horizontal: "center",
        vertical: "center",
      },
    },
  );

  applyRangeStyle(
    XLSX,
    worksheet,
    "A2:H2",
    {
      fill: {
        fgColor: {
          rgb: COLORS.green,
        },
      },
      font: {
        color: {
          rgb: COLORS.white,
        },
        bold: true,
        sz: 13,
      },
      alignment: {
        horizontal: "center",
        vertical: "center",
      },
    },
  );

  applyRangeStyle(
    XLSX,
    worksheet,
    "A3:H3",
    {
      fill: {
        fgColor: {
          rgb: COLORS.darkNavy,
        },
      },
      font: {
        color: {
          rgb: "CBD5E1",
        },
        italic: true,
        sz: 10,
      },
      alignment: {
        horizontal: "center",
        vertical: "center",
      },
    },
  );

  applyRangeStyle(
    XLSX,
    worksheet,
    "A5:H5",
    {
      fill: {
        fgColor: {
          rgb: COLORS.darkGreen,
        },
      },
      font: {
        color: {
          rgb: COLORS.white,
        },
        bold: true,
        sz: 11,
      },
      alignment: {
        horizontal: "center",
        vertical: "center",
      },
    },
  );

  applyRangeStyle(
    XLSX,
    worksheet,
    "A6:H6",
    {
      fill: {
        fgColor: {
          rgb: COLORS.navy,
        },
      },
      font: {
        color: {
          rgb: COLORS.white,
        },
        bold: true,
        sz: 10.5,
      },
      alignment: {
        horizontal: "center",
        vertical: "center",
        wrapText: true,
      },
      border: {
        top: {
          style: "thin",
          color: {
            rgb: COLORS.border,
          },
        },
        bottom: {
          style: "thin",
          color: {
            rgb: COLORS.border,
          },
        },
        left: {
          style: "thin",
          color: {
            rgb: COLORS.border,
          },
        },
        right: {
          style: "thin",
          color: {
            rgb: COLORS.border,
          },
        },
      },
    },
  );

  const dataStartRow = 6;

  const dataEndRow =
    dataStartRow + detailRows.length - 1;

  for (
    let row = dataStartRow;
    row <= dataEndRow;
    row += 1
  ) {
    for (
      let column = 0;
      column <= 7;
      column += 1
    ) {
      const cell = ensureCell(
        XLSX,
        worksheet,
        row,
        column,
      );

      const isCenteredColumn =
        column === 0 ||
        column === 3 ||
        column === 6 ||
        column === 7;

      cell.s = {
        fill: {
          fgColor: {
            rgb:
              row % 2 === 0
                ? COLORS.lightGray
                : COLORS.white,
          },
        },
        font: {
          color: {
            rgb: COLORS.text,
          },
          bold:
            column === 1 ||
            column === 5,
          sz: 10,
        },
        alignment: {
          horizontal: isCenteredColumn
            ? "center"
            : "left",
          vertical: "center",
          wrapText: true,
        },
        border: {
          top: {
            style: "thin",
            color: {
              rgb: COLORS.lightBorder,
            },
          },
          bottom: {
            style: "thin",
            color: {
              rgb: COLORS.lightBorder,
            },
          },
          left: {
            style: "thin",
            color: {
              rgb: COLORS.lightBorder,
            },
          },
          right: {
            style: "thin",
            color: {
              rgb: COLORS.lightBorder,
            },
          },
        },
      };
    }

    const sourceCell = ensureCell(
      XLSX,
      worksheet,
      row,
      5,
    );

    sourceCell.s = {
      ...(sourceCell.s ?? {}),
      fill: {
        fgColor: {
          rgb: COLORS.lightGreen,
        },
      },
      font: {
        color: {
          rgb: COLORS.darkGreen,
        },
        bold: true,
        sz: 10,
      },
      alignment: {
        horizontal: "center",
        vertical: "center",
        wrapText: true,
      },
    };

    const statusCell = ensureCell(
      XLSX,
      worksheet,
      row,
      6,
    );

    const status = normalizeStatus(
      statusCell.v,
    );

    statusCell.s = {
      ...(statusCell.s ?? {}),
      fill: {
        fgColor: {
          rgb: getStatusFillColor(status),
        },
      },
      font: {
        color: {
          rgb: getStatusFontColor(status),
        },
        bold: true,
        sz: 10,
      },
      alignment: {
        horizontal: "center",
        vertical: "center",
        wrapText: true,
      },
    };

    if (worksheet["!rows"]) {
      worksheet["!rows"][row] = {
        hpt: 30,
      };
    }
  }

  applyTableBorders(
    XLSX,
    worksheet,
    5,
    Math.max(dataEndRow, 5),
    0,
    7,
  );

  return worksheet;
}

export async function generateLeadStatusExcel(
  leads: Lead[],
  monthLabel: string,
): Promise<Blob> {
  const XLSX = await import("xlsx-js-style");
  const workbook = XLSX.utils.book_new();

  const generatedAt = formatGeneratedAt(new Date());

  workbook.Props = {
    Title: `Lead Status Report - ${monthLabel}`,
    Subject: "CRM lead pipeline and status report",
    Author: "Action Auto Utah",
    Company: "Action Auto Utah",
    Category: "CRM Reports",
    Keywords:
      "CRM, leads, lead status, appointments, closed leads",
    Comments:
      "Generated from the Action Auto Utah Reports module.",
    CreatedDate: new Date(),
  };

  const summarySheet = createSummarySheet(
    XLSX,
    leads,
    monthLabel,
    generatedAt,
  );

  const leadDetailsSheet = createLeadDetailsSheet(
    XLSX,
    leads,
    monthLabel,
    generatedAt,
  );

  XLSX.utils.book_append_sheet(
    workbook,
    summarySheet,
    "Summary",
  );

  XLSX.utils.book_append_sheet(
    workbook,
    leadDetailsSheet,
    "Lead Details",
  );

  const output = XLSX.write(workbook, {
    bookType: "xlsx",
    type: "array",
    cellStyles: true,
    compression: true,
  });

  return new Blob([output], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}