"use client";

import * as React from "react";
import { CalendarDays, Check, ChevronDown, SlidersHorizontal, Tag } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  LEAD_STATUS_CATEGORY_LABEL,
  LEAD_STATUS_CATEGORY_ORDER,
  LEAD_STATUS_CATEGORIES,
  getLeadStatusStyle,
  type LeadStatusCategory,
} from "@/lib/leadStatus";
import {
  REPORTABLE_LEAD_SOURCE_VALUES,
  UNMAPPED_LEAD_SOURCE_LABEL,
} from "@/lib/leadSource";

export type LeadDatePreset =
  | "all"
  | "today"
  | "yesterday"
  | "last7"
  | "last30"
  | "thisMonth"
  | "custom";

export interface LeadDateFilterValue {
  preset: LeadDatePreset;
  from: string;
  to: string;
}

interface LeadsFiltersPopoverProps {
  activeCategory: LeadStatusCategory | null;
  statusFilter: string | null;
  statusCounts: Record<string, number>;
  categoryCounts: Record<string, number>;
  sourceFilter: string | null;
  dateFilter: LeadDateFilterValue;
  onAllStatuses: () => void;
  onInboundCalls: () => void;
  onCategory: (category: LeadStatusCategory) => void;
  onStatus: (status: string) => void;
  onSource: (source: string | null) => void;
  onDatePreset: (preset: LeadDatePreset) => void;
  onCustomDateChange: (range: { from: string; to: string }) => void;
  onClearDate: () => void;
}

const optionClass =
  "flex min-h-9 w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[12px] font-medium transition";

