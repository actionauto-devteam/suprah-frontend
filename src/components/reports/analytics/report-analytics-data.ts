import type { Payment } from "@/types/billing";
import type { DriverPayout } from "@/types/driver-payout";
import type { Lead } from "@/types/lead";
import type { Load } from "@/types/load";
import type { ReportId, ReportPeriod } from "@/types/report-filters";
import type { Quote } from "@/types/transportation";
import {
  buildPaymentStatusSummary,
  buildPayoutStatusSummary,
  normalizeStatus,
} from "@/components/reports/finance/shared/billing-report-utils";
import {
  buildLeadSourceSummary,
  buildLeadStatusSummary,
} from "@/components/reports/crm/utils/crm-preview-utils";

export const SUPRAH_ANALYTICS_COLORS = [
  "#10B981",
  "#2563EB",
  "#7C3AED",
  "#F59E0B",
  "#06B6D4",
  "#EF4444",
  "#4F46E5",
  "#64748B",
] as const;

export interface ReportAnalyticsPoint {
  label: string;
  [key: string]: string | number;
}

export type ReportAnalyticsValueFormat =
  | "number"
  | "currency"
  | "percentage";

export interface ReportAnalyticsSeries {
  key: string;
  label: string;
  color: string;
  format?: ReportAnalyticsValueFormat;
}

export interface ReportAnalyticsTooltipField {
  key: string;
  label: string;
  format?: ReportAnalyticsValueFormat | "text";
}

export interface ReportAnalyticsInsight {
  label: string;
  value: string;
  description?: string;
}

export type ReportAnalyticsPresentation =
  | "default"
  | "comparison"
  | "workload"
  | "ranking"
  | "stacked-progress";

export interface ReportAnalyticsBaseline {
  label: string;
  value: number;
  description?: string;
}

export interface ReportAnalyticsFooterItem {
  label: string;
  value: number;
  /** Optional user-facing value that adds context while preserving numeric export data. */
  displayValue?: string;
  description?: string;
  color?: string;
}

export interface ReportAnalyticsChart {
  id: string;
  kind: "donut" | "bar" | "line";
  title: string;
  description: string;
  data: ReportAnalyticsPoint[];
  series: ReportAnalyticsSeries[];
  horizontal?: boolean;
  /** Stack bar series when one metric is a component of the total. */
  stacked?: boolean;
  /** Adds a soft Suprah gradient beneath trend lines in the web interface. */
  areaFill?: boolean;
  /** Displays values directly beside bars when the chart remains readable. */
  showValueLabels?: boolean;
  /** Additional context displayed in the interactive tooltip. */
  tooltipFields?: ReportAnalyticsTooltipField[];
  /** Compact explanation cards shown above the visualization. */
  insights?: ReportAnalyticsInsight[];
  /** Optional web renderer optimized for dense categorical comparisons. */
  presentation?: ReportAnalyticsPresentation;
  /** Comparison base shown above workload/progress charts. */
  baseline?: ReportAnalyticsBaseline;
  /** Compact records displayed below a chart without mixing them into ranking data. */
  footerItems?: ReportAnalyticsFooterItem[];
  /** Maximum number of category rows visible before the web chart becomes scrollable. */
  maxVisibleRows?: number;
  /** Lower values are preferred when a PDF can include only a few charts. */
  pdfPriority?: number;
}

export interface ReportAnalyticsModel {
  title: string;
  description: string;
  charts: ReportAnalyticsChart[];
}

export interface ReportAnalyticsPeriodContext {
  period?: ReportPeriod;
  /** YYYY-MM-DD reference date used by the report filter. */
  referenceDate?: string;
  /** YYYY-MM-DD values used for custom reporting ranges. */
  from?: string;
  to?: string;
  /** Human-readable period label available to PDF and Excel exports. */
  label?: string;
}

export interface ReportAnalyticsInput {
  reportId: ReportId;
  loads?: Load[];
  quotes?: Quote[];
  leads?: Lead[];
  payments?: Payment[];
  payouts?: DriverPayout[];
  periodContext?: ReportAnalyticsPeriodContext;
}

const DAY_MS = 86_400_000;
const REPORT_TIME_ZONE = "America/Denver";
const REPORT_DATE_PARTS = new Intl.DateTimeFormat("en-US", {
  timeZone: REPORT_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

type TrendGranularity = "day" | "two-day" | "week" | "month" | "quarter" | "year";

interface ResolvedAnalyticsPeriod {
  period: ReportPeriod | "auto";
  startDay?: number;
  endDay?: number;
}

function cleanLabel(value: unknown, fallback = "Unknown"): string {
  const text = String(value ?? "")
    .trim()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");

  if (!text) return fallback;
  return text.replace(/\b\w/g, (character) => character.toUpperCase());
}

function normalizeTransportType(value: unknown): string {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");

  if (!normalized || normalized === "n/a" || normalized === "unknown") {
    return "Open";
  }
  if (normalized.includes("enclosed")) return "Enclosed";
  if (normalized.includes("open")) return "Open";
  if (normalized.includes("flatbed")) return "Flatbed";
  if (normalized.includes("lowboy") || normalized.includes("low boy")) {
    return "Lowboy";
  }
  if (normalized.includes("step deck")) return "Step Deck";
  return cleanLabel(value, "Other");
}

function validDate(value: unknown): Date | null {
  if (!value) return null;
  const text = String(value).trim();
  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(text)
    ? `${text}T12:00:00Z`
    : text;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Converts an event timestamp into the Mountain Time reporting calendar day. */
function calendarDayNumber(date: Date): number {
  const parts = REPORT_DATE_PARTS.formatToParts(date);
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const day = Number(parts.find((part) => part.type === "day")?.value);
  if (![year, month, day].every(Number.isFinite)) return 0;
  return Math.floor(Date.UTC(year, month - 1, day) / DAY_MS);
}

function calendarDayFromDateOnly(value?: string): number | undefined {
  if (!value) return undefined;
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    const parsed = validDate(value);
    return parsed ? calendarDayNumber(parsed) : undefined;
  }
  const date = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isFinite(date) ? Math.floor(date / DAY_MS) : undefined;
}

function dateFromCalendarDay(dayNumber: number): Date {
  return new Date(dayNumber * DAY_MS);
}

function dayNumberFromUtcDate(date: Date): number {
  return Math.floor(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) / DAY_MS);
}

function utcDate(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month, day));
}

