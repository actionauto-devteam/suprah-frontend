import {
  PERIOD_LABELS,
  type ReportFilterConfig,
  type ReportFilterState,
  type ReportPeriod,
} from "@/types/report-filters";

export interface ReportFilterChip {
  id: string;
  label: string;
  patch: Partial<ReportFilterState>;
  group:
    | "search"
    | "period"
    | "status"
    | "advanced"
    | "sort";
}

export type ReportColumnPreferences = Record<string, string[]>;

const SAFE_COLUMN_TOKEN = /^[a-zA-Z0-9_-]+$/;

export function parseReportColumnPreferences(
  value: string | null,
): ReportColumnPreferences {
  if (!value) return {};

  const preferences: ReportColumnPreferences = {};

  value.split(";").forEach((sectionEntry) => {
    const [section, rawColumns] = sectionEntry.split(":", 2);
    if (!section || !rawColumns || !SAFE_COLUMN_TOKEN.test(section)) return;

    const columns = rawColumns
      .split("|")
      .map((column) => column.trim())
      .filter((column) => SAFE_COLUMN_TOKEN.test(column));

    if (columns.length > 0) preferences[section] = Array.from(new Set(columns));
  });

  return preferences;
}

export function serializeReportColumnPreferences(
  preferences: ReportColumnPreferences,
): string | undefined {
  const encoded = Object.entries(preferences)
    .filter(([section, columns]) =>
      SAFE_COLUMN_TOKEN.test(section) && columns.length > 0,
    )
    .sort(([first], [second]) => first.localeCompare(second))
    .map(([section, columns]) => {
      const safeColumns = Array.from(new Set(columns))
        .filter((column) => SAFE_COLUMN_TOKEN.test(column))
        .sort();

      return safeColumns.length > 0
        ? `${section}:${safeColumns.join("|")}`
        : "";
    })
    .filter(Boolean)
    .join(";");

  return encoded || undefined;
}

const ARRAY_PARAMS: Array<{
  key: string;
  field:
    | "statuses"
    | "sources"
    | "paymentMethods"
    | "payoutStatuses"
    | "driverIds"
    | "pickupStates"
    | "deliveryStates";
}> = [
  { key: "status", field: "statuses" },
  { key: "source", field: "sources" },
  { key: "method", field: "paymentMethods" },
  { key: "payout", field: "payoutStatuses" },
  { key: "driver", field: "driverIds" },
  { key: "origin", field: "pickupStates" },
  { key: "destination", field: "deliveryStates" },
];

const PERIODS = new Set<ReportPeriod>([
  "all",
  "weekly",
  "bi-weekly",
  "monthly",
  "quarterly",
  "semi-annually",
  "annually",
  "custom",
]);

