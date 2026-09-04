'use client';

import * as React from 'react';
import {
  ColumnDef, ColumnFiltersState, RowSelectionState, SortingState, Table as TanstackTable,
  flexRender, getCoreRowModel, getFacetedRowModel, getFacetedUniqueValues,
  getFilteredRowModel, getPaginationRowModel, getSortedRowModel, useReactTable,
} from '@tanstack/react-table';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Search, SlidersHorizontal, X, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  Rows3, Rows4, Inbox,
} from 'lucide-react';
import { EmptyState } from '@/components/admin/primitives';
import { cn } from '@/lib/utils';

export type Density = 'compact' | 'comfortable';

interface DataTableProps<TData> {
  columns: ColumnDef<TData, unknown>[];
  data: TData[];
  isLoading?: boolean;
  getRowId: (row: TData) => string;
  searchPlaceholder?: string;
  searchFn?: (row: TData, term: string) => boolean;
  filters?: (table: TanstackTable<TData>) => React.ReactNode;
  toolbarActions?: React.ReactNode;
  bulkBar?: (selectedIds: string[], clear: () => void) => React.ReactNode;
  onRowClick?: (row: TData) => void;
  renderMobileRow?: (row: TData) => React.ReactNode;
  emptyTitle?: string;
  emptyDescription?: string;
  storageKey?: string;
}

const PAGE_SIZES = [10, 25, 50, 100];

