import * as React from "react"
import { ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight } from "lucide-react"

interface PaginationProps {
  currentPage: number
  totalPages: number
  totalItems: number
  onPageChange: (p: number) => void
  itemsPerPage: number
}

export const Pagination = React.memo(({ 
  currentPage, 
  totalPages, 
  totalItems, 
  onPageChange,
  itemsPerPage
}: PaginationProps) => {
  if (totalPages <= 1) return null
  
  const start = (currentPage - 1) * itemsPerPage + 1
  const end = Math.min(currentPage * itemsPerPage, totalItems)
  const pages: (number | '…')[] = []
  
  if (totalPages <= 7) { 
    for (let i = 1; i <= totalPages; i++) pages.push(i) 
  } else {
    pages.push(1)
    if (currentPage > 3) pages.push('…')
    for (let p = Math.max(2, currentPage - 1); p <= Math.min(totalPages - 1, currentPage + 1); p++) pages.push(p)
    if (currentPage < totalPages - 2) pages.push('…')
    pages.push(totalPages)
  }
  
  const btn = 'h-8 w-8 sm:h-6 sm:w-6 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 disabled:opacity-25 disabled:cursor-not-allowed transition-colors'

  return (
    <div className="flex items-center justify-between gap-2 px-3 sm:px-4 py-2.5 border-t border-border/40 shrink-0">
      <span className="hidden xs:inline text-[11px] text-muted-foreground/80 tabular-nums">{start}–{end} of {totalItems}</span>
      <div className="flex items-center gap-0.5 mx-auto xs:mx-0">
        <button onClick={() => onPageChange(1)} disabled={currentPage === 1} className={btn}><ChevronsLeft className="h-3.5 w-3.5 sm:h-3 sm:w-3" /></button>
        <button onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1} className={btn}><ChevronLeft className="h-3.5 w-3.5 sm:h-3 sm:w-3" /></button>
        {pages.map((p, i) => p === '…'
          ? <span key={`el${i}`} className="px-1 text-[11px] text-muted-foreground/80">…</span>
          : <button key={p} onClick={() => onPageChange(p as number)}
              className={`h-8 min-w-8 sm:h-6 sm:min-w-6 px-1.5 rounded-md text-[11px] font-medium transition-colors ${currentPage === p ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'}`}>{p}</button>
        )}
        <button onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages} className={btn}><ChevronRight className="h-3.5 w-3.5 sm:h-3 sm:w-3" /></button>
        <button onClick={() => onPageChange(totalPages)} disabled={currentPage === totalPages} className={btn}><ChevronsRight className="h-3.5 w-3.5 sm:h-3 sm:w-3" /></button>
      </div>
    </div>
  )
})

Pagination.displayName = "Pagination"
