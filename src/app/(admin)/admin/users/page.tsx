'use client';

import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from "@/providers/AuthProvider";
import { apiClient } from '@/lib/api-client';
import { columns, AdminUser } from "./columns"
import { Card, CardContent } from "@/components/ui/card"
import {
    flexRender,
    getCoreRowModel,
    useReactTable,
    getPaginationRowModel,
    getFilteredRowModel,
    getSortedRowModel,
    getFacetedRowModel,
    getFacetedUniqueValues,
    ColumnFiltersState,
    SortingState,
    RowSelectionState,
} from "@tanstack/react-table"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2, Users as UsersIcon, UserPlus, ShieldBan, ShieldCheck, Trash2, X } from 'lucide-react';
import { PageHeader, PageHeaderPill } from "@/components/admin/PageHeader"
import { AdminErrorState } from "@/components/admin/AdminErrorState"
import { DataTableFacetedFilter } from "@/components/admin/DataTableFacetedFilter"
import { BulkActionBar } from "@/components/admin/BulkActionBar"
import { TableLoadingSkeleton } from "@/components/shared/EmptyLoadingState"
import { runBulkSettled } from "@/lib/bulk-action-result"
import { exportRowsToCsv } from "@/lib/csv-export"
import { InviteUserDialog } from "@/components/admin/users/InviteUserDialog"
import { Download } from "lucide-react"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface PaginatedUsers {
    users: AdminUser[];
    pagination: any;
}

interface ApiResponse<T> {
    statusCode: number;
    data: T;
    message: string;
    success: boolean;
}

const STATUS_OPTIONS = [
    { label: "Active", value: "true" },
    { label: "Suspended", value: "false" },
];

