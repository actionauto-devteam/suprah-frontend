"use client"

import * as React from "react"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { trainingErrorMessage, trainingRequest, useDraftEvaluations } from "@/hooks/useAiTraining"
import { DRAFT_RATINGS, DRAFT_RATING_TAGS, type DraftEvaluation, type DraftRating } from "@/lib/aiTraining"
import { formatHubDate } from "./ShadowStatusBadge"

export function DraftEvaluationSection({ draftId, getToken }: { draftId: string; getToken: () => Promise<string | null> }) {
  const { data, loading, error, reload } = useDraftEvaluations(getToken, draftId)
  const mine = data?.evaluations.find((evaluation) => evaluation.isMine)
  const others = data?.evaluations.filter((evaluation) => !evaluation.isMine) || []
  const [rating, setRating] = React.useState<DraftRating | "">("")
  const [correctedReply, setCorrectedReply] = React.useState("")
  const [tags, setTags] = React.useState<string[]>([])
  const [saving, setSaving] = React.useState(false)

  React.useEffect(() => {
    setRating(mine?.rating || "")
    setCorrectedReply(mine?.correctedReply || "")
    setTags(mine?.reasonTags || [])
  }, [mine?.id, mine?.rating, mine?.correctedReply, mine?.reasonTags])

  const toggleTag = (tag: string) => setTags((current) => current.includes(tag) ? current.filter((value) => value !== tag) : [...current, tag])

  const save = async () => {
    if (!rating) return
    setSaving(true)
    try {
      await trainingRequest<DraftEvaluation>(getToken, "put", `/api/crm/ai-training/evaluations/${draftId}`, {
        rating,
        correctedReply: correctedReply.trim() || undefined,
        reasonTags: tags,
      })
      toast.success("Rating saved")
      reload()
    } catch (err) {
      toast.error("Could not save the rating", { description: trainingErrorMessage(err, "Please try again.") })
    } finally {
      setSaving(false)
    }
  }

  return (
    <section aria-labelledby="draft-rating-heading" className="space-y-3">
      <h3 id="draft-rating-heading" className="text-xs font-bold">Rate this draft</h3>
      {error ? (
        <p role="alert" className="text-xs text-red-600 dark:text-red-400">{error}</p>
      ) : loading && !data ? (
        <div className="h-16 rounded-xl bg-muted/50 animate-pulse" aria-busy="true" />
      ) : (
        <>
          <div role="radiogroup" aria-label="Draft rating" className="flex flex-wrap gap-1.5">
            {DRAFT_RATINGS.map((option) => (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={rating === option.value}
                onClick={() => setRating(option.value)}
                className={cn(
                  "rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition-colors",
                  rating === option.value ? "border-primary bg-primary/10 text-primary" : "border-border/50 text-muted-foreground hover:bg-muted/50",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5" aria-label="What was wrong">
            {DRAFT_RATING_TAGS.map((tag) => (
              <label key={tag.value} className="flex items-center gap-1 rounded-md border border-border/40 px-2 py-0.5 text-[10px] text-muted-foreground">
                <input type="checkbox" checked={tags.includes(tag.value)} onChange={() => toggleTag(tag.value)} />
                {tag.label}
              </label>
            ))}
          </div>
          <Textarea
            aria-label="Corrected reply"
            value={correctedReply}
            onChange={(event) => setCorrectedReply(event.target.value)}
            maxLength={1000}
            rows={3}
            placeholder="Optional: how Alex should have replied"
            className="resize-none text-sm"
          />
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] text-muted-foreground">Ratings are private to managers and admins and kept for one year. They do not change Alex.</p>
            <Button size="sm" onClick={save} disabled={!rating || saving}>
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : mine ? "Update rating" : "Save rating"}
            </Button>
          </div>
          {others.length > 0 && (
            <ul aria-label="Other ratings" className="space-y-1.5">
              {others.map((evaluation) => (
                <li key={evaluation.id} className="rounded-lg border border-border/40 p-2 text-[11px]">
                  <span className="font-semibold">{evaluation.evaluatorName || "Reviewer"}</span>
                  {" · "}{DRAFT_RATINGS.find((option) => option.value === evaluation.rating)?.label || evaluation.rating}
                  {" · "}<span className="text-muted-foreground">{formatHubDate(evaluation.updatedAt)}</span>
                  {evaluation.correctedReply && <p className="mt-1 whitespace-pre-wrap break-words text-muted-foreground">{evaluation.correctedReply}</p>}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  )
}
