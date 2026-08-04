"use client";

import * as React from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { BarChart3, Sparkles } from "lucide-react";

import type { Payment } from "@/types/billing";
import type { DriverPayout } from "@/types/driver-payout";
import type { Lead } from "@/types/lead";
import type { Load } from "@/types/load";
import type { ReportId } from "@/types/report-filters";
import type { Quote } from "@/types/transportation";
import {
  buildReportAnalyticsModel,
  hasReportAnalyticsChartData,
  SUPRAH_ANALYTICS_COLORS,
  type ReportAnalyticsChart,
  type ReportAnalyticsPeriodContext,
  type ReportAnalyticsSeries,
  type ReportAnalyticsTooltipField,
} from "@/components/reports/analytics/report-analytics-data";

interface ReportAnalyticsPanelProps {
  reportId: ReportId;
  loads?: Load[];
  quotes?: Quote[];
  leads?: Lead[];
  payments?: Payment[];
  payouts?: DriverPayout[];
  periodContext?: ReportAnalyticsPeriodContext;
  compact?: boolean;
}

interface TooltipEntry {
  color?: string;
  dataKey?: string;
  name?: string;
  value?: number | string;
  payload?: Record<string, unknown>;
}

interface ChartThemeColors {
  axis: string;
  grid: string;
  cursor: string;
  foreground: string;
  surface: string;
}

const DARK_CHART_THEME: ChartThemeColors = {
  axis: "#CBD5E1",
  grid: "rgba(148, 163, 184, 0.34)",
  cursor: "rgba(148, 163, 184, 0.18)",
  foreground: "#F8FAFC",
  surface: "#111827",
};

const LIGHT_CHART_THEME: ChartThemeColors = {
  axis: "#334155",
  grid: "rgba(71, 85, 105, 0.30)",
  cursor: "rgba(37, 99, 235, 0.10)",
  foreground: "#0F172A",
  surface: "#FFFFFF",
};

interface SafeBarValueLabelProps {
  x?: number | string;
  y?: number | string;
  width?: number | string;
  height?: number | string;
  value?: unknown;
  series: ReportAnalyticsSeries;
  horizontal: boolean;
  color: string;
}

function useChartThemeColors(): ChartThemeColors {
  const [colors, setColors] = React.useState<ChartThemeColors>(
    LIGHT_CHART_THEME,
  );

  React.useEffect(() => {
    const update = () => {
      const isDark = document.documentElement.classList.contains("dark");
      setColors(isDark ? DARK_CHART_THEME : LIGHT_CHART_THEME);
    };

    update();
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "style"],
    });
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    media.addEventListener?.("change", update);

    return () => {
      observer.disconnect();
      media.removeEventListener?.("change", update);
    };
  }, []);

  return colors;
}

