export type ReportId =
  | "load-report"
  | "quote-report"
  | "lead-status-report"
  | "lead-source-report"
  | "driver-report"
  | "billing-report";

export type ReportPeriod =
  | "all"
  | "weekly"
  | "bi-weekly"
  | "monthly"
  | "quarterly"
  | "semi-annually"
  | "annually"
  | "custom";

export type ReportDateField =
  | "createdAt"
  | "updatedAt"
  | "paidAt"
  | "assignedAt"
  | "pickedUpAt"
  | "deliveredAt";

export type ReportSortDirection = "asc" | "desc";
export type ReportReadStatus = "all" | "read" | "unread";
export type ReportPendingStatus = "all" | "pending" | "not-pending";
export type ReportAppointmentStatus =
  | "all"
  | "has-appointment"
  | "no-appointment";

export interface ReportDateRange {
  /**
   * YYYY-MM-DD values from native date inputs.
   */
  from?: string;
  to?: string;
}

export interface ReportFilterState {
  search: string;

  period: ReportPeriod;
  referenceDate: string;
  dateField: ReportDateField;
  dateRange: ReportDateRange;

  statuses: string[];
  sources: string[];
  paymentMethods: string[];
  payoutStatuses: string[];
  driverIds: string[];

  pickupStates: string[];
  deliveryStates: string[];

  readStatus: ReportReadStatus;
  pendingStatus: ReportPendingStatus;
  appointmentStatus: ReportAppointmentStatus;

  minAmount?: number;
  maxAmount?: number;

  minMiles?: number;
  maxMiles?: number;

  sortBy?: string;
  sortDirection: ReportSortDirection;
}

export interface ReportFilterOption {
  label: string;
  value: string;
}

export interface ReportFilterConfig {
  reportId: ReportId;

  search?: {
    enabled: boolean;
    placeholder?: string;
  };

  period?: {
    enabled: boolean;
    options?: ReportPeriod[];
  };

  /**
   * Controls period and custom-range filtering. The date field is selected
   * automatically per report and is not presented as a user-facing control.
   */
  dateRange?: {
    enabled: boolean;
    fields?: ReportDateField[];
    defaultField?: ReportDateField;
  };

  status?: {
    enabled: boolean;
    label?: string;
    options?: ReportFilterOption[];
  };

  source?: {
    enabled: boolean;
    label?: string;
    options?: ReportFilterOption[];
  };

  paymentMethod?: {
    enabled: boolean;
    options?: ReportFilterOption[];
  };

  payoutStatus?: {
    enabled: boolean;
    options?: ReportFilterOption[];
  };

  driver?: {
    enabled: boolean;
    options?: ReportFilterOption[];
  };

  route?: {
    enabled: boolean;
    pickupStateOptions?: ReportFilterOption[];
    deliveryStateOptions?: ReportFilterOption[];
  };

  readStatus?: {
    enabled: boolean;
  };

  pendingStatus?: {
    enabled: boolean;
  };

  appointmentStatus?: {
    enabled: boolean;
  };

  amountRange?: {
    enabled: boolean;
    label?: string;
    minimumLabel?: string;
    maximumLabel?: string;
  };

  mileageRange?: {
    enabled: boolean;
    minimumLabel?: string;
    maximumLabel?: string;
  };

  sort?: {
    enabled: boolean;
    options?: ReportFilterOption[];
    defaultSortBy?: string;
  };
}

export interface DynamicReportFilterOptions {
  drivers?: ReportFilterOption[];
  pickupStates?: ReportFilterOption[];
  deliveryStates?: ReportFilterOption[];
  leadSources?: ReportFilterOption[];
  paymentMethods?: ReportFilterOption[];
}

export const REPORT_LABELS: Record<ReportId, string> = {
  "load-report": "Unified Load Report",
  "quote-report": "Quotes & Drafts",
  "lead-status-report": "Lead Status Report",
  "lead-source-report": "Lead Source Report",
  "driver-report": "Driver Performance",
  "billing-report": "Billings & Revenue",
};

export const PERIOD_LABELS: Record<ReportPeriod, string> = {
  all: "All Time",
  weekly: "Weekly",
  "bi-weekly": "Bi-weekly",
  monthly: "Monthly",
  quarterly: "Quarterly",
  "semi-annually": "Semi-annually",
  annually: "Annually",
  custom: "Custom Range",
};

export const DATE_FIELD_LABELS: Record<ReportDateField, string> = {
  createdAt: "Created Date",
  updatedAt: "Updated Date",
  paidAt: "Paid Date",
  assignedAt: "Assigned Date",
  pickedUpAt: "Picked Up Date",
  deliveredAt: "Delivered Date",
};

