"use client";

import * as React from "react";
import {
  Archive,
  ChevronDown,
  ChevronUp,
  Gauge,
  ListFilter,
  Radio,
  SlidersHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { LoadStats } from "@/lib/api/loads";

export type TransportationView = "shipments" | "drafts" | "load-board";

type OpenPanel = "filters" | "status" | null;

const PIPELINE_STATUSES = [
  "Draft",
  "Posted",
  "Assigned",
  "Accepted",
  "Picked Up",
  "In-Transit",
] as const;

const COMPLETED_STATUSES = ["Delivered", "Cancelled"] as const;

const QUOTE_STATUSES = [
  { key: "pending", label: "Pending" },
  { key: "accepted", label: "Accepted" },
  { key: "booked", label: "Booked" },
  { key: "rejected", label: "Rejected" },
] as const;

const STATUS_THEME: Record<
  string,
  { active: string; dot: string; glow: string; bar: string }
> = {
  Draft: {
    active: "bg-slate-500/10 text-slate-600 dark:text-slate-300 border-slate-500/30",
    dot: "bg-slate-500",
    glow: "shadow-[0_0_8px_rgba(100,116,139,0.5)]",
    bar: "bg-slate-500",
  },
  Posted: {
    active: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border-emerald-500/30",
    dot: "bg-emerald-500",
    glow: "shadow-[0_0_8px_rgba(16,185,129,0.55)]",
    bar: "bg-emerald-500",
  },
  Assigned: {
    active: "bg-blue-500/10 text-blue-600 dark:text-blue-300 border-blue-500/30",
    dot: "bg-blue-500",
    glow: "shadow-[0_0_8px_rgba(59,130,246,0.55)]",
    bar: "bg-blue-500",
  },
  Accepted: {
    active: "bg-violet-500/10 text-violet-600 dark:text-violet-300 border-violet-500/30",
    dot: "bg-violet-500",
    glow: "shadow-[0_0_8px_rgba(139,92,246,0.55)]",
    bar: "bg-violet-500",
  },
  "Picked Up": {
    active: "bg-amber-500/10 text-amber-600 dark:text-amber-300 border-amber-500/30",
    dot: "bg-amber-500",
    glow: "shadow-[0_0_8px_rgba(245,158,11,0.55)]",
    bar: "bg-amber-500",
  },
  "In-Transit": {
    active: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-300 border-cyan-500/30",
    dot: "bg-cyan-500",
    glow: "shadow-[0_0_8px_rgba(6,182,212,0.55)]",
    bar: "bg-cyan-500",
  },
  Delivered: {
    active: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border-emerald-500/30",
    dot: "bg-emerald-500",
    glow: "shadow-[0_0_8px_rgba(16,185,129,0.55)]",
    bar: "bg-emerald-500",
  },
  Cancelled: {
    active: "bg-red-500/10 text-red-600 dark:text-red-300 border-red-500/30",
    dot: "bg-red-500",
    glow: "shadow-[0_0_8px_rgba(239,68,68,0.55)]",
    bar: "bg-red-500",
  },
  pending: {
    active: "bg-amber-500/10 text-amber-600 dark:text-amber-300 border-amber-500/30",
    dot: "bg-amber-500",
    glow: "shadow-[0_0_8px_rgba(245,158,11,0.55)]",
    bar: "bg-amber-500",
  },
  accepted: {
    active: "bg-violet-500/10 text-violet-600 dark:text-violet-300 border-violet-500/30",
    dot: "bg-violet-500",
    glow: "shadow-[0_0_8px_rgba(139,92,246,0.55)]",
    bar: "bg-violet-500",
  },
  booked: {
    active: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border-emerald-500/30",
    dot: "bg-emerald-500",
    glow: "shadow-[0_0_8px_rgba(16,185,129,0.55)]",
    bar: "bg-emerald-500",
  },
  rejected: {
    active: "bg-red-500/10 text-red-600 dark:text-red-300 border-red-500/30",
    dot: "bg-red-500",
    glow: "shadow-[0_0_8px_rgba(239,68,68,0.55)]",
    bar: "bg-red-500",
  },
};

interface TransportationMobileFiltersProps {
  activeTab: TransportationView;
  selectedStatus: string;
  onStatusChange: (status: string) => void;
  selectedQuoteStatus: string;
  onQuoteStatusChange: (status: string) => void;
  stats: LoadStats;
  boardStats?: LoadStats;
  quoteStats?: Record<string, number>;
  origin: string;
  destination: string;
  visibility: string;
  onOriginChange: (value: string) => void;
  onDestinationChange: (value: string) => void;
  onVisibilityChange: (value: string) => void;
  resultCount: number;
  onClearFilters: () => void;
  onClearStatus: () => void;
}

function SectionLabel({
  icon: Icon,
  children,
}: {
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <p className="mb-2 flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.1em] text-muted-foreground/75 select-none">
      <Icon className="size-3" />
      {children}
    </p>
  );
}

function StatusRow({
  status,
  label,
  count,
  total,
  isActive,
  onSelect,
}: {
  status: string;
  label?: string;
  count: number;
  total: number;
  isActive: boolean;
  onSelect: () => void;
}) {
  const theme = STATUS_THEME[status] ?? {
    active: "bg-muted text-foreground border-border",
    dot: "bg-slate-500",
    glow: "",
    bar: "bg-slate-500",
  };
  const share = total > 0 ? Math.min(100, Math.round((count / total) * 100)) : 0;

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={isActive}
      className={cn(
        "group min-h-11 w-full rounded-xl border px-3 py-2.5 text-left transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50",
        isActive
          ? theme.active
          : "border-transparent text-foreground hover:bg-muted/60",
      )}
    >
      <span className="flex min-w-0 items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-2">
          <span
            className={cn(
              "size-2 shrink-0 rounded-full",
              theme.dot,
              isActive && theme.glow,
            )}
          />
          <span className={cn("truncate text-sm", isActive && "font-semibold")}>
            {label ?? status}
          </span>
        </span>
        <span className="shrink-0 font-mono text-sm tabular-nums text-muted-foreground">
          {count}
        </span>
      </span>
      <span className="mt-1 block h-0.5 w-full overflow-hidden rounded-full bg-muted/70">
        <span
          className={cn(
            "block h-full rounded-full transition-all duration-500",
            theme.bar,
            !isActive && "opacity-40 group-hover:opacity-70",
          )}
          style={{ width: `${share}%` }}
        />
      </span>
    </button>
  );
}

