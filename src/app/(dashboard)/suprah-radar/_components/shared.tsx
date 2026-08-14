"use client";

import * as React from "react";
import { ArrowDownRight, ArrowRight, ArrowUpRight, WifiOff, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

export const CHART_COLORS = {
  primary: "#10B981",
  market: "#2563EB",
  accent: "#7C3AED",
  warn: "#F59E0B",
  danger: "#EF4444",
  muted: "#64748B",
} as const;

export interface ChartTheme {
  axis: string;
  grid: string;
  cursor: string;
  surface: string;
  foreground: string;
}

const LIGHT_THEME: ChartTheme = {
  axis: "#475569",
  grid: "rgba(71, 85, 105, 0.18)",
  cursor: "rgba(16, 185, 129, 0.10)",
  surface: "#FFFFFF",
  foreground: "#0F172A",
};

const DARK_THEME: ChartTheme = {
  axis: "#94A3B8",
  grid: "rgba(148, 163, 184, 0.22)",
  cursor: "rgba(16, 185, 129, 0.14)",
  surface: "#0B1220",
  foreground: "#F8FAFC",
};

export function useChartTheme(): ChartTheme {
  const [theme, setTheme] = React.useState<ChartTheme>(LIGHT_THEME);

  React.useEffect(() => {
    const update = () =>
      setTheme(document.documentElement.classList.contains("dark") ? DARK_THEME : LIGHT_THEME);
    update();
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  return theme;
}

export function formatCurrency(value?: number | null, compact = false): string {
  if (!value || !Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
    notation: compact && Math.abs(value) >= 10000 ? "compact" : "standard",
  }).format(value);
}

export function formatNumber(value?: number | null, compact = false): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 1,
    notation: compact && Math.abs(value) >= 10000 ? "compact" : "standard",
  }).format(value);
}