function splitList(value: string | null): string[] {
  if (!value) return [];

  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function readNumber(value: string | null): number | undefined {
  if (value == null || value.trim() === "") return undefined;

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function setOptional(
  params: URLSearchParams,
  key: string,
  value: string | number | undefined,
): void {
  if (value == null || String(value).trim() === "") {
    params.delete(key);
    return;
  }

  params.set(key, String(value));
}

export function parseReportFilters(
  params: URLSearchParams,
  defaults: ReportFilterState,
): ReportFilterState {
  const periodValue = params.get("period");
  const period = PERIODS.has(periodValue as ReportPeriod)
    ? (periodValue as ReportPeriod)
    : defaults.period;

  const result: ReportFilterState = {
    ...defaults,
    search: params.get("q") ?? defaults.search,
    period,
    referenceDate: params.get("referenceDate") ?? defaults.referenceDate,
    // The report decides its date basis automatically. Ignore legacy
    // dateField query parameters so shared links cannot override it.
    dateField: defaults.dateField,
    dateRange: {
      from: params.get("from") ?? defaults.dateRange.from,
      to: params.get("to") ?? defaults.dateRange.to,
    },
    readStatus:
      (params.get("read") as ReportFilterState["readStatus"] | null) ??
      defaults.readStatus,
    pendingStatus:
      (params.get("pending") as ReportFilterState["pendingStatus"] | null) ??
      defaults.pendingStatus,
    appointmentStatus:
      (params.get("appointment") as
        | ReportFilterState["appointmentStatus"]
        | null) ?? defaults.appointmentStatus,
    minAmount: readNumber(params.get("minAmount")),
    maxAmount: readNumber(params.get("maxAmount")),
    minMiles: readNumber(params.get("minMiles")),
    maxMiles: readNumber(params.get("maxMiles")),
    sortBy: params.get("sortBy") ?? defaults.sortBy,
    sortDirection:
      params.get("direction") === "asc" ? "asc" : defaults.sortDirection,
  };

  ARRAY_PARAMS.forEach(({ key, field }) => {
    result[field] = splitList(params.get(key));
  });

  return result;
}

export function serializeReportFilters(
  filters: ReportFilterState,
  defaults?: ReportFilterState,
): URLSearchParams {
  const params = new URLSearchParams();

  if (!defaults || filters.search !== defaults.search) {
    setOptional(params, "q", filters.search.trim() || undefined);
  }

  if (!defaults || filters.period !== defaults.period) {
    params.set("period", filters.period);
  }

  if (!defaults || filters.referenceDate !== defaults.referenceDate) {
    setOptional(params, "referenceDate", filters.referenceDate);
  } else {
    // Keep the page-level anchor explicit so copied links remain stable.
    setOptional(params, "referenceDate", filters.referenceDate);
  }


  setOptional(params, "from", filters.dateRange.from);
  setOptional(params, "to", filters.dateRange.to);

  ARRAY_PARAMS.forEach(({ key, field }) => {
    const values = filters[field];
    if (values.length > 0) params.set(key, values.join(","));
  });

  if (!defaults || filters.readStatus !== defaults.readStatus) {
    if (filters.readStatus !== "all") params.set("read", filters.readStatus);
  }

  if (!defaults || filters.pendingStatus !== defaults.pendingStatus) {
    if (filters.pendingStatus !== "all") {
      params.set("pending", filters.pendingStatus);
    }
  }

  if (!defaults || filters.appointmentStatus !== defaults.appointmentStatus) {
    if (filters.appointmentStatus !== "all") {
      params.set("appointment", filters.appointmentStatus);
    }
  }

  setOptional(params, "minAmount", filters.minAmount);
  setOptional(params, "maxAmount", filters.maxAmount);
  setOptional(params, "minMiles", filters.minMiles);
  setOptional(params, "maxMiles", filters.maxMiles);

  if (!defaults || filters.sortBy !== defaults.sortBy) {
    setOptional(params, "sortBy", filters.sortBy);
  }

  if (!defaults || filters.sortDirection !== defaults.sortDirection) {
    params.set("direction", filters.sortDirection);
  }

  return params;
}

function optionLabel(
  value: string,
  options: Array<{ label: string; value: string }> | undefined,
): string {
  return options?.find((option) => option.value === value)?.label ?? value;
}

function arrangeOrderLabel(
  sortBy: string | undefined,
  direction: ReportFilterState["sortDirection"],
): string {
  const dateFields = new Set([
    "createdAt",
    "updatedAt",
    "paidAt",
    "assignedAt",
    "pickedUpAt",
    "deliveredAt",
  ]);
  const numberFields = new Set([
    "amount",
    "miles",
    "carrierPayAmount",
    "rate",
    "units",
  ]);

  if (dateFields.has(sortBy ?? "")) {
    return direction === "asc" ? "Oldest first" : "Newest first";
  }

  if (numberFields.has(sortBy ?? "")) {
    return direction === "asc" ? "Lowest first" : "Highest first";
  }

  return direction === "asc" ? "A to Z" : "Z to A";
}

function addArrayChips(
  chips: ReportFilterChip[],
  filters: ReportFilterState,
  field:
    | "statuses"
    | "sources"
    | "paymentMethods"
    | "payoutStatuses"
    | "driverIds"
    | "pickupStates"
    | "deliveryStates",
  label: string,
  options: Array<{ label: string; value: string }> | undefined,
): void {
  filters[field].forEach((value) => {
    chips.push({
      id: `${field}:${value}`,
      label: `${label}: ${optionLabel(value, options)}`,
      patch: {
        [field]: filters[field].filter((item) => item !== value),
      },
      group: field === "statuses" ? "status" : "advanced",
    });
  });
}

export function buildReportFilterChips(
  filters: ReportFilterState,
  defaults: ReportFilterState,
  config: ReportFilterConfig,
): ReportFilterChip[] {
  const chips: ReportFilterChip[] = [];

  if (filters.search.trim()) {
    chips.push({
      id: "search",
      label: `Search: ${filters.search.trim()}`,
      patch: { search: "" },
      group: "search",
    });
  }

  if (
    filters.period !== defaults.period ||
    filters.referenceDate !== defaults.referenceDate ||
    filters.dateRange.from ||
    filters.dateRange.to
  ) {
    const customLabel =
      filters.period === "custom"
        ? `${filters.dateRange.from ?? "Any"} to ${filters.dateRange.to ?? "Any"}`
        : PERIOD_LABELS[filters.period];

    chips.push({
      id: "period",
      label: `Period: ${customLabel}`,
      patch: {
        period: defaults.period,
        referenceDate: defaults.referenceDate,
        dateRange: { ...defaults.dateRange },
      },
      group: "period",
    });
  }


  addArrayChips(
    chips,
    filters,
    "statuses",
    config.status?.label ?? "Status",
    config.status?.options,
  );
  addArrayChips(
    chips,
    filters,
    "sources",
    config.source?.label ?? "Source",
    config.source?.options,
  );
  addArrayChips(
    chips,
    filters,
    "paymentMethods",
    "Payment Method",
    config.paymentMethod?.options,
  );
  addArrayChips(
    chips,
    filters,
    "payoutStatuses",
    "Payout Status",
    config.payoutStatus?.options,
  );
  addArrayChips(
    chips,
    filters,
    "driverIds",
    "Driver",
    config.driver?.options,
  );
  addArrayChips(
    chips,
    filters,
    "pickupStates",
    "Origin",
    config.route?.pickupStateOptions,
  );
  addArrayChips(
    chips,
    filters,
    "deliveryStates",
    "Destination",
    config.route?.deliveryStateOptions,
  );

  if (filters.readStatus !== defaults.readStatus) {
    chips.push({
      id: "readStatus",
      label: filters.readStatus === "read" ? "Read" : "Unread",
      patch: { readStatus: defaults.readStatus },
      group: "advanced",
    });
  }

  if (filters.pendingStatus !== defaults.pendingStatus) {
    chips.push({
      id: "pendingStatus",
      label:
        filters.pendingStatus === "pending"
          ? "Pending Reply"
          : "Not Pending",
      patch: { pendingStatus: defaults.pendingStatus },
      group: "advanced",
    });
  }

  if (filters.appointmentStatus !== defaults.appointmentStatus) {
    chips.push({
      id: "appointmentStatus",
      label:
        filters.appointmentStatus === "has-appointment"
          ? "Has Appointment"
          : "No Appointment",
      patch: { appointmentStatus: defaults.appointmentStatus },
      group: "advanced",
    });
  }

  if (filters.minAmount != null || filters.maxAmount != null) {
    chips.push({
      id: "amount",
      label: `Amount: ${filters.minAmount ?? 0}–${filters.maxAmount ?? "Any"}`,
      patch: { minAmount: undefined, maxAmount: undefined },
      group: "advanced",
    });
  }

  if (filters.minMiles != null || filters.maxMiles != null) {
    chips.push({
      id: "miles",
      label: `Miles: ${filters.minMiles ?? 0}–${filters.maxMiles ?? "Any"}`,
      patch: { minMiles: undefined, maxMiles: undefined },
      group: "advanced",
    });
  }

  if (
    filters.sortBy !== defaults.sortBy ||
    filters.sortDirection !== defaults.sortDirection
  ) {
    const sortLabel = optionLabel(
      filters.sortBy ?? "createdAt",
      config.sort?.options,
    );
    const orderLabel = arrangeOrderLabel(
      filters.sortBy,
      filters.sortDirection,
    );
    chips.push({
      id: "sort",
      label: `Arranged by: ${sortLabel} • ${orderLabel}`,
      patch: {
        sortBy: defaults.sortBy,
        sortDirection: defaults.sortDirection,
      },
      group: "sort",
    });
  }

  return chips;
}

export function buildExportContextLabel(
  periodLabel: string,
  chips: ReportFilterChip[],
  recordCount?: number,
): string {
  const relevantChips = chips.filter(
    (chip) => chip.group !== "sort" && chip.group !== "period",
  );
  const relevant = relevantChips.slice(0, 2).map((chip) => chip.label);
  const parts = [periodLabel];

  if (recordCount != null) {
    parts.push(`${recordCount.toLocaleString()} records`);
  }

  parts.push(...relevant);

  const remaining = Math.max(0, relevantChips.length - relevant.length);
  if (remaining > 0) parts.push(`+${remaining} more`);

  // Existing report generators render this value in a single header line.
  // Keep it concise while still preserving the period, record count, and
  // the most important active filters in downloaded files.
  return parts.join(" • ").slice(0, 78);
}

export function buildFilenameFilterSuffix(chips: ReportFilterChip[]): string {
  const values = chips
    .filter((chip) => chip.group !== "sort" && chip.group !== "period")
    .slice(0, 2)
    .map((chip) => chip.label.replace(/^[^:]+:\s*/, ""));

  if (values.length === 0) return "";

  const safe = values
    .join("_")
    .replace(/[^a-zA-Z0-9_-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 48);

  return safe ? `_${safe}` : "";
}