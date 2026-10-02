"use client"

import * as React from "react"
import { AlertTriangle, Camera, CheckCircle2, ImageIcon, Loader2, PackageCheck, X } from "lucide-react"
import { toast } from "sonner"
import { apiClient } from "@/lib/api-client"
import { userErrorMessage } from "@/lib/user-error"
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

const REASON_MIN = 3
const REASON_MAX = 500
const NOT_PICKED_UP = new Set(["Assigned", "Accepted"])
const PHOTO_TYPES = "image/jpeg,image/jpg,image/png"

/**
 * Dispatch override: the load's responsible dispatcher or an organization
 * admin marks an active load Delivered when the driver can't complete it in
 * the app. A reason is required; a delivery photo is optional (a photo the
 * driver already uploaded is kept). The driver isn't notified.
 * Styled like the driver's Complete Delivery window.
 */
export function MarkDeliveredDialog({
  open,
  onOpenChange,
  loadId,
  loadNumber,
  status,
  hasDriverPhoto,
  onDelivered,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  loadId: string
  loadNumber: string
  status: string
  /** The driver already uploaded a delivery photo, which is kept. */
  hasDriverPhoto: boolean
  onDelivered: () => void
}) {
  const { getToken } = useAuth()
  const [reason, setReason] = React.useState("")
  const [photo, setPhoto] = React.useState<File | null>(null)
  const [preview, setPreview] = React.useState<string | null>(null)
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const cameraRef = React.useRef<HTMLInputElement>(null)
  const galleryRef = React.useRef<HTMLInputElement>(null)
  const trimmed = reason.trim()
  const canSubmit = trimmed.length >= REASON_MIN && trimmed.length <= REASON_MAX && !saving

  // Free the preview image when it's replaced or the window goes away.
  React.useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview)
    },
    [preview],
  )

  const clearPhoto = () => {
    setPhoto(null)
    setPreview(null)
  }

  const reset = () => {
    setReason("")
    setError(null)
    clearPhoto()
  }

  const close = (next: boolean) => {
    if (saving) return
    if (!next) reset()
    onOpenChange(next)
  }

  const onPhotoChosen = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextPhoto = event.target.files?.[0]
    event.target.value = ""
    if (!nextPhoto) return
    setPhoto(nextPhoto)
    setPreview(URL.createObjectURL(nextPhoto))
    setError(null)
  }

  const submit = async () => {
    if (!canSubmit) return
    setSaving(true)
    setError(null)
    try {
      const token = await getToken()
      const form = new FormData()
      form.append("reason", trimmed)
      if (photo && !hasDriverPhoto) form.append("proof", photo)
      await apiClient.post(`/api/driver-tracking/loads/${encodeURIComponent(loadId)}/mark-delivered`, form, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      toast.success(`Load ${loadNumber} is now Delivered`)
      reset()
      onOpenChange(false)
      onDelivered()
    } catch (caught) {
      setError(userErrorMessage(caught, "mark this load as delivered"))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="flex h-[calc(100dvh-1rem)] max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] flex-col gap-0 overflow-hidden p-0 sm:h-auto sm:max-h-[calc(100dvh-2rem)] sm:max-w-lg">
        <DialogHeader className="shrink-0 border-b border-border/60 bg-muted/20 px-4 py-4 text-left sm:px-6">
          <DialogTitle className="flex items-center gap-2 text-lg font-extrabold">
            <PackageCheck className="size-5 text-emerald-500" />
            Mark as Delivered
          </DialogTitle>
          <DialogDescription className="text-sm leading-relaxed">
            Finish this delivery for the driver. Use it when the driver can&apos;t complete the delivery in the app,
            for example if their phone broke or they had no signal.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6">
          <div className="rounded-xl border border-border/70 bg-muted/20 px-3 py-2.5">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Tracking / Load #</p>
            <p className="mt-1 break-words font-mono text-sm font-bold [overflow-wrap:anywhere]">{loadNumber}</p>
            <p className="mt-1 text-xs text-muted-foreground">Current status: {status}</p>
          </div>

          {NOT_PICKED_UP.has(status) && (
            <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-sm text-amber-800 dark:text-amber-300">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              <span>
                The driver hasn&apos;t marked this load as picked up in the app yet. Only continue if you know the
                vehicles were delivered.
              </span>
            </div>
          )}

          <div>
            <Label htmlFor="mark-delivered-reason" className="text-sm font-bold">
              Why are you marking it delivered? <span className="font-normal text-muted-foreground">(required)</span>
            </Label>
            <Textarea
              id="mark-delivered-reason"
              rows={3}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              maxLength={REASON_MAX}
              placeholder="Example: The driver's phone broke. The dealership called to confirm all vehicles arrived."
              className="mt-1.5 resize-none"
              disabled={saving}
            />
            <p className="mt-1 flex justify-between gap-2 text-[11px] text-muted-foreground">
              <span>Saved on the load with your name, so your team knows what happened.</span>
              <span className="shrink-0 tabular-nums">
                {trimmed.length}/{REASON_MAX}
              </span>
            </p>
          </div>

          <div>
            <p className="text-sm font-bold">
              Delivery Photo <span className="font-normal text-muted-foreground">(optional)</span>
            </p>
            {hasDriverPhoto ? (
              <p className="mt-1.5 rounded-xl border border-border/70 bg-muted/20 px-3 py-2.5 text-xs leading-relaxed text-muted-foreground">
                The driver already uploaded a delivery photo. It stays on the load, so you don&apos;t need to add one.
              </p>
            ) : (
              <>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Add one if the dealership or customer sent you a photo of the delivered vehicles.
                </p>
                <input
                  ref={cameraRef}
                  type="file"
                  accept={PHOTO_TYPES}
                  capture="environment"
                  className="hidden"
                  onChange={onPhotoChosen}
                />
                <input ref={galleryRef} type="file" accept={PHOTO_TYPES} className="hidden" onChange={onPhotoChosen} />
                {!preview ? (
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => cameraRef.current?.click()}
                      disabled={saving}
                      className="min-h-28 rounded-xl border-2 border-dashed border-primary/35 bg-primary/5 p-4 text-center transition-colors hover:border-primary/60 hover:bg-primary/10 disabled:opacity-60"
                    >
                      <Camera className="mx-auto size-7 text-primary" />
                      <p className="mt-2 text-sm font-bold">Take Photo</p>
                      <p className="mt-1 text-xs text-muted-foreground">Use the device camera</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => galleryRef.current?.click()}
                      disabled={saving}
                      className="min-h-28 rounded-xl border-2 border-dashed border-border bg-muted/20 p-4 text-center transition-colors hover:border-primary/40 hover:bg-muted/40 disabled:opacity-60"
                    >
                      <ImageIcon className="mx-auto size-7 text-muted-foreground" />
                      <p className="mt-2 text-sm font-bold">Choose Photo</p>
                      <p className="mt-1 text-xs text-muted-foreground">Select from your files</p>
                    </button>
                  </div>
                ) : (
                  <div className="mt-2 space-y-2">
                    <div className="overflow-hidden rounded-xl border border-border bg-muted/20">
                      {/* eslint-disable-next-line @next/next/no-img-element -- local preview of a file that isn't uploaded yet */}
                      <img src={preview} alt="Delivery photo preview" className="max-h-72 w-full object-contain" />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <Button type="button" variant="outline" className="h-11" onClick={() => cameraRef.current?.click()} disabled={saving}>
                        <Camera className="mr-2 size-4" /> Retake
                      </Button>
                      <Button type="button" variant="outline" className="h-11" onClick={() => galleryRef.current?.click()} disabled={saving}>
                        <ImageIcon className="mr-2 size-4" /> Change
                      </Button>
                      <Button type="button" variant="outline" className="h-11" onClick={clearPhoto} disabled={saving}>
                        <X className="mr-2 size-4" /> Remove
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-3 py-2.5 text-xs leading-relaxed text-muted-foreground">
            <p className="font-bold text-foreground">What happens when you confirm</p>
            <ul className="mt-1.5 list-disc space-y-1 pl-4">
              <li>The load moves to Delivered right away.</li>
              <li>The driver&apos;s location tracking for this load stops.</li>
              <li>Vehicles from your inventory go back to Ready for Sale.</li>
              <li>The load can be paid out to the driver.</li>
              <li>The driver doesn&apos;t get a notification, but their app will show the load as delivered.</li>
            </ul>
          </div>
        </div>

        <DialogFooter className="shrink-0 border-t border-border/60 bg-muted/10 px-4 py-3 sm:px-6">
          <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={() => close(false)} disabled={saving} className="h-11 sm:min-w-28">
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void submit()}
              disabled={!canSubmit}
              className="h-11 bg-emerald-600 text-white hover:bg-emerald-700 sm:min-w-44"
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Marking as delivered…
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 size-4" />
                  Mark as Delivered
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
