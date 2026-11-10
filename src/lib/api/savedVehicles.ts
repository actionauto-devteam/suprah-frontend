import { apiClient } from '../api-client';
import type { WishlistVehicle } from '@/lib/wishlist';

/** Saved cars: those for sale in Shop's format, and those no longer for sale marked available: false (see lib/wishlist). */
export const fetchSavedVehicles = async (): Promise<WishlistVehicle[]> => {
    const response = await apiClient.get('/api/customer/saved-vehicles');
    return response.data.data;
};

export const saveVehicle = async (vehicleId: string): Promise<void> => {
    await apiClient.post(`/api/customer/saved-vehicles/${vehicleId}`);
};

export const removeSavedVehicle = async (vehicleId: string): Promise<void> => {
    await apiClient.delete(`/api/customer/saved-vehicles/${vehicleId}`);
};
