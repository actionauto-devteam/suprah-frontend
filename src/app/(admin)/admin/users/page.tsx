'use client';

import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/providers/AuthProvider';
import { apiClient } from '@/lib/api-client';
import { columns, AdminUser } from './columns';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
    Users as UsersIcon, UserPlus, ShieldBan, ShieldCheck, Trash2, Download, Loader2, ChevronRight,
} from 'lucide-react';
import { PageHeader, PageHeaderPill } from '@/components/admin/PageHeader';
import { AdminErrorState } from '@/components/admin/AdminErrorState';
import { DataTable } from '@/components/admin/data-table/DataTable';
import { DataTableFacetedFilter } from '@/components/admin/DataTableFacetedFilter';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { InviteUserDialog } from '@/components/admin/users/InviteUserDialog';
import { UserDetailSheet } from '@/components/admin/users/UserDetailSheet';
import { runBulkSettled } from '@/lib/bulk-action-result';
import { exportRowsToCsv } from '@/lib/csv-export';
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface PaginatedUsers {
    users: AdminUser[];
    pagination: unknown;
}

interface ApiResponse<T> {
    statusCode: number;
    data: T;
    message: string;
    success: boolean;
}

const STATUS_OPTIONS = [
    { label: 'Active', value: 'true' },
    { label: 'Suspended', value: 'false' },
];

const initials = (name?: string) => {
    if (!name) return '??';
    const parts = name.trim().split(/\s+/);
    return parts.length >= 2
        ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
        : name.slice(0, 2).toUpperCase();
};