function endOfUtcMonth(date: Date): Date {
  return utcDate(date.getUTCFullYear(), date.getUTCMonth() + 1, 0);
}

function shortDate(date: Date, includeYear = false): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    ...(includeYear ? { year: "numeric" as const } : {}),
    timeZone: "UTC",
  });
}

function shortDateRange(start: Date, end: Date, includeYear = false): string {
  if (
    start.getUTCFullYear() === end.getUTCFullYear() &&
    start.getUTCMonth() === end.getUTCMonth() &&
    start.getUTCDate() === end.getUTCDate()
  ) {
    return shortDate(start, includeYear);
  }

  if (
    start.getUTCFullYear() === end.getUTCFullYear() &&
    start.getUTCMonth() === end.getUTCMonth()
  ) {
    return `${shortDate(start, includeYear)}-${end.getUTCDate()}`;
  }

  return `${shortDate(start, includeYear)}-${shortDate(end, includeYear)}`;
}

function topDistribution(
  entries: Array<{ label: string; value: number }>,
  limit = 7,
): ReportAnalyticsPoint[] {
  const sorted = [...entries]
    .filter((entry) => Number.isFinite(entry.value) && entry.value > 0)
    .sort(
      (first, second) =>
        second.value - first.value || first.label.localeCompare(second.label),
    );

  if (sorted.length <= limit) return sorted;

  const visible = sorted.slice(0, limit - 1);
  const other = sorted
    .slice(limit - 1)
    .reduce((sum, entry) => sum + entry.value, 0);
  return [...visible, { label: "Other", value: other }];
}

function countValues(values: unknown[], limit = 7): ReportAnalyticsPoint[] {
  const counts = new Map<string, number>();
  values.forEach((value) => {
    const label = cleanLabel(value);
    counts.set(label, (counts.get(label) ?? 0) + 1);
  });
  return topDistribution(
    Array.from(counts.entries()).map(([label, value]) => ({ label, value })),
    limit,
  );
}

function percentageValue(part: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((part / total) * 1000) / 10;
}

function formatWholeCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

function peakTrendPoint(
  points: ReportAnalyticsPoint[],
  key: string,
): ReportAnalyticsPoint | undefined {
  return [...points].sort(
    (first, second) =>
      Number(second[key] || 0) - Number(first[key] || 0),
  )[0];
}

function calendarDayFromDisplayDate(value: string): number | undefined {
  const match = value.trim().match(/^([A-Za-z]{3,9})\s+(\d{1,2}),\s+(\d{4})$/);
  if (!match) return undefined;
  const monthIndex = MONTH_NAMES.findIndex(
    (name) =>
      name.toLowerCase() === match[1].toLowerCase() ||
      name.slice(0, 3).toLowerCase() === match[1].slice(0, 3).toLowerCase(),
  );
  if (monthIndex < 0) return undefined;
  return dayNumberFromUtcDate(
    utcDate(Number(match[3]), monthIndex, Number(match[2])),
  );
}

function inferPeriodFromLabel(label?: string): ResolvedAnalyticsPeriod | null {
  const text = String(label ?? "").trim();
  if (!text) return null;
  if (/^all time$/i.test(text)) return { period: "all" };

  const quarter = text.match(/^Q([1-4])\s+(\d{4})$/i);
  if (quarter) {
    const quarterIndex = Number(quarter[1]) - 1;
    const year = Number(quarter[2]);
    const start = utcDate(year, quarterIndex * 3, 1);
    const end = utcDate(year, quarterIndex * 3 + 3, 0);
    return {
      period: "quarterly",
      startDay: dayNumberFromUtcDate(start),
      endDay: dayNumberFromUtcDate(end),
    };
  }

  const semiAnnual = text.match(/^(Jan|Jul)[-–—](Jun|Dec)\s+(\d{4})$/i);
  if (semiAnnual) {
    const year = Number(semiAnnual[3]);
    const startMonth = semiAnnual[1].toLowerCase() === "jan" ? 0 : 6;
    return {
      period: "semi-annually",
      startDay: dayNumberFromUtcDate(utcDate(year, startMonth, 1)),
      endDay: dayNumberFromUtcDate(utcDate(year, startMonth + 6, 0)),
    };
  }

  const annual = text.match(/^(\d{4})$/);
  if (annual) {
    const year = Number(annual[1]);
    return {
      period: "annually",
      startDay: dayNumberFromUtcDate(utcDate(year, 0, 1)),
      endDay: dayNumberFromUtcDate(utcDate(year, 11, 31)),
    };
  }

  const month = text.match(/^([A-Za-z]+)\s+(\d{4})$/);
  if (month) {
    const monthIndex = MONTH_NAMES.findIndex(
      (name) => name.toLowerCase() === month[1].toLowerCase(),
    );
    if (monthIndex >= 0) {
      const year = Number(month[2]);
      return {
        period: "monthly",
        startDay: dayNumberFromUtcDate(utcDate(year, monthIndex, 1)),
        endDay: dayNumberFromUtcDate(utcDate(year, monthIndex + 1, 0)),
      };
    }
  }

  const rangeParts = text.split(/\s+[–—-]\s+/);
  if (rangeParts.length === 2) {
    const startDay = calendarDayFromDisplayDate(rangeParts[0]);
    const endDay = calendarDayFromDisplayDate(rangeParts[1]);
    if (startDay != null && endDay != null) {
      const span = Math.max(1, endDay - startDay + 1);
      return {
        period: span <= 8 ? "weekly" : span <= 15 ? "bi-weekly" : "custom",
        startDay,
        endDay,
      };
    }
  }

  return null;
}

