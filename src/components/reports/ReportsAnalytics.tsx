"use client";

import * as React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { BarChart2, PackageCheck, TrendingUp } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Payment } from "@/types/billing";
import type { Load } from "@/types/load";
import { formatCurrency } from "@/utils/format";

interface Props {
  loads: Load[];
  rawPayments: Payment[];
  monthLabel: string;
}

interface ChartThemeColors {
  axis: string;
  grid: string;
  cursor: string;
  revenueBar: string;
  revenueBarActive: string;
}

const DARK_CHART_THEME: ChartThemeColors = {
  axis: "#CBD5E1",
  grid: "rgba(148, 163, 184, 0.34)",
  cursor: "rgba(148, 163, 184, 0.18)",
  revenueBar: "#A78BFA",
  revenueBarActive: "#C4B5FD",
};

const LIGHT_CHART_THEME: ChartThemeColors = {
  axis: "#334155",
  grid: "rgba(71, 85, 105, 0.30)",
  cursor: "rgba(37, 99, 235, 0.10)",
  revenueBar: "#6D28D9",
  revenueBarActive: "#5B21B6",
};

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

const STATUS_FILL: Record<string, string> = {
  Draft: "#64748B",
  draft: "#64748B",
  Posted: "#D97706",
  posted: "#D97706",
  Assigned: "#7C3AED",
  assigned: "#7C3AED",
  Accepted: "#9333EA",
  accepted: "#9333EA",
  "Picked Up": "#0891B2",
  "picked up": "#0891B2",
  "In-Transit": "#2563EB",
  "in-transit": "#2563EB",
  Delivered: "#059669",
  delivered: "#059669",
  Cancelled: "#DC2626",
  cancelled: "#DC2626",
};

function buildDeliveryData(loads: Load[]) {
  const counts: Record<string, number> = {};
  loads.forEach((load) => {
    counts[load.status] = (counts[load.status] || 0) + 1;
  });
  return Object.entries(counts).map(([name, value]) => ({ name, value }));
}

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

function buildRevenueData(rawPayments: Payment[], monthLabel: string) {
  const selectedPeriod = parseSelectedPeriod(monthLabel);
  const result: Array<{ month: string; revenue: number }> = [];

  for (let offset = 5; offset >= 0; offset -= 1) {
    const date = new Date(
      selectedPeriod.getFullYear(),
      selectedPeriod.getMonth() - offset,
      1,
    );
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const label = date.toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    });
    const revenue = rawPayments
      .filter(
        (payment) =>
          payment.status === "succeeded" &&
          payment.createdAt?.startsWith(key),
      )
      .reduce(
        (sum, payment) => sum + Number(payment.amount || 0),
        0,
      );

    result.push({ month: label, revenue });
  }

  return result;
}

function RevenueTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="w-max max-w-[min(18rem,calc(100vw-2rem))] rounded-xl border border-border/80 bg-popover px-4 py-3 text-sm text-popover-foreground shadow-2xl">
      <p className="mb-1 font-semibold text-slate-600 dark:text-slate-300">
        {label}
      </p>
      <p className="font-bold text-foreground">
        {formatCurrency(Number(payload[0].value || 0))}
      </p>
    </div>
  );
}

function DeliveryTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;

  const entry = payload[0];
  const count = Number(entry.value ?? 0);
  const accentColor =
    entry.color ||
    entry.fill ||
    entry.payload?.fill ||
    STATUS_FILL[entry.name] ||
    "#334155";

  return (
    <div
      className="pointer-events-none relative z-[100] w-max min-w-[8.5rem] max-w-[min(18rem,calc(100vw-2rem))] rounded-xl border bg-popover px-4 py-3 text-sm text-popover-foreground shadow-2xl"
      style={{ borderColor: accentColor }}
    >
      <p className="font-bold" style={{ color: accentColor }}>
        {entry.name}
      </p>
      <p className="mt-0.5 font-semibold text-foreground">
        {count} load{count !== 1 ? "s" : ""}
      </p>
    </div>
  );
}

