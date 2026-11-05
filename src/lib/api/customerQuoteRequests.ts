import { apiClient } from "@/lib/api-client";
import type { ShippingQuoteFormData } from "@/types/inventory";
import type { CustomerShipmentReceipt } from "@/lib/api/shipmentReview";

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
  | "withdrawn"
  | "booked"
  | "finding_driver"
  | "driver_accepted"
  | "picked_up"
  | "on_the_way"
  | "arrived"
  | "delivered"
  | "cancelled";

/** The driver carrying the customer's car, once they accept (never their phone or email). */
export interface CustomerShipmentDriver {
  name: string;
  /** A stored photo; load it with resolveImageUrl. */
  photoUrl: string | null;
  /** e.g. "2019 Peterbilt 389 · White". */
  truck: string | null;
}

/** One of a shipment's two chats as the customer sees it (mirrors the server's CustomerChatSummary). */
export interface CustomerShipmentChat {
  /** Messages can be sent. */
  open: boolean;
  /** Someone is in the chat, so it can be opened (read-only when closed). */
  readable: boolean;
  unread: number;
  /** Why it's closed, and what to do instead. */
  note: string | null;
  /** Dispatcher chat: the dispatcher's name. */
  name: string | null;
}

/**
 * One shipment on "My Shipments": a request the customer sent ("request"), or
 * a staff quote the dealership booked with their verified email ("shared").
 */
export interface CustomerShipment {
  id: string;
  /** Older servers don't send it; treat that as "request". */
  kind?: "request" | "shared";
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
  /** The driver, from the moment they accept. */
  driver?: CustomerShipmentDriver | null;
  /** The chats with the driver and the dispatcher, once booked (older servers don't send them). */
  chats?: { driver: CustomerShipmentChat; dispatcher: CustomerShipmentChat } | null;
  /**
   * Delivered shipments: whether the customer confirmed receipt and reviewed
   * it (null: not yet; "unknown": couldn't be checked right now).
   */
  receipt?: CustomerShipmentReceipt | "unknown" | null;
  shipment: {
    number: string;
    bookedAt: string | null;
    driverAcceptedAt?: string | null;
    pickedUpAt: string | null;
    onTheWayAt: string | null;
    arrivedAt?: string | null;
    deliveredAt: string | null;
    cancelledAt: string | null;
    /** The reason's label only. */
    cancelReason: string | null;
    /** The load's delivery deadline, only while the car is still coming. */
    expectedBy?: string | null;
  } | null;
}

/** The signed-in customer's shipments, newest first. */
export async function getMyShipments(token: string | null): Promise<CustomerShipment[]> {
  const response = await apiClient.get("/api/quote-requests/mine", {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  return Array.isArray(response.data?.data) ? (response.data.data as CustomerShipment[]) : [];
}

/** The live map for one shipment, from pickup until delivery. Mirrors the server's CustomerTrackingView. */
export interface CustomerShipmentTracking {
  /** False before pickup and after delivery or cancellation. */
  live: boolean;
  driver: { position: { lat: number; lng: number }; measuredAt: string; approximate: boolean } | null;
  delivery: { lat: number; lng: number } | null;
  /** Null while road routes are off or no route could be worked out. */
  eta: { arrivalAt: string; runningLate: boolean; updatedAt: string } | null;
  /** The road from the driver to the delivery, as [lng, lat] points. */
  route: Array<[number, number]> | null;
}

/** Where the driver carrying the customer's car is, for the live map. */
export async function getShipmentTracking(shipmentId: string, token: string | null): Promise<CustomerShipmentTracking> {
  const response = await apiClient.get(`/api/quote-requests/${encodeURIComponent(shipmentId)}/tracking`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  return response.data?.data as CustomerShipmentTracking;
}

/** Withdraws the customer's own request while it's still waiting. Returns the confirmation to show. */
export async function withdrawShippingRequest(requestId: string, token: string | null): Promise<string> {
  const response = await apiClient.post(
    `/api/quote-requests/${encodeURIComponent(requestId)}/withdraw`,
    {},
    { headers: token ? { Authorization: `Bearer ${token}` } : {} },
  );
  return String(response.data?.message || "Your request was withdrawn. The dealership has been told.");
}
