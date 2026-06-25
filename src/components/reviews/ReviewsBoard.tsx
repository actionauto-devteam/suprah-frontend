"use client"

import * as React from "react"
import { Star, Plus, ExternalLink, EyeOff, Eye, Pencil, Trash2, MessageSquare } from "lucide-react"
import { useReviews, ReviewSource, DealershipReview } from "@/hooks/useReviews"
import { AddReviewModal } from "@/components/reviews/AddReviewModal"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const SOURCE_TABS: { key: ReviewSource | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "google", label: "Google" },
  { key: "yelp", label: "Yelp" },
  { key: "facebook", label: "Facebook" },
  { key: "other", label: "Other" },
]

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
  const [modalOpen, setModalOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<DealershipReview | null>(null)

  const { reviews, isLoading, summary, createReview, isCreating, updateReview, deleteReview } = useReviews({ source: sourceFilter })

  const handleSubmit = async (payload: Partial<DealershipReview>) => {
    if (editing) {
      await updateReview({ id: editing._id, ...payload })
    } else {
      await createReview(payload)
    }
    setModalOpen(false)
    setEditing(null)
  }

  return (
    <div className="flex flex-col h-full min-h-0 bg-zinc-50 dark:bg-zinc-950">
      {/* Header */}
      <div className="px-4 sm:px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shrink-0">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">Reviews</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <Stars rating={Math.round(summary.averageRating)} />
              <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">{summary.averageRating.toFixed(1)}</span>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">({summary.totalVisible} visible)</span>
            </div>
          </div>
          <Button onClick={() => { setEditing(null); setModalOpen(true) }} className="gap-1.5">
            <Plus className="h-4 w-4" />
            Add Review
          </Button>
        </div>

        {/* Source filter strip */}
        <div className="flex items-center gap-1 overflow-x-auto mt-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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
            <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">No reviews yet</p>
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
                  <span className="shrink-0 text-[10px] font-medium uppercase tracking-wide px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                    {r.source}
                  </span>
                </div>

                <p className="text-sm text-zinc-700 dark:text-zinc-300 line-clamp-4">{r.reviewText}</p>

                {r.response && (
                  <div className="mt-1 rounded-lg bg-zinc-50 dark:bg-zinc-800/60 p-2 text-xs text-zinc-600 dark:text-zinc-400">
                    <span className="font-semibold">Our response: </span>{r.response}
                  </div>
                )}

                <div className="flex items-center justify-between mt-auto pt-2">
                  <div className="flex items-center gap-1.5">
                    {r.reviewUrl && (
                      <a href={r.reviewUrl} target="_blank" rel="noopener noreferrer" className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200">
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
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
