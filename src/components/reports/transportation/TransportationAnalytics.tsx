"use client";

import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Pie,
  PieChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  AreaChart,
  Area,
} from "recharts";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Quote } from "@/types/transportation";
import { Load } from "@/types/load";

interface Props {
  loads: Load[];
  quotes: Quote[];
  rawLoads: Load[];
  rawQuotes: Quote[];
  monthLabel: string;
}

interface ChartThemeColors {
  axis: string;
  grid: string;
  cursor: string;
}

function normalizeCssColor(rawValue: string, fallback: string): string {
  const value = rawValue.trim();
  if (!value) return fallback;
  if (
    value.startsWith("#") ||
    value.startsWith("rgb") ||
    value.startsWith("hsl") ||
    value.startsWith("oklch") ||
    value.startsWith("oklab") ||
    value.startsWith("lab") ||
    value.startsWith("lch") ||
    value.startsWith("color(")
  ) {
    return value;
  }
  return `hsl(${value})`;
}

function useChartThemeColors(): ChartThemeColors {
  const [colors, setColors] = React.useState<ChartThemeColors>({
    axis: "#64748B",
    grid: "#CBD5E1",
    cursor: "#E2E8F0",
  });

  React.useEffect(() => {
    const update = () => {
      const rootStyles = window.getComputedStyle(document.documentElement);
      const bodyStyles = document.body
        ? window.getComputedStyle(document.body)
        : rootStyles;
      const read = (name: string, fallback: string) =>
        normalizeCssColor(
          rootStyles.getPropertyValue(name) || bodyStyles.getPropertyValue(name),
          fallback,
        );
      setColors({
        axis: read("--muted-foreground", "#64748B"),
        grid: read("--border", "#CBD5E1"),
        cursor: read("--muted", "#E2E8F0"),
      });
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

// Suprah AI semantic status palette used consistently by chart slices,
// legends, and tooltips across the Reports module.
const STATUS_FILL: Record<string, string> = {
  Draft: "#94A3B8",
  draft: "#94A3B8",

  Posted: "#F59E0B",
  posted: "#F59E0B",

  Assigned: "#8B5CF6",
  assigned: "#8B5CF6",

  Accepted: "#A855F7",
  accepted: "#A855F7",

  "Picked Up": "#06B6D4",
  "picked up": "#06B6D4",

  "In-Transit": "#2563EB",
  "in-transit": "#2563EB",

  Delivered: "#10B981",
  delivered: "#10B981",

  Cancelled: "#EF4444",
  cancelled: "#EF4444",
};

// Quote statuses follow the same Suprah AI semantic color language.
const QUOTE_STATUS_FILL: Record<string, string> = {
  pending: "#F59E0B",
  accepted: "#10B981",
  booked: "#2563EB",
  rejected: "#EF4444",
};

function parseSelectedPeriod(monthLabel: string): Date {
  const [monthName, yearText] = monthLabel.trim().split(/\s+/);
  const monthIndex = [
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
  ].findIndex(
    (month) => month.toLowerCase() === monthName?.toLowerCase(),
  );
  const year = Number(yearText);

  if (monthIndex < 0 || !Number.isFinite(year)) {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }

  return new Date(year, monthIndex, 1);
}

function buildLoadStatusData(loads: Load[]) {
  const counts: Record<string, number> = {};
  loads.forEach((l) => {
    counts[l.status] = (counts[l.status] || 0) + 1;
  });
  return Object.entries(counts).map(([name, value]) => ({ name, value }));
}

function buildQuoteStatusData(quotes: Quote[]) {
  const counts: Record<string, number> = {};
  quotes.forEach((q) => {
    const key = q.status || "unknown";
    counts[key] = (counts[key] || 0) + 1;
  });
  return Object.entries(counts).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value,
    key: name,
  }));
}

function buildMonthlyLoadTrend(rawLoads: Load[], monthLabel: string) {
  const selectedPeriod = parseSelectedPeriod(monthLabel);
  const months: { key: string; label: string }[] = [];

  for (let offset = 3; offset >= 0; offset--) {
    const d = new Date(
      selectedPeriod.getFullYear(),
      selectedPeriod.getMonth() - offset,
      1,
    );
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
      timeZone: "America/Denver",
    });
    months.push({ key, label });
  }

  return months.map(({ key, label }) => {
    const monthLoads = rawLoads.filter((load) =>
      load.createdAt?.startsWith(key),
    );
    const total = monthLoads.length;
    const delivered = monthLoads.filter(
      (load) => load.status === "Delivered",
    ).length;
    const revenue = monthLoads.reduce(
      (sum, load) =>
        sum +
        (load.pricing?.carrierPayAmount ||
          load.pricing?.estimatedRate ||
          0),
      0,
    );

    return { month: label, total, delivered, revenue };
  });
}

