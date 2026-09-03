'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from "@/providers/AuthProvider";
import { apiClient } from '@/lib/api-client';
import { MonitoringShell } from '@/components/admin/monitoring/MonitoringShell';
import { Skeleton } from '@/components/ui/skeleton';

interface SystemStats {
    organizations: number;
    users: number;
}

interface FinancialStats {
    mrr: number;
    totalRevenue: number;
    activeSubscriptions: number;
}

interface ApiResponse<T> {
    statusCode: number;
    data: T;
    message: string;
    success: boolean;
}

export default function AdminDashboardPage() {
    const { getToken } = useAuth();

    // 1. Fetch System Stats
    const { data: systemStats, isLoading: statsLoading } = useQuery({
        queryKey: ['admin-stats'],
        queryFn: async () => {
            const token = await getToken();
            const res = await apiClient.get<ApiResponse<SystemStats>>('/api/admin/stats', {
                headers: { Authorization: `Bearer ${token}` }
            });
            return res.data?.data;
        }
    });

    // 2. Fetch Financials
    const { data: financials, isLoading: financeLoading } = useQuery({
        queryKey: ['admin-financials'],
        queryFn: async () => {
            const token = await getToken();
            const res = await apiClient.get<ApiResponse<FinancialStats>>('/api/admin/financials', {
                headers: { Authorization: `Bearer ${token}` }
            });
            return res.data?.data;
        }
    });

    const isLoading = statsLoading || financeLoading;

    if (isLoading) {
        return (
            <div className="container mx-auto space-y-6">
                <div className="space-y-2">
                    <Skeleton className="h-7 w-40" />
                    <Skeleton className="h-4 w-72" />
                </div>
                <Skeleton className="h-9 w-80" />
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <Skeleton key={i} className="h-[92px] rounded-lg" />
                    ))}
                </div>
                <div className="grid gap-4 lg:grid-cols-2">
                    <Skeleton className="h-64 rounded-lg" />
                    <Skeleton className="h-64 rounded-lg" />
                </div>
            </div>
        );
    }

    return (
        <MonitoringShell
            initialData={{ systemStats, financials }}
        />
    );
}
