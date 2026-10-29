import type { AxiosRequestConfig } from "axios";
import { apiClient } from "@/lib/api-client";
import { VEHICLE_SHIPPING_LOOKUP_MAX, type VehicleShippingResult } from "@/lib/vehicle-shipping";

/**
 * The dealership's live loads (and, with `quotes`, waiting quotes) for these
 * cars, by inventory id or VIN. Staff only. `excludeLoadId` leaves out the
 * load being edited.
 */
export async function getVehicleShipping(
  query: { vehicleIds?: string[]; vins?: string[]; excludeLoadId?: string; quotes?: boolean },
  config?: AxiosRequestConfig,
): Promise<VehicleShippingResult> {
  const vehicleIds = (query.vehicleIds ?? []).slice(0, VEHICLE_SHIPPING_LOOKUP_MAX);
  const vins = (query.vins ?? []).slice(0, VEHICLE_SHIPPING_LOOKUP_MAX);
  if (vehicleIds.length === 0 && vins.length === 0) return { loads: [], quotes: [] };
  const res = await apiClient.get<{ data: VehicleShippingResult }>("/api/loads/vehicle-shipping", {
    ...config,
    params: {
      ...(vehicleIds.length ? { vehicleIds: vehicleIds.join(",") } : {}),
      ...(vins.length ? { vins: vins.join(",") } : {}),
      ...(query.excludeLoadId ? { excludeLoadId: query.excludeLoadId } : {}),
      ...(query.quotes ? { quotes: "1" } : {}),
    },
  });
  const data = res.data?.data;
  return { loads: data?.loads ?? [], quotes: data?.quotes ?? [] };
}