function buildMonthlyQuoteTrend(rawQuotes: Quote[], monthLabel: string) {
  const selectedPeriod = parseSelectedPeriod(monthLabel);
  const months: { key: string; label: string }[] = [];

  for (let offset = 3; offset >= 0; offset--) {
    const d = new Date(
      selectedPeriod.getFullYear(),
      selectedPeriod.getMonth() - offset,
      1,
    );
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
      timeZone: "America/Denver",
    });
    months.push({ key, label });
  }

  return months.map(({ key, label }) => {
    const monthQuotes = rawQuotes.filter((quote) =>
      quote.createdAt?.startsWith(key),
    );
    const total = monthQuotes.length;
    const booked = monthQuotes.filter(
      (quote) => quote.status === "booked",
    ).length;
    const value = monthQuotes.reduce(
      (sum, quote) => sum + (quote.rate || 0),
      0,
    );

    return { month: label, total, booked, value };
  });
}

interface TrendTooltipEntry {
  color?: string;
  name?: string;
  value?: number | string | null;
}

interface TrendTooltipProps {
  active?: boolean;
  payload?: TrendTooltipEntry[];
  label?: string;
}

function ChartTooltip({ active, payload, label }: TrendTooltipProps) {
  if (!active || !payload?.length) return null;
  const hasPositiveValue = payload.some(
    (entry) => Number(entry.value ?? 0) > 0,
  );
  if (!hasPositiveValue) return null;
  return (
    <div className="w-max max-w-[min(18rem,calc(100vw-2rem))] rounded-xl border border-border/80 bg-card px-4 py-3 text-sm shadow-lg">
      <p className="mb-1.5 font-bold text-foreground">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} style={{ color: entry.color }} className="font-semibold">
          {entry.name}:{" "}
          {typeof entry.value === "number" &&
            entry.name?.toLowerCase().includes("revenue")
            ? `$${entry.value.toLocaleString()}`
            : entry.value}
        </p>
      ))}
    </div>
  );
}

interface PieTooltipEntry {
  color?: string;
  fill?: string;
  name: string;
  value: number;
  payload?: {
    fill?: string;
  };
}

interface PieTooltipProps {
  active?: boolean;
  payload?: PieTooltipEntry[];
}

function PieTooltip({ active, payload }: PieTooltipProps) {
  if (!active || !payload?.length) return null;

  const entry = payload[0];
  const accentColor =
    entry.color ||
    entry.fill ||
    entry.payload?.fill ||
    "var(--chart-1)";

  return (
    <div
      className="pointer-events-none relative z-[100] w-max min-w-[8.5rem] max-w-[min(18rem,calc(100vw-2rem))] rounded-xl border bg-card/98 px-4 py-3 text-sm shadow-2xl backdrop-blur-sm"
      style={{
        borderColor: accentColor,
        boxShadow: `0 14px 32px color-mix(in srgb, ${accentColor} 24%, transparent)`,
      }}
    >
      <p className="font-bold" style={{ color: accentColor }}>
        {entry.name}
      </p>
      <p className="mt-0.5 font-semibold text-foreground">
        {entry.value} item{entry.value !== 1 ? "s" : ""}
      </p>
    </div>
  );
}

