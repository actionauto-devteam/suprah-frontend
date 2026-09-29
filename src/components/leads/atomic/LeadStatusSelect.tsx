"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import {
  LEAD_STATUS_CATEGORY_ORDER,
  LEAD_STATUS_CATEGORIES,
  LEAD_STATUS_CATEGORY_LABEL,
  getLeadStatusStyle,
} from "@/lib/leadStatus";

interface LeadStatusSelectProps {
  value: string;
  onChange: (status: string) => void;
  excludeCurrent?: boolean;
  triggerLabel?: React.ReactNode;
  triggerIcon?: React.ReactNode;
  triggerClassName?: string;
  align?: "start" | "end" | "center";
}

export function LeadStatusSelect({
  value,
  onChange,
  excludeCurrent = false,
  triggerLabel,
  triggerIcon,
  triggerClassName,
  align = "start",
}: LeadStatusSelectProps) {
  const [open, setOpen] = React.useState(false);
  const current = getLeadStatusStyle(value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex h-9 min-w-0 items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-2 text-[11px] font-medium text-slate-600 transition hover:border-emerald-500/40 hover:bg-emerald-500/[0.06] hover:text-emerald-700 dark:border-emerald-400/15 dark:text-slate-300 dark:hover:text-emerald-300 sm:h-7 sm:w-auto sm:shrink-0 sm:px-2.5 sm:text-[12px]",
            triggerClassName,
          )}
        >
          {triggerIcon ?? <span className={cn("h-2 w-2 shrink-0 rounded-full", current.dot)} />}
          <span className="truncate">{triggerLabel ?? current.label}</span>
          <ChevronsUpDown className="h-2.5 w-2.5 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent align={align} className="w-64 p-0">
        <Command>
          <CommandInput placeholder="Search status..." />
          <CommandList>
            <CommandEmpty>No status found.</CommandEmpty>
            {LEAD_STATUS_CATEGORY_ORDER.map((category) => {
              const statuses = LEAD_STATUS_CATEGORIES[category].filter(
                (status) => !excludeCurrent || status !== value,
              );
              if (statuses.length === 0) return null;
              return (
                <CommandGroup key={category} heading={LEAD_STATUS_CATEGORY_LABEL[category]}>
                  {statuses.map((status) => {
                    const style = getLeadStatusStyle(status);
                    return (
                      <CommandItem
                        key={status}
                        value={status}
                        onSelect={() => {
                          onChange(status);
                          setOpen(false);
                        }}
                        className="gap-2"
                      >
                        <span className={cn("h-2 w-2 shrink-0 rounded-full", style.dot)} />
                        <span className="flex-1 truncate">{style.label}</span>
                        {status === value && <Check className="h-3.5 w-3.5 shrink-0" />}
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              );
            })}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
