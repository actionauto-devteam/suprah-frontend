"use client"

import * as React from "react"
import { Star, Plus, ExternalLink, EyeOff, Eye, Pencil, Trash2, MessageSquare, Search, X, ChevronLeft, ChevronRight, Reply } from "lucide-react"
import { useReviews, ReviewSource, ReviewSort, DealershipReview } from "@/hooks/useReviews"
import { AddReviewModal } from "@/components/reviews/AddReviewModal"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"

const SOURCE_TABS: { key: ReviewSource | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "google", label: "Google" },
  { key: "yelp", label: "Yelp" },
  { key: "facebook", label: "Facebook" },
  { key: "other", label: "Other" },
]

const SORT_OPTIONS: { value: ReviewSort; label: string }[] = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "rating_desc", label: "Highest rated" },
  { value: "rating_asc", label: "Lowest rated" },
]

const safeUrl = (url?: string) => {
  if (!url) return undefined
  return /^https?:\/\//i.test(url) ? url : `https://${url}`
}

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} className={cn("h-3.5 w-3.5", n <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30")} />
      ))}
    </div>
  )
}

export default function ReviewsBoard() {
  const [sourceFilter, setSourceFilter] = React.useState<ReviewSource | "all">("all")
  const [ratingFilter, setRatingFilter] = React.useState<number | "all">("all")
  const [sort, setSort] = React.useState<ReviewSort>("newest")
  const [search, setSearch] = React.useState("")
  const [debouncedSearch, setDebouncedSearch] = React.useState("")
  const [page, setPage] = React.useState(1)
  const [modalOpen, setModalOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<DealershipReview | null>(null)
  const [replyingId, setReplyingId] = React.useState<string | null>(null)
  const [replyDraft, setReplyDraft] = React.useState("")

  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300)
    return () => clearTimeout(t)
  }, [search])

  React.useEffect(() => {
    setPage(1)
  }, [sourceFilter, ratingFilter, sort, debouncedSearch])

  const { reviews, pages, summary, isLoading, createReview, isCreating, updateReview, deleteReview } = useReviews({
    page,
    source: sourceFilter,
    rating: ratingFilter,
    sort,
    search: debouncedSearch,
  })

  const handleSubmit = async (payload: Partial<DealershipReview>) => {
    if (editing) {
      await updateReview({ id: editing._id, ...payload })
    } else {
      await createReview(payload)
    }
    setModalOpen(false)
    setEditing(null)
  }

  const startReply = (r: DealershipReview) => {
    setReplyingId(r._id)
    setReplyDraft(r.response || "")
  }

  const saveReply = async (id: string) => {
    await updateReview({ id, response: replyDraft.trim() || undefined })
    setReplyingId(null)
    setReplyDraft("")
  }

  const activeFilterLabel = SOURCE_TABS.find((t) => t.key === sourceFilter)?.label

  return (
    <div className="flex flex-col h-full min-h-0 bg-zinc-50 dark:bg-zinc-950">
      {/* Header */}
      <div className="px-4 sm:px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shrink-0 space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">Reviews</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <Stars rating={Math.round(summary.averageRating)} />
              <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">{summary.averageRating.toFixed(1)}</span>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                ({summary.totalVisible} of {summary.totalReviews} visible)
              </span>
            </div>
          </div>
          <Button onClick={() => { setEditing(null); setModalOpen(true) }} className="gap-1.5">
            <Plus className="h-4 w-4" />
            Add Review
          </Button>
        </div>

        {/* Search + filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-45 max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search reviewer or text…"
              className="pl-8 pr-8 h-9"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <Select value={String(ratingFilter)} onValueChange={(v) => setRatingFilter(v === "all" ? "all" : Number(v))}>
            <SelectTrigger size="sm" className="h-9">
              <SelectValue placeholder="Rating" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All ratings</SelectItem>
              {[5, 4, 3, 2, 1].map((n) => (
                <SelectItem key={n} value={String(n)}>{n} star{n > 1 ? "s" : ""}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={sort} onValueChange={(v) => setSort(v as ReviewSort)}>
            <SelectTrigger size="sm" className="h-9">
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Source filter strip */}
        <div className="flex items-center gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {SOURCE_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setSourceFilter(tab.key)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors",
                sourceFilter === tab.key
                  ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900"
                  : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
              )}
            >
              {tab.label}
              {tab.key !== "all" && <span className="ml-1 opacity-60">({summary.bySource[tab.key] ?? 0})</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-40 rounded-xl bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
            ))}
          </div>
        ) : reviews.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
            <div className="h-14 w-14 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
              <MessageSquare className="h-6 w-6 text-zinc-400" />
            </div>
            <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
              {debouncedSearch || ratingFilter !== "all" || sourceFilter !== "all"
                ? `No ${activeFilterLabel !== "All" ? activeFilterLabel + " " : ""}reviews match your filters`
                : "No reviews yet"}
            </p>
            <p className="text-xs text-zinc-400 dark:text-zinc-500">Paste in a review from Google, Yelp, or Facebook to get started.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {reviews.map((r) => (
              <div
                key={r._id}
                className={cn(
                  "rounded-xl border p-4 flex flex-col gap-2 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800",
                  !r.isVisible && "opacity-50"
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-sm text-zinc-900 dark:text-zinc-50 truncate">{r.reviewerName}</p>
                    <Stars rating={r.rating} />
                  </div>
                  {safeUrl(r.reviewUrl) ? (
                    <a
                      href={safeUrl(r.reviewUrl)}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={`View original review on ${r.source}`}
                      className="shrink-0 flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                    >
                      {r.source}
                      <ExternalLink className="h-2.5 w-2.5" />
                    </a>
                  ) : (
                    <span className="shrink-0 text-[10px] font-medium uppercase tracking-wide px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                      {r.source}
                    </span>
                  )}
                </div>

                <p className="text-sm text-zinc-700 dark:text-zinc-300 line-clamp-4">{r.reviewText}</p>

                {replyingId === r._id ? (
                  <div className="mt-1 space-y-1.5">
                    <Textarea
                      value={replyDraft}
                      onChange={(e) => setReplyDraft(e.target.value)}
                      rows={2}
                      placeholder="Write a response…"
                      className="resize-none text-xs"
                      autoFocus
                    />
                    <div className="flex items-center justify-end gap-1.5">
                      <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setReplyingId(null)}>Cancel</Button>
                      <Button size="sm" className="h-7 px-2 text-xs" onClick={() => saveReply(r._id)}>Save</Button>
                    </div>
                  </div>
                ) : r.response ? (
                  <button onClick={() => startReply(r)} className="mt-1 rounded-lg bg-zinc-50 dark:bg-zinc-800/60 p-2 text-xs text-zinc-600 dark:text-zinc-400 text-left hover:bg-zinc-100 dark:hover:bg-zinc-800">
                    <span className="font-semibold">Our response: </span>{r.response}
                  </button>
                ) : (
                  <button onClick={() => startReply(r)} className="mt-1 flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 self-start">
                    <Reply className="h-3 w-3" /> Reply
                  </button>
                )}

                <div className="flex items-center justify-between mt-auto pt-2">
                  <div className="flex items-center gap-1.5">
                    {r.reviewDate && (
                      <span className="text-[11px] text-zinc-400">{new Date(r.reviewDate).toLocaleDateString()}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => { setEditing(r); setModalOpen(true) }} className="p-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => updateReview({ id: r._id, isVisible: !r.isVisible })} className="p-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500">
                      {r.isVisible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                    <button onClick={() => deleteReview(r._id)} className="p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-950/40 text-red-500">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {!isLoading && reviews.length > 0 && pages > 1 && (
          <div className="flex items-center justify-center gap-3 mt-6">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(p - 1, 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">Page {page} of {pages}</span>
            <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => setPage((p) => Math.min(p + 1, pages))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      <AddReviewModal
        open={modalOpen}
        onOpenChange={(o) => { setModalOpen(o); if (!o) setEditing(null) }}
        onSubmit={handleSubmit}
        isSubmitting={isCreating}
        initial={editing}
      />
    </div>
  )
}
