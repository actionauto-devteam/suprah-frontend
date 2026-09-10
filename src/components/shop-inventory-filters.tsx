"use client";

import * as React from "react";
import { Search, X, LayoutGrid, List, SlidersHorizontal, ArrowUpDown, ChevronUp } from "lucide-react";
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
  resultCount?: number;
}


function pillSelectCls(active: boolean) {
  return cn(
    "h-8 rounded-full border px-3.5 text-xs font-medium cursor-pointer shrink-0 outline-none transition-all duration-150",
    "bg-card text-foreground dark:bg-zinc-900",
    "focus:ring-0 focus:ring-offset-0 data-[state=open]:border-primary/50 data-[state=open]:ring-2 data-[state=open]:ring-primary/10",
    active
      ? "border-primary bg-primary/10 text-primary font-semibold dark:bg-primary/15"
      : "border-border/60 bg-card/60 hover:border-border dark:border-zinc-700 dark:hover:border-zinc-500 text-muted-foreground hover:text-foreground",
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

function MobileFilterSelect({
  label,
  value,
  onValueChange,
  options,
}: {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  options: PillSelectOption[];
}) {
  return (
    <div className="space-y-1.5">
      <span className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </span>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className="h-10 w-full rounded-xl border-border/60 bg-background/70 text-sm shadow-sm dark:bg-zinc-900/80">
          <SelectValue />
        </SelectTrigger>
        <SelectContent
          position="popper"
          sideOffset={4}
          className="z-[100] max-h-72 border-border bg-popover text-popover-foreground shadow-xl dark:border-zinc-700 dark:bg-zinc-950"
        >
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value} className="text-sm">
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

const FILTER_LABELS: Record<string, string> = {
  make: "Make",
  model: "Model",
  status: "Status",
  year: "Year",
  bodyStyle: "Style",
  location: "Location",
  priceUpdated: "Price Last Updated",
  minPrice: "Min $",
  maxPrice: "Max $",
  minMileage: "Min mi",
  maxMileage: "Max mi",
  highDemand: "High Demand",
  lowPerforming: "Low Performing",
};

const PRICE_UPDATED_OPTIONS: PillSelectOption[] = [
  { value: "all", label: "Price Updated: Any Time" },
  { value: "today", label: "Price Updated: Today" },
  { value: "last7", label: "Price Updated: Last 7 Days" },
  { value: "last14", label: "Price Updated: Last 14 Days" },
  { value: "last30", label: "Price Updated: Last 30 Days" },
  { value: "stale30", label: "Not Updated: 30+ Days" },
  { value: "stale60", label: "Not Updated: 60+ Days" },
  { value: "stale90", label: "Not Updated: 90+ Days" },
];

const PRICE_UPDATED_CHIP_LABELS: Record<string, string> = {
  today: "Today",
  last7: "Last 7 Days",
  last14: "Last 14 Days",
  last30: "Last 30 Days",
  stale30: "30+ Days",
  stale60: "60+ Days",
  stale90: "90+ Days",
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
  resultCount,
}: ShopInventoryFiltersProps) {
  const { getToken } = useAuth();
  const [filterOptions, setFilterOptions] = React.useState<FilterOptions | null>(null);
  const fetchSeqRef = React.useRef(0);
  const [priceMin, setPriceMin] = React.useState(filters.minPrice ? String(filters.minPrice) : "");
  const [priceMax, setPriceMax] = React.useState(filters.maxPrice ? String(filters.maxPrice) : "");
  const [mileMin, setMileMin] = React.useState(filters.minMileage ? String(filters.minMileage) : "");
  const [mileMax, setMileMax] = React.useState(filters.maxMileage ? String(filters.maxMileage) : "");
  const [showRanges, setShowRanges] = React.useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = React.useState(false);

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
          params: {
            // The backend defaults to excluding Sold/Archived inventory from these
            // option lists unless told otherwise — this call was never sending
            // anything, so a model that only exists as a Sold record (e.g. a Sold
            // 2019 Acura ILX) would never show up as selectable even while
            // "Status: Sold" was explicitly chosen elsewhere on this same page.
            // archived:"all" removes that blanket exclusion; the backend's own
            // scoping (make stays global by design, everything else narrows to
            // the current selection, each field correctly excluding itself) then
            // makes Model/Year/Location/Body Style reflect what's actually
            // available together, matching what's really in the results.
            archived: "all",
            make: filters.make || undefined,
            model: filters.model || undefined,
            status: filters.status && filters.status !== "all" ? filters.status : undefined,
            year: filters.year || undefined,
            location: filters.location || undefined,
            bodyStyle: filters.bodyStyle || undefined,
          },
        });
        if (cancelled || seq !== fetchSeqRef.current) return;
        setFilterOptions(res.data?.data ?? null);
      } catch { }
    })();
    return () => { cancelled = true; };
  }, [apiPath, getToken, filters.make, filters.model, filters.status, filters.year, filters.location, filters.bodyStyle]);

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
      {/* Search + remembered Grid/List preference control — shared by mobile and desktop. */}
      <div className="flex items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
          <Input
            placeholder="Search make, model, VIN, stock #..."
            className="h-10 rounded-xl border-border/60 bg-background/70 pl-10 pr-9 text-sm shadow-sm placeholder:text-muted-foreground/50 focus-visible:ring-2 focus-visible:ring-emerald-500/35 dark:border-zinc-700 dark:bg-zinc-900/80"
            value={filters.search || ""}
            onChange={(event) => onFilterChange("search", event.target.value)}
          />
          {filters.search && (
            <button
              type="button"
              onClick={() => onFilterChange("search", "")}
              className="absolute right-3 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full bg-muted-foreground/20 transition-colors hover:bg-muted-foreground/30"
              aria-label="Clear inventory search"
            >
              <X className="h-3 w-3 text-muted-foreground" />
            </button>
          )}
        </div>

        <div className="flex shrink-0 items-center overflow-hidden rounded-xl border border-border/60 bg-background/60 shadow-sm dark:border-zinc-700">
          <button
            type="button"
            onClick={() => onViewModeChange("grid")}
            className={cn(
              "flex h-10 w-10 items-center justify-center transition-colors",
              viewMode === "grid"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted",
            )}
            aria-label="Grid view"
            aria-pressed={viewMode === "grid"}
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onViewModeChange("list")}
            className={cn(
              "flex h-10 w-10 items-center justify-center border-l border-border/50 transition-colors",
              viewMode === "list"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted",
            )}
            aria-label="List view"
            aria-pressed={viewMode === "list"}
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Mobile toolbar: filters expand inline so inventory stays navigable. */}
      <div className="flex items-center gap-2 md:hidden">
        <button
          type="button"
          onClick={() => setMobileFiltersOpen((open) => !open)}
          aria-expanded={mobileFiltersOpen}
          aria-controls="mobile-inventory-filters"
          className={cn(
            "flex h-9 flex-1 items-center justify-center gap-2 rounded-xl border border-border/60 bg-card/60 px-3 text-xs font-bold shadow-sm transition-colors",
            activeCount > 0 || hasRangeFilter
              ? "border-emerald-500/35 bg-emerald-500/6 text-foreground"
              : "text-foreground",
          )}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Filters
          {activeCount > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-black text-primary-foreground">
              {activeCount}
            </span>
          )}
        </button>

        <div className="min-w-0 flex-1">
          <PillSelect
            value={currentSortValue}
            onValueChange={onSortChange}
            active={!!currentSortValue}
            ariaLabel="Sort inventory"
            className="h-9 w-full min-w-0 justify-between rounded-xl px-3 shadow-sm"
            options={sortOptions}
          />
        </div>
      </div>

      {activeCount > 0 && !mobileFiltersOpen && (
        <div
          className="flex min-w-0 flex-wrap items-start gap-1.5 pb-0.5 md:hidden"
          aria-label="Active inventory filters"
        >
          {chipEntries.map(([key, value]) => {
            const label = FILTER_LABELS[key] ?? key;
            const displayVal =
              typeof value === "boolean"
                ? null
                : key === "priceUpdated"
                  ? PRICE_UPDATED_CHIP_LABELS[String(value)] ?? String(value)
                  : String(value);

            return (
              <span
                key={key}
                className="inline-flex min-h-8 min-w-0 max-w-full items-center gap-1 rounded-full border border-primary/35 bg-primary/8 px-2.5 py-1 text-[10px] font-semibold leading-relaxed text-primary shadow-sm dark:bg-primary/12"
              >
                <span className="min-w-0 break-words [overflow-wrap:anywhere]">
                  <span className="opacity-70">{label}</span>
                  {displayVal && <span>: {displayVal}</span>}
                </span>

                <button
                  type="button"
                  onClick={() =>
                    onFilterChange(
                      key,
                      key === "status" ? "all" : undefined,
                    )
                  }
                  className="ml-0.5 flex size-5 shrink-0 touch-manipulation items-center justify-center rounded-full transition-colors hover:bg-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                  aria-label={`Remove ${label} filter`}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            );
          })}

          <button
            type="button"
            onClick={onClearFilters}
            className="inline-flex min-h-8 shrink-0 touch-manipulation items-center rounded-full px-2.5 text-[10px] font-bold text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/30"
          >
            Clear all
          </button>
        </div>
      )}

      {mobileFiltersOpen && (
        <section
          id="mobile-inventory-filters"
          className="md:hidden flex max-h-64 flex-col overflow-hidden rounded-2xl border border-border/60 bg-card/75 shadow-sm dark:bg-zinc-900/75"
          aria-label="Inventory filters"
        >
          <div className="flex items-center justify-between gap-3 border-b border-border/50 px-3 py-2.5">
            <div className="flex min-w-0 items-center gap-2">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <SlidersHorizontal className="h-3.5 w-3.5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-black text-foreground">Inventory Filters</p>
                <p className="truncate text-[10px] text-muted-foreground">
                  {resultCount !== undefined
                    ? `${resultCount.toLocaleString()} ${resultCount === 1 ? "vehicle" : "vehicles"} match`
                    : "Refine the vehicles shown below"}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setMobileFiltersOpen(false)}
              className="flex h-8 shrink-0 items-center gap-1 rounded-lg border border-border/50 px-2.5 text-[11px] font-bold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <ChevronUp className="h-3.5 w-3.5" />
              Hide
            </button>
          </div>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-3.5 py-3">
            <div className="grid grid-cols-2 gap-2.5">
              <MobileFilterSelect
                label="Make"
                value={filters.make || "all"}
                onValueChange={(value) => onFilterChange("make", value === "all" ? undefined : value)}
                options={makeOptions}
              />
              <MobileFilterSelect
                label="Model"
                value={filters.model || "all"}
                onValueChange={(value) => onFilterChange("model", value === "all" ? undefined : value)}
                options={modelOptions}
              />
              <MobileFilterSelect
                label="Year"
                value={filters.year ? String(filters.year) : "all"}
                onValueChange={(value) => onFilterChange("year", value === "all" ? undefined : Number(value))}
                options={yearOptions}
              />
              <MobileFilterSelect
                label="Status"
                value={filters.status && filters.status !== "all" ? filters.status : "all"}
                onValueChange={(value) => onFilterChange("status", value === "all" ? "all" : value)}
                options={statusOptions}
              />
              <MobileFilterSelect
                label="Location"
                value={filters.location || "all"}
                onValueChange={(value) => onFilterChange("location", value === "all" ? undefined : value)}
                options={locationOptions}
              />
              <MobileFilterSelect
                label="Body Style"
                value={filters.bodyStyle || "all"}
                onValueChange={(value) => onFilterChange("bodyStyle", value === "all" ? undefined : value)}
                options={bodyStyleOptions}
              />
            </div>

            <MobileFilterSelect
              label="Price Last Updated"
              value={filters.priceUpdated || "all"}
              onValueChange={(value) => onFilterChange("priceUpdated", value === "all" ? "all" : value)}
              options={PRICE_UPDATED_OPTIONS}
            />

            <div className="rounded-xl border border-border/50 bg-muted/20 p-3 dark:bg-zinc-950/35">
              <div className="mb-2.5 flex items-center gap-2">
                <ArrowUpDown className="h-3.5 w-3.5 text-primary/70" />
                <span className="text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground">
                  Price & Mileage Range
                </span>
              </div>
              <div className="space-y-2.5">
                <div>
                  <p className="mb-1.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Price</p>
                  <div className="grid grid-cols-2 gap-2">
                    <Input type="number" inputMode="numeric" placeholder="Min $" className="h-9 rounded-xl border-border/60 bg-background/70 text-sm shadow-sm focus-visible:ring-2 focus-visible:ring-emerald-500/35" value={priceMin} onChange={(event) => handleMinPriceChange(event.target.value)} />
                    <Input type="number" inputMode="numeric" placeholder="Max $" className="h-9 rounded-xl border-border/60 bg-background/70 text-sm shadow-sm focus-visible:ring-2 focus-visible:ring-emerald-500/35" value={priceMax} onChange={(event) => handleMaxPriceChange(event.target.value)} />
                  </div>
                </div>
                <div>
                  <p className="mb-1.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Mileage</p>
                  <div className="grid grid-cols-2 gap-2">
                    <Input type="number" inputMode="numeric" placeholder="Min miles" className="h-9 rounded-xl border-border/60 bg-background/70 text-sm shadow-sm focus-visible:ring-2 focus-visible:ring-emerald-500/35" value={mileMin} onChange={(event) => handleMinMileageChange(event.target.value)} />
                    <Input type="number" inputMode="numeric" placeholder="Max miles" className="h-9 rounded-xl border-border/60 bg-background/70 text-sm shadow-sm focus-visible:ring-2 focus-visible:ring-emerald-500/35" value={mileMax} onChange={(event) => handleMaxMileageChange(event.target.value)} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid shrink-0 grid-cols-2 gap-2 border-t border-border/50 bg-background/90 px-3.5 py-2">
            <button
              type="button"
              onClick={onClearFilters}
              className="h-9 rounded-xl border border-border/60 bg-card text-xs font-bold text-foreground transition-colors hover:bg-muted"
            >
              Clear filters
            </button>
            <button
              type="button"
              onClick={() => setMobileFiltersOpen(false)}
              className="h-9 rounded-xl bg-primary text-xs font-black text-primary-foreground transition-colors hover:bg-primary/90"
            >
              {resultCount !== undefined ? `Show ${resultCount.toLocaleString()}` : "Show results"}
            </button>
          </div>
        </section>
      )}

      {/* Desktop/tablet: retain the existing pill-based controls. */}
      <div className="hidden md:block">
        <div className="flex items-center gap-2">
          <div
            className="flex flex-1 items-center gap-2 overflow-x-auto pb-0.5"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" } as React.CSSProperties}
          >
            <PillSelect
              value={filters.make || "all"}
              onValueChange={(value) => onFilterChange("make", value === "all" ? undefined : value)}
              active={!!filters.make}
              ariaLabel="Filter by make"
              options={makeOptions}
            />
            <PillSelect
              value={filters.model || "all"}
              onValueChange={(value) => onFilterChange("model", value === "all" ? undefined : value)}
              active={!!filters.model}
              ariaLabel="Filter by model"
              options={modelOptions}
            />
            <PillSelect
              value={filters.year ? String(filters.year) : "all"}
              onValueChange={(value) => onFilterChange("year", value === "all" ? undefined : Number(value))}
              active={!!filters.year}
              ariaLabel="Filter by year"
              options={yearOptions}
            />
            <PillSelect
              value={filters.bodyStyle || "all"}
              onValueChange={(value) => onFilterChange("bodyStyle", value === "all" ? undefined : value)}
              active={!!filters.bodyStyle}
              ariaLabel="Filter by body style"
              options={bodyStyleOptions}
            />
            <PillSelect
              value={filters.status && filters.status !== "all" ? filters.status : "all"}
              onValueChange={(value) => onFilterChange("status", value === "all" ? "all" : value)}
              active={!!(filters.status && filters.status !== "all")}
              ariaLabel="Filter by status"
              options={statusOptions}
            />
            <PillSelect
              value={filters.location || "all"}
              onValueChange={(value) => onFilterChange("location", value === "all" ? undefined : value)}
              active={!!filters.location}
              ariaLabel="Filter by location"
              options={locationOptions}
            />
            <PillSelect
              value={filters.priceUpdated || "all"}
              onValueChange={(value) => onFilterChange("priceUpdated", value === "all" ? "all" : value)}
              active={!!filters.priceUpdated && filters.priceUpdated !== "all"}
              ariaLabel="Filter by price last updated"
              options={PRICE_UPDATED_OPTIONS}
            />

            <button
              type="button"
              onClick={() => setShowRanges((previous) => !previous)}
              className={cn(
                "flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-full border px-3.5 text-xs font-medium transition-all duration-150",
                showRanges || hasRangeFilter
                  ? "border-primary bg-primary/10 font-semibold text-primary dark:bg-primary/15"
                  : "border-border/60 text-muted-foreground hover:border-border hover:text-foreground dark:border-zinc-700",
              )}
            >
              <SlidersHorizontal className="h-3 w-3" />
              Range
              {hasRangeFilter && (
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-black text-primary-foreground">
                  {[filters.minPrice, filters.maxPrice, filters.minMileage, filters.maxMileage].filter(Boolean).length}
                </span>
              )}
            </button>
          </div>

          <PillSelect
            value={currentSortValue}
            onValueChange={onSortChange}
            active={!!currentSortValue}
            ariaLabel="Sort by"
            className="min-w-37"
            options={sortOptions}
          />
        </div>

        {showRanges && (
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-border/40 bg-muted/30 px-3.5 py-2.5 dark:border-zinc-700/50 dark:bg-zinc-900/50">
            <div className="flex items-center gap-2">
              <span className="whitespace-nowrap text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Price</span>
              <Input type="number" placeholder="Min $" className="h-7 w-20 rounded-lg border-border/50 px-2 text-xs dark:border-zinc-700 dark:bg-zinc-900" value={priceMin} onChange={(event) => handleMinPriceChange(event.target.value)} />
              <span className="text-xs text-muted-foreground/50">—</span>
              <Input type="number" placeholder="Max $" className="h-7 w-20 rounded-lg border-border/50 px-2 text-xs dark:border-zinc-700 dark:bg-zinc-900" value={priceMax} onChange={(event) => handleMaxPriceChange(event.target.value)} />
            </div>
            <div className="hidden h-4 w-px bg-border/50 sm:block" />
            <div className="flex items-center gap-2">
              <span className="whitespace-nowrap text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Miles</span>
              <Input type="number" placeholder="Min" className="h-7 w-20 rounded-lg border-border/50 px-2 text-xs dark:border-zinc-700 dark:bg-zinc-900" value={mileMin} onChange={(event) => handleMinMileageChange(event.target.value)} />
              <span className="text-xs text-muted-foreground/50">—</span>
              <Input type="number" placeholder="Max" className="h-7 w-20 rounded-lg border-border/50 px-2 text-xs dark:border-zinc-700 dark:bg-zinc-900" value={mileMax} onChange={(event) => handleMaxMileageChange(event.target.value)} />
            </div>
          </div>
        )}

        {activeCount > 0 && (
          <div className="mt-2 flex flex-wrap items-center gap-1.5 pt-0.5">
            {chipEntries.map(([key, value]) => {
              const label = FILTER_LABELS[key] ?? key;
              const displayVal =
                typeof value === "boolean"
                  ? null
                  : key === "priceUpdated"
                    ? PRICE_UPDATED_CHIP_LABELS[String(value)] ?? String(value)
                    : String(value);
              return (
                <span key={key} className="inline-flex items-center gap-1 rounded-full border border-primary/25 bg-primary/8 px-2.5 py-0.5 text-[11px] font-medium text-primary dark:bg-primary/12">
                  <span className="opacity-70">{label}</span>
                  {displayVal && <span>: {displayVal}</span>}
                  <button type="button" onClick={() => onFilterChange(key, key === "status" ? "all" : undefined)} className="ml-0.5 rounded-full p-0.5 transition-colors hover:bg-primary/20" aria-label={`Remove ${label} filter`}>
                    <X className="h-2.5 w-2.5" />
                  </button>
                </span>
              );
            })}
            <button type="button" onClick={onClearFilters} className="h-6 rounded-full px-1.5 text-[11px] font-semibold text-muted-foreground transition-colors hover:text-destructive">
              Clear all
            </button>
          </div>
        )}
      </div>
    </div>
  );
}