export function LeadsFiltersPopover({
  activeCategory,
  statusFilter,
  statusCounts,
  categoryCounts,
  sourceFilter,
  dateFilter,
  onAllStatuses,
  onInboundCalls,
  onCategory,
  onStatus,
  onSource,
  onDatePreset,
  onCustomDateChange,
  onClearDate,
}: LeadsFiltersPopoverProps) {
  const [open, setOpen] = React.useState(false);
  const [activeType, setActiveType] = React.useState<"status" | "source" | "date">("status");
  const activeCount =
    (statusFilter || activeCategory ? 1 : 0) +
    (sourceFilter ? 1 : 0) +
    (dateFilter.preset !== "all" || dateFilter.from || dateFilter.to ? 1 : 0);
  const selectedLabel =
    statusFilter === "Inbound Calls"
      ? "Inbound Calls"
      : statusFilter
        ? getLeadStatusStyle(statusFilter).label
        : activeCategory
          ? LEAD_STATUS_CATEGORY_LABEL[activeCategory]
          : "All statuses";
  const statusOptions = activeCategory
    ? LEAD_STATUS_CATEGORIES[activeCategory]
    : [];
  const datePresetOptions: Array<{ value: LeadDatePreset; label: string }> = [
    { value: "all", label: "All time" },
    { value: "today", label: "Today" },
    { value: "yesterday", label: "Yesterday" },
    { value: "last7", label: "Last 7 days" },
    { value: "last30", label: "Last 30 days" },
    { value: "thisMonth", label: "This month" },
    { value: "custom", label: "Custom range" },
  ];
  const customRangeInvalid =
    Boolean(dateFilter.from && dateFilter.to) && dateFilter.from > dateFilter.to;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex h-9 min-w-0 items-center justify-between gap-2 rounded-lg px-3 text-[12px] font-semibold outline-none transition sm:h-10 sm:text-[13px]"
          style={{
            background: "var(--input-bg)",
            border: "1px solid var(--input-border)",
            color: "var(--text-primary)",
          }}
          aria-label="Open lead filters"
        >
          <span className="flex min-w-0 items-center gap-2">
            <SlidersHorizontal className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">Filters</span>
            {activeCount > 0 && (
              <span className="rounded-full px-1.5 text-[10px] leading-4" style={{ background: "var(--accent-muted)", color: "var(--accent-text)" }}>
                {activeCount}
              </span>
            )}
          </span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0" style={{ color: "var(--text-tertiary)" }} />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="z-200 w-[min(26rem,calc(100vw-1rem))] p-0"
        sideOffset={6}
      >
        <div
          className="max-h-[min(80dvh,34rem)] overflow-y-auto rounded-xl border p-3 shadow-xl"
          style={{
            background: "var(--bg-elevated)",
            borderColor: "var(--border-1)",
            color: "var(--text-primary)",
          }}
        >
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[12px] font-bold uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>
                Filters
              </p>
              <p className="truncate text-[11px]" style={{ color: "var(--text-tertiary)" }}>
                Status: {selectedLabel}
                {sourceFilter ? ` · Source: ${sourceFilter}` : ""}
                {dateFilter.preset !== "all" ? ` · Date: ${datePresetOptions.find((item) => item.value === dateFilter.preset)?.label || "Custom"}` : ""}
              </p>
            </div>
            {activeCount > 0 && (
              <button
                type="button"
                onClick={() => {
                  onAllStatuses();
                  onSource(null);
                  onClearDate();
                }}
                className="shrink-0 text-[11px] font-semibold"
                style={{ color: "var(--accent-text)" }}
              >
                Clear all
              </button>
            )}
          </div>

          <div className="grid gap-3 md:grid-cols-[0.9fr_1.1fr]">
            <section className="min-w-0">
              <p className="mb-1.5 text-[11px] font-semibold" style={{ color: "var(--text-tertiary)" }}>
                Filter type
              </p>
              <div className="space-y-1">
                <button
                  type="button"
                  onClick={() => setActiveType("status")}
                  className={cn(optionClass, activeType === "status" ? "ring-1" : "")}
                  style={{
                    background: activeType === "status" ? "var(--accent-muted)" : "transparent",
                    color: activeType === "status" ? "var(--accent-text)" : "var(--text-secondary)",
                  }}
                >
                  <SlidersHorizontal className="h-3.5 w-3.5" />
                  <span className="min-w-0 flex-1 truncate">Status</span>
                  {(statusFilter || activeCategory) && (
                    <span className="rounded-full px-1.5 text-[10px] leading-4" style={{ background: "var(--input-bg)", color: "var(--text-tertiary)" }}>
                      1
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveType("source")}
                  className={cn(optionClass, activeType === "source" ? "ring-1" : "")}
                  style={{
                    background: activeType === "source" ? "var(--accent-muted)" : "transparent",
                    color: activeType === "source" ? "var(--accent-text)" : "var(--text-secondary)",
                  }}
                >
                  <Tag className="h-3.5 w-3.5" />
                  <span className="min-w-0 flex-1 truncate">Source</span>
                  {sourceFilter && (
                    <span className="rounded-full px-1.5 text-[10px] leading-4" style={{ background: "var(--input-bg)", color: "var(--text-tertiary)" }}>
                      1
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveType("date")}
                  className={cn(optionClass, activeType === "date" ? "ring-1" : "")}
                  style={{
                    background: activeType === "date" ? "var(--accent-muted)" : "transparent",
                    color: activeType === "date" ? "var(--accent-text)" : "var(--text-secondary)",
                  }}
                >
                  <CalendarDays className="h-3.5 w-3.5" />
                  <span className="min-w-0 flex-1 truncate">Date range</span>
                  {(dateFilter.preset !== "all" || dateFilter.from || dateFilter.to) && (
                    <span className="rounded-full px-1.5 text-[10px] leading-4" style={{ background: "var(--input-bg)", color: "var(--text-tertiary)" }}>
                      1
                    </span>
                  )}
                </button>
              </div>
            </section>

            <section className="min-w-0">
              {activeType === "status" && (
                <>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <p className="text-[11px] font-semibold" style={{ color: "var(--text-tertiary)" }}>
                      Status
                    </p>
                    {(statusFilter || activeCategory) && (
                      <button type="button" onClick={onAllStatuses} className="text-[11px] font-semibold" style={{ color: "var(--accent-text)" }}>
                        Clear
                      </button>
                    )}
                  </div>
                  <div className="mb-3 space-y-1">
                    <button
                      type="button"
                      onClick={onAllStatuses}
                      className={cn(optionClass, !statusFilter && !activeCategory ? "ring-1" : "")}
                      style={{
                        background: !statusFilter && !activeCategory ? "var(--accent-muted)" : "transparent",
                        color: !statusFilter && !activeCategory ? "var(--accent-text)" : "var(--text-secondary)",
                      }}
                    >
                      <Check className={cn("h-3.5 w-3.5", (statusFilter || activeCategory) && "opacity-0")} />
                      All statuses
                    </button>
                    <button
                      type="button"
                      onClick={onInboundCalls}
                      className={cn(optionClass, statusFilter === "Inbound Calls" ? "ring-1" : "")}
                      style={{
                        background: statusFilter === "Inbound Calls" ? "var(--accent-muted)" : "transparent",
                        color: statusFilter === "Inbound Calls" ? "var(--accent-text)" : "var(--text-secondary)",
                      }}
                    >
                      <Check className={cn("h-3.5 w-3.5", statusFilter !== "Inbound Calls" && "opacity-0")} />
                      Inbound Calls
                    </button>
                  </div>
                  <div className="grid gap-3 lg:grid-cols-[0.95fr_1.05fr]">
                    <div className="space-y-1">
                {LEAD_STATUS_CATEGORY_ORDER.map((category) => (
                  <button
                    key={category}
                    type="button"
                    onClick={() => onCategory(category)}
                    className={cn(optionClass, activeCategory === category && !statusFilter ? "ring-1" : "")}
                    style={{
                      background: activeCategory === category && !statusFilter ? "var(--accent-muted)" : "transparent",
                      color: activeCategory === category && !statusFilter ? "var(--accent-text)" : "var(--text-secondary)",
                    }}
                  >
                    <Check className={cn("h-3.5 w-3.5", !(activeCategory === category && !statusFilter) && "opacity-0")} />
                    <span className="min-w-0 flex-1 truncate">
                      {LEAD_STATUS_CATEGORY_LABEL[category]}
                    </span>
                    <span className="shrink-0 rounded-full px-1.5 text-[10px] leading-4" style={{ background: "var(--input-bg)", color: "var(--text-tertiary)" }}>
                      {categoryCounts[category] || 0}
                    </span>
                  </button>
                ))}
                    </div>
                    {activeCategory ? (
                <div className="space-y-1">
                  {statusOptions.map((status) => {
                    const style = getLeadStatusStyle(status);
                    const selected = statusFilter === status;
                    return (
                      <button
                        key={status}
                        type="button"
                        onClick={() => onStatus(status)}
                        className={cn(optionClass, selected ? "ring-1" : "")}
                        style={{
                          background: selected ? "var(--accent-muted)" : "transparent",
                          color: selected ? "var(--accent-text)" : "var(--text-secondary)",
                        }}
                      >
                        <Check className={cn("h-3.5 w-3.5", !selected && "opacity-0")} />
                        <span className="min-w-0 flex-1 truncate">{style.label}</span>
                        <span className="shrink-0 rounded-full px-1.5 text-[10px] leading-4" style={{ background: "var(--input-bg)", color: "var(--text-tertiary)" }}>
                          {statusCounts[status] || 0}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-lg border px-3 py-5 text-center text-[12px]" style={{ borderColor: "var(--border-1)", color: "var(--text-tertiary)" }}>
                  Choose a status group to filter by an exact status.
                </div>
              )}
                  </div>
                </>
              )}

              {activeType === "source" && (
                <>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <p className="text-[11px] font-semibold" style={{ color: "var(--text-tertiary)" }}>
                      Lead Source
                    </p>
                    {sourceFilter && (
                      <button type="button" onClick={() => onSource(null)} className="text-[11px] font-semibold" style={{ color: "var(--accent-text)" }}>
                        Clear
                      </button>
                    )}
                  </div>
                  <div className="space-y-1">
                    {[...REPORTABLE_LEAD_SOURCE_VALUES, UNMAPPED_LEAD_SOURCE_LABEL].map((source) => {
                      const selected = sourceFilter === source;
                      return (
                        <button
                          key={source}
                          type="button"
                          onClick={() => onSource(selected ? null : source)}
                          className={cn(optionClass, selected ? "ring-1" : "")}
                          style={{
                            background: selected ? "var(--accent-muted)" : "transparent",
                            color: selected ? "var(--accent-text)" : "var(--text-secondary)",
                          }}
                        >
                          <Check className={cn("h-3.5 w-3.5", !selected && "opacity-0")} />
                          <span className="min-w-0 flex-1 truncate">{source}</span>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}

              {activeType === "date" && (
                <>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <p className="text-[11px] font-semibold" style={{ color: "var(--text-tertiary)" }}>
                      Lead entered CRM
                    </p>
                    {(dateFilter.preset !== "all" || dateFilter.from || dateFilter.to) && (
                      <button type="button" onClick={onClearDate} className="text-[11px] font-semibold" style={{ color: "var(--accent-text)" }}>
                        Clear
                      </button>
                    )}
                  </div>
                  <div className="space-y-1">
                    {datePresetOptions.map((option) => {
                      const selected = dateFilter.preset === option.value;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => onDatePreset(option.value)}
                          className={cn(optionClass, selected ? "ring-1" : "")}
                          style={{
                            background: selected ? "var(--accent-muted)" : "transparent",
                            color: selected ? "var(--accent-text)" : "var(--text-secondary)",
                          }}
                        >
                          <Check className={cn("h-3.5 w-3.5", !selected && "opacity-0")} />
                          <span className="min-w-0 flex-1 truncate">{option.label}</span>
                        </button>
                      );
                    })}
                  </div>
                  {dateFilter.preset === "custom" && (
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      <label className="min-w-0 text-[11px] font-semibold" style={{ color: "var(--text-tertiary)" }}>
                        From
                        <input
                          type="date"
                          value={dateFilter.from}
                          max={dateFilter.to || undefined}
                          onChange={(event) => onCustomDateChange({ from: event.target.value, to: dateFilter.to })}
                          className="mt-1 h-9 w-full rounded-lg px-2 text-[13px] outline-none"
                          style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)", color: "var(--text-primary)" }}
                        />
                      </label>
                      <label className="min-w-0 text-[11px] font-semibold" style={{ color: "var(--text-tertiary)" }}>
                        To
                        <input
                          type="date"
                          value={dateFilter.to}
                          min={dateFilter.from || undefined}
                          onChange={(event) => onCustomDateChange({ from: dateFilter.from, to: event.target.value })}
                          className="mt-1 h-9 w-full rounded-lg px-2 text-[13px] outline-none"
                          style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)", color: "var(--text-primary)" }}
                        />
                      </label>
                      {customRangeInvalid && (
                        <p className="sm:col-span-2 text-[11px]" style={{ color: "var(--danger, #ef4444)" }}>
                          Start date must be before the end date.
                        </p>
                      )}
                    </div>
                  )}
                </>
              )}
            </section>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
