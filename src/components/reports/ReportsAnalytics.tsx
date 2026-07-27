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
} from "recharts";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { TrendingUp, PackageCheck, BarChart2 } from "lucide-react";
import { formatCurrency } from "@/utils/format";
import { Payment } from "@/types/billing";
import { Load } from "@/types/load";

interface Props {
  loads: Load[]
  rawPayments: Payment[]
  monthLabel: string
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


function buildDeliveryData(loads: Load[]) {
  const counts: Record<string, number> = {}
  loads.forEach(s => {
    counts[s.status] = (counts[s.status] || 0) + 1
  })
  return Object.entries(counts).map(([name, value]) => ({ name, value }))
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
  const result = [];

  for (let offset = 5; offset >= 0; offset--) {
    const d = new Date(
      selectedPeriod.getFullYear(),
      selectedPeriod.getMonth() - offset,
      1,
    );
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("en-US", {
      month: "long",
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

// ── Custom tooltips ───────────────────────────────────────────────────────────

function RevenueTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-border/80 bg-card px-4 py-3 text-sm shadow-xl">
      <p className="mb-1 text-muted-foreground">{label}</p>
      <p className="font-bold text-foreground">
        {formatCurrency(payload[0].value)}
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
      className="pointer-events-none relative z-[100] min-w-[8.5rem] rounded-xl border bg-card/98 px-4 py-3 text-sm shadow-2xl backdrop-blur-sm"
      style={{
        borderColor: accentColor,
        boxShadow: `0 14px 32px color-mix(in srgb, ${accentColor} 24%, transparent)`,
      }}
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

// ── Quick stat item ───────────────────────────────────────────────────────────

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
      <div>
        <p className="mb-1 text-xs font-semibold leading-tight text-muted-foreground sm:text-sm">
          {label}
        </p>
        <p className="text-xl font-bold leading-none text-foreground sm:text-2xl">
          {value}
        </p>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function ReportsAnalytics({ loads, rawPayments, monthLabel }: Props) {
  const deliveryData = React.useMemo(() => buildDeliveryData(loads), [loads])
  const revenueData = React.useMemo(
    () => buildRevenueData(rawPayments, monthLabel),
    [rawPayments, monthLabel],
  )

  const [tickColor, setTickColor] = React.useState("#6b7280");
  React.useEffect(() => {
    const update = () => {
      const isDark = document.documentElement.classList.contains("dark");
      setTickColor(isDark ? "#9ca3af" : "#6b7280");
    };
    update();
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, []);

  const totalLoads = loads.length
  const delivered = loads.filter(s => s.status === "Delivered").length
  const successRate = totalLoads > 0 ? Math.round((delivered / totalLoads) * 100) : 0
  const totalSixMoRev = revenueData.reduce((s, d) => s + d.revenue, 0)
  const hasRevenueData = revenueData.some(d => d.revenue > 0)

  return (
    <div className="space-y-5">
      {/* Section label */}
      <div className="flex items-center gap-3">
        <BarChart2 className="size-5 text-muted-foreground" />
        <span className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
          Analytics Overview
        </span>
        <div className="flex-1 h-px bg-border" />
      </div>

      {/* Quick stats strip */}
      <div className="grid min-w-0 grid-cols-1 gap-4 rounded-xl border border-border bg-card px-4 py-4 sm:grid-cols-3 sm:px-5">
        <QuickStat
          label={`Total Managed Loads — ${monthLabel}`}
          value={totalLoads}
          icon={<PackageCheck className="size-5" />}
          color="bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400"
        />
        
        <QuickStat
          label="Delivery Success Rate"
          value={`${successRate}%`}
          icon={<TrendingUp className="size-5" />}
          color="bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400"
        />
        
        <QuickStat
          label="6-Month Total Revenue"
          value={formatCurrency(totalSixMoRev)}
          icon={<TrendingUp className="size-5" />}
          color="bg-violet-50 dark:bg-violet-950/50 text-violet-600 dark:text-violet-400"
        />
      </div>

      {/* Charts */}
      <div className="grid min-w-0 grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Delivery Success Rate — Donut */}
        <Card className="min-w-0 border-border shadow-sm lg:min-h-[390px]">
          <CardHeader className="space-y-1.5 pb-2 pt-5 sm:px-6">
            <CardTitle className="text-base font-bold tracking-tight sm:text-lg">
              Delivery Performance
            </CardTitle>
            <CardDescription className="text-sm leading-relaxed">
              {monthLabel} — how effectively loads reached delivery
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-3 sm:px-6 sm:pb-6">
            {totalLoads === 0 ? (
              <div className="flex h-56 items-center justify-center text-center text-sm leading-relaxed text-muted-foreground sm:text-base">
                No load data for this period.
              </div>
            ) : (
              <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center sm:gap-6">
                {/* Fixed-size donut wrapper */}
                <div className="relative isolate z-0 mx-auto size-[210px] shrink-0 overflow-visible sm:mx-0">
                  <PieChart width={210} height={210} style={{ overflow: "visible" }}>
                    <Tooltip
                      content={<DeliveryTooltip />}
                      allowEscapeViewBox={{ x: true, y: true }}
                      cursor={false}
                      wrapperStyle={{
                        zIndex: 100,
                        pointerEvents: "none",
                        overflow: "visible",
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
                      {deliveryData.map((entry, i) => (
                        <Cell
                          key={i}
                          fill={STATUS_FILL[entry.name] ?? "#64748B"}
                        />
                      ))}
                    </Pie>
                  </PieChart>
                  {/* Center label overlay */}
                  <div className="pointer-events-none absolute inset-0 z-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-bold leading-none text-foreground sm:text-4xl">
                      {successRate}%
                    </span>
                    <span className="mt-1.5 text-xs font-medium text-muted-foreground sm:text-sm">
                      delivered
                    </span>
                  </div>
                </div>

                {/* Legend */}
                <div className="flex w-full flex-col gap-3 sm:min-w-0 sm:flex-1">
                  {deliveryData.map(entry => {
                    const pct = Math.round((entry.value / totalLoads) * 100)
                    return (
                      <div key={entry.name} className="flex items-center gap-3 rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
                        <span
                          className="size-3 shrink-0 rounded-full"
                          style={{
                            backgroundColor:
                              STATUS_FILL[entry.name] ?? "#64748B",
                          }}
                        />
                        <span className="min-w-0 flex-1 break-words text-sm font-medium text-muted-foreground">
                          {entry.name}
                        </span>
                        <span className="shrink-0 text-sm font-bold text-foreground sm:text-base">
                          {entry.value}
                          <span className="font-normal text-muted-foreground ml-1">
                            ({pct}%)
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

        {/* Monthly Revenue — Bar */}
        <Card className="min-w-0 border-border shadow-sm lg:min-h-[390px]">
          <CardHeader className="space-y-1.5 pb-2 pt-5 sm:px-6">
            <CardTitle className="text-base font-bold tracking-tight sm:text-lg">
              Monthly Revenue
            </CardTitle>
            <CardDescription className="text-sm leading-relaxed">
              Last 6 months — succeeded payments only
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-3 sm:px-6 sm:pb-6">
            {!hasRevenueData ? (
              <div className="flex h-56 items-center justify-center text-center text-sm leading-relaxed text-muted-foreground sm:text-base">
                No payment data available for the last 6 months.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={290}>
                <BarChart
                  data={revenueData}
                  barSize={38}
                  margin={{ top: 10, right: 12, left: 8, bottom: 14 }}
                >
                  <CartesianGrid
                    vertical={false}
                    strokeDasharray="3 3"
                    stroke="hsl(var(--border))"
                  />
                  <XAxis
                    dataKey="month"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 13, fill: tickColor }}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    width={58}
                    tick={{ fontSize: 13, fill: tickColor }}
                    tickFormatter={(v) =>
                      v === 0
                        ? "$0"
                        : v >= 1000
                          ? `$${(v / 1000).toFixed(0)}k`
                          : `$${v}`
                    }
                  />
                  <Tooltip
                    content={<RevenueTooltip />}
                    cursor={{ fill: "rgba(0,0,0,0.04)" }}
                  />
                  <Bar
                    dataKey="revenue"
                    fill="var(--chart-1)"
                    radius={[4, 4, 0, 0]}
                    activeBar={{ fill: "var(--chart-2)" }}
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