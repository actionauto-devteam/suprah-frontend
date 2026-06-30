"use client"

import * as React from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Star, MessageSquarePlus } from "lucide-react"
import { DealershipReview, ReviewSource } from "@/hooks/useReviews"
import { cn } from "@/lib/utils"

interface AddReviewModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (payload: Partial<DealershipReview>) => Promise<void>
  isSubmitting?: boolean
  initial?: DealershipReview | null
}

const SOURCES: { value: ReviewSource; label: string }[] = [
  { value: "google", label: "Google" },
  { value: "yelp", label: "Yelp" },
  { value: "facebook", label: "Facebook" },
  { value: "other", label: "Other" },
]

const todayInputDate = () => new Date().toISOString().slice(0, 10)

export function AddReviewModal({ open, onOpenChange, onSubmit, isSubmitting, initial }: AddReviewModalProps) {
  const [source, setSource] = React.useState<ReviewSource>("google")
  const [reviewerName, setReviewerName] = React.useState("")
  const [rating, setRating] = React.useState(5)
  const [reviewText, setReviewText] = React.useState("")
  const [reviewUrl, setReviewUrl] = React.useState("")
  const [reviewDate, setReviewDate] = React.useState("")
  const [response, setResponse] = React.useState("")

  React.useEffect(() => {
    if (!open) return
    setSource(initial?.source || "google")
    setReviewerName(initial?.reviewerName || "")
    setRating(initial?.rating || 5)
    setReviewText(initial?.reviewText || "")
    setReviewUrl(initial?.reviewUrl || "")
    setReviewDate(initial?.reviewDate ? initial.reviewDate.slice(0, 10) : todayInputDate())
    setResponse(initial?.response || "")
  }, [open, initial])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!reviewerName.trim() || !reviewText.trim()) return
    await onSubmit({
      source,
      reviewerName: reviewerName.trim(),
      rating,
      reviewText: reviewText.trim(),
      reviewUrl: reviewUrl.trim() || undefined,
      reviewDate: reviewDate || undefined,
      response: response.trim() || undefined,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-1rem)] sm:max-w-lg max-h-[90dvh] overflow-hidden p-0 gap-0 z-200">
        <div className="flex items-center gap-3 px-6 pt-5 pb-4 border-b border-border bg-muted/20">
          <DialogHeader>
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <MessageSquarePlus className="h-4 w-4 text-primary" />
              </div>
              <DialogTitle className="text-lg font-bold">
                {initial ? "Edit Review" : "Add a Review"}
              </DialogTitle>
            </div>
          </DialogHeader>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto max-h-[calc(90dvh-180px)] px-4 sm:px-6 py-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Source</Label>
              <Select value={source} onValueChange={(v) => setSource(v as ReviewSource)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-300">
                  {SOURCES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Reviewer name</Label>
              <Input value={reviewerName} onChange={(e) => setReviewerName(e.target.value)} placeholder="Jane Doe" required />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Rating</Label>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" onClick={() => setRating(n)} aria-label={`${n} star`}>
                  <Star className={cn("h-6 w-6", n <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground")} />
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Review text</Label>
            <Textarea value={reviewText} onChange={(e) => setReviewText(e.target.value)} rows={4} required className="resize-none" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Review date</Label>
              <Input type="date" value={reviewDate} onChange={(e) => setReviewDate(e.target.value)} max={todayInputDate()} />
              <p className="text-[11px] text-muted-foreground">Defaults to today — change only for backdated or imported reviews.</p>
            </div>
            <div className="space-y-1.5">
              <Label>Link (optional)</Label>
              <Input value={reviewUrl} onChange={(e) => setReviewUrl(e.target.value)} placeholder="https://…" />
              <p className="text-[11px] text-muted-foreground">Paste the original review URL so the source icon opens it.</p>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Our response (optional)</Label>
            <Textarea value={response} onChange={(e) => setResponse(e.target.value)} rows={2} className="resize-none" />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !reviewerName.trim() || !reviewText.trim()}>
              {isSubmitting ? "Saving…" : initial ? "Save Changes" : "Add Review"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
