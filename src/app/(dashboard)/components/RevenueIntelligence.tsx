"use client";

import * as React from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Badge } from "@/components/ui/badge";
import { DollarSign, ChevronRight, TrendingUp } from "lucide-react";
import { formatCurrency } from "@/utils/format";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { DashboardMetrics } from "@/hooks/useDashboardStats";

interface RevenueIntelligenceProps {
  trajectory: DashboardMetrics["revenueTrajectory"];
  livePayments: DashboardMetrics["livePayments"];
  period: string;
  onPeriodChange: (period: string) => void;
  isLoading: boolean;
}

const MONTH_ORDER = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export function RevenueIntelligence({
  trajectory,
  livePayments,
  period,
  onPeriodChange,
  isLoading,
}: RevenueIntelligenceProps) {
  const chartData = React.useMemo(() => {
    if (period !== "1Y") {
      return trajectory;
    }

    const monthlyRevenue = new Map<string, number>();

    for (const point of trajectory) {
      const monthLabel = String(point?.name || "").slice(0, 3);
      if (!MONTH_ORDER.includes(monthLabel)) {
        continue;
      }

      monthlyRevenue.set(
        monthLabel,
        (monthlyRevenue.get(monthLabel) || 0) + Number(point?.revenue || 0)
      );
    }

    return MONTH_ORDER.map((month) => ({
      name: month,
      revenue: monthlyRevenue.get(month) || 0,
    }));
  }, [period, trajectory]);

  const totalPeriodRevenue = React.useMemo(() => {
    return chartData.reduce((acc, curr) => acc + curr.revenue, 0);
  }, [chartData]);

  const formatXAxisLabel = React.useCallback(
    (value: string) => {
      const label = String(value || "");
      if (period === "1M" && label.startsWith("Week ")) {
        return label.replace("Week ", "W");
      }
      return label;
    },
    [period]
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5 sm:gap-6">
      { }
      <Card className="lg:col-span-7 border-border/40 bg-card/50 backdrop-blur-sm overflow-hidden flex flex-col p-0">
        <CardHeader className="py-2.5 px-3 sm:py-5 sm:px-6 border-b border-border/10 lg:min-h-20">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4">
            <div>
              <CardTitle className="text-sm sm:text-lg font-black flex items-center gap-1.5 sm:gap-2">
                <div className="p-1 sm:p-1.5 rounded-md sm:rounded-lg bg-emerald-500/10 text-emerald-500">
                  <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </div>
                Revenue Trajectory
              </CardTitle>
              <CardDescription className="hidden sm:block text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
                Monthly Revenue
              </CardDescription>
            </div>

            <div className="flex items-center justify-between sm:justify-start gap-3 sm:gap-4 flex-wrap">
              <div className="flex gap-1 p-1 bg-muted/30 rounded-lg">
                {["7D", "1M", "1Y"].map((p) => (
                  <button
                    key={p}
                    onClick={() => onPeriodChange(p)}
                    className={`px-3 py-1.5 sm:px-2.5 sm:py-1 text-[9px] font-black uppercase tracking-widest rounded-md transition-all ${period === p
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                      }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
              <div className="text-right">
                <p className="text-base sm:text-xl font-black text-primary tracking-tight leading-none tabular-nums">
                  {isLoading ? "..." : formatCurrency(totalPeriodRevenue)}
                </p>
                <p className="hidden sm:block text-[9px] font-bold text-muted-foreground/40 uppercase tracking-widest mt-1">
                  Total Period
                </p>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 flex-1 min-h-44 sm:min-h-64">
          {isLoading ? (
            <div className="h-full w-full p-8 space-y-4">
              <Skeleton className="h-full w-full rounded-2xl" />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={chartData}
                margin={{ top: 16, right: 16, left: 16, bottom: 20 }}
              >
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor="var(--primary)"
                      stopOpacity={0.2}
                    />
                    <stop
                      offset="95%"
                      stopColor="var(--primary)"
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="name"
                  tickLine={false}
                  axisLine={false}
                  interval={0}
                  tickMargin={period === "1Y" ? 4 : 8}
                  height={period === "1Y" ? 52 : 36}
                  padding={{ left: 4, right: 4 }}
                  tickFormatter={formatXAxisLabel}
                  tick={{
                    fontSize: 9,
                    fontWeight: 700,
                    fill: "var(--muted-foreground)",
                    ...(period === "1Y" ? { angle: -45, textAnchor: "end", dy: 2 } : {}),
                  }}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-background/90 backdrop-blur-xl p-3 shadow-2xl border border-border/40 rounded-2xl">
                          <p className="text-[10px] font-bold text-foreground/70 mb-1 uppercase tracking-widest leading-none">
                            {payload[0].payload.name}
                          </p>
                          <span className="text-lg font-black text-primary tracking-tight italic">
                            {formatCurrency(payload[0].value as number)}
                          </span>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="var(--primary)"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorRev)"
                  animationDuration={1500}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Live Payments Feed */}
      <Card className="lg:col-span-5 border-border/40 bg-card/50 backdrop-blur-sm overflow-hidden flex flex-col p-0">
        <CardHeader className="py-2.5 px-3 sm:py-5 sm:px-6 border-b border-border/10 flex flex-row items-center justify-between lg:min-h-20">
          <div>
            <CardTitle className="text-sm sm:text-lg font-black flex items-center gap-1.5 sm:gap-2">
              <div className="p-1 sm:p-1.5 rounded-md sm:rounded-lg bg-indigo-500/10 text-indigo-500">
                <DollarSign className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </div>
              Live Payments
            </CardTitle>
            <CardDescription className="hidden sm:block text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
              Recent Transactions
            </CardDescription>
          </div>
          <Link href="/billing/payments" className="text-[10px] font-black text-primary uppercase tracking-widest hover:underline flex items-center gap-1 group">
            All <ChevronRight className="h-3 w-3 group-hover:translate-x-1" />
          </Link>
        </CardHeader>
        <CardContent className="p-0 flex-1 min-w-0 overflow-y-auto overflow-x-hidden max-h-64 sm:max-h-96 touch-pan-y overscroll-contain scrollbar-thin scrollbar-thumb-muted-foreground/30 scrollbar-track-transparent">
          {isLoading ? (
            <Table className="table-fixed w-full">
              <TableBody>
                {[1, 2, 3, 4].map((i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Skeleton className="h-10 w-full" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : livePayments.length === 0 ? (
            <div className="flex min-h-44 items-center justify-center px-6 text-center">
              <div>
                <p className="text-sm font-bold text-foreground/80">No recent payments</p>
                <p className="mt-1 text-xs text-muted-foreground/60">
                  New payment activity will appear here.
                </p>
              </div>
            </div>
          ) : (
            <Table className="table-fixed w-full">
              <TableBody>
                {livePayments.map((payment, i) => (
                  <TableRow
                    key={`${payment.createdAt}-${i}`}
                    className="group h-11 border-border/30 transition-colors hover:bg-muted/30 sm:h-14"
                  >
                    <TableCell className="w-[55%] max-w-0 pl-3 sm:pl-5">
                      <div className="flex min-w-0 flex-col">
                        <span className="truncate text-xs font-bold leading-none text-foreground sm:text-sm">
                          {payment.customerName}
                        </span>
                        <span className="mt-1 block truncate text-[9px] font-medium uppercase tracking-tighter text-muted-foreground/60">
                          {payment.description}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="w-20 whitespace-nowrap text-right text-xs font-black tabular-nums sm:w-28 sm:text-sm">
                      {formatCurrency(payment.amount)}
                    </TableCell>
                    <TableCell className="w-16 whitespace-nowrap pr-3 text-right sm:w-24 sm:pr-5">
                      <Badge
                        variant="secondary"
                        className={`border-none px-1.5 py-0.5 text-[8px] font-black uppercase sm:px-2 ${
                          payment.status === "succeeded"
                            ? "bg-emerald-500/10 text-emerald-500"
                            : payment.status === "processing"
                              ? "bg-amber-500/10 text-amber-500"
                              : "bg-rose-500/10 text-rose-500"
                        }`}
                      >
                        {payment.status === "succeeded"
                          ? "Paid"
                          : payment.status === "processing"
                            ? "Pending"
                            : "Failed"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}