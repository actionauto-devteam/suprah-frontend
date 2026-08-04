"use client";

import * as React from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  CalendarClock,
  CircleHelp,
  MessageCircleMore,
  TrendingUp,
  Users,
} from "lucide-react";

import type { Lead } from "@/types/lead";

interface LeadAnalyticsOverviewProps {
  leads: Lead[];
  rawLeads: Lead[];
  monthLabel: string;
  referenceDate?: string;
}

interface ChartTheme {
  axis: string;
  grid: string;
  cursor: string;
  palette: string[];
}

interface StatusPoint {
  name: string;
  value: number;
}

interface SourcePoint {
  name: string;
  value: number;
  percentage: number;
}

interface TrendPoint {
  month: string;
  leads: number;
}

interface RechartsTooltipEntry {
  color?: string;
  name?: string;
  value?: number | string;
  payload?: Record<string, unknown>;
}

const MONTHS = [
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

const STATUS_ORDER = [
  "New",
  "Contacted",
  "Pending",
  "Appointment Set",
  "Closed",
  "Other",
] as const;

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

function useChartTheme(): ChartTheme {
  const [theme, setTheme] = React.useState<ChartTheme>({
    axis: "#475569",
    grid: "#CBD5E1",
    cursor: "#E2E8F0",
    palette: ["#047857", "#1D4ED8", "#6D28D9", "#B45309", "#0E7490", "#B91C1C"],
  });

  React.useEffect(() => {
    const update = () => {
      const root = document.documentElement;
      const rootStyles = window.getComputedStyle(root);
      const bodyStyles = document.body
        ? window.getComputedStyle(document.body)
        : rootStyles;
      const read = (name: string, fallback: string) =>
        normalizeCssColor(
          rootStyles.getPropertyValue(name) || bodyStyles.getPropertyValue(name),
          fallback,
        );
      const dark = root.classList.contains("dark");

      setTheme({
        axis: read("--muted-foreground", dark ? "#CBD5E1" : "#475569"),
        grid: read("--border", dark ? "#334155" : "#CBD5E1"),
        cursor: read("--muted", dark ? "#1E293B" : "#E2E8F0"),
        palette: dark
          ? ["#34D399", "#60A5FA", "#A78BFA", "#FBBF24", "#22D3EE", "#F87171"]
          : ["#047857", "#1D4ED8", "#6D28D9", "#B45309", "#0E7490", "#B91C1C"],
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

  return theme;
}

function parseSelectedMonth(
  monthLabel: string,
  referenceDate?: string,
): Date {
  if (referenceDate) {
    const parsedReference = new Date(`${referenceDate}T12:00:00`);
    if (!Number.isNaN(parsedReference.getTime())) {
      return new Date(
        parsedReference.getFullYear(),
        parsedReference.getMonth(),
        1,
      );
    }
  }

  const match = monthLabel.trim().match(/^([A-Za-z]+)\s+(\d{4})$/);
  if (!match) {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }

  const monthIndex = MONTHS.findIndex(
    (month) => month.toLowerCase() === match[1].toLowerCase(),
  );
  const year = Number(match[2]);

  if (monthIndex < 0 || !Number.isFinite(year)) {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }

  return new Date(year, monthIndex, 1);
}

function normalizedStatus(status: unknown): string {
  const value = String(status ?? "").trim().toLowerCase();
  if (value === "new") return "New";
  if (value === "contacted") return "Contacted";
  if (value === "pending") return "Pending";
  if (value === "appointment set" || value === "appointment") {
    return "Appointment Set";
  }
  if (value === "closed") return "Closed";
  return "Other";
}

function normalizedSource(source: unknown): string {
  const value = String(source ?? "").trim();
  if (!value || /^(unknown|unattributed|none|n\/a)$/i.test(value)) {
    return "Unattributed";
  }
  return value.replace(/[_-]+/g, " ").replace(/\s+/g, " ");
}

function buildStatusData(leads: Lead[]): StatusPoint[] {
  const counts = new Map<string, number>();
  leads.forEach((lead) => {
    const status = normalizedStatus(lead.status);
    counts.set(status, (counts.get(status) ?? 0) + 1);
  });

  return STATUS_ORDER.map((name) => ({
    name,
    value: counts.get(name) ?? 0,
  })).filter((item) => item.value > 0);
}

function buildSourceData(leads: Lead[]): {
  sources: SourcePoint[];
  unattributed: number;
} {
  const counts = new Map<string, number>();
  leads.forEach((lead) => {
    const source = normalizedSource(lead.source);
    counts.set(source, (counts.get(source) ?? 0) + 1);
  });

  const unattributed = counts.get("Unattributed") ?? 0;
  counts.delete("Unattributed");

  const totalRecognized = Array.from(counts.values()).reduce(
    (sum, value) => sum + value,
    0,
  );

  const sources = Array.from(counts.entries())
    .map(([name, value]) => ({
      name,
      value,
      percentage: totalRecognized > 0 ? (value / totalRecognized) * 100 : 0,
    }))
    .sort(
      (first, second) =>
        second.value - first.value || first.name.localeCompare(second.name),
    );

  return { sources, unattributed };
}

function buildTrend(
  rawLeads: Lead[],
  monthLabel: string,
  referenceDate?: string,
): TrendPoint[] {
  const selected = parseSelectedMonth(
    monthLabel,
    referenceDate,
  );
  const months: Array<{ key: string; label: string }> = [];

  for (let offset = 5; offset >= 0; offset -= 1) {
    const date = new Date(
      selected.getFullYear(),
      selected.getMonth() - offset,
      1,
    );
    months.push({
      key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`,
      label: date.toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      }),
    });
  }

  return months.map(({ key, label }) => ({
    month: label,
    leads: rawLeads.filter((lead) => lead.createdAt?.startsWith(key)).length,
  }));
}

function MetricCard({
  label,
  value,
  description,
  icon,
  tone,
}: {
  label: string;
  value: React.ReactNode;
  description: string;
  icon: React.ReactNode;
  tone: string;
}) {
  return (
    <div className="min-w-0 rounded-xl border border-border/80 bg-card px-4 py-3.5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">
            {label}
          </p>
          <p className="mt-2 break-words text-2xl font-black tracking-tight text-foreground">
            {value}
          </p>
        </div>
        <div className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${tone}`}>
          {icon}
        </div>
      </div>
      <p className="mt-2 text-sm leading-5 text-slate-700 dark:text-slate-300">
        {description}
      </p>
    </div>
  );
}

function OverviewTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: RechartsTooltipEntry[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="w-max min-w-36 max-w-[min(18rem,calc(100vw-2rem))] rounded-xl border border-border/80 bg-popover/98 px-3.5 py-3 text-sm text-popover-foreground shadow-2xl backdrop-blur-xl">
      {label ? <p className="mb-1.5 font-bold text-foreground">{label}</p> : null}
      {payload.map((entry, index) => (
        <div
          key={`${entry.name ?? "value"}-${index}`}
          className="flex items-center justify-between gap-4"
        >
          <span className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
            <span
              className="size-2.5 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            {entry.name ?? "Leads"}
          </span>
          <span className="font-bold text-foreground">
            {Number(entry.value ?? 0).toLocaleString("en-US")}
          </span>
        </div>
      ))}
    </div>
  );
}

function EmptyLeadAnalytics({ monthLabel }: { monthLabel: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-muted/20 px-5 py-12 text-center">
      <Users className="mx-auto size-8 text-muted-foreground/50" />
      <h3 className="mt-3 text-base font-bold text-foreground">
        No customer leads for {monthLabel}
      </h3>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-700 dark:text-slate-300">
        Lead activity, follow-up needs, and customer inquiry sources will appear here when matching records are available.
      </p>
    </div>
  );
}

export function LeadAnalyticsOverview({
  leads,
  rawLeads,
  monthLabel,
  referenceDate,
}: LeadAnalyticsOverviewProps) {
  const theme = useChartTheme();
  const gradientId = React.useId().replace(/:/g, "");

  const statusData = React.useMemo(() => buildStatusData(leads), [leads]);
  const sourceData = React.useMemo(() => buildSourceData(leads), [leads]);
  const trendData = React.useMemo(
    () =>
      buildTrend(
        rawLeads,
        monthLabel,
        referenceDate,
      ),
    [monthLabel, rawLeads, referenceDate],
  );

  const unread = React.useMemo(
    () => leads.filter((lead) => lead.isRead !== true).length,
    [leads],
  );
  const waitingReply = React.useMemo(
    () => leads.filter((lead) => lead.isPending === true).length,
    [leads],
  );
  const scheduled = React.useMemo(
    () =>
      leads.filter(
        (lead) =>
          Boolean(lead.appointment) ||
          normalizedStatus(lead.status) === "Appointment Set",
      ).length,
    [leads],
  );
  const needsFollowUp = React.useMemo(
    () =>
      leads.filter(
        (lead) =>
          lead.isRead !== true ||
          lead.isPending === true ||
          Boolean(lead.appointment) ||
          normalizedStatus(lead.status) === "Appointment Set",
      ).length,
    [leads],
  );

  const leadingSource = sourceData.sources[0];
  const followUpRows = [
    {
      label: "Unread Customer Messages",
      value: unread,
      description: "Customer conversations that still need to be reviewed.",
      color: theme.palette[1],
    },
    {
      label: "Waiting for a Team Reply",
      value: waitingReply,
      description: "Leads currently waiting for someone on the team to respond.",
      color: theme.palette[3],
    },
    {
      label: "Scheduled Follow-ups",
      value: scheduled,
      description: "Leads with an appointment or another scheduled next step.",
      color: theme.palette[2],
    },
  ];

  if (leads.length === 0) {
    return <EmptyLeadAnalytics monthLabel={monthLabel} />;
  }

  return (
    <div className="min-w-0 space-y-5">
      <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Customer Leads"
          value={leads.length.toLocaleString("en-US")}
          description={`Customer inquiries included in ${monthLabel}.`}
          icon={<Users className="size-5" />}
          tone="bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300"
        />
        <MetricCard
          label="Leads That Need Follow-up"
          value={needsFollowUp.toLocaleString("en-US")}
          description={`${leads.length > 0 ? ((needsFollowUp / leads.length) * 100).toFixed(1) : "0.0"}% of leads have a message, reply, or scheduled next step to review.`}
          icon={<MessageCircleMore className="size-5" />}
          tone="bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300"
        />
        <MetricCard
          label="Scheduled Follow-ups"
          value={scheduled.toLocaleString("en-US")}
          description="Appointments and scheduled next steps for dealership staff."
          icon={<CalendarClock className="size-5" />}
          tone="bg-violet-50 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300"
        />
        <MetricCard
          label="Leading Inquiry Source"
          value={leadingSource?.name ?? "No source recorded"}
          description={
            leadingSource
              ? `${leadingSource.value.toLocaleString("en-US")} leads came from this source.`
              : "No recognized customer inquiry source is available."
          }
          icon={<TrendingUp className="size-5" />}
          tone="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
        />
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-5 xl:grid-cols-2">
        <section className="min-w-0 rounded-xl border border-border/80 bg-card p-4 shadow-sm sm:p-5">
          <h3 className="text-base font-bold text-foreground sm:text-lg">
            Where Leads Are in the Sales Process
          </h3>
          <p className="mt-1 text-sm leading-6 text-slate-700 dark:text-slate-300">
            Shows how many customer leads are new, being contacted, waiting, scheduled, or completed.
          </p>

          <div className="mt-4 grid min-w-0 gap-4 sm:grid-cols-[minmax(190px,0.8fr)_minmax(0,1.2fr)] sm:items-center">
            <div className="relative mx-auto size-52 shrink-0 overflow-visible">
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <PieChart style={{ overflow: "visible" }}>
                  <Pie
                    data={statusData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={58}
                    outerRadius={92}
                    paddingAngle={2}
                    strokeWidth={0}
                  >
                    {statusData.map((entry, index) => (
                      <Cell
                        key={`${entry.name}-${index}`}
                        fill={theme.palette[index % theme.palette.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    content={<OverviewTooltip />}
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
                  {leads.length.toLocaleString("en-US")}
                </span>
                <span className="mt-1 text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  leads
                </span>
              </div>
            </div>

            <div className="space-y-2">
              {statusData.map((item, index) => {
                const percentage =
                  leads.length > 0 ? (item.value / leads.length) * 100 : 0;
                return (
                  <div
                    key={item.name}
                    className="flex min-w-0 items-center gap-3 rounded-lg border border-border/60 bg-muted/20 px-3 py-2.5"
                  >
                    <span
                      className="size-2.5 shrink-0 rounded-full"
                      style={{
                        backgroundColor:
                          theme.palette[index % theme.palette.length],
                      }}
                    />
                    <span className="min-w-0 flex-1 text-sm font-semibold text-slate-700 dark:text-slate-300">
                      {item.name}
                    </span>
                    <span className="shrink-0 text-sm font-bold text-foreground">
                      {item.value.toLocaleString("en-US")}
                      <span className="ml-1 font-medium text-slate-600 dark:text-slate-300">
                        ({percentage.toFixed(1)}%)
                      </span>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="min-w-0 rounded-xl border border-border/80 bg-card p-4 shadow-sm sm:p-5">
          <h3 className="text-base font-bold text-foreground sm:text-lg">
            Follow-up Priorities
          </h3>
          <p className="mt-1 text-sm leading-6 text-slate-700 dark:text-slate-300">
            Helps the team see which customer leads need attention next. A lead may appear in more than one group.
          </p>

          <div className="mt-4 space-y-3">
            {followUpRows.map((row) => {
              const percentage =
                leads.length > 0 ? (row.value / leads.length) * 100 : 0;
              return (
                <div
                  key={row.label}
                  className="rounded-xl border border-border/70 bg-muted/15 px-4 py-3.5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 text-sm font-bold text-foreground">
                        <span
                          className="size-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: row.color }}
                        />
                        {row.label}
                      </p>
                      <p className="mt-1 text-sm leading-5 text-slate-700 dark:text-slate-300">
                        {row.description}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-xl font-black text-foreground">
                        {row.value.toLocaleString("en-US")}
                      </p>
                      <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                        {percentage.toFixed(1)}% of leads
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full transition-[width] duration-300"
                      style={{
                        width: `${Math.min(100, percentage)}%`,
                        backgroundColor: row.color,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="min-w-0 rounded-xl border border-border/80 bg-card p-4 shadow-sm sm:p-5">
          <h3 className="text-base font-bold text-foreground sm:text-lg">
            Where Customer Inquiries Come From
          </h3>
          <p className="mt-1 text-sm leading-6 text-slate-700 dark:text-slate-300">
            Ranks every website, referral, and sales channel bringing customer leads to the dealership.
          </p>

          {sourceData.sources.length === 0 ? (
            <div className="mt-4 rounded-xl border border-dashed border-border px-4 py-8 text-center">
              <CircleHelp className="mx-auto size-7 text-muted-foreground/50" />
              <p className="mt-2 text-sm font-semibold text-foreground">
                No recognized lead sources are available
              </p>
            </div>
          ) : (
            <>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  {sourceData.sources.length.toLocaleString("en-US")} recognized source{sourceData.sources.length === 1 ? "" : "s"}
                </p>
                {sourceData.sources.length > 7 ? (
                  <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                    Scroll to review the complete ranking
                  </p>
                ) : null}
              </div>
              <div className="mt-2 max-h-[480px] space-y-2.5 overflow-y-auto pr-1">
                {sourceData.sources.map((source, index) => (
                <div
                  key={source.name}
                  className="rounded-xl border border-border/70 bg-muted/15 px-3.5 py-3"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-xs font-black text-primary">
                      {index + 1}
                    </span>
                    <span className="min-w-0 flex-1 break-words text-sm font-bold text-foreground">
                      {source.name}
                    </span>
                    <span className="shrink-0 text-sm font-black text-foreground">
                      {source.value.toLocaleString("en-US")}
                      <span className="ml-1 font-medium text-slate-600 dark:text-slate-300">
                        ({source.percentage.toFixed(1)}%)
                      </span>
                    </span>
                  </div>
                  <div className="ml-10 mt-2 h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.min(100, source.percentage)}%`,
                        backgroundColor:
                          theme.palette[index % theme.palette.length],
                      }}
                    />
                  </div>
                </div>
                ))}
              </div>
            </>
          )}

          <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-amber-500/25 bg-amber-500/[0.07] px-3.5 py-3">
            <div className="min-w-0">
              <p className="text-sm font-bold text-foreground">
                Leads Without a Recorded Source
              </p>
              <p className="mt-0.5 text-sm text-slate-700 dark:text-slate-300">
                Customer leads that do not yet show where the inquiry came from.
              </p>
            </div>
            <span className="shrink-0 text-lg font-black text-foreground">
              {sourceData.unattributed.toLocaleString("en-US")}
            </span>
          </div>
        </section>

        <section className="min-w-0 rounded-xl border border-border/80 bg-card p-4 shadow-sm sm:p-5">
          <h3 className="text-base font-bold text-foreground sm:text-lg">
            New Leads Over Time
          </h3>
          <p className="mt-1 text-sm leading-6 text-slate-700 dark:text-slate-300">
            Shows how the number of new customer inquiries changed during the last six months.
          </p>

          <div className="mt-4 h-[300px] min-w-0">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <AreaChart
                data={trendData}
                margin={{ top: 10, right: 34, left: 4, bottom: 12 }}
              >
                <defs>
                  <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor={theme.palette[1]}
                      stopOpacity={0.32}
                    />
                    <stop
                      offset="95%"
                      stopColor={theme.palette[1]}
                      stopOpacity={0.02}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  vertical={false}
                  stroke={theme.grid}
                  strokeDasharray="3 3"
                />
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 12, fill: theme.axis, fontWeight: 600 }}
                  padding={{ left: 10, right: 10 }}
                />
                <YAxis
                  allowDecimals={false}
                  tickLine={false}
                  axisLine={false}
                  width={42}
                  tick={{ fontSize: 12, fill: theme.axis, fontWeight: 600 }}
                />
                <Tooltip
                  content={<OverviewTooltip />}
                  cursor={{ stroke: theme.cursor, strokeWidth: 1.5 }}
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
                  dataKey="leads"
                  name="New Leads"
                  stroke={theme.palette[1]}
                  fill={`url(#${gradientId})`}
                  strokeWidth={3}
                  dot={{
                    r: 3,
                    fill: theme.palette[1],
                    stroke: theme.palette[1],
                    strokeWidth: 1,
                  }}
                  activeDot={{
                    r: 6,
                    fill: "#FFFFFF",
                    stroke: theme.palette[1],
                    strokeWidth: 3,
                  }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>
    </div>
  );
}

export default LeadAnalyticsOverview;
