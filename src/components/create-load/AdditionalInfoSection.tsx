"use client"

import * as React from "react"
import { Globe, Lock } from "lucide-react"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Field } from "./FormField"
import { LoadAdditionalInfo } from "./types"

interface AdditionalInfoSectionProps {
  value: LoadAdditionalInfo
  onChange: (updated: LoadAdditionalInfo) => void
}

export function AdditionalInfoSection({ value, onChange }: AdditionalInfoSectionProps) {
  const set = (key: keyof LoadAdditionalInfo) => (
    e: React.ChangeEvent<HTMLTextAreaElement>
  ) => onChange({ ...value, [key]: e.target.value })

  const toggleVisibility = (checked: boolean) =>
    onChange({ ...value, visibility: checked ? "public" : "private" })

  return (
    <div className="space-y-4">
      <Field label="Load Notes">
        <Textarea
          placeholder="Any general notes about this load — handling requirements, access instructions, broker info…"
          value={value.notes}
          onChange={set("notes")}
          rows={3}
          maxLength={400}
          className="text-sm resize-none"
        />
        <p className="text-[11px] text-muted-foreground text-right mt-1">{value.notes.length}/400</p>
      </Field>

      <Field label="Carrier Instructions">
        <Textarea
          placeholder="Specific instructions for the carrier — required equipment, check-in process, contact on arrival…"
          value={value.instructions}
          onChange={set("instructions")}
          rows={3}
          maxLength={400}
          className="text-sm resize-none"
        />
        <p className="text-[11px] text-muted-foreground text-right mt-1">{value.instructions.length}/400</p>
      </Field>

      <div className="flex items-center justify-between rounded-md border border-border bg-muted/30 px-3 py-2.5">
        <div className="flex items-center gap-2">
          {value.visibility === "public" ? (
            <Globe className="size-4 text-green-500" />
          ) : (
            <Lock className="size-4 text-muted-foreground" />
          )}
          <div>
            <p className="text-xs font-medium text-foreground">
              {value.visibility === "public" ? "Visible on Load Board" : "Private — Not Listed"}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {value.visibility === "public"
                ? "Carriers can find and bid on this load"
                : "Only your organization can see this load"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-[11px] text-muted-foreground sr-only">
            Visibility
          </Label>
          <Switch
            checked={value.visibility === "public"}
            onCheckedChange={toggleVisibility}
            className="data-[state=checked]:bg-green-500"
          />
        </div>
      </div>
    </div>
  )
}
