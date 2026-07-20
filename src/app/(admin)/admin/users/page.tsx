'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from "@/providers/AuthProvider";
import { apiClient } from '@/lib/api-client';
import { columns } from "./columns"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
    flexRender,
    getCoreRowModel,
    useReactTable,
    getPaginationRowModel,
    getFilteredRowModel,
    ColumnFiltersState,
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
import { AlertCircle, Loader2, RefreshCw } from 'lucide-react';

interface PaginatedUsers {
    users: any[];
    pagination: any;
}

interface ApiResponse<T> {
    statusCode: number;
    data: T;
    message: string;
    success: boolean;
}

export default function UsersPage() {
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
    const { getToken } = useAuth();

    // Fetch Users
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

    const table = useReactTable({
        data: data || [],
        columns,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        onColumnFiltersChange: setColumnFilters,
        getFilteredRowModel: getFilteredRowModel(),
        state: {
            columnFilters,
        },
    })

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (isError) {
        return (
            <div className="container mx-auto flex min-h-[60vh] items-center justify-center">
                <Card className="max-w-md border-destructive/30 bg-destructive/5">
                    <CardHeader className="text-center">
                        <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
                            <AlertCircle className="h-5 w-5 text-destructive" />
                        </div>
                        <CardTitle>Unable to Load Users</CardTitle>
                        <CardDescription>
                            {error instanceof Error
                                ? error.message
                                : "The user management request failed. Please try again."}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex justify-center">
                        <Button onClick={() => refetch()} className="gap-2">
                            <RefreshCw className="h-4 w-4" />
                            Retry
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-6 container mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Users</h2>
                    <p className="text-muted-foreground text-sm sm:text-base">
                        Manage user accounts, roles, and access permissions.
                    </p>
                </div>
                <div className="flex items-center space-x-2 shrink-0">
                    <Button variant="outline" size="sm">Invite User</Button>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>All Users</CardTitle>
                    <CardDescription>
                        A directory of all users within the system.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center py-4">
                        <Input
                            placeholder="Filter by name..."
                            value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
                            onChange={(event) =>
                                table.getColumn("name")?.setFilterValue(event.target.value)
                            }
                            className="max-w-sm w-full"
                        />
                    </div>
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
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-end gap-3 py-4">
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
        </div>
    )
}
