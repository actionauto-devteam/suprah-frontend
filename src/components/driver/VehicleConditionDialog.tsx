"use client"

import * as React from "react"
import { Camera, CheckCircle2, ImageIcon, Loader2, Lock, RotateCcw, Trash2, X } from "lucide-react"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useAuth } from "@/providers/AuthProvider"
import { userErrorMessage } from "@/lib/user-error"
import { cn } from "@/lib/utils"
import {
  CONDITION_DAMAGE_LABELS,
  addConditionPhoto,
  getMyConditionReport,
  removeConditionPhoto,
  saveConditionDetails,
  saveDeliverySignature,
  type ConditionReport,
  type ConditionStop,
  type MyConditionReport,
} from "@/lib/condition-report"
import { VehicleDamageOutline } from "@/components/driver/VehicleDamageOutline"
import { formatMountainDateTime } from "@/lib/mountain-time"

const PHOTO_TYPES = ["image/jpeg", "image/png"]
const STOP_LABEL: Record<ConditionStop, string> = { pickup: "At pickup", delivery: "At delivery" }

/**
 * Phone photos are often several MB. Shrink to at most 1600 px on the long
 * side as a JPEG before upload, so it's quick on mobile data. Falls back to
 * the original file if the browser can't do it.
 */
async function shrinkPhoto(file: File): Promise<File> {
  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height))
    if (scale === 1 && file.size < 1_500_000) return file
    const canvas = document.createElement("canvas")
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.82))
    if (!blob) return file
    return new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" })
  } catch {
    return file
  }
}

function defaultStop(report: MyConditionReport): ConditionStop {
  if (report.status === "In-Transit") return "delivery"
  return report.editableStops[0] ?? (report.status === "Delivered" ? "delivery" : "pickup")
}

