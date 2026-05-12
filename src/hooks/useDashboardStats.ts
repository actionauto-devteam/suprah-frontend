import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/providers/AuthProvider';
import { apiClient } from '@/lib/api-client';
import { useCallback } from 'react';

export interface DashboardMetrics {
    stats: {
        activeInventory: number;
        potentialRevenue: number;
        monthlyQuotes: number;
        avgDaysOnLot?: number;
    };
    revenueTrajectory: Array<{ name: string; revenue: number }>;
    activeReps: Array<{
        name: string;
        avatar: string;
        onlineStatus: string;
    }>;
    logistics: {
        drivers: { active: number; ready: number };
        shipments: Record<string, number>;
    };
    intelligence: {
        netMargin: number;
        complianceAlerts: number;
        speedToLead: number;
    };
    livePayments: Array<{
        customerName: string;
        amount: number;
        status: string;
        description: string;
        createdAt: string;
    }>;
}

export function useDashboardStats(period: string = '1Y', month?: string) {
    const { isLoaded, isSignedIn, getToken } = useAuth();

    const getAuthHeaders = useCallback(async () => {
        const token = await getToken();
        return {
            headers: {
                Authorization: `Bearer ${token}`
            }
        };
    }, [getToken]);

    return useQuery<DashboardMetrics>({
        queryKey: ['dashboard-metrics', period, month],
        queryFn: async () => {
            const headers = await getAuthHeaders();
            const response = await apiClient.getDashboardMetrics({ period, month }, headers);
            return response.data?.data || response.data;
        },
        enabled: !!isLoaded && !!isSignedIn,
        refetchInterval: 60000, // Refetch every minute
        staleTime: 30000, // Consider data stale after 30 seconds
    });
}
