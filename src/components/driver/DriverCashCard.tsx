"use client"

/**
 * Cash on delivery loads (SuprahPay, 2026-11-25; COD only since 2026-11-26):
 * the customer pays the driver their pay in cash on delivery, outside Suprah. The
 * driver confirms it here, which settles it, or says they weren't paid
 * (their dispatcher and the dealership are told). The server checks it all.
 */
import * as React from "react"
import { Banknote, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { apiClient } from "@/lib/api-client"
import { userErrorMessage } from "@/lib/user-error"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

interface CashLoad {
  _id: string
  status?: string
  pricing?: { carrierPayAmount?: number | null; isVisibleToDriver?: boolean }
  billing?: {
    method?: string
    cashConfirmedAt?: string | null
    cashNotReceivedAt?: string | null
  } | null
}


export function DriverCashCard({ load, onChanged }: { load: CashLoad; onChanged: () => void }) {
  const [saving, setSaving] = React.useState<boolean | null>(null)
  const method = load.billing?.method
  // "cop" is only on loads saved while testing: treated as cash on delivery.
  if (method !== "cod" && method !== "cop") return null

  const pay = load.pricing?.isVisibleToDriver !== false && typeof load.pricing?.carrierPayAmount === "number"
    ? `$${load.pricing.carrierPayAmount.toFixed(2)}`
    : "your pay"
  const due = load.status === "Delivered"
  const confirmed = !!load.billing?.cashConfirmedAt
  const notPaid = !!load.billing?.cashNotReceivedAt

  const answer = async (received: boolean) => {
    setSaving(received)
    try {
      const res = await apiClient.post(`/api/driver-tracking/loads/${encodeURIComponent(load._id)}/cash`, { received })
      toast.success((res.data as { message?: string })?.message || "Saved.")
      onChanged()
    } catch (error) {
      toast.error(userErrorMessage(error, "save the cash payment"))
    } finally {
      setSaving(null)
    }
  }

  return (
    <Card className="border-border/20 rounded-2xl overflow-hidden">
      <div className="p-4 border-b border-border/10">
        <div className="flex items-center gap-2">
          <Banknote className="size-4 text-emerald-500" aria-hidden="true" />
          <h3 className="text-sm font-black uppercase tracking-wider">Cash payment</h3>
        </div>
      </div>
      <CardContent className="p-4 space-y-3">
        <p className="text-sm text-foreground break-words">
          The customer pays you {pay} in cash on delivery (COD). Suprah doesn&apos;t send a payout for this load.
        </p>
        {confirmed ? (
          <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">You confirmed receiving the cash.</p>
        ) : !due ? (
          <p className="text-xs text-muted-foreground">Confirm it here once the car is delivered.</p>
        ) : (
          <>
            {notPaid && (
              <p className="text-xs leading-relaxed text-amber-700 dark:text-amber-400 break-words">
                You said you weren&apos;t paid, and your dispatcher was told. If the customer pays you later, confirm it here.
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <Button size="sm" className="min-h-11 flex-1" disabled={saving !== null} onClick={() => answer(true)}>
                {saving === true ? <Loader2 className="mr-2 size-4 animate-spin" /> : null} I received {pay}
              </Button>
              {!notPaid && (
                <Button size="sm" variant="outline" className="min-h-11 flex-1" disabled={saving !== null} onClick={() => answer(false)}>
                  {saving === false ? <Loader2 className="mr-2 size-4 animate-spin" /> : null} I wasn&apos;t paid
                </Button>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
