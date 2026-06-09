import { apiClient } from '../api-client';
import type { Vehicle } from '@/types/inventory';

export const fetchSavedVehicles = async (): Promise<Vehicle[]> => {
    const response = await apiClient.get('/api/customer/saved-vehicles');
    return response.data.data;
};

export const saveVehicle = async (vehicleId: string): Promise<void> => {
    await apiClient.post(`/api/customer/saved-vehicles/${vehicleId}`);
};

export const removeSavedVehicle = async (vehicleId: string): Promise<void> => {
    await apiClient.delete(`/api/customer/saved-vehicles/${vehicleId}`);
};
