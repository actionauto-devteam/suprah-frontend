'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from "@/providers/AuthProvider";
import { apiClient } from '@/lib/api-client';
import { columns } from "./columns"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2 } from 'lucide-react'; // Ensure Loader2 is imported if not already
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

interface PaginatedOrgs {
    organizations: any[];
    pagination: any;
}

interface ApiResponse<T> {
    statusCode: number;
    data: T;
    message: string;
    success: boolean;
}

export default function OrganizationsPage() {
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
    const { getToken } = useAuth();

    // Fetch Organizations
    const { data, isLoading: isLoadingTable } = useQuery({
        queryKey: ['admin-orgs'],
        queryFn: async () => {
            const token = await getToken();
            // We can support server-side pagination later, for now client-side is fine for < 100 orgs
            const res = await apiClient.get<ApiResponse<PaginatedOrgs>>('/api/admin/organizations?limit=100', {
                headers: { Authorization: `Bearer ${token}` }
            });
            return res.data?.data?.organizations || [];
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

    if (isLoadingTable) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6 container mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Organizations</h2>
                    <p className="text-muted-foreground text-sm sm:text-base">
                        Manage all dealership organizations and their subscription status.
                    </p>
                </div>
                <div className="flex items-center space-x-2 shrink-0">
                    <Button variant="outline" size="sm">Export CSV</Button>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>All Organizations</CardTitle>
                    <CardDescription>
                        A list of all registered organizations on the platform.
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
                                            {isLoadingTable ? (
                                                <div className="flex justify-center items-center py-4">
                                                    <Loader2 className="animate-spin h-6 w-6 text-muted-foreground" />
                                                </div>
                                            ) : "No results."}
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 py-4">
                        <div className="text-sm text-muted-foreground">
                            {table.getFilteredSelectedRowModel().rows.length} of{" "}
                            {table.getFilteredRowModel().rows.length} row(s) selected.
                        </div>
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
