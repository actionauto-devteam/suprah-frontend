"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Loader2, Truck } from "lucide-react"
import { toast } from "sonner"
import { apiClient } from "@/lib/api-client"
import { userErrorMessage } from "@/lib/user-error"
import {
  inventoryVehicleFromApi,
  type InventoryVehicleRow,
  isSoldLeadStatus,
  leadQuoteCreatedMessage,
  leadQuoteInitialData,
} from "@/lib/lead-shipping"
import { useAuth } from "@/providers/AuthProvider"
import { Button } from "@/components/ui/button"
import type { Lead } from "@/types/lead"
import type { ShippingQuoteFormData, Vehicle } from "@/types/inventory"

const ShippingQuoteModal = React.lazy(() =>
  import("@/components/shipping-quote-modal").then((m) => ({ default: m.ShippingQuoteModal })),
)

/**
 * Transportation's part of a CRM lead's details: on leads in the Sold group,
 * "Create shipping quote" opens Transportation's quote window pre-filled from
 * the lead, and the new quote is linked to this lead. Staff stay on the lead.
 */
export function LeadShippingCard({ lead }: { lead: Lead & { address?: string } }) {
  const router = useRouter()
  const { getToken } = useAuth()
  const [open, setOpen] = React.useState(false)
  const [loadingCars, setLoadingCars] = React.useState(false)
  const [vehicles, setVehicles] = React.useState<Vehicle[]>([])
  const [defaultVehicle, setDefaultVehicle] = React.useState<Vehicle | null>(null)

  // Stable, so the window doesn't reset what staff typed on every render.
  const { firstName, lastName, email, phone, address } = lead
  const initialData = React.useMemo(
    () => leadQuoteInitialData({ firstName, lastName, email, phone, address }),
    [firstName, lastName, email, phone, address],
  )

  if (!isSoldLeadStatus(lead.status)) return null

  const authConfig = async () => {
    const token = await getToken()
    return token ? { headers: { Authorization: `Bearer ${token}` } } : {}
  }

  const openQuote = async () => {
    setLoadingCars(true)
    try {
      const res = await apiClient.get("/api/vehicles", {
        ...(await authConfig()),
        params: { status: "all", page: 1, limit: 1000 },
        timeout: 15_000,
      })
      const payload = res.data?.data ?? res.data
      const rows: InventoryVehicleRow[] = Array.isArray(payload?.vehicles) ? payload.vehicles : Array.isArray(payload) ? payload : []
      const list: Vehicle[] = rows.map(inventoryVehicleFromApi)
      setVehicles(list)
      setDefaultVehicle(lead.vehicleId ? list.find((car) => car.id === lead.vehicleId) ?? null : null)
      setOpen(true)
    } catch (err) {
      toast.error(userErrorMessage(err, "load your Inventory cars for this quote"))
    } finally {
      setLoadingCars(false)
    }
  }

  const createQuote = async (formData: ShippingQuoteFormData) => {
    try {
      const res = await apiClient.post(
        "/api/quotes",
        { ...formData, toZip: formData.zipCode, toAddress: formData.fullAddress, leadId: lead._id },
        await authConfig(),
      )
      const data = res.data?.data ?? res.data
      toast.success(leadQuoteCreatedMessage(data?.rate), {
        action: { label: "Open Quotes", onClick: () => router.push("/transportation?tab=drafts") },
      })
    } catch (err) {
      toast.error(userErrorMessage(err, "create this quote"))
      throw err // keeps the window open so staff can fix it and try again
    }
  }

  return (
    <div className="rounded-xl border border-border/60 bg-background/40 p-3">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <Truck className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
        Shipping
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Sold and shipping out? Create a shipping quote for this customer. You&apos;ll stay on this lead.
      </p>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="mt-2 min-h-9 w-full sm:w-auto"
        onClick={() => void openQuote()}
        disabled={loadingCars}
      >
        {loadingCars ? <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" /> : <Truck className="mr-2 size-4" aria-hidden="true" />}
        Create shipping quote
      </Button>
      {open && (
        <React.Suspense fallback={null}>
          <ShippingQuoteModal
            open={open}
            onOpenChange={setOpen}
            vehicles={vehicles}
            defaultVehicle={defaultVehicle}
            initialData={initialData}
            onCalculate={createQuote}
          />
        </React.Suspense>
      )}
    </div>
  )
}