export const ALL_REPORT_PERIODS: ReportPeriod[] = [
  "all",
  "weekly",
  "bi-weekly",
  "monthly",
  "quarterly",
  "semi-annually",
  "annually",
  "custom",
];

const LOAD_STATUS_OPTIONS: ReportFilterOption[] = [
  { label: "Draft", value: "Draft" },
  { label: "Posted", value: "Posted" },
  { label: "Assigned", value: "Assigned" },
  { label: "Accepted", value: "Accepted" },
  { label: "Picked Up", value: "Picked Up" },
  { label: "In Transit", value: "In-Transit" },
  { label: "Delivered", value: "Delivered" },
  { label: "Cancelled", value: "Cancelled" },
];

const QUOTE_STATUS_OPTIONS: ReportFilterOption[] = [
  { label: "Pending", value: "pending" },
  { label: "Accepted", value: "accepted" },
  { label: "Booked", value: "booked" },
  { label: "Rejected", value: "rejected" },
];

const LEAD_STATUS_OPTIONS: ReportFilterOption[] = [
  { label: "New", value: "New" },
  { label: "Contacted", value: "Contacted" },
  { label: "Pending", value: "Pending" },
  { label: "Appointment Set", value: "Appointment Set" },
  { label: "Closed", value: "Closed" },
];

const PAYMENT_STATUS_OPTIONS: ReportFilterOption[] = [
  { label: "Pending", value: "pending" },
  { label: "Processing", value: "processing" },
  { label: "Succeeded", value: "succeeded" },
  { label: "Failed", value: "failed" },
  { label: "Refunded", value: "refunded" },
  { label: "Cancelled", value: "cancelled" },
];

const PAYMENT_SOURCE_OPTIONS: ReportFilterOption[] = [
  { label: "Manual", value: "manual" },
  { label: "Aftermarket", value: "aftermarket" },
];

const PAYOUT_STATUS_OPTIONS: ReportFilterOption[] = [
  { label: "Pending", value: "pending" },
  { label: "Processing", value: "processing" },
  { label: "Paid", value: "paid" },
  { label: "Failed", value: "failed" },
];

const STATIC_REPORT_FILTER_CONFIGS: Record<
  ReportId,
  ReportFilterConfig
