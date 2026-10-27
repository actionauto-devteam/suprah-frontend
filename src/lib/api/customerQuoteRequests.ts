import { apiClient } from "@/lib/api-client";
import type { ShippingQuoteFormData } from "@/types/inventory";

/** What the customer sees about their own shipping request. */
export interface CustomerQuoteRequest {
  id: string;
  vehicleName?: string;
  toAddress: string;
  miles: number;
  rate: number;
  eta: { min: number; max: number };
  status: string;
}

/**
 * Sends a customer's shipping request for a marketplace vehicle. It goes to
 * the dealership that owns the vehicle; the server uses the customer's own
 * account details and the dealership's lot as the pickup.
 */
export async function requestShippingQuote(formData: ShippingQuoteFormData, token: string | null) {
  const response = await apiClient.post(
    "/api/quote-requests",
    { ...formData, toZip: formData.zipCode, toAddress: formData.fullAddress },
    { headers: { Authorization: `Bearer ${token}` } },
  );
  return {
    request: response.data?.data as CustomerQuoteRequest,
    message: String(response.data?.message || "Your shipping quote request was sent to the dealership."),
  };
}

/** The confirmation a customer sees, with the estimated shipping price. */
export function shippingRequestSentMessage(message: string, rate: number): string {
  return `${message} Estimated shipping: $${Math.round(rate).toLocaleString("en-US")}.`;
}