function finiteNumber(value: unknown, fallback = 0): number {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function sanitizeChartData(
  chart: ReportAnalyticsChart,
): ReportAnalyticsChart["data"] {
  return chart.data.map((point) => {
    const safePoint = { ...point };

    chart.series.forEach((series) => {
      safePoint[series.key] = finiteNumber(point[series.key], 0);
    });

    return safePoint;
  });
}

function SafeBarValueLabel({
  x,
  y,
  width,
  height,
  value,
  series,
  horizontal,
  color,
}: SafeBarValueLabelProps) {
  const numericValue = finiteNumber(value, Number.NaN);
  const numericX = finiteNumber(x, Number.NaN);
  const numericY = finiteNumber(y, Number.NaN);
  const numericWidth = finiteNumber(width, Number.NaN);
  const numericHeight = finiteNumber(height, Number.NaN);

  if (
    !Number.isFinite(numericValue) ||
    !Number.isFinite(numericX) ||
    !Number.isFinite(numericY) ||
    !Number.isFinite(numericWidth) ||
    !Number.isFinite(numericHeight)
  ) {
    return null;
  }

  const labelX = horizontal
    ? numericX + Math.max(0, numericWidth) + 8
    : numericX + numericWidth / 2;
  const labelY = horizontal
    ? numericY + numericHeight / 2
    : numericY - 6;

  return (
    <text
      x={labelX}
      y={labelY}
      fill={color}
      fontSize={12}
      textAnchor={horizontal ? "start" : "middle"}
      dominantBaseline={horizontal ? "middle" : "auto"}
    >
      {formatSeriesValue(numericValue, series)}
    </text>
  );
}

function formatSeriesValue(
  value: number,
  series?: ReportAnalyticsSeries,
): string {
  if (!Number.isFinite(value)) return "—";

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

function formatTooltipFieldValue(
  value: unknown,
  field: ReportAnalyticsTooltipField,
): string {
  if (field.format === "text") return String(value ?? "—");
  const number = Number(value ?? 0);
  if (!Number.isFinite(number)) return String(value ?? "—");
  return formatSeriesValue(number, {
    key: field.key,
    label: field.label,
    color: "",
    format: field.format,
  });
}

function formatAxisValue(
  value: number | string,
  series: ReportAnalyticsSeries[],
): string {
  const number = Number(value);
  if (!Number.isFinite(number)) return String(value);

  if (series.some((item) => item.format === "currency")) {
    const absolute = Math.abs(number);
    if (absolute >= 1_000_000) return `$${(number / 1_000_000).toFixed(1)}M`;
    if (absolute >= 1_000) return `$${(number / 1_000).toFixed(0)}k`;
    return `$${number.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  }

  if (series.some((item) => item.format === "percentage")) {
    return `${number.toFixed(0)}%`;
  }

  return new Intl.NumberFormat("en-US", {
    notation: Math.abs(number) >= 10_000 ? "compact" : "standard",
    maximumFractionDigits: 1,
  }).format(number);
}

function truncateAxisLabel(value: unknown, maxCharacters = 24): string {
  const text = String(value ?? "");
  return text.length > maxCharacters
    ? `${text.slice(0, Math.max(1, maxCharacters - 1))}…`
    : text;
}

function AnalyticsTooltip({
  active,
  payload,
  label,
  chart,
}: {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string;
  chart: ReportAnalyticsChart;
}) {
  if (!active || !payload?.length) return null;

  const first = payload[0];
  const dataPoint = first.payload ?? {};
  const categoryLabel = String(
    dataPoint.label ||
      (chart.kind === "donut" ? first.name : label) ||
      "",
  );

  return (
    <div className="w-max min-w-44 max-w-[min(20rem,calc(100vw-2rem))] rounded-xl border border-border/80 bg-popover/98 px-3.5 py-3 text-sm text-popover-foreground shadow-2xl backdrop-blur-xl">
      {categoryLabel ? (
        <p className="mb-2 max-w-72 break-words font-semibold text-foreground">
          {categoryLabel}
        </p>
      ) : null}
      <div className="space-y-1.5">
        {payload.map((entry, index) => {
          const key = String(entry.dataKey || "value");
          const series =
            chart.series.find((item) => item.key === key) ??
            chart.series[index];
          const value = Number(entry.value ?? 0);
          return (
            <div
              key={`${key}-${index}`}
              className="flex items-start justify-between gap-4"
            >
              <span className="flex min-w-0 flex-1 items-start gap-2 text-slate-700 dark:text-slate-300">
                <span
                  className="mt-0.5 size-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: entry.color || series?.color }}
                />
                <span className="min-w-0 break-words leading-snug">
                  {series?.label || entry.name || key}
                </span>
              </span>
              <span className="shrink-0 font-bold text-foreground">
                {formatSeriesValue(value, series)}
              </span>
            </div>
          );
        })}

        {chart.tooltipFields?.length ? (
          <div className="mt-2 space-y-1.5 border-t border-border/70 pt-2">
            {chart.tooltipFields.map((field) => (
              <div
                key={field.key}
                className="flex max-w-72 items-start justify-between gap-4"
              >
                <span className="min-w-0 flex-1 break-words leading-snug text-slate-700 dark:text-slate-300">
                  {field.label}
                </span>
                <span
                  className={`min-w-0 text-right font-semibold text-foreground ${
                    field.format === "text"
                      ? "max-w-44 whitespace-normal break-words"
                      : "shrink-0"
                  }`}
                >
                  {formatTooltipFieldValue(dataPoint[field.key], field)}
                </span>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function DonutChartCard({
  chart,
  compact,
}: {
  chart: ReportAnalyticsChart;
  compact: boolean;
}) {
  const total = chart.data.reduce(
    (sum, item) => sum + Number(item.value || 0),
    0,
  );
  const height = compact ? 230 : 250;

  return (
    <div className="grid min-w-0 gap-4 sm:grid-cols-[minmax(190px,0.8fr)_minmax(0,1.2fr)] sm:items-center">
      <div className="relative mx-auto size-52 shrink-0 overflow-visible">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart style={{ overflow: "visible" }}>
            <Pie
              data={chart.data}
              dataKey="value"
              nameKey="label"
              cx="50%"
              cy="50%"
              innerRadius={58}
              outerRadius={92}
              paddingAngle={2}
              strokeWidth={0}
            >
              {chart.data.map((entry, index) => (
                <Cell
                  key={`${entry.label}-${index}`}
                  fill={
                    SUPRAH_ANALYTICS_COLORS[
                      index % SUPRAH_ANALYTICS_COLORS.length
                    ]
                  }
                />
              ))}
            </Pie>
            <Tooltip
              content={<AnalyticsTooltip chart={chart} />}
              allowEscapeViewBox={{ x: false, y: false }}
              cursor={false}
              offset={12}
              wrapperStyle={{
                zIndex: 100,
                pointerEvents: "none",
                maxWidth: "min(18rem, calc(100vw - 1.5rem))",
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-black tracking-tight text-foreground">
            {total.toLocaleString("en-US")}
          </span>
          <span className="mt-1 text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
            records
          </span>
        </div>
      </div>

      <div
        className="max-h-[250px] space-y-2 overflow-y-auto pr-1"
        style={{ minHeight: height }}
      >
        {chart.data.map((item, index) => {
          const value = Number(item.value || 0);
          const percentage = total > 0 ? (value / total) * 100 : 0;
          return (
            <div
              key={`${item.label}-${index}`}
              className="flex min-w-0 items-center gap-3 rounded-lg border border-border/60 bg-muted/20 px-3 py-2.5"
            >
              <span
                className="size-2.5 shrink-0 rounded-full"
                style={{
                  backgroundColor:
                    SUPRAH_ANALYTICS_COLORS[
                      index % SUPRAH_ANALYTICS_COLORS.length
                    ],
                }}
              />
              <span className="min-w-0 flex-1 break-words text-sm font-medium text-slate-700 dark:text-slate-300">
                {item.label}
              </span>
              <span className="shrink-0 text-sm font-bold text-foreground">
                {value.toLocaleString("en-US")}
                <span className="ml-1 font-normal text-slate-600 dark:text-slate-400">
                  ({percentage.toFixed(1)}%)
                </span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ChartInsights({
  chart,
  compact,
}: {
  chart: ReportAnalyticsChart;
  compact: boolean;
}) {
  if (!chart.insights?.length) return null;
  const insights = chart.insights.slice(0, compact ? 2 : 3);

  return (
    <div className="mb-3 grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2">
      {insights.map((insight) => (
        <div
          key={`${insight.label}-${insight.value}`}
          className="min-w-0 rounded-lg border border-primary/10 bg-primary/[0.035] px-3 py-2.5"
        >
          <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
            {insight.label}
          </p>
          <p className="mt-1 break-words text-sm font-bold text-foreground">
            {insight.value}
          </p>
          {insight.description ? (
            <p className="mt-1 text-sm leading-6 text-slate-700 dark:text-slate-300">
              {insight.description}
            </p>
          ) : null}
        </div>
      ))}
    </div>
  );
}


function SeriesLegend({
  series,
}: {
  series: ReportAnalyticsSeries[];
}) {
  if (series.length <= 1) return null;

  return (
    <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
      {series.map((item) => (
        <div
          key={item.key}
          className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300"
        >
          <span
            className="size-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: item.color }}
          />
          <span>{item.label}</span>
        </div>
      ))}
    </div>
  );
}

function ChartFooterItems({ chart }: { chart: ReportAnalyticsChart }) {
  if (!chart.footerItems?.length) return null;

  return (
    <div className="mt-3 space-y-2 border-t border-border/70 pt-3">
      {chart.footerItems.map((item) => (
        <div
          key={item.label}
          className="flex min-w-0 items-start gap-3 rounded-lg border border-border/70 bg-muted/20 px-3 py-2.5"
        >
          <span
            className="mt-1 size-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: item.color || SUPRAH_ANALYTICS_COLORS[7] }}
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-sm font-bold text-foreground">{item.label}</p>
              <p className="max-w-full break-words text-right text-sm font-black text-foreground">
                {item.displayValue ||
                  finiteNumber(item.value).toLocaleString("en-US")}
              </p>
            </div>
            {item.description ? (
              <p className="mt-1 text-sm leading-6 text-slate-700 dark:text-slate-300">
                {item.description}
              </p>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}

function BaselineCard({ chart }: { chart: ReportAnalyticsChart }) {
  if (!chart.baseline) return null;

  return (
    <div className="mb-3 flex min-w-0 flex-col gap-1 rounded-lg border border-primary/15 bg-primary/[0.045] px-3.5 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <div className="min-w-0">
        <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
          {chart.baseline.label}
        </p>
        {chart.baseline.description ? (
          <p className="mt-1 text-sm leading-6 text-slate-700 dark:text-slate-300">
            {chart.baseline.description}
          </p>
        ) : null}
      </div>
      <p className="shrink-0 text-2xl font-black tracking-tight text-foreground">
        {finiteNumber(chart.baseline.value).toLocaleString("en-US")}
      </p>
    </div>
  );
}

function ComparisonBarsCard({ chart }: { chart: ReportAnalyticsChart }) {
  const data = sanitizeChartData(chart);
  const maxValue = Math.max(
    1,
    ...data.flatMap((point) =>
      chart.series.map((series) => finiteNumber(point[series.key])),
    ),
  );

  return (
    <div className="min-w-0">
      <SeriesLegend series={chart.series} />
      <div className="space-y-3">
        {data.map((point) => (
          <div
            key={String(point.label)}
            className="min-w-0 rounded-xl border border-border/70 bg-muted/10 p-3.5"
          >
            <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-bold text-foreground">{point.label}</p>
                {point.detail ? (
                  <p className="mt-1 text-sm leading-6 text-slate-700 dark:text-slate-300">
                    {String(point.detail)}
                  </p>
                ) : null}
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600 dark:text-slate-300">
                <span>
                  Conversion <strong className="text-foreground">{finiteNumber(point.conversionRate).toFixed(1)}%</strong>
                </span>
                <span>
                  Avg. rate <strong className="text-foreground">{formatSeriesValue(finiteNumber(point.averageRate), { key: "averageRate", label: "Average rate", color: "", format: "currency" })}</strong>
                </span>
              </div>
            </div>

            <div className="space-y-2.5">
              {chart.series.map((series) => {
                const value = finiteNumber(point[series.key]);
                const width = (value / maxValue) * 100;
                return (
                  <div key={series.key} className="grid min-w-0 grid-cols-[minmax(7.5rem,auto)_1fr_auto] items-center gap-3">
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {series.label}
                    </span>
                    <div className="h-3 min-w-0 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full transition-[width] duration-300"
                        style={{
                          width: `${Math.max(0, Math.min(100, width))}%`,
                          backgroundColor: series.color,
                        }}
                      />
                    </div>
                    <span className="min-w-8 text-right text-sm font-black text-foreground">
                      {formatSeriesValue(value, series)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <ChartFooterItems chart={chart} />
    </div>
  );
}

function WorkloadBarsCard({ chart }: { chart: ReportAnalyticsChart }) {
  const data = sanitizeChartData(chart);
  const baseline = Math.max(1, finiteNumber(chart.baseline?.value));

  return (
    <div className="min-w-0">
      <BaselineCard chart={chart} />
      <div className="grid min-w-0 grid-cols-1 gap-3 lg:grid-cols-3">
        {data.map((point, index) => {
          const value = finiteNumber(point.value);
          const share = Number.isFinite(Number(point.share))
            ? finiteNumber(point.share)
            : (value / baseline) * 100;
          const color = String(
            point.color ||
              SUPRAH_ANALYTICS_COLORS[index % SUPRAH_ANALYTICS_COLORS.length],
          );

          return (
            <div
              key={String(point.label)}
              className="min-w-0 rounded-xl border border-border/70 bg-muted/10 p-3.5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: color }}
                    />
                    <p className="break-words text-sm font-bold text-foreground">
                      {point.label}
                    </p>
                  </div>
                  <p className="mt-2 text-2xl font-black tracking-tight text-foreground">
                    {value.toLocaleString("en-US")}
                  </p>
                </div>
                <span className="shrink-0 rounded-full border border-border bg-background px-2 py-1 text-xs font-bold text-slate-600 dark:text-slate-300">
                  {share.toFixed(1)}%
                </span>
              </div>
              <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.max(0, Math.min(100, share))}%`,
                    backgroundColor: color,
                  }}
                />
              </div>
              <p className="mt-2 min-h-16 text-sm leading-6 text-slate-700 dark:text-slate-300">
                {String(point.detail || "No additional description available.")}
              </p>
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-700 dark:text-slate-300">
        A lead may appear in more than one group.
      </p>
      <ChartFooterItems chart={chart} />
    </div>
  );
}