export default function UsersPage() {
    const { getToken } = useAuth();
    const [inviteOpen, setInviteOpen] = useState(false);
    const [detailUserId, setDetailUserId] = useState<string | null>(null);
    const [bulkAction, setBulkAction] = useState<'suspend' | 'activate' | 'delete' | null>(null);
    const [pendingIds, setPendingIds] = useState<string[]>([]);
    const [clearSelection, setClearSelection] = useState<(() => void) | null>(null);
    const [bulkBusy, setBulkBusy] = useState(false);

    const { data, error, isError, isLoading, refetch } = useQuery({
        queryKey: ['admin-users'],
        queryFn: async () => {
            const token = await getToken();
            if (!token) throw new Error('Unable to authenticate the user request.');
            const res = await apiClient.get<ApiResponse<PaginatedUsers>>('/api/admin/users?limit=100', {
                headers: { Authorization: `Bearer ${token}` },
            });
            const payload = res.data?.data;
            return Array.isArray(payload?.users) ? payload.users : [];
        },
    });

    const roleOptions = useMemo(() => {
        const roles = new Set((data ?? []).map((user: AdminUser) => user.role).filter(Boolean));
        return Array.from(roles).map((role) => ({
            label: String(role).replace(/_/g, ' '),
            value: String(role),
        }));
    }, [data]);

    const runBulk = async () => {
        if (!bulkAction || pendingIds.length === 0) return;
        setBulkBusy(true);
        try {
            const token = await getToken();
            const headers = { Authorization: `Bearer ${token}` };
            if (bulkAction === 'delete') {
                await runBulkSettled(
                    pendingIds,
                    (id) => apiClient.delete(`/api/admin/users/${id}`, { headers }),
                    { verb: 'deleted', noun: 'user' },
                );
            } else {
                await runBulkSettled(
                    pendingIds,
                    (id) => apiClient.post(`/api/admin/users/${id}/${bulkAction}`, {}, { headers }),
                    { verb: bulkAction === 'suspend' ? 'suspended' : 'activated', noun: 'user' },
                );
            }
            clearSelection?.();
            setBulkAction(null);
            refetch();
        } finally {
            setBulkBusy(false);
        }
    };

    const suspended = data?.filter((user: AdminUser) => !user.isActive).length ?? 0;

    return (
        <div className="container mx-auto space-y-5">
            <PageHeader
                title="Users"
                description="Every account on the platform, across all roles and dealerships."
                meta={
                    <>
                        <PageHeaderPill><UsersIcon className="h-3 w-3" /> {data?.length ?? 0} accounts</PageHeaderPill>
                        <PageHeaderPill>{suspended} suspended</PageHeaderPill>
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
                                exportRowsToCsv('users', data || [], [
                                    { key: 'name', label: 'Name' },
                                    { key: 'email', label: 'Email' },
                                    { key: 'role', label: 'Role' },
                                    { key: 'isActive', label: 'Active' },
                                ])
                            }
                        >
                            <Download className="h-3.5 w-3.5" /> Export
                        </Button>
                        <Button size="sm" className="gap-1.5" onClick={() => setInviteOpen(true)}>
                            <UserPlus className="h-3.5 w-3.5" /> Invite user
                        </Button>
                    </>
                }
            />

            <InviteUserDialog open={inviteOpen} onOpenChange={setInviteOpen} />
            <UserDetailSheet
                userId={detailUserId}
                onOpenChange={(open) => { if (!open) setDetailUserId(null); }}
            />

            {isError ? (
                <AdminErrorState
                    message={error instanceof Error ? error.message : 'The user request failed. Please try again.'}
                    onRetry={() => refetch()}
                />
            ) : (
                <DataTable<AdminUser>
                    columns={columns as never}
                    data={data || []}
                    isLoading={isLoading}
                    getRowId={(row) => row._id}
                    storageKey="users"
                    searchPlaceholder="Search name or email…"
                    searchFn={(row, term) =>
                        Boolean(row.name?.toLowerCase().includes(term)) ||
                        Boolean(row.email?.toLowerCase().includes(term))
                    }
                    emptyTitle="No users yet"
                    onRowClick={(row) => setDetailUserId(row._id)}
                    filters={(table) => (
                        <>
                            <DataTableFacetedFilter
                                column={table.getColumn('role')}
                                title="Role"
                                options={roleOptions}
                            />
                            <DataTableFacetedFilter
                                column={table.getColumn('isActive')}
                                title="Status"
                                options={STATUS_OPTIONS}
                            />
                        </>
                    )}
                    bulkBar={(ids, clear) => (
                        <>
                            <Button
                                size="sm"
                                variant="outline"
                                className="h-7 gap-1.5 border-emerald-500/30 text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-400"
                                onClick={() => { setPendingIds(ids); setClearSelection(() => clear); setBulkAction('activate'); }}
                            >
                                <ShieldCheck className="size-3.5" /> Activate
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                className="h-7 gap-1.5 border-amber-500/30 text-amber-700 hover:bg-amber-500/10 dark:text-amber-400"
                                onClick={() => { setPendingIds(ids); setClearSelection(() => clear); setBulkAction('suspend'); }}
                            >
                                <ShieldBan className="size-3.5" /> Suspend
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                className="h-7 gap-1.5 border-red-500/30 text-red-600 hover:bg-red-500/10 dark:text-red-400"
                                onClick={() => { setPendingIds(ids); setClearSelection(() => clear); setBulkAction('delete'); }}
                            >
                                <Trash2 className="size-3.5" /> Delete
                            </Button>
                        </>
                    )}
                    renderMobileRow={(user) => (
                        <div className="flex items-center gap-3">
                            <Avatar className="size-9 shrink-0">
                                <AvatarImage src={user.avatar || undefined} />
                                <AvatarFallback className="text-[11px]">{initials(user.name)}</AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1 space-y-1">
                                <p className="truncate text-sm font-medium">{user.name}</p>
                                <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                                    <span className="rounded border border-border px-1.5 py-px text-[10px] capitalize text-muted-foreground">
                                        {String(user.role).replace(/_/g, ' ')}
                                    </span>
                                    <StatusBadge
                                        status={user.isActive ? 'active' : 'suspended'}
                                        domain="activeStatus"
                                    />
                                </div>
                            </div>
                            <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                        </div>
                    )}
                />
            )}

            <AlertDialog open={bulkAction !== null} onOpenChange={(open) => !open && setBulkAction(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {bulkAction === 'delete' ? 'Delete' : bulkAction === 'suspend' ? 'Suspend' : 'Activate'}
                            {' '}
                            {pendingIds.length} user{pendingIds.length === 1 ? '' : 's'}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {bulkAction === 'delete'
                                ? 'This permanently removes these accounts and cannot be undone.'
                                : 'This takes effect immediately on the selected accounts.'}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={bulkBusy}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={runBulk}
                            disabled={bulkBusy}
                            className={
                                bulkAction === 'delete'
                                    ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                                    : undefined
                            }
                        >
                            {bulkBusy ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                            Confirm
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
