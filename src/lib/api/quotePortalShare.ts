import { apiClient } from "../api-client"
import type { PortalCustomerSummary } from "@/types/transportation"

export interface PortalShareResult {
  portalCustomer: Pick<PortalCustomerSummary, "name" | "shared"> | null
  /** What happened, in plain English, for a toast. */
  message: string
}

/**
 * Staff stop sharing a staff quote's shipment with the customer's portal
 * account (share: false, "Unlink") or share it again (share: true).
 */
export async function setQuotePortalShare(quoteId: string, share: boolean): Promise<PortalShareResult> {
  const response = await apiClient.post(`/api/quotes/${encodeURIComponent(quoteId)}/portal-share`, { share })
  const data = response.data?.data ?? {}
  return {
    portalCustomer: data.portalCustomer ?? null,
    message: String(
      response.data?.message ||
        (share ? "The customer can follow this shipment in their portal again." : "The customer no longer sees this shipment in their portal."),
    ),
  }
}
