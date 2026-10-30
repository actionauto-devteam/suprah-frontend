"use client";

import * as React from "react";
import { ArrowUpDown, CalendarDays, Check, ChevronDown, MapPin, SlidersHorizontal, Tag, UserRound } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTheme } from "@/context/ThemeContext";
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

export interface LeadAssigneeFilterControl {
  value: string | null;
  currentUserId: string | null;
  members: Array<{ _id: string; name: string }>;
  onChange: (userId: string | null) => void;
}

export interface LeadLocationFilterControl {
  value: string | null;
  options: Array<{ key: string | null; label: string }>;
  counts: Record<string, number>;
  onChange: (key: string | null) => void;
}

export interface LeadSortFilterControl {
  value: string;
  defaultValue: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
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
  assignee?: LeadAssigneeFilterControl;
  location?: LeadLocationFilterControl;
  sort?: LeadSortFilterControl;
}

type FilterType = "sort" | "status" | "assignee" | "source" | "location" | "date";

const optionClass =
  "flex min-h-9 w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[12px] font-medium transition";

export const LEAD_DATE_PRESET_OPTIONS: Array<{ value: LeadDatePreset; label: string }> = [
  { value: "all", label: "All time" },
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "last7", label: "Last 7 days" },
  { value: "last30", label: "Last 30 days" },
  { value: "thisMonth", label: "This month" },
  { value: "custom", label: "Custom range" },
];

function OptionButton({
  selected,
  onClick,
  children,
  count,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
  count?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(optionClass, "max-sm:min-h-11", selected ? "ring-1" : "")}
      style={{
        background: selected ? "var(--accent-muted)" : "transparent",
        color: selected ? "var(--accent-text)" : "var(--text-secondary)",
      }}
    >
      <Check className={cn("h-3.5 w-3.5 shrink-0", !selected && "opacity-0")} />
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {count !== undefined && (
        <span className="shrink-0 rounded-full px-1.5 text-[10px] leading-4" style={{ background: "var(--input-bg)", color: "var(--text-tertiary)" }}>
          {count}
        </span>
      )}
    </button>
  );
}