function resolveAnalyticsPeriod(
  context: ReportAnalyticsPeriodContext | undefined,
  dataStartDay: number,
  dataEndDay: number,
): ResolvedAnalyticsPeriod {
  const explicitPeriod = context?.period;
  const referenceDay = calendarDayFromDateOnly(context?.referenceDate);
  const customStart = calendarDayFromDateOnly(context?.from);
  const customEnd = calendarDayFromDateOnly(context?.to);

  if (explicitPeriod === "all") return { period: "all" };
  if (explicitPeriod === "custom") {
    return {
      period: "custom",
      startDay: customStart ?? dataStartDay,
      endDay: customEnd ?? dataEndDay,
    };
  }

  if (explicitPeriod && referenceDay != null) {
    const reference = dateFromCalendarDay(referenceDay);
    const year = reference.getUTCFullYear();
    const month = reference.getUTCMonth();

    if (explicitPeriod === "weekly" || explicitPeriod === "bi-weekly") {
      const dayOfWeek = reference.getUTCDay();
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const startDay = referenceDay + mondayOffset;
      return {
        period: explicitPeriod,
        startDay,
        endDay: startDay + (explicitPeriod === "weekly" ? 6 : 13),
      };
    }
    if (explicitPeriod === "monthly") {
      return {
        period: explicitPeriod,
        startDay: dayNumberFromUtcDate(utcDate(year, month, 1)),
        endDay: dayNumberFromUtcDate(utcDate(year, month + 1, 0)),
      };
    }
    if (explicitPeriod === "quarterly") {
      const startMonth = Math.floor(month / 3) * 3;
      return {
        period: explicitPeriod,
        startDay: dayNumberFromUtcDate(utcDate(year, startMonth, 1)),
        endDay: dayNumberFromUtcDate(utcDate(year, startMonth + 3, 0)),
      };
    }
    if (explicitPeriod === "semi-annually") {
      const startMonth = month < 6 ? 0 : 6;
      return {
        period: explicitPeriod,
        startDay: dayNumberFromUtcDate(utcDate(year, startMonth, 1)),
        endDay: dayNumberFromUtcDate(utcDate(year, startMonth + 6, 0)),
      };
    }
    if (explicitPeriod === "annually") {
      return {
        period: explicitPeriod,
        startDay: dayNumberFromUtcDate(utcDate(year, 0, 1)),
        endDay: dayNumberFromUtcDate(utcDate(year, 11, 31)),
      };
    }
  }

  const inferred = inferPeriodFromLabel(context?.label);
  if (inferred) return inferred;

  return {
    period: explicitPeriod ?? "auto",
    startDay: dataStartDay,
    endDay: dataEndDay,
  };
}

function chooseGranularity(
  period: ReportPeriod | "auto",
  spanDays: number,
): TrendGranularity {
  switch (period) {
    case "weekly":
      return "day";
    case "bi-weekly":
      return "two-day";
    case "monthly":
      return "week";
    case "quarterly":
    case "semi-annually":
    case "annually":
      return "month";
    case "custom":
    case "all":
    case "auto":
    default:
      if (spanDays <= 14) return "day";
      if (spanDays <= 62) return "week";
      if (spanDays <= 400) return "month";
      if (spanDays <= 1_100) return "quarter";
      return "year";
  }
}

interface TrendBucket {
  startDay: number;
  endDay: number;
  label: string;
}

function createTrendBuckets(
  startDay: number,
  endDay: number,
  granularity: TrendGranularity,
): TrendBucket[] {
  const includeYear =
    dateFromCalendarDay(startDay).getUTCFullYear() !==
    dateFromCalendarDay(endDay).getUTCFullYear();

  if (granularity === "day" || granularity === "two-day" || granularity === "week") {
    const step = granularity === "day" ? 1 : granularity === "two-day" ? 2 : 7;
    const buckets: TrendBucket[] = [];
    for (let current = startDay; current <= endDay; current += step) {
      const bucketEnd = Math.min(endDay, current + step - 1);
      buckets.push({
        startDay: current,
        endDay: bucketEnd,
        label: shortDateRange(
          dateFromCalendarDay(current),
          dateFromCalendarDay(bucketEnd),
          includeYear,
        ),
      });
    }
    return buckets;
  }

  const buckets: TrendBucket[] = [];
  let cursor = dateFromCalendarDay(startDay);
  const finalDate = dateFromCalendarDay(endDay);

  while (dayNumberFromUtcDate(cursor) <= endDay) {
    let next: Date;
    let bucketEndDate: Date;
    let label: string;

    if (granularity === "month") {
      next = utcDate(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1);
      bucketEndDate = endOfUtcMonth(cursor);
      label = cursor.toLocaleDateString("en-US", {
        month: "short",
        year: includeYear ? "numeric" : undefined,
        timeZone: "UTC",
      });
    } else if (granularity === "quarter") {
      const quarterStart = Math.floor(cursor.getUTCMonth() / 3) * 3;
      next = utcDate(cursor.getUTCFullYear(), quarterStart + 3, 1);
      bucketEndDate = utcDate(cursor.getUTCFullYear(), quarterStart + 3, 0);
      label = `Q${Math.floor(quarterStart / 3) + 1} ${cursor.getUTCFullYear()}`;
    } else {
      next = utcDate(cursor.getUTCFullYear() + 1, 0, 1);
      bucketEndDate = utcDate(cursor.getUTCFullYear(), 11, 31);
      label = String(cursor.getUTCFullYear());
    }

    const bucketStart = Math.max(startDay, dayNumberFromUtcDate(cursor));
    const bucketEnd = Math.min(endDay, dayNumberFromUtcDate(bucketEndDate));
    buckets.push({ startDay: bucketStart, endDay: bucketEnd, label });
    cursor = next;

    if (cursor > finalDate && dayNumberFromUtcDate(cursor) > endDay) break;
  }

  return buckets;
}

function createTimeBuckets<T>(input: {
  records: T[];
  dateValue: (record: T) => unknown;
  series: Array<{
    key: string;
    value: (record: T) => number;
  }>;
  periodContext?: ReportAnalyticsPeriodContext;
}): ReportAnalyticsPoint[] {
  const dated = input.records
    .map((record) => {
      const date = validDate(input.dateValue(record));
      return date
        ? { record, dayNumber: calendarDayNumber(date) }
        : null;
    })
    .filter(
      (item): item is { record: T; dayNumber: number } => item !== null,
    )
    .sort((first, second) => first.dayNumber - second.dayNumber);

  if (dated.length === 0) return [];

  const dataStartDay = dated[0].dayNumber;
  const dataEndDay = dated[dated.length - 1].dayNumber;
  const resolved = resolveAnalyticsPeriod(
    input.periodContext,
    dataStartDay,
    dataEndDay,
  );
  const startDay = resolved.startDay ?? dataStartDay;
  const endDay = resolved.endDay ?? dataEndDay;
  const safeStart = Math.min(startDay, endDay);
  const safeEnd = Math.max(startDay, endDay);
  const spanDays = Math.max(1, safeEnd - safeStart + 1);
  const granularity = chooseGranularity(resolved.period, spanDays);
  const ranges = createTrendBuckets(safeStart, safeEnd, granularity);

  const buckets = ranges.map((range) => {
    const point: ReportAnalyticsPoint = { label: range.label };
    input.series.forEach((series) => {
      point[series.key] = 0;
    });
    return point;
  });

  dated.forEach(({ record, dayNumber }) => {
    if (dayNumber < safeStart || dayNumber > safeEnd) return;
    const index = ranges.findIndex(
      (range) => dayNumber >= range.startDay && dayNumber <= range.endDay,
    );
    if (index < 0) return;
    input.series.forEach((series) => {
      const nextValue = Number(series.value(record));
      if (!Number.isFinite(nextValue)) return;
      buckets[index][series.key] =
        Number(buckets[index][series.key] ?? 0) + nextValue;
    });
  });

  return buckets;
}