export function VehicleConditionDialog({
  loadId,
  open,
  onOpenChange,
}: {
  loadId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { getToken } = useAuth()
  const [data, setData] = React.useState<MyConditionReport | null>(null)
  const [loadError, setLoadError] = React.useState<string | null>(null)
  const [stop, setStop] = React.useState<ConditionStop>("pickup")
  const [vehicleIndex, setVehicleIndex] = React.useState(0)

  const fetchReport = React.useCallback(async () => {
    setLoadError(null)
    try {
      const token = await getToken()
      const next = await getMyConditionReport(loadId, token)
      setData(next)
      return next
    } catch (err) {
      setLoadError(userErrorMessage(err, "open the condition report"))
      return null
    }
  }, [getToken, loadId])

  React.useEffect(() => {
    if (!open) return
    setData(null)
    setVehicleIndex(0)
    void fetchReport().then((next) => {
      if (next) setStop(defaultStop(next))
    })
  }, [open, fetchReport])

  const replaceReport = (report: ConditionReport | null, forStop: ConditionStop, forVehicle: number) => {
    setData((current) => {
      if (!current) return current
      const others = current.reports.filter((r) => !(r.stop === forStop && r.vehicleIndex === forVehicle))
      return { ...current, reports: report ? [...others, report] : others }
    })
  }

  const report = data?.reports.find((r) => r.stop === stop && r.vehicleIndex === vehicleIndex) ?? null
  const editable = Boolean(data?.editableStops.includes(stop))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[calc(100dvh-1rem)] max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] flex-col gap-0 overflow-hidden p-0 sm:h-auto sm:max-h-[calc(100dvh-2rem)] sm:max-w-xl">
        <DialogHeader className="shrink-0 border-b border-border/60 bg-muted/20 px-4 py-4 text-left sm:px-6">
          <DialogTitle className="flex items-center gap-2 text-lg font-extrabold">
            <Camera className="size-5 text-primary" />
            Vehicle Condition
          </DialogTitle>
          <DialogDescription className="text-sm leading-relaxed">
            <span className="font-semibold text-foreground">This is optional.</span> You can mark the load
            Picked Up and Delivered without it. Adding photos and damage notes for each vehicle
            {data?.loadNumber ? ` on ${data.loadNumber}` : ""} helps protect you if someone later says a vehicle
            was damaged on your trip.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6">
          {loadError ? (
            <div className="space-y-3 text-sm text-destructive">
              <p>{loadError}</p>
              <Button type="button" variant="outline" className="h-11" onClick={() => void fetchReport()}>
                Try again
              </Button>
            </div>
          ) : !data ? (
            <div className="flex h-40 items-center justify-center">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2" role="tablist" aria-label="Stop">
                {(["pickup", "delivery"] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    role="tab"
                    aria-selected={stop === value}
                    onClick={() => setStop(value)}
                    className={cn(
                      "min-h-11 rounded-xl border text-sm font-bold transition-colors",
                      stop === value
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background text-muted-foreground hover:bg-muted",
                    )}
                  >
                    {STOP_LABEL[value]}
                  </button>
                ))}
              </div>

              {!editable && (
                <p className="flex items-start gap-2 rounded-xl border border-border/60 bg-muted/30 px-3 py-2.5 text-xs text-muted-foreground">
                  <Lock className="mt-0.5 size-3.5 shrink-0" />
                  {stop === "pickup"
                    ? data.status === "Assigned"
                      ? "You can fill this in after you accept the load."
                      : "The pickup report is closed now. You can look at it but not change it."
                    : data.status === "Delivered"
                      ? "The delivery report is closed now. You can look at it but not change it."
                      : "You can fill this in once the vehicles are picked up."}
                </p>
              )}

              {data.vehicles.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Vehicle">
                  {data.vehicles.map((vehicle) => (
                    <button
                      key={vehicle.index}
                      type="button"
                      role="tab"
                      aria-selected={vehicleIndex === vehicle.index}
                      onClick={() => setVehicleIndex(vehicle.index)}
                      className={cn(
                        "min-h-11 shrink-0 rounded-xl border px-3 text-xs font-semibold",
                        vehicleIndex === vehicle.index
                          ? "border-primary bg-primary/10 text-foreground"
                          : "border-border text-muted-foreground hover:bg-muted",
                      )}
                    >
                      {vehicle.index + 1}. {vehicle.label}
                    </button>
                  ))}
                </div>
              )}

              <ConditionPhotos
                key={`photos-${stop}-${vehicleIndex}`}
                loadId={loadId}
                stop={stop}
                vehicleIndex={vehicleIndex}
                report={report}
                limit={data.photosPerVehicle}
                editable={editable}
                onChange={(next) => replaceReport(next, stop, vehicleIndex)}
              />

              <ConditionDamage
                key={`damage-${stop}-${vehicleIndex}`}
                loadId={loadId}
                stop={stop}
                vehicleIndex={vehicleIndex}
                report={report}
                editable={editable}
                onSaved={(next) => replaceReport(next, stop, vehicleIndex)}
              />

              {stop === "delivery" && (
                <CustomerSignature
                  loadId={loadId}
                  editable={editable}
                  signature={data.signature}
                  onSaved={(signature) => setData((current) => (current ? { ...current, signature } : current))}
                />
              )}
            </>
          )}
        </div>

        <DialogFooter className="shrink-0 border-t border-border/60 bg-muted/10 px-4 py-3 sm:px-6">
          <Button type="button" className="h-11 w-full sm:w-auto sm:min-w-28" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ConditionPhotos({
  loadId,
  stop,
  vehicleIndex,
  report,
  limit,
  editable,
  onChange,
}: {
  loadId: string
  stop: ConditionStop
  vehicleIndex: number
  report: ConditionReport | null
  limit: number
  editable: boolean
  onChange: (report: ConditionReport | null) => void
}) {
  const { getToken } = useAuth()
  const cameraRef = React.useRef<HTMLInputElement>(null)
  const galleryRef = React.useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = React.useState(0)
  const [removingId, setRemovingId] = React.useState<string | null>(null)
  const photos = report?.photos ?? []
  const room = Math.max(0, limit - photos.length - uploading)

  const upload = async (files: File[]) => {
    const accepted = files.filter((file) => PHOTO_TYPES.includes(file.type)).slice(0, room)
    if (accepted.length < files.length) {
      toast.error(
        accepted.length === 0 && room === 0
          ? `You can add up to ${limit} photos for each vehicle.`
          : "Some photos weren't added. Use JPG or PNG photos, up to the limit for this vehicle.",
      )
    }
    for (const file of accepted) {
      setUploading((count) => count + 1)
      try {
        const token = await getToken()
        const next = await addConditionPhoto(loadId, stop, vehicleIndex, await shrinkPhoto(file), token)
        onChange(next)
      } catch (err) {
        toast.error(userErrorMessage(err, "add this photo"))
      } finally {
        setUploading((count) => count - 1)
      }
    }
  }

  const onFiles = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])
    event.target.value = ""
    if (files.length) void upload(files)
  }

  const remove = async (photoId: string) => {
    setRemovingId(photoId)
    try {
      const token = await getToken()
      onChange(await removeConditionPhoto(loadId, stop, vehicleIndex, photoId, token))
    } catch (err) {
      toast.error(userErrorMessage(err, "remove this photo"))
    } finally {
      setRemovingId(null)
    }
  }

  return (
    <section className="space-y-2">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-sm font-bold">Photos</h3>
        <span className="text-xs text-muted-foreground">
          {photos.length} of {limit}
        </span>
      </div>
      {editable && (
        <p className="text-xs leading-relaxed text-muted-foreground">
          Optional. If you add photos, take the front, back, both sides, and any damage up close.
        </p>
      )}

      {photos.length > 0 || uploading > 0 ? (
        <div className="grid grid-cols-3 gap-2">
          {photos.map((photo) => (
            <div key={photo.id} className="relative aspect-square overflow-hidden rounded-lg border border-border bg-muted">
              {photo.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photo.url} alt="Vehicle condition photo" className="size-full object-cover" />
              ) : (
                <ImageIcon className="m-auto size-6 text-muted-foreground" />
              )}
              {editable && (
                <button
                  type="button"
                  aria-label="Remove photo"
                  onClick={() => void remove(photo.id)}
                  disabled={removingId === photo.id}
                  className="absolute right-0 top-0 flex size-11 items-center justify-center"
                >
                  <span className="flex size-7 items-center justify-center rounded-full bg-black/60 text-white">
                    {removingId === photo.id ? <Loader2 className="size-3.5 animate-spin" /> : <X className="size-3.5" />}
                  </span>
                </button>
              )}
            </div>
          ))}
          {Array.from({ length: uploading }, (_, index) => (
            <div key={`uploading-${index}`} className="flex aspect-square items-center justify-center rounded-lg border border-dashed border-border">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          ))}
        </div>
      ) : (
        <p className="rounded-xl border border-dashed border-border px-3 py-4 text-center text-xs text-muted-foreground">
          No photos yet.
        </p>
      )}

      {editable && (
        <div className="grid grid-cols-2 gap-2">
          <input ref={cameraRef} type="file" accept={PHOTO_TYPES.join(",")} capture="environment" className="hidden" onChange={onFiles} />
          <input ref={galleryRef} type="file" accept={PHOTO_TYPES.join(",")} multiple className="hidden" onChange={onFiles} />
          <Button type="button" variant="outline" className="h-11 gap-2" disabled={room === 0} onClick={() => cameraRef.current?.click()}>
            <Camera className="size-4" /> Take Photo
          </Button>
          <Button type="button" variant="outline" className="h-11 gap-2" disabled={room === 0} onClick={() => galleryRef.current?.click()}>
            <ImageIcon className="size-4" /> Choose Photos
          </Button>
        </div>
      )}
    </section>
  )
}