export function DataTable<TData>({
  columns, data, isLoading, getRowId, searchPlaceholder = 'Search…', searchFn,
  filters, toolbarActions, bulkBar, onRowClick, renderMobileRow,
  emptyTitle = 'Nothing here yet', emptyDescription, storageKey,
}: DataTableProps<TData>) {
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = React.useState('');
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({});
  const [density, setDensity] = React.useState<Density>('compact');

  React.useEffect(() => {
    if (!storageKey) return;
    try {
      const saved = localStorage.getItem(`admin-table-density:${storageKey}`);
      if (saved === 'compact' || saved === 'comfortable') setDensity(saved);
    } catch {
      // Density is a convenience only; ignore storage failures.
    }
  }, [storageKey]);

  const changeDensity = (next: Density) => {
    setDensity(next);
    if (!storageKey) return;
    try {
      localStorage.setItem(`admin-table-density:${storageKey}`, next);
    } catch {
      // Ignore storage failures.
    }
  };

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    onColumnFiltersChange: setColumnFilters,
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    onGlobalFilterChange: setGlobalFilter,
    getRowId: (row) => getRowId(row),
    globalFilterFn: searchFn
      ? (row, _id, value: string) => {
          const term = String(value).trim().toLowerCase();
          return term ? searchFn(row.original as TData, term) : true;
        }
      : 'includesString',
    state: { columnFilters, sorting, rowSelection, globalFilter },
    initialState: { pagination: { pageSize: 25 } },
  });

  const selectedIds = table.getFilteredSelectedRowModel().rows.map((row) => row.id);
  const activeFilters = columnFilters.length + (globalFilter ? 1 : 0);
  const rows = table.getRowModel().rows;
  const total = table.getFilteredRowModel().rows.length;
  const pageIndex = table.getState().pagination.pageIndex;
  const pageSize = table.getState().pagination.pageSize;
  const firstRow = total === 0 ? 0 : pageIndex * pageSize + 1;
  const lastRow = Math.min((pageIndex + 1) * pageSize, total);

  const hideableColumns = table.getAllColumns().filter((column) => column.getCanHide());

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2.5">
        <div className="relative min-w-0 flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={globalFilter}
            onChange={(event) => setGlobalFilter(event.target.value)}
            placeholder={searchPlaceholder}
            className="h-8 pl-8 text-sm"
          />
        </div>

        {filters?.(table)}

        {activeFilters > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1 px-2 text-xs text-muted-foreground"
            onClick={() => { setColumnFilters([]); setGlobalFilter(''); }}
          >
            Clear <X className="size-3" />
          </Button>
        )}

        <div className="ml-auto flex items-center gap-1.5">
          {toolbarActions}

          <div className="hidden items-center rounded-md border border-border sm:flex">
            <button
              type="button"
              onClick={() => changeDensity('compact')}
              aria-label="Compact rows"
              className={cn(
                'flex size-8 items-center justify-center rounded-l-md transition-colors',
                density === 'compact' ? 'bg-accent text-foreground' : 'text-muted-foreground hover:bg-accent/50',
              )}
            >
              <Rows4 className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={() => changeDensity('comfortable')}
              aria-label="Comfortable rows"
              className={cn(
                'flex size-8 items-center justify-center rounded-r-md transition-colors',
                density === 'comfortable' ? 'bg-accent text-foreground' : 'text-muted-foreground hover:bg-accent/50',
              )}
            >
              <Rows3 className="size-3.5" />
            </button>
          </div>

          {hideableColumns.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 gap-1.5">
                  <SlidersHorizontal className="size-3.5" />
                  <span className="hidden sm:inline">Columns</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuLabel className="text-xs">Visible columns</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {hideableColumns.map((column) => (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) => column.toggleVisibility(!!value)}
                    className="text-xs capitalize"
                  >
                    {column.id.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ')}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {selectedIds.length > 0 && bulkBar && (
        <div className="flex flex-wrap items-center gap-2 border-b border-border bg-accent/40 px-3 py-2">
          <span className="text-xs font-medium tabular-nums">
            {selectedIds.length} selected
          </span>
          <div className="flex flex-wrap items-center gap-1.5">
            {bulkBar(selectedIds, () => setRowSelection({}))}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto h-7 px-2 text-xs text-muted-foreground"
            onClick={() => setRowSelection({})}
          >
            Clear
          </Button>
        </div>
      )}

      {isLoading ? (
        <div className="divide-y divide-border">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="flex items-center gap-3 px-3 py-3">
              <Skeleton className="size-7 rounded-full" />
              <Skeleton className="h-3.5 flex-1" />
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="hidden h-3.5 w-20 sm:block" />
            </div>
          ))}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title={activeFilters > 0 ? 'No matches' : emptyTitle}
          description={activeFilters > 0 ? 'Try a different search or filter.' : emptyDescription}
        />
      ) : (
        <>
          {renderMobileRow && (
            <div className="divide-y divide-border md:hidden">
              {rows.map((row) => (
                <div
                  key={row.id}
                  onClick={onRowClick ? () => onRowClick(row.original as TData) : undefined}
                  className={cn('px-3 py-3', onRowClick && 'cursor-pointer active:bg-accent/50')}
                >
                  {renderMobileRow(row.original as TData)}
                </div>
              ))}
            </div>
          )}

          <div className={cn('overflow-x-auto', renderMobileRow && 'hidden md:block')}>
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-muted/60 backdrop-blur">
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id} className="hover:bg-transparent">
                    {headerGroup.headers.map((header) => (
                      <TableHead
                        key={header.id}
                        className="h-9 whitespace-nowrap text-xs font-medium text-muted-foreground"
                      >
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && 'selected'}
                    onClick={onRowClick ? () => onRowClick(row.original as TData) : undefined}
                    className={cn(
                      density === 'compact' ? 'h-11' : 'h-14',
                      onRowClick && 'cursor-pointer',
                    )}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell
                        key={cell.id}
                        onClick={
                          cell.column.id === 'select' || cell.column.id === 'actions'
                            ? (event) => event.stopPropagation()
                            : undefined
                        }
                        className={density === 'compact' ? 'py-1.5' : 'py-3'}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      {!isLoading && total > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-3 py-2">
          <p className="text-xs tabular-nums text-muted-foreground">
            {firstRow}–{lastRow} of {total}
            {selectedIds.length > 0 && ` · ${selectedIds.length} selected`}
          </p>

          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-1.5 sm:flex">
              <span className="text-xs text-muted-foreground">Rows</span>
              <select
                value={pageSize}
                onChange={(event) => table.setPageSize(Number(event.target.value))}
                className="h-7 rounded-md border border-border bg-background px-1.5 text-xs"
              >
                {PAGE_SIZES.map((size) => (
                  <option key={size} value={size}>{size}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-0.5">
              <Button
                variant="ghost" size="icon" className="size-7"
                onClick={() => table.setPageIndex(0)}
                disabled={!table.getCanPreviousPage()}
                aria-label="First page"
              >
                <ChevronsLeft className="size-3.5" />
              </Button>
              <Button
                variant="ghost" size="icon" className="size-7"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
                aria-label="Previous page"
              >
                <ChevronLeft className="size-3.5" />
              </Button>
              <span className="px-2 text-xs tabular-nums text-muted-foreground">
                {pageIndex + 1} / {table.getPageCount() || 1}
              </span>
              <Button
                variant="ghost" size="icon" className="size-7"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
                aria-label="Next page"
              >
                <ChevronRight className="size-3.5" />
              </Button>
              <Button
                variant="ghost" size="icon" className="size-7"
                onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                disabled={!table.getCanNextPage()}
                aria-label="Last page"
              >
                <ChevronsRight className="size-3.5" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
