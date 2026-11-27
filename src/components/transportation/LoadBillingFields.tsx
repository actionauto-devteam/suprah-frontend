"use client"

/**
 * "Who pays for shipping?" (SuprahPay, 2026-11-25): a customer (name, email,
 * and either a SuprahPay invoice at a shipping price, or cash to the driver on
 * delivery) or the dealership (billed the driver's pay through SuprahPay).
 * Used in Create Load and on the load page for older loads.
 *
 * 2026-11-26: no cash at pickup (the customer collecting the car at the
 * dealership means there's no shipment). When the car is sold to the person
 * receiving it, the car's price and sales tax are asked too: the dealership
 * sends that customer a SuprahPay invoice for the car, separate from shipping.
 */
import * as React from "react"
import { cn } from "@/lib/utils"
import { BILLING_METHOD_LABEL, formatDollars, vehicleInvoiceTotal, type LoadBillingInput } from "@/lib/load-billing"

const inputClass =
  "h-11 w-full min-w-0 rounded-lg border border-border/60 bg-background/40 px-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50"

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

function CustomerFields({
  value,
  set,
  idPrefix,
}: {
  value: LoadBillingInput
  set: (patch: Partial<LoadBillingInput>) => void
  idPrefix: string
}) {
  return (
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
  )
}

export function LoadBillingFields({
  value,
  onChange,
  carrierPay,
  idPrefix = "load-billing",
  problem,
  soldToReceiver = false,
  defaultTaxRate = 0,
}: {
  value: LoadBillingInput
  onChange: (next: LoadBillingInput) => void
  /** The driver's pay entered on the load, if any. */
  carrierPay: number | null
  idPrefix?: string
  /** Shown under the fields when the choice can't be saved. */
  problem?: string | null
  /** Create Load's "the car is sold to the person receiving it": asks the car's price and sales tax. */
  soldToReceiver?: boolean
  /** The dealership's sales tax, used when no tax is entered for the car. */
  defaultTaxRate?: number
}) {
  const set = (patch: Partial<LoadBillingInput>) => onChange({ ...value, ...patch })
  const pay = carrierPay !== null && carrierPay > 0 ? formatDollars(carrierPay) : "the driver's pay"
  const problemId = `${idPrefix}-problem`
  const carTotal = soldToReceiver ? vehicleInvoiceTotal(value.vehiclePrice, value.vehicleTaxRate, defaultTaxRate) : null
  const carTax = value.vehicleTaxRate.trim() ? Number(value.vehicleTaxRate.trim()) : defaultTaxRate

  return (
    <fieldset className="min-w-0 space-y-3" aria-describedby={problem ? problemId : undefined}>
      <legend className="text-xs font-semibold text-foreground">Who pays for shipping?</legend>
      <div className="grid gap-2 sm:grid-cols-2">
        <Choice
          name={`${idPrefix}-bill-to`}
          checked={value.billTo === "customer"}
          onChange={() => set({ billTo: "customer" })}
          title="For a customer"
          detail="The customer pays: through a SuprahPay invoice, or in cash to the driver on delivery."
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
          <CustomerFields value={value} set={set} idPrefix={idPrefix} />

          <div className="space-y-2">
            <p className="text-xs font-medium text-foreground">How the customer pays for shipping</p>
            <div className="grid gap-2">
              <Choice
                name={`${idPrefix}-method`}
                checked={value.method === "suprahpay"}
                onChange={() => set({ method: "suprahpay" })}
                title={BILLING_METHOD_LABEL.suprahpay}
                detail="Suprah sends the customer a SuprahPay invoice for the shipping price. The driver is paid once it's paid and the load is delivered."
              />
              <Choice
                name={`${idPrefix}-method`}
                checked={value.method === "cod"}
                onChange={() => set({ method: "cod" })}
                title={BILLING_METHOD_LABEL.cod}
                detail={`The customer hands the driver ${pay} in cash when the car is delivered, outside Suprah. The driver confirms it in the app.`}
              />
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

      {soldToReceiver && value.billTo && (
        <fieldset className="min-w-0 space-y-3 rounded-lg border border-border/60 p-3">
          <legend className="px-1 text-xs font-semibold text-foreground">The car&apos;s sale</legend>
          <p className="text-xs leading-relaxed text-muted-foreground break-words">
            The car is sold to the person receiving it, so your dealership sends them a SuprahPay invoice for the car&apos;s price plus sales tax, by card, Apple Pay or Google Pay. It&apos;s separate from the shipping.
            {value.billTo === "customer" ? " It goes to the customer above." : ""}
          </p>
          {value.billTo === "dealership" && <CustomerFields value={value} set={set} idPrefix={`${idPrefix}-buyer`} />}
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block min-w-0">
              <span className="mb-1 block text-xs font-medium text-foreground">Car&apos;s price (USD)</span>
              <input
                id={`${idPrefix}-car-price`}
                className={inputClass}
                type="number"
                min={0.01}
                step="0.01"
                inputMode="decimal"
                value={value.vehiclePrice}
                onChange={(e) => set({ vehiclePrice: e.target.value })}
              />
            </label>
            <label className="block min-w-0">
              <span className="mb-1 block text-xs font-medium text-foreground">Sales tax (%)</span>
              <input
                id={`${idPrefix}-car-tax`}
                className={inputClass}
                type="number"
                min={0}
                max={100}
                step="0.001"
                inputMode="decimal"
                placeholder={String(defaultTaxRate)}
                value={value.vehicleTaxRate}
                onChange={(e) => set({ vehicleTaxRate: e.target.value })}
                aria-describedby={`${idPrefix}-car-tax-hint`}
              />
              <span id={`${idPrefix}-car-tax-hint`} className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                Leave it blank for your dealership&apos;s sales tax ({defaultTaxRate}%). Enter 0 for none.
              </span>
            </label>
          </div>
          {carTotal !== null && (
            <p className="text-sm font-semibold text-foreground break-words" aria-live="polite">
              The customer&apos;s car invoice: {formatDollars(carTotal)} ({formatDollars(Number(value.vehiclePrice))} plus {carTax}% sales tax)
            </p>
          )}
        </fieldset>
      )}

      {problem && (
        <p id={problemId} role="alert" className="text-xs font-medium text-red-600 dark:text-red-400 break-words">
          {problem}
        </p>
      )}
    </fieldset>
  )
}