interface DriverAggregate {
  label: string;
  assigned: number;
  delivered: number;
  mileage: number;
  settlements: number;
}

function loadDriverIdentity(
  load: Load,
  driverLabelsById: Map<string, string>,
): { key: string; label: string } {
  const assigned = load.assignedDriverId;
  if (!assigned) return { key: "unassigned", label: "Unassigned" };

  if (typeof assigned === "string") {
    return {
      key: `id:${assigned}`,
      label: driverLabelsById.get(assigned) || assigned,
    };
  }

  const id = assigned._id || assigned.email || assigned.name || "assigned";
  return {
    key: `id:${id}`,
    label:
      assigned.name ||
      assigned.email ||
      driverLabelsById.get(assigned._id) ||
      assigned._id ||
      "Assigned Driver",
  };
}

function payoutDriverIdentity(
  payout: DriverPayout,
): { key: string; label: string } {
  const driverId =
    typeof payout.driverId === "string"
      ? payout.driverId
      : payout.driverId?._id;
  const label = String(
    payout.driverName || payout.driverEmail || driverId || "Unknown Driver",
  ).trim();

  if (driverId) return { key: `id:${driverId}`, label };
  return { key: `name:${label.toLowerCase()}`, label };
}

function buildLoadAnalytics(
  loads: Load[],
  periodContext?: ReportAnalyticsPeriodContext,
): ReportAnalyticsModel {
  const statusData = countValues(loads.map((load) => load.status));
  const transportData = countValues(
    loads.map((load) => normalizeTransportType(load.trailerType)),
    6,
  );
  const activityEvents = loads.flatMap((load) => {
    const delivered = cleanLabel(load.status).toLowerCase() === "delivered";
    const events = [
      {
        date: load.createdAt,
        loads: 1,
        delivered: 0,
      },
    ];

    if (delivered) {
      events.push({
        date: load.deliveredAt || load.createdAt,
        loads: 0,
        delivered: 1,
      });
    }

    return events;
  });
  const trendData = createTimeBuckets({
    periodContext,
    records: activityEvents,
    dateValue: (event) => event.date,
    series: [
      { key: "loads", value: (event) => event.loads },
      { key: "delivered", value: (event) => event.delivered },
    ],
  }).map((point) => ({
    ...point,
    deliveryRate: percentageValue(
      Number(point.delivered || 0),
      Number(point.loads || 0),
    ),
  }));
  const peakCreated = peakTrendPoint(trendData, "loads");
  const peakDelivered = peakTrendPoint(trendData, "delivered");

  return {
    title: "Suprah Load Analytics",
    description:
      "Operational status, transport mix, and load-volume movement for the filtered records.",
    charts: [
      {
        id: "load-status",
        pdfPriority: 2,
        kind: "donut",
        title: "Load Status Distribution",
        description:
          "Where the selected loads are concentrated by operational status.",
        data: statusData,
        series: [
          {
            key: "value",
            label: "Loads",
            color: SUPRAH_ANALYTICS_COLORS[0],
          },
        ],
      },
      {
        id: "load-transport",
        pdfPriority: 3,
        kind: "donut",
        title: "Transport Type Mix",
        description:
          "Share of filtered loads requiring open, enclosed, or specialized transport.",
        data: transportData,
        series: [
          {
            key: "value",
            label: "Loads",
            color: SUPRAH_ANALYTICS_COLORS[1],
          },
        ],
      },
      {
        id: "load-trend",
        pdfPriority: 1,
        kind: "line",
        areaFill: true,
        title: "Load Activity Trend",
        description:
          "Created-load volume compared with completed deliveries for each period bucket.",
        data: trendData,
        series: [
          {
            key: "loads",
            label: "Created Loads",
            color: SUPRAH_ANALYTICS_COLORS[1],
            format: "number",
          },
          {
            key: "delivered",
            label: "Delivered Loads",
            color: SUPRAH_ANALYTICS_COLORS[0],
            format: "number",
          },
        ],
        tooltipFields: [
          {
            key: "deliveryRate",
            label: "Delivered vs created",
            format: "percentage",
          },
        ],
        insights: [
          {
            label: "Peak creation period",
            value: peakCreated
              ? `${peakCreated.label}: ${Number(peakCreated.loads || 0).toLocaleString("en-US")}`
              : "No activity",
            description: "Period with the highest number of newly created loads.",
          },
          {
            label: "Peak delivery period",
            value: peakDelivered
              ? `${peakDelivered.label}: ${Number(peakDelivered.delivered || 0).toLocaleString("en-US")}`
              : "No deliveries",
            description: "Period with the highest number of completed deliveries.",
          },
        ],
      },
    ],
  };
}