function OverviewCard({
  label,
  total,
  active,
  onSelect,
}: {
  label: string;
  total: number;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      className={cn(
        "relative w-full overflow-hidden rounded-xl border p-3 text-left transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50",
        active
          ? "border-emerald-500/40 bg-linear-to-br from-emerald-500/10 to-cyan-500/10"
          : "border-border/60 bg-background/40 hover:border-emerald-500/25",
      )}
    >
      <span className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-emerald-500/60 to-transparent" />
      <span className="flex items-end justify-between gap-2">
        <span className="min-w-0">
          <span className="block text-[11px] font-black uppercase tracking-[0.14em] text-muted-foreground/80">
            {label}
          </span>
          <span className="mt-1 block font-mono text-2xl font-black leading-none tracking-tight tabular-nums text-foreground">
            {total}
          </span>
        </span>
        <span
          className={cn(
            "shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-wider",
            active
              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              : "border-border/60 text-muted-foreground",
          )}
        >
          {active ? "Showing All" : "Show All"}
        </span>
      </span>
    </button>
  );
}

export function TransportationMobileFilters({
  activeTab,
  selectedStatus,
  onStatusChange,
  selectedQuoteStatus,
  onQuoteStatusChange,
  stats,
  boardStats,
  quoteStats,
  origin,
  destination,
  visibility,
  onOriginChange,
  onDestinationChange,
  onVisibilityChange,
  resultCount,
  onClearFilters,
  onClearStatus,
}: TransportationMobileFiltersProps) {
  const [openPanel, setOpenPanel] = React.useState<OpenPanel>(null);

  React.useEffect(() => {
    setOpenPanel(null);
  }, [activeTab]);

  const currentStats = (
    activeTab === "load-board" ? boardStats || stats : stats
  ) as unknown as Record<string, number | undefined>;

  const total = Number(
    activeTab === "drafts" ? quoteStats?.all ?? 0 : currentStats.all ?? 0,
  );

  const generalFilterCount =
    (origin.trim() ? 1 : 0) +
    (destination.trim() ? 1 : 0) +
    (activeTab !== "drafts" && visibility !== "all" ? 1 : 0);

  const statusFilterCount =
    activeTab === "drafts"
      ? selectedQuoteStatus !== "all"
        ? 1
        : 0
      : selectedStatus !== "all"
        ? 1
        : 0;

  const togglePanel = (panel: Exclude<OpenPanel, null>) => {
    setOpenPanel((current) => (current === panel ? null : panel));
  };

  return (
    <div className="space-y-2.5">
      <div className="grid grid-cols-2 gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => togglePanel("filters")}
          aria-expanded={openPanel === "filters"}
          aria-controls="transportation-mobile-general-filters"
          className={cn(
            "h-11 justify-center gap-2 rounded-xl border-border/60 bg-card/60 text-xs font-bold touch-manipulation",
            openPanel === "filters" &&
              "border-emerald-500/35 bg-emerald-500/6 text-foreground",
          )}
        >
          <SlidersHorizontal className="size-3.5" />
          Filters
          {generalFilterCount > 0 ? (
            <span className="rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-black text-emerald-600 dark:text-emerald-400">
              {generalFilterCount}
            </span>
          ) : null}
          {openPanel === "filters" ? (
            <ChevronUp className="size-3.5" />
          ) : (
            <ChevronDown className="size-3.5" />
          )}
        </Button>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => togglePanel("status")}
          aria-expanded={openPanel === "status"}
          aria-controls="transportation-mobile-status-filter"
          className={cn(
            "h-11 justify-center gap-2 rounded-xl border-border/60 bg-card/60 text-xs font-bold touch-manipulation",
            openPanel === "status" &&
              "border-emerald-500/35 bg-emerald-500/6 text-foreground",
          )}
        >
          <ListFilter className="size-3.5" />
          Status
          {statusFilterCount > 0 ? (
            <span className="rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-black text-emerald-600 dark:text-emerald-400">
              {statusFilterCount}
            </span>
          ) : null}
          {openPanel === "status" ? (
            <ChevronUp className="size-3.5" />
          ) : (
            <ChevronDown className="size-3.5" />
          )}
        </Button>
      </div>

      {openPanel === "filters" ? (
        <section
          id="transportation-mobile-general-filters"
          aria-label="Transportation filters"
          className="overflow-hidden rounded-2xl border border-border/60 bg-card/75 shadow-sm"
        >
          <div className="flex items-center justify-between gap-3 border-b border-border/50 px-3 py-2.5">
            <div className="min-w-0">
              <p className="text-xs font-black text-foreground">Filters</p>
              <p className="text-[11px] text-muted-foreground">
                {resultCount} {activeTab === "drafts" ? "quotes" : "loads"} match
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setOpenPanel(null)}
              className="h-11 gap-1.5 px-3 text-xs text-muted-foreground touch-manipulation"
            >
              <ChevronUp className="size-3.5" />
              Hide
            </Button>
          </div>

          <div className="max-h-64 overflow-y-auto p-3">
            <div className="grid grid-cols-2 gap-3">
              <label className="min-w-0">
                <span className="mb-1.5 block text-[11px] font-black uppercase tracking-[0.08em] text-muted-foreground">
                  Origin
                </span>
                <Input
                  value={origin}
                  onChange={(event) => onOriginChange(event.target.value)}
                  placeholder="All Origins"
                  className="h-11 rounded-xl bg-background/70 text-sm"
                />
              </label>

              <label className="min-w-0">
                <span className="mb-1.5 block text-[11px] font-black uppercase tracking-[0.08em] text-muted-foreground">
                  Destination
                </span>
                <Input
                  value={destination}
                  onChange={(event) => onDestinationChange(event.target.value)}
                  placeholder="All Destinations"
                  className="h-11 rounded-xl bg-background/70 text-sm"
                />
              </label>

              {activeTab !== "drafts" ? (
                <label className="col-span-2 min-w-0">
                  <span className="mb-1.5 block text-[11px] font-black uppercase tracking-[0.08em] text-muted-foreground">
                    Visibility
                  </span>
                  <select
                    value={visibility}
                    onChange={(event) => onVisibilityChange(event.target.value)}
                    className="h-11 w-full rounded-xl border border-input bg-background/70 px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-emerald-500/35"
                  >
                    <option value="all">All</option>
                    <option value="public">Public</option>
                    <option value="private">Private</option>
                  </select>
                </label>
              ) : null}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 border-t border-border/50 bg-background/60 px-3 py-2.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClearFilters}
              className="h-11 rounded-xl text-xs font-bold"
            >
              Clear Filters
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => setOpenPanel(null)}
              className="h-11 rounded-xl bg-emerald-600 text-xs font-bold text-white hover:bg-emerald-700"
            >
              Show {resultCount}
            </Button>
          </div>
        </section>
      ) : null}

      {openPanel === "status" ? (
        <section
          id="transportation-mobile-status-filter"
          aria-label="Transportation status filter"
          className="overflow-hidden rounded-2xl border border-border/60 bg-card/75 shadow-sm"
        >
          <div className="flex items-center justify-between gap-3 border-b border-border/50 px-3 py-2.5">
            <div className="min-w-0">
              <p className="text-xs font-black text-foreground">Status</p>
              <p className="text-[11px] text-muted-foreground">
                {total} {activeTab === "drafts" ? "quotes" : "loads"}
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setOpenPanel(null)}
              className="h-11 gap-1.5 px-3 text-xs text-muted-foreground touch-manipulation"
            >
              <ChevronUp className="size-3.5" />
              Hide
            </Button>
          </div>

          <div className="max-h-72 space-y-4 overflow-y-auto p-3">
            {activeTab === "drafts" ? (
              <>
                <div>
                  <SectionLabel icon={Gauge}>Overview</SectionLabel>
                  <OverviewCard
                    label="Total Quotes"
                    total={total}
                    active={selectedQuoteStatus === "all"}
                    onSelect={() => onQuoteStatusChange("all")}
                  />
                </div>

                <div>
                  <SectionLabel icon={Radio}>Quote Status</SectionLabel>
                  <div className="space-y-1">
                    {QUOTE_STATUSES.map(({ key, label }) => (
                      <StatusRow
                        key={key}
                        status={key}
                        label={label}
                        count={Number(quoteStats?.[key] ?? 0)}
                        total={total}
                        isActive={selectedQuoteStatus === key}
                        onSelect={() => onQuoteStatusChange(key)}
                      />
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <>
                <div>
                  <SectionLabel icon={Gauge}>Overview</SectionLabel>
                  <OverviewCard
                    label={activeTab === "load-board" ? "Total Vehicles" : "Total Loads"}
                    total={total}
                    active={selectedStatus === "all"}
                    onSelect={() => onStatusChange("all")}
                  />
                </div>

                <div>
                  <SectionLabel icon={Radio}>Pipeline</SectionLabel>
                  <div className="space-y-1">
                    {PIPELINE_STATUSES.map((status) => (
                      <StatusRow
                        key={status}
                        status={status}
                        count={Number(currentStats[status] ?? 0)}
                        total={total}
                        isActive={selectedStatus === status}
                        onSelect={() => onStatusChange(status)}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <SectionLabel icon={Archive}>Completed</SectionLabel>
                  <div className="space-y-1">
                    {COMPLETED_STATUSES.map((status) => (
                      <StatusRow
                        key={status}
                        status={status}
                        count={Number(currentStats[status] ?? 0)}
                        total={total}
                        isActive={selectedStatus === status}
                        onSelect={() => onStatusChange(status)}
                      />
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 border-t border-border/50 bg-background/60 px-3 py-2.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClearStatus}
              className="h-11 rounded-xl text-xs font-bold"
            >
              Clear Status
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => setOpenPanel(null)}
              className="h-11 rounded-xl bg-emerald-600 text-xs font-bold text-white hover:bg-emerald-700"
            >
              Show {resultCount}
            </Button>
          </div>
        </section>
      ) : null}
    </div>
  );
}