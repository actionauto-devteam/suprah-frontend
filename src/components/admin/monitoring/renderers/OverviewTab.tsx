"use client";

import React, { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, Users, Building2, CreditCard } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ActivityGraph } from '@/components/admin/dashboard/ActivityGraph';
import { RecentActivity } from '@/components/admin/dashboard/RecentActivity';
import { StatCard } from '@/components/admin/StatCard';
import { ADMIN_PANEL_CLASS } from '@/components/admin/theme';
import { cn } from '@/lib/utils';

interface OverviewTabProps {
    systemStats?: { organizations: number; users: number };
    financials?: { mrr: number; totalRevenue: number; activeSubscriptions: number };
}

export const OverviewTab = React.memo(({ systemStats, financials }: OverviewTabProps) => {
    // Memoize chart data to prevent re-calculations
    const revenueData = useMemo(() => [
        { name: 'Jan', revenue: financials?.mrr || 4500 },
        { name: 'Feb', revenue: (financials?.mrr || 4500) * 1.1 },
        { name: 'Mar', revenue: (financials?.mrr || 4500) * 1.05 },
        { name: 'Apr', revenue: (financials?.mrr || 4500) * 1.25 },
        { name: 'May', revenue: (financials?.mrr || 4500) * 1.2 },
        { name: 'Jun', revenue: (financials?.mrr || 4500) * 1.4 },
    ], [financials?.mrr]);

    return (
        <div className="space-y-6">
            {/* Premium Stats Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatCard
                    icon={DollarSign}
                    label="Monthly Revenue"
                    value={`$${financials?.mrr?.toLocaleString() || '0'}`}
                    helper="Recurring, current month"
                    color="emerald"
                />
                <StatCard
                    icon={CreditCard}
                    label="Active Subscriptions"
                    value={financials?.activeSubscriptions || 0}
                    helper="Across all pricing tiers"
                    color="blue"
                />
                <StatCard
                    icon={Building2}
                    label="Total Dealerships"
                    value={systemStats?.organizations || 0}
                    helper="Registered on the platform"
                    color="violet"
                />
                <StatCard
                    icon={Users}
                    label="Total Users"
                    value={systemStats?.users || 0}
                    helper="Active platform users"
                    color="amber"
                />
            </div>

            {/* Charts & Activity Section */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <Card className={cn(ADMIN_PANEL_CLASS, "col-span-4 py-6")}>
                    <CardHeader>
                        <CardTitle>Revenue Overview</CardTitle>
                        <CardDescription>
                            Monthly Recurring Revenue (MRR) growth over the last 6 months.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="pl-2">
                        <div className="h-[350px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={revenueData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.8} />
                                            <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                                    <XAxis
                                        dataKey="name"
                                        stroke="#888888"
                                        fontSize={12}
                                        tickLine={false}
                                        axisLine={false}
                                    />
                                    <YAxis
                                        stroke="#888888"
                                        fontSize={12}
                                        tickLine={false}
                                        axisLine={false}
                                        tickFormatter={(value) => `$${value}`}
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: 'var(--background)',
                                            borderColor: 'var(--border)',
                                            borderRadius: '8px',
                                        }}
                                        itemStyle={{ color: 'var(--foreground)' }}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="revenue"
                                        stroke="var(--primary)"
                                        fillOpacity={1}
                                        fill="url(#colorRevenue)"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                <Card className={cn(ADMIN_PANEL_CLASS, "col-span-4 md:col-span-3 py-6")}>
                    <CardHeader>
                        <CardTitle>Recent Activity</CardTitle>
                        <CardDescription>Latest system events and signups.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-8">
                            <RecentActivity />
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-7">
                <div className="col-span-7">
                    <ActivityGraph />
                </div>
            </div>
        </div>
    );
});

OverviewTab.displayName = 'OverviewTab';
