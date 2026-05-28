"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react"
import { Button } from "@/components/ui/button"
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

  return (
    <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
      {totalCount !== undefined && (
        <p className="order-2 text-xs text-muted-foreground sm:order-1">
          Showing{" "}
          <span className="font-semibold text-foreground">{from}–{to}</span>{" "}
          of{" "}
          <span className="font-semibold text-foreground">{totalCount.toLocaleString()}</span>{" "}
          vehicles
        </p>
      )}

      <div className="order-1 flex items-center gap-3 sm:order-2">
        {limit && onLimitChange && (
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground">Show</span>
            <Select
              value={`${limit}`}
              onValueChange={(v) => onLimitChange(Number(v))}
            >
              <SelectTrigger className="h-7 w-16 text-xs">
                <SelectValue placeholder={String(limit)} />
              </SelectTrigger>
              <SelectContent side="top">
                {[12, 24, 36, 48].map((n) => (
                  <SelectItem key={n} value={`${n}`} className="text-xs">
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            className={cn("hidden h-7 w-7 border-border/60 p-0 lg:flex")}
            onClick={() => onPageChange(1)}
            disabled={currentPage === 1}
          >
            <ChevronsLeft className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 w-7 border-border/60 p-0"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>

          <span className="flex h-7 min-w-16 items-center justify-center rounded border border-border/60 bg-muted/30 px-2 text-xs font-medium dark:bg-zinc-900/40">
            {currentPage} / {totalPages}
          </span>

          <Button
            variant="outline"
            size="sm"
            className="h-7 w-7 border-border/60 p-0"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className={cn("hidden h-7 w-7 border-border/60 p-0 lg:flex")}
            onClick={() => onPageChange(totalPages)}
            disabled={currentPage === totalPages}
          >
            <ChevronsRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  )
}
