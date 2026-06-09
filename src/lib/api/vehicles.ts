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
