import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  itemsPerPage: number;
}

export const Pagination = React.memo(
  ({
    currentPage,
    totalPages,
    totalItems,
    onPageChange,
    itemsPerPage,
  }: PaginationProps) => {
    if (totalPages <= 1) return null;

    const safeCurrentPage = Math.min(Math.max(currentPage, 1), totalPages);
    const start = (safeCurrentPage - 1) * itemsPerPage + 1;
    const end = Math.min(safeCurrentPage * itemsPerPage, totalItems);

    const goToPage = (page: number) => {
      const nextPage = Math.min(Math.max(page, 1), totalPages);

      if (nextPage !== safeCurrentPage) {
        onPageChange(nextPage);
      }
    };

    return (
      <nav
        className="shrink-0 border-t border-border/40 bg-background/95 px-2 py-2 backdrop-blur"
        aria-label="Lead list pagination"
      >
        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
          <button
            type="button"
            onClick={() => goToPage(safeCurrentPage - 1)}
            disabled={safeCurrentPage === 1}
            className="flex h-11 min-w-0 touch-manipulation items-center justify-center gap-1.5 rounded-lg border border-border/60 px-3 text-[12px] font-semibold text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-30"
            aria-label="Go to previous page"
          >
            <ChevronLeft className="h-4 w-4 shrink-0" />
            <span className="truncate">Previous</span>
          </button>

          <div className="min-w-[76px] shrink-0 text-center">
            <p className="whitespace-nowrap text-[12px] font-bold tabular-nums text-foreground">
              {safeCurrentPage} / {totalPages}
            </p>

            <p className="mt-0.5 whitespace-nowrap text-[9px] tabular-nums text-muted-foreground">
              {start}–{end} of {totalItems}
            </p>
          </div>

          <button
            type="button"
            onClick={() => goToPage(safeCurrentPage + 1)}
            disabled={safeCurrentPage === totalPages}
            className="flex h-11 min-w-0 touch-manipulation items-center justify-center gap-1.5 rounded-lg border border-border/60 px-3 text-[12px] font-semibold text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-30"
            aria-label="Go to next page"
          >
            <span className="truncate">Next</span>
            <ChevronRight className="h-4 w-4 shrink-0" />
          </button>
        </div>
      </nav>
    );
  },
);

Pagination.displayName = "Pagination";
