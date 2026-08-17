"use client"

import * as React from "react"
import { Clock } from "lucide-react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

interface TimePickerProps {
  value?: string;
  onChange: (time: string) => void;
  disabled?: boolean;
  placeholder?: string;
  format?: "iso" | "time";
  className?: string;
}

/**
 * Was a custom popover (a button trigger + separate Hour/Minute <select> dropdowns + AM/PM
 * buttons) with no way to just type the time — every change required opening the popover and
 * clicking through three separate controls. A native <input type="time"> supports direct
 * keyboard entry (type digits, they advance through hour/minute/period automatically) AND
 * still gives a built-in picker via its clock icon, so it covers both without a custom widget
 * to maintain.
 */
export function TimePicker({
  value,
  onChange,
  disabled,
  placeholder = "Select time",
  format = "iso",
  className,
}: TimePickerProps) {
  // Native <input type="time"> only understands "HH:MM" (24-hour) — convert whatever shape
  // `value` currently is into that for display.
  const timeInputValue = React.useMemo(() => {
    if (!value) return "";
    if (format === "time") return value;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return `${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`;
  }, [value, format]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value; // "" while mid-edit (e.g. hour typed, minute not yet) or a full "HH:MM"
    if (!next) return;

    if (format === "time") {
      onChange(next);
      return;
    }

    const [h, m] = next.split(":").map(Number);
    const existing = value ? new Date(value) : null;
    const date = existing && !Number.isNaN(existing.getTime()) ? existing : new Date();
    date.setHours(h, m, 0, 0);
    onChange(date.toISOString());
  };

  return (
    <div className="relative">
      <Clock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="time"
        value={timeInputValue}
        onChange={handleChange}
        disabled={disabled}
        aria-label={placeholder}
        className={cn("pl-9", className)}
      />
    </div>
  );
}
