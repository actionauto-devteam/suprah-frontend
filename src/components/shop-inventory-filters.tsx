"use client";

import * as React from "react";
import { Search, X, LayoutGrid, List, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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


function pillSelectCls(active: boolean) {
  return cn(
    "h-8 rounded-full border px-3.5 text-xs font-medium cursor-pointer shrink-0 outline-none transition-all duration-150",
    "bg-card text-foreground dark:bg-zinc-900",
    "focus:ring-0 focus:ring-offset-0 data-[state=open]:border-primary/50 data-[state=open]:ring-2 data-[state=open]:ring-primary/10",
    active
      ? "border-primary bg-primary/10 text-primary font-semibold dark:bg-primary/15"
      : "border-border/60 hover:border-border dark:border-zinc-700 dark:hover:border-zinc-500 text-muted-foreground hover:text-foreground",
  );
}

interface PillSelectOption {
  value: string;
  label: string;
}

function PillSelect({
  value,
  onValueChange,
  options,
  active,
  ariaLabel,
  className,
}: {
  value: string;
  onValueChange: (value: string) => void;
  options: PillSelectOption[];
  active: boolean;
  ariaLabel: string;
  className?: string;
}) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger
        aria-label={ariaLabel}
        className={cn(
          pillSelectCls(active),
          "w-auto gap-2 whitespace-nowrap [&>svg]:h-3 [&>svg]:w-3 [&>svg]:shrink-0 [&>svg]:opacity-60",
          className,
        )}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent
        position="popper"
        sideOffset={4}
        className="z-[100] min-w-[var(--radix-select-trigger-width)] border-border bg-popover text-popover-foreground shadow-xl dark:border-zinc-700 dark:bg-zinc-950"
      >
        {options.map((option) => (
          <SelectItem
            key={option.value}
            value={option.value}
            className="text-xs focus:bg-accent focus:text-accent-foreground data-[state=checked]:bg-primary/10 data-[state=checked]:text-primary"
          >
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
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
  const [priceMin, setPriceMin] = React.useState(filters.minPrice ? String(filters.minPrice) : "");
  const [priceMax, setPriceMax] = React.useState(filters.maxPrice ? String(filters.maxPrice) : "");
  const [mileMin, setMileMin] = React.useState(filters.minMileage ? String(filters.minMileage) : "");
  const [mileMax, setMileMax] = React.useState(filters.maxMileage ? String(filters.maxMileage) : "");
  const [showRanges, setShowRanges] = React.useState(false);

  React.useEffect(() => { if (!filters.minPrice) setPriceMin(""); }, [filters.minPrice]);
  React.useEffect(() => { if (!filters.maxPrice) setPriceMax(""); }, [filters.maxPrice]);
  React.useEffect(() => { if (!filters.minMileage) setMileMin(""); }, [filters.minMileage]);
  React.useEffect(() => { if (!filters.maxMileage) setMileMax(""); }, [filters.maxMileage]);

  // Range filters are intentionally applied on every keystroke. The Inventory
  // page filters the already-loaded vehicle collection locally, so there is no
  // network request or loading state to wait for here. This keeps the range
  // controls feeling immediate while preserving their local input values.
  const handleMinPriceChange = React.useCallback(
    (rawValue: string) => {
      setPriceMin(rawValue);
      onFilterChange("minPrice", rawValue === "" ? undefined : Number(rawValue));
    },
    [onFilterChange],
  );

  const handleMaxPriceChange = React.useCallback(
    (rawValue: string) => {
      setPriceMax(rawValue);
      onFilterChange("maxPrice", rawValue === "" ? undefined : Number(rawValue));
    },
    [onFilterChange],
  );

  const handleMinMileageChange = React.useCallback(
    (rawValue: string) => {
      setMileMin(rawValue);
      onFilterChange("minMileage", rawValue === "" ? undefined : Number(rawValue));
    },
    [onFilterChange],
  );

  const handleMaxMileageChange = React.useCallback(
    (rawValue: string) => {
      setMileMax(rawValue);
      onFilterChange("maxMileage", rawValue === "" ? undefined : Number(rawValue));
    },
    [onFilterChange],
  );

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

  // These option lists (models especially, which can run into the hundreds across a real
  // inventory) were being rebuilt from scratch — a fresh array + fresh objects — on every
  // render, including every keystroke in the search box above (each one updates `filters`
  // and re-renders this whole toolbar). PillSelect isn't memoized, so a brand-new `options`
  // array reference each time meant every dropdown's item list was reconstructed constantly,
  // which is exactly the kind of main-thread work that makes a click to open one of these
  // feel delayed. Memoizing so they only rebuild when the underlying data actually changes.
  const makeOptions = React.useMemo(
    () => [
      { value: "all", label: "All Makes" },
      ...(filterOptions?.makes ?? []).map((make) => ({ value: make, label: make })),
    ],
    [filterOptions],
  );
  const modelOptions = React.useMemo(
    () => [
      { value: "all", label: "All Models" },
      ...(filterOptions?.models ?? []).map((model) => ({ value: model, label: model })),
    ],
    [filterOptions],
  );
  const yearOptions = React.useMemo(
    () => [
      { value: "all", label: "All Years" },
      ...(filterOptions?.years ?? []).map((year) => ({ value: String(year), label: String(year) })),
    ],
    [filterOptions],
  );
  const bodyStyleOptions = React.useMemo(
    () => [
      { value: "all", label: "All Styles" },
      ...(filterOptions?.bodyStyles ?? []).map((style) => ({ value: style, label: style })),
    ],
    [filterOptions],
  );
  const statusOptions = React.useMemo(() => {
    const statuses = filterOptions?.statuses?.length
      ? filterOptions.statuses
      : ["Ready for Sale", "In Recon", "Sold", "In Transit"];
    return [
      { value: "all", label: "All Statuses" },
      ...statuses.map((status: string) => ({ value: status, label: status })),
    ];
  }, [filterOptions]);
  const locationOptions = React.useMemo(
    () => [
      { value: "all", label: "All Locations" },
      ...(filterOptions?.locations ?? []).map((location) => ({ value: location, label: location })),
    ],
    [filterOptions],
  );

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
          <PillSelect
            value={filters.make || "all"}
            onValueChange={(value) =>
              onFilterChange("make", value === "all" ? undefined : value)
            }
            active={!!filters.make}
            ariaLabel="Filter by make"
            options={makeOptions}
          />

          <PillSelect
            value={filters.model || "all"}
            onValueChange={(value) =>
              onFilterChange("model", value === "all" ? undefined : value)
            }
            active={!!filters.model}
            ariaLabel="Filter by model"
            options={modelOptions}
          />

          <PillSelect
            value={filters.year ? String(filters.year) : "all"}
            onValueChange={(value) =>
              onFilterChange("year", value === "all" ? undefined : Number(value))
            }
            active={!!filters.year}
            ariaLabel="Filter by year"
            options={yearOptions}
          />

          <PillSelect
            value={filters.bodyStyle || "all"}
            onValueChange={(value) =>
              onFilterChange("bodyStyle", value === "all" ? undefined : value)
            }
            active={!!filters.bodyStyle}
            ariaLabel="Filter by body style"
            options={bodyStyleOptions}
          />

          <PillSelect
            value={
              filters.status && filters.status !== "all"
                ? filters.status
                : "all"
            }
            onValueChange={(value) =>
              onFilterChange("status", value === "all" ? "all" : value)
            }
            active={!!(filters.status && filters.status !== "all")}
            ariaLabel="Filter by status"
            options={statusOptions}
          />

          <PillSelect
            value={filters.location || "all"}
            onValueChange={(value) =>
              onFilterChange("location", value === "all" ? undefined : value)
            }
            active={!!filters.location}
            ariaLabel="Filter by location"
            options={locationOptions}
          />

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

          {/* Sort — mobile */}
          <PillSelect
            value={currentSortValue}
            onValueChange={onSortChange}
            active={!!currentSortValue}
            ariaLabel="Sort by"
            className="sm:hidden min-w-30"
            options={sortOptions}
          />
        </div>

        {/* Sort — desktop */}
        <PillSelect
          value={currentSortValue}
          onValueChange={onSortChange}
          active={!!currentSortValue}
          ariaLabel="Sort by"
          className="hidden sm:flex min-w-37"
          options={sortOptions}
        />
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
              onChange={(e) => handleMinPriceChange(e.target.value)}
            />
            <span className="text-muted-foreground/50 text-xs">—</span>
            <Input
              type="number"
              placeholder="Max $"
              className="w-20 h-7 text-xs px-2 rounded-lg border-border/50 dark:bg-zinc-900 dark:border-zinc-700"
              value={priceMax}
              onChange={(e) => handleMaxPriceChange(e.target.value)}
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
              onChange={(e) => handleMinMileageChange(e.target.value)}
            />
            <span className="text-muted-foreground/50 text-xs">—</span>
            <Input
              type="number"
              placeholder="Max"
              className="w-20 h-7 text-xs px-2 rounded-lg border-border/50 dark:bg-zinc-900 dark:border-zinc-700"
              value={mileMax}
              onChange={(e) => handleMaxMileageChange(e.target.value)}
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