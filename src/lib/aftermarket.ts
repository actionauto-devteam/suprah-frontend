import { apiClient } from "@/lib/api-client";

export interface AftermarketAttachment {
  url: string;
  key?: string;
  fileName?: string;
  mimeType?: string;
  size?: number;
  mediaType?: "image" | "video";
}

export interface AftermarketProduct {
  _id: string;
  name: string;
  price: number;
  description: string;
  file?: AftermarketAttachment;
  media?: AftermarketAttachment;
  isActive?: boolean;
  createdAt: string;
}

export interface AftermarketOrder {
  _id: string;
  items: Array<{ productId: string; name: string; price: number; quantity: number }>;
  subtotal: number;
  total: number;
  status: "pending" | "paid" | "fulfilled" | "cancelled";
  createdAt: string;
}

/**
 * Customer: browse active products for their org.
 *
 * Pass `search` only when it has a non-empty value so the backend doesn't
 * attempt to filter by an empty string (which would still work, but wastes
 * the regex compilation step on every field).
 */
export async function fetchAftermarketProducts(
  search?: string
): Promise<AftermarketProduct[]> {
  const params: Record<string, string> = {};
  if (search && search.trim()) {
    params.search = search.trim();
  }

  const res = await apiClient.get("/api/aftermarket", {
    params: Object.keys(params).length ? params : undefined,
  });

  // Backend wraps the array in ApiResponse: { data: AftermarketProduct[] }
  const payload = res.data?.data;

  // Guard: the backend always returns an array here; if something slipped
  // through, fall back to an empty array instead of crashing the page.
  return Array.isArray(payload) ? payload : [];
}

/** Customer: single product. */
export async function fetchAftermarketProduct(id: string): Promise<AftermarketProduct> {
  const res = await apiClient.get(`/api/aftermarket/${id}`);
  return res.data?.data;
}

/** Customer: place an order from the cart. */
export async function checkoutAftermarket(
  items: Array<{ productId: string; quantity: number }>
): Promise<AftermarketOrder> {
  const res = await apiClient.post("/api/aftermarket/checkout", { items });
  return res.data?.data;
}

/** Customer: order history. */
export async function fetchMyAftermarketOrders(): Promise<AftermarketOrder[]> {
  const res = await apiClient.get("/api/aftermarket/orders/mine");
  const payload = res.data?.data;
  return Array.isArray(payload) ? payload : [];
}