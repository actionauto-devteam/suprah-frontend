"use client"

/**
 * The load page's Billing card (SuprahPay, 2026-11-25): who pays for the
 * load's shipping and how, its SuprahPay invoice, cash on delivery, and
 * whether the driver can be paid. Staff choose for an older load, switch a
 * customer load between SuprahPay and cash on delivery, or send the invoice
 * again. A car sold to the person receiving it (2026-11-26) shows the
 * dealership's invoice for the car, which staff can send again. The server
 * checks every change.
 */
import * as React from "react"
import { Banknote, Loader2, Receipt } from "lucide-react"
import { apiClient } from "@/lib/api-client"
import { toast } from "@/lib/readable-toast"
import { userErrorMessage } from "@/lib/user-error"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useSuprahPaySettings } from "@/hooks/useSuprahPay"
import { LoadBillingFields } from "@/components/transportation/LoadBillingFields"
import {
  BILLING_METHOD_LABEL,
  EMPTY_BILLING_INPUT,
  INVOICE_STATUS_LABEL,
  billingInputProblem,
  billingInputToSend,
  formatDollars,
  isCashMethod,
  type LoadBilling,
  type LoadBillingInput,
  type LoadBillingMethod,
  type LoadBillingSummary,
} from "@/lib/load-billing"

const money = (value: number | null | undefined) =>
  typeof value === "number" && Number.isFinite(value) ? formatDollars(value) : "—"

interface BillingLoad {
  _id: string
  status?: string
  quoteId?: string | null
  pricing?: { isPricingEnabled?: boolean; carrierPayAmount?: number | null }
  billing?: LoadBilling | null
  billingSummary?: LoadBillingSummary | null
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-0.5 sm:grid-cols-[180px_minmax(0,1fr)] sm:gap-3">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-sm text-foreground break-words">{children}</dd>
    </div>
  )
}

