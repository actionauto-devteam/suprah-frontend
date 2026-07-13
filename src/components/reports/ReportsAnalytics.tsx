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
      month: "short",
      year: "2-digit",
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
    <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-lg text-xs">
      <p className="text-muted-foreground mb-0.5">{label}</p>
      <p className="font-semibold text-foreground">
        {formatCurrency(payload[0].value)}
      </p>
    </div>
  );
}

function DeliveryTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const count = payload[0].value;
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-lg text-xs">
      <p className="font-semibold text-foreground">{payload[0].name}</p>
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
    <div className="flex items-center gap-3 flex-1 min-w-35">
      <div
        className={`size-8 rounded-lg flex items-center justify-center shrink-0 ${color}`}
      >
        {icon}
      </div>
      <div>
        <p className="text-[11px] text-muted-foreground font-medium leading-none mb-0.5">
          {label}
        </p>
        <p className="text-base font-bold text-foreground leading-none">
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
    <div className="space-y-4">
      {/* Section label */}
      <div className="flex items-center gap-2.5">
        <BarChart2 className="size-4 text-muted-foreground" />
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Analytics Overview
        </span>
        <div className="flex-1 h-px bg-border" />
      </div>

      {/* Quick stats strip */}
      <div className="flex flex-wrap items-center gap-4 bg-card rounded-xl border border-border px-5 py-3.5">
        <QuickStat
          label={`Total Managed Loads — ${monthLabel}`}
          value={totalLoads}
          icon={<PackageCheck className="size-4" />}
          color="bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400"
        />
        <div className="w-px h-8 bg-border hidden sm:block" />
        <QuickStat
          label="Delivery Success Rate"
          value={`${successRate}%`}
          icon={<TrendingUp className="size-4" />}
          color="bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400"
        />
        <div className="w-px h-8 bg-border hidden sm:block" />
        <QuickStat
          label="6-Month Total Revenue"
          value={formatCurrency(totalSixMoRev)}
          icon={<TrendingUp className="size-4" />}
          color="bg-violet-50 dark:bg-violet-950/50 text-violet-600 dark:text-violet-400"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Delivery Success Rate — Donut */}
        <Card className="border-border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">
              Delivery Breakdown
            </CardTitle>
            <CardDescription className="text-xs">
              {monthLabel} — {totalLoads} total load{totalLoads !== 1 ? "s" : ""}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {totalLoads === 0 ? (
              <div className="flex items-center justify-center h-40 text-sm text-muted-foreground">
                No load data for this period.
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
                {/* Fixed-size donut wrapper */}
                <div className="relative w-40 h-40 shrink-0 mx-auto sm:mx-0">
                  <PieChart width={160} height={160}>
                    <Tooltip content={<DeliveryTooltip />} />
                    <Pie
                      data={deliveryData}
                      dataKey="value"
                      nameKey="name"
                      cx={80}
                      cy={80}
                      innerRadius={48}
                      outerRadius={72}
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
                    <span className="text-2xl font-bold text-foreground leading-none">
                      {successRate}%
                    </span>
                    <span className="text-[10px] text-muted-foreground mt-1">
                      delivered
                    </span>
                  </div>
                </div>

                {/* Legend */}
                <div className="flex flex-col gap-2.5 w-full sm:flex-1 sm:min-w-0">
                  {deliveryData.map(entry => {
                    const pct = Math.round((entry.value / totalLoads) * 100)
                    return (
                      <div key={entry.name} className="flex items-center gap-2">
                        <span
                          className="size-2.5 rounded-full shrink-0"
                          style={{
                            backgroundColor:
                              STATUS_FILL[entry.name] ?? "var(--chart-3)",
                          }}
                        />
                        <span className="text-xs text-muted-foreground truncate flex-1">
                          {entry.name}
                        </span>
                        <span className="text-xs font-semibold text-foreground shrink-0">
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
        <Card className="border-border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">
              Monthly Revenue
            </CardTitle>
            <CardDescription className="text-xs">
              Last 6 months — succeeded payments only
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!hasRevenueData ? (
              <div className="flex items-center justify-center h-40 text-sm text-muted-foreground">
                No payment data available for the last 6 months.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={160}>
                <BarChart
                  data={revenueData}
                  barSize={30}
                  margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
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
                    tick={{ fontSize: 11, fill: tickColor }}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    width={46}
                    tick={{ fontSize: 11, fill: tickColor }}
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
