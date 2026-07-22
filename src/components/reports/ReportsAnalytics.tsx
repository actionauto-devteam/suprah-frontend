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


const STATUS_FILL: Record<string, string> = {
  Delivered: "var(--chart-1)",
  "In-Transit": "var(--chart-2)",
  "Picked Up": "var(--chart-2)",
  Assigned: "var(--chart-3)",
  Accepted: "var(--chart-3)",
  Posted: "var(--chart-4)",
  Cancelled: "var(--chart-5)",
};


function buildDeliveryData(loads: Load[]) {
  const counts: Record<string, number> = {}
  loads.forEach(s => {
    counts[s.status] = (counts[s.status] || 0) + 1
  })
  return Object.entries(counts).map(([name, value]) => ({ name, value }))
}

function buildRevenueData(rawPayments: Payment[]) {
  const now = new Date();
  const result = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
    const revenue = rawPayments
      .filter((p) => p.status === "succeeded" && p.createdAt?.startsWith(key))
      .reduce((sum, p) => sum + p.amount, 0);
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
  const count = payload[0].value;
  return (
    <div className="rounded-xl border border-border/80 bg-card px-4 py-3 text-sm shadow-xl">
      <p className="font-bold text-foreground">{payload[0].name}</p>
      <p className="text-muted-foreground">{count} load{count !== 1 ? "s" : ""}</p>
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
  const revenueData = React.useMemo(() => buildRevenueData(rawPayments), [rawPayments])

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
                <div className="relative mx-auto size-[210px] shrink-0 sm:mx-0">
                  <PieChart width={210} height={210}>
                    <Tooltip content={<DeliveryTooltip />} />
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
                          fill={STATUS_FILL[entry.name] ?? "var(--chart-3)"}
                        />
                      ))}
                    </Pie>
                  </PieChart>
                  {/* Center label overlay */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
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
                              STATUS_FILL[entry.name] ?? "var(--chart-3)",
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