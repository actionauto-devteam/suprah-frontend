import { apiClient } from "@/lib/api-client";
import type { AxiosRequestConfig } from "axios";
import type {
  LocationBlock,
  LoadVehicle,
  LoadDates,
  LoadAdditionalInfo,
  LoadContract,
} from "@/components/create-load/types";
import type { Load } from "@/types/load";

export interface VinLookupResult {
  year: number;
  make: string;
  model: string;
  color: string;
  condition: "Operable" | "Inoperable";
}

export interface RateResult {
  miles: number;
  estimatedRate: number;
  eta: { min: number; max: number };
}

export interface CreateLoadPayload {
  postType: "load-board" | "assign-carrier";
  pickup: LocationBlock;
  delivery: LocationBlock;
  vehicles: LoadVehicle[];
  dates: LoadDates;
  additionalInfo: LoadAdditionalInfo;
  contract: LoadContract;
  trailerType: string;
  // pricePerMile: dispatcher's $/mi rate from the Pricing step — persisted
  // on the load (pricing.pricePerMile) so cards/detail views can show it.
  pricing?: { pricePerMile?: number; carrierPayAmount?: number; copCodAmount?: number };
}

export interface CreatedLoad {
  _id: string;
  loadNumber: string;
  status: string;
}

export interface CreateLoadResponse {
  load: CreatedLoad;
  warning?: string;
}

export interface InventoryVehicle {
  vin: string;
  year: number;
  make: string;
  model: string;
  color: string;
  condition: "Operable" | "Inoperable";
  imageUrl?: string;
}

export async function getInventoryVehicles(q?: string): Promise<InventoryVehicle[]> {
  const params = q ? `?q=${encodeURIComponent(q)}` : "";
  const res = await apiClient.get<{ data: InventoryVehicle[] }>(`/api/loads/vehicles${params}`);
  return res.data.data;
}

export async function lookupVin(vin: string): Promise<VinLookupResult> {
  const res = await apiClient.get<{ data: VinLookupResult }>(`/api/loads/vin/${vin}`);
  return res.data.data;
}

export async function calculateLoadRate(
  pickupZip: string,
  deliveryZip: string,
  trailerType: string,
  vehicles: Array<{ condition: string }>
): Promise<RateResult> {
  const res = await apiClient.post<{ data: RateResult }>("/api/loads/calculate-rate", {
    pickupZip,
    deliveryZip,
    trailerType,
    vehicles,
  });
  return res.data.data;
}

export interface LoadsQuery {
  status?: string
  postType?: string
  q?: string
  page?: number
  limit?: number
}

export interface LoadsPagination {
  page: number
  limit: number
  total: number
  totalPages: number
  hasMore: boolean
}

export interface LoadsResult {
  loads: Load[]
  pagination: LoadsPagination
}

// "Accepted" and "Picked Up" are optional so older API deployments (which
// don't return them yet) and existing default-state objects stay compatible.
// The sidebar renders missing keys as 0.
export interface LoadStats {
  all: number
  Posted: number
  Assigned: number
  Accepted?: number
  "Picked Up"?: number
  "In-Transit": number
  Delivered: number
  Cancelled: number
}

export async function getLoads(
  query?: LoadsQuery,
  config?: AxiosRequestConfig,
): Promise<LoadsResult> {
  const params = new URLSearchParams()
  if (query?.status) params.set("status", query.status)
  if (query?.postType) params.set("postType", query.postType)
  if (query?.q) params.set("q", query.q)
  if (query?.page) params.set("page", String(query.page))
  if (query?.limit) params.set("limit", String(query.limit))
  const qs = params.toString()
  const res = await apiClient.get<{ data: LoadsResult }>(
    `/api/loads${qs ? `?${qs}` : ""}`,
    config,
  )
  return res.data.data
}

export async function getLoadStats(
  config?: AxiosRequestConfig,
): Promise<LoadStats> {
  const res = await apiClient.get<{ data: LoadStats }>(
    "/api/loads/stats",
    config,
  )
  return res.data.data
}

