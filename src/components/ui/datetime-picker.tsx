"use client"

import * as React from "react"
import { CalendarIcon, Clock } from "lucide-react"
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
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function toValue(date: Date, time: string): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${time}`;
}

/**
 * A Popover+Calendar date/time picker to use in place of native <input type="datetime-local">
 * inside modals. The browser's own datetime-local picker is rendered by the OS/browser chrome
 * layer, not the page — it ignores the modal's stacking context and can render partially outside
 * the modal or clipped at the viewport edge, with no way for app CSS to reposition or contain it.
 * This component renders entirely in-page through Radix Popover (already used elsewhere in the
 * design system — see date-picker.tsx), which keeps the popup anchored to its trigger and flips/
 * repositions itself to stay inside the viewport automatically.
 */
export function DateTimePicker({
  value,
  onChange,
  disabled,
  placeholder = "Pick a date & time",
  minDate,
  className,
}: DateTimePickerProps) {
  const [datePart, timePart] = value ? value.split("T") : ["", ""];
  const selectedDate = datePart ? new Date(`${datePart}T00:00:00`) : undefined;
  const time = timePart || "09:00";

  const handleSelectDate = (date: Date | undefined) => {
    if (!date) return;
    onChange(toValue(date, time));
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextTime = e.target.value || "09:00";
    onChange(toValue(selectedDate ?? new Date(), nextTime));
  };

  const label = selectedDate
    ? `${selectedDate.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })} · ${time}`
    : placeholder;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
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
      <PopoverContent className="w-auto p-0 z-300" align="start">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={handleSelectDate}
          disabled={minDate ? (d) => d < minDate : undefined}
          initialFocus
        />
        <div className="flex items-center gap-2 border-t border-border/50 px-3 py-2.5">
          <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <input
            type="time"
            value={time}
            onChange={handleTimeChange}
            className="flex-1 bg-transparent text-sm outline-none"
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}
