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
  return `${message} Estimated shipping: $${Math.round(rate).toLocaleString("en-US")}. You can follow it in My Shipments.`;
}

/** Where a customer's request stands. Mirrors the server's CustomerShipmentStage. */
export type CustomerShipmentStage =
  | "waiting"
  | "accepted"
  | "declined"
  | "unavailable"
  | "booked"
  | "picked_up"
  | "on_the_way"
  | "delivered"
  | "cancelled";

/** One request on "My Shipments" (no driver details or location). */
export interface CustomerShipment {
  id: string;
  vehicleName: string;
  vehicleImage: string | null;
  dealerName: string;
  deliveryAddress: string;
  miles: number | null;
  rate: number | null;
  eta: { min: number; max: number } | null;
  requestedAt: string | null;
  stage: CustomerShipmentStage;
  /** What the dealership wrote when declining (declined requests only). */
  declineReason?: string | null;
  shipment: {
    number: string;
    bookedAt: string | null;
    pickedUpAt: string | null;
    onTheWayAt: string | null;
    deliveredAt: string | null;
    cancelledAt: string | null;
    /** The reason's label only. */
    cancelReason: string | null;
    /** The load's delivery deadline, only while the car is still coming. */
    expectedBy?: string | null;
  } | null;
}

/** The signed-in customer's own shipping requests, newest first. */
export async function getMyShipments(token: string | null): Promise<CustomerShipment[]> {
  const response = await apiClient.get("/api/quote-requests/mine", {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  return Array.isArray(response.data?.data) ? (response.data.data as CustomerShipment[]) : [];
}
