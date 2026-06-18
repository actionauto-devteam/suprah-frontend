import { apiClient } from '../api-client';
import type {
  MembershipStatus,
  MembershipTier,
  PointHistoryResponse,
  DiscountTokenResponse,
} from '@/types/membership';

export const getMyMembership = async (): Promise<MembershipStatus> => {
  const res = await apiClient.get<{ success: boolean; data: MembershipStatus }>('/api/membership/me');
  return res.data.data;
};

export const getAllTiers = async (): Promise<MembershipTier[]> => {
  const res = await apiClient.get<{ success: boolean; data: MembershipTier[] }>('/api/membership/tiers');
  return res.data.data;
};

export const getMyPointHistory = async (page = 1, limit = 20): Promise<PointHistoryResponse> => {
  const res = await apiClient.get<{ success: boolean; data: PointHistoryResponse }>(
    `/api/membership/history?page=${page}&limit=${limit}`,
  );
  return res.data.data;
};

export const generateDiscountToken = async (): Promise<DiscountTokenResponse> => {
  const res = await apiClient.post<{ success: boolean; data: DiscountTokenResponse }>(
    '/api/membership/generate-discount-token',
  );
  return res.data.data;
};

export const verifyDiscountToken = async (token: string): Promise<{ valid: boolean; discountPercent: number; reason?: string }> => {
  const res = await apiClient.post<{ success: boolean; data: { valid: boolean; discountPercent: number; reason?: string } }>(
    '/api/membership/verify-discount-token',
    { token },
  );
  return res.data.data;
};
