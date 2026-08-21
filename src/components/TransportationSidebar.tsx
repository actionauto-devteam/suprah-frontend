"use client";

import * as React from "react";
import {
  X, Phone, Mail, Radio, Gauge, Archive, LifeBuoy, ChevronDown,
  Truck, FileText, Globe,
} from "lucide-react";
import { LoadStats } from "@/lib/api/loads";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

interface TransportationSidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  selectedStatus: string;
  setSelectedStatus: (status: string) => void;
  selectedQuoteStatus: string;
  setSelectedQuoteStatus: (status: string) => void;
  stats: LoadStats;
  loadStats?: LoadStats;
  quoteStats?: Record<string, number>;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
}

// Deterministic display order — the pipeline reads top-to-bottom in the same
// order a load actually moves through it.
const PIPELINE_STATUSES = [
  "Posted",
  "Assigned",
  "Accepted",
  "Picked Up",
  "In-Transit",
] as const;

const TERMINAL_STATUSES = ["Delivered", "Cancelled"] as const;

const QUOTE_STATUSES = [
  { key: "pending", label: "Pending" },
  { key: "accepted", label: "Accepted" },
  { key: "booked", label: "Booked" },
  { key: "rejected", label: "Rejected" },
] as const;

const VIEWS = [
  { key: "shipments", label: "My Loads", icon: Truck },
  { key: "drafts", label: "Quotes", icon: FileText },
  { key: "load-board", label: "Board", icon: Globe },
] as const;

const STATUS_THEME: Record<
  string,
  { active: string; dot: string; glow: string; bar: string }
