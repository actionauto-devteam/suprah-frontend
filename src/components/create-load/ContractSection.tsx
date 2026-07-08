"use client"

import * as React from "react"
import { ShieldCheck, PenLine } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Field } from "./FormField"
import { LoadContract } from "./types"

interface ContractSectionProps {
  value: LoadContract
  onChange: (updated: LoadContract) => void
}

export function ContractSection({ value, onChange }: ContractSectionProps) {
  return (
    <div className="space-y-4">
      {/* Terms & Conditions */}
      <div
        className={`rounded-md border px-3 py-3 transition-colors ${
          value.agreedToTerms
            ? "border-green-500/50 bg-green-500/5"
            : "border-border bg-muted/20"
        }`}
      >
        <div className="flex items-start gap-3">
          <Checkbox
            id="terms"
            checked={value.agreedToTerms}
            onCheckedChange={(checked) =>
              onChange({ ...value, agreedToTerms: checked === true })
            }
            className="mt-0.5 data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500"
          />
          <label htmlFor="terms" className="text-xs text-foreground cursor-pointer leading-relaxed">
            I agree to the{" "}
            <span className="text-green-600 dark:text-green-400 underline underline-offset-2 cursor-pointer">
              Terms &amp; Conditions
            </span>{" "}
            and confirm that the load information provided is accurate. I understand that
            posting false or misleading load information may result in account suspension.
          </label>
        </div>
      </div>

      {/* Digital Signature */}
      <Field label="Digital Signature" required icon={PenLine}>
        <div className="space-y-1.5">
          <Input
            placeholder="Type your full legal name to sign"
            value={value.signatureName}
            onChange={(e) => onChange({ ...value, signatureName: e.target.value })}
            maxLength={50}
            className="h-9 text-sm font-medium italic"
            disabled={!value.agreedToTerms}
          />
          {value.signatureName && value.agreedToTerms && (
            <div className="flex items-center gap-1.5 text-[10px] text-green-600 dark:text-green-400">
              <ShieldCheck className="size-3 shrink-0" />
              Signed as &ldquo;{value.signatureName}&rdquo; — {new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "America/Denver" })}
            </div>
          )}
          {!value.agreedToTerms && (
            <p className="text-[10px] text-muted-foreground">
              Accept the terms above to enable the signature field
            </p>
          )}
        </div>
      </Field>
    </div>
  )
}