function buildQuoteAnalytics(
  quotes: Quote[],
  periodContext?: ReportAnalyticsPeriodContext,
): ReportAnalyticsModel {
  const statusData = countValues(quotes.map((quote) => quote.status));
  const transportTypes = ["Enclosed", "Open"] as const;
  const transportData: ReportAnalyticsPoint[] = transportTypes.map((label) => {
    const matching = quotes.filter((quote) =>
      label === "Enclosed" ? quote.enclosedTrailer : !quote.enclosedTrailer,
    );
    const booked = matching.filter(
      (quote) => normalizeStatus(quote.status) === "booked",
    ).length;
    const totalValue = matching.reduce(
      (sum, quote) => sum + Number(quote.rate || 0),
      0,
    );

    return {
      label,
      quotes: matching.length,
      booked,
      conversionRate: percentageValue(booked, matching.length),
      averageRate: matching.length > 0 ? totalValue / matching.length : 0,
      detail:
        label === "Enclosed"
          ? "Quotes requesting enclosed vehicle transport."
          : "Quotes requesting standard open vehicle transport.",
    };
  });

  const trendData = createTimeBuckets({
    periodContext,
    records: quotes,
    dateValue: (quote) => quote.createdAt,
    series: [
      { key: "quotes", value: () => 1 },
      {
        key: "booked",
        value: (quote) =>
          normalizeStatus(quote.status) === "booked" ? 1 : 0,
      },
    ],
  }).map((point) => ({
    ...point,
    conversionRate: percentageValue(
      Number(point.booked || 0),
      Number(point.quotes || 0),
    ),
  }));
  const activeTransportData = transportData.filter(
    (item) => Number(item.quotes || 0) > 0,
  );
  const leadingTransport = [...activeTransportData].sort(
    (first, second) => Number(second.quotes) - Number(first.quotes),
  )[0];
  const strongestConversion = [...activeTransportData].sort(
    (first, second) =>
      Number(second.conversionRate) - Number(first.conversionRate),
  )[0];
  const peakQuotes = peakTrendPoint(trendData, "quotes");

  return {
    title: "Suprah Quote Analytics",
    description:
      "Conversion status, transport demand, and quote-volume movement for the filtered records.",
    charts: [
      {
        id: "quote-status",
        pdfPriority: 3,
        kind: "donut",
        title: "Quote Status Distribution",
        description: "How quote and draft records progressed toward booking.",
        data: statusData,
        series: [
          {
            key: "value",
            label: "Quotes",
            color: SUPRAH_ANALYTICS_COLORS[3],
          },
        ],
      },
      {
        id: "quote-transport",
        pdfPriority: 1,
        kind: "bar",
        presentation: "comparison",
        title: "Quote Demand by Transport Type",
        description:
          "Every transport type remains visible and compares quote requests with booked quotes. Values are shown outside the legend so nothing is covered.",
        data: transportData,
        series: [
          {
            key: "quotes",
            label: "Quote Requests",
            color: SUPRAH_ANALYTICS_COLORS[4],
          },
          {
            key: "booked",
            label: "Booked Quotes",
            color: SUPRAH_ANALYTICS_COLORS[0],
          },
        ],
        horizontal: true,
        showValueLabels: true,
        tooltipFields: [
          {
            key: "conversionRate",
            label: "Booking conversion",
            format: "percentage",
          },
          {
            key: "averageRate",
            label: "Average quoted rate",
            format: "currency",
          },
          {
            key: "detail",
            label: "Transport definition",
            format: "text",
          },
        ],
        insights: [
          {
            label: "Most requested",
            value: leadingTransport
              ? `${leadingTransport.label} (${Number(leadingTransport.quotes).toLocaleString("en-US")})`
              : "No requests",
            description: "Transport type receiving the largest quote volume.",
          },
          {
            label: "Highest conversion",
            value: strongestConversion
              ? `${strongestConversion.label} (${Number(strongestConversion.conversionRate).toFixed(1)}%)`
              : "No bookings",
            description: "Transport type with the strongest booking rate.",
          },
        ],
      },
      {
        id: "quote-trend",
        pdfPriority: 2,
        kind: "line",
        areaFill: true,
        title: "Quote Activity Trend",
        description:
          "Created quote volume compared with booked quotes for each reporting-period bucket.",
        data: trendData,
        series: [
          {
            key: "quotes",
            label: "Created Quotes",
            color: SUPRAH_ANALYTICS_COLORS[1],
            format: "number",
          },
          {
            key: "booked",
            label: "Booked Quotes",
            color: SUPRAH_ANALYTICS_COLORS[0],
            format: "number",
          },
        ],
        tooltipFields: [
          {
            key: "conversionRate",
            label: "Booking conversion",
            format: "percentage",
          },
        ],
        insights: [
          {
            label: "Peak demand period",
            value: peakQuotes
              ? `${peakQuotes.label}: ${Number(peakQuotes.quotes || 0).toLocaleString("en-US")}`
              : "No quote activity",
            description: "Period with the highest number of new quote requests.",
          },
        ],
      },
    ],
  };
}