> = {
  "load-report": {
    reportId: "load-report",
    search: {
      enabled: true,
      placeholder:
        "Search load, customer, driver, vehicle, VIN, or location",
    },
    period: {
      enabled: true,
      options: ALL_REPORT_PERIODS,
    },
    dateRange: {
      enabled: true,
      fields: [
        "createdAt",
        "updatedAt",
        "assignedAt",
        "pickedUpAt",
        "deliveredAt",
      ],
      defaultField: "createdAt",
    },
    status: {
      enabled: true,
      label: "Load Status",
      options: LOAD_STATUS_OPTIONS,
    },
    driver: {
      enabled: true,
      options: [],
    },
    route: {
      enabled: true,
      pickupStateOptions: [],
      deliveryStateOptions: [],
    },
    amountRange: {
      enabled: true,
      label: "Load Rate",
      minimumLabel: "Minimum load rate",
      maximumLabel: "Maximum load rate",
    },
    mileageRange: {
      enabled: true,
      minimumLabel: "Minimum miles",
      maximumLabel: "Maximum miles",
    },
    sort: {
      enabled: true,
      defaultSortBy: "createdAt",
      options: [
        { label: "Created Date", value: "createdAt" },
        { label: "Updated Date", value: "updatedAt" },
        { label: "Load Number", value: "loadNumber" },
        { label: "Status", value: "status" },
        { label: "Mileage", value: "miles" },
        { label: "Load Rate", value: "carrierPayAmount" },
        { label: "Driver Name", value: "driverName" },
      ],
    },
  },

  "quote-report": {
    reportId: "quote-report",
    search: {
      enabled: true,
      placeholder:
        "Search customer, contact, vehicle, VIN, stock, or route",
    },
    period: {
      enabled: true,
      options: ALL_REPORT_PERIODS,
    },
    dateRange: {
      enabled: true,
      fields: ["createdAt"],
      defaultField: "createdAt",
    },
    status: {
      enabled: true,
      label: "Quote Status",
      options: QUOTE_STATUS_OPTIONS,
    },
    amountRange: {
      enabled: true,
      label: "Quote Rate",
      minimumLabel: "Minimum rate",
      maximumLabel: "Maximum rate",
    },
    mileageRange: {
      enabled: true,
      minimumLabel: "Minimum miles",
      maximumLabel: "Maximum miles",
    },
    sort: {
      enabled: true,
      defaultSortBy: "createdAt",
      options: [
        { label: "Created Date", value: "createdAt" },
        { label: "Customer Name", value: "customerName" },
        { label: "Status", value: "status" },
        { label: "Rate", value: "rate" },
        { label: "Mileage", value: "miles" },
        { label: "Units", value: "units" },
      ],
    },
  },

  "lead-status-report": {
    reportId: "lead-status-report",
    search: {
      enabled: true,
      placeholder:
        "Search customer, contact, source, subject, or vehicle",
    },
    period: {
      enabled: true,
      options: ALL_REPORT_PERIODS,
    },
    dateRange: {
      enabled: true,
      fields: ["createdAt", "updatedAt"],
      defaultField: "createdAt",
    },
    status: {
      enabled: true,
      label: "Lead Status",
      options: LEAD_STATUS_OPTIONS,
    },
    source: {
      enabled: true,
      label: "Lead Source",
      options: [],
    },
    readStatus: {
      enabled: true,
    },
    pendingStatus: {
      enabled: true,
    },
    appointmentStatus: {
      enabled: true,
    },
    sort: {
      enabled: true,
      defaultSortBy: "createdAt",
      options: [
        { label: "Created Date", value: "createdAt" },
        { label: "Updated Date", value: "updatedAt" },
        { label: "Customer Name", value: "customerName" },
        { label: "Status", value: "status" },
        { label: "Source", value: "source" },
        { label: "Vehicle Make", value: "vehicleMake" },
        { label: "Vehicle Model", value: "vehicleModel" },
      ],
    },
  },

  "lead-source-report": {
    reportId: "lead-source-report",
    search: {
      enabled: true,
      placeholder:
        "Search customer, contact, source, subject, or vehicle",
    },
    period: {
      enabled: true,
      options: ALL_REPORT_PERIODS,
    },
    dateRange: {
      enabled: true,
      fields: ["createdAt", "updatedAt"],
      defaultField: "createdAt",
    },
    status: {
      enabled: true,
      label: "Lead Status",
      options: LEAD_STATUS_OPTIONS,
    },
    source: {
      enabled: true,
      label: "Lead Source",
      options: [],
    },
    sort: {
      enabled: true,
      defaultSortBy: "createdAt",
      options: [
        { label: "Created Date", value: "createdAt" },
        { label: "Updated Date", value: "updatedAt" },
        { label: "Customer Name", value: "customerName" },
        { label: "Source", value: "source" },
        { label: "Status", value: "status" },
      ],
    },
  },

  "driver-report": {
    reportId: "driver-report",
    search: {
      enabled: true,
      placeholder:
        "Search driver, load, customer, vehicle, or route",
    },
    period: {
      enabled: true,
      options: ALL_REPORT_PERIODS,
    },
    dateRange: {
      enabled: true,
      fields: [
        "createdAt",
        "updatedAt",
        "assignedAt",
        "pickedUpAt",
        "deliveredAt",
      ],
      // Driver activity is grouped by completed delivery date. Loads without
      // a delivery date and payouts without a paid date fall back to createdAt.
      defaultField: "deliveredAt",
    },
    status: {
      enabled: true,
      label: "Load Status",
      options: LOAD_STATUS_OPTIONS,
    },
    driver: {
      enabled: true,
      options: [],
    },
    route: {
      enabled: true,
      pickupStateOptions: [],
      deliveryStateOptions: [],
    },
    mileageRange: {
      enabled: true,
      minimumLabel: "Minimum miles",
      maximumLabel: "Maximum miles",
    },
    sort: {
      enabled: true,
      defaultSortBy: "createdAt",
      options: [
        { label: "Created Date", value: "createdAt" },
        { label: "Delivered Date", value: "deliveredAt" },
        { label: "Driver Name", value: "driverName" },
        { label: "Load Number", value: "loadNumber" },
        { label: "Status", value: "status" },
        { label: "Mileage", value: "miles" },
      ],
    },
  },

  "billing-report": {
    reportId: "billing-report",
    search: {
      enabled: true,
      placeholder:
        "Search customer, driver, invoice, payout, or description",
    },
    period: {
      enabled: true,
      options: ALL_REPORT_PERIODS,
    },
    dateRange: {
      enabled: true,
      fields: ["createdAt", "updatedAt", "paidAt"],
      // Financial activity is grouped by paid date when available. Pending or
      // unpaid records fall back to createdAt so they remain visible.
      defaultField: "paidAt",
    },
    status: {
      enabled: true,
      label: "Payment Status",
      options: PAYMENT_STATUS_OPTIONS,
    },
    source: {
      enabled: true,
      label: "Payment Source",
      options: PAYMENT_SOURCE_OPTIONS,
    },
    paymentMethod: {
      enabled: true,
      options: [],
    },
    payoutStatus: {
      enabled: true,
      options: PAYOUT_STATUS_OPTIONS,
    },
    driver: {
      enabled: true,
      options: [],
    },
    amountRange: {
      enabled: true,
      label: "Amount",
      minimumLabel: "Minimum amount",
      maximumLabel: "Maximum amount",
    },
    sort: {
      enabled: true,
      defaultSortBy: "createdAt",
      options: [
        { label: "Created Date", value: "createdAt" },
        { label: "Updated Date", value: "updatedAt" },
        { label: "Paid Date", value: "paidAt" },
        { label: "Amount", value: "amount" },
        { label: "Customer / Driver", value: "name" },
        { label: "Status", value: "status" },
      ],
    },
  },
};

