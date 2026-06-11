"use client"

import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface DatePickerProps {
  value?: Date;
  onChange: (date: Date | undefined) => void;
  disabled?: boolean;
  placeholder?: string;
  disablePastDates?: boolean;
  disabledDates?: (date: Date) => boolean;
}

export function DatePicker({
  value,
  onChange,
  disabled,
  placeholder = "Pick a date",
  disablePastDates = true,
  disabledDates,
}: DatePickerProps) {
  const disabledMatcher = React.useMemo(() => {
    const matchers: ((d: Date) => boolean)[] = [];
    if (disablePastDates) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      matchers.push((d) => d < today);
    }
    if (disabledDates) matchers.push(disabledDates);
    if (matchers.length === 0) return undefined;
    return (d: Date) => matchers.some((fn) => fn(d));
  }, [disablePastDates, disabledDates]);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-start text-left font-normal",
            !value && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {value ? format(value, "PPP") : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 z-300" align="start">
        <Calendar
          mode="single"
          selected={value}
          onSelect={onChange}
          disabled={disabledMatcher}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}