export function LoadBillingCard({ load, onChanged }: { load: BillingLoad; onChanged: () => void }) {
  const settings = useSuprahPaySettings()
  const billing = load.billing ?? null
  const summary = load.billingSummary ?? null
  const carrierPay =
    load.pricing?.isPricingEnabled === false || typeof load.pricing?.carrierPayAmount !== "number"
      ? null
      : load.pricing.carrierPayAmount
  const outside = load.pricing?.isPricingEnabled === false || !!billing?.outside
  const cancelled = load.status === "Cancelled"
  const invoice = summary?.invoice ?? null
  const paid = invoice?.status === "succeeded"
  const cashSettled = !!billing?.cashConfirmedAt
  const carInvoice = summary?.carInvoice ?? null
  const carSold = typeof billing?.vehiclePrice === "number" && billing.vehiclePrice > 0

  const [choosing, setChoosing] = React.useState(false)
  const [input, setInput] = React.useState<LoadBillingInput>(EMPTY_BILLING_INPUT)
  const [tried, setTried] = React.useState(false)
  const [saving, setSaving] = React.useState(false)

  if (!billing && !settings.data?.enabled) return null
  // Sending or cancelling invoices is for admins and staff with Finance access (decision B4).
  const canManage = !!settings.data?.canManagePayments

  const save = async (body: unknown, done: string) => {
    setSaving(true)
    try {
      await apiClient.put(`/api/loads/${encodeURIComponent(load._id)}/billing`, body)
      toast.success(done)
      setChoosing(false)
      setTried(false)
      onChanged()
    } catch (error) {
      toast.error(userErrorMessage(error, "save who pays for this load"))
    } finally {
      setSaving(false)
    }
  }

  // The car's invoice, sent again (it wasn't sent, or staff cancelled it).
  const sendCarInvoice = async () => {
    setSaving(true)
    try {
      await apiClient.post(`/api/loads/${encodeURIComponent(load._id)}/billing/car-invoice`, {})
      toast.success("The car's invoice was sent to the customer.")
      onChanged()
    } catch (error) {
      toast.error(userErrorMessage(error, "send the car's invoice"))
    } finally {
      setSaving(false)
    }
  }

  const problem = billingInputProblem(input, carrierPay)
  const submitChoice = () => {
    setTried(true)
    if (problem) return
    void save(billingInputToSend(input), "Saved. The shipping bill follows it.")
  }

  // A customer load can switch between SuprahPay and cash until it's paid or the cash is confirmed.
  const canSwitch = canManage && !!billing?.billTo && billing.billTo === "customer" && !outside && !cancelled && !paid && !cashSettled
  const switchTo = (method: LoadBillingMethod) => {
    // A customer load without a quote needs a shipping price for SuprahPay: ask for it.
    if (method === "suprahpay" && !load.quoteId && !billing?.shippingPrice) {
      setInput({ ...EMPTY_BILLING_INPUT, billTo: "customer", method, customerName: billing?.customerName ?? "", customerEmail: billing?.customerEmail ?? "" })
      setChoosing(true)
      return
    }
    return save(
      load.quoteId
        ? { method }
        : {
            billTo: "customer",
            method,
            customerName: billing?.customerName,
            customerEmail: billing?.customerEmail,
            shippingPrice: billing?.shippingPrice,
          },
      method === "suprahpay" ? "Switched to a SuprahPay invoice." : "Switched to cash to the driver on delivery.",
    )
  }
  const invoiceMissing =
    canManage && !!billing?.billTo && billing.method === "suprahpay" && !outside && !cancelled && (!invoice || invoice.status === "cancelled")
  const carInvoiceMissing = canManage && carSold && !outside && !cancelled && (!carInvoice || carInvoice.status === "cancelled")

  return (
    <Card className="border-border shadow-sm bg-card">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Receipt className="size-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" /> Billing
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {outside ? (
          <p className="text-sm text-muted-foreground break-words">
            Pricing was skipped, so this load is settled outside Suprah: your staff pay the driver directly.
          </p>
        ) : choosing ? (
            <div className="space-y-3">
              <LoadBillingFields value={input} onChange={setInput} carrierPay={carrierPay} idPrefix={`billing-${load._id}`} problem={tried ? problem : null} />
              <div className="flex flex-wrap gap-2">
                <Button size="sm" className="min-h-11 sm:min-h-9" onClick={submitChoice} disabled={saving}>
                  {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : null} Save
                </Button>
                <Button size="sm" variant="outline" className="min-h-11 sm:min-h-9" onClick={() => setChoosing(false)} disabled={saving}>Cancel</Button>
              </div>
            </div>
        ) : !billing?.billTo ? (
          cancelled ? (
            <p className="text-sm text-muted-foreground">This load was cancelled.</p>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground break-words">
                Who pays for this load&apos;s shipping hasn&apos;t been chosen yet. Choose it before paying the driver through SuprahPay.
              </p>
              {canManage ? (
                <Button size="sm" variant="outline" className="min-h-11 sm:min-h-9" onClick={() => setChoosing(true)}>Choose who pays</Button>
              ) : (
                <p className="text-xs text-muted-foreground">Your dealership&apos;s admins and staff with Finance access can choose it.</p>
              )}
            </div>
          )
        ) : (
          <dl className="space-y-2">
            <Row label="Who pays">
              {billing.billTo === "dealership"
                ? "Your dealership"
                : `${billing.customerName || "The customer"}${billing.customerEmail ? ` (${billing.customerEmail})` : ""}`}
            </Row>
            <Row label="How">{billing.method ? BILLING_METHOD_LABEL[billing.method] : "—"}</Row>
            {billing.billTo === "customer" && billing.method === "suprahpay" && (
              <Row label="Shipping price">{money(billing.shippingPrice)}</Row>
            )}
            <Row label="Driver's pay">{money(carrierPay)}</Row>
            {billing.method === "suprahpay" && (
              <Row label="SuprahPay invoice">
                {invoice
                  ? `${INVOICE_STATUS_LABEL[invoice.status] ?? invoice.status} · ${money(invoice.amount)}${invoice.invoiceNumber ? ` · ${invoice.invoiceNumber}` : ""}`
                  : "Not sent"}
              </Row>
            )}
            {isCashMethod(billing.method) && (
              <Row label="Cash">
                <span className="inline-flex flex-wrap items-center gap-x-1.5">
                  <Banknote className="size-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                  {billing.cashConfirmedAt
                    ? "The driver confirmed receiving it."
                    : billing.cashNotReceivedAt
                      ? "The driver said they weren't paid. Contact the customer."
                      : "Waiting for the driver to confirm."}
                  {billing.cashCustomerConfirmedAt ? " The customer confirmed paying." : ""}
                </span>
              </Row>
            )}
            {carSold && (
              <>
                <Row label="Car sold to">
                  {`${billing.customerName || "The customer"}${billing.customerEmail ? ` (${billing.customerEmail})` : ""}`}
                </Row>
                <Row label="Car's price">
                  {`${money(billing.vehiclePrice)} plus ${typeof billing.vehicleTaxRate === "number" ? billing.vehicleTaxRate : 0}% sales tax`}
                </Row>
                <Row label="Car invoice">
                  {carInvoice
                    ? `${INVOICE_STATUS_LABEL[carInvoice.status] ?? carInvoice.status} · ${money(carInvoice.amount)}${carInvoice.invoiceNumber ? ` · ${carInvoice.invoiceNumber}` : ""}`
                    : "Not sent"}
                </Row>
              </>
            )}
            {summary && load.status === "Delivered" && (
              <Row label="Paying the driver">
                {summary.driverPay.ok ? `Ready: ${money(summary.driverPay.amount)} through SuprahPay.` : summary.driverPay.message}
              </Row>
            )}
          </dl>
        )}

        {!choosing && (canSwitch || invoiceMissing || carInvoiceMissing) && (
          <div className="flex flex-wrap gap-2 border-t border-border pt-3">
            {invoiceMissing && (
              <Button
                size="sm"
                variant="outline"
                className="min-h-11 sm:min-h-9"
                disabled={saving}
                onClick={() =>
                  save(
                    load.quoteId && billing?.billTo === "customer"
                      ? { method: "suprahpay" }
                      : billing?.billTo === "dealership"
                        ? { billTo: "dealership", method: "suprahpay" }
                        : { billTo: "customer", method: "suprahpay", customerName: billing?.customerName, customerEmail: billing?.customerEmail, shippingPrice: billing?.shippingPrice },
                    "The shipping invoice was sent.",
                  )
                }
              >
                Send the invoice
              </Button>
            )}
            {canSwitch && billing?.method !== "suprahpay" && (
              <Button size="sm" variant="outline" className="min-h-11 sm:min-h-9" disabled={saving} onClick={() => switchTo("suprahpay")}>Switch to a SuprahPay invoice</Button>
            )}
            {/* Cash is on delivery only (2026-11-26). */}
            {canSwitch && billing?.method === "suprahpay" && (
              <Button size="sm" variant="outline" className="min-h-11 sm:min-h-9" disabled={saving} onClick={() => switchTo("cod")}>Switch to cash on delivery (COD)</Button>
            )}
            {carInvoiceMissing && (
              <Button size="sm" variant="outline" className="min-h-11 sm:min-h-9" disabled={saving} onClick={() => void sendCarInvoice()}>
                Send the car invoice
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
