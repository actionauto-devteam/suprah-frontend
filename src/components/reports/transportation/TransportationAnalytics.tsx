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

const STATUS_FILL: Record<string, string> = {
  Delivered: "var(--chart-1)",
  "In-Transit": "var(--chart-2)",
  "Picked Up": "var(--chart-3)",
  Posted: "var(--chart-4)",
  Cancelled: "var(--chart-5)",
  Assigned: "var(--chart-3)",
  Accepted: "var(--chart-3)",
};

const QUOTE_STATUS_FILL: Record<string, string> = {
  pending: "var(--chart-4)",
  accepted: "var(--chart-1)",
  rejected: "var(--chart-5)",
  booked: "var(--chart-2)",
};

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

function buildMonthlyLoadTrend(rawLoads: Load[]) {
  const now = new Date();
  const months: { key: string; label: string }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d
      .toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "America/Denver" })
      .replace(", ", " '");
    months.push({ key, label });
  }
  return months.map(({ key, label }) => {
    const monthLoads = rawLoads.filter(l => l.createdAt?.startsWith(key))
    const total = monthLoads.length
    const delivered = monthLoads.filter(l => l.status === "Delivered").length
    const revenue = monthLoads.reduce((sum, l) => sum + (l.pricing?.carrierPayAmount || l.pricing?.estimatedRate || 0), 0)
    return { month: label, total, delivered, revenue }
  })
}

function buildMonthlyQuoteTrend(rawQuotes: Quote[]) {
  const now = new Date();
  const months: { key: string; label: string }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d
      .toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "America/Denver" })
      .replace(", ", " '");
    months.push({ key, label });
  }
  return months.map(({ key, label }) => {
    const monthQuotes = rawQuotes.filter((q) => q.createdAt?.startsWith(key));
    const total = monthQuotes.length;
    const booked = monthQuotes.filter((q) => q.status === "booked").length;
    const value = monthQuotes.reduce((sum, q) => sum + (q.rate || 0), 0);
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
    <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-md text-xs">
      <p className="font-semibold text-foreground mb-1">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} style={{ color: entry.color }} className="font-medium">
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

interface PieTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number }>;
}

