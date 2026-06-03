"use client";

import * as React from "react";
import { Search, X, LayoutGrid, List } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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

const CHEVRON_BG =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E\")";

const filterSelectStyle: React.CSSProperties = {
  appearance: "none",
  WebkitAppearance: "none",
  backgroundImage: CHEVRON_BG,
  backgroundRepeat: "no-repeat",
  backgroundPosition: "right 8px center",
};

function filterSelectCls(active: boolean) {
  return cn(
    "h-8 rounded-lg border bg-card text-foreground text-sm pl-3 pr-7 outline-none cursor-pointer shrink-0 transition-colors",
    "focus:ring-1 focus:ring-ring dark:bg-zinc-900 dark:text-zinc-100",
    active
      ? "border-primary/60 bg-primary/5 dark:bg-primary/10 text-primary font-semibold"
      : "border-border hover:border-zinc-400 dark:hover:border-zinc-600",
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
      } catch {}
    })();
    return () => { cancelled = true; };
  }, [apiPath, getToken]);

  const chipEntries = Object.entries(filters).filter(([k, v]) => {
    if (["search", "page", "limit", "sortBy", "sortOrder"].includes(k)) return false;
    return v && v !== "all";
  });

  const activeCount = chipEntries.length;

  const STATUSES = filterOptions?.statuses?.length
    ? filterOptions.statuses
    : ["Ready for Sale", "In Recon", "Sold", "In Transit"];

  return (
    <div className="space-y-2.5">
      {/* Row 1: Search + Sort + View toggle */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search by VIN, make, model, or stock #..."
            className="pl-10 h-9"
            value={filters.search || ""}
            onChange={(e) => onFilterChange("search", e.target.value)}
          />
        </div>

        <select
          value={currentSortValue}
          onChange={(e) => onSortChange(e.target.value)}
          className={cn(filterSelectCls(false), "hidden sm:block h-9 min-w-[148px] pr-8")}
          style={filterSelectStyle}
          aria-label="Sort by"
        >
          <option value="" disabled>Sort by</option>
          {sortOptions.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        <div className="flex items-center rounded-lg border border-border overflow-hidden shrink-0">
          <button
            onClick={() => onViewModeChange("grid")}
            className={cn(
              "flex items-center justify-center w-9 h-9 transition-colors",
              viewMode === "grid" ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground",
            )}
            aria-label="Grid view"
            title="Grid view"
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            onClick={() => onViewModeChange("list")}
            className={cn(
              "flex items-center justify-center w-9 h-9 transition-colors",
              viewMode === "list" ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground",
            )}
            aria-label="List view"
            title="List view"
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Row 2: Filter selects — horizontally scrollable */}
      <div
        className="flex items-center gap-2 overflow-x-auto pb-0.5"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" } as React.CSSProperties}
      >
        <select
          value={filters.make || "all"}
          onChange={(e) => onFilterChange("make", e.target.value === "all" ? undefined : e.target.value)}
          className={filterSelectCls(!!filters.make)}
          style={filterSelectStyle}
          aria-label="Filter by make"
        >
          <option value="all">All Makes</option>
          {(filterOptions?.makes ?? []).map((m) => <option key={m} value={m}>{m}</option>)}
        </select>

        <select
          value={filters.model || "all"}
          onChange={(e) => onFilterChange("model", e.target.value === "all" ? undefined : e.target.value)}
          className={filterSelectCls(!!filters.model)}
          style={filterSelectStyle}
          aria-label="Filter by model"
        >
          <option value="all">All Models</option>
          {(filterOptions?.models ?? []).map((m) => <option key={m} value={m}>{m}</option>)}
        </select>

        <select
          value={filters.year ? String(filters.year) : "all"}
          onChange={(e) => onFilterChange("year", e.target.value === "all" ? undefined : Number(e.target.value))}
          className={filterSelectCls(!!filters.year)}
          style={filterSelectStyle}
          aria-label="Filter by year"
        >
          <option value="all">All Years</option>
          {(filterOptions?.years ?? []).map((y) => <option key={y} value={String(y)}>{y}</option>)}
        </select>

        <select
          value={filters.bodyStyle || "all"}
          onChange={(e) => onFilterChange("bodyStyle", e.target.value === "all" ? undefined : e.target.value)}
          className={filterSelectCls(!!filters.bodyStyle)}
          style={filterSelectStyle}
          aria-label="Filter by body style"
        >
          <option value="all">All Styles</option>
          {(filterOptions?.bodyStyles ?? []).map((s) => <option key={s} value={s}>{s}</option>)}
        </select>

        <select
          value={filters.status && filters.status !== "all" ? filters.status : "all"}
          onChange={(e) => onFilterChange("status", e.target.value === "all" ? "all" : e.target.value)}
          className={filterSelectCls(!!(filters.status && filters.status !== "all"))}
          style={filterSelectStyle}
          aria-label="Filter by status"
        >
          <option value="all">All Statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>

        <select
          value={filters.location || "all"}
          onChange={(e) => onFilterChange("location", e.target.value === "all" ? undefined : e.target.value)}
          className={filterSelectCls(!!filters.location)}
          style={filterSelectStyle}
          aria-label="Filter by location"
        >
          <option value="all">All Locations</option>
          {(filterOptions?.locations ?? []).map((l) => <option key={l} value={l}>{l}</option>)}
        </select>

        <div className="h-5 w-px bg-border/60 shrink-0" />

        <select
          value={currentSortValue}
          onChange={(e) => onSortChange(e.target.value)}
          className={cn(filterSelectCls(false), "sm:hidden")}
          style={filterSelectStyle}
          aria-label="Sort by"
        >
          <option value="" disabled>Sort by</option>
          {sortOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {/* Row 3: Price + Mileage range */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">Price</span>
          <Input
            type="number"
            placeholder="Min $"
            className="w-[78px] h-7 text-xs px-2"
            value={priceMin}
            onChange={(e) => setPriceMin(e.target.value)}
          />
          <span className="text-muted-foreground text-xs leading-none">—</span>
          <Input
            type="number"
            placeholder="Max $"
            className="w-[78px] h-7 text-xs px-2"
            value={priceMax}
            onChange={(e) => setPriceMax(e.target.value)}
          />
        </div>

        <div className="hidden sm:block h-4 w-px bg-border/60" />

        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">Miles</span>
          <Input
            type="number"
            placeholder="Min"
            className="w-[78px] h-7 text-xs px-2"
            value={mileMin}
            onChange={(e) => setMileMin(e.target.value)}
          />
          <span className="text-muted-foreground text-xs leading-none">—</span>
          <Input
            type="number"
            placeholder="Max"
            className="w-[78px] h-7 text-xs px-2"
            value={mileMax}
            onChange={(e) => setMileMax(e.target.value)}
          />
        </div>
      </div>

      {/* Active filter chips */}
      {activeCount > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          {chipEntries.map(([key, value]) => {
            const label = FILTER_LABELS[key] ?? key;
            const displayVal = typeof value === "boolean" ? null : String(value);
            return (
              <Badge
                key={key}
                variant="secondary"
                className="flex items-center gap-1 pr-1 text-[11px] font-medium h-6"
              >
                <span className="text-muted-foreground">{label}</span>
                {displayVal && <span className="text-foreground">: {displayVal}</span>}
                <button
                  onClick={() => onFilterChange(key, key === "status" ? "all" : undefined)}
                  className="ml-0.5 rounded p-0.5 hover:text-destructive transition-colors"
                  aria-label={`Remove ${label} filter`}
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </Badge>
            );
          })}
          <button
            onClick={onClearFilters}
            className="text-[11px] font-semibold text-muted-foreground hover:text-destructive transition-colors px-1 h-6 rounded"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}