function ConditionDamage({
  loadId,
  stop,
  vehicleIndex,
  report,
  editable,
  onSaved,
}: {
  loadId: string
  stop: ConditionStop
  vehicleIndex: number
  report: ConditionReport | null
  editable: boolean
  onSaved: (report: ConditionReport) => void
}) {
  const { getToken } = useAuth()
  const [areas, setAreas] = React.useState<string[]>(report?.damageAreas ?? [])
  const [types, setTypes] = React.useState<string[]>(report?.damageTypes ?? [])
  const [note, setNote] = React.useState(report?.note ?? "")
  const [saving, setSaving] = React.useState(false)

  const toggle = (list: string[], value: string) =>
    list.includes(value) ? list.filter((item) => item !== value) : [...list, value]
  const changed =
    areas.join() !== (report?.damageAreas ?? []).join() ||
    types.join() !== (report?.damageTypes ?? []).join() ||
    note.trim() !== (report?.note ?? "")

  const save = async () => {
    setSaving(true)
    try {
      const token = await getToken()
      onSaved(await saveConditionDetails(loadId, stop, vehicleIndex, { damageAreas: areas, damageTypes: types, note }, token))
      toast.success("Damage notes saved")
    } catch (err) {
      toast.error(userErrorMessage(err, "save the damage notes"))
    } finally {
      setSaving(false)
    }
  }

  if (!editable) {
    return (
      <section className="space-y-2">
        <h3 className="text-sm font-bold">Damage</h3>
        {areas.length || types.length || note ? (
          <>
            <VehicleDamageOutline selected={areas} />
            {types.length > 0 && (
              <p className="text-xs text-muted-foreground">{types.map((type) => CONDITION_DAMAGE_LABELS[type] ?? type).join(" · ")}</p>
            )}
            {note && <p className="text-sm">{note}</p>}
          </>
        ) : (
          <p className="text-xs text-muted-foreground">No damage noted.</p>
        )}
      </section>
    )
  }

  return (
    <section className="space-y-3">
      <div>
        <h3 className="text-sm font-bold">Damage</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">Optional. Tap where you see damage. No damage? Leave this blank.</p>
      </div>
      <VehicleDamageOutline selected={areas} onToggle={(area) => setAreas((current) => toggle(current, area))} />

      <div>
        <p className="mb-1.5 text-xs font-semibold">What kind of damage?</p>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Kinds of damage">
          {Object.entries(CONDITION_DAMAGE_LABELS).map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={types.includes(value)}
              onClick={() => setTypes((current) => toggle(current, value))}
              className={cn(
                "min-h-11 rounded-full border px-3 text-xs font-semibold transition-colors",
                types.includes(value)
                  ? "border-red-500/50 bg-red-500/10 text-red-700 dark:text-red-300"
                  : "border-border bg-background text-muted-foreground hover:bg-muted",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <Label htmlFor={`condition-note-${stop}-${vehicleIndex}`} className="text-xs font-semibold">
          Notes <span className="font-normal text-muted-foreground">(optional)</span>
        </Label>
        <Textarea
          id={`condition-note-${stop}-${vehicleIndex}`}
          rows={2}
          maxLength={1000}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Example: 3-inch scratch on the driver's door."
          className="mt-1 resize-none"
        />
      </div>

      <Button type="button" className="h-11 w-full gap-2" disabled={saving || !changed} onClick={() => void save()}>
        {saving ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
        {changed ? "Save Damage Notes" : "Saved"}
      </Button>
    </section>
  )
}

function CustomerSignature({
  loadId,
  editable,
  signature,
  onSaved,
}: {
  loadId: string
  editable: boolean
  signature: MyConditionReport["signature"]
  onSaved: (signature: NonNullable<MyConditionReport["signature"]>) => void
}) {
  const { getToken } = useAuth()
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null)
  const drawingRef = React.useRef(false)
  const lastRef = React.useRef<{ x: number; y: number } | null>(null)
  const [signing, setSigning] = React.useState(!signature)
  const [hasInk, setHasInk] = React.useState(false)
  const [name, setName] = React.useState(signature?.signerName ?? "")
  const [saving, setSaving] = React.useState(false)

  // Size the canvas to its box (capped at 2x pixels to keep the image small).
  React.useEffect(() => {
    if (!signing || !editable) return
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const ratio = Math.min(2, Math.max(1, window.devicePixelRatio || 1))
    canvas.width = Math.round(rect.width * ratio)
    canvas.height = Math.round(rect.height * ratio)
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    ctx.scale(ratio, ratio)
    ctx.lineWidth = 2.25
    ctx.lineCap = "round"
    ctx.lineJoin = "round"
    ctx.strokeStyle = "#0f172a"
  }, [signing, editable])

  const point = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    return { x: event.clientX - rect.left, y: event.clientY - rect.top }
  }

  const clear = () => {
    const canvas = canvasRef.current
    canvas?.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height)
    setHasInk(false)
  }

  const save = async () => {
    const canvas = canvasRef.current
    if (!canvas || !hasInk || !name.trim()) return
    setSaving(true)
    try {
      const token = await getToken()
      const signatureDataUrl = canvas.toDataURL("image/png")
      const saved = await saveDeliverySignature(loadId, { signerName: name.trim(), signatureDataUrl }, token)
      onSaved({ ...saved, signatureDataUrl })
      setSigning(false)
      setHasInk(false)
      toast.success("Signature saved")
    } catch (err) {
      toast.error(userErrorMessage(err, "save the signature"))
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="space-y-2 rounded-xl border border-border/60 p-3">
      <div>
        <h3 className="text-sm font-bold">Customer signature</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {editable
            ? "Optional. Ask the person receiving the vehicles to sign here."
            : "Signed by the person who received the vehicles."}
        </p>
      </div>

      {signature && !signing ? (
        <div className="space-y-2">
          {signature.signatureDataUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={signature.signatureDataUrl}
              alt={`Signature of ${signature.signerName}`}
              className="h-24 w-full rounded-lg border border-border bg-white object-contain"
            />
          )}
          <p className="text-xs text-muted-foreground">
            {signature.signerName} · {formatMountainDateTime(signature.signedAt)}
          </p>
          {editable && (
            <Button type="button" variant="outline" className="h-11 w-full gap-2" onClick={() => setSigning(true)}>
              <RotateCcw className="size-4" /> Sign Again
            </Button>
          )}
        </div>
      ) : editable ? (
        <div className="space-y-2">
          <div>
            <Label htmlFor="condition-signer-name" className="text-xs font-semibold">
              Their name
            </Label>
            <Input
              id="condition-signer-name"
              value={name}
              maxLength={200}
              onChange={(event) => setName(event.target.value)}
              className="mt-1 h-11"
              autoComplete="off"
            />
          </div>
          <canvas
            ref={canvasRef}
            aria-label="Signature box"
            className="h-36 w-full cursor-crosshair touch-none rounded-xl border-2 border-dashed border-emerald-500/40 bg-white"
            onPointerDown={(event) => {
              event.currentTarget.setPointerCapture(event.pointerId)
              drawingRef.current = true
              lastRef.current = point(event)
            }}
            onPointerMove={(event) => {
              if (!drawingRef.current) return
              const ctx = event.currentTarget.getContext("2d")
              const last = lastRef.current
              if (!ctx || !last) return
              const next = point(event)
              ctx.beginPath()
              ctx.moveTo(last.x, last.y)
              ctx.lineTo(next.x, next.y)
              ctx.stroke()
              lastRef.current = next
              if (!hasInk) setHasInk(true)
            }}
            onPointerUp={() => {
              drawingRef.current = false
              lastRef.current = null
            }}
          />
          <div className="grid grid-cols-2 gap-2">
            <Button type="button" variant="outline" className="h-11 gap-2" onClick={clear} disabled={!hasInk || saving}>
              <Trash2 className="size-4" /> Clear
            </Button>
            <Button type="button" className="h-11 gap-2" onClick={() => void save()} disabled={!hasInk || !name.trim() || saving}>
              {saving ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />} Save Signature
            </Button>
          </div>
          {signature && (
            <Button type="button" variant="ghost" className="h-11 w-full" onClick={() => setSigning(false)}>
              Keep the earlier signature
            </Button>
          )}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">No signature was taken.</p>
      )}
    </section>
  )
}
