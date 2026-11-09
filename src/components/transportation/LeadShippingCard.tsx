"use client"

import * as React from "react"
import Link from "next/link"
import { Truck } from "lucide-react"
import { apiClient } from "@/lib/api-client"
import {
  LEAD_SHIPMENTS_CHANGED_EVENT,
  leadIdFromShipmentsEvent,
  quotePriceWords,
  quoteStatusWords,
  withFocusedQuote,
  type LeadShipment,
} from "@/lib/lead-shipping"
import { loadStatusWords } from "@/lib/vehicle-shipping"
import { useAuth } from "@/providers/AuthProvider"
import { cn } from "@/lib/utils"
import type { Lead } from "@/types/lead"

/**
 * Transportation's part of a CRM lead's details: the lead's shipping quotes
 * and the load each became. Quotes are made with the lead's Quote shipping
 * button; the list refreshes when one is made. Hidden when the lead has none.
 *
 * Opened from a quote or load ("Linked lead", with ?quoteId=), that quote and
 * its car come first and are highlighted: the lead itself can show an earlier
 * car the customer asked about (decided 2026-11-02).
 */
export function LeadShippingCard({ lead }: { lead: Lead }) {
  const { getToken } = useAuth()
  const [shipments, setShipments] = React.useState<LeadShipment[] | null>(null)
  const [linkQuoteId, setLinkQuoteId] = React.useState("")
  const focusedRef = React.useRef<HTMLLIElement | null>(null)

  const leadId = lead._id
  const loadShipments = React.useCallback(
    async (signal?: AbortSignal) => {
      try {
        const token = await getToken()
        const res = await apiClient.get(`/api/quotes/for-lead/${encodeURIComponent(leadId)}`, {
          ...(token ? { headers: { Authorization: `Bearer ${token}` } } : {}),
          signal,
        })
        const data = res.data?.data ?? res.data
        setShipments(Array.isArray(data) ? (data as LeadShipment[]) : [])
      } catch (err) {
        // The list is extra information; the lead page works without it.
        if (!signal?.aborted) console.warn("Could not load this lead's shipping quotes", err)
      }
    },
    [getToken, leadId],
  )

  React.useEffect(() => {
    const controller = new AbortController()
    setShipments(null)
    // The quote a "Linked lead" link came from (the leads page keeps it in the address).
    setLinkQuoteId(new URLSearchParams(window.location.search).get("quoteId") ?? "")
    void loadShipments(controller.signal)
    const refresh = (event: Event) => {
      if (leadIdFromShipmentsEvent(event) === leadId) void loadShipments(controller.signal)
    }
    window.addEventListener(LEAD_SHIPMENTS_CHANGED_EVENT, refresh)
    return () => {
      controller.abort()
      window.removeEventListener(LEAD_SHIPMENTS_CHANGED_EVENT, refresh)
    }
  }, [loadShipments, leadId])

  const { shipments: ordered, focused } = withFocusedQuote(shipments ?? [], linkQuoteId)

  // Brings the linked quote into view once, for example on a phone where the
  // Shipping section sits below the fold.
  React.useEffect(() => {
    if (focused) focusedRef.current?.scrollIntoView({ block: "nearest" })
  }, [focused])

  if (ordered.length === 0) return null

  return (
    <div className="rounded-xl border border-border/60 bg-background/40 p-3">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <Truck className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
        Shipping
      </div>

      <ul className="mt-2 space-y-2" aria-label="Shipping quotes for this lead">
        {ordered.map((shipment, index) => {
          const isLinked = focused && index === 0
          return (
            <li
              key={shipment.quoteId}
              ref={isLinked ? focusedRef : undefined}
              aria-current={isLinked ? "true" : undefined}
              className={cn(
                "min-w-0 rounded-lg border px-2.5 py-2 text-xs",
                isLinked ? "border-emerald-500/70 bg-emerald-500/10" : "border-border/50",
              )}
            >
              {isLinked && (
                <p className="mb-0.5 text-[11px] font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
                  The quote you opened
                </p>
              )}
              <p className="break-words font-semibold text-foreground">{shipment.vehicleName || "Vehicle"}</p>
              {shipment.vin && (
                <p className="mt-0.5 break-all font-mono text-[11px] text-muted-foreground">VIN {shipment.vin}</p>
              )}
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
          )
        })}
      </ul>
    </div>
  )
}