function SectionHeader({ title, onClear }: { title: string; onClear?: (() => void) | null }) {
  return (
    <div className="mb-2 flex items-center justify-between gap-3">
      <p className="text-[11px] font-semibold" style={{ color: "var(--text-tertiary)" }}>
        {title}
      </p>
      {onClear && (
        <button type="button" onClick={onClear} className="min-h-8 text-[11px] font-semibold" style={{ color: "var(--accent-text)" }}>
          Clear
        </button>
      )}
    </div>
  );
}

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
  assignee,
  location,
  sort,
}: LeadsFiltersPopoverProps) {
  const isMobile = useIsMobile();
  const { theme } = useTheme();
  const [open, setOpen] = React.useState(false);
  const [activeType, setActiveType] = React.useState<FilterType>("status");
  const [memberQuery, setMemberQuery] = React.useState("");
  const statusActive = Boolean(statusFilter || activeCategory);
  const dateActive = dateFilter.preset !== "all" || Boolean(dateFilter.from) || Boolean(dateFilter.to);
  const assigneeActive = Boolean(assignee?.value) && assignee?.value !== assignee?.currentUserId;
  const locationActive = Boolean(location?.value);
  const sortActive = isMobile && Boolean(sort) && sort?.value !== sort?.defaultValue;
  const activeCount =
    (statusActive ? 1 : 0) +
    (sourceFilter ? 1 : 0) +
    (dateActive ? 1 : 0) +
    (assigneeActive ? 1 : 0) +
    (isMobile && locationActive ? 1 : 0) +
    (sortActive ? 1 : 0);
  const selectedLabel =
    statusFilter === "Inbound Calls"
      ? "Inbound Calls"
      : statusFilter
        ? getLeadStatusStyle(statusFilter).label
        : activeCategory
          ? LEAD_STATUS_CATEGORY_LABEL[activeCategory]
          : "All statuses";
  const statusOptions = activeCategory ? LEAD_STATUS_CATEGORIES[activeCategory] : [];
  const showExactStatuses = statusOptions.length > 1;
  const customRangeInvalid =
    Boolean(dateFilter.from && dateFilter.to) && dateFilter.from > dateFilter.to;
  const assigneeName = assignee?.value
    ? assignee.value === assignee.currentUserId
      ? "Me"
      : assignee.members.find((member) => member._id === assignee.value)?.name || "Team member"
    : null;
  const locationLabel = location?.value ? location.options.find((option) => option.key === location.value)?.label || location.value : null;
  const showLocation = Boolean(location) && isMobile;
  const showSort = Boolean(sort) && isMobile;

  const types: Array<{ key: FilterType; label: string; icon: React.ReactNode; active: boolean }> = [
    ...(showSort ? [{ key: "sort" as const, label: "Sort", icon: <ArrowUpDown className="h-3.5 w-3.5" />, active: sortActive }] : []),
    { key: "status", label: "Status", icon: <SlidersHorizontal className="h-3.5 w-3.5" />, active: statusActive },
    ...(assignee ? [{ key: "assignee" as const, label: "Assigned to", icon: <UserRound className="h-3.5 w-3.5" />, active: assigneeActive }] : []),
    { key: "source", label: "Source", icon: <Tag className="h-3.5 w-3.5" />, active: Boolean(sourceFilter) },
    ...(showLocation ? [{ key: "location" as const, label: "Location", icon: <MapPin className="h-3.5 w-3.5" />, active: locationActive }] : []),
    { key: "date", label: "Date range", icon: <CalendarDays className="h-3.5 w-3.5" />, active: dateActive },
  ];
  const currentType = types.some((type) => type.key === activeType) ? activeType : "status";

  const clearAll = () => {
    onAllStatuses();
    onSource(null);
    onClearDate();
    if (assigneeActive) assignee?.onChange(null);
    if (showLocation && location?.value) location.onChange(null);
    if (sortActive && sort) sort.onChange(sort.defaultValue);
  };

  const summary = [
    `Status: ${selectedLabel}`,
    assigneeName ? `Assigned: ${assigneeName}` : "",
    sourceFilter ? `Source: ${sourceFilter}` : "",
    showLocation && locationLabel ? `Location: ${locationLabel}` : "",
    dateActive ? `Date: ${LEAD_DATE_PRESET_OPTIONS.find((item) => item.value === dateFilter.preset)?.label || "Custom"}` : "",
    sortActive && sort ? `Sort: ${sort.options.find((option) => option.value === sort.value)?.label || sort.value}` : "",
  ].filter(Boolean).join(" · ");

  const filteredMembers = (assignee?.members || []).filter((member) =>
    member.name.toLowerCase().includes(memberQuery.trim().toLowerCase()),
  );

  const options = (
    <section className="min-w-0">
      {currentType === "sort" && sort && (
        <>
          <SectionHeader title="Sort leads" />
          <div className="space-y-1">
            {sort.options.map((option) => (
              <OptionButton key={option.value} selected={sort.value === option.value} onClick={() => sort.onChange(option.value)}>
                {option.label}
              </OptionButton>
            ))}
          </div>
        </>
      )}

      {currentType === "status" && (
        <>
          <SectionHeader title="Status" onClear={statusActive || activeCategory ? onAllStatuses : null} />
          <div className="mb-3 space-y-1">
            <OptionButton selected={!statusFilter && !activeCategory} onClick={onAllStatuses}>All statuses</OptionButton>
            <OptionButton selected={statusFilter === "Inbound Calls"} onClick={onInboundCalls}>Inbound Calls</OptionButton>
          </div>
          <div className="space-y-3">
            <div className="space-y-1">
              {LEAD_STATUS_CATEGORY_ORDER.map((category) => (
                <OptionButton
                  key={category}
                  selected={activeCategory === category && !statusFilter}
                  onClick={() => onCategory(category)}
                  count={categoryCounts[category] || 0}
                >
                  {LEAD_STATUS_CATEGORY_LABEL[category]}
                </OptionButton>
              ))}
            </div>
            {activeCategory && showExactStatuses ? (
              <div className="space-y-1 border-t pt-3" style={{ borderColor: "var(--border-1)" }}>
                <p className="px-1 text-[11px] font-semibold" style={{ color: "var(--text-tertiary)" }}>
                  Narrow {LEAD_STATUS_CATEGORY_LABEL[activeCategory]} to one status
                </p>
                {statusOptions.map((status) => (
                  <OptionButton
                    key={status}
                    selected={statusFilter === status}
                    onClick={() => onStatus(status)}
                    count={statusCounts[status] || 0}
                  >
                    {getLeadStatusStyle(status).label}
                  </OptionButton>
                ))}
              </div>
            ) : (
              !activeCategory && (
                <p className="px-1 text-[12px]" style={{ color: "var(--text-tertiary)" }}>
                  Choose a group to see all of its leads, then narrow it to one status if you need to.
                </p>
              )
            )}
          </div>
        </>
      )}

      {currentType === "assignee" && assignee && (
        <>
          <SectionHeader title="Assigned to" onClear={assigneeActive ? () => assignee.onChange(null) : null} />
          {assignee.members.length > 8 && (
            <input
              value={memberQuery}
              onChange={(event) => setMemberQuery(event.target.value)}
              placeholder="Search team members"
              aria-label="Search team members"
              className="mb-2 h-9 w-full rounded-lg px-3 text-[13px] outline-none max-sm:h-11"
              style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)", color: "var(--text-primary)" }}
            />
          )}
          <div className="space-y-1">
            <OptionButton selected={!assignee.value} onClick={() => assignee.onChange(null)}>Anyone</OptionButton>
            {assignee.currentUserId && (
              <OptionButton selected={assignee.value === assignee.currentUserId} onClick={() => assignee.onChange(assignee.currentUserId)}>
                Me
              </OptionButton>
            )}
            {filteredMembers
              .filter((member) => member._id !== assignee.currentUserId)
              .map((member) => (
                <OptionButton key={member._id} selected={assignee.value === member._id} onClick={() => assignee.onChange(member._id)}>
                  {member.name}
                </OptionButton>
              ))}
            {filteredMembers.length === 0 && memberQuery && (
              <p className="px-2.5 py-2 text-[12px]" style={{ color: "var(--text-tertiary)" }}>No team members match.</p>
            )}
          </div>
        </>
      )}

      {currentType === "source" && (
        <>
          <SectionHeader title="Lead Source" onClear={sourceFilter ? () => onSource(null) : null} />
          <div className="space-y-1">
            {[...REPORTABLE_LEAD_SOURCE_VALUES, UNMAPPED_LEAD_SOURCE_LABEL].map((source) => {
              const selected = sourceFilter === source;
              return (
                <OptionButton key={source} selected={selected} onClick={() => onSource(selected ? null : source)}>
                  {source}
                </OptionButton>
              );
            })}
          </div>
        </>
      )}

      {currentType === "location" && location && (
        <>
          <SectionHeader title="Location" onClear={locationActive ? () => location.onChange(null) : null} />
          <div className="space-y-1">
            {location.options.map((option) => (
              <OptionButton
                key={option.key || "all"}
                selected={location.value === option.key}
                onClick={() => location.onChange(option.key)}
                count={option.key ? location.counts[option.key] : undefined}
              >
                {option.label}
              </OptionButton>
            ))}
          </div>
        </>
      )}

      {currentType === "date" && (
        <>
          <SectionHeader title="Lead entered CRM" onClear={dateActive ? onClearDate : null} />
          <div className="space-y-1">
            {LEAD_DATE_PRESET_OPTIONS.map((option) => (
              <OptionButton key={option.value} selected={dateFilter.preset === option.value} onClick={() => onDatePreset(option.value)}>
                {option.label}
              </OptionButton>
            ))}
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
                  className="mt-1 h-9 w-full rounded-lg px-2 text-[13px] outline-none max-sm:h-11"
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
                  className="mt-1 h-9 w-full rounded-lg px-2 text-[13px] outline-none max-sm:h-11"
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
  );

  const typeButtons = (compact: boolean) => (
    <div className={compact ? "flex flex-wrap gap-1.5" : "space-y-1"} role={compact ? "tablist" : undefined} aria-label={compact ? "Filter type" : undefined}>
      {types.map((type) => {
        const selected = currentType === type.key;
        return (
          <button
            key={type.key}
            type="button"
            role={compact ? "tab" : undefined}
            aria-selected={compact ? selected : undefined}
            onClick={() => setActiveType(type.key)}
            className={cn(
              compact
                ? "inline-flex min-h-10 items-center gap-1.5 rounded-full border px-3 text-[12px] font-semibold"
                : cn(optionClass, selected ? "ring-1" : ""),
            )}
            style={{
              background: selected ? "var(--accent-muted)" : "transparent",
              color: selected ? "var(--accent-text)" : "var(--text-secondary)",
              borderColor: compact ? (selected ? "transparent" : "var(--border-1)") : undefined,
            }}
          >
            {type.icon}
            <span className={compact ? "" : "min-w-0 flex-1 truncate"}>{type.label}</span>
            {type.active && (
              <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: "var(--accent)" }} aria-label="active" />
            )}
          </button>
        );
      })}
    </div>
  );

  const trigger = (
    <button
      type="button"
      className="flex h-9 min-w-0 items-center justify-between gap-2 rounded-lg px-3 text-[12px] font-semibold outline-none transition max-sm:h-10 sm:h-10 sm:text-[13px]"
      style={{
        background: activeCount > 0 ? "var(--accent-muted)" : "var(--input-bg)",
        border: "1px solid var(--input-border)",
        color: activeCount > 0 ? "var(--accent-text)" : "var(--text-primary)",
      }}
      aria-label="Open lead filters"
    >
      <span className="flex min-w-0 items-center gap-2">
        <SlidersHorizontal className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate">Filters</span>
        {activeCount > 0 && (
          <span className="rounded-full px-1.5 text-[10px] leading-4" style={{ background: "var(--bg-elevated)", color: "var(--accent-text)" }}>
            {activeCount}
          </span>
        )}
      </span>
      <ChevronDown className="h-3.5 w-3.5 shrink-0 max-sm:hidden" style={{ color: "var(--text-tertiary)" }} />
    </button>
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>{trigger}</SheetTrigger>
        <SheetContent side="bottom" className="max-h-[88dvh] gap-0 overflow-hidden rounded-t-2xl border-0 p-0">
          <div
            className="ss4 flex max-h-[88dvh] min-h-0 flex-col"
            data-theme={theme}
            style={{ background: "var(--bg-elevated)", color: "var(--text-primary)" }}
          >
            <SheetHeader className="shrink-0 border-b px-4 py-3" style={{ borderColor: "var(--border-1)" }}>
              <SheetTitle className="text-[15px]" style={{ color: "var(--text-primary)" }}>Filters</SheetTitle>
              <SheetDescription className="truncate text-[11px]" style={{ color: "var(--text-tertiary)" }}>
                {summary}
              </SheetDescription>
            </SheetHeader>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3">
              {typeButtons(true)}
              <div className="mt-3">{options}</div>
            </div>
            <div className="flex shrink-0 gap-2 border-t px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]" style={{ borderColor: "var(--border-1)" }}>
              <button
                type="button"
                onClick={clearAll}
                disabled={activeCount === 0}
                className="h-11 flex-1 rounded-lg border text-[13px] font-semibold disabled:opacity-40"
                style={{ borderColor: "var(--border-1)", color: "var(--text-secondary)" }}
              >
                Clear all
              </button>
              <SheetClose asChild>
                <button
                  type="button"
                  className="h-11 flex-1 rounded-lg text-[13px] font-semibold text-white"
                  style={{ background: "var(--accent)" }}
                >
                  Done
                </button>
              </SheetClose>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent
        align="start"
        className="z-200 w-[min(26rem,calc(100vw-1rem))] p-0"
        sideOffset={6}
        collisionPadding={12}
      >
        <div
          className="max-h-[min(var(--radix-popover-content-available-height),34rem)] overflow-y-auto rounded-xl border p-3 shadow-xl"
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
                {summary}
              </p>
            </div>
            {activeCount > 0 && (
              <button
                type="button"
                onClick={clearAll}
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
              {typeButtons(false)}
            </section>
            {options}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