function QuickStat({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className="flex min-w-0 flex-1 items-center gap-3.5">
      <div
        className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${color}`}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <p className="mb-1 break-words text-sm font-semibold leading-5 text-slate-700 dark:text-slate-300">
          {label}
        </p>
        <p className="text-xl font-bold leading-none text-foreground sm:text-2xl">
          {value}
        </p>
      </div>
    </div>
  );
}

function ChartEmptyState({ message }: { message: string }) {
  return (
    <div className="flex h-56 items-center justify-center rounded-xl border border-dashed border-border/80 bg-muted/20 px-6 text-center text-sm font-medium leading-6 text-slate-700 dark:text-slate-300 sm:text-base">
      {message}
    </div>
  );
}

export function ReportsAnalytics({ loads, rawPayments, monthLabel }: Props) {
  const deliveryData = React.useMemo(() => buildDeliveryData(loads), [loads]);
  const revenueData = React.useMemo(
    () => buildRevenueData(rawPayments, monthLabel),
    [rawPayments, monthLabel],
  );
  const chartTheme = useChartThemeColors();

  const totalLoads = loads.length;
  const delivered = loads.filter((load) => load.status === "Delivered").length;
  const successRate =
    totalLoads > 0 ? Math.round((delivered / totalLoads) * 100) : 0;
  const totalSixMoRev = revenueData.reduce(
    (sum, item) => sum + item.revenue,
    0,
  );
  const hasRevenueData = revenueData.some((item) => item.revenue > 0);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <BarChart2 className="size-5 text-slate-600 dark:text-slate-300" />
        <span className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
          Analytics Overview
        </span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-4 rounded-xl border border-border bg-card px-4 py-4 sm:grid-cols-3 sm:px-5">
        <QuickStat
          label={`Total Managed Loads — ${monthLabel}`}
          value={totalLoads}
          icon={<PackageCheck className="size-5" />}
          color="bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300"
        />
        <QuickStat
          label="Delivery Success Rate"
          value={`${successRate}%`}
          icon={<TrendingUp className="size-5" />}
          color="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
        />
        <QuickStat
          label="6-Month Total Revenue"
          value={formatCurrency(totalSixMoRev)}
          icon={<TrendingUp className="size-5" />}
          color="bg-violet-50 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300"
        />
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-5 lg:grid-cols-2">
        <Card className="min-w-0 border-border shadow-sm lg:min-h-[390px]">
          <CardHeader className="space-y-1.5 pb-2 pt-5 sm:px-6">
            <CardTitle className="text-base font-bold tracking-tight sm:text-lg">
              Delivery Performance
            </CardTitle>
            <CardDescription className="text-sm font-medium leading-6 text-slate-700 dark:text-slate-300">
              {monthLabel} — how effectively loads reached delivery
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-3 sm:px-6 sm:pb-6">
            {totalLoads === 0 ? (
              <ChartEmptyState message="No load data is available for this reporting period." />
            ) : (
              <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center sm:gap-6">
                <div className="relative isolate z-0 mx-auto size-[210px] shrink-0 overflow-visible sm:mx-0">
                  <PieChart width={210} height={210} style={{ overflow: "visible" }}>
                    <Tooltip
                      content={<DeliveryTooltip />}
                      allowEscapeViewBox={{ x: false, y: false }}
                      cursor={false}
                      wrapperStyle={{
                        zIndex: 100,
                        pointerEvents: "none",
                        maxWidth: "min(18rem, calc(100vw - 1.5rem))",
                      }}
                    />
                    <Pie
                      data={deliveryData}
                      dataKey="value"
                      nameKey="name"
                      cx={105}
                      cy={105}
                      innerRadius={62}
                      outerRadius={94}
                      paddingAngle={2}
                      strokeWidth={0}
                    >
                      {deliveryData.map((entry, index) => (
                        <Cell
                          key={`${entry.name}-${index}`}
                          fill={STATUS_FILL[entry.name] ?? "#64748B"}
                        />
                      ))}
                    </Pie>
                  </PieChart>
                  <div className="pointer-events-none absolute inset-0 z-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-bold leading-none text-foreground sm:text-4xl">
                      {successRate}%
                    </span>
                    <span className="mt-1.5 text-sm font-semibold text-slate-600 dark:text-slate-300">
                      delivered
                    </span>
                  </div>
                </div>

                <div className="flex w-full flex-col gap-3 sm:min-w-0 sm:flex-1">
                  {deliveryData.map((entry) => {
                    const percentage = Math.round(
                      (entry.value / totalLoads) * 100,
                    );
                    return (
                      <div
                        key={entry.name}
                        className="flex items-center gap-3 rounded-lg border border-border/70 bg-muted/25 px-3 py-2.5"
                      >
                        <span
                          className="size-3 shrink-0 rounded-full"
                          style={{
                            backgroundColor:
                              STATUS_FILL[entry.name] ?? "#64748B",
                          }}
                        />
                        <span className="min-w-0 flex-1 break-words text-sm font-semibold text-slate-700 dark:text-slate-300">
                          {entry.name}
                        </span>
                        <span className="shrink-0 text-sm font-bold text-foreground sm:text-base">
                          {entry.value}
                          <span className="ml-1 font-medium text-slate-600 dark:text-slate-300">
                            ({percentage}%)
                          </span>
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="min-w-0 border-border shadow-sm lg:min-h-[390px]">
          <CardHeader className="space-y-1.5 pb-2 pt-5 sm:px-6">
            <CardTitle className="text-base font-bold tracking-tight sm:text-lg">
              Monthly Revenue
            </CardTitle>
            <CardDescription className="text-sm font-medium leading-6 text-slate-700 dark:text-slate-300">
              Last 6 months — succeeded payments only
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-3 sm:px-6 sm:pb-6">
            {!hasRevenueData ? (
              <ChartEmptyState message="No succeeded-payment revenue is available for the last six months." />
            ) : (
              <ResponsiveContainer width="100%" height={290} minWidth={0}>
                <BarChart
                  data={revenueData}
                  barSize={38}
                  margin={{ top: 10, right: 36, left: 8, bottom: 14 }}
                >
                  <CartesianGrid
                    vertical={false}
                    strokeDasharray="4 4"
                    stroke={chartTheme.grid}
                    strokeWidth={1}
                  />
                  <XAxis
                    dataKey="month"
                    tickLine={false}
                    axisLine={{ stroke: chartTheme.grid }}
                    tick={{
                      fontSize: 13,
                      fontWeight: 600,
                      fill: chartTheme.axis,
                    }}
                    tickMargin={10}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    width={64}
                    tick={{
                      fontSize: 13,
                      fontWeight: 600,
                      fill: chartTheme.axis,
                    }}
                    tickMargin={8}
                    tickFormatter={(value) =>
                      value === 0
                        ? "$0"
                        : value >= 1000
                          ? `$${(value / 1000).toFixed(0)}k`
                          : `$${value}`
                    }
                  />
                  <Tooltip
                    content={<RevenueTooltip />}
                    cursor={{ fill: chartTheme.cursor }}
                    allowEscapeViewBox={{ x: false, y: false }}
                    offset={12}
                    wrapperStyle={{
                      zIndex: 100,
                      pointerEvents: "none",
                      maxWidth: "min(18rem, calc(100vw - 1.5rem))",
                    }}
                  />
                  <Bar
                    dataKey="revenue"
                    fill={chartTheme.revenueBar}
                    radius={[6, 6, 0, 0]}
                    activeBar={{ fill: chartTheme.revenueBarActive }}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