export function formatPercent(value?: number | null, digits = 0): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${value.toFixed(digits)}%`;
}

export function ordinal(n?: number | null): string {
  if (!n || !Number.isFinite(n)) return "—";
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
}

export function Delta({
  value,
  suffix = "%",
  invert = false,
  className,
}: {
  value?: number | null;
  suffix?: string;
  invert?: boolean;
  className?: string;
}) {
  if (value == null || !Number.isFinite(value) || value === 0) {
    return (
      <span className={cn("inline-flex items-center gap-1 text-xs text-muted-foreground", className)}>
        <ArrowRight className="size-3" />
        flat
      </span>
    );
  }
  const good = invert ? value < 0 : value > 0;
  const Icon = value > 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-xs font-medium tabular-nums",
        good ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400",
        className,
      )}
    >
      <Icon className="size-3.5" />
      {Math.abs(value).toLocaleString("en-US", { maximumFractionDigits: 1 })}
      {suffix}
    </span>
  );
}

export function SectionShell({
  id,
  title,
  description,
  icon: Icon,
  actions,
  children,
  className,
}: {
  id?: string;
  title: string;
  description?: string;
  icon?: LucideIcon;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section id={id} className={cn("scroll-mt-24 space-y-4", className)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 space-y-1">
          <h2 className="flex items-center gap-2 text-base font-semibold tracking-tight sm:text-lg">
            {Icon && <Icon className="size-4 shrink-0 text-primary sm:size-5" />}
            <span className="truncate">{title}</span>
          </h2>
          {description && (
            <p className="text-xs text-muted-foreground sm:text-sm">{description}</p>
          )}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {children}
    </section>
  );
}

export function Panel({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "rounded-xl border bg-card text-card-foreground shadow-sm transition-colors",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function StatTile({
  label,
  value,
  hint,
  delta,
  deltaSuffix,
  invertDelta,
  icon: Icon,
  accent = "default",
  loading,
  onClick,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  delta?: number | null;
  deltaSuffix?: string;
  invertDelta?: boolean;
  icon?: LucideIcon;
  accent?: "default" | "primary" | "warn" | "danger";
  loading?: boolean;
  onClick?: () => void;
}) {
  const accentRing = {
    default: "",
    primary: "ring-1 ring-primary/20",
    warn: "ring-1 ring-amber-500/25",
    danger: "ring-1 ring-rose-500/25",
  }[accent];

  return (
    <Panel
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onClick();
            }
          }
          : undefined
      }
      className={cn(
        "group relative overflow-hidden p-4",
        accentRing,
        onClick && "cursor-pointer hover:border-primary/40 hover:shadow-md",
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-6 -top-8 size-24 rounded-full bg-primary/5 blur-2xl transition-opacity group-hover:opacity-100 dark:bg-primary/10"
      />
      <div className="relative flex items-start justify-between gap-2">
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        {Icon && <Icon className="size-4 shrink-0 text-muted-foreground/70" />}
      </div>
      <div className="relative mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
        {loading ? (
          <Skeleton className="h-7 w-24" />
        ) : (
          <span className="text-xl font-semibold tabular-nums tracking-tight sm:text-2xl">
            {value}
          </span>
        )}
        {!loading && delta != null && <Delta value={delta} suffix={deltaSuffix} invert={invertDelta} />}
      </div>
      {hint && <p className="relative mt-1 text-[11px] text-muted-foreground">{hint}</p>}
    </Panel>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-6 py-10 text-center">
      {Icon && <Icon className="size-8 text-muted-foreground/40" />}
      <p className="text-sm font-medium">{title}</p>
      {description && <p className="max-w-md text-xs text-muted-foreground">{description}</p>}
      {action}
    </div>
  );
}

export function RankBadge({ rank, isYou }: { rank: number; isYou?: boolean }) {
  const medal =
    rank === 1
      ? "bg-amber-400/20 text-amber-700 ring-amber-500/40 dark:text-amber-300"
      : rank === 2
        ? "bg-slate-400/20 text-slate-700 ring-slate-400/40 dark:text-slate-200"
        : rank === 3
          ? "bg-orange-400/20 text-orange-700 ring-orange-500/40 dark:text-orange-300"
          : "bg-muted text-muted-foreground ring-border";
  return (
    <span
      className={cn(
        "inline-flex size-6 shrink-0 items-center justify-center rounded-md text-[11px] font-semibold tabular-nums ring-1",
        medal,
        isYou && "ring-primary/60",
      )}
    >
      {rank}
    </span>
  );
}

export function ProgressMeter({
  value,
  tone = "primary",
  className,
}: {
  value: number;
  tone?: "primary" | "warn" | "danger" | "market";
  className?: string;
}) {
  const bar = {
    primary: "bg-emerald-500",
    market: "bg-blue-500",
    warn: "bg-amber-500",
    danger: "bg-rose-500",
  }[tone];
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-muted", className)}>
      <div
        className={cn("h-full rounded-full transition-all duration-500", bar)}
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}

export function ChartTooltip({
  active,
  payload,
  label,
  theme,
  formatter,
}: {
  active?: boolean;
  payload?: { name?: string; value?: number | string; color?: string; dataKey?: string }[];
  label?: string;
  theme: ChartTheme;
  formatter?: (value: number, key: string) => string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-lg border px-3 py-2 text-xs shadow-lg"
      style={{ background: theme.surface, borderColor: theme.grid, color: theme.foreground }}
    >
      <p className="mb-1 font-medium">{label}</p>
      <div className="space-y-0.5">
        {payload.map((entry, i) => (
          <div key={i} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full" style={{ background: entry.color }} />
              {entry.name}
            </span>
            <span className="font-medium tabular-nums">
              {formatter && typeof entry.value === "number"
                ? formatter(entry.value, String(entry.dataKey ?? ""))
                : String(entry.value ?? "")}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ConnectionNotice({
  hasCachedData,
  onRetry,
}: {
  hasCachedData: boolean;
  onRetry: () => void;
}) {
  const [online, setOnline] = React.useState(true);

  React.useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  return (
    <div
      role="status"
      className="flex flex-wrap items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300"
    >
      <WifiOff className="size-3.5 shrink-0" />
      <span className="min-w-0 flex-1">
        {online ? "Market data is unavailable right now." : "You are offline."}
        {hasCachedData ? " Showing the last data loaded." : ""}
      </span>
      <button
        type="button"
        onClick={onRetry}
        className="shrink-0 rounded-md border border-amber-500/40 px-2 py-1 font-medium transition-colors hover:bg-amber-500/15"
      >
        Try again
      </button>
    </div>
  );
}

export function TabFallback() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <div className="grid gap-3 xl:grid-cols-2">
        <Skeleton className="h-72" />
        <Skeleton className="h-72" />
      </div>
    </div>
  );
}

export function LoadingRows({ rows = 5, height = "h-10" }: { rows?: number; height?: string }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className={cn("w-full", height)} />
      ))}
    </div>
  );
}
