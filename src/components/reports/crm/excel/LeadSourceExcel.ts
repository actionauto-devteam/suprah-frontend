import type { Lead } from "@/types/lead";
import type {
  CellObject,
  WorkSheet,
} from "xlsx-js-style";

type ExcelModule = typeof import("xlsx-js-style");

interface LeadSourceDistributionRow {
  rank: number;
  source: string;
  count: number;
  percentage: number;
}

interface LeadSourceSummary {
  totalLeads: number;
  uniqueSources: number;
  topSource: string;
  topSourceLeads: number;
  unknownSources: number;
  sourceCoverage: number;
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

function normalizeSource(value: unknown): string {
  const source = String(value ?? "").trim();

  return source || "Unknown";
}

function normalizeStatus(value: unknown): string {
  const status = String(value ?? "").trim();

  return status || "Unknown";
}

function buildSourceDistribution(
  leads: Lead[],
): LeadSourceDistributionRow[] {
  const counts = new Map<string, number>();

  leads.forEach((lead) => {
    const source = normalizeSource(lead.source);

    counts.set(source, (counts.get(source) ?? 0) + 1);
  });

  return Array.from(counts.entries())
    .sort(([sourceA, countA], [sourceB, countB]) => {
      return countB - countA || sourceA.localeCompare(sourceB);
    })
    .map(([source, count], index) => ({
      rank: index + 1,
      source,
      count,
      percentage: leads.length > 0 ? count / leads.length : 0,
    }));
}

function buildSourceSummary(
  leads: Lead[],
  distribution: LeadSourceDistributionRow[],
): LeadSourceSummary {
  const topSource = distribution[0];

  const unknownSources =
    distribution.find(
      (item) => item.source.toLowerCase() === "unknown",
    )?.count ?? 0;

  const identifiedSources = Math.max(
    leads.length - unknownSources,
    0,
  );

  return {
    totalLeads: leads.length,
    uniqueSources: distribution.length,
    topSource: topSource?.source ?? "—",
    topSourceLeads: topSource?.count ?? 0,
    unknownSources,
    sourceCoverage:
      leads.length > 0 ? identifiedSources / leads.length : 0,
  };
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
      const cell = ensureCell(
        XLSX,
        worksheet,
        row,
        column,
      );

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
      const cell = ensureCell(
        XLSX,
        worksheet,
        row,
        column,
      );

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
  const distribution = buildSourceDistribution(leads);
  const summary = buildSourceSummary(
    leads,
    distribution,
  );

  const distributionRows =
    distribution.length > 0
      ? distribution.map((row) => [
          row.rank,
          row.source,
          row.count,
          row.percentage,
        ])
      : [[1, "No source data available", 0, 0]];

  const worksheet = XLSX.utils.aoa_to_sheet([
    [
      "ACTION AUTO UTAH — LEAD SOURCE REPORT",
      "",
      "",
      "",
    ],
    [monthLabel, "", "", ""],
    [`Generated: ${generatedAt}`, "", "", ""],
    [],
    ["REPORT SUMMARY", "", "", ""],
    ["Metric", "Value", "Metric", "Value"],
    [
      "Total Leads",
      summary.totalLeads,
      "Unique Sources",
      summary.uniqueSources,
    ],
    [
      "Top Source",
      summary.topSource,
      "Top Source Leads",
      summary.topSourceLeads,
    ],
    [
      "Unknown Sources",
      summary.unknownSources,
      "Source Coverage",
      summary.sourceCoverage,
    ],
    [],
    ["SOURCE DISTRIBUTION", "", "", ""],
    [
      "Rank",
      "Lead Source",
      "Lead Count",
      "Percentage",
    ],
    ...distributionRows,
  ]);

  worksheet["!merges"] = [
    {
      s: { r: 0, c: 0 },
      e: { r: 0, c: 3 },
    },
    {
      s: { r: 1, c: 0 },
      e: { r: 1, c: 3 },
    },
    {
      s: { r: 2, c: 0 },
      e: { r: 2, c: 3 },
    },
    {
      s: { r: 4, c: 0 },
      e: { r: 4, c: 3 },
    },
    {
      s: { r: 10, c: 0 },
      e: { r: 10, c: 3 },
    },
  ];

  worksheet["!cols"] = [
    { wch: 18 },
    { wch: 32 },
    { wch: 20 },
    { wch: 18 },
  ];

  worksheet["!rows"] = [
    { hpt: 29 },
    { hpt: 22 },
    { hpt: 18 },
    { hpt: 8 },
    { hpt: 21 },
    { hpt: 21 },
    { hpt: 22 },
    { hpt: 22 },
    { hpt: 22 },
    { hpt: 8 },
    { hpt: 21 },
    { hpt: 22 },
  ];

  worksheet["!freeze"] = {
    xSplit: 0,
    ySplit: 12,
  };

  worksheet["!sheetView"] = [
    {
      showGridLines: false,
    },
  ];

  applyRangeStyle(
    XLSX,
    worksheet,
    "A1:D1",
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
    "A2:D2",
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
    "A3:D3",
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

  for (const range of [
    "A5:D5",
    "A11:D11",
  ]) {
    applyRangeStyle(
      XLSX,
      worksheet,
      range,
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
  }

  for (const range of [
    "A6:D6",
    "A12:D12",
  ]) {
    applyRangeStyle(
      XLSX,
      worksheet,
      range,
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
      },
    );
  }

  for (let row = 6; row <= 8; row += 1) {
    for (let column = 0; column <= 3; column += 1) {
      const cell = ensureCell(
        XLSX,
        worksheet,
        row,
        column,
      );

      const isMetricColumn =
        column === 0 || column === 2;

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
            rgb: isMetricColumn
              ? COLORS.mutedText
              : COLORS.text,
          },
          bold: !isMetricColumn,
          sz: 10.5,
        },
        alignment: {
          horizontal: isMetricColumn
            ? "left"
            : "center",
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
  }

  const coverageCell = ensureCell(
    XLSX,
    worksheet,
    8,
    3,
  );

  coverageCell.z = "0.0%";

  const distributionStartRow = 12;

  const distributionEndRow =
    distributionStartRow +
    distributionRows.length -
    1;

  for (
    let row = distributionStartRow;
    row <= distributionEndRow;
    row += 1
  ) {
    for (
      let column = 0;
      column <= 3;
      column += 1
    ) {
      const cell = ensureCell(
        XLSX,
        worksheet,
        row,
        column,
      );

      cell.s = {
        fill: {
          fgColor: {
            rgb:
              row % 2 === 0
                ? COLORS.lighterGreen
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
            column === 1
              ? "left"
              : "center",
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

    const percentageCell = ensureCell(
      XLSX,
      worksheet,
      row,
      3,
    );

    percentageCell.z = "0.0%";
  }

  worksheet["!autofilter"] = {
    ref: `A12:D${Math.max(
      12,
      distributionEndRow + 1,
    )}`,
  };

  applyTableBorders(
    XLSX,
    worksheet,
    5,
    8,
    0,
    3,
  );

  applyTableBorders(
    XLSX,
    worksheet,
    11,
    Math.max(distributionEndRow, 11),
    0,
    3,
  );

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
      ? sortedLeads.map((lead, index) => {
          const email = safeText(
            lead.email || lead.senderEmail,
          );

          return [
            index + 1,
            formatLeadName(lead),
            email,
            safeText(lead.phone),
            formatVehicle(lead),
            normalizeSource(lead.source),
            normalizeStatus(lead.status),
            formatDate(lead.createdAt),
          ];
        })
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
      "ACTION AUTO UTAH — LEAD SOURCE DETAILS",
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
      "Status",
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
    ref: `A6:H${Math.max(6, detailRows.length + 6)}`,
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

export async function generateLeadSourceExcel(
  leads: Lead[],
  monthLabel: string,
): Promise<Blob> {
  const XLSX = await import("xlsx-js-style");

  const generatedDate = new Date();

  const generatedAt =
    formatGeneratedAt(generatedDate);

  const workbook =
    XLSX.utils.book_new();

  workbook.Props = {
    Title: `Lead Source Report - ${monthLabel}`,
    Subject:
      "CRM lead source performance and detailed lead listing",
    Author: "Action Auto Utah",
    Manager: "Action Auto Utah",
    Company: "Action Auto Utah",
    Category: "CRM Reports",
    Keywords:
      "CRM, leads, lead source, report, analytics",
    Comments:
      "Generated from the Action Auto Utah CRM reporting module.",
    LastAuthor: "Action Auto Utah",
    CreatedDate: generatedDate,
  };

  workbook.Custprops = {
    ReportType: "Lead Source Report",
    ReportingPeriod: monthLabel,
    TotalLeads: leads.length,
    GeneratedAt: generatedDate.toISOString(),
  };

  const summarySheet =
    createSummarySheet(
      XLSX,
      leads,
      monthLabel,
      generatedAt,
    );

  const detailsSheet =
    createLeadDetailsSheet(
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
    detailsSheet,
    "Lead Details",
  );

  if (!workbook.Workbook) {
    workbook.Workbook = {};
  }

  workbook.Workbook.Views = [
    {
      RTL: false,
    },
  ];

  workbook.Workbook.Sheets =
    workbook.SheetNames.map((sheetName) => ({
      name: sheetName,
      Hidden: 0,
    }));

  const workbookArray =
    XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
      compression: true,
      cellStyles: true,
      bookSST: false,
    });

  return new Blob(
    [workbookArray],
    {
      type:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    },
  );
}