function PieTooltip({ active, payload }: PieTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-md text-xs">
      <p className="font-semibold text-foreground">{payload[0].name}</p>
      <p className="text-muted-foreground">
        {payload[0].value} item{payload[0].value !== 1 ? "s" : ""}
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
  const loadStatusData = React.useMemo(
    () => buildLoadStatusData(loads),
    [loads],
  );
  const quoteStatusData = React.useMemo(
    () => buildQuoteStatusData(quotes),
    [quotes],
  );
  const loadTrend = React.useMemo(
    () => buildMonthlyLoadTrend(rawLoads),
    [rawLoads],
  );
  const quoteTrend = React.useMemo(
    () => buildMonthlyQuoteTrend(rawQuotes),
    [rawQuotes],
  );
  const loadTrendData = React.useMemo(
    () =>
      loadTrend.filter(
        (point) => point.total > 0 || point.delivered > 0 || point.revenue > 0,
      ),
    [loadTrend],
  );
  const quoteTrendData = React.useMemo(
    () =>
      quoteTrend.filter(
        (point) => point.total > 0 || point.booked > 0 || point.value > 0,
      ),
    [quoteTrend],
  );
  const hasLoadTrendData = React.useMemo(
    () => loadTrendData.length > 0,
    [loadTrendData],
  );
  const hasQuoteTrendData = React.useMemo(
    () => quoteTrendData.length > 0,
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
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card className="border-border shadow-sm">
        <CardHeader className="pb-1">
          <CardTitle className="text-sm font-semibold">
            Load Distribution
          </CardTitle>
          <CardDescription className="text-xs">
            {monthLabel} — loads by status
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 pt-2">
          {totalLoads === 0 ? (
            <p className="text-sm text-muted-foreground py-8 w-full text-center">
              No load data for this period.
            </p>
          ) : (
            <>
              <div className="relative shrink-0 mx-auto sm:mx-0">
                <ResponsiveContainer width={160} height={160}>
                  <PieChart>
                    <Tooltip content={<PieTooltip />} />
                    <Pie
                      data={loadStatusData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={48}
                      outerRadius={72}
                      paddingAngle={2}
                      strokeWidth={0}
                    >
                      {loadStatusData.map((entry, i) => (
                        <Cell
                          key={i}
                          fill={STATUS_FILL[entry.name] ?? "var(--chart-3)"}
                        />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  {successRate > 0 ? (
                    <>
                      <span className="text-2xl font-bold text-foreground leading-none">
                        {successRate}%
                      </span>
                      <span className="text-[10px] text-muted-foreground mt-0.5">
                        delivered
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="text-2xl font-bold text-foreground leading-none">
                        {totalLoads}
                      </span>
                      <span className="text-[10px] text-muted-foreground mt-0.5">
                        total
                      </span>
                    </>
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-2 w-full sm:flex-1 sm:min-w-0">
                {loadStatusData.map((entry) => (
                  <div
                    key={entry.name}
                    className="flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="size-2 rounded-full shrink-0"
                        style={{
                          backgroundColor:
                            STATUS_FILL[entry.name] ?? "var(--chart-3)",
                        }}
                      />
                      <span className="text-xs text-muted-foreground truncate">
                        {entry.name}
                      </span>
                    </div>
                    <span className="text-xs font-semibold text-foreground shrink-0">
                      {entry.value}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card className="border-border shadow-sm">
        <CardHeader className="pb-1">
          <CardTitle className="text-sm font-semibold">
            Quote Performance
          </CardTitle>
          <CardDescription className="text-xs">
            {monthLabel} — conversion metrics
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 pt-2">
          {totalQuotes === 0 ? (
            <p className="text-sm text-muted-foreground py-8 w-full text-center">
              No quotes for this period.
            </p>
          ) : (
            <>
              <div className="relative shrink-0 mx-auto sm:mx-0">
                <ResponsiveContainer width={160} height={160}>
                  <PieChart>
                    <Tooltip content={<PieTooltip />} />
                    <Pie
                      data={quoteStatusData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={48}
                      outerRadius={72}
                      paddingAngle={2}
                      strokeWidth={0}
                    >
                      {quoteStatusData.map((entry, i) => (
                        <Cell
                          key={i}
                          fill={
                            QUOTE_STATUS_FILL[entry.key] ?? "var(--chart-3)"
                          }
                        />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  {conversionRate > 0 ? (
                    <>
                      <span className="text-2xl font-bold text-foreground leading-none">
                        {conversionRate}%
                      </span>
                      <span className="text-[10px] text-muted-foreground mt-0.5">
                        booked
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="text-2xl font-bold text-foreground leading-none">
                        {totalQuotes}
                      </span>
                      <span className="text-[10px] text-muted-foreground mt-0.5">
                        total
                      </span>
                    </>
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-2 w-full sm:flex-1 sm:min-w-0">
                {quoteStatusData.map((entry) => (
                  <div
                    key={entry.name}
                    className="flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="size-2 rounded-full shrink-0"
                        style={{
                          backgroundColor:
                            QUOTE_STATUS_FILL[entry.key] ?? "var(--chart-3)",
                        }}
                      />
                      <span className="text-xs text-muted-foreground truncate">
                        {entry.name}
                      </span>
                    </div>
                    <span className="text-xs font-semibold text-foreground shrink-0">
                      {entry.value}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card className="border-border shadow-sm">
        <CardHeader className="pb-1">
          <CardTitle className="text-sm font-semibold">
            Operational Velocity
          </CardTitle>
          <CardDescription className="text-xs">
            Last 6 months — throughput & volume
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-2">
          {!hasLoadTrendData ? (
            <p className="text-sm text-muted-foreground py-8 w-full text-center">
              No trend data available.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={loadTrendData} barSize={20}>
                <CartesianGrid
                  vertical={false}
                  strokeDasharray="3 3"
                  className="stroke-border"
                />
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  width={30}
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                />
                <Tooltip
                  content={<ChartTooltip />}
                  cursor={{ fill: "hsl(var(--muted))" }}
                />
                <Bar
                  dataKey="total"
                  fill="var(--chart-3)"
                  radius={[4, 4, 0, 0]}
                  name="Total Loads"
                />
                <Bar
                  dataKey="delivered"
                  fill="var(--chart-1)"
                  radius={[4, 4, 0, 0]}
                  name="Completed"
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card className="border-border shadow-sm">
        <CardHeader className="pb-1">
          <CardTitle className="text-sm font-semibold">Demand Analysis</CardTitle>
          <CardDescription className="text-xs">
            Last 6 months — market engagement
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-2">
          {!hasQuoteTrendData ? (
            <p className="text-sm text-muted-foreground py-8 w-full text-center">
              No engagement data.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={quoteTrendData}>
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
                  className="stroke-border"
                />
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  width={30}
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                />
                <Tooltip content={<ChartTooltip />} cursor={false} />
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke="var(--chart-4)"
                  fill="url(#quoteGrad)"
                  strokeWidth={2}
                  name="Inquiries"
                />
                <Area
                  type="monotone"
                  dataKey="booked"
                  stroke="var(--chart-2)"
                  fill="url(#bookedGrad)"
                  strokeWidth={2}
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
