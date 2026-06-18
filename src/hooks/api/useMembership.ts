import { useQuery, useMutation } from '@tanstack/react-query';
import { getMyMembership, getAllTiers, getMyPointHistory, generateDiscountToken } from '@/lib/api/membership';

export const MEMBERSHIP_QUERY_KEY = ['membership'];
export const TIERS_QUERY_KEY = ['membership', 'tiers'];

export const useMyMembership = () =>
  useQuery({
    queryKey: MEMBERSHIP_QUERY_KEY,
    queryFn: getMyMembership,
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });

export const useAllTiers = () =>
  useQuery({
    queryKey: TIERS_QUERY_KEY,
    queryFn: getAllTiers,
    staleTime: 1000 * 60 * 60,
    retry: 1,
  });

export const useMyPointHistory = (page: number) =>
  useQuery({
    queryKey: [...MEMBERSHIP_QUERY_KEY, 'history', page],
    queryFn: () => getMyPointHistory(page),
    placeholderData: (prev) => prev,
    staleTime: 1000 * 60 * 2,
    retry: 1,
  });

export const useGenerateDiscountToken = () =>
  useMutation({ mutationFn: generateDiscountToken });
