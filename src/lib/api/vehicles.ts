import { apiClient } from "../api-client";

export interface OwnedVehicle {
  id: string;
  _id: string;
  vin: string;
  make: string;
  model: string;
  year: string;
  trim?: string;
  color?: string;
  licensePlate?: string;
  currentMileage: number;
  status: "ACTIVE" | "SOLD" | "TRADED_IN";
  images: string[];
  purchaseDate?: string;
  source?: "MANUAL" | "DEALERSHIP_TRANSFER";
  dealershipName?: string;
  transferredAt?: string;
}

export const fetchOwnedVehicles = async (): Promise<OwnedVehicle[]> => {
  const response = await apiClient.get("/api/customer/vehicles");
  return response.data.data;
};

export const updateVehicleMileage = async (
  id: string,
  currentMileage: number,
): Promise<OwnedVehicle> => {
  const response = await apiClient.patch(
    `/api/customer/vehicles/${id}/mileage`,
    { currentMileage },
  );
  return response.data.data;
};

export const updateVehicle = async (
  id: string,
  updates: Partial<OwnedVehicle>,
): Promise<OwnedVehicle> => {
  const response = await apiClient.put(`/api/customer/vehicles/${id}`, updates);
  return response.data.data;
};

export const deleteVehicle = async (id: string): Promise<void> => {
  await apiClient.delete(`/api/customer/vehicles/${id}`);
};

export const uploadVehicleImage = async (
  id: string,
  file: File,
): Promise<OwnedVehicle> => {
  const formData = new FormData();
  formData.append("image", file);
  const response = await apiClient.post(
    `/api/customer/vehicles/${id}/image`,
    formData,
    { headers: { "Content-Type": "multipart/form-data" } },
  );
  return response.data.data;
};

export interface DecodedVin {
  make: string;
  model: string;
  year: string;
  trim?: string;
  currentMileage?: number;
  color?: string;
  licensePlate?: string;
}

export const decodeVin = async (vin: string): Promise<DecodedVin> => {
  const response = await apiClient.get(`/api/customer/vehicles/decode/${vin}`);
  return response.data.data;
};