function buildLeadStatusAnalytics(
  leads: Lead[],
  periodContext?: ReportAnalyticsPeriodContext,
): ReportAnalyticsModel {
  const statusSummary = buildLeadStatusSummary(leads);
  const distribution = topDistribution(
    statusSummary.map((item) => ({ label: item.status, value: item.count })),
    7,
  );
  const totalLeads = leads.length;
  const isPendingReply = (lead: Lead) => lead.isPending === true;
  const isUnreadConversation = (lead: Lead) => lead.isRead !== true;
  const isScheduledFollowThrough = (lead: Lead) => {
    const status = cleanLabel(lead.status).toLowerCase();
    return (
      Boolean(lead.appointment) ||
      status.includes("appointment") ||
      status.includes("follow up") ||
      status.includes("scheduled")
    );
  };

  const pendingReplyCount = leads.filter(isPendingReply).length;
  const unreadConversationCount = leads.filter(isUnreadConversation).length;
  const scheduledFollowThroughCount = leads.filter(
    isScheduledFollowThrough,
  ).length;
  const noCurrentFollowUpFlag = leads.filter(
    (lead) =>
      !isPendingReply(lead) &&
      !isUnreadConversation(lead) &&
      !isScheduledFollowThrough(lead),
  ).length;
  const followUpIndicatorCount = Math.max(
    0,
    totalLeads - noCurrentFollowUpFlag,
  );
  const followUpIndicatorShare = percentageValue(
    followUpIndicatorCount,
    totalLeads,
  );
  const noFollowUpIndicatorShare = percentageValue(
    noCurrentFollowUpFlag,
    totalLeads,
  );

  const engagement: ReportAnalyticsPoint[] = [
    {
      label: "Unread Conversations",
      value: unreadConversationCount,
      share: percentageValue(unreadConversationCount, totalLeads),
      detail: "Conversations that have not yet been reviewed by the team.",
      color: SUPRAH_ANALYTICS_COLORS[1],
    },
    {
      label: "Pending Team Replies",
      value: pendingReplyCount,
      share: percentageValue(pendingReplyCount, totalLeads),
      detail: "Lead records explicitly waiting for a response from the team.",
      color: SUPRAH_ANALYTICS_COLORS[3],
    },
    {
      label: "Scheduled Follow-through",
      value: scheduledFollowThroughCount,
      share: percentageValue(scheduledFollowThroughCount, totalLeads),
      detail:
        "Leads with an appointment, an appointment status, or another scheduled follow-up indicator.",
      color: SUPRAH_ANALYTICS_COLORS[2],
    },
  ];
  const trend = createTimeBuckets({
    periodContext,
    records: leads,
    dateValue: (lead) => lead.createdAt,
    series: [{ key: "leads", value: () => 1 }],
  });
  const peakLeads = peakTrendPoint(trend, "leads");

  return {
    title: "Suprah Lead Status Analytics",
    description:
      "Pipeline distribution, follow-up workload, and lead-volume movement for the filtered records.",
    charts: [
      {
        id: "lead-status-distribution",
        pdfPriority: 3,
        kind: "donut",
        title: "Pipeline Status Distribution",
        description: "Share of leads in each normalized pipeline status.",
        data: distribution,
        series: [
          {
            key: "value",
            label: "Leads",
            color: SUPRAH_ANALYTICS_COLORS[4],
          },
        ],
      },
      {
        id: "lead-engagement",
        pdfPriority: 1,
        kind: "bar",
        presentation: "workload",
        baseline: {
          label: "Filtered Leads",
          value: totalLeads,
          description:
            "Every workload percentage is calculated from this filtered lead total.",
        },
        footerItems: [
          {
            label: "Follow-up Indicators Detected",
            value: followUpIndicatorCount,
            displayValue: `${followUpIndicatorCount.toLocaleString(
              "en-US",
            )} of ${totalLeads.toLocaleString(
              "en-US",
            )} leads · ${followUpIndicatorShare.toFixed(1)}%`,
            description:
              "At least one unread conversation, pending team reply, or scheduled follow-through indicator was detected.",
            color: SUPRAH_ANALYTICS_COLORS[0],
          },
          {
            label: "Leads Without a Follow-up Indicator",
            value: noCurrentFollowUpFlag,
            displayValue: `${noCurrentFollowUpFlag.toLocaleString(
              "en-US",
            )} of ${totalLeads.toLocaleString(
              "en-US",
            )} leads · ${noFollowUpIndicatorShare.toFixed(1)}%`,
            description:
              "No unread conversation, pending team reply, or scheduled follow-through indicator was detected. These leads may still require review.",
            color: SUPRAH_ANALYTICS_COLORS[3],
          },
        ],
        title: "Lead Follow-up Workload",
        description:
          "Separates unread conversations, pending team replies, and scheduled follow-through. A lead may appear in more than one category when multiple follow-up conditions apply.",
        data: engagement,
        series: [
          {
            key: "value",
            label: "Affected Leads",
            color: SUPRAH_ANALYTICS_COLORS[3],
          },
        ],
        horizontal: true,
        showValueLabels: true,
        tooltipFields: [
          {
            key: "share",
            label: "Share of filtered leads",
            format: "percentage",
          },
          {
            key: "detail",
            label: "What this means",
            format: "text",
          },
        ],
        insights: [
          {
            label: "Filtered leads",
            value: totalLeads.toLocaleString("en-US"),
            description:
              "The chart categories are follow-up subsets and do not need to total this number.",
          },
          {
            label: "Unread conversations",
            value: unreadConversationCount.toLocaleString("en-US"),
            description: "Lead conversations that still require review.",
          },
        ],
      },
      {
        id: "lead-status-trend",
        pdfPriority: 2,
        kind: "line",
        areaFill: true,
        title: "Lead Creation Trend",
        description:
          "New lead records created in each bucket of the selected reporting period.",
        data: trend,
        series: [
          {
            key: "leads",
            label: "New Leads",
            color: SUPRAH_ANALYTICS_COLORS[1],
            format: "number",
          },
        ],
        insights: [
          {
            label: "Peak creation period",
            value: peakLeads
              ? `${peakLeads.label}: ${Number(peakLeads.leads || 0).toLocaleString("en-US")}`
              : "No lead activity",
            description: "Period with the highest number of newly created leads.",
          },
        ],
      },
    ],
  };
}

function buildLeadSourceAnalytics(
  leads: Lead[],
  periodContext?: ReportAnalyticsPeriodContext,
): ReportAnalyticsModel {
  const sourceSummary = buildLeadSourceSummary(leads);
  const knownSources = sourceSummary.filter(
    (item) => item.source.toLowerCase() !== "unknown",
  );
  const knownTotal = knownSources.reduce((sum, item) => sum + item.count, 0);
  const unknownCount = Math.max(0, leads.length - knownTotal);
  const sourceComparison: ReportAnalyticsPoint[] = knownSources.map(
    (item, index): ReportAnalyticsPoint => ({
      label: item.source,
      rank: index + 1,
      rankLabel: `${index + 1}`,
      value: item.count,
      share: percentageValue(item.count, knownTotal),
      color:
        SUPRAH_ANALYTICS_COLORS[
          index % SUPRAH_ANALYTICS_COLORS.length
        ],
    }),
  );
  const knownMix = topDistribution(
    knownSources.map((item) => ({ label: item.source, value: item.count })),
    8,
  );
  const trend = createTimeBuckets({
    periodContext,
    records: leads,
    dateValue: (lead) => lead.createdAt,
    series: [{ key: "leads", value: () => 1 }],
  });
  const topSource = sourceComparison[0];
  const peakTrend = peakTrendPoint(trend, "leads");

  return {
    title: "Suprah Lead Source Analytics",
    description:
      "Recognized acquisition-channel contribution and lead-volume movement for the filtered records.",
    charts: [
      {
        id: "lead-source-ranking",
        pdfPriority: 1,
        kind: "bar",
        presentation: "ranking",
        maxVisibleRows: 8,
        footerItems: [
          {
            label: "Unattributed Records",
            value: unknownCount,
            description:
              "Leads without a recognized source. Kept separate from the ranked source list.",
            color: SUPRAH_ANALYTICS_COLORS[7],
          },
        ],
        title: "Lead Volume by Source",
        description:
          "Shows the complete recognized-source ranking from 1 onward. The list scrolls when more sources are available.",
        data: sourceComparison,
        series: [
          {
            key: "value",
            label: "Leads",
            color: SUPRAH_ANALYTICS_COLORS[1],
          },
        ],
        horizontal: true,
        showValueLabels: true,
        tooltipFields: [
          {
            key: "share",
            label: "Share of known-source leads",
            format: "percentage",
          },
          {
            key: "rankLabel",
            label: "Rank",
            format: "text",
          },
        ],
        insights: [
          {
            label: "Leading source",
            value: topSource
              ? `${topSource.label} (${Number(topSource.value || 0).toLocaleString("en-US")})`
              : "No recognized sources",
            description: "Recognized channel producing the most filtered leads.",
          },
          {
            label: "Recognized sources",
            value: knownSources.length.toLocaleString("en-US"),
            description: "All recognized channels remain available in the ranking.",
          },
        ],
      },
      {
        id: "lead-source-known-mix",
        pdfPriority: 2,
        kind: "donut",
        title: "Known Source Contribution",
        description:
          "Compares recognized sources as a share of known-source lead volume. Smaller sources may be grouped as Other only in this compact donut.",
        data: knownMix,
        series: [
          {
            key: "value",
            label: "Leads",
            color: SUPRAH_ANALYTICS_COLORS[4],
          },
        ],
      },
      {
        id: "lead-source-trend",
        pdfPriority: 3,
        kind: "line",
        areaFill: true,
        title: "Lead Volume Trend",
        description: "Lead creation across the filtered reporting period.",
        data: trend,
        series: [
          {
            key: "leads",
            label: "New Leads",
            color: SUPRAH_ANALYTICS_COLORS[2],
            format: "number",
          },
        ],
        insights: [
          {
            label: "Peak lead period",
            value: peakTrend
              ? `${peakTrend.label}: ${Number(peakTrend.leads || 0).toLocaleString("en-US")}`
              : "No lead activity",
            description: "Period with the strongest incoming lead volume.",
          },
        ],
      },
    ],
  };
}

