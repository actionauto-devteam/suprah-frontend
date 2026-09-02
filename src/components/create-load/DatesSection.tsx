"use client"

import * as React from "react"
import { Calendar } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Field, FieldRow } from "./FormField"
import { FieldError } from "./FieldError"
import { LoadDates } from "./types"
import { mountainTodayDateKey } from "@/utils/calendar.utils"

interface DatesSectionProps {
  value: LoadDates
  onChange: (updated: LoadDates) => void
  errors?: Record<string, string>
}

export function DatesSection({ value, onChange, errors = {} }: DatesSectionProps) {
  const set = (key: keyof LoadDates) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => onChange({ ...value, [key]: e.target.value })

  const today = mountainTodayDateKey()

  return (
    <div className="space-y-3">
      <FieldRow>
        <Field label="First Available Date" required icon={Calendar}>
          <Input 
            type="date" 
            value={value.firstAvailable} 
            onChange={set("firstAvailable")} 
            min={today}
            className={`h-9 text-sm ${errors.firstAvailable ? "border-destructive focus-visible:ring-destructive/20" : ""}`} 
          />
          <FieldError error={errors.firstAvailable} />
        </Field>
        <Field label="Pickup Deadline" icon={Calendar}>
          <Input 
            type="date" 
            value={value.pickupDeadline} 
            onChange={set("pickupDeadline")} 
            min={value.firstAvailable || today}
            className={`h-9 text-sm ${errors.pickupDeadline ? "border-destructive focus-visible:ring-destructive/20" : ""}`} 
          />
          <FieldError error={errors.pickupDeadline} />
        </Field>
      </FieldRow>

      <Field label="Delivery Deadline" icon={Calendar}>
        <Input 
          type="date" 
          value={value.deliveryDeadline} 
          onChange={set("deliveryDeadline")} 
          min={value.firstAvailable || today}
          className={`h-9 text-sm ${errors.deliveryDeadline ? "border-destructive focus-visible:ring-destructive/20" : ""}`} 
        />
        <FieldError error={errors.deliveryDeadline} />
      </Field>

      <Field label="Date Notes">
        <Textarea
          placeholder="Flexible on pickup window, must deliver before weekend…"
          value={value.notes}
          onChange={set("notes")}
          rows={2}
          className={`text-sm resize-none ${errors.notes ? "border-destructive focus-visible:ring-destructive/20" : ""}`}
        />
        <FieldError error={errors.notes} />
      </Field>
    </div>
  )
}