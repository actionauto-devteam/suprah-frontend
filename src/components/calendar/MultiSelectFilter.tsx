"use client";

import * as React from "react";
import { CheckIcon, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export type MultiSelectOption = { value: string; label: string };

/**
 * Generic multi-select filter for the Suprah Calendar toolbar. Visually
 * modeled on DataTableFacetedFilter (Popover + Command + checkbox rows +
 * badge count) but decoupled from @tanstack/react-table — plain
 * value/onChange instead of a table column. Used for the team, type, and
 * status filters so all three share one implementation. Empty selection
 * means "no filter" (shows `allLabel`).
 */
export function MultiSelectFilter({
  filterLabel,
  icon: Icon,
  allLabel,
  options,
  value,
  onChange,
  searchable = true,
  searchPlaceholder = "Search…",
  emptyLabel = "No results.",
  clearLabel,
}: {
  /** The filter's own name (e.g. "Team", "Type", "Status") — announced to
   * assistive tech regardless of the current selection, since the visible
   * button label switches to showing the selected option(s) instead. */
  filterLabel: string;
  icon: LucideIcon;
  allLabel: string;
  options: MultiSelectOption[];
  value: string[];
  onChange: (next: string[]) => void;
  searchable?: boolean;
  searchPlaceholder?: string;
  emptyLabel?: string;
  clearLabel?: string;
}) {
  const selected = new Set(value);
  const labelOf = (v: string) => options.find((o) => o.value === v)?.label ?? "Unknown";

  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange(Array.from(next));
  };

  const currentSelectionLabel =
    selected.size === 0
      ? allLabel
      : selected.size === 1
        ? labelOf(value[0])
        : `${selected.size} selected`;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          aria-label={`${filterLabel} filter: ${currentSelectionLabel}`}
          className="h-9 gap-1.5 rounded-lg border-border bg-background px-2 text-xs font-normal text-foreground hover:bg-accent"
        >
          <Icon className="h-3.5 w-3.5 text-muted-foreground" />
          {selected.size === 0 ? (
            allLabel
          ) : selected.size === 1 ? (
            labelOf(value[0])
          ) : (
            <>
              {selected.size} selected
              <Badge
                variant="secondary"
                className="ml-0.5 rounded-sm px-1 py-0 text-[9px] font-semibold"
              >
                {selected.size}
              </Badge>
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[220px] p-0" align="end">
        <Command>
          {searchable && <CommandInput placeholder={searchPlaceholder} />}
          <CommandList>
            <CommandEmpty>{emptyLabel}</CommandEmpty>
            <CommandGroup>
              {options.map((o) => {
                const isSelected = selected.has(o.value);
                return (
                  <CommandItem key={o.value} onSelect={() => toggle(o.value)}>
                    <div
                      className={cn(
                        "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                        isSelected
                          ? "bg-primary text-primary-foreground"
                          : "opacity-50 [&_svg]:invisible",
                      )}
                    >
                      <CheckIcon className="h-4 w-4" />
                    </div>
                    <span className="truncate">{o.label}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
            {selected.size > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem
                    onSelect={() => onChange([])}
                    className="justify-center text-center"
                  >
                    {clearLabel ?? `Clear — show ${allLabel.toLowerCase()}`}
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