function buildDriverAnalytics(
  loads: Load[],
  payouts: DriverPayout[],
): ReportAnalyticsModel {
  const driverLabelsById = new Map<string, string>();
  payouts.forEach((payout) => {
    const driverId =
      typeof payout.driverId === "string"
        ? payout.driverId
        : payout.driverId?._id;
    const readable = String(
      payout.driverName || payout.driverEmail || "",
    ).trim();
    if (driverId && readable) driverLabelsById.set(driverId, readable);
  });

  const rows = new Map<string, DriverAggregate>();

  loads
    .filter((load) => Boolean(load.assignedDriverId))
    .forEach((load) => {
      const identity = loadDriverIdentity(load, driverLabelsById);
      const current = rows.get(identity.key) ?? {
        label: identity.label,
        assigned: 0,
        delivered: 0,
        mileage: 0,
        settlements: 0,
      };
      current.label = current.label || identity.label;
      current.assigned += 1;
      if (cleanLabel(load.status).toLowerCase() === "delivered") {
        current.delivered += 1;
      }
      current.mileage += Number(load.pricing?.miles || 0);
      rows.set(identity.key, current);
    });

  payouts.forEach((payout) => {
    const identity = payoutDriverIdentity(payout);
    const current = rows.get(identity.key) ?? {
      label: identity.label,
      assigned: 0,
      delivered: 0,
      mileage: 0,
      settlements: 0,
    };

    if (
      identity.label &&
      (current.label === identity.key.replace(/^id:/, "") ||
        current.label === "Unknown Driver")
    ) {
      current.label = identity.label;
    }

    current.settlements += Number(payout.amount || 0);
    rows.set(identity.key, current);
  });

  const allDriverRows = Array.from(rows.values()).map((values) => ({
    ...values,
    remaining: Math.max(0, values.assigned - values.delivered),
    completionRate: percentageValue(values.delivered, values.assigned),
  }));
  const completionRows = [...allDriverRows]
    .filter((row) => row.assigned > 0)
    .sort(
      (first, second) =>
        second.assigned - first.assigned ||
        second.completionRate - first.completionRate ||
        first.label.localeCompare(second.label),
    )
    .map((row, index) => ({
      ...row,
      rank: index + 1,
      rankLabel: `${index + 1}`,
    }));
  const settlementRows = allDriverRows
    .filter((row) => row.settlements > 0)
    .sort(
      (first, second) =>
        second.settlements - first.settlements ||
        first.label.localeCompare(second.label),
    )
    .slice(0, 8);

  const assignedLoads = loads.filter((load) => Boolean(load.assignedDriverId));
  const podData = [
    {
      label: "Approved",
      value: assignedLoads.filter((load) =>
        Boolean(load.proofOfDelivery?.confirmedAt),
      ).length,
    },
    {
      label: "Pending",
      value: assignedLoads.filter(
        (load) =>
          Boolean(load.proofOfDelivery?.submittedAt) &&
          !load.proofOfDelivery?.confirmedAt,
      ).length,
    },
    {
      label: "Not Submitted",
      value: assignedLoads.filter(
        (load) => !load.proofOfDelivery?.submittedAt,
      ).length,
    },
  ];
  const strongestDriver = [...completionRows]
    .filter((row) => row.assigned > 0)
    .sort(
      (first, second) =>
        second.completionRate - first.completionRate ||
        second.delivered - first.delivered,
    )[0];

  return {
    title: "Suprah Driver Analytics",
    description:
      "Driver workload, delivery completion, settlements, and proof-of-delivery progress.",
    charts: [
      {
        id: "driver-completion",
        pdfPriority: 1,
        kind: "bar",
        presentation: "stacked-progress",
        maxVisibleRows: 8,
        baseline: {
          label: "Assigned Loads",
          value: assignedLoads.length,
          description:
            "Each driver row uses Delivered + Still Open = Total Assigned.",
        },
        title: "Driver Assignment Completion",
        description:
          "Each stacked bar equals total assigned loads and separates delivered work from assignments still open.",
        data: completionRows,
        series: [
          {
            key: "delivered",
            label: "Delivered",
            color: SUPRAH_ANALYTICS_COLORS[0],
          },
          {
            key: "remaining",
            label: "Still Open",
            color: SUPRAH_ANALYTICS_COLORS[3],
          },
        ],
        horizontal: true,
        stacked: true,
        showValueLabels: true,
        tooltipFields: [
          {
            key: "assigned",
            label: "Total assigned",
            format: "number",
          },
          {
            key: "delivered",
            label: "Delivered loads",
            format: "number",
          },
          {
            key: "remaining",
            label: "Still-open assignments",
            format: "number",
          },
          {
            key: "completionRate",
            label: "Completion rate",
            format: "percentage",
          },
          {
            key: "mileage",
            label: "Assigned mileage",
            format: "number",
          },
        ],
        insights: [
          {
            label: "Assigned loads",
            value: assignedLoads.length.toLocaleString("en-US"),
            description: "Total filtered loads with a driver assignment.",
          },
          {
            label: "Highest completion",
            value: strongestDriver
              ? `${strongestDriver.label} (${strongestDriver.completionRate.toFixed(1)}%)`
              : "No completed assignments",
            description: "Best completion rate among drivers with assignments.",
          },
        ],
      },
      {
        id: "driver-pod",
        pdfPriority: 2,
        kind: "donut",
        title: "Proof of Delivery Progress",
        description: "Approved, pending, and not-submitted POD records.",
        data: podData,
        series: [
          {
            key: "value",
            label: "Loads",
            color: SUPRAH_ANALYTICS_COLORS[2],
          },
        ],
      },
      {
        id: "driver-settlements",
        pdfPriority: 3,
        kind: "bar",
        title: "Settlement Value by Driver",
        description:
          "Filtered driver payout value for the leading settlement records.",
        data: settlementRows,
        series: [
          {
            key: "settlements",
            label: "Settlements",
            color: SUPRAH_ANALYTICS_COLORS[2],
            format: "currency",
          },
        ],
        horizontal: true,
        showValueLabels: true,
      },
    ],
  };
}

