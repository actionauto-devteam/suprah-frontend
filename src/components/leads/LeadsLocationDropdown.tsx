"use client";

import * as React from "react";
import { Check, ChevronDown, MapPin, Search } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export interface LeadLocationOption {
  key: string | null;
  label: string;
}

interface LeadsLocationDropdownProps {
  value: string | null;
  options: LeadLocationOption[];
  counts: Record<string, number>;
  onChange: (value: string | null) => void;
}

export function LeadsLocationDropdown({
  value,
  options,
  counts,
  onChange,
}: LeadsLocationDropdownProps) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const selected = options.find((option) => option.key === value) || options[0];
  const filtered = options.filter((option) =>
    option.label.toLowerCase().includes(query.trim().toLowerCase()),
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="ss4-pill-btn flex h-8 min-w-8 max-w-[11rem] items-center justify-center gap-1.5 px-2 text-[12px] font-medium transition-all sm:max-w-[14rem] sm:px-2.5"
          title={selected?.label || "All Locations"}
          aria-label="Filter by location"
        >
          <MapPin className="h-3.5 w-3.5 shrink-0 sm:h-3 sm:w-3" />
          <span className="hidden min-w-0 truncate sm:inline">
            {selected?.label || "All Locations"}
          </span>
          <ChevronDown className="hidden h-3 w-3 shrink-0 sm:block" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="z-200 w-[min(22rem,calc(100vw-1rem))] p-0"
        sideOffset={6}
      >
        <div
          className="max-h-[min(80dvh,28rem)] overflow-hidden rounded-xl border p-2 shadow-xl"
          style={{
            background: "var(--bg-elevated)",
            borderColor: "var(--border-1)",
            color: "var(--text-primary)",
          }}
        >
          <label className="relative block">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2"
              style={{ color: "var(--text-tertiary)" }}
            />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search locations"
              className="h-9 w-full rounded-lg pl-9 pr-3 text-[13px] outline-none"
              style={{
                background: "var(--input-bg)",
                border: "1px solid var(--input-border)",
                color: "var(--text-primary)",
              }}
            />
          </label>
          <div className="mt-2 max-h-[calc(min(80dvh,28rem)-3.75rem)] overflow-y-auto pr-0.5">
            {filtered.length === 0 ? (
              <p className="px-3 py-6 text-center text-[12px]" style={{ color: "var(--text-tertiary)" }}>
                No locations found.
              </p>
            ) : (
              filtered.map((option) => {
                const selectedOption = option.key === value;
                const count = option.key ? counts[option.key] : undefined;
                return (
                  <button
                    key={option.key || "all"}
                    type="button"
                    onClick={() => {
                      onChange(option.key);
                      setOpen(false);
                    }}
                    className={cn(
                      "flex min-h-10 w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[13px] font-medium transition",
                      selectedOption && "ring-1",
                    )}
                    style={{
                      background: selectedOption ? "var(--accent-muted)" : "transparent",
                      color: selectedOption ? "var(--accent-text)" : "var(--text-secondary)",
                    }}
                  >
                    <Check className={cn("h-3.5 w-3.5 shrink-0", !selectedOption && "opacity-0")} />
                    <span className="min-w-0 flex-1 truncate">{option.label}</span>
                    {typeof count === "number" && (
                      <span className="shrink-0 rounded-full px-1.5 text-[10px] leading-4" style={{ background: "var(--input-bg)", color: "var(--text-tertiary)" }}>
                        {count}
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
