"use client";

import * as React from "react";
import { Search, X, LayoutGrid, List, SlidersHorizontal, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { apiClient } from "@/lib/api-client";
import type { FilterOptions } from "@/types/inventory";
import { useAuth } from "@/providers/AuthProvider";
import { cn } from "@/lib/utils";

interface ShopInventoryFiltersProps {
  filters: any;
  onFilterChange: (key: string, value: any) => void;
  onClearFilters: () => void;
  apiPath?: string;
  viewMode: "grid" | "list";
  onViewModeChange: (mode: "grid" | "list") => void;
  currentSortValue: string;
  onSortChange: (value: string) => void;
  sortOptions: Array<{ value: string; label: string }>;
}

const CHEVRON_SVG =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E\")";

const SELECT_STYLE: React.CSSProperties = {
  appearance: "none",
  WebkitAppearance: "none",
  backgroundImage: CHEVRON_SVG,
  backgroundRepeat: "no-repeat",
  backgroundPosition: "right 10px center",
};

function pillSelectCls(active: boolean) {
  return cn(
    "h-8 rounded-full border pl-3.5 pr-8 text-xs font-medium cursor-pointer shrink-0 outline-none transition-all duration-150",
    "bg-card text-foreground dark:bg-zinc-900",
    active
      ? "border-primary bg-primary/10 text-primary font-semibold dark:bg-primary/15"
      : "border-border/60 hover:border-border dark:border-zinc-700 dark:hover:border-zinc-500 text-muted-foreground hover:text-foreground",
  );
}

const FILTER_LABELS: Record<string, string> = {
  make: "Make",
  model: "Model",
  status: "Status",
  year: "Year",
  bodyStyle: "Style",
  location: "Location",
  minPrice: "Min $",
  maxPrice: "Max $",
  minMileage: "Min mi",
  maxMileage: "Max mi",
  highDemand: "High Demand",
  lowPerforming: "Low Performing",
};

export function ShopInventoryFilters({
  filters,
  onFilterChange,
  onClearFilters,
  apiPath = "/api/vehicles/marketplace/filters",
  viewMode,
  onViewModeChange,
  currentSortValue,
  onSortChange,
  sortOptions,
}: ShopInventoryFiltersProps) {
  const { getToken } = useAuth();
  const [filterOptions, setFilterOptions] = React.useState<FilterOptions | null>(null);
  const fetchSeqRef = React.useRef(0);
  const onFilterChangeRef = React.useRef(onFilterChange);
  onFilterChangeRef.current = onFilterChange;

  const [priceMin, setPriceMin] = React.useState(filters.minPrice ? String(filters.minPrice) : "");
  const [priceMax, setPriceMax] = React.useState(filters.maxPrice ? String(filters.maxPrice) : "");
  const [mileMin, setMileMin] = React.useState(filters.minMileage ? String(filters.minMileage) : "");
  const [mileMax, setMileMax] = React.useState(filters.maxMileage ? String(filters.maxMileage) : "");
  const [showRanges, setShowRanges] = React.useState(false);

  React.useEffect(() => { if (!filters.minPrice) setPriceMin(""); }, [filters.minPrice]);
  React.useEffect(() => { if (!filters.maxPrice) setPriceMax(""); }, [filters.maxPrice]);
  React.useEffect(() => { if (!filters.minMileage) setMileMin(""); }, [filters.minMileage]);
  React.useEffect(() => { if (!filters.maxMileage) setMileMax(""); }, [filters.maxMileage]);

  React.useEffect(() => {
    const t = setTimeout(() => onFilterChangeRef.current("minPrice", priceMin ? Number(priceMin) : undefined), 600);
    return () => clearTimeout(t);
  }, [priceMin]);

  React.useEffect(() => {
    const t = setTimeout(() => onFilterChangeRef.current("maxPrice", priceMax ? Number(priceMax) : undefined), 600);
    return () => clearTimeout(t);
  }, [priceMax]);

  React.useEffect(() => {
    const t = setTimeout(() => onFilterChangeRef.current("minMileage", mileMin ? Number(mileMin) : undefined), 600);
    return () => clearTimeout(t);
  }, [mileMin]);

  React.useEffect(() => {
    const t = setTimeout(() => onFilterChangeRef.current("maxMileage", mileMax ? Number(mileMax) : undefined), 600);
    return () => clearTimeout(t);
  }, [mileMax]);

  React.useEffect(() => {
    let cancelled = false;
    const seq = ++fetchSeqRef.current;
    (async () => {
      try {
        const token = await getToken();
        const res = await apiClient.get(apiPath, {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 10000,
        });
        if (cancelled || seq !== fetchSeqRef.current) return;
        setFilterOptions(res.data?.data ?? null);
      } catch { }
    })();
    return () => { cancelled = true; };
  }, [apiPath, getToken]);

  const chipEntries = Object.entries(filters).filter(([k, v]) => {
    if (["search", "page", "limit", "sortBy", "sortOrder"].includes(k)) return false;
    return v && v !== "all";
  });

  const activeCount = chipEntries.length;
  const hasRangeFilter = !!(filters.minPrice || filters.maxPrice || filters.minMileage || filters.maxMileage);

  const STATUSES = filterOptions?.statuses?.length
    ? filterOptions.statuses
    : ["Ready for Sale", "In Recon", "Sold", "In Transit"];

  return (
    <div className="space-y-2.5">

      {/* Row 1 — Search + View Toggle */}
      <div className="flex gap-2 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60 pointer-events-none" />
          <Input
            placeholder="Search make, model, VIN, stock #..."
            className="pl-10 h-10 rounded-xl border-border/50 bg-card text-sm placeholder:text-muted-foreground/50 focus-visible:ring-1 focus-visible:ring-primary/40 dark:bg-zinc-900 dark:border-zinc-700"
            value={filters.search || ""}
            onChange={(e) => onFilterChange("search", e.target.value)}
          />
          {filters.search && (
            <button
              onClick={() => onFilterChange("search", "")}
              className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 flex items-center justify-center rounded-full bg-muted-foreground/20 hover:bg-muted-foreground/30 transition-colors"
            >
              <X className="h-3 w-3 text-muted-foreground" />
            </button>
          )}
        </div>

        {/* View toggle */}
        <div className="flex items-center rounded-xl border border-border/50 overflow-hidden shrink-0 dark:border-zinc-700">
          <button
            onClick={() => onViewModeChange("grid")}
            className={cn(
              "flex items-center justify-center w-10 h-10 transition-colors",
              viewMode === "grid"
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted text-muted-foreground",
            )}
            aria-label="Grid view"
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            onClick={() => onViewModeChange("list")}
            className={cn(
              "flex items-center justify-center w-10 h-10 transition-colors",
              viewMode === "list"
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted text-muted-foreground",
            )}
            aria-label="List view"
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Row 2 — Filter pills (horizontal scroll) + Sort */}
      <div className="flex items-center gap-2">
        <div
          className="flex items-center gap-2 overflow-x-auto flex-1 pb-0.5"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" } as React.CSSProperties}
        >
          <select
            value={filters.make || "all"}
            onChange={(e) => onFilterChange("make", e.target.value === "all" ? undefined : e.target.value)}
            className={pillSelectCls(!!filters.make)}
            style={SELECT_STYLE}
            aria-label="Filter by make"
          >
            <option value="all">All Makes</option>
            {(filterOptions?.makes ?? []).map((m) => <option key={m} value={m}>{m}</option>)}
          </select>

          <select
            value={filters.model || "all"}
            onChange={(e) => onFilterChange("model", e.target.value === "all" ? undefined : e.target.value)}
            className={pillSelectCls(!!filters.model)}
            style={SELECT_STYLE}
            aria-label="Filter by model"
          >
            <option value="all">All Models</option>
            {(filterOptions?.models ?? []).map((m) => <option key={m} value={m}>{m}</option>)}
          </select>

          <select
            value={filters.year ? String(filters.year) : "all"}
            onChange={(e) => onFilterChange("year", e.target.value === "all" ? undefined : Number(e.target.value))}
            className={pillSelectCls(!!filters.year)}
            style={SELECT_STYLE}
            aria-label="Filter by year"
          >
            <option value="all">All Years</option>
            {(filterOptions?.years ?? []).map((y) => <option key={y} value={String(y)}>{y}</option>)}
          </select>

          <select
            value={filters.bodyStyle || "all"}
            onChange={(e) => onFilterChange("bodyStyle", e.target.value === "all" ? undefined : e.target.value)}
            className={pillSelectCls(!!filters.bodyStyle)}
            style={SELECT_STYLE}
            aria-label="Filter by body style"
          >
            <option value="all">All Styles</option>
            {(filterOptions?.bodyStyles ?? []).map((s) => <option key={s} value={s}>{s}</option>)}
          </select>

          <select
            value={filters.status && filters.status !== "all" ? filters.status : "all"}
            onChange={(e) => onFilterChange("status", e.target.value === "all" ? "all" : e.target.value)}
            className={pillSelectCls(!!(filters.status && filters.status !== "all"))}
            style={SELECT_STYLE}
            aria-label="Filter by status"
          >
            <option value="all">All Statuses</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>

          <select
            value={filters.location || "all"}
            onChange={(e) => onFilterChange("location", e.target.value === "all" ? undefined : e.target.value)}
            className={pillSelectCls(!!filters.location)}
            style={SELECT_STYLE}
            aria-label="Filter by location"
          >
            <option value="all">All Locations</option>
            {(filterOptions?.locations ?? []).map((l) => <option key={l} value={l}>{l}</option>)}
          </select>

          {/* Range toggle pill */}
          <button
            onClick={() => setShowRanges((p) => !p)}
            className={cn(
              "h-8 rounded-full border px-3.5 text-xs font-medium cursor-pointer shrink-0 flex items-center gap-1.5 transition-all duration-150",
              showRanges || hasRangeFilter
                ? "border-primary bg-primary/10 text-primary font-semibold dark:bg-primary/15"
                : "border-border/60 text-muted-foreground hover:text-foreground hover:border-border dark:border-zinc-700",
            )}
          >
            <SlidersHorizontal className="h-3 w-3" />
            Range
            {hasRangeFilter && (
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground text-[9px] font-black">
                {[filters.minPrice, filters.maxPrice, filters.minMileage, filters.maxMileage].filter(Boolean).length}
              </span>
            )}
          </button>

          {/* Sort select — mobile (always reachable, not gated behind Range) */}
          <select
            value={currentSortValue}
            onChange={(e) => onSortChange(e.target.value)}
            className={cn(pillSelectCls(!!currentSortValue), "sm:hidden min-w-30")}
            style={SELECT_STYLE}
            aria-label="Sort by"
          >
            <option value="" disabled>Sort by</option>
            {sortOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        {/* Sort select — desktop */}
        <select
          value={currentSortValue}
          onChange={(e) => onSortChange(e.target.value)}
          className={cn(pillSelectCls(!!currentSortValue), "hidden sm:block shrink-0 min-w-37")}
          style={SELECT_STYLE}
          aria-label="Sort by"
        >
          <option value="" disabled>Sort by</option>
          {sortOptions.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {/* Row 3 — Price + Mileage ranges (collapsible) */}
      {showRanges && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-border/40 bg-muted/30 px-3.5 py-2.5 dark:bg-zinc-900/50 dark:border-zinc-700/50">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest whitespace-nowrap">
              Price
            </span>
            <Input
              type="number"
              placeholder="Min $"
              className="w-20 h-7 text-xs px-2 rounded-lg border-border/50 dark:bg-zinc-900 dark:border-zinc-700"
              value={priceMin}
              onChange={(e) => setPriceMin(e.target.value)}
            />
            <span className="text-muted-foreground/50 text-xs">—</span>
            <Input
              type="number"
              placeholder="Max $"
              className="w-20 h-7 text-xs px-2 rounded-lg border-border/50 dark:bg-zinc-900 dark:border-zinc-700"
              value={priceMax}
              onChange={(e) => setPriceMax(e.target.value)}
            />
          </div>

          <div className="h-4 w-px bg-border/50 hidden sm:block" />

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest whitespace-nowrap">
              Miles
            </span>
            <Input
              type="number"
              placeholder="Min"
              className="w-20 h-7 text-xs px-2 rounded-lg border-border/50 dark:bg-zinc-900 dark:border-zinc-700"
              value={mileMin}
              onChange={(e) => setMileMin(e.target.value)}
            />
            <span className="text-muted-foreground/50 text-xs">—</span>
            <Input
              type="number"
              placeholder="Max"
              className="w-20 h-7 text-xs px-2 rounded-lg border-border/50 dark:bg-zinc-900 dark:border-zinc-700"
              value={mileMax}
              onChange={(e) => setMileMax(e.target.value)}
            />
          </div>
        </div>
      )}

      {/* Active filter chips */}
      {activeCount > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          {chipEntries.map(([key, value]) => {
            const label = FILTER_LABELS[key] ?? key;
            const displayVal = typeof value === "boolean" ? null : String(value);
            return (
              <span
                key={key}
                className="inline-flex items-center gap-1 rounded-full border border-primary/25 bg-primary/8 px-2.5 py-0.5 text-[11px] font-medium text-primary dark:bg-primary/12"
              >
                <span className="opacity-70">{label}</span>
                {displayVal && <span>: {displayVal}</span>}
                <button
                  onClick={() => onFilterChange(key, key === "status" ? "all" : undefined)}
                  className="ml-0.5 rounded-full p-0.5 hover:bg-primary/20 transition-colors"
                  aria-label={`Remove ${label} filter`}
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </span>
            );
          })}
          <button
            onClick={onClearFilters}
            className="text-[11px] font-semibold text-muted-foreground hover:text-destructive transition-colors px-1.5 h-6 rounded-full"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}
