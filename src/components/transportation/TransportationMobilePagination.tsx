"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  PER_PAGE_OPTIONS,
  type PerPageOption,
} from "@/hooks/useTransportationData";

interface TransportationMobilePaginationProps {
  label: "My Loads" | "Quotes" | "Board";
  currentPage: number;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  } | null;
  limit: PerPageOption;
  onPageChange: (page: number) => void | Promise<void>;
  onLimitChange: (limit: PerPageOption) => void | Promise<void>;
}

export function TransportationMobilePagination({
  label,
  currentPage,
  pagination,
  limit,
  onPageChange,
  onLimitChange,
}: TransportationMobilePaginationProps) {
  if (!pagination || pagination.total <= 0) return null;

  const totalPages = Math.max(1, pagination.totalPages || 1);
  const safePage = Math.min(Math.max(1, currentPage || 1), totalPages);
  const from = Math.min(
    (pagination.page - 1) * pagination.limit + 1,
    pagination.total,
  );
  const to = Math.min(
    pagination.page * pagination.limit,
    pagination.total,
  );

  const pageOptions = React.useMemo(
    () => Array.from({ length: totalPages }, (_, index) => index + 1),
    [totalPages],
  );

  const changePage = React.useCallback(
    (nextPage: number) => {
      const clamped = Math.min(Math.max(1, nextPage), totalPages);
      if (clamped !== safePage) void onPageChange(clamped);
    },
    [onPageChange, safePage, totalPages],
  );

  const navButtonClass = cn(
    "flex h-11 w-11 items-center justify-center rounded-xl border border-border/50 bg-card text-muted-foreground touch-manipulation",
    "transition-all duration-150 hover:border-primary/40 hover:bg-muted/60 hover:text-foreground",
    "disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-border/50 disabled:hover:bg-card disabled:hover:text-muted-foreground",
  );

  return (
    <div className="md:hidden rounded-2xl border border-border/50 bg-card/95 p-3 shadow-sm dark:bg-zinc-900/70">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-black uppercase tracking-[0.12em] text-primary/80">
            {label}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
            Showing <span className="font-bold text-foreground">{from}–{to}</span> of{" "}
            <span className="font-bold text-foreground">
              {pagination.total.toLocaleString()}
            </span>
          </p>
        </div>

        <div className="shrink-0 text-right">
          <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
            Per page
          </p>
          <Select
            value={`${limit}`}
            onValueChange={(value) =>
              void onLimitChange(Number(value) as PerPageOption)
            }
          >
            <SelectTrigger className="h-11 w-20 rounded-xl border-border/50 text-xs font-bold">
              <SelectValue placeholder={String(limit)} />
            </SelectTrigger>
            <SelectContent side="top" className="z-[100]">
              {PER_PAGE_OPTIONS.map((size) => (
                <SelectItem key={size} value={`${size}`} className="text-xs">
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-[auto_1fr_auto] items-center gap-2">
        <button
          type="button"
          className={navButtonClass}
          onClick={() => changePage(safePage - 1)}
          disabled={safePage === 1}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <div className="flex min-w-0 items-center justify-center gap-1.5 rounded-xl border border-border/50 bg-muted/30 px-2 py-1 dark:bg-zinc-950/40">
          <span className="shrink-0 text-[11px] font-bold uppercase tracking-[0.06em] text-muted-foreground">
            Page
          </span>
          <Select
            value={`${safePage}`}
            onValueChange={(value) => changePage(Number(value))}
          >
            <SelectTrigger
              aria-label={`Current page ${safePage} of ${totalPages}`}
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
            of {totalPages}
          </span>
        </div>

        <button
          type="button"
          className={navButtonClass}
          onClick={() => changePage(safePage + 1)}
          disabled={safePage === totalPages}
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}