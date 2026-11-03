"use client"

import { BadgeCheck, RotateCcw } from "lucide-react"
import { cn } from "@/lib/utils"

interface SoldOnDeliveryQuestionProps {
  /** null until Dispatch answers. */
  value: boolean | null
  onChange: (value: boolean) => void
  /** A load made from a customer's quote is always a sale. */
  fromQuote?: boolean
  error?: string
}

const OPTIONS = [
  {
    value: true,
    title: "Yes, it's sold to them",
    detail: "The car is marked Sold in Inventory when it's delivered.",
    icon: BadgeCheck,
  },
  {
    value: false,
    title: "No, it comes back on sale",
    detail: "For moves like a lot transfer, recon or an auction. The car goes back to Ready for Sale when it's delivered.",
    icon: RotateCcw,
  },
] as const

/**
 * Create Managed Load asks whether the car is sold to the person receiving
 * it: Yes marks the Inventory car Sold at delivery, No puts it back on sale.
 */
export function SoldOnDeliveryQuestion({ value, onChange, fromQuote, error }: SoldOnDeliveryQuestionProps) {
  if (fromQuote) {
    return (
      <p className="rounded-xl border border-emerald-500/25 bg-emerald-500/8 p-3 text-xs text-foreground">
        This load is from a customer&apos;s shipping quote, so the car is marked Sold in Inventory when it&apos;s delivered.
      </p>
    )
  }

  return (
    <div className="space-y-2">
      <p id="sold-on-delivery-label" className="text-sm font-semibold text-foreground">
        Is this car sold to the person receiving it?
      </p>
      <div role="radiogroup" aria-labelledby="sold-on-delivery-label" className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {OPTIONS.map((option) => {
          const selected = value === option.value
          const Icon = option.icon
          return (
            <button
              key={String(option.value)}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(option.value)}
              className={cn(
                "flex min-h-11 items-start gap-3 rounded-xl border p-3 text-left transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50",
                selected
                  ? "border-emerald-500/40 bg-emerald-500/10"
                  : "border-border/60 bg-background/40 hover:border-emerald-500/25",
              )}
            >
              <Icon
                className={cn("mt-0.5 size-4 shrink-0", selected ? "text-emerald-500" : "text-muted-foreground")}
                aria-hidden="true"
              />
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-foreground">{option.title}</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">{option.detail}</span>
              </span>
            </button>
          )
        })}
      </div>
      <p className="text-xs text-muted-foreground">This only changes cars that are in your Inventory.</p>
      {error ? (
        <p role="alert" className="text-xs font-medium text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  )
}
