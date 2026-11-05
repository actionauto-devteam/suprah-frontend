import { apiClient } from "@/lib/api-client";

/*
 * "Confirm received" and the customer's one review of a delivered shipment:
 * the driver gets 1–5 stars and optional words, the dealership optional
 * words. The driver's star average shows in Driver Tracker; the words only
 * for the load's own dealership; the driver sees none of it.
 */

/** What the customer already did on a delivered shipment (mirrors the server's CustomerReceiptView). */
export interface CustomerShipmentReceipt {
  receivedAt: string;
  reviewed: boolean;
  /** The stars they gave their driver. */
  driverStars: number | null;
}

export interface ShipmentReviewInput {
  driverStars?: number | null;
  driverComment?: string;
  dealershipComment?: string;
}

/** The review as the load's own dealership sees it (mirrors the server's StaffReviewView). */
export interface StaffShipmentReview {
  customerName: string;
  receivedAt: string;
  reviewedAt: string | null;
  driverStars: number | null;
  driverComment: string;
  dealershipComment: string;
}

/** Customers' star average for a driver, for Driver Tracker. */
export interface DriverCustomerRating {
  average: number;
  count: number;
}

const auth = (token: string | null) => ({ headers: token ? { Authorization: `Bearer ${token}` } : {} });

const shipmentPath = (shipmentId: string, action: "received" | "review") =>
  `/api/quote-requests/${encodeURIComponent(shipmentId)}/${action}`;

/** The customer confirms they received the vehicle, optionally with their review. */
export async function confirmShipmentReceived(
  shipmentId: string,
  review: ShipmentReviewInput | null,
  token: string | null,
): Promise<{ receipt: CustomerShipmentReceipt; message: string }> {
  const response = await apiClient.post(shipmentPath(shipmentId, "received"), review ?? {}, auth(token));
  return {
    receipt: response.data?.data as CustomerShipmentReceipt,
    message: String(response.data?.message || "Thanks! You confirmed you received your vehicle."),
  };
}

/** The customer's one review of the delivery. */
export async function sendShipmentReview(
  shipmentId: string,
  review: ShipmentReviewInput,
  token: string | null,
): Promise<{ receipt: CustomerShipmentReceipt; message: string }> {
  const response = await apiClient.post(shipmentPath(shipmentId, "review"), review, auth(token));
  return {
    receipt: response.data?.data as CustomerShipmentReceipt,
    message: String(response.data?.message || "Thanks! Your review was sent."),
  };
}

/** The customer's confirmation and review on a load, for its own dealership (null before they confirm). */
export async function getLoadCustomerReview(loadId: string, token: string | null): Promise<StaffShipmentReview | null> {
  const response = await apiClient.get(`/api/driver-tracking/loads/${encodeURIComponent(loadId)}/customer-review`, auth(token));
  return (response.data?.data as StaffShipmentReview | null) ?? null;
}
