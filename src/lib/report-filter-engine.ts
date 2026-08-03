import type { Lead } from "@/types/lead";
import type { Payment } from "@/types/billing";
import type { DriverPayout } from "@/types/driver-payout";
import type { Load } from "@/types/load";
import type { Quote } from "@/types/transportation";
import type {
  ReportDateField,
  ReportFilterState,
  ReportSortDirection,
} from "@/types/report-filters";

interface ResolvedDateRange {
  from?: Date;
  to?: Date;
}

type SortableValue = string | number | Date | undefined | null;

/**
 * Returns the rate used by the Unified Load Report.
 *
 * Some older or automatically priced loads do not have a manually entered
 * carrierPayAmount, but they do have an estimatedRate. The report must use the
 * same resolved value for filtering, sorting, summaries, tables, and exports.
 */
export function getLoadReportRate(load: Load): number {
  const carrierPay = Number(load.pricing?.carrierPayAmount);

  if (Number.isFinite(carrierPay) && carrierPay > 0) {
    return carrierPay;
  }

  const estimatedRate = Number(load.pricing?.estimatedRate);

  return Number.isFinite(estimatedRate) && estimatedRate > 0
    ? estimatedRate
    : 0;
}

function parseDateOnly(value?: string): Date | undefined {
  if (!value) return undefined;

  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]) - 1;
    const day = Number(match[3]);
    const date = new Date(year, month, day);

    return Number.isNaN(date.getTime()) ? undefined : date;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? undefined : date;
}

