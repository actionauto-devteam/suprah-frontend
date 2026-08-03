"use client";

import * as React from "react";
import {
  X, Phone, Mail, Radio, Gauge, Archive, LifeBuoy,
  Truck, FileText, Globe,
} from "lucide-react";
import { LoadStats } from "@/lib/api/loads";
import { cn } from "@/lib/utils";

interface TransportationSidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  selectedStatus: string;
  setSelectedStatus: (status: string) => void;
  stats: LoadStats;
  loadStats?: LoadStats;
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
};

function SectionLabel({
  icon: Icon,
  children,
}: {
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <p className="text-[9px] font-black text-muted-foreground/60 uppercase tracking-[0.2em] mb-2 flex items-center gap-1.5 select-none">
      <Icon className="size-3" /> {children}
    </p>
  );
}

function StatusRow({
  status,
  count,
  total,
  isActive,
  onSelect,
}: {
  status: string;
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
        "w-full text-left px-3 py-2 rounded-lg border transition-colors group",
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
            {status}
          </span>
        </span>
        <span className="text-muted-foreground font-mono text-[11px] tabular-nums shrink-0">
          {count}
        </span>
      </span>
      {/* Proportional micro-bar: this status's share of all loads */}
      <span className="mt-1.5 block h-0.5 w-full rounded-full bg-muted/70 overflow-hidden">
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

export function TransportationSidebar({
  activeTab,
  setActiveTab,
  selectedStatus,
  setSelectedStatus,
  stats,
  loadStats,
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

  const selectStatus = (status: string) => {
    setSelectedStatus(status);
    setIsSidebarOpen(false);
  };

  // Mobile drawer ergonomics: lock body scroll while open, close on Escape.
  // The open state is only ever set from the lg:hidden menu button, so these
  // effects never interfere with desktop.
  React.useEffect(() => {
    if (!isSidebarOpen) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsSidebarOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = original;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isSidebarOpen, setIsSidebarOpen]);

  return (
    <aside
      aria-label="Transportation filters"
      className={cn(
        // Mobile: fixed drawer, dynamic-viewport height so iOS/Android browser
        // chrome doesn't hide the footer. Desktop: sticky column that stays in
        // view while long load lists scroll.
        "fixed lg:sticky inset-y-0 lg:inset-y-auto lg:top-0 left-0 z-50",
        "h-dvh lg:h-dvh lg:self-start shrink-0",
        "w-[280px] sm:w-80 lg:w-64 xl:w-72",
        "flex flex-col",
        "bg-card/40 backdrop-blur-md border-r border-border/60",
        "transform transition-transform duration-300 ease-in-out",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
      )}
    >
      {/* ── Header ── */}
      <div className="relative shrink-0 px-4 sm:px-5 pt-4 pb-3 border-b border-border/50">
        <span className="absolute bottom-0 inset-x-0 h-px bg-linear-to-r from-transparent via-emerald-500/50 to-transparent" />
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="size-8 rounded-lg bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center shrink-0">
              <Truck className="size-4 text-emerald-500" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-black tracking-tight text-foreground leading-none">
                Transport
              </p>
              <p className="text-[9px] font-bold text-muted-foreground/60 uppercase tracking-[0.2em] mt-1">
                Dispatch Console
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="lg:hidden p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Close sidebar"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>

      {/* ── Scrollable body ── */}
      <div className="flex-1 overflow-y-auto overscroll-contain px-4 sm:px-5 py-4 space-y-5">
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
                onClick={() => setActiveTab(key)}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 h-12 rounded-lg border transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50",
                  isActive
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50",
                )}
              >
                <Icon className="size-3.5" />
                <span className="text-[9px] font-black uppercase tracking-wider leading-none">
                  {label}
                </span>
              </button>
            );
          })}
        </div>

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
                <span className="block text-[9px] font-black text-muted-foreground/70 uppercase tracking-[0.2em]">
                  Total Loads
                </span>
                <span className="block text-2xl font-black tracking-tight font-mono tabular-nums text-foreground leading-none mt-1">
                  {total}
                </span>
              </span>
              <span
                className={cn(
                  "text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border shrink-0",
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
      </div>

      {/* ── Pinned footer: support ── */}
      <div className="shrink-0 px-4 sm:px-5 pt-3 pb-4 border-t border-border/50 [padding-bottom:max(1rem,env(safe-area-inset-bottom))]">
        <SectionLabel icon={LifeBuoy}>Support Center</SectionLabel>
        <div className="rounded-xl border border-border/60 bg-background/40 p-3 space-y-2 text-xs">
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
    </aside>
  );
}