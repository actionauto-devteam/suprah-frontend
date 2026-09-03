import React from "react";
import Link from "next/link";
import { ArrowUpRight, TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

type Tone = "default" | "attention" | "critical" | "positive";

interface StatCardProps {
  icon?: React.ElementType;
  label: string;
  value: React.ReactNode;
  helper?: string;
  trend?: { value: string; positive?: boolean };
  tone?: Tone;
  href?: string;
  color?: "emerald" | "blue" | "amber" | "violet" | "rose" | "indigo";
  className?: string;
}

const TONE_ACCENT: Record<Tone, string> = {
  default: "bg-border",
  attention: "bg-amber-500",
  critical: "bg-red-500",
  positive: "bg-emerald-500",
};

const TONE_VALUE: Record<Tone, string> = {
  default: "text-foreground",
  attention: "text-amber-600 dark:text-amber-400",
  critical: "text-red-600 dark:text-red-400",
  positive: "text-emerald-600 dark:text-emerald-400",
};

export function StatCard({
  icon: Icon,
  label,
  value,
  helper,
  trend,
  tone = "default",
  href,
  className,
}: StatCardProps) {
  const body = (
    <div
      className={cn(
        "group relative flex h-full items-start gap-3 overflow-hidden rounded-lg border border-border bg-card p-4 transition-colors",
        href && "hover:border-foreground/20 hover:bg-accent/40",
        className,
      )}
    >
      <span
        aria-hidden
        className={cn("absolute inset-y-0 left-0 w-0.5", TONE_ACCENT[tone])}
      />

      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex items-center gap-1.5">
          {Icon && <Icon className="size-3.5 shrink-0 text-muted-foreground" />}
          <span className="truncate text-xs font-medium text-muted-foreground">{label}</span>
        </div>

        <div className="flex items-baseline gap-2">
          <span
            className={cn(
              "text-2xl font-semibold leading-none tracking-tight tabular-nums",
              TONE_VALUE[tone],
            )}
          >
            {value}
          </span>
          {trend && (
            <span
              className={cn(
                "flex items-center gap-0.5 text-xs font-medium tabular-nums",
                trend.positive === false
                  ? "text-red-600 dark:text-red-400"
                  : "text-emerald-600 dark:text-emerald-400",
              )}
            >
              {trend.positive === false ? (
                <TrendingDown className="size-3" />
              ) : (
                <TrendingUp className="size-3" />
              )}
              {trend.value}
            </span>
          )}
        </div>

        {helper && <p className="truncate text-xs text-muted-foreground">{helper}</p>}
      </div>

      {href && (
        <ArrowUpRight className="size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
      )}
    </div>
  );

  return href ? (
    <Link href={href} className="block h-full">
      {body}
    </Link>
  ) : (
    body
  );
}