function startOfDay(value: Date): Date {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

function endOfDay(value: Date): Date {
  const date = new Date(value);
  date.setHours(23, 59, 59, 999);
  return date;
}

function addDays(value: Date, days: number): Date {
  const date = new Date(value);
  date.setDate(date.getDate() + days);
  return date;
}

function startOfWeek(value: Date): Date {
  const date = startOfDay(value);
  const day = date.getDay();
  const differenceFromMonday = day === 0 ? -6 : 1 - day;

  date.setDate(date.getDate() + differenceFromMonday);

  return date;
}

export function resolveReportPeriodRange(
  filters: ReportFilterState,
): ResolvedDateRange {
  if (filters.period === "all") {
    return {};
  }

  if (filters.period === "custom") {
    const customFrom = parseDateOnly(filters.dateRange.from);
    const customTo = parseDateOnly(filters.dateRange.to);

    return {
      from: customFrom ? startOfDay(customFrom) : undefined,
      to: customTo ? endOfDay(customTo) : undefined,
    };
  }

  const reference =
    parseDateOnly(filters.referenceDate) ?? startOfDay(new Date());
  const year = reference.getFullYear();
  const month = reference.getMonth();

  switch (filters.period) {
    case "weekly": {
      const from = startOfWeek(reference);

      return {
        from,
        to: endOfDay(addDays(from, 6)),
      };
    }

    case "bi-weekly": {
      const from = startOfWeek(reference);

      return {
        from,
        to: endOfDay(addDays(from, 13)),
      };
    }

    case "monthly":
      return {
        from: new Date(year, month, 1),
        to: endOfDay(new Date(year, month + 1, 0)),
      };

    case "quarterly": {
      const quarterStartMonth = Math.floor(month / 3) * 3;

      return {
        from: new Date(year, quarterStartMonth, 1),
        to: endOfDay(
          new Date(year, quarterStartMonth + 3, 0),
        ),
      };
    }

    case "semi-annually": {
      const halfStartMonth = month < 6 ? 0 : 6;

      return {
        from: new Date(year, halfStartMonth, 1),
        to: endOfDay(new Date(year, halfStartMonth + 6, 0)),
      };
    }

    case "annually":
      return {
        from: new Date(year, 0, 1),
        to: endOfDay(new Date(year, 11, 31)),
      };

    default:
      return {};
  }
}

export function isDateInRange(
  value: Date | string | undefined,
  filters: ReportFilterState,
): boolean {
  const { from, to } = resolveReportPeriodRange(filters);
  const hasActiveRange = Boolean(from || to);

  if (!hasActiveRange) {
    return true;
  }

  if (!value) {
    return false;
  }

  const current =
    value instanceof Date ? new Date(value) : new Date(value);

  if (Number.isNaN(current.getTime())) {
    return false;
  }

  if (from && current < from) {
    return false;
  }

  if (to && current > to) {
    return false;
  }

  return true;
}

export function isNumberInRange(
  value: number | undefined,
  min?: number,
  max?: number,
): boolean {
  const hasActiveRange = min != null || max != null;

  if (!hasActiveRange) {
    return true;
  }

  if (value == null || Number.isNaN(value)) {
    return false;
  }

  if (min != null && value < min) {
    return false;
  }

  if (max != null && value > max) {
    return false;
  }

  return true;
}

export function containsSearch(
  search: string,
  values: Array<string | number | undefined | null>,
): boolean {
  const keyword = search.trim().toLowerCase();

  if (!keyword) {
    return true;
  }

  return values.some((value) =>
    String(value ?? "")
      .toLowerCase()
      .includes(keyword),
  );
}

export function matchesSelection(
  value: string | undefined,
  selected: string[],
): boolean {
  if (selected.length === 0) {
    return true;
  }

  const normalizedValue = String(value ?? "").toLowerCase();

  return selected.some(
    (item) => item.toLowerCase() === normalizedValue,
  );
}

function normalizeSortValue(value: SortableValue): string | number {
  if (value instanceof Date) {
    return value.getTime();
  }

  if (typeof value === "number") {
    return Number.isFinite(value)
      ? value
      : Number.NEGATIVE_INFINITY;
  }

  if (value == null) {
    return "";
  }

  const date = new Date(String(value));

  if (
    /^\d{4}-\d{2}-\d{2}/.test(String(value)) &&
    !Number.isNaN(date.getTime())
  ) {
    return date.getTime();
  }

  return String(value).toLowerCase();
}

function compareValues(
  first: SortableValue,
  second: SortableValue,
  direction: ReportSortDirection,
): number {
  const left = normalizeSortValue(first);
  const right = normalizeSortValue(second);
  let result = 0;

  if (typeof left === "number" && typeof right === "number") {
    result = left - right;
  } else {
    result = String(left).localeCompare(String(right), undefined, {
      numeric: true,
      sensitivity: "base",
    });
  }

  return direction === "asc" ? result : -result;
}

function sortRecords<T>(
  records: T[],
  direction: ReportSortDirection,
  getValue: (record: T) => SortableValue,
): T[] {
  return [...records].sort((first, second) =>
    compareValues(
      getValue(first),
      getValue(second),
      direction,
    ),
  );
}

function getAssignedDriverId(load: Load): string | undefined {
  if (!load.assignedDriverId) {
    return undefined;
  }

  return typeof load.assignedDriverId === "string"
    ? load.assignedDriverId
    : load.assignedDriverId._id;
}

function getAssignedDriverName(load: Load): string {
  if (!load.assignedDriverId) {
    return "";
  }

  return typeof load.assignedDriverId === "string"
    ? load.assignedDriverId
    : load.assignedDriverId.name ??
        load.assignedDriverId.email ??
        "";
}

function getPayoutDriverId(
  payout: DriverPayout,
): string | undefined {
  return typeof payout.driverId === "string"
    ? payout.driverId
    : payout.driverId?._id;
}

function getPayoutLoadText(payout: DriverPayout): string {
  if (typeof payout.loadId === "string") {
    return payout.loadId;
  }

  return [
    payout.loadId?._id,
    payout.loadId?.loadNumber,
    payout.loadId?.trackingNumber,
    payout.loadId?.origin,
    payout.loadId?.destination,
  ]
    .filter(Boolean)
    .join(" ");
}

/**
 * Resolves the report date automatically while keeping older records visible.
 * A business milestone date is preferred, then createdAt is used as a safe
 * fallback when that milestone has not happened yet.
 */
function getLoadDate(
  load: Load,
  field: ReportDateField,
): string | undefined {
  switch (field) {
    case "updatedAt":
      return load.updatedAt ?? load.createdAt;
    case "assignedAt":
      return load.assignedAt ?? load.createdAt;
    case "pickedUpAt":
      return load.pickedUpAt ?? load.createdAt;
    case "deliveredAt":
      return load.deliveredAt ?? load.createdAt;
    case "createdAt":
    default:
      return load.createdAt;
  }
}

function getLeadDate(
  lead: Lead,
  field: ReportDateField,
): string | undefined {
  return field === "updatedAt"
    ? lead.updatedAt ?? lead.createdAt
    : lead.createdAt;
}

function getPaymentDate(
  payment: Payment,
  field: ReportDateField,
): string | undefined {
  switch (field) {
    case "updatedAt":
      return payment.updatedAt ?? payment.createdAt;
    case "paidAt":
      return payment.paidAt ?? payment.createdAt;
    case "createdAt":
    default:
      return payment.createdAt;
  }
}

function getPayoutDate(
  payout: DriverPayout,
  field: ReportDateField,
): string | undefined {
  switch (field) {
    case "updatedAt":
      return payout.updatedAt ?? payout.createdAt;
    case "paidAt":
      return payout.paidAt ?? payout.createdAt;
    case "deliveredAt":
      // Driver Performance uses deliveredAt for load activity. For its payout
      // records, the equivalent business milestone is paidAt.
      return payout.paidAt ?? payout.createdAt;
    case "createdAt":
    default:
      return payout.createdAt;
  }
}

function getLoadSortValue(
  load: Load,
  sortBy?: string,
): SortableValue {
  switch (sortBy) {
    case "updatedAt":
      return load.updatedAt;
    case "deliveredAt":
      return load.deliveredAt;
    case "loadNumber":
      return load.loadNumber;
    case "status":
      return load.status;
    case "miles":
      return load.pricing?.miles;
    case "carrierPayAmount":
      return getLoadReportRate(load);
    case "driverName":
      return getAssignedDriverName(load);
    default:
      return load.createdAt;
  }
}

function getQuoteSortValue(
  quote: Quote,
  sortBy?: string,
): SortableValue {
  switch (sortBy) {
    case "customerName":
      return `${quote.firstName} ${quote.lastName}`.trim();
    case "status":
      return quote.status;
    case "rate":
      return quote.rate;
    case "miles":
      return quote.miles;
    case "units":
      return quote.units;
    default:
      return quote.createdAt;
  }
}

function getLeadSortValue(
  lead: Lead,
  sortBy?: string,
): SortableValue {
  switch (sortBy) {
    case "updatedAt":
      return lead.updatedAt;
    case "customerName":
      return `${lead.firstName} ${lead.lastName}`.trim();
    case "status":
      return lead.status;
    case "source":
      return lead.source;
    case "vehicleMake":
      return lead.vehicle?.make;
    case "vehicleModel":
      return lead.vehicle?.model;
    default:
      return lead.createdAt;
  }
}

function getPaymentSortValue(
  payment: Payment,
  sortBy?: string,
): SortableValue {
  switch (sortBy) {
    case "updatedAt":
      return payment.updatedAt;
    case "paidAt":
      return payment.paidAt;
    case "amount":
      return payment.amount;
    case "name":
      return payment.customerName;
    case "status":
      return payment.status;
    default:
      return payment.createdAt;
  }
}

function getPayoutSortValue(
  payout: DriverPayout,
  sortBy?: string,
): SortableValue {
  switch (sortBy) {
    case "updatedAt":
      return payout.updatedAt;
    case "paidAt":
      return payout.paidAt;
    case "amount":
      return payout.amount;
    case "name":
    case "driverName":
      return payout.driverName;
    case "status":
      return payout.status;
    default:
      return payout.createdAt;
  }
}

export function filterLoads(
  loads: Load[],
  filters: ReportFilterState,
): Load[] {
  const filtered = loads.filter((load) => {
    const vehicleSearchValues = load.vehicles.flatMap(
      (vehicle) => [
        vehicle.year,
        vehicle.make,
        vehicle.model,
        vehicle.vin,
        vehicle.vehicleType,
        vehicle.lotNumber,
        vehicle.licensePlate,
      ],
    );

    if (
      !containsSearch(filters.search, [
        load.loadNumber,
        load.status,
        load.trailerType,
        load.pickupLocation.companyName,
        load.pickupLocation.contactName,
        load.pickupLocation.firstName,
        load.pickupLocation.lastName,
        load.pickupLocation.email,
        load.pickupLocation.phone,
        load.pickupLocation.city,
        load.pickupLocation.state,
        load.pickupLocation.zip,
        load.deliveryLocation.companyName,
        load.deliveryLocation.contactName,
        load.deliveryLocation.firstName,
        load.deliveryLocation.lastName,
        load.deliveryLocation.email,
        load.deliveryLocation.phone,
        load.deliveryLocation.city,
        load.deliveryLocation.state,
        load.deliveryLocation.zip,
        getAssignedDriverName(load),
        ...vehicleSearchValues,
      ])
    ) {
      return false;
    }

    if (!matchesSelection(load.status, filters.statuses)) {
      return false;
    }

    if (
      !matchesSelection(
        getAssignedDriverId(load),
        filters.driverIds,
      )
    ) {
      return false;
    }

    if (
      !matchesSelection(
        load.pickupLocation?.state,
        filters.pickupStates,
      )
    ) {
      return false;
    }

    if (
      !matchesSelection(
        load.deliveryLocation?.state,
        filters.deliveryStates,
      )
    ) {
      return false;
    }

    if (
      !isNumberInRange(
        getLoadReportRate(load),
        filters.minAmount,
        filters.maxAmount,
      )
    ) {
      return false;
    }

    if (
      !isNumberInRange(
        load.pricing?.miles,
        filters.minMiles,
        filters.maxMiles,
      )
    ) {
      return false;
    }

    if (
      !isDateInRange(
        getLoadDate(load, filters.dateField),
        filters,
      )
    ) {
      return false;
    }

    return true;
  });

  return sortRecords(
    filtered,
    filters.sortDirection,
    (load) => getLoadSortValue(load, filters.sortBy),
  );
}

export function filterQuotes(
  quotes: Quote[],
  filters: ReportFilterState,
): Quote[] {
  const filtered = quotes.filter((quote) => {
    if (
      !containsSearch(filters.search, [
        quote.firstName,
        quote.lastName,
        quote.email,
        quote.phone,
        quote.vehicleName,
        quote.vin,
        quote.stockNumber,
        quote.vehicleLocation,
        quote.vehicleId?.year,
        quote.vehicleId?.make,
        quote.vehicleId?.modelName,
        quote.vehicleId?.vin,
        quote.vehicleId?.stockNumber,
        quote.fromZip,
        quote.toZip,
        quote.fromAddress,
        quote.toAddress,
        quote.status,
      ])
    ) {
      return false;
    }

    if (!matchesSelection(quote.status, filters.statuses)) {
      return false;
    }

    if (
      !isNumberInRange(
        quote.rate,
        filters.minAmount,
        filters.maxAmount,
      )
    ) {
      return false;
    }

    if (
      !isNumberInRange(
        quote.miles,
        filters.minMiles,
        filters.maxMiles,
      )
    ) {
      return false;
    }

    if (!isDateInRange(quote.createdAt, filters)) {
      return false;
    }

    return true;
  });

  return sortRecords(
    filtered,
    filters.sortDirection,
    (quote) => getQuoteSortValue(quote, filters.sortBy),
  );
}

export function filterLeads(
  leads: Lead[],
  filters: ReportFilterState,
): Lead[] {
  const filtered = leads.filter((lead) => {
    if (
      !containsSearch(filters.search, [
        lead.firstName,
        lead.lastName,
        lead.email,
        lead.phone,
        lead.senderEmail,
        lead.senderName,
        lead.source,
        lead.status,
        lead.subject,
        lead.body,
        lead.comments,
        lead.vehicle?.year,
        lead.vehicle?.make,
        lead.vehicle?.model,
      ])
    ) {
      return false;
    }

    if (!matchesSelection(lead.status, filters.statuses)) {
      return false;
    }

    if (!matchesSelection(lead.source, filters.sources)) {
      return false;
    }

    if (
      filters.readStatus === "read" &&
      lead.isRead !== true
    ) {
      return false;
    }

    if (
      filters.readStatus === "unread" &&
      lead.isRead === true
    ) {
      return false;
    }

    if (
      filters.pendingStatus === "pending" &&
      lead.isPending !== true
    ) {
      return false;
    }

    if (
      filters.pendingStatus === "not-pending" &&
      lead.isPending === true
    ) {
      return false;
    }

    if (
      filters.appointmentStatus === "has-appointment" &&
      !lead.appointment
    ) {
      return false;
    }

    if (
      filters.appointmentStatus === "no-appointment" &&
      Boolean(lead.appointment)
    ) {
      return false;
    }

    if (
      !isDateInRange(
        getLeadDate(lead, filters.dateField),
        filters,
      )
    ) {
      return false;
    }

    return true;
  });

  return sortRecords(
    filtered,
    filters.sortDirection,
    (lead) => getLeadSortValue(lead, filters.sortBy),
  );
}

export function filterPayments(
  payments: Payment[],
  filters: ReportFilterState,
): Payment[] {
  const filtered = payments.filter((payment) => {
    if (
      !containsSearch(filters.search, [
        payment.customerName,
        payment.customerEmail,
        payment.customerPhone,
        payment.invoiceNumber,
        payment.description,
        payment.paymentMethod,
        payment.status,
        payment.source,
        payment.amount,
      ])
    ) {
      return false;
    }

    if (!matchesSelection(payment.status, filters.statuses)) {
      return false;
    }

    if (!matchesSelection(payment.source, filters.sources)) {
      return false;
    }

    if (
      !matchesSelection(
        payment.paymentMethod,
        filters.paymentMethods,
      )
    ) {
      return false;
    }

    if (
      !isNumberInRange(
        Number(payment.amount),
        filters.minAmount,
        filters.maxAmount,
      )
    ) {
      return false;
    }

    if (
      !isDateInRange(
        getPaymentDate(payment, filters.dateField),
        filters,
      )
    ) {
      return false;
    }

    return true;
  });

  return sortRecords(
    filtered,
    filters.sortDirection,
    (payment) =>
      getPaymentSortValue(payment, filters.sortBy),
  );
}

export function filterPayouts(
  payouts: DriverPayout[],
  filters: ReportFilterState,
): DriverPayout[] {
  const filtered = payouts.filter((payout) => {
    if (
      !containsSearch(filters.search, [
        payout.driverName,
        payout.driverEmail,
        payout.payoutNumber,
        payout.description,
        payout.status,
        payout.amount,
        getPayoutLoadText(payout),
      ])
    ) {
      return false;
    }

    if (
      !matchesSelection(
        payout.status,
        filters.payoutStatuses,
      )
    ) {
      return false;
    }

    if (
      !matchesSelection(
        getPayoutDriverId(payout),
        filters.driverIds,
      )
    ) {
      return false;
    }

    if (
      !isNumberInRange(
        Number(payout.amount),
        filters.minAmount,
        filters.maxAmount,
      )
    ) {
      return false;
    }

    if (
      !isDateInRange(
        getPayoutDate(payout, filters.dateField),
        filters,
      )
    ) {
      return false;
    }

    return true;
  });

  return sortRecords(
    filtered,
    filters.sortDirection,
    (payout) =>
      getPayoutSortValue(payout, filters.sortBy),
  );
}

function formatDateLabel(value: Date): string {
  return value.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function getReportPeriodLabel(
  filters: ReportFilterState,
): string {
  if (filters.period === "all") {
    return "All Time";
  }

  const { from, to } = resolveReportPeriodRange(filters);

  if (!from && !to) {
    return "Selected Period";
  }

  if (filters.period === "monthly" && from) {
    return from.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
  }

  if (filters.period === "quarterly" && from) {
    const quarter = Math.floor(from.getMonth() / 3) + 1;

    return `Q${quarter} ${from.getFullYear()}`;
  }

  if (filters.period === "semi-annually" && from) {
    return `${from.getMonth() < 6 ? "Jan–Jun" : "Jul–Dec"} ${from.getFullYear()}`;
  }

  if (filters.period === "annually" && from) {
    return String(from.getFullYear());
  }

  if (from && to) {
    return `${formatDateLabel(from)} – ${formatDateLabel(to)}`;
  }

  return formatDateLabel(from ?? to ?? new Date());
}