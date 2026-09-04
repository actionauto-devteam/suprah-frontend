'use client';

import React, { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
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

interface ApiResponse<T> {
    statusCode: number;
    data: T;
    message: string;
    success: boolean;
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

    const { data, error, isError, isLoading, refetch } = useQuery({
        queryKey: ['admin-drivers'],
        queryFn: async () => {
            const token = await getToken();
            if (!token) throw new Error('Unable to authenticate the user request.');
            const res = await apiClient.get<ApiResponse<{ drivers: AdminDriver[]; total: number }>>(
                '/api/admin/drivers',
                { headers: { Authorization: `Bearer ${token}` } },
            );
            return res.data?.data?.drivers || [];
        },
    });

    const pendingApplications = data?.filter((driver) => driver.applicationStatus === 'pending').length ?? 0;
    const expiredCompliance = data?.filter((driver) => driver.isComplianceExpired).length ?? 0;

    return (
        <div className="container mx-auto space-y-5">
            <PageHeader
                title="Drivers"
                description="The platform-wide driver pool, their applications and their compliance."
                meta={
                    <>
                        <PageHeaderPill><Truck className="h-3 w-3" /> {data?.length ?? 0} total</PageHeaderPill>
                        <PageHeaderPill>{pendingApplications} pending application</PageHeaderPill>
                        <PageHeaderPill>{expiredCompliance} expired compliance</PageHeaderPill>
                    </>
                }
                actions={
                    <>
                        <Button
                            variant="outline"
                            size="sm"
                            className="gap-1.5"
                            disabled={!data?.length}
                            onClick={() =>
                                exportRowsToCsv('drivers', data || [], [
                                    { key: 'name', label: 'Name' },
                                    { key: 'email', label: 'Email' },
                                    { key: 'applicationStatus', label: 'Application' },
                                    { key: 'verificationStatus', label: 'Verification' },
                                    { key: 'profileCompletionScore', label: 'Profile %' },
                                    { key: 'isActive', label: 'Active' },
                                    { key: 'isComplianceExpired', label: 'Compliance expired' },
                                    { key: 'memberSince', label: 'Member since' },
                                ])
                            }
                        >
                            <Download className="h-3.5 w-3.5" /> Export
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
                        data={data}
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