export default function UsersPage() {
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
    const [globalFilter, setGlobalFilter] = useState("");
    const [sorting, setSorting] = useState<SortingState>([]);
    const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
    const [bulkAction, setBulkAction] = useState<"suspend" | "activate" | "delete" | null>(null);
    const [bulkBusy, setBulkBusy] = useState(false);
    const [inviteOpen, setInviteOpen] = useState(false);
    const { getToken } = useAuth();

    const { data, error, isError, isLoading, refetch } = useQuery({
        queryKey: ['admin-users'],
        queryFn: async () => {
            const token = await getToken();
            if (!token) {
                throw new Error("Unable to authenticate the user request.");
            }
            const res = await apiClient.get<ApiResponse<PaginatedUsers>>('/api/admin/users?limit=100', {
                headers: { Authorization: `Bearer ${token}` }
            });
            const payload = res.data?.data || (res.data as any);
            return Array.isArray(payload?.users) ? payload.users : [];
        }
    });

    const roleOptions = useMemo(() => {
        const roles = new Set((data ?? []).map((u: AdminUser) => u.role).filter(Boolean));
        return Array.from(roles).map((role) => ({ label: role, value: role }));
    }, [data]);

    const table = useReactTable({
        data: data || [],
        columns,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFacetedRowModel: getFacetedRowModel(),
        getFacetedUniqueValues: getFacetedUniqueValues(),
        onColumnFiltersChange: setColumnFilters,
        getFilteredRowModel: getFilteredRowModel(),
        onSortingChange: setSorting,
        onRowSelectionChange: setRowSelection,
        onGlobalFilterChange: setGlobalFilter,
        getRowId: (row) => row._id,
        globalFilterFn: (row, _columnId, filterValue: string) => {
            const q = filterValue.trim().toLowerCase();
            if (!q) return true;
            const user = row.original as AdminUser;
            return (
                user.name?.toLowerCase().includes(q) ||
                user.email?.toLowerCase().includes(q)
            );
        },
        state: {
            columnFilters,
            sorting,
            rowSelection,
            globalFilter,
        },
    })

    const selectedRows = table.getFilteredSelectedRowModel().rows;
    const selectedIds = selectedRows.map((r) => (r.original as AdminUser)._id);
    const isFiltered = columnFilters.length > 0 || globalFilter.length > 0;

    const runBulkAction = async () => {
        if (!bulkAction || selectedIds.length === 0) return;
        setBulkBusy(true);
        try {
            const token = await getToken();
            const headers = { Authorization: `Bearer ${token}` };
            if (bulkAction === "delete") {
                await runBulkSettled(
                    selectedIds,
                    (id) => apiClient.delete(`/api/admin/users/${id}`, { headers }),
                    { verb: "deleted", noun: "user" },
                );
            } else {
                await runBulkSettled(
                    selectedIds,
                    (id) => apiClient.post(`/api/admin/users/${id}/${bulkAction}`, {}, { headers }),
                    { verb: bulkAction === "suspend" ? "suspended" : "activated", noun: "user" },
                );
            }
            setRowSelection({});
            setBulkAction(null);
            refetch();
        } finally {
            setBulkBusy(false);
        }
    };

    if (isLoading) {
        return (
            <div className="space-y-6 container mx-auto">
                <TableLoadingSkeleton />
            </div>
        );
    }

    if (isError) {
        return (
            <div className="space-y-6 container mx-auto">
                <PageHeader title="Users" />
                <AdminErrorState
                    message={error instanceof Error ? error.message : "The user management request failed. Please try again."}
                    onRetry={() => refetch()}
                />
            </div>
        );
    }

    return (
        <div className="space-y-6 container mx-auto">
            <PageHeader
                title="Users"
                description="Every account on the platform, across all roles and dealerships."
                meta={<PageHeaderPill><UsersIcon className="h-3 w-3" /> {data?.length ?? 0} accounts</PageHeaderPill>}
                actions={
                    <>
                        <Button
                            variant="outline"
                            size="sm"
                            className="gap-1.5"
                            disabled={!data?.length}
                            onClick={() => exportRowsToCsv('users', data || [], [
                                { key: 'name', label: 'Name' },
                                { key: 'email', label: 'Email' },
                                { key: 'role', label: 'Role' },
                                { key: 'isActive', label: 'Active' },
                            ])}
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

            <Card className="gap-0 overflow-hidden rounded-lg border-border py-0 shadow-none">
                <CardContent className="space-y-3 p-4">
                    <div className="flex flex-wrap items-center gap-2 py-1">
                        <Input
                            placeholder="Search by name or email..."
                            value={globalFilter}
                            onChange={(event) => setGlobalFilter(event.target.value)}
                            className="max-w-sm w-full"
                        />
                        <DataTableFacetedFilter
                            column={table.getColumn("role")}
                            title="Role"
                            options={roleOptions}
                        />
                        <DataTableFacetedFilter
                            column={table.getColumn("isActive")}
                            title="Status"
                            options={STATUS_OPTIONS}
                        />
                        {isFiltered && (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 gap-1.5 px-2"
                                onClick={() => {
                                    setColumnFilters([]);
                                    setGlobalFilter("");
                                }}
                            >
                                Reset <X className="h-3.5 w-3.5" />
                            </Button>
                        )}
                    </div>

                    <BulkActionBar count={selectedIds.length} onClear={() => setRowSelection({})}>
                        <Button
                            size="sm"
                            variant="outline"
                            className="gap-1.5 border-emerald-500/30 text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-400"
                            onClick={() => setBulkAction("activate")}
                        >
                            <ShieldCheck className="h-3.5 w-3.5" /> Activate
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            className="gap-1.5 border-amber-500/30 text-amber-700 hover:bg-amber-500/10 dark:text-amber-400"
                            onClick={() => setBulkAction("suspend")}
                        >
                            <ShieldBan className="h-3.5 w-3.5" /> Suspend
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            className="gap-1.5 border-red-500/30 text-red-600 hover:bg-red-500/10"
                            onClick={() => setBulkAction("delete")}
                        >
                            <Trash2 className="h-3.5 w-3.5" /> Delete
                        </Button>
                    </BulkActionBar>

                    <div className="rounded-md border overflow-x-auto">
                        <Table>
                            <TableHeader>
                                {table.getHeaderGroups().map((headerGroup) => (
                                    <TableRow key={headerGroup.id}>
                                        {headerGroup.headers.map((header) => {
                                            return (
                                                <TableHead key={header.id} className="whitespace-nowrap">
                                                    {header.isPlaceholder
                                                        ? null
                                                        : flexRender(
                                                            header.column.columnDef.header,
                                                            header.getContext()
                                                        )}
                                                </TableHead>
                                            )
                                        })}
                                    </TableRow>
                                ))}
                            </TableHeader>
                            <TableBody>
                                {table.getRowModel().rows?.length ? (
                                    table.getRowModel().rows.map((row) => (
                                        <TableRow
                                            key={row.id}
                                            data-state={row.getIsSelected() && "selected"}
                                        >
                                            {row.getVisibleCells().map((cell) => (
                                                <TableCell key={cell.id}>
                                                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={columns.length} className="h-24 text-center">
                                            No results.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 py-4">
                        <span className="text-sm text-muted-foreground">
                            {selectedIds.length} of {table.getFilteredRowModel().rows.length} row(s) selected.
                        </span>
                        <div className="flex items-center space-x-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => table.previousPage()}
                                disabled={!table.getCanPreviousPage()}
                            >
                                Previous
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => table.nextPage()}
                                disabled={!table.getCanNextPage()}
                            >
                                Next
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <AlertDialog open={bulkAction !== null} onOpenChange={(open) => !open && setBulkAction(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {bulkAction === "delete" ? "Delete" : bulkAction === "suspend" ? "Suspend" : "Activate"} {selectedIds.length} user(s)
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {bulkAction === "delete"
                                ? "This will permanently remove these accounts from the database and cannot be undone."
                                : `This will ${bulkAction} the selected accounts immediately.`}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={bulkBusy}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={runBulkAction}
                            disabled={bulkBusy}
                            className={bulkAction === "delete" ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : undefined}
                        >
                            {bulkBusy ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Working...
                                </>
                            ) : (
                                "Confirm"
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
