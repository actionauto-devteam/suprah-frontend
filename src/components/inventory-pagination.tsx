"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

interface InventoryPaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  limit?: number
  onLimitChange?: (limit: number) => void
  totalCount?: number
}

export function InventoryPagination({
  currentPage,
  totalPages,
  onPageChange,
  limit,
  onLimitChange,
  totalCount,
}: InventoryPaginationProps) {
  const from = limit ? Math.min((currentPage - 1) * limit + 1, totalCount ?? 0) : 0
  const to = limit ? Math.min(currentPage * limit, totalCount ?? 0) : 0

  const navBtnCls = cn(
    "flex items-center justify-center h-8 w-8 rounded-xl border border-border/50 bg-card text-muted-foreground",
    "hover:border-primary/40 hover:text-foreground hover:bg-muted/60 transition-all duration-150",
    "disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-card disabled:hover:border-border/50 disabled:hover:text-muted-foreground",
  )

  return (
    <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
      {totalCount !== undefined && (
        <p className="order-2 text-xs text-muted-foreground sm:order-1">
          Showing{" "}
          <span className="font-semibold text-foreground">{from}–{to}</span>
          {" "}of{" "}
          <span className="font-semibold text-foreground">{totalCount.toLocaleString()}</span>
          {" "}vehicles
        </p>
      )}

      <div className="order-1 flex items-center gap-2.5 sm:order-2">
        {limit && onLimitChange && (
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground">Show</span>
            <Select value={`${limit}`} onValueChange={(v) => onLimitChange(Number(v))}>
              <SelectTrigger className="h-8 w-16 text-xs rounded-xl border-border/50">
                <SelectValue placeholder={String(limit)} />
              </SelectTrigger>
              <SelectContent side="top">
                {[12, 24, 36, 48].map((n) => (
                  <SelectItem key={n} value={`${n}`} className="text-xs">{n}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="flex items-center gap-1">
          <button
            className={cn(navBtnCls, "hidden lg:flex")}
            onClick={() => onPageChange(1)}
            disabled={currentPage === 1}
            aria-label="First page"
          >
            <ChevronsLeft className="h-3.5 w-3.5" />
          </button>
          <button
            className={navBtnCls}
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            aria-label="Previous page"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>

          <span className="flex h-8 min-w-18 items-center justify-center rounded-xl border border-border/50 bg-muted/40 px-2.5 text-xs font-semibold text-foreground dark:bg-zinc-900/60 tabular-nums">
            {currentPage} / {totalPages}
          </span>

          <button
            className={navBtnCls}
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            aria-label="Next page"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
          <button
            className={cn(navBtnCls, "hidden lg:flex")}
            onClick={() => onPageChange(totalPages)}
            disabled={currentPage === totalPages}
            aria-label="Last page"
          >
            <ChevronsRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}