> = {
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

function SectionLabel({
  icon: Icon,
  children,
}: {
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <p className="text-[10px] sm:text-[11px] font-black text-muted-foreground/70 uppercase tracking-[0.18em] mb-1.5 sm:mb-2 flex items-center gap-1.5 select-none">
      <Icon className="size-3" /> {children}
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
      onClick={onSelect}
      aria-pressed={isActive}
      className={cn(
        "w-full text-left px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-lg border transition-colors group",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50",
        isActive
          ? theme.active
          : "border-transparent hover:bg-muted/60 text-foreground",
      )}
    >
      <span className="flex items-center justify-between gap-2 min-w-0">
        <span className="flex items-center gap-2 min-w-0">
          <span
            className={cn(
              "size-2 rounded-full shrink-0",
              theme.dot,
              isActive && theme.glow,
            )}
          />
          <span
            className={cn(
              "truncate text-xs sm:text-sm",
              isActive && "font-semibold",
            )}
          >
            {label ?? status}
          </span>
        </span>
        <span className="text-muted-foreground font-mono text-xs tabular-nums shrink-0">
          {count}
        </span>
      </span>
      {/* Proportional micro-bar: this status's share of all loads */}
      <span className="mt-1 sm:mt-1.5 block h-0.5 w-full rounded-full bg-muted/70 overflow-hidden">
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


type TransportationMobileStatusPanelProps = Pick<
  TransportationSidebarProps,
  | "activeTab"
  | "selectedStatus"
  | "setSelectedStatus"
  | "selectedQuoteStatus"
  | "setSelectedQuoteStatus"
  | "stats"
  | "loadStats"
  | "quoteStats"
>;

function MobileCollapsibleSection({
  icon: Icon,
  title,
  open,
  onToggle,
  children,
}: {
  icon: React.ElementType;
  title: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <p className="text-[10px] font-black text-muted-foreground/70 uppercase tracking-[0.18em] flex items-center gap-1.5 select-none">
          <Icon className="size-3" />
          {title}
        </p>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          aria-label={`${open ? "Hide" : "Show"} ${title}`}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-border/50 bg-background/40 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50"
        >
          <ChevronDown
            className={cn(
              "size-3.5 transition-transform duration-200",
              open && "rotate-180",
            )}
          />
        </button>
      </div>
      {open && <div>{children}</div>}
    </section>
  );
}

export function TransportationMobileStatusPanel({
  activeTab,
  selectedStatus,
  setSelectedStatus,
  selectedQuoteStatus,
  setSelectedQuoteStatus,
  stats,
  loadStats,
  quoteStats,
}: TransportationMobileStatusPanelProps) {
  const [overviewOpen, setOverviewOpen] = React.useState(true);
  const [statusOpen, setStatusOpen] = React.useState(true);
  const [completedOpen, setCompletedOpen] = React.useState(true);

  const currentStats = (
    activeTab === "load-board" ? loadStats || stats : stats
  ) as unknown as Record<string, number | undefined>;

  const total = Number(currentStats.all ?? 0);
  const quoteTotal = Number(quoteStats?.all ?? 0);

  return (
    <section
      aria-label="Transportation overview and status filters"
      className="md:hidden border-b border-border bg-card/70 px-3 py-3"
    >
      <div className="space-y-3.5">
        {activeTab === "drafts" ? (
          <>
            <MobileCollapsibleSection
              icon={Gauge}
              title="Overview"
              open={overviewOpen}
              onToggle={() => setOverviewOpen((open) => !open)}
            >
              <button
                type="button"
                onClick={() => setSelectedQuoteStatus("all")}
                aria-pressed={selectedQuoteStatus === "all"}
                className={cn(
                  "w-full text-left rounded-xl border p-3 transition-colors relative overflow-hidden",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50",
                  selectedQuoteStatus === "all"
                    ? "border-emerald-500/40 bg-linear-to-br from-emerald-500/10 to-cyan-500/10"
                    : "border-border/60 bg-background/40",
                )}
              >
                <span className="absolute top-0 inset-x-0 h-px bg-linear-to-r from-transparent via-emerald-500/60 to-transparent" />
                <span className="flex items-end justify-between gap-2">
                  <span className="min-w-0">
                    <span className="block text-[10px] font-black text-muted-foreground/80 uppercase tracking-[0.18em]">
                      Total Quotes
                    </span>
                    <span className="block text-2xl font-black tracking-tight font-mono tabular-nums text-foreground leading-none mt-1">
                      {quoteTotal}
                    </span>
                  </span>
                  <span
                    className={cn(
                      "text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border shrink-0",
                      selectedQuoteStatus === "all"
                        ? "border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10"
                        : "border-border/60 text-muted-foreground",
                    )}
                  >
                    {selectedQuoteStatus === "all" ? "Showing All" : "Show All"}
                  </span>
                </span>
              </button>
            </MobileCollapsibleSection>

            <MobileCollapsibleSection
              icon={Radio}
              title="Quote Status"
              open={statusOpen}
              onToggle={() => setStatusOpen((open) => !open)}
            >
              <div className="space-y-1">
                {QUOTE_STATUSES.map(({ key, label }) => (
                  <StatusRow
                    key={key}
                    status={key}
                    label={label}
                    count={Number(quoteStats?.[key] ?? 0)}
                    total={quoteTotal}
                    isActive={selectedQuoteStatus === key}
                    onSelect={() => setSelectedQuoteStatus(key)}
                  />
                ))}
              </div>
            </MobileCollapsibleSection>
          </>
        ) : (
          <>
            <MobileCollapsibleSection
              icon={Gauge}
              title="Overview"
              open={overviewOpen}
              onToggle={() => setOverviewOpen((open) => !open)}
            >
              <button
                type="button"
                onClick={() => setSelectedStatus("all")}
                aria-pressed={selectedStatus === "all"}
                className={cn(
                  "w-full text-left rounded-xl border p-3 transition-colors relative overflow-hidden",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50",
                  selectedStatus === "all"
                    ? "border-emerald-500/40 bg-linear-to-br from-emerald-500/10 to-cyan-500/10"
                    : "border-border/60 bg-background/40",
                )}
              >
                <span className="absolute top-0 inset-x-0 h-px bg-linear-to-r from-transparent via-emerald-500/60 to-transparent" />
                <span className="flex items-end justify-between gap-2">
                  <span className="min-w-0">
                    <span className="block text-[10px] font-black text-muted-foreground/80 uppercase tracking-[0.18em]">
                      {activeTab === "load-board" ? "Total Vehicles" : "Total Loads"}
                    </span>
                    <span className="block text-2xl font-black tracking-tight font-mono tabular-nums text-foreground leading-none mt-1">
                      {total}
                    </span>
                  </span>
                  <span
                    className={cn(
                      "text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border shrink-0",
                      selectedStatus === "all"
                        ? "border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10"
                        : "border-border/60 text-muted-foreground",
                    )}
                  >
                    {selectedStatus === "all" ? "Showing All" : "Show All"}
                  </span>
                </span>
              </button>
            </MobileCollapsibleSection>

            <MobileCollapsibleSection
              icon={Radio}
              title="Pipeline"
              open={statusOpen}
              onToggle={() => setStatusOpen((open) => !open)}
            >
              <div className="space-y-1">
                {PIPELINE_STATUSES.map((status) => (
                  <StatusRow
                    key={status}
                    status={status}
                    count={Number(currentStats[status] ?? 0)}
                    total={total}
                    isActive={selectedStatus === status}
                    onSelect={() => setSelectedStatus(status)}
                  />
                ))}
              </div>
            </MobileCollapsibleSection>

            <MobileCollapsibleSection
              icon={Archive}
              title="Completed"
              open={completedOpen}
              onToggle={() => setCompletedOpen((open) => !open)}
            >
              <div className="space-y-1">
                {TERMINAL_STATUSES.map((status) => (
                  <StatusRow
                    key={status}
                    status={status}
                    count={Number(currentStats[status] ?? 0)}
                    total={total}
                    isActive={selectedStatus === status}
                    onSelect={() => setSelectedStatus(status)}
                  />
                ))}
              </div>
            </MobileCollapsibleSection>
          </>
        )}
      </div>
    </section>
  );
}

export function TransportationMobileSupportCenter() {
  return (
    <section
      aria-label="Transportation support center"
      className="md:hidden px-3 pt-2 pb-4"
    >
      <div className="border-t border-border/60 pt-3">
        <SectionLabel icon={LifeBuoy}>Support Center</SectionLabel>
        <div className="rounded-xl border border-border/60 bg-card/70 p-3 space-y-2 text-xs">
          <a
            href="mailto:support@actionautoutah.com"
            className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 hover:underline font-medium break-all"
          >
            <Mail className="size-3.5 shrink-0" />
            support@actionautoutah.com
          </a>
          <a
            href="tel:8554316570"
            className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 hover:underline font-medium"
          >
            <Phone className="size-3.5 shrink-0" />
            (855) 431-6570
          </a>
        </div>
      </div>
    </section>
  );
}

export function TransportationSidebar({
  activeTab,
  setActiveTab,
  selectedStatus,
  setSelectedStatus,
  selectedQuoteStatus,
  setSelectedQuoteStatus,
  stats,
  loadStats,
  quoteStats,
  isSidebarOpen,
  setIsSidebarOpen,
}: TransportationSidebarProps) {
  // LoadStats has no index signature (and "Accepted"/"Picked Up" are
  // optional), so strict mode requires converting through `unknown` before
  // indexing it by arbitrary status strings.
  const currentStats = (
    activeTab === "load-board" ? loadStats || stats : stats
  ) as unknown as Record<string, number | undefined>;

  const total = Number(currentStats.all ?? 0);
  const quoteTotal = Number(quoteStats?.all ?? 0);

  const selectStatus = (status: string) => {
    setSelectedStatus(status);
    setIsSidebarOpen(false);
  };

  const selectQuoteStatus = (status: string) => {
    setSelectedQuoteStatus(status);
    setIsSidebarOpen(false);
  };

  const renderSidebarContent = () => (
    <>
      {/* ── Header ── */}
      <div className="relative shrink-0 px-3 sm:px-5 pt-3 sm:pt-4 pb-2.5 sm:pb-3 border-b border-border/50">
        <span className="absolute bottom-0 inset-x-0 h-px bg-linear-to-r from-transparent via-emerald-500/50 to-transparent" />
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="size-8 rounded-lg bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center shrink-0">
              <Truck className="size-4 text-emerald-500" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-black tracking-tight text-foreground leading-none truncate">
                Transport
              </p>
              <p className="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-[0.18em] mt-1 truncate">
                Dispatch Console
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="xl:hidden h-10 w-10 p-0 shrink-0 rounded-lg flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50"
            aria-label="Close sidebar"
          >
            <X className="size-4.5" />
          </button>
        </div>
      </div>

      {/* ── Scrollable body ── */}
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-3 sm:px-5 py-3 sm:py-4 space-y-3.5 sm:space-y-5 [scrollbar-gutter:stable]">
        {/* Views: segmented switcher (icon over label) */}
        <div
          role="tablist"
          aria-label="Transportation views"
          className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-background/60 border border-border/50"
        >
          {VIEWS.map(({ key, label, icon: Icon }) => {
            const isActive = activeTab === key;
            return (
              <button
                key={key}
                role="tab"
                aria-selected={isActive}
                onClick={() => {
                  setActiveTab(key);
                  setIsSidebarOpen(false);
                }}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 h-11 sm:h-12 rounded-lg border transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50",
                  isActive
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50",
                )}
              >
                <Icon className="size-3.5" />
                <span className="text-[10px] font-black uppercase tracking-wider leading-none">
                  {label}
                </span>
              </button>
            );
          })}
        </div>

        {activeTab === "drafts" ? (
          <>
            <div>
              <SectionLabel icon={Gauge}>Overview</SectionLabel>
              <button
                onClick={() => selectQuoteStatus("all")}
                aria-pressed={selectedQuoteStatus === "all"}
                className={cn(
                  "w-full text-left rounded-xl border p-3 transition-colors relative overflow-hidden",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50",
                  selectedQuoteStatus === "all"
                    ? "border-emerald-500/40 bg-linear-to-br from-emerald-500/10 to-cyan-500/10"
                    : "border-border/60 bg-background/40 hover:border-emerald-500/25",
                )}
              >
                <span className="absolute top-0 inset-x-0 h-px bg-linear-to-r from-transparent via-emerald-500/60 to-transparent" />
                <span className="flex items-end justify-between gap-2">
                  <span className="min-w-0">
                    <span className="block text-[10px] font-black text-muted-foreground/80 uppercase tracking-[0.18em]">
                      Total Quotes
                    </span>
                    <span className="block text-2xl font-black tracking-tight font-mono tabular-nums text-foreground leading-none mt-1">
                      {quoteTotal}
                    </span>
                  </span>
                  <span
                    className={cn(
                      "text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border shrink-0",
                      selectedQuoteStatus === "all"
                        ? "border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10"
                        : "border-border/60 text-muted-foreground",
                    )}
                  >
                    {selectedQuoteStatus === "all" ? "Showing All" : "Show All"}
                  </span>
                </span>
              </button>
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
                    total={quoteTotal}
                    isActive={selectedQuoteStatus === key}
                    onSelect={() => selectQuoteStatus(key)}
                  />
                ))}
              </div>
            </div>
          </>
        ) : (
          <>
        {/* Overview: total loads, doubles as "Show All" */}
        <div>
          <SectionLabel icon={Gauge}>Overview</SectionLabel>
          <button
            onClick={() => selectStatus("all")}
            aria-pressed={selectedStatus === "all"}
            className={cn(
              "w-full text-left rounded-xl border p-3 transition-colors relative overflow-hidden",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50",
              selectedStatus === "all"
                ? "border-emerald-500/40 bg-linear-to-br from-emerald-500/10 to-cyan-500/10"
                : "border-border/60 bg-background/40 hover:border-emerald-500/25",
            )}
          >
            <span className="absolute top-0 inset-x-0 h-px bg-linear-to-r from-transparent via-emerald-500/60 to-transparent" />
            <span className="flex items-end justify-between gap-2">
              <span className="min-w-0">
                <span className="block text-[10px] font-black text-muted-foreground/80 uppercase tracking-[0.18em]">
                  {activeTab === "load-board" ? "Total Vehicles" : "Total Loads"}
                </span>
                <span className="block text-2xl font-black tracking-tight font-mono tabular-nums text-foreground leading-none mt-1">
                  {total}
                </span>
              </span>
              <span
                className={cn(
                  "text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border shrink-0",
                  selectedStatus === "all"
                    ? "border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10"
                    : "border-border/60 text-muted-foreground",
                )}
              >
                {selectedStatus === "all" ? "Showing All" : "Show All"}
              </span>
            </span>
          </button>
        </div>

        {/* Pipeline: active statuses, in lifecycle order */}
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
                onSelect={() => selectStatus(status)}
              />
            ))}
          </div>
        </div>

        {/* Completed: terminal statuses */}
        <div>
          <SectionLabel icon={Archive}>Completed</SectionLabel>
          <div className="space-y-1">
            {TERMINAL_STATUSES.map((status) => (
              <StatusRow
                key={status}
                status={status}
                count={Number(currentStats[status] ?? 0)}
                total={total}
                isActive={selectedStatus === status}
                onSelect={() => selectStatus(status)}
              />
            ))}
          </div>
        </div>
          </>
        )}
      </div>

      {/* ── Pinned footer: support ── */}
      <div className="shrink-0 px-3 sm:px-5 pt-2.5 sm:pt-3 pb-3 sm:pb-4 border-t border-border/50 [padding-bottom:max(0.75rem,env(safe-area-inset-bottom))]">
        <SectionLabel icon={LifeBuoy}>Support Center</SectionLabel>
        <div className="rounded-xl border border-border/60 bg-background/40 p-2.5 sm:p-3 space-y-1.5 sm:space-y-2 text-[11px] sm:text-xs">
          <a
            href="mailto:support@actionautoutah.com"
            className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 hover:underline font-medium break-all"
          >
            <Mail className="size-3.5 shrink-0" />
            support@actionautoutah.com
          </a>
          <a
            href="tel:8554316570"
            className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 hover:underline font-medium"
          >
            <Phone className="size-3.5 shrink-0" />
            (855) 431-6570
          </a>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile: use the app's proven Sheet/portal drawer architecture.
          This escapes the dashboard/main overflow shell and gives reliable
          overlay, focus, Escape, and outside-click behavior. */}
      <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
        <SheetContent
          side="left"
          showCloseButton={false}
          className={cn(
            "xl:hidden h-dvh max-h-dvh",
            "w-[clamp(236px,66vw,264px)] sm:w-80 max-w-[calc(100vw-3rem)]",
            "p-0 gap-0 bg-card/95 text-card-foreground backdrop-blur-xl",
            "border-r border-border/60 shadow-2xl",
          )}
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Transportation filters</SheetTitle>
            <SheetDescription>
              Switch Transportation views and filter loads or quotes by status.
            </SheetDescription>
          </SheetHeader>

          <div
            id="transportation-sidebar"
            aria-label="Transportation filters"
            className="flex h-full min-h-0 w-full flex-col"
          >
            {renderSidebarContent()}
          </div>
        </SheetContent>
      </Sheet>

      {/* Desktop: preserve the existing always-visible sticky sidebar. */}
      <aside
        aria-label="Transportation filters"
        className={cn(
          "hidden xl:sticky xl:top-0 xl:flex xl:h-dvh xl:self-start",
          "xl:w-64 2xl:w-72 shrink-0 flex-col",
          "bg-card/40 backdrop-blur-md border-r border-border/60",
        )}
      >
        {renderSidebarContent()}
      </aside>
    </>
  );
}