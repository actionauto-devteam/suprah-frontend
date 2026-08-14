"use client";

import * as React from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { LineChart as LineChartIcon } from "lucide-react";

import type { PriceByYearPoint, TrendPoint } from "@/types/suprah-radar";
import {
  CHART_COLORS,
  ChartTooltip,
  EmptyState,
  formatCurrency,
  formatNumber,
  Panel,
  useChartTheme,
} from "./shared";

function ChartFrame({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <Panel className="p-4">
      <div className="mb-3">
        <p className="text-sm font-semibold">{title}</p>
        <p className="text-[11px] text-muted-foreground">{subtitle}</p>
      </div>
      <div className="h-56 w-full">{children}</div>
    </Panel>
  );
}

export function TrendCharts({
  series,
  priceByYear,
  loading,
}: {
  series?: TrendPoint[];
  priceByYear?: PriceByYearPoint[];
  loading?: boolean;
}) {
  const theme = useChartTheme();

  if (loading) {
    return (
      <div className="grid gap-3 xl:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Panel key={i} className="h-72 animate-pulse" />
        ))}
      </div>
    );
  }

  if (!series?.length) {
    return (
      <EmptyState
        icon={LineChartIcon}
        title="No trend history yet"
        description="Trends are reconstructed from stock-in and sold dates. They fill in as inventory moves."
      />
    );
  }

  const axis = {
    stroke: theme.axis,
    fontSize: 11,
    tickLine: false,
    axisLine: false,
  } as const;

  return (
    <div className="grid gap-3 xl:grid-cols-2">
      <ChartFrame title="Inventory levels" subtitle="Live units in market versus your store">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={series} margin={{ top: 6, right: 8, left: -18, bottom: 0 }}>
            <defs>
              <linearGradient id="miq-market" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={CHART_COLORS.market} stopOpacity={0.35} />
                <stop offset="100%" stopColor={CHART_COLORS.market} stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="miq-you" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={CHART_COLORS.primary} stopOpacity={0.45} />
                <stop offset="100%" stopColor={CHART_COLORS.primary} stopOpacity={0.03} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={theme.grid} strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" {...axis} minTickGap={16} />
            <YAxis {...axis} width={48} tickFormatter={(v) => formatNumber(v, true)} />
            <Tooltip
              content={({ active, payload, label }) => (
                <ChartTooltip
                  active={active}
                  payload={payload as never}
                  label={label as string}
                  theme={theme}
                  formatter={(v) => formatNumber(v)}
                />
              )}
            />
            <Area
              type="monotone"
              dataKey="listings"
              name="Market"
              stroke={CHART_COLORS.market}
              fill="url(#miq-market)"
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="yourListings"
              name="Your store"
              stroke={CHART_COLORS.primary}
              fill="url(#miq-you)"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </ChartFrame>

      <ChartFrame title="Sales volume" subtitle="Units sold per week across the market">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={series} margin={{ top: 6, right: 8, left: -18, bottom: 0 }}>
            <CartesianGrid stroke={theme.grid} strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" {...axis} minTickGap={16} />
            <YAxis {...axis} width={48} allowDecimals={false} />
            <Tooltip
              cursor={{ fill: theme.cursor }}
              content={({ active, payload, label }) => (
                <ChartTooltip
                  active={active}
                  payload={payload as never}
                  label={label as string}
                  theme={theme}
                  formatter={(v) => formatNumber(v)}
                />
              )}
            />
            <Bar dataKey="sold" name="Market" fill={CHART_COLORS.market} radius={[3, 3, 0, 0]} />
            <Bar dataKey="yourSold" name="Your store" fill={CHART_COLORS.primary} radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartFrame>

      <ChartFrame
        title="Average days on lot"
        subtitle="Average age of every unit still listed that week"
      >
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={series} margin={{ top: 6, right: 8, left: -18, bottom: 0 }}>
            <defs>
              <linearGradient id="miq-age" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={CHART_COLORS.market} stopOpacity={0.35} />
                <stop offset="100%" stopColor={CHART_COLORS.market} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={theme.grid} strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" {...axis} minTickGap={16} />
            <YAxis {...axis} width={48} domain={["auto", "auto"]} />
            <Tooltip
              content={({ active, payload, label }) => (
                <ChartTooltip
                  active={active}
                  payload={payload as never}
                  label={label as string}
                  theme={theme}
                  formatter={(v) => `${formatNumber(v)} days`}
                />
              )}
            />
            <Area
              type="monotone"
              dataKey="avgDaysOnLot"
              name="Days on lot"
              stroke={CHART_COLORS.market}
              fill="url(#miq-age)"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </ChartFrame>

      <ChartFrame
        title="Average list price"
        subtitle="Mean price across inventory listed that week, at current list prices"
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={series} margin={{ top: 6, right: 8, left: -6, bottom: 0 }}>
            <CartesianGrid stroke={theme.grid} strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" {...axis} minTickGap={16} />
            <YAxis
              {...axis}
              width={62}
              tickFormatter={(v) => formatCurrency(v, true)}
              domain={["auto", "auto"]}
            />
            <Tooltip
              content={({ active, payload, label }) => (
                <ChartTooltip
                  active={active}
                  payload={payload as never}
                  label={label as string}
                  theme={theme}
                  formatter={(v) => formatCurrency(v)}
                />
              )}
            />
            <Line
              type="monotone"
              dataKey="avgListPrice"
              name="Avg list price"
              stroke={CHART_COLORS.accent}
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartFrame>

      <ChartFrame title="Turn speed" subtitle="Average days from stock-in to sold, by week">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={series} margin={{ top: 6, right: 8, left: -18, bottom: 0 }}>
            <defs>
              <linearGradient id="miq-turn" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={CHART_COLORS.warn} stopOpacity={0.35} />
                <stop offset="100%" stopColor={CHART_COLORS.warn} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={theme.grid} strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" {...axis} minTickGap={16} />
            <YAxis {...axis} width={48} />
            <Tooltip
              content={({ active, payload, label }) => (
                <ChartTooltip
                  active={active}
                  payload={payload as never}
                  label={label as string}
                  theme={theme}
                  formatter={(v) => `${formatNumber(v)} days`}
                />
              )}
            />
            <Area
              type="monotone"
              dataKey="avgDaysToSell"
              name="Days to sell"
              stroke={CHART_COLORS.warn}
              fill="url(#miq-turn)"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </ChartFrame>

      {(priceByYear?.length ?? 0) > 0 && (
        <div className="xl:col-span-2">
          <ChartFrame
            title="Average list price by model year"
            subtitle="Current asking price across the market for each model year"
          >
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={priceByYear} margin={{ top: 6, right: 8, left: -2, bottom: 0 }}>
                <defs>
                  <linearGradient id="miq-year" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={CHART_COLORS.accent} stopOpacity={0.32} />
                    <stop offset="100%" stopColor={CHART_COLORS.accent} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={theme.grid} strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="year" {...axis} minTickGap={20} />
                <YAxis {...axis} width={62} tickFormatter={(v) => formatCurrency(v, true)} />
                <Tooltip
                  content={({ active, payload, label }) => (
                    <ChartTooltip
                      active={active}
                      payload={payload as never}
                      label={`Model year ${label}`}
                      theme={theme}
                      formatter={(v, key) =>
                        key === "count" ? `${formatNumber(v)} listed` : formatCurrency(v)
                      }
                    />
                  )}
                />
                <Area
                  type="monotone"
                  dataKey="avgPrice"
                  name="Avg price"
                  stroke={CHART_COLORS.accent}
                  fill="url(#miq-year)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartFrame>
        </div>
      )}
    </div>
  );
}
