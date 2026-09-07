"use client";

import * as React from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface InventoryPaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  limit?: number;
  onLimitChange?: (limit: number) => void;
  totalCount?: number;
}

const PAGE_SIZE_OPTIONS = [12, 24, 36, 48] as const;

export function InventoryPagination({
  currentPage,
  totalPages,
  onPageChange,
  limit,
  onLimitChange,
  totalCount,
}: InventoryPaginationProps) {
  const safeTotalPages = Math.max(1, totalPages || 1);
  const safeCurrentPage = Math.min(Math.max(1, currentPage || 1), safeTotalPages);
  const from =
    limit && totalCount
      ? Math.min((safeCurrentPage - 1) * limit + 1, totalCount)
      : 0;
  const to =
    limit && totalCount
      ? Math.min(safeCurrentPage * limit, totalCount)
      : 0;

  const changePage = React.useCallback(
    (nextPage: number) => {
      const clamped = Math.min(Math.max(1, nextPage), safeTotalPages);
      if (clamped !== safeCurrentPage) onPageChange(clamped);
    },
    [onPageChange, safeCurrentPage, safeTotalPages],
  );

  const navBtnCls = cn(
    "flex items-center justify-center h-11 w-11 rounded-xl border border-border/50 bg-card text-muted-foreground touch-manipulation",
    "hover:border-primary/40 hover:text-foreground hover:bg-muted/60 transition-all duration-150",
    "disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-card disabled:hover:border-border/50 disabled:hover:text-muted-foreground",
  );

  const pageOptions = React.useMemo(
    () => Array.from({ length: safeTotalPages }, (_, index) => index + 1),
    [safeTotalPages],
  );

  return (
    <>
      {/* Mobile: compact, explicit position + fast page jump. */}
      <div className="md:hidden rounded-2xl border border-border/50 bg-card/95 p-3 shadow-sm dark:bg-zinc-900/70">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-[0.12em] text-primary/80">
              Inventory Position
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
              {totalCount !== undefined ? (
                <>
                  Showing <span className="font-bold text-foreground">{from}–{to}</span> of{" "}
                  <span className="font-bold text-foreground">{totalCount.toLocaleString()}</span>
                </>
              ) : (
                <>Page {safeCurrentPage} of {safeTotalPages}</>
              )}
            </p>
          </div>

          {limit && onLimitChange && (
            <div className="shrink-0 text-right">
              <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
                Per page
              </p>
              <Select value={`${limit}`} onValueChange={(value) => onLimitChange(Number(value))}>
                <SelectTrigger className="h-11 w-20 rounded-xl border-border/50 text-xs font-bold">
                  <SelectValue placeholder={String(limit)} />
                </SelectTrigger>
                <SelectContent side="top" className="z-[100]">
                  {PAGE_SIZE_OPTIONS.map((size) => (
                    <SelectItem key={size} value={`${size}`} className="text-xs">
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <div className="mt-3 grid grid-cols-[auto_1fr_auto] items-center gap-2">
          <button
            className={navBtnCls}
            onClick={() => changePage(safeCurrentPage - 1)}
            disabled={safeCurrentPage === 1}
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <div className="flex min-w-0 items-center justify-center gap-1.5 rounded-xl border border-border/50 bg-muted/30 px-2 py-1 dark:bg-zinc-950/40">
            <span className="shrink-0 text-[11px] font-bold uppercase tracking-[0.06em] text-muted-foreground">
              Page
            </span>
            <Select
              value={`${safeCurrentPage}`}
              onValueChange={(value) => changePage(Number(value))}
            >
              <SelectTrigger
                aria-label={`Current page ${safeCurrentPage} of ${safeTotalPages}`}
                className="h-11 w-16 rounded-lg border-primary/25 bg-primary/8 px-2 text-xs font-black text-primary shadow-none"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent side="top" className="z-[100] max-h-64">
                {pageOptions.map((pageNumber) => (
                  <SelectItem
                    key={pageNumber}
                    value={`${pageNumber}`}
                    className="text-xs tabular-nums"
                  >
                    {pageNumber}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="shrink-0 text-xs font-semibold text-muted-foreground tabular-nums">
              of {safeTotalPages}
            </span>
          </div>

          <button
            className={navBtnCls}
            onClick={() => changePage(safeCurrentPage + 1)}
            disabled={safeCurrentPage === safeTotalPages}
            aria-label="Next page"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Desktop/tablet: preserve the existing interaction model. */}
      <div className="hidden items-center justify-between gap-3 md:flex">
        {totalCount !== undefined && (
          <p className="text-xs text-muted-foreground">
            Showing{" "}
            <span className="font-semibold text-foreground">{from}–{to}</span>
            {" "}of{" "}
            <span className="font-semibold text-foreground">{totalCount.toLocaleString()}</span>
            {" "}vehicles
          </p>
        )}

        <div className="flex items-center gap-2.5">
          {limit && onLimitChange && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground">Show</span>
              <Select value={`${limit}`} onValueChange={(value) => onLimitChange(Number(value))}>
                <SelectTrigger className="h-8 w-16 rounded-xl border-border/50 text-xs">
                  <SelectValue placeholder={String(limit)} />
                </SelectTrigger>
                <SelectContent side="top">
                  {PAGE_SIZE_OPTIONS.map((size) => (
                    <SelectItem key={size} value={`${size}`} className="text-xs">
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex items-center gap-1">
            <button
              className={cn(navBtnCls, "hidden lg:flex h-8 w-8")}
              onClick={() => changePage(1)}
              disabled={safeCurrentPage === 1}
              aria-label="First page"
            >
              <ChevronsLeft className="h-3.5 w-3.5" />
            </button>
            <button
              className={cn(navBtnCls, "h-8 w-8")}
              onClick={() => changePage(safeCurrentPage - 1)}
              disabled={safeCurrentPage === 1}
              aria-label="Previous page"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>

            <span className="flex h-8 min-w-18 items-center justify-center rounded-xl border border-border/50 bg-muted/40 px-2.5 text-xs font-semibold text-foreground dark:bg-zinc-900/60 tabular-nums">
              {safeCurrentPage} / {safeTotalPages}
            </span>

            <button
              className={cn(navBtnCls, "h-8 w-8")}
              onClick={() => changePage(safeCurrentPage + 1)}
              disabled={safeCurrentPage === safeTotalPages}
              aria-label="Next page"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
            <button
              className={cn(navBtnCls, "hidden lg:flex h-8 w-8")}
              onClick={() => changePage(safeTotalPages)}
              disabled={safeCurrentPage === safeTotalPages}
              aria-label="Last page"
            >
              <ChevronsRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}