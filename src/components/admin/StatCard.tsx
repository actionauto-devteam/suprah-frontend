import React from "react";
import { TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
  helper?: string;
  trend?: { value: string; positive?: boolean };
  color?: "emerald" | "blue" | "amber" | "violet" | "rose" | "indigo";
  className?: string;
}

const ICON_COLOR: Record<NonNullable<StatCardProps["color"]>, string> = {
  emerald: "bg-emerald-500/10 text-emerald-500",
  blue: "bg-blue-500/10 text-blue-500",
  amber: "bg-amber-500/10 text-amber-500",
  violet: "bg-violet-500/10 text-violet-500",
  rose: "bg-rose-500/10 text-rose-500",
  indigo: "bg-indigo-500/10 text-indigo-500",
};

const GLOW_COLOR: Record<NonNullable<StatCardProps["color"]>, string> = {
  emerald: "bg-emerald-500/5",
  blue: "bg-blue-500/5",
  amber: "bg-amber-500/5",
  violet: "bg-violet-500/5",
  rose: "bg-rose-500/5",
  indigo: "bg-indigo-500/5",
};

export function StatCard({
  icon: Icon,
  label,
  value,
  helper,
  trend,
  color = "emerald",
  className,
}: StatCardProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border border-border/40 bg-card p-0 transition-all duration-200 hover:border-border/80",
        className
      )}
    >
      <div className="p-3 sm:p-4 lg:p-5">
        <div className="flex items-start justify-between">
          <div className={cn("rounded-lg p-1.5 sm:rounded-xl sm:p-2", ICON_COLOR[color])}>
            <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
          </div>
          {trend && (
            <div
              className={cn(
                "flex items-center gap-0.5 text-[10px] font-bold",
                trend.positive === false ? "text-rose-500" : "text-emerald-500"
              )}
            >
              {trend.positive === false ? (
                <TrendingDown className="h-3 w-3" />
              ) : (
                <TrendingUp className="h-3 w-3" />
              )}
              {trend.value}
            </div>
          )}
        </div>

        <div className="mt-2 sm:mt-3">
          <h3 className="truncate text-xl font-black leading-none tracking-tight tabular-nums sm:text-2xl">
            {value}
          </h3>
          <p className="mt-0.5 truncate text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
            {label}
          </p>
        </div>

        {helper && (
          <p className="mt-1.5 truncate text-[9px] font-medium text-muted-foreground/40">
            {helper}
          </p>
        )}

        <div
          className={cn(
            "pointer-events-none absolute -bottom-4 -right-4 h-20 w-20 rounded-full blur-2xl",
            GLOW_COLOR[color]
          )}
        />
      </div>
    </div>
  );
}
