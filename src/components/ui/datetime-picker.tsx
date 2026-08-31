"use client"

import * as React from "react"
import { CalendarIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface DateTimePickerProps {
  /** Same shape a native <input type="datetime-local"> value has: "" | "YYYY-MM-DDTHH:mm" — a
   * drop-in replacement, so callers don't need to touch how the value is stored or submitted. */
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  minDate?: Date;
  className?: string;
  id?: string;
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function toValue(date: Date, time: string): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${time}`;
}

function to24Hour(hour12: number, period: "AM" | "PM"): number {
  if (period === "AM") return hour12 === 12 ? 0 : hour12;
  return hour12 === 12 ? 12 : hour12 + 12;
}

function to12Hour(hour24: number): { hour: number; period: "AM" | "PM" } {
  return { hour: hour24 % 12 || 12, period: hour24 >= 12 ? "PM" : "AM" };
}

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);

function TimeColumn({
  values,
  selected,
  onSelect,
  className,
}: {
  values: number[];
  selected: number;
  onSelect: (v: number) => void;
  className?: string;
}) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const selectedRef = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    const container = containerRef.current;
    const el = selectedRef.current;
    if (!container || !el) return;
    container.scrollTop = el.offsetTop - container.clientHeight / 2 + el.clientHeight / 2;
  }, [selected]);

  return (
    <div ref={containerRef} className={cn("h-56 w-14 shrink-0 overflow-y-auto border-l border-border/50", className)}>
      {values.map((v) => (
        <button
          key={v}
          type="button"
          ref={v === selected ? selectedRef : undefined}
          onClick={() => onSelect(v)}
          className={cn(
            "flex w-full items-center justify-center py-1.5 text-sm transition-colors",
            v === selected
              ? "bg-primary text-primary-foreground"
              : "text-foreground hover:bg-accent"
          )}
        >
          {pad(v)}
        </button>
      ))}
    </div>
  );
}

/**
 * A Popover+Calendar date/time picker to use in place of native <input type="datetime-local">
 * inside modals. The browser's own datetime-local picker is rendered by the OS/browser chrome
 * layer, not the page — it ignores the modal's stacking context and can render partially outside
 * the modal or clipped at the viewport edge, with no way for app CSS to reposition or contain it.
 * Its hour/minute spinners also start scrolled to the current selection rather than listing values
 * in order, which reads as a broken/out-of-sequence picker. This component renders entirely in-page
 * through Radix Popover (already used elsewhere in the design system — see date-picker.tsx), with
 * explicit Hour/Minute/AM-PM columns always listed 1→12 / 00→59, keeping the popup anchored to its
 * trigger and flipping/repositioning itself to stay inside the viewport automatically.
 */
export function DateTimePicker({
  value,
  onChange,
  disabled,
  placeholder = "Pick a date & time",
  minDate,
  className,
  id,
}: DateTimePickerProps) {
  const [datePart, timePart] = value ? value.split("T") : ["", ""];
  const selectedDate = datePart ? new Date(`${datePart}T00:00:00`) : undefined;
  const time = timePart || "09:00";
  const [h24, minute] = time.split(":").map(Number);
  const { hour: hour12, period } = to12Hour(h24);

  const commitTime = (nextHour12: number, nextMinute: number, nextPeriod: "AM" | "PM") => {
    const hour24 = to24Hour(nextHour12, nextPeriod);
    onChange(toValue(selectedDate ?? new Date(), `${pad(hour24)}:${pad(nextMinute)}`));
  };

  const handleSelectDate = (date: Date | undefined) => {
    if (!date) return;
    onChange(toValue(date, time));
  };

  const label = selectedDate
    ? `${selectedDate.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })} · ${pad(hour12)}:${pad(minute)} ${period}`
    : placeholder;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-start text-left font-normal",
            !selectedDate && "text-muted-foreground",
            className,
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
          <span className="truncate">{label}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto max-w-[calc(100vw-1.5rem)] p-0 z-300" align="start">
        <div className="flex flex-col sm:flex-row">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleSelectDate}
            disabled={minDate ? (d) => d < minDate : undefined}
            initialFocus
          />
          <div className="flex border-t border-border/50 sm:border-t-0">
            <TimeColumn values={HOURS} selected={hour12} onSelect={(v) => commitTime(v, minute, period)} className="border-l-0 sm:border-l" />
            <TimeColumn values={MINUTES} selected={minute} onSelect={(v) => commitTime(hour12, v, period)} />
            <div className="flex h-56 w-14 shrink-0 flex-col border-l border-border/50">
              {(["AM", "PM"] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => commitTime(hour12, minute, p)}
                  className={cn(
                    "flex-1 text-sm font-medium transition-colors",
                    p === period
                      ? "bg-primary text-primary-foreground"
                      : "text-foreground hover:bg-accent"
                  )}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