function RankingBarsCard({ chart }: { chart: ReportAnalyticsChart }) {
  const data = sanitizeChartData(chart);
  const maxValue = Math.max(1, ...data.map((point) => finiteNumber(point.value)));
  const maxVisibleRows = Math.max(1, chart.maxVisibleRows ?? 8);
  const scrollable = data.length > maxVisibleRows;

  return (
    <div className="min-w-0">
      {data.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm font-medium leading-6 text-slate-700 dark:text-slate-300">
          No recognized lead sources are available for the selected filters.
        </div>
      ) : (
        <div
          className={`space-y-2 pr-1 ${scrollable ? "overflow-y-auto" : ""}`}
          style={
            scrollable
              ? { maxHeight: `${maxVisibleRows * 72}px` }
              : undefined
          }
        >
          {data.map((point, index) => {
            const value = finiteNumber(point.value);
            const share = finiteNumber(point.share);
            const color = String(
              point.color ||
                SUPRAH_ANALYTICS_COLORS[index % SUPRAH_ANALYTICS_COLORS.length],
            );
            const rankLabel = String(
              point.rankLabel || point.rank || index + 1,
            );

            return (
              <div
                key={`${rankLabel}-${point.label}`}
                className="grid min-w-0 grid-cols-[3rem_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-border/70 bg-muted/10 px-3 py-2.5"
              >
                <span
                  className="flex size-8 items-center justify-center justify-self-center rounded-full border border-primary/25 bg-primary/10 text-xs font-black text-primary"
                  aria-label={`Rank ${rankLabel}`}
                  title={`Rank ${rankLabel}`}
                >
                  {rankLabel}
                </span>
                <div className="min-w-0">
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: color }}
                    />
                    <p className="min-w-0 break-words text-sm font-bold text-foreground">
                      {point.label}
                    </p>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.max(0, Math.min(100, (value / maxValue) * 100))}%`,
                        backgroundColor: color,
                      }}
                    />
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-black text-foreground">
                    {value.toLocaleString("en-US")}
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    {share.toFixed(1)}%
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
      <ChartFooterItems chart={chart} />
    </div>
  );
}

function StackedProgressCard({ chart }: { chart: ReportAnalyticsChart }) {
  const data = sanitizeChartData(chart);
  const maxVisibleRows = Math.max(1, chart.maxVisibleRows ?? 8);
  const scrollable = data.length > maxVisibleRows;
  const deliveredSeries = chart.series.find((series) => series.key === "delivered");
  const openSeries = chart.series.find((series) => series.key === "remaining");

  return (
    <div className="min-w-0">
      <BaselineCard chart={chart} />
      <SeriesLegend series={chart.series} />
      {data.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm font-medium leading-6 text-slate-700 dark:text-slate-300">
          No driver assignments match the selected filters.
        </div>
      ) : (
        <div
          className={`space-y-3 pr-1 ${scrollable ? "overflow-y-auto" : ""}`}
          style={
            scrollable
              ? { maxHeight: `${maxVisibleRows * 112}px` }
              : undefined
          }
        >
          {data.map((point, index) => {
            const assigned = finiteNumber(point.assigned);
            const delivered = finiteNumber(point.delivered);
            const remaining = finiteNumber(point.remaining);
            const completionRate = finiteNumber(point.completionRate);
            const deliveredWidth = assigned > 0 ? (delivered / assigned) * 100 : 0;
            const remainingWidth = assigned > 0 ? (remaining / assigned) * 100 : 0;

            return (
              <div
                key={`${point.label}-${index}`}
                className="min-w-0 rounded-xl border border-border/70 bg-muted/10 p-3.5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="break-words text-sm font-bold text-foreground">
                      {point.label}
                    </p>
                    <p className="mt-1 text-sm leading-6 text-slate-700 dark:text-slate-300">
                      {String(point.rankLabel || `Driver ${index + 1}`)} · {completionRate.toFixed(1)}% completion
                    </p>
                  </div>
                  <div className="grid shrink-0 grid-cols-3 gap-3 text-right text-xs text-slate-600 dark:text-slate-300">
                    <span>
                      Delivered<br />
                      <strong className="text-sm text-foreground">{delivered}</strong>
                    </span>
                    <span>
                      Still Open<br />
                      <strong className="text-sm text-foreground">{remaining}</strong>
                    </span>
                    <span>
                      Total<br />
                      <strong className="text-sm text-foreground">{assigned}</strong>
                    </span>
                  </div>
                </div>
                <div className="mt-3 flex h-4 min-w-0 overflow-hidden rounded-full bg-muted">
                  {deliveredWidth > 0 ? (
                    <div
                      className="h-full"
                      title={`${delivered} delivered`}
                      style={{
                        width: `${Math.min(100, deliveredWidth)}%`,
                        backgroundColor:
                          deliveredSeries?.color || SUPRAH_ANALYTICS_COLORS[0],
                      }}
                    />
                  ) : null}
                  {remainingWidth > 0 ? (
                    <div
                      className="h-full"
                      title={`${remaining} still open`}
                      style={{
                        width: `${Math.min(100, remainingWidth)}%`,
                        backgroundColor:
                          openSeries?.color || SUPRAH_ANALYTICS_COLORS[3],
                      }}
                    />
                  ) : null}
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-300">
                  {delivered.toLocaleString("en-US")} delivered + {remaining.toLocaleString("en-US")} still open = {assigned.toLocaleString("en-US")} assigned
                </p>
              </div>
            );
          })}
        </div>
      )}
      <ChartFooterItems chart={chart} />
    </div>
  );
}

function SpecializedBarCard({ chart }: { chart: ReportAnalyticsChart }) {
  switch (chart.presentation) {
    case "comparison":
      return <ComparisonBarsCard chart={chart} />;
    case "workload":
      return <WorkloadBarsCard chart={chart} />;
    case "ranking":
      return <RankingBarsCard chart={chart} />;
    case "stacked-progress":
      return <StackedProgressCard chart={chart} />;
    default:
      return null;
  }
}

function CartesianChartCard({
  chart,
  compact,
}: {
  chart: ReportAnalyticsChart;
  compact: boolean;
}) {
  const theme = useChartThemeColors();
  const chartData = React.useMemo(() => sanitizeChartData(chart), [chart]);
  const isHorizontal = chart.kind === "bar" && chart.horizontal;
  const height = isHorizontal
    ? Math.max(compact ? 230 : 280, chartData.length * (compact ? 46 : 50) + 64)
    : compact
      ? 260
      : 315;
  const longestLabel = chartData.reduce(
    (maximum, item) => Math.max(maximum, String(item.label).length),
    0,
  );
  const categoryAxisWidth = Math.min(
    compact ? 160 : 210,
    Math.max(110, longestLabel * 7),
  );
  const allowDecimals = chart.series.some(
    (series) =>
      series.format === "currency" || series.format === "percentage",
  );

  if (chart.kind === "bar") {
    return (
      <div className="min-w-0">
        <SeriesLegend series={chart.series} />
        <ResponsiveContainer width="100%" height={height} minWidth={0}>
        <BarChart
          data={chartData}
          layout={isHorizontal ? "vertical" : "horizontal"}
          margin={{
            top: 10,
            right: isHorizontal ? 72 : 44,
            left: isHorizontal ? 10 : 8,
            bottom: 14,
          }}
          barCategoryGap="24%"
          barGap={6}
        >
          <CartesianGrid
            stroke={theme.grid}
            strokeOpacity={0.72}
            strokeDasharray="3 3"
            horizontal={!isHorizontal}
            vertical={isHorizontal}
          />
          {isHorizontal ? (
            <>
              <XAxis
                type="number"
                domain={[
                  0,
                  (dataMax: number) =>
                    Math.max(1, Math.ceil(finiteNumber(dataMax) * 1.18)),
                ]}
                tickLine={false}
                axisLine={false}
                allowDecimals={allowDecimals}
                tick={{
                  fontSize: 12,
                  fill: theme.axis,
                }}
                tickFormatter={(value: number | string) =>
                  formatAxisValue(value, chart.series)
                }
              />
              <YAxis
                type="category"
                dataKey="label"
                width={categoryAxisWidth}
                tickLine={false}
                axisLine={false}
                tick={{
                  fontSize: 12,
                  fill: theme.axis,
                }}
                tickFormatter={(value: number | string) => truncateAxisLabel(value, 29)}
              />
            </>
          ) : (
            <>
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                interval={0}
                angle={chartData.length > 5 ? -18 : 0}
                textAnchor={chartData.length > 5 ? "end" : "middle"}
                height={chartData.length > 5 ? 58 : 34}
                tick={{
                  fontSize: 12,
                  fill: theme.axis,
                }}
                tickFormatter={(value: number | string) => truncateAxisLabel(value, 20)}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                allowDecimals={allowDecimals}
                tick={{
                  fontSize: 12,
                  fill: theme.axis,
                }}
                tickFormatter={(value: number | string) =>
                  formatAxisValue(value, chart.series)
                }
              />
            </>
          )}
          <Tooltip
            content={<AnalyticsTooltip chart={chart} />}
            cursor={{ fill: theme.cursor, fillOpacity: 0.22 }}
            allowEscapeViewBox={{ x: false, y: false }}
            offset={14}
            wrapperStyle={{
              zIndex: 100,
              pointerEvents: "none",
              maxWidth: "min(20rem, calc(100vw - 1.5rem))",
            }}
          />
          {chart.series.map((series, seriesIndex) => (
            <Bar
              key={series.key}
              dataKey={series.key}
              name={series.label}
              fill={series.color}
              stackId={chart.stacked ? "suprah-total" : undefined}
              radius={
                isHorizontal
                  ? chart.stacked
                    ? seriesIndex === chart.series.length - 1
                      ? [0, 6, 6, 0]
                      : [6, 0, 0, 6]
                    : [0, 6, 6, 0]
                  : [6, 6, 0, 0]
              }
              maxBarSize={36}
            >
              {chart.showValueLabels ? (
                <LabelList
                  dataKey={series.key}
                  content={
                    <SafeBarValueLabel
                      series={series}
                      horizontal={Boolean(isHorizontal)}
                      color={theme.axis}
                    />
                  }
                />
              ) : null}
            </Bar>
          ))}
        </BarChart>
        </ResponsiveContainer>
        <ChartFooterItems chart={chart} />
      </div>
    );
  }

  return (
    <div className="min-w-0">
      <SeriesLegend series={chart.series} />
      <ResponsiveContainer width="100%" height={height} minWidth={0}>
      <AreaChart
        data={chartData}
        margin={{ top: 12, right: 56, left: 12, bottom: 14 }}
      >
        <defs>
          {chart.series.map((series) => {
            const gradientId = `suprah-${chart.id}-${series.key}`.replace(
              /[^a-zA-Z0-9_-]/g,
              "-",
            );
            return (
              <linearGradient
                key={gradientId}
                id={gradientId}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop
                  offset="4%"
                  stopColor={series.color}
                  stopOpacity={chart.areaFill === false ? 0 : 0.24}
                />
                <stop
                  offset="68%"
                  stopColor={series.color}
                  stopOpacity={chart.areaFill === false ? 0 : 0.07}
                />
                <stop
                  offset="100%"
                  stopColor={series.color}
                  stopOpacity={0}
                />
              </linearGradient>
            );
          })}
        </defs>
        <CartesianGrid
          vertical={false}
          stroke={theme.grid}
          strokeOpacity={0.7}
          strokeDasharray="3 3"
        />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tick={{
            fontSize: 12,
            fill: theme.axis,
          }}
          tickFormatter={(value: number | string) => truncateAxisLabel(value, 18)}
          padding={{ left: 18, right: 18 }}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          allowDecimals={allowDecimals}
          tick={{
            fontSize: 12,
            fill: theme.axis,
          }}
          tickFormatter={(value: number | string) => formatAxisValue(value, chart.series)}
        />
        <Tooltip
          content={<AnalyticsTooltip chart={chart} />}
          cursor={{
            stroke: theme.foreground,
            strokeOpacity: 0.24,
            strokeWidth: 1.5,
            strokeDasharray: "4 4",
          }}
          allowEscapeViewBox={{ x: false, y: false }}
          offset={14}
          wrapperStyle={{
            zIndex: 100,
            pointerEvents: "none",
            maxWidth: "min(20rem, calc(100vw - 1.5rem))",
          }}
        />
        {chart.series.map((series) => {
          const gradientId = `suprah-${chart.id}-${series.key}`.replace(
            /[^a-zA-Z0-9_-]/g,
            "-",
          );
          return (
            <Area
              key={series.key}
              type="monotone"
              dataKey={series.key}
              name={series.label}
              stroke={series.color}
              strokeWidth={3}
              fill={`url(#${gradientId})`}
              fillOpacity={1}
              dot={{
                r: 3.5,
                fill: theme.surface,
                stroke: series.color,
                strokeWidth: 2,
              }}
              activeDot={{
                r: 6,
                fill: "#FFFFFF",
                stroke: series.color,
                strokeWidth: 3,
                filter: "drop-shadow(0 0 6px rgba(255,255,255,0.8))",
              }}
              connectNulls
            />
          );
        })}
      </AreaChart>
      </ResponsiveContainer>
      <ChartFooterItems chart={chart} />
    </div>
  );
}

