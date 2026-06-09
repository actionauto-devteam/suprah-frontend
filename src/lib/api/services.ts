import { apiClient } from "../api-client";

export interface ServiceRecord {
  _id: string;
  vehicleId: string;
  serviceType: "OIL_CHANGE" | "TIRES" | "BRAKES" | "INSPECTION" | "OTHER";
  date: string;
  mileageAtService: number;
  locationName: string;
  cost?: number;
  notes?: string;
}

export const logServiceEvent = async (
  data: Omit<ServiceRecord, "_id">,
): Promise<ServiceRecord> => {
  const response = await apiClient.post("/api/service/log", data);
  return response.data.data;
};

export const fetchServiceHistory = async (
  vehicleId: string,
): Promise<ServiceRecord[]> => {
  const response = await apiClient.get(`/api/service/history/${vehicleId}`);
  const payload = response.data?.data;

  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.records)) {
    return payload.records;
  }

  if (Array.isArray(payload?.history)) {
    return payload.history;
  }

  return [];
};
