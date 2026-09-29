'use client';

import React, { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '@/providers/AuthProvider';
import { apiClient } from '@/lib/api-client';
import { AdminDriver } from './columns';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Link2, Truck, Download } from 'lucide-react';
import { DriverInviteLinkModal } from './DriverInviteLinkModal';
import { PageHeader, PageHeaderPill } from '@/components/admin/PageHeader';
import { TableLoadingSkeleton } from '@/components/shared/EmptyLoadingState';
import { DriverDirectoryPanel } from '@/components/admin/drivers/DriverDirectoryPanel';
import { ReviewQueuePanel } from '@/components/admin/drivers/ReviewQueuePanel';
import { CompliancePanel } from '@/components/admin/drivers/CompliancePanel';
import { exportRowsToCsv } from '@/lib/csv-export';
import { userErrorMessage } from '@/lib/user-error';
import type { DataTableServerState } from '@/components/admin/data-table/DataTable';

interface ApiResponse<T> {
    statusCode: number;
    data: T;
    message: string;
    success: boolean;
}

/** One page of the directory plus platform-wide header totals. */
interface DriverPage {
    drivers: AdminDriver[];
    matching: number;
    hasMore: boolean;
    summary: { total: number; pendingApplications: number; expiredCompliance: number };
}

const FIRST_PAGE: DataTableServerState = { pageIndex: 0, pageSize: 25, search: '', columnFilters: [], sorting: [] };
const SEARCH_DELAY_MS = 300;

function filterValues(query: DataTableServerState, columnId: string) {
    const value = query.columnFilters.find((filter) => filter.id === columnId)?.value;
    return Array.isArray(value) ? value.map(String) : [];
}

function AdminDriversPageInner() {
    const { getToken } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [inviteOpen, setInviteOpen] = useState(false);

    const tabParam = searchParams.get('tab');
    const tab = tabParam === 'queue' ? 'queue' : tabParam === 'compliance' ? 'compliance' : 'directory';
    const setTab = (next: string) =>
        router.replace(next === 'directory' ? '/admin/drivers' : `/admin/drivers?tab=${next}`);

    // The server pages, searches, filters and sorts; typing waits a moment.
    const [query, setQuery] = useState<DataTableServerState>(FIRST_PAGE);
    const [search, setSearch] = useState('');
    const [exporting, setExporting] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => setSearch(query.search.trim()), SEARCH_DELAY_MS);
        return () => clearTimeout(timer);
    }, [query.search]);

    const params = useMemo(() => {
        const sort = query.sorting[0];
        return {
            page: String(query.pageIndex + 1),
            limit: String(query.pageSize),
            search,
            application: filterValues(query, 'applicationStatus').join(','),
            verification: filterValues(query, 'verificationStatus').join(','),
            active: filterValues(query, 'isActive').join(','),
            ...(sort ? { sort: sort.id, order: sort.desc ? 'desc' : 'asc' } : {}),
        };
    }, [query, search]);

    const { data, error, isError, isLoading, refetch } = useQuery({
        queryKey: ['admin-drivers', 'page', params],
        queryFn: async () => {
            const token = await getToken();
            if (!token) throw new Error('Unable to authenticate the user request.');
            const res = await apiClient.get<ApiResponse<DriverPage>>('/api/admin/drivers', {
                params,
                headers: { Authorization: `Bearer ${token}` },
            });
            return res.data.data;
        },
        placeholderData: keepPreviousData,
    });

    const summary = data?.summary;

    // The export has every driver, not just the page on screen.
    const exportAll = async () => {
        setExporting(true);
        try {
            const token = await getToken();
            if (!token) throw new Error('Unable to authenticate the user request.');
            const res = await apiClient.get<ApiResponse<{ drivers: AdminDriver[]; total: number }>>(
                '/api/admin/drivers',
                { headers: { Authorization: `Bearer ${token}` } },
            );
            exportRowsToCsv('drivers', res.data?.data?.drivers || [], [
                { key: 'name', label: 'Name' },
                { key: 'email', label: 'Email' },
                { key: 'applicationStatus', label: 'Application' },
                { key: 'verificationStatus', label: 'Verification' },
                { key: 'profileCompletionScore', label: 'Profile %' },
                { key: 'isActive', label: 'Active' },
                { key: 'isComplianceExpired', label: 'Compliance expired' },
                { key: 'memberSince', label: 'Member since' },
            ]);
        } catch (exportError) {
            toast.error(userErrorMessage(exportError, 'export the drivers'));
        } finally {
            setExporting(false);
        }
    };

    return (
        <div className="container mx-auto space-y-5">
            <PageHeader
                title="Drivers"
                description="The platform-wide driver pool, their applications and their compliance."
                meta={
                    <>
                        <PageHeaderPill><Truck className="h-3 w-3" /> {summary?.total ?? 0} total</PageHeaderPill>
                        <PageHeaderPill>{summary?.pendingApplications ?? 0} pending application</PageHeaderPill>
                        <PageHeaderPill>{summary?.expiredCompliance ?? 0} expired compliance</PageHeaderPill>
                    </>
                }
                actions={
                    <>
                        <Button
                            variant="outline"
                            size="sm"
                            className="gap-1.5"
                            disabled={!summary?.total || exporting}
                            onClick={() => void exportAll()}
                        >
                            <Download className="h-3.5 w-3.5" /> {exporting ? 'Exporting…' : 'Export'}
                        </Button>
                        <Button onClick={() => setInviteOpen(true)} size="sm" className="gap-1.5">
                            <Link2 className="h-3.5 w-3.5" /> Invite driver
                        </Button>
                    </>
                }
            />

            <DriverInviteLinkModal open={inviteOpen} onOpenChange={setInviteOpen} />

            <Tabs value={tab} onValueChange={setTab} className="space-y-4">
                <TabsList className="h-9">
                    <TabsTrigger value="directory" className="px-3">Directory</TabsTrigger>
                    <TabsTrigger value="queue" className="px-3">Review queue</TabsTrigger>
                    <TabsTrigger value="compliance" className="px-3">Compliance</TabsTrigger>
                </TabsList>

                <TabsContent value="directory" className="outline-none">
                    <DriverDirectoryPanel
                        data={data?.drivers}
                        total={data?.matching ?? 0}
                        pagination={{ pageIndex: query.pageIndex, pageSize: query.pageSize }}
                        onQueryChange={setQuery}
                        isLoading={isLoading}
                        isError={isError}
                        error={error}
                        refetch={refetch}
                    />
                </TabsContent>

                <TabsContent value="queue" className="outline-none">
                    <ReviewQueuePanel />
                </TabsContent>

                <TabsContent value="compliance" className="outline-none">
                    <CompliancePanel />
                </TabsContent>
            </Tabs>
        </div>
    );
}

export default function AdminDriversPage() {
    return (
        <Suspense fallback={<div className="container mx-auto space-y-6"><TableLoadingSkeleton /></div>}>
            <AdminDriversPageInner />
        </Suspense>
    );
}
