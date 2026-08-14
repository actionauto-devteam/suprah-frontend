"use client";

import * as React from "react";
import { Download, Globe2, Loader2, MapPin, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/AuthProvider";
import {
  downloadMarketCsv,
  useScopeOptions,
  type MarketFilters,
} from "@/hooks/useSuprahRadar";
import type { ConditionFilter, ScopeType } from "@/types/suprah-radar";

const PERIODS = [
  { value: 7, label: "7 days" },
  { value: 30, label: "30 days" },
  { value: 90, label: "90 days" },
  { value: 180, label: "6 months" },
  { value: 365, label: "12 months" },
];

const CONDITIONS: { value: ConditionFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "new", label: "New" },
  { value: "used", label: "Used" },
];

export function ScopeBar({
  filters,
  onChange,
  onRefresh,
  refreshing,
  scopeLabel,
  updatedAt,
}: {
  filters: MarketFilters;
  onChange: (next: MarketFilters) => void;
  onRefresh: () => void;
  refreshing?: boolean;
  scopeLabel?: string;
  updatedAt?: number;
}) {
  const { getToken } = useAuth();
  const { data: options } = useScopeOptions();
  const [exporting, setExporting] = React.useState(false);

  const states = options?.states ?? [];
  const metros = options?.metros ?? [];

  const handleScope = (value: ScopeType) => {
    if (value === "state") {
      onChange({ ...filters, scope: "state", state: filters.state || states[0]?.value, city: undefined });
      return;
    }
    if (value === "metro") {
      const metro = metros.find((m) => m.city === filters.city) ?? metros[0];
      onChange({ ...filters, scope: "metro", city: metro?.city, state: metro?.state });
      return;
    }
    onChange({ ...filters, scope: "national", state: undefined, city: undefined });
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      await downloadMarketCsv(filters, getToken);
      toast.success("Market export downloaded");
    } catch {
      toast.error("Export failed. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="relative -mx-3 border-b bg-background/85 px-3 py-3 sm:-mx-4 sm:px-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-1 rounded-lg border bg-card p-1">
            {(
              [
                { value: "national", label: "Nationwide", icon: Globe2 },
                { value: "state", label: "State", icon: MapPin },
                { value: "metro", label: "Metro", icon: MapPin },
              ] as { value: ScopeType; label: string; icon: typeof Globe2 }[]
            ).map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => handleScope(option.value)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors sm:text-[13px]",
                  filters.scope === option.value
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted",
                )}
                aria-pressed={filters.scope === option.value}
              >
                <option.icon className="size-3.5" />
                {option.label}
              </button>
            ))}
          </div>

          {filters.scope === "state" && (
            <Select
              value={filters.state ?? ""}
              onValueChange={(value) => onChange({ ...filters, state: value })}
            >
              <SelectTrigger className="h-9 w-32.5 text-xs sm:text-sm">
                <SelectValue placeholder="State" />
              </SelectTrigger>
              <SelectContent>
                {states.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.value} · {s.count.toLocaleString()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {filters.scope === "metro" && (
            <Select
              value={filters.city ?? ""}
              onValueChange={(value) => {
                const metro = metros.find((m) => m.city === value);
                onChange({ ...filters, city: value, state: metro?.state });
              }}
            >
              <SelectTrigger className="h-9 w-47.5 text-xs sm:text-sm">
                <SelectValue placeholder="Metro area" />
              </SelectTrigger>
              <SelectContent>
                {metros.map((m) => (
                  <SelectItem key={`${m.city}-${m.state}`} value={m.city}>
                    {m.city}
                    {m.state ? `, ${m.state}` : ""} · {m.count.toLocaleString()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <div className="inline-flex items-center gap-1 rounded-lg border bg-card p-1">
            {CONDITIONS.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => onChange({ ...filters, condition: c.value })}
                className={cn(
                  "rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors sm:text-[13px]",
                  filters.condition === c.value
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted",
                )}
                aria-pressed={filters.condition === c.value}
              >
                {c.label}
              </button>
            ))}
          </div>

          <Select
            value={String(filters.days)}
            onValueChange={(value) => onChange({ ...filters, days: Number(value) })}
          >
            <SelectTrigger className="h-9 w-30 text-xs sm:text-sm">
              <SlidersHorizontal className="mr-1 size-3.5 opacity-60" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PERIODS.map((p) => (
                <SelectItem key={p.value} value={String(p.value)}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-between gap-2 lg:justify-end">
          {scopeLabel && (
            <span className="truncate rounded-md bg-muted px-2 py-1 text-[11px] font-medium text-muted-foreground">
              {scopeLabel}
            </span>
          )}
          <div className="flex items-center gap-2">
            <LiveIndicator updatedAt={updatedAt} refreshing={refreshing} onRefresh={onRefresh} />
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              disabled={exporting}
              className="h-9"
            >
              {exporting ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Download className="size-3.5" />
              )}
              <span className="hidden sm:inline">Export</span>
            </Button>
          </div>
        </div>
      </div>

      {refreshing && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-0.5 overflow-hidden"
        >
          <span className="radar-progress block h-full w-1/3 rounded-full bg-primary/70" />
        </span>
      )}
      <style>{`
        @keyframes radar-progress { 0% { transform: translateX(-110%); } 100% { transform: translateX(420%); } }
        .radar-progress { animation: radar-progress 1.1s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) { .radar-progress { animation: none; opacity: .5; } }
      `}</style>
    </div>
  );
}

function LiveIndicator({
  updatedAt,
  refreshing,
  onRefresh,
}: {
  updatedAt?: number;
  refreshing?: boolean;
  onRefresh: () => void;
}) {
  const [label, setLabel] = React.useState("Syncing");

  React.useEffect(() => {
    const compute = () => {
      if (!updatedAt) {
        setLabel("Syncing");
        return;
      }
      const seconds = Math.max(0, Math.round((Date.now() - updatedAt) / 1000));
      if (seconds < 60) {
        setLabel("Updated just now");
        return;
      }
      const minutes = Math.round(seconds / 60);
      setLabel(minutes < 60 ? `Updated ${minutes}m ago` : `Updated ${Math.round(minutes / 60)}h ago`);
    };

    compute();
    const id = setInterval(compute, 30_000);
    return () => clearInterval(id);
  }, [updatedAt]);

  return (
    <button
      type="button"
      onClick={onRefresh}
      title="Auto-refreshes every 5 minutes. Click to update now."
      className="inline-flex items-center gap-1.5 rounded-md px-1.5 py-1 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
    >
      <span
        className={cn(
          "size-1.5 rounded-full",
          refreshing ? "animate-pulse bg-primary" : "bg-emerald-500",
        )}
      />
      <span className="hidden whitespace-nowrap sm:inline">{label}</span>
      <span className="sm:hidden">Live</span>
    </button>
  );
}