function formatDateInput(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function createDefaultReportFilterState(
  reportId: ReportId,
  referenceDate: Date = new Date(),
): ReportFilterState {
  const config = STATIC_REPORT_FILTER_CONFIGS[reportId];

  return {
    search: "",
    period: "monthly",
    referenceDate: formatDateInput(referenceDate),
    dateField: config.dateRange?.defaultField ?? "createdAt",
    dateRange: {
      from: undefined,
      to: undefined,
    },

    statuses: [],
    sources: [],
    paymentMethods: [],
    payoutStatuses: [],
    driverIds: [],

    pickupStates: [],
    deliveryStates: [],

    readStatus: "all",
    pendingStatus: "all",
    appointmentStatus: "all",

    minAmount: undefined,
    maxAmount: undefined,

    minMiles: undefined,
    maxMiles: undefined,

    sortBy: config.sort?.defaultSortBy,
    sortDirection: "desc",
  };
}

/**
 * Backward-compatible default used by older report components.
 * New code should prefer createDefaultReportFilterState(reportId).
 */
export const DEFAULT_REPORT_FILTER_STATE: ReportFilterState =
  createDefaultReportFilterState("billing-report");

export function createDefaultFiltersByReport(
  referenceDate: Date = new Date(),
): Record<ReportId, ReportFilterState> {
  return {
    "load-report": createDefaultReportFilterState(
      "load-report",
      referenceDate,
    ),
    "quote-report": createDefaultReportFilterState(
      "quote-report",
      referenceDate,
    ),
    "lead-status-report": createDefaultReportFilterState(
      "lead-status-report",
      referenceDate,
    ),
    "lead-source-report": createDefaultReportFilterState(
      "lead-source-report",
      referenceDate,
    ),
    "driver-report": createDefaultReportFilterState(
      "driver-report",
      referenceDate,
    ),
    "billing-report": createDefaultReportFilterState(
      "billing-report",
      referenceDate,
    ),
  };
}

export function getReportFilterConfig(
  reportId: ReportId,
  dynamic: DynamicReportFilterOptions = {},
): ReportFilterConfig {
  const config = STATIC_REPORT_FILTER_CONFIGS[reportId];

  return {
    ...config,
    source: config.source
      ? {
          ...config.source,
          options:
            reportId === "billing-report"
              ? config.source.options
              : dynamic.leadSources ?? config.source.options,
        }
      : undefined,
    paymentMethod: config.paymentMethod
      ? {
          ...config.paymentMethod,
          options:
            dynamic.paymentMethods ?? config.paymentMethod.options,
        }
      : undefined,
    driver: config.driver
      ? {
          ...config.driver,
          options: dynamic.drivers ?? config.driver.options,
        }
      : undefined,
    route: config.route
      ? {
          ...config.route,
          pickupStateOptions:
            dynamic.pickupStates ??
            config.route.pickupStateOptions,
          deliveryStateOptions:
            dynamic.deliveryStates ??
            config.route.deliveryStateOptions,
        }
      : undefined,
  };
}

export const REPORT_IDS: ReportId[] = [
  "load-report",
  "quote-report",
  "lead-status-report",
  "lead-source-report",
  "driver-report",
  "billing-report",
];

export function isReportId(value: string): value is ReportId {
  return REPORT_IDS.includes(value as ReportId);
}