export function TransportationAnalytics({
  loads,
  quotes,
  rawLoads,
  rawQuotes,
  monthLabel,
}: Props) {
  const chartTheme = useChartThemeColors();
  const loadStatusData = React.useMemo(
    () => buildLoadStatusData(loads),
    [loads],
  );
  const quoteStatusData = React.useMemo(
    () => buildQuoteStatusData(quotes),
    [quotes],
  );
  const loadTrend = React.useMemo(
    () => buildMonthlyLoadTrend(rawLoads, monthLabel),
    [rawLoads, monthLabel],
  );
  const quoteTrend = React.useMemo(
    () => buildMonthlyQuoteTrend(rawQuotes, monthLabel),
    [rawQuotes, monthLabel],
  );
  const loadTrendData = React.useMemo(
    () => loadTrend.slice(-4),
    [loadTrend],
  );

  const quoteTrendData = React.useMemo(
    () => quoteTrend.slice(-4),
    [quoteTrend],
  );
  const hasLoadTrendData = React.useMemo(
    () =>
      loadTrendData.some(
        (point) =>
          point.total > 0 ||
          point.delivered > 0 ||
          point.revenue > 0,
      ),
    [loadTrendData],
  );

  const hasQuoteTrendData = React.useMemo(
    () =>
      quoteTrendData.some(
        (point) => point.total > 0 || point.booked > 0 || point.value > 0,
      ),
    [quoteTrendData],
  );

  const totalLoads = loads.length;
  const delivered = loads.filter((l) => l.status === "Delivered").length;
  const successRate =
    totalLoads > 0 ? Math.round((delivered / totalLoads) * 100) : 0;

  const totalQuotes = quotes.length;
  const booked = quotes.filter((q) => q.status === "booked").length;
  const conversionRate =
    totalQuotes > 0 ? Math.round((booked / totalQuotes) * 100) : 0;

  return (
    <div className="grid min-w-0 grid-cols-1 gap-5 lg:grid-cols-2">
      <Card className="min-w-0 border-border shadow-sm lg:min-h-[380px]">
        <CardHeader className="space-y-1.5 pb-2 pt-5 sm:px-6">
          <CardTitle className="text-base font-bold tracking-tight sm:text-lg">
            Load Status Distribution
          </CardTitle>
          <CardDescription className="text-sm leading-relaxed">
            {monthLabel} — where loads are concentrated by status
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-5 pt-3 sm:flex-row sm:items-center sm:gap-6 sm:px-6 sm:pb-6">
          {totalLoads === 0 ? (
            <p className="w-full py-12 text-center text-sm leading-relaxed text-muted-foreground sm:text-base">
              No load data for this period.
            </p>
          ) : (
            <>
              <div className="relative isolate z-0 mx-auto shrink-0 overflow-visible sm:mx-0">
                <ResponsiveContainer width={210} height={210} className="relative z-20 overflow-visible">
                  <PieChart style={{ overflow: "visible" }}>
                    <Tooltip
                      content={<PieTooltip />}
                      allowEscapeViewBox={{ x: false, y: false }}
                      cursor={false}
                      wrapperStyle={{
                        zIndex: 100,
                        pointerEvents: "none",
                        maxWidth: "min(18rem, calc(100vw - 1.5rem))",
                      }}
                    />
                    <Pie
                      data={loadStatusData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={62}
                      outerRadius={94}
                      paddingAngle={2}
                      strokeWidth={0}
                    >
                      {loadStatusData.map((entry, i) => (
                        <Cell
                          key={i}
                          fill={STATUS_FILL[entry.name] ?? "#64748B"}
                        />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 z-0 flex flex-col items-center justify-center">
                  {successRate > 0 ? (
                    <>
                      <span className="text-3xl font-bold leading-none text-foreground sm:text-4xl">
                        {successRate}%
                      </span>
                      <span className="mt-1 text-xs font-medium text-muted-foreground sm:text-sm">
                        delivered
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="text-3xl font-bold leading-none text-foreground sm:text-4xl">
                        {totalLoads}
                      </span>
                      <span className="mt-1 text-xs font-medium text-muted-foreground sm:text-sm">
                        total
                      </span>
                    </>
                  )}
                </div>
              </div>
              <div className="flex w-full flex-col gap-3 sm:min-w-0 sm:flex-1">
                {loadStatusData.map((entry) => (
                  <div
                    key={entry.name}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-muted/20 px-3 py-2"
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span
                        className="size-2.5 shrink-0 rounded-full"
                        style={{
                          backgroundColor:
                            STATUS_FILL[entry.name] ?? "#64748B",
                        }}
                      />
                      <span className="min-w-0 break-words text-sm font-medium text-muted-foreground">
                        {entry.name}
                      </span>
                    </div>
                    <span className="shrink-0 text-sm font-bold text-foreground sm:text-base">
                      {entry.value}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card className="min-w-0 border-border shadow-sm lg:min-h-[380px]">
        <CardHeader className="space-y-1.5 pb-2 pt-5 sm:px-6">
          <CardTitle className="text-base font-bold tracking-tight sm:text-lg">
            Quote Conversion
          </CardTitle>
          <CardDescription className="text-sm leading-relaxed">
            {monthLabel} — how many quotes progressed toward booking
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-5 pt-3 sm:flex-row sm:items-center sm:gap-6 sm:px-6 sm:pb-6">
          {totalQuotes === 0 ? (
            <p className="w-full py-12 text-center text-sm leading-relaxed text-muted-foreground sm:text-base">
              No quotes for this period.
            </p>
          ) : (
            <>
              <div className="relative isolate z-0 mx-auto shrink-0 overflow-visible sm:mx-0">
                <ResponsiveContainer width={210} height={210} className="relative z-20 overflow-visible">
                  <PieChart style={{ overflow: "visible" }}>
                    <Tooltip
                      content={<PieTooltip />}
                      allowEscapeViewBox={{ x: false, y: false }}
                      cursor={false}
                      wrapperStyle={{
                        zIndex: 100,
                        pointerEvents: "none",
                        maxWidth: "min(18rem, calc(100vw - 1.5rem))",
                      }}
                    />
                    <Pie
                      data={quoteStatusData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={62}
                      outerRadius={94}
                      paddingAngle={2}
                      strokeWidth={0}
                    >
                      {quoteStatusData.map((entry, i) => (
                        <Cell
                          key={i}
                          fill={
                            QUOTE_STATUS_FILL[entry.key] ?? "#64748B"
                          }
                        />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 z-0 flex flex-col items-center justify-center">
                  {conversionRate > 0 ? (
                    <>
                      <span className="text-3xl font-bold leading-none text-foreground sm:text-4xl">
                        {conversionRate}%
                      </span>
                      <span className="mt-1 text-xs font-medium text-muted-foreground sm:text-sm">
                        booked
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="text-3xl font-bold leading-none text-foreground sm:text-4xl">
                        {totalQuotes}
                      </span>
                      <span className="mt-1 text-xs font-medium text-muted-foreground sm:text-sm">
                        total
                      </span>
                    </>
                  )}
                </div>
              </div>
              <div className="flex w-full flex-col gap-3 sm:min-w-0 sm:flex-1">
                {quoteStatusData.map((entry) => (
                  <div
                    key={entry.name}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-muted/20 px-3 py-2"
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span
                        className="size-2.5 shrink-0 rounded-full"
                        style={{
                          backgroundColor:
                            QUOTE_STATUS_FILL[entry.key] ?? "#64748B",
                        }}
                      />
                      <span className="min-w-0 break-words text-sm font-medium text-muted-foreground">
                        {entry.name}
                      </span>
                    </div>
                    <span className="shrink-0 text-sm font-bold text-foreground sm:text-base">
                      {entry.value}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card className="min-w-0 border-border shadow-sm lg:min-h-[380px]">
        <CardHeader className="space-y-1.5 pb-2 pt-5 sm:px-6">
          <CardTitle className="text-base font-bold tracking-tight sm:text-lg">
            Delivery Throughput
          </CardTitle>
          <CardDescription className="text-sm leading-relaxed">
            Latest 4 months — completed loads compared with total volume
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-3 sm:px-6 sm:pb-6">
          {!hasLoadTrendData ? (
            <p className="w-full py-12 text-center text-sm leading-relaxed text-muted-foreground sm:text-base">
              No trend data available.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={loadTrendData} barCategoryGap="24%" barGap={6} margin={{ top: 8, right: 36, left: 8, bottom: 12 }}>
                <CartesianGrid
                  vertical={false}
                  strokeDasharray="3 3"
                  stroke={chartTheme.grid}
                />
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 13, fill: chartTheme.axis }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  width={42}
                  tick={{ fontSize: 13, fill: chartTheme.axis }}
                />
                <Tooltip
                  content={<ChartTooltip />}
                  cursor={{ fill: chartTheme.cursor, fillOpacity: 0.22 }}
                  allowEscapeViewBox={{ x: false, y: false }}
                  offset={12}
                  wrapperStyle={{
                    zIndex: 100,
                    pointerEvents: "none",
                    maxWidth: "min(18rem, calc(100vw - 1.5rem))",
                  }}
                />
                <Bar
                  dataKey="total"
                  fill="var(--chart-3)"
                  radius={[5, 5, 0, 0]}
                  maxBarSize={34}
                  name="Total Loads"
                />
                <Bar
                  dataKey="delivered"
                  fill="var(--chart-1)"
                  radius={[5, 5, 0, 0]}
                  maxBarSize={34}
                  name="Completed"
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card className="min-w-0 border-border shadow-sm lg:min-h-[380px]">
        <CardHeader className="space-y-1.5 pb-2 pt-5 sm:px-6">
          <CardTitle className="text-base font-bold tracking-tight sm:text-lg">Revenue & Demand Trend</CardTitle>
          <CardDescription className="text-sm leading-relaxed">
            Latest 4 months — market engagement
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-3 sm:px-6 sm:pb-6">
          {!hasQuoteTrendData ? (
            <p className="w-full py-12 text-center text-sm leading-relaxed text-muted-foreground sm:text-base">
              No engagement data.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={quoteTrendData} margin={{ top: 8, right: 36, left: 8, bottom: 12 }}>
                <defs>
                  <linearGradient id="quoteGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor="var(--chart-4)"
                      stopOpacity={0.3}
                    />
                    <stop
                      offset="95%"
                      stopColor="var(--chart-4)"
                      stopOpacity={0}
                    />
                  </linearGradient>
                  <linearGradient id="bookedGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor="var(--chart-2)"
                      stopOpacity={0.3}
                    />
                    <stop
                      offset="95%"
                      stopColor="var(--chart-2)"
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  vertical={false}
                  strokeDasharray="3 3"
                  stroke={chartTheme.grid}
                />
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 13, fill: chartTheme.axis }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  width={42}
                  tick={{ fontSize: 13, fill: chartTheme.axis }}
                />
                <Tooltip
                  content={<ChartTooltip />}
                  cursor={{ stroke: chartTheme.grid }}
                  allowEscapeViewBox={{ x: false, y: false }}
                  offset={12}
                  wrapperStyle={{
                    zIndex: 100,
                    pointerEvents: "none",
                    maxWidth: "min(18rem, calc(100vw - 1.5rem))",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke="var(--chart-4)"
                  fill="url(#quoteGrad)"
                  strokeWidth={3}
                  name="Inquiries"
                />
                <Area
                  type="monotone"
                  dataKey="booked"
                  stroke="var(--chart-2)"
                  fill="url(#bookedGrad)"
                  strokeWidth={3}
                  name="Conversions"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}