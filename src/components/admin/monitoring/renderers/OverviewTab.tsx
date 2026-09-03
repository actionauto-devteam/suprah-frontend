"use client";

import React from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/providers/AuthProvider';
import { apiClient } from '@/lib/api-client';
import {
    DollarSign, Users, Building2, CreditCard, ClipboardList, CalendarClock,
    Mail, Truck, ArrowRight, ShieldCheck,
} from 'lucide-react';
import { StatCard } from '@/components/admin/StatCard';
import { RecentActivity } from '@/components/admin/dashboard/RecentActivity';
import { SectionHeader, EmptyState } from '@/components/admin/primitives';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface OverviewTabProps {
    systemStats?: { organizations: number; users: number };
    financials?: { mrr: number; totalRevenue: number; activeSubscriptions: number };
}

interface ExpiringItem {
    driverId: string;
    driverName: string;
    kind: string;
    expiresAt: string;
    daysRemaining: number;
    expired: boolean;
}

export const OverviewTab = React.memo(({ systemStats, financials }: OverviewTabProps) => {
    const { getToken } = useAuth();

    const authed = React.useCallback(async () => {
        const token = await getToken();
        return { headers: { Authorization: `Bearer ${token}` } };
    }, [getToken]);

    const { data: queue, isLoading: queueLoading } = useQuery({
        queryKey: ['admin-review-queue'],
        queryFn: async () => {
            const res = await apiClient.get('/api/admin/review-queue', await authed());
            return (res.data?.data?.items || []) as unknown[];
        },
        refetchOnWindowFocus: true,
    });

    const { data: expiring, isLoading: expiringLoading } = useQuery({
        queryKey: ['admin-compliance-expiring'],
        queryFn: async () => {
            const res = await apiClient.get('/api/admin/compliance/expiring?days=30', await authed());
            return res.data?.data as { items: ExpiringItem[]; total: number; expired: number };
        },
    });

    const { data: payouts, isLoading: payoutsLoading } = useQuery({
        queryKey: ['admin-pending-withdrawals-count'],
        queryFn: async () => {
            const res = await apiClient.get('/api/admin/referrals/withdrawals', await authed());
            const payload = res.data?.data;
            return (Array.isArray(payload) ? payload : payload?.withdrawals || []) as unknown[];
        },
    });

    const { data: inquiries, isLoading: inquiriesLoading } = useQuery({
        queryKey: ['admin-dealership-inquiries', 'pending'],
        queryFn: async () => {
            const res = await apiClient.get('/api/admin/dealership-inquiries', {
                ...(await authed()),
                params: { status: 'pending' },
            });
            return (res.data?.data?.inquiries || []) as unknown[];
        },
    });

    const attentionLoading = queueLoading || expiringLoading || payoutsLoading || inquiriesLoading;

    const attention = [
        {
            label: 'Driver reviews',
            value: queue?.length ?? 0,
            helper: 'Applications & documents',
            icon: ClipboardList,
            href: '/admin/review-queue',
        },
        {
            label: 'Expiring compliance',
            value: expiring?.total ?? 0,
            helper: expiring?.expired ? `${expiring.expired} already expired` : 'Within 30 days',
            icon: CalendarClock,
            href: '/admin/drivers',
            critical: (expiring?.expired ?? 0) > 0,
        },
        {
            label: 'Payout requests',
            value: payouts?.length ?? 0,
            helper: 'Awaiting approval',
            icon: CreditCard,
            href: '/admin/payouts',
        },
        {
            label: 'Dealership leads',
            value: inquiries?.length ?? 0,
            helper: 'Awaiting outreach',
            icon: Mail,
            href: '/admin/organizations',
        },
    ];

    const totalAttention = attention.reduce((sum, item) => sum + item.value, 0);

    return (
        <div className="space-y-8">
            <section className="space-y-3">
                <SectionHeader
                    title="Needs attention"
                    description={
                        attentionLoading
                            ? 'Checking open work…'
                            : totalAttention === 0
                                ? 'Nothing is waiting on the team right now.'
                                : `${totalAttention} item${totalAttention === 1 ? '' : 's'} waiting across the platform.`
                    }
                />
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {attentionLoading
                        ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[92px] rounded-lg" />)
                        : attention.map(item => (
                            <StatCard
                                key={item.label}
                                icon={item.icon}
                                label={item.label}
                                value={item.value}
                                helper={item.helper}
                                href={item.href}
                                tone={item.value === 0 ? 'default' : item.critical ? 'critical' : 'attention'}
                            />
                        ))}
                </div>
            </section>

            <section className="space-y-3">
                <SectionHeader title="Platform" description="Current totals across all dealerships." />
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <StatCard
                        icon={DollarSign}
                        label="Monthly recurring revenue"
                        value={`$${financials?.mrr?.toLocaleString() ?? '0'}`}
                        helper="Current month"
                    />
                    <StatCard
                        icon={CreditCard}
                        label="Active subscriptions"
                        value={financials?.activeSubscriptions ?? 0}
                        helper="Across all tiers"
                    />
                    <StatCard
                        icon={Building2}
                        label="Dealerships"
                        value={systemStats?.organizations ?? 0}
                        helper="Registered"
                        href="/admin/organizations"
                    />
                    <StatCard
                        icon={Users}
                        label="Users"
                        value={systemStats?.users ?? 0}
                        helper="All roles"
                        href="/admin/users"
                    />
                </div>
            </section>

            <div className="grid gap-4 lg:grid-cols-2">
                <section className="space-y-3">
                    <SectionHeader title="Expiring compliance" description="Soonest first." />
                    <div className="rounded-lg border border-border bg-card">
                        {expiringLoading ? (
                            <div className="space-y-2 p-4">
                                {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-9" />)}
                            </div>
                        ) : !expiring?.items?.length ? (
                            <EmptyState
                                icon={ShieldCheck}
                                title="Everything current"
                                description="No driver credentials or documents expire in the next 30 days."
                            />
                        ) : (
                            <>
                                <div className="divide-y divide-border">
                                    {expiring.items.slice(0, 6).map((item, i) => (
                                        <Link
                                            key={`${item.driverId}-${item.kind}-${i}`}
                                            href={`/admin/drivers/${item.driverId}`}
                                            className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-accent/50"
                                        >
                                            <Truck className="size-3.5 shrink-0 text-muted-foreground" />
                                            <span className="min-w-0 flex-1 truncate text-sm">{item.driverName}</span>
                                            <span className="shrink-0 text-xs text-muted-foreground">{item.kind}</span>
                                            <span
                                                className={cn(
                                                    'w-24 shrink-0 text-right text-xs font-medium tabular-nums',
                                                    item.expired
                                                        ? 'text-red-600 dark:text-red-400'
                                                        : item.daysRemaining <= 7
                                                            ? 'text-amber-600 dark:text-amber-400'
                                                            : 'text-muted-foreground',
                                                )}
                                            >
                                                {item.expired
                                                    ? `${Math.abs(item.daysRemaining)}d overdue`
                                                    : `${item.daysRemaining}d left`}
                                            </span>
                                        </Link>
                                    ))}
                                </div>
                                {expiring.items.length > 6 && (
                                    <div className="border-t border-border px-4 py-2 text-xs text-muted-foreground">
                                        +{expiring.items.length - 6} more
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </section>

                <section className="space-y-3">
                    <SectionHeader
                        title="Recent activity"
                        description="Latest recorded admin and system events."
                        actions={
                            <Link
                                href="/admin/review-queue"
                                className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
                            >
                                Review queue <ArrowRight className="size-3" />
                            </Link>
                        }
                    />
                    <div className="rounded-lg border border-border bg-card p-4">
                        <RecentActivity />
                    </div>
                </section>
            </div>
        </div>
    );
});

OverviewTab.displayName = 'OverviewTab';
