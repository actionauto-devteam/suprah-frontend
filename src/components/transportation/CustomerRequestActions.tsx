"use client"

import * as React from "react"
import { AlertTriangle, Check, Loader2, X } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { DECLINE_REASON_MAX, customerRequestAnswers } from "@/lib/customer-request"
import { cn } from "@/lib/utils"
import type { Quote } from "@/types/transportation"

type Mode = "accept" | "decline"

/**
 * Accept and Decline for a customer's shipping request from the customer
 * portal. The server tells the customer; a decline can carry a short reason
 * they see. Staff quotes keep their existing actions only.
 */
export function CustomerRequestActions({
  quote,
  onSetStatus,
  compact = false,
  className,
}: {
  quote: Quote
  onSetStatus: (quoteId: string, status: "accepted" | "rejected", declineReason?: string) => Promise<unknown>
  /** Smaller buttons for the phone card. */
  compact?: boolean
  className?: string
}) {
  const allowed = customerRequestAnswers(quote)
  const [mode, setMode] = React.useState<Mode | null>(null)
  const [reason, setReason] = React.useState("")
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  if (!allowed.accept && !allowed.decline) return null

  const customer = `${quote.firstName ?? ""} ${quote.lastName ?? ""}`.trim() || "The customer"
  const vehicle = quote.vehicleName?.trim() || "the vehicle"
  const trimmed = reason.trim()
  const submitLabel = mode === "accept" ? "Accept Request" : "Decline Request"

  const open = (next: Mode) => {
    setMode(next)
    setReason("")
    setError(null)
  }

  const close = (nextOpen: boolean) => {
    if (saving || nextOpen) return
    setMode(null)
    setError(null)
  }

  const submit = async () => {
    if (!mode || saving || trimmed.length > DECLINE_REASON_MAX) return
    setSaving(true)
    setError(null)
    try {
      await onSetStatus(quote._id, mode === "accept" ? "accepted" : "rejected", mode === "decline" ? trimmed : undefined)
      toast.success(
        mode === "accept"
          ? `You accepted ${customer}'s request. They've been told.`
          : `You declined ${customer}'s request. They've been told.`,
      )
      setMode(null)
    } catch (caught) {
      setError(caught instanceof Error && caught.message ? caught.message : "We couldn't save your answer. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className={cn("grid gap-2", allowed.accept ? "grid-cols-2" : "grid-cols-1", className)}>
        {allowed.accept && (
          <Button
            type="button"
            variant="outline"
            onClick={() => open("accept")}
            className={cn(
              "gap-1.5 rounded-xl border-emerald-500/40 font-bold text-emerald-700 hover:bg-emerald-500/10 hover:text-emerald-800 dark:text-emerald-300",
              compact ? "h-10 text-xs" : "h-10 text-xs uppercase tracking-wider",
            )}
          >
            <Check className="size-4" aria-hidden="true" />
            Accept
          </Button>
        )}
        <Button
          type="button"
          variant="outline"
          onClick={() => open("decline")}
          className={cn(
            "gap-1.5 rounded-xl border-red-500/40 font-bold text-red-700 hover:bg-red-500/10 hover:text-red-800 dark:text-red-300",
            compact ? "h-10 text-xs" : "h-10 text-xs uppercase tracking-wider",
          )}
        >
          <X className="size-4" aria-hidden="true" />
          Decline
        </Button>
      </div>

      <Dialog open={mode !== null} onOpenChange={close}>
        <DialogContent className="flex h-auto max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] flex-col gap-0 overflow-hidden p-0 sm:max-h-[calc(100dvh-2rem)] sm:max-w-lg">
          <DialogHeader className="shrink-0 border-b border-border/60 bg-muted/20 px-4 py-4 text-left sm:px-6">
            <DialogTitle className="flex items-center gap-2 text-lg font-extrabold">
              {mode === "accept" ? (
                <Check className="size-5 text-emerald-500" aria-hidden="true" />
              ) : (
                <X className="size-5 text-red-500" aria-hidden="true" />
              )}
              {mode === "accept" ? "Accept this request?" : "Decline this request?"}
            </DialogTitle>
            <DialogDescription className="text-sm leading-relaxed">
              {mode === "accept"
                ? `${customer} will be told you accepted their shipping request for ${vehicle} and that you'll contact them to arrange the details.`
                : `${customer} will be told you declined their shipping request for ${vehicle}. It will show as Rejected in your Quotes.`}
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overflow-x-hidden px-4 py-4 sm:px-6">
            {mode === "decline" && (
              <div>
                <Label htmlFor={`decline-reason-${quote._id}`} className="text-sm font-bold">
                  Reason for the customer <span className="font-normal text-muted-foreground">(optional)</span>
                </Label>
                <Textarea
                  id={`decline-reason-${quote._id}`}
                  rows={3}
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  maxLength={DECLINE_REASON_MAX}
                  placeholder="Example: We don't ship to this area right now."
                  className="mt-1.5 resize-none"
                  disabled={saving}
                />
                <p className="mt-1 flex justify-between gap-2 text-[11px] text-muted-foreground">
                  <span>The customer sees this, so keep it short and polite.</span>
                  <span className="shrink-0 tabular-nums">
                    {trimmed.length}/{DECLINE_REASON_MAX}
                  </span>
                </p>
              </div>
            )}

            {mode === "accept" && (
              <p className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-3 py-2.5 text-xs leading-relaxed text-muted-foreground">
                When you&apos;re ready to ship, use Convert to Load. The customer is told again when it&apos;s booked.
              </p>
            )}

            {error && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2.5 text-sm text-destructive"
              >
                <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <span className="min-w-0 break-words">{error}</span>
              </div>
            )}
          </div>

          <DialogFooter className="shrink-0 border-t border-border/60 bg-muted/10 px-4 py-3 sm:px-6">
            <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" onClick={() => close(false)} disabled={saving} className="h-11 sm:min-w-28">
                {mode === "accept" ? "Not Now" : "Keep Request"}
              </Button>
              <Button
                type="button"
                onClick={() => void submit()}
                disabled={saving}
                className={cn(
                  "h-11 text-white sm:min-w-40",
                  mode === "accept" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700",
                )}
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />
                    Saving…
                  </>
                ) : (
                  submitLabel
                )}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
