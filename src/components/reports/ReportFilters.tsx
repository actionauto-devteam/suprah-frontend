"use client";

import * as React from "react";
import { format } from "date-fns";
import {
  Calendar,
  Check,
  ChevronDown,
  RotateCcw,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  buildReportFilterChips,
  type ReportFilterChip,
} from "@/lib/report-filter-query";
import {
  PERIOD_LABELS,
  type ReportFilterConfig,
  type ReportFilterOption,
  type ReportFilterState,
  type ReportPeriod,
} from "@/types/report-filters";

export interface ReportFiltersProps {
  config: ReportFilterConfig;
  filters: ReportFilterState;
  defaultFilters: ReportFilterState;
  onChange: (filters: ReportFilterState) => void;
  onReset: () => void;
  resultLabel?: string;
  periodAttention?: boolean;
}

const inputClassName =
  "h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20";

function parseDateInput(value?: string): Date | undefined {
  if (!value) return undefined;

  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return undefined;

  const date = new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
  );

  return Number.isNaN(date.getTime()) ? undefined : date;
}

function formatDateInput(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function startOfLocalDay(value: Date): Date {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

function numberOrUndefined(value: string): number | undefined {
  if (!value.trim()) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

interface RangePreset {
  label: string;
  min?: number;
  max?: number;
}

const AMOUNT_PRESETS: RangePreset[] = [
  { label: "Under $500", max: 500 },
  { label: "$500–$1,000", min: 500, max: 1_000 },
  { label: "$1,000–$2,500", min: 1_000, max: 2_500 },
  { label: "Over $2,500", min: 2_500 },
];

const MILEAGE_PRESETS: RangePreset[] = [
  { label: "Under 100 mi", max: 100 },
  { label: "100–500 mi", min: 100, max: 500 },
  { label: "500–1,000 mi", min: 500, max: 1_000 },
  { label: "Over 1,000 mi", min: 1_000 },
];

const DATE_SORT_FIELDS = new Set([
  "createdAt",
  "updatedAt",
  "paidAt",
  "assignedAt",
  "pickedUpAt",
  "deliveredAt",
]);

const NUMBER_SORT_FIELDS = new Set([
  "amount",
  "miles",
  "carrierPayAmount",
  "rate",
  "units",
]);

function getArrangeOrderLabels(sortBy?: string): {
  ascending: string;
  descending: string;
} {
  if (DATE_SORT_FIELDS.has(sortBy ?? "")) {
    return {
      ascending: "Oldest first",
      descending: "Newest first",
    };
  }

  if (NUMBER_SORT_FIELDS.has(sortBy ?? "")) {
    return {
      ascending: "Lowest first",
      descending: "Highest first",
    };
  }

  return {
    ascending: "A to Z",
    descending: "Z to A",
  };
}

function RangePresets({
  label,
  presets,
  min,
  max,
  onChange,
}: {
  label: string;
  presets: RangePreset[];
  min?: number;
  max?: number;
  onChange: (range: { min?: number; max?: number }) => void;
}) {
  return (
    <div className="min-w-0 space-y-1.5 md:col-span-2 xl:col-span-3">
      <span className="block text-xs font-semibold text-foreground">
        {label}
      </span>
      <div className="flex flex-wrap gap-1.5">
        {presets.map((preset) => {
          const active = min === preset.min && max === preset.max;
          return (
            <button
              key={preset.label}
              type="button"
              aria-pressed={active}
              onClick={() =>
                onChange(
                  active
                    ? { min: undefined, max: undefined }
                    : { min: preset.min, max: preset.max },
                )
              }
              className={`rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors ${
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-muted-foreground hover:border-primary/35 hover:text-foreground"
              }`}
            >
              {preset.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`min-w-0 space-y-1.5 ${className}`}>
      <span className="block text-xs font-semibold text-foreground">
        {label}
      </span>
      {children}
    </div>
  );
}

function ReportDatePicker({
  value,
  onChange,
  min,
  max,
  placeholder = "Select date",
  buttonRef,
  ariaInvalid = false,
  compact = false,
}: {
  value?: string;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
  placeholder?: string;
  buttonRef?: React.RefObject<HTMLButtonElement | null>;
  ariaInvalid?: boolean;
  compact?: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const selectedDate = React.useMemo(() => parseDateInput(value), [value]);

  const disabledMatcher = React.useMemo(() => {
    const minimum = parseDateInput(min);
    const maximum = parseDateInput(max);

    if (!minimum && !maximum) return undefined;

    return (date: Date) => {
      const candidate = startOfLocalDay(date);

      if (minimum && candidate < startOfLocalDay(minimum)) return true;
      if (maximum && candidate > startOfLocalDay(maximum)) return true;

      return false;
    };
  }, [max, min]);

  return (
    <Popover open={open} onOpenChange={setOpen} modal={false}>
      <PopoverTrigger asChild>
        <Button
          ref={buttonRef}
          type="button"
          variant="outline"
          aria-invalid={ariaInvalid}
          className={`w-full justify-start gap-2 border-border bg-background text-left font-normal text-foreground shadow-none hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-primary/20 ${
            compact ? "h-8 px-2 text-xs" : "h-10 px-3 text-sm"
          } ${ariaInvalid ? "border-destructive focus-visible:ring-destructive/20" : ""}`}
        >
          <Calendar className={compact ? "size-3.5" : "size-4"} />
          <span
            className={`min-w-0 truncate ${
              selectedDate ? "text-foreground" : "text-muted-foreground"
            }`}
          >
            {selectedDate ? format(selectedDate, "MMM d, yyyy") : placeholder}
          </span>
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        sideOffset={6}
        collisionPadding={12}
        className="z-[220] w-auto overflow-hidden rounded-xl border border-border bg-popover p-0 text-popover-foreground shadow-2xl"
      >
        <CalendarPicker
          mode="single"
          selected={selectedDate}
          onSelect={(date) => {
            if (!date) return;
            onChange(formatDateInput(date));
            setOpen(false);
          }}
          disabled={disabledMatcher}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}

function MultiSelectDropdown({
  label,
  options,
  selected,
  onChange,
  placeholder = "All",
}: {
  label: string;
  options: ReportFilterOption[];
  selected: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const ref = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  React.useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const filteredOptions = React.useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return options;

    return options.filter((option) =>
      `${option.label} ${option.value}`.toLowerCase().includes(keyword),
    );
  }, [options, query]);

  if (options.length === 0) return null;

  const summary =
    selected.length === 0
      ? placeholder
      : selected.length === 1
        ? options.find((option) => option.value === selected[0])?.label ??
          selected[0]
        : `${selected.length} selected`;

  return (
    <div
      ref={ref}
      className={`relative min-w-0 ${label ? "space-y-1.5" : ""}`}
    >
      {label && (
        <span className="block text-xs font-semibold text-foreground">
          {label}
        </span>
      )}
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex h-10 w-full items-center justify-between gap-2 rounded-lg border border-border bg-background px-3 text-left text-sm text-foreground transition-colors hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
      >
        <span className="min-w-0 truncate">{summary}</span>
        <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
      </button>

      {open && (
        <div className="absolute left-0 top-[calc(100%+0.4rem)] z-[90] w-full min-w-60 rounded-xl border border-border bg-popover p-1.5 text-popover-foreground shadow-2xl">
          <label className="relative mb-1 block">
            <span className="sr-only">Search {label || placeholder}</span>
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Escape") setOpen(false);
              }}
              placeholder={`Search ${label || placeholder}`}
              className="h-8 w-full rounded-lg border border-border bg-background pl-8 pr-2 text-xs text-foreground outline-none placeholder:text-muted-foreground focus:border-primary"
            />
          </label>

          <div className="max-h-64 overflow-y-auto">
            <button
              type="button"
              onClick={() => onChange([])}
              className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-muted"
            >
              <span>All</span>
              {selected.length === 0 && (
                <Check className="size-4 text-primary" />
              )}
            </button>

            {filteredOptions.length === 0 ? (
              <p className="px-3 py-3 text-center text-xs text-muted-foreground">
                No matching options
              </p>
            ) : (
              filteredOptions.map((option) => {
                const active = selected.includes(option.value);
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() =>
                      onChange(
                        active
                          ? selected.filter((value) => value !== option.value)
                          : [...selected, option.value],
                      )
                    }
                    className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-muted"
                  >
                    <span className="min-w-0 truncate">{option.label}</span>
                    {active && (
                      <Check className="size-4 shrink-0 text-primary" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function FilterChip({
  chip,
  onRemove,
}: {
  chip: ReportFilterChip;
  onRemove: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onRemove}
      className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary transition-colors hover:bg-primary/15"
      title={`Remove ${chip.label}`}
    >
      <span className="min-w-0 truncate">{chip.label}</span>
      <X className="size-3 shrink-0" />
    </button>
  );
}

function clearAdvancedFilters(
  filters: ReportFilterState,
  defaults: ReportFilterState,
): ReportFilterState {
  return {
    ...filters,
    dateField: defaults.dateField,
    sources: [],
    paymentMethods: [],
    payoutStatuses: [],
    driverIds: [],
    pickupStates: [],
    deliveryStates: [],
    readStatus: defaults.readStatus,
    pendingStatus: defaults.pendingStatus,
    appointmentStatus: defaults.appointmentStatus,
    minAmount: undefined,
    maxAmount: undefined,
    minMiles: undefined,
    maxMiles: undefined,
    sortBy: defaults.sortBy,
    sortDirection: defaults.sortDirection,
  };
}

export default function ReportFilters({
  config,
  filters,
  defaultFilters,
  onChange,
  onReset,
  resultLabel,
  periodAttention = false,
}: ReportFiltersProps) {
  const [searchValue, setSearchValue] = React.useState(filters.search);
  const [advancedOpen, setAdvancedOpen] = React.useState(false);
  const [advancedDraft, setAdvancedDraft] = React.useState(filters);
  const fromDateRef = React.useRef<HTMLButtonElement | null>(null);
  const toDateRef = React.useRef<HTMLButtonElement | null>(null);
  const previousPeriodRef = React.useRef(filters.period);

  React.useEffect(() => {
    setSearchValue(filters.search);
  }, [filters.search]);

  React.useEffect(() => {
    const timeout = window.setTimeout(() => {
      if (searchValue !== filters.search) {
        onChange({ ...filters, search: searchValue });
      }
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [filters, onChange, searchValue]);

  React.useEffect(() => {
    if (advancedOpen) setAdvancedDraft(filters);
  }, [advancedOpen, filters]);

  React.useEffect(() => {
    const previousPeriod = previousPeriodRef.current;
    previousPeriodRef.current = filters.period;

    if (filters.period === "custom" && previousPeriod !== "custom") {
      window.requestAnimationFrame(() => fromDateRef.current?.focus());
    }
  }, [filters.period]);

  const chips = React.useMemo(
    () => buildReportFilterChips(filters, defaultFilters, config),
    [config, defaultFilters, filters],
  );

  const advancedCount = chips.filter(
    (chip) => chip.group === "advanced" || chip.group === "sort",
  ).length;

  const updateImmediate = (patch: Partial<ReportFilterState>) => {
    onChange({ ...filters, ...patch });
  };

  const updateDraft = (patch: Partial<ReportFilterState>) => {
    setAdvancedDraft((current) => ({ ...current, ...patch }));
  };

  const focusDateInput = (input: React.RefObject<HTMLButtonElement | null>) => {
    window.requestAnimationFrame(() => input.current?.focus());
  };

  const handlePeriodChange = (value: string) => {
    const period = value as ReportPeriod;

    updateImmediate({
      period,
      dateRange:
        period === "custom"
          ? filters.dateRange
          : { from: undefined, to: undefined },
    });

    if (period === "custom") {
      focusDateInput(fromDateRef);
    }
  };

  const updateCustomDate = (
    field: "from" | "to",
    value: string,
  ) => {
    const nextRange = {
      ...filters.dateRange,
      [field]: value || undefined,
    };

    updateImmediate({
      period: "custom",
      dateRange: nextRange,
    });

    if (field === "from" && value && !nextRange.to) {
      focusDateInput(toDateRef);
    }
  };

  const customRangeError =
    filters.period === "custom" &&
    filters.dateRange.from &&
    filters.dateRange.to &&
    filters.dateRange.from > filters.dateRange.to
      ? "The end date must be on or after the start date."
      : undefined;

  const arrangeOrderLabels = getArrangeOrderLabels(
    advancedDraft.sortBy ?? config.sort?.defaultSortBy,
  );

  return (
    <section
      className={`min-w-0 scroll-mt-24 space-y-3 rounded-xl border bg-card p-3 shadow-sm transition-all duration-300 sm:p-4 ${
        periodAttention
          ? "border-primary ring-4 ring-primary/20"
          : "border-border/80"
      }`}
    >
      {periodAttention ? (
        <div
          role="status"
          aria-live="polite"
          className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-sm font-semibold text-foreground"
        >
          <Calendar className="size-4 shrink-0 text-primary" />
          Choose a reporting period or enter a custom date range here.
        </div>
      ) : null}

      <div className="grid min-w-0 gap-3 lg:grid-cols-[minmax(15rem,1.6fr)_minmax(10rem,.8fr)_minmax(10rem,.9fr)_auto]">
        {config.search?.enabled && (
          <label className="relative min-w-0">
            <span className="sr-only">Search report</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              placeholder={config.search.placeholder ?? "Search report records"}
              className={`${inputClassName} pl-9`}
            />
          </label>
        )}

        {config.period?.enabled && (
          <Select
            value={filters.period}
            onValueChange={handlePeriodChange}
          >
            <SelectTrigger className="h-10 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(config.period.options ?? []).map((period) => (
                <SelectItem key={period} value={period}>
                  {PERIOD_LABELS[period]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {config.status?.enabled ? (
          <MultiSelectDropdown
            label=""
            options={config.status.options ?? []}
            selected={filters.statuses}
            onChange={(statuses) => updateImmediate({ statuses })}
            placeholder={config.status.label ?? "All statuses"}
          />
        ) : (
          <div />
        )}

        <Button
          type="button"
          variant="outline"
          className="h-10 gap-2 whitespace-nowrap"
          onClick={() => setAdvancedOpen(true)}
        >
          <SlidersHorizontal className="size-4" />
          More Filters{advancedCount > 0 ? ` (${advancedCount})` : ""}
        </Button>
      </div>

      {filters.period === "custom" && (
        <div className="min-w-0 rounded-xl border border-primary/20 bg-primary/[0.035] p-3 animate-in fade-in-0 slide-in-from-top-1 duration-200 sm:p-4">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Calendar className="size-4.5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-foreground">
                Custom date range
              </p>
            </div>
          </div>

          <div className="mt-3 grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(12rem,1fr)_auto_minmax(12rem,1fr)] lg:items-end">
            <Field label="From date">
              <ReportDatePicker
                buttonRef={fromDateRef}
                value={filters.dateRange.from}
                max={filters.dateRange.to}
                onChange={(value) => updateCustomDate("from", value)}
                placeholder="Choose start date"
                ariaInvalid={Boolean(customRangeError)}
              />
            </Field>

            <span className="hidden h-10 items-center justify-center px-1 text-xs font-semibold text-muted-foreground lg:flex">
              to
            </span>

            <Field label="To date">
              <ReportDatePicker
                buttonRef={toDateRef}
                value={filters.dateRange.to}
                min={filters.dateRange.from}
                onChange={(value) => updateCustomDate("to", value)}
                placeholder="Choose end date"
                ariaInvalid={Boolean(customRangeError)}
              />
            </Field>
          </div>

          {(customRangeError ||
            filters.dateRange.from ||
            filters.dateRange.to) && (
            <div
              className={`mt-3 flex min-w-0 flex-wrap items-center gap-2 ${
                customRangeError ? "justify-between" : "justify-end"
              }`}
            >
              {customRangeError && (
                <p
                  className="text-xs font-semibold text-destructive"
                  role="alert"
                  aria-live="polite"
                >
                  {customRangeError}
                </p>
              )}

              {(filters.dateRange.from || filters.dateRange.to) && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 shrink-0"
                  onClick={() =>
                    updateImmediate({
                      dateRange: { from: undefined, to: undefined },
                    })
                  }
                >
                  Clear dates
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      {filters.period !== "all" && filters.period !== "custom" && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-muted-foreground">
            Reference date
          </span>
          <div className="w-full max-w-56">
            <ReportDatePicker
              value={filters.referenceDate}
              onChange={(value) =>
                updateImmediate({ referenceDate: value })
              }
              placeholder="Choose reference date"
              compact
            />
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 border-t border-border/70 pt-3">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
          {chips.length === 0 ? (
            <span className="text-xs text-muted-foreground">
              No additional filters applied
            </span>
          ) : (
            chips.map((chip) => (
              <FilterChip
                key={chip.id}
                chip={chip}
                onRemove={() => onChange({ ...filters, ...chip.patch })}
              />
            ))
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {resultLabel && (
            <span className="text-xs font-semibold text-muted-foreground">
              {resultLabel}
            </span>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5"
            onClick={onReset}
            disabled={chips.length === 0}
          >
            <RotateCcw className="size-3.5" />
            Reset
          </Button>
        </div>
      </div>

      {advancedOpen && (
        <div className="fixed inset-0 z-[100] flex justify-end bg-black/45 backdrop-blur-[1px]">
          <button
            type="button"
            aria-label="Close advanced filters"
            className="absolute inset-0 cursor-default"
            onClick={() => setAdvancedOpen(false)}
          />

          <aside className="relative z-10 flex h-full w-full max-w-xl flex-col border-l border-border bg-background shadow-2xl animate-in slide-in-from-right duration-200">
            <div className="flex items-start justify-between gap-4 border-b border-border px-4 py-4 sm:px-5">
              <div>
                <h2 className="text-lg font-bold text-foreground">
                  More Filters
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Configure advanced fields, then apply them together.
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setAdvancedOpen(false)}
                aria-label="Close advanced filters"
              >
                <X className="size-5" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-5">
              <div className="grid min-w-0 gap-4 sm:grid-cols-2">
                {config.sort?.enabled && (
                  <Field label="Arrange by">
                    <Select
                      value={
                        advancedDraft.sortBy ??
                        config.sort.defaultSortBy ??
                        "createdAt"
                      }
                      onValueChange={(value) => updateDraft({ sortBy: value })}
                    >
                      <SelectTrigger className="h-10 w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent position="popper" className="z-[200]">
                        {(config.sort.options ?? []).map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                )}

                {config.sort?.enabled && (
                  <Field label="Arrange in">
                    <Select
                      value={advancedDraft.sortDirection}
                      onValueChange={(value) =>
                        updateDraft({
                          sortDirection:
                            value as ReportFilterState["sortDirection"],
                        })
                      }
                    >
                      <SelectTrigger className="h-10 w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent position="popper" className="z-[200]">
                        <SelectItem value="desc">
                          {arrangeOrderLabels.descending}
                        </SelectItem>
                        <SelectItem value="asc">
                          {arrangeOrderLabels.ascending}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                )}

                {config.source?.enabled && (
                  <MultiSelectDropdown
                    label={config.source.label ?? "Source"}
                    options={config.source.options ?? []}
                    selected={advancedDraft.sources}
                    onChange={(sources) => updateDraft({ sources })}
                  />
                )}

                {config.paymentMethod?.enabled && (
                  <MultiSelectDropdown
                    label="Payment Method"
                    options={config.paymentMethod.options ?? []}
                    selected={advancedDraft.paymentMethods}
                    onChange={(paymentMethods) =>
                      updateDraft({ paymentMethods })
                    }
                  />
                )}

                {config.payoutStatus?.enabled && (
                  <MultiSelectDropdown
                    label="Payout Status"
                    options={config.payoutStatus.options ?? []}
                    selected={advancedDraft.payoutStatuses}
                    onChange={(payoutStatuses) =>
                      updateDraft({ payoutStatuses })
                    }
                  />
                )}

                {config.driver?.enabled && (
                  <MultiSelectDropdown
                    label="Driver"
                    options={config.driver.options ?? []}
                    selected={advancedDraft.driverIds}
                    onChange={(driverIds) => updateDraft({ driverIds })}
                  />
                )}

                {config.route?.enabled && (
                  <>
                    <MultiSelectDropdown
                      label="Origin State"
                      options={config.route.pickupStateOptions ?? []}
                      selected={advancedDraft.pickupStates}
                      onChange={(pickupStates) =>
                        updateDraft({ pickupStates })
                      }
                    />
                    <MultiSelectDropdown
                      label="Destination State"
                      options={config.route.deliveryStateOptions ?? []}
                      selected={advancedDraft.deliveryStates}
                      onChange={(deliveryStates) =>
                        updateDraft({ deliveryStates })
                      }
                    />
                  </>
                )}

                {config.readStatus?.enabled && (
                  <Field label="Read Status">
                    <Select
                      value={advancedDraft.readStatus}
                      onValueChange={(value) =>
                        updateDraft({
                          readStatus: value as ReportFilterState["readStatus"],
                        })
                      }
                    >
                      <SelectTrigger className="h-10 w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent position="popper" className="z-[200]">
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="read">Read</SelectItem>
                        <SelectItem value="unread">Unread</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                )}

                {config.pendingStatus?.enabled && (
                  <Field label="Pending Reply">
                    <Select
                      value={advancedDraft.pendingStatus}
                      onValueChange={(value) =>
                        updateDraft({
                          pendingStatus:
                            value as ReportFilterState["pendingStatus"],
                        })
                      }
                    >
                      <SelectTrigger className="h-10 w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent position="popper" className="z-[200]">
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="pending">Pending Reply</SelectItem>
                        <SelectItem value="not-pending">Not Pending</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                )}

                {config.appointmentStatus?.enabled && (
                  <Field label="Appointment">
                    <Select
                      value={advancedDraft.appointmentStatus}
                      onValueChange={(value) =>
                        updateDraft({
                          appointmentStatus:
                            value as ReportFilterState["appointmentStatus"],
                        })
                      }
                    >
                      <SelectTrigger className="h-10 w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent position="popper" className="z-[200]">
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="has-appointment">
                          Has Appointment
                        </SelectItem>
                        <SelectItem value="no-appointment">
                          No Appointment
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                )}

                {config.amountRange?.enabled && (
                  <>
                    <RangePresets
                      label={`${config.amountRange.label ?? "Amount"} presets`}
                      presets={AMOUNT_PRESETS}
                      min={advancedDraft.minAmount}
                      max={advancedDraft.maxAmount}
                      onChange={({ min, max }) =>
                        updateDraft({ minAmount: min, maxAmount: max })
                      }
                    />
                    <Field
                      label={
                        config.amountRange.minimumLabel ?? "Minimum amount"
                      }
                    >
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={advancedDraft.minAmount ?? ""}
                        onChange={(event) =>
                          updateDraft({
                            minAmount: numberOrUndefined(event.target.value),
                          })
                        }
                        className={inputClassName}
                      />
                    </Field>
                    <Field
                      label={
                        config.amountRange.maximumLabel ?? "Maximum amount"
                      }
                    >
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={advancedDraft.maxAmount ?? ""}
                        onChange={(event) =>
                          updateDraft({
                            maxAmount: numberOrUndefined(event.target.value),
                          })
                        }
                        className={inputClassName}
                      />
                    </Field>
                  </>
                )}

                {config.mileageRange?.enabled && (
                  <>
                    <RangePresets
                      label="Mileage presets"
                      presets={MILEAGE_PRESETS}
                      min={advancedDraft.minMiles}
                      max={advancedDraft.maxMiles}
                      onChange={({ min, max }) =>
                        updateDraft({ minMiles: min, maxMiles: max })
                      }
                    />
                    <Field
                      label={
                        config.mileageRange.minimumLabel ?? "Minimum miles"
                      }
                    >
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={advancedDraft.minMiles ?? ""}
                        onChange={(event) =>
                          updateDraft({
                            minMiles: numberOrUndefined(event.target.value),
                          })
                        }
                        className={inputClassName}
                      />
                    </Field>
                    <Field
                      label={
                        config.mileageRange.maximumLabel ?? "Maximum miles"
                      }
                    >
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={advancedDraft.maxMiles ?? ""}
                        onChange={(event) =>
                          updateDraft({
                            maxMiles: numberOrUndefined(event.target.value),
                          })
                        }
                        className={inputClassName}
                      />
                    </Field>
                  </>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border bg-card px-4 py-3 sm:px-5">
              <Button
                type="button"
                variant="ghost"
                onClick={() =>
                  setAdvancedDraft((current) =>
                    clearAdvancedFilters(current, defaultFilters),
                  )
                }
              >
                Clear advanced
              </Button>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setAdvancedOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    onChange(advancedDraft);
                    setAdvancedOpen(false);
                  }}
                >
                  Apply Filters
                </Button>
              </div>
            </div>
          </aside>
        </div>
      )}
    </section>
  );
}