export function ReportAnalyticsPanel({
  reportId,
  loads = [],
  quotes = [],
  leads = [],
  payments = [],
  payouts = [],
  periodContext,
  compact = false,
}: ReportAnalyticsPanelProps) {
  const model = React.useMemo(
    () =>
      buildReportAnalyticsModel({
        reportId,
        loads,
        quotes,
        leads,
        payments,
        payouts,
        periodContext,
      }),
    [leads, loads, payments, payouts, periodContext, quotes, reportId],
  );

  const availableCharts = model.charts.filter(hasReportAnalyticsChartData);
  const prioritizedCharts = compact
    ? [...availableCharts].sort(
        (first, second) =>
          (first.pdfPriority ?? Number.MAX_SAFE_INTEGER) -
          (second.pdfPriority ?? Number.MAX_SAFE_INTEGER),
      )
    : availableCharts;
  const charts = prioritizedCharts.slice(0, compact ? 2 : 3);
  if (charts.length === 0) return null;

  return (
    <section className="min-w-0 space-y-4 rounded-2xl border border-primary/15 bg-linear-to-br from-primary/[0.045] via-card to-card p-4 shadow-sm sm:p-5">
      <div className="flex min-w-0 items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
          <Sparkles className="size-4.5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-bold tracking-tight text-foreground sm:text-lg">
              {model.title}
            </h2>
            <span className="rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
              Suprah Analytics
            </span>
          </div>
          <p className="mt-1 max-w-4xl text-sm font-medium leading-6 text-slate-700 dark:text-slate-300">
            {model.description}
          </p>
        </div>
        <BarChart3 className="mt-1 size-5 shrink-0 text-primary/70" />
      </div>

      <div
        className={`grid min-w-0 gap-4 ${
          charts.length === 1
            ? "grid-cols-1"
            : "grid-cols-1 xl:grid-cols-2"
        }`}
      >
        {charts.map((chart, index) => (
          <article
            key={chart.id}
            className={`relative z-0 min-w-0 overflow-visible rounded-xl hover:z-20 focus-within:z-20 border border-border/80 bg-card p-4 shadow-sm ${
              charts.length === 3 && index === 2 ? "xl:col-span-2" : ""
            }`}
          >
            <div className="mb-3">
              <h3 className="text-base font-bold text-foreground sm:text-lg">
                {chart.title}
              </h3>
              <p className="mt-1 text-sm font-medium leading-6 text-slate-700 dark:text-slate-300">
                {chart.description}
              </p>
            </div>
            <ChartInsights chart={chart} compact={compact} />
            {chart.presentation && chart.presentation !== "default" ? (
              <SpecializedBarCard chart={chart} />
            ) : chart.kind === "donut" ? (
              <DonutChartCard chart={chart} compact={compact} />
            ) : (
              <CartesianChartCard chart={chart} compact={compact} />
            )}
          </article>
        ))}
      </div>
    </section>
  );
}

export default ReportAnalyticsPanel;
