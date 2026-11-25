"use client"

/**
 * "Who pays for shipping?" (SuprahPay, 2026-11-25): a customer (name, email,
 * and either a SuprahPay invoice at a shipping price, or cash to the driver at
 * pickup or delivery) or the dealership (billed the driver's pay through
 * SuprahPay). Used in Create Load and on the load page for older loads.
 */
import * as React from "react"
import { cn } from "@/lib/utils"
import { BILLING_METHOD_LABEL, type LoadBillingInput, type LoadBillingMethod } from "@/lib/load-billing"

const inputClass =
  "h-10 w-full min-w-0 rounded-lg border border-border/60 bg-background/40 px-3 text-sm placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50"

function Choice({
  name,
  checked,
  onChange,
  title,
  detail,
}: {
  name: string
  checked: boolean
  onChange: () => void
  title: string
  detail: string
}) {
  return (
    <label
      className={cn(
        "flex min-w-0 cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors",
        checked ? "border-emerald-500/60 bg-emerald-500/5" : "border-border/60 hover:bg-muted/40",
      )}
    >
      <input type="radio" name={name} checked={checked} onChange={onChange} className="mt-1 size-4 shrink-0 accent-emerald-600" />
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-foreground">{title}</span>
        <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground break-words">{detail}</span>
      </span>
    </label>
  )
}

export function LoadBillingFields({
  value,
  onChange,
  carrierPay,
  idPrefix = "load-billing",
  problem,
}: {
  value: LoadBillingInput
  onChange: (next: LoadBillingInput) => void
  /** The driver's pay entered on the load, if any. */
  carrierPay: number | null
  idPrefix?: string
  /** Shown under the fields when the choice can't be saved. */
  problem?: string | null
}) {
  const set = (patch: Partial<LoadBillingInput>) => onChange({ ...value, ...patch })
  const pay = carrierPay !== null && carrierPay > 0 ? `$${carrierPay.toFixed(2)}` : "the driver's pay"
  const problemId = `${idPrefix}-problem`

  return (
    <fieldset className="min-w-0 space-y-3" aria-describedby={problem ? problemId : undefined}>
      <legend className="text-xs font-semibold text-foreground">Who pays for shipping?</legend>
      <div className="grid gap-2 sm:grid-cols-2">
        <Choice
          name={`${idPrefix}-bill-to`}
          checked={value.billTo === "customer"}
          onChange={() => set({ billTo: "customer" })}
          title="For a customer"
          detail="The customer pays: through a SuprahPay invoice, or in cash to the driver."
        />
        <Choice
          name={`${idPrefix}-bill-to`}
          checked={value.billTo === "dealership"}
          onChange={() => set({ billTo: "dealership" })}
          title="For the dealership"
          detail={`Suprah sends your dealership a SuprahPay bill for ${pay}. The driver is paid once it's paid and the load is delivered.`}
        />
      </div>

      {value.billTo === "customer" && (
        <div className="space-y-3 rounded-lg border border-border/60 p-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block min-w-0">
              <span className="mb-1 block text-xs font-medium text-foreground">Customer&apos;s name</span>
              <input
                id={`${idPrefix}-name`}
                className={inputClass}
                value={value.customerName}
                onChange={(e) => set({ customerName: e.target.value })}
                maxLength={200}
                autoComplete="off"
              />
            </label>
            <label className="block min-w-0">
              <span className="mb-1 block text-xs font-medium text-foreground">Customer&apos;s email</span>
              <input
                id={`${idPrefix}-email`}
                className={inputClass}
                type="email"
                inputMode="email"
                value={value.customerEmail}
                onChange={(e) => set({ customerEmail: e.target.value })}
                maxLength={254}
                autoComplete="off"
              />
            </label>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium text-foreground">How the customer pays</p>
            <div className="grid gap-2">
              {(["suprahpay", "cop", "cod"] as LoadBillingMethod[]).map((method) => (
                <Choice
                  key={method}
                  name={`${idPrefix}-method`}
                  checked={value.method === method}
                  onChange={() => set({ method })}
                  title={BILLING_METHOD_LABEL[method]}
                  detail={
                    method === "suprahpay"
                      ? "Suprah sends the customer a SuprahPay invoice for the shipping price. The driver is paid once it's paid and the load is delivered."
                      : `The customer hands the driver ${pay} in cash, outside Suprah. The driver confirms it in the app.`
                  }
                />
              ))}
            </div>
          </div>

          {value.method === "suprahpay" && (
            <label className="block min-w-0">
              <span className="mb-1 block text-xs font-medium text-foreground">Shipping price the customer pays (USD)</span>
              <input
                id={`${idPrefix}-price`}
                className={inputClass}
                type="number"
                min={0.01}
                step="0.01"
                inputMode="decimal"
                value={value.shippingPrice}
                onChange={(e) => set({ shippingPrice: e.target.value })}
              />
              <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                No tax or fee is added. It can&apos;t be less than the driver&apos;s pay ({pay}).
              </span>
            </label>
          )}
        </div>
      )}

      {problem && (
        <p id={problemId} role="alert" className="text-xs font-medium text-red-600 dark:text-red-400 break-words">
          {problem}
        </p>
      )}
    </fieldset>
  )
}