export async function createLoad(payload: CreateLoadPayload): Promise<CreateLoadResponse> {
  try {
    const body = {
      postType: payload.postType,
      pickupLocation: {
        ...payload.pickup,
        locationType: payload.pickup.locationType || undefined,
      },
      deliveryLocation: {
        ...payload.delivery,
        locationType: payload.delivery.locationType || undefined,
      },
      vehicles: payload.vehicles.map(({ id: _unused, ...v }) => ({
        ...v,
        year: v.year ? Number(v.year) : undefined,
        vin: v.vin || undefined,
      })),
      dates: payload.dates ? {
        ...payload.dates,
        firstAvailable: payload.dates.firstAvailable || undefined,
        pickupDeadline: payload.dates.pickupDeadline || undefined,
        deliveryDeadline: payload.dates.deliveryDeadline || undefined,
      } : undefined,
      additionalInfo: payload.additionalInfo,
      contract: payload.contract,
      trailerType: payload.trailerType,
      // pricePerMile rides through here — createLoadSchema (backend zod)
      // must include it in the pricing shape or it gets stripped server-side.
      pricing: payload.pricing,
    };
    const res = await apiClient.post<{ data: { load: CreatedLoad; warning?: string } }>("/api/loads", body);
    return { load: res.data.data.load, warning: res.data.data.warning };
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'response' in error) {
      const axiosError = error as { response?: { data?: { message?: string } } };
      if (axiosError.response?.data?.message) {
        throw new Error(axiosError.response.data.message);
      }
    }
    throw error;
  }
}

export async function deleteLoad(loadId: string): Promise<void> {
  await apiClient.delete(`/api/loads/${loadId}`);
}

export async function assignDriverToLoad(loadId: string, driverId: string): Promise<void> {
  await apiClient.post("/api/driver-tracking/assign-load", { loadId, driverId });
}

export async function updateLoad(
  loadId: string,
  payload: Partial<Load>
): Promise<Load> {
  const res = await apiClient.put<{ data: Load }>(
    `/api/loads/${loadId}`,
    payload
  )

  return res.data.data
}

export interface LoadNote {
  _id: string;
  text: string;
  createdAt: string;
  createdBy?: string;
}

export async function addLoadNote(loadId: string, text: string): Promise<LoadNote> {
  const res = await apiClient.post<{ data: LoadNote }>(`/api/loads/${loadId}/notes`, { text });
  return res.data.data;
}

export interface SendEmailResult {
  success: boolean;
  message: string;
}

export async function sendLoadEmail(
  loadId: string,
  recipientEmail?: string
): Promise<SendEmailResult> {
  const res = await apiClient.post<{ data: SendEmailResult }>(
    `/api/loads/${loadId}/send-email`,
    recipientEmail ? { recipientEmail } : {}
  );
  return res.data.data;
}

export async function uploadVehicleInspectionPhoto(
  loadId: string,
  vehicleIndex: number,
  file: File,
): Promise<string> {
  const formData = new FormData();
  formData.append("proof", file);
  const res = await apiClient.post<{ data: { inspectionPhotoUrl: string } }>(
    `/api/loads/${loadId}/vehicles/${vehicleIndex}/inspection-photo`,
    formData,
    { headers: { "Content-Type": "multipart/form-data" } },
  );
  return res.data.data.inspectionPhotoUrl;
}

export async function getLoadById(
  loadId: string,
  config?: AxiosRequestConfig,
): Promise<Load> {
  const normalizedId = String(loadId || "").trim();
  if (!normalizedId) {
    throw new Error("Load ID is required");
  }

  const res = await apiClient.get<{ data: Load }>(
    `/api/loads/${encodeURIComponent(normalizedId)}`,
    {
      ...config,
      params: {
        ...config?.params,
        // Use a unique URL to avoid stale detail responses without adding
        // custom request headers that trigger a CORS preflight.
        _detailRequest: Date.now(),
      },
    },
  );

  const load = res.data.data;

  // Never render a response that belongs to a different route ID.
  if (!load || String(load._id) !== normalizedId) {
    throw new Error(
      `Load detail response mismatch: requested ${normalizedId}, received ${
        load?._id ?? "no record"
      }`,
    );
  }

  return load;
}

export async function confirmLoadDelivery(loadId: string): Promise<Load> {
  const res = await apiClient.post<{ data: Load }>(`/api/loads/${loadId}/confirm-delivery`, {});
  return res.data.data;
}

export interface ActiveDriver {
  id: string;
  status: "on-route" | "idle" | "on-break" | "waiting" | "offline";
  coords: { lat: number; lng: number };
  lastSeenAt: string;
  driver: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  equipment: {
    trailerType: string;
    maxVehicleCapacity: number;
    operationalStatus: string;
    truckMake?: string;
    truckModel?: string;
    isComplianceExpired: boolean;
  } | null;
  shipments: Array<{
    id: string;
    trackingNumber: string;
    status: string;
    origin: string;
    destination: string;
  }>;
}

export async function getActiveDrivers(): Promise<ActiveDriver[]> {
  const res = await apiClient.get<{ data: ActiveDriver[] }>("/api/driver-tracking/active-drivers");
  return res.data.data;
}