function buildBillingAnalytics(
  payments: Payment[],
  payouts: DriverPayout[],
  periodContext?: ReportAnalyticsPeriodContext,
): ReportAnalyticsModel {
  const paymentStatus = topDistribution(
    buildPaymentStatusSummary(payments).map((item) => ({
      label: cleanLabel(item.status),
      value: item.count,
    })),
    7,
  );
  const payoutStatus = topDistribution(
    buildPayoutStatusSummary(payouts).map((item) => ({
      label: cleanLabel(item.status),
      value: item.count,
    })),
    6,
  );

  const combined = [
    ...payments.map((payment) => ({
      date: payment.paidAt || payment.createdAt,
      revenue:
        normalizeStatus(payment.status) === "succeeded"
          ? Number(payment.amount || 0)
          : 0,
      costs: 0,
    })),
    ...payouts.map((payout) => ({
      date: payout.paidAt || payout.createdAt,
      revenue: 0,
      costs:
        normalizeStatus(payout.status) === "paid"
          ? Number(payout.amount || 0)
          : 0,
    })),
  ];

  const trend = createTimeBuckets({
    periodContext,
    records: combined,
    dateValue: (record) => record.date,
    series: [
      { key: "revenue", value: (record) => record.revenue },
      { key: "costs", value: (record) => record.costs },
    ],
  }).map((point) => ({
    ...point,
    net: Number(point.revenue || 0) - Number(point.costs || 0),
  }));

  return {
    title: "Suprah Financial Analytics",
    description:
      "Payment outcomes, driver payout outcomes, and revenue movement for the filtered financial records.",
    charts: [
      {
        id: "billing-payment-status",
        pdfPriority: 2,
        kind: "donut",
        title: "Payment Status Distribution",
        description:
          "Transaction volume grouped by normalized customer-payment status.",
        data: paymentStatus,
        series: [
          {
            key: "value",
            label: "Payments",
            color: SUPRAH_ANALYTICS_COLORS[2],
          },
        ],
      },
      {
        id: "billing-payout-status",
        pdfPriority: 3,
        kind: "bar",
        title: "Driver Payout Status",
        description: "Payout records grouped by completion status.",
        data: payoutStatus,
        series: [
          {
            key: "value",
            label: "Payouts",
            color: SUPRAH_ANALYTICS_COLORS[3],
          },
        ],
      },
      {
        id: "billing-trend",
        pdfPriority: 1,
        kind: "line",
        title: "Revenue, Costs, and Net Position",
        description:
          "Succeeded payments compared with paid driver costs over the selected period.",
        data: trend,
        series: [
          {
            key: "revenue",
            label: "Revenue",
            color: SUPRAH_ANALYTICS_COLORS[0],
            format: "currency",
          },
          {
            key: "costs",
            label: "Driver Costs",
            color: SUPRAH_ANALYTICS_COLORS[3],
            format: "currency",
          },
          {
            key: "net",
            label: "Net Position",
            color: SUPRAH_ANALYTICS_COLORS[2],
            format: "currency",
          },
        ],
      },
    ],
  };
}

export function buildReportAnalyticsModel(
  input: ReportAnalyticsInput,
): ReportAnalyticsModel {
  const loads = input.loads ?? [];
  const quotes = input.quotes ?? [];
  const leads = input.leads ?? [];
  const payments = input.payments ?? [];
  const payouts = input.payouts ?? [];

  switch (input.reportId) {
    case "load-report":
      return buildLoadAnalytics(loads, input.periodContext);
    case "quote-report":
      return buildQuoteAnalytics(quotes, input.periodContext);
    case "lead-status-report":
      return buildLeadStatusAnalytics(leads, input.periodContext);
    case "lead-source-report":
      return buildLeadSourceAnalytics(leads, input.periodContext);
    case "driver-report":
      return buildDriverAnalytics(loads, payouts);
    case "billing-report":
      return buildBillingAnalytics(payments, payouts, input.periodContext);
    default:
      return { title: "Suprah Analytics", description: "", charts: [] };
  }
}

export function hasReportAnalyticsChartData(
  chart: ReportAnalyticsChart,
): boolean {
  const hasSeriesData = chart.data.some((point) =>
    chart.series.some((series) => {
      const value = Number(point[series.key] ?? 0);
      return Number.isFinite(value) && value !== 0;
    }),
  );
  const hasFooterData = Boolean(
    chart.footerItems?.some(
      (item) => Number.isFinite(item.value) && item.value > 0,
    ),
  );
  const hasBaseline = Boolean(
    chart.baseline &&
      Number.isFinite(chart.baseline.value) &&
      chart.baseline.value > 0,
  );

  return hasSeriesData || hasFooterData || hasBaseline;
}

export function visualShareBar(value: number, width = 18): string {
  const percentage = Math.max(0, Math.min(100, Number(value) || 0));
  const filled = Math.round((percentage / 100) * width);
  return `${"█".repeat(filled)}${"░".repeat(
    Math.max(0, width - filled),
  )} ${percentage.toFixed(1)}%`;
}