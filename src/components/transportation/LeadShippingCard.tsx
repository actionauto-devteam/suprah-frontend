"use client"

import * as React from "react"
import Link from "next/link"
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
  quotePriceWords,
  quoteStatusWords,
  type LeadShipment,
} from "@/lib/lead-shipping"
import { loadStatusWords } from "@/lib/vehicle-shipping"
import { useAuth } from "@/providers/AuthProvider"
import { Button } from "@/components/ui/button"
import type { Lead } from "@/types/lead"
import type { ShippingQuoteFormData, Vehicle } from "@/types/inventory"

const ShippingQuoteModal = React.lazy(() =>
  import("@/components/shipping-quote-modal").then((m) => ({ default: m.ShippingQuoteModal })),
)

/**
 * Transportation's part of a CRM lead's details: the lead's shipping quotes
 * and the load each became, and on leads in the Sold group "Create shipping
 * quote", which opens Transportation's quote window pre-filled from the lead.
 * The new quote is linked to this lead and staff stay on the lead.
 */
export function LeadShippingCard({ lead }: { lead: Lead & { address?: string } }) {
  const router = useRouter()
  const { getToken } = useAuth()
  const [open, setOpen] = React.useState(false)
  const [loadingCars, setLoadingCars] = React.useState(false)
  const [vehicles, setVehicles] = React.useState<Vehicle[]>([])
  const [defaultVehicle, setDefaultVehicle] = React.useState<Vehicle | null>(null)
  const [shipments, setShipments] = React.useState<LeadShipment[] | null>(null)
  const [listFailed, setListFailed] = React.useState(false)

  // Stable, so the window doesn't reset what staff typed on every render.
  const { firstName, lastName, email, phone, address } = lead
  const initialData = React.useMemo(
    () => leadQuoteInitialData({ firstName, lastName, email, phone, address }),
    [firstName, lastName, email, phone, address],
  )

  const authConfig = React.useCallback(async () => {
    const token = await getToken()
    return token ? { headers: { Authorization: `Bearer ${token}` } } : {}
  }, [getToken])

  const leadId = lead._id
  const loadShipments = React.useCallback(
    async (signal?: AbortSignal) => {
      try {
        const res = await apiClient.get(`/api/quotes/for-lead/${encodeURIComponent(leadId)}`, { ...(await authConfig()), signal })
        const data = res.data?.data ?? res.data
        setShipments(Array.isArray(data) ? (data as LeadShipment[]) : [])
        setListFailed(false)
      } catch (err) {
        if (signal?.aborted) return
        console.warn("Could not load this lead's shipping quotes", err)
        setListFailed(true)
      }
    },
    [authConfig, leadId],
  )

  React.useEffect(() => {
    const controller = new AbortController()
    setShipments(null)
    setListFailed(false)
    void loadShipments(controller.signal)
    return () => controller.abort()
  }, [loadShipments])

  const sold = isSoldLeadStatus(lead.status)
  const hasShipments = Boolean(shipments && shipments.length > 0)
  // Nothing to show on a lead that isn't sold and has no quotes.
  if (!sold && !hasShipments) return null

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
      const list: Vehicle[] = rows.map((row) => inventoryVehicleFromApi(row))
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
      void loadShipments()
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

      {hasShipments && (
        <ul className="mt-2 space-y-2" aria-label="Shipping quotes for this lead">
          {shipments!.map((shipment) => (
            <li key={shipment.quoteId} className="min-w-0 rounded-lg border border-border/50 px-2.5 py-2 text-xs">
              <p className="break-words font-semibold text-foreground">{shipment.vehicleName || "Vehicle"}</p>
              <p className="mt-0.5 text-muted-foreground">
                <Link href="/transportation?tab=drafts" className="underline-offset-2 hover:underline focus-visible:underline focus-visible:outline-none">
                  Quote: {quoteStatusWords(shipment.status)}
                </Link>
                {quotePriceWords(shipment.rate) ? ` · ${quotePriceWords(shipment.rate)}` : ""}
                {shipment.source === "customer_portal" ? " · from the customer portal" : ""}
              </p>
              {shipment.load && (
                <p className="mt-0.5 text-muted-foreground">
                  <Link
                    href={`/transportation/load/${encodeURIComponent(shipment.load._id)}`}
                    className="font-semibold text-foreground underline-offset-2 hover:underline focus-visible:underline focus-visible:outline-none"
                  >
                    Load {shipment.load.loadNumber}
                  </Link>{" "}
                  · {loadStatusWords(shipment.load.status)}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}

      {sold && listFailed && !hasShipments && (
        <p className="mt-1 text-xs text-muted-foreground">We couldn&apos;t load this lead&apos;s shipping quotes. Refresh to try again.</p>
      )}

      {sold && (
        <>
          {!hasShipments && (
            <p className="mt-1 text-xs text-muted-foreground">
              Sold and shipping out? Create a shipping quote for this customer. You&apos;ll stay on this lead.
            </p>
          )}
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
        </>
      )}

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
