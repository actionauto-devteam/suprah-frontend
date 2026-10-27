"use client"

import * as React from "react"
import { AlertTriangle, Ban, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { apiClient } from "@/lib/api-client"
import { userErrorMessage } from "@/lib/user-error"
import {
  LOAD_CANCELLATION_NOTE_MAX,
  LOAD_CANCELLATION_REASONS,
  LOAD_CANCELLATION_REASON_LABELS,
  canSubmitCancellation,
  type LoadCancellationReason,
} from "@/lib/load-cancellation"
import { cn } from "@/lib/utils"
import { useAuth } from "@/providers/AuthProvider"
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

/**
 * Staff cancel a load before pickup (Draft, Posted, Assigned or Accepted)
 * with a required reason. The load is kept as a read-only record. A driver
 * who has it gets an urgent alert to stop work; drivers who requested it are
 * told it was withdrawn. The server checks every rule again.
 * Styled like the Mark as Delivered window.
 */
export function CancelLoadDialog({
  open,
  onOpenChange,
  loadId,
  loadNumber,
  status,
  driverName,
  fromQuote,
  onCancelled,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  loadId: string
  loadNumber: string
  status: string
  /** The assigned driver, when there is one. */
  driverName?: string | null
  /** The load was made from a quote, which goes back to Pending. */
  fromQuote: boolean
  onCancelled: () => void
}) {
  const { getToken } = useAuth()
  const [reason, setReason] = React.useState<LoadCancellationReason | null>(null)
  const [note, setNote] = React.useState("")
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const trimmedNote = note.trim()
  const noteRequired = reason === "other"
  const canSubmit = canSubmitCancellation(reason, note) && !saving
  const hasDriver = Boolean(driverName)

  const reset = () => {
    setReason(null)
    setNote("")
    setError(null)
  }

  const close = (next: boolean) => {
    if (saving) return
    if (!next) reset()
    onOpenChange(next)
  }

  const submit = async () => {
    if (!canSubmit || !reason) return
    setSaving(true)
    setError(null)
    try {
      const token = await getToken()
      await apiClient.post(
        `/api/driver-tracking/loads/${encodeURIComponent(loadId)}/cancel`,
        { reason, note: trimmedNote },
        { headers: token ? { Authorization: `Bearer ${token}` } : {} },
      )
      toast.success(`Load ${loadNumber} is now Cancelled`)
      reset()
      onOpenChange(false)
      onCancelled()
    } catch (caught) {
      setError(userErrorMessage(caught, "cancel this load"))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="flex h-[calc(100dvh-1rem)] max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] flex-col gap-0 overflow-hidden p-0 sm:h-auto sm:max-h-[calc(100dvh-2rem)] sm:max-w-lg">
        <DialogHeader className="shrink-0 border-b border-border/60 bg-muted/20 px-4 py-4 text-left sm:px-6">
          <DialogTitle className="flex items-center gap-2 text-lg font-extrabold">
            <Ban className="size-5 text-red-500" aria-hidden="true" />
            Cancel Load
          </DialogTitle>
          <DialogDescription className="text-sm leading-relaxed">
            Use this when the shipment won&apos;t happen, for example when the customer cancelled. The load is kept
            as a record with your reason, so your team knows what happened.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overflow-x-hidden overscroll-contain px-4 py-4 sm:px-6">
          <div className="rounded-xl border border-border/70 bg-muted/20 px-3 py-2.5">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Tracking / Load #</p>
            <p className="mt-1 break-words font-mono text-sm font-bold [overflow-wrap:anywhere]">{loadNumber}</p>
            <p className="mt-1 text-xs text-muted-foreground">Current status: {status}</p>
          </div>

          {hasDriver && (
            <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-sm text-amber-800 dark:text-amber-300">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <span className="min-w-0 break-words">
                {driverName} has this load. They&apos;ll get an urgent alert to stop work on it and wait for your
                instructions.
              </span>
            </div>
          )}

          <fieldset disabled={saving}>
            <legend className="text-sm font-bold">
              Why are you cancelling it? <span className="font-normal text-muted-foreground">(required)</span>
            </legend>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {LOAD_CANCELLATION_REASONS.map((value) => {
                const selected = reason === value
                return (
                  <label
                    key={value}
                    className={cn(
                      "flex min-h-11 cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2.5 text-sm transition-colors",
                      "focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background",
                      selected
                        ? "border-red-500/50 bg-red-500/10 font-semibold text-foreground"
                        : "border-border bg-background hover:bg-muted/40",
                    )}
                  >
                    <input
                      type="radio"
                      name="cancel-load-reason"
                      value={value}
                      checked={selected}
                      onChange={() => {
                        setReason(value)
                        setError(null)
                      }}
                      className="size-4 shrink-0 accent-red-600"
                    />
                    <span className="min-w-0 break-words">{LOAD_CANCELLATION_REASON_LABELS[value]}</span>
                  </label>
                )
              })}
            </div>
          </fieldset>

          <div>
            <Label htmlFor="cancel-load-note" className="text-sm font-bold">
              Note{" "}
              <span className="font-normal text-muted-foreground">{noteRequired ? "(required for Other)" : "(optional)"}</span>
            </Label>
            <Textarea
              id="cancel-load-note"
              rows={3}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              maxLength={LOAD_CANCELLATION_NOTE_MAX}
              placeholder="Example: The customer found another carrier and called to cancel."
              className="mt-1.5 resize-none"
              disabled={saving}
              aria-required={noteRequired}
            />
            <p className="mt-1 flex justify-between gap-2 text-[11px] text-muted-foreground">
              <span>Only your team sees the note. Drivers see just the reason.</span>
              <span className="shrink-0 tabular-nums">
                {trimmedNote.length}/{LOAD_CANCELLATION_NOTE_MAX}
              </span>
            </p>
          </div>

          {error && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2.5 text-sm text-destructive"
            >
              <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <span className="min-w-0 break-words">{error}</span>
            </div>
          )}

          <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-3 py-2.5 text-xs leading-relaxed text-muted-foreground">
            <p className="font-bold text-foreground">What happens when you confirm</p>
            <ul className="mt-1.5 list-disc space-y-1 pl-4">
              <li>The load moves to Cancelled and can&apos;t be edited anymore. You can still delete it later.</li>
              {hasDriver && <li>The driver&apos;s location tracking for this load stops.</li>}
              <li>It leaves Available Loads, and drivers who requested it are told it was withdrawn.</li>
              {fromQuote && <li>The quote it came from goes back to Pending.</li>}
              <li>It is never paid out to a driver.</li>
            </ul>
          </div>
        </div>

        <DialogFooter className="shrink-0 border-t border-border/60 bg-muted/10 px-4 py-3 sm:px-6">
          <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={() => close(false)} disabled={saving} className="h-11 sm:min-w-28">
              Keep Load
            </Button>
            <Button
              type="button"
              onClick={() => void submit()}
              disabled={!canSubmit}
              className="h-11 bg-red-600 text-white hover:bg-red-700 sm:min-w-40"
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />
                  Cancelling load…
                </>
              ) : (
                <>
                  <Ban className="mr-2 size-4" aria-hidden="true" />
                  Cancel Load
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
