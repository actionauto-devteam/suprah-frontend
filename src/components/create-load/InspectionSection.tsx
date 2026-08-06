"use client"

import * as React from "react"
import { Camera, Loader2, RotateCcw, ScanLine, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { LoadVehicle } from "./types"
import { uploadVehicleInspectionPhoto } from "@/lib/api/loads"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

// ─── Inspect step ─────────────────────────────────────────────────────────────
// Per-vehicle condition photo (or a photo of a QR/inventory tag — this is a
// plain image upload, not a live barcode/QR decoder). Optional per vehicle —
// advisory only, never blocks Post/Save (mirrors the trailer-capacity warning
// pattern elsewhere in this wizard).
//
// Create mode: the load doesn't have an _id yet, so files are held client-side
// (pendingPhotos, keyed by the vehicle row's local `id`) and uploaded by the
// caller right after createLoad() resolves.
// Edit mode: the load already has an _id — upload immediately on file select.

interface InspectionSectionProps {
  vehicles: LoadVehicle[]
  mode: "create" | "edit"
  loadId?: string
  pendingPhotos: Record<string, File>
  onPendingPhotosChange: (next: Record<string, File>) => void
  onVehicleUpdate: (index: number, updated: LoadVehicle) => void
}

function tabLabel(v: LoadVehicle, index: number): string {
  if (v.make && v.model) {
    const label = `${v.make} ${v.model}`
    return label.length > 14 ? label.slice(0, 13) + "…" : label
  }
  return `Vehicle ${index + 1}`
}

export function InspectionSection({
  vehicles,
  mode,
  loadId,
  pendingPhotos,
  onPendingPhotosChange,
  onVehicleUpdate,
}: InspectionSectionProps) {
  const [activeIndex, setActiveIndex] = React.useState(0)
  const [uploadingIndex, setUploadingIndex] = React.useState<number | null>(null)
  const fileInputRef = React.useRef<HTMLInputElement | null>(null)

  const active = vehicles[activeIndex] ?? vehicles[0]
  const pendingFile = active ? pendingPhotos[active.id] : undefined
  const [pendingPreviewUrl, setPendingPreviewUrl] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!pendingFile) {
      setPendingPreviewUrl(null)
      return
    }
    const url = URL.createObjectURL(pendingFile)
    setPendingPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [pendingFile])

  const pickFile = () => fileInputRef.current?.click()

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file || !active) return

    if (mode === "create") {
      onPendingPhotosChange({ ...pendingPhotos, [active.id]: file })
      return
    }

    // Edit mode — upload immediately
    if (!loadId) return
    setUploadingIndex(activeIndex)
    try {
      const url = await uploadVehicleInspectionPhoto(loadId, activeIndex, file)
      onVehicleUpdate(activeIndex, { ...active, inspectionPhotoUrl: url })
      toast.success("Inspection photo uploaded.")
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message || err?.message || "Failed to upload photo.",
      )
    } finally {
      setUploadingIndex(null)
    }
  }

  const removePending = () => {
    if (!active) return
    const next = { ...pendingPhotos }
    delete next[active.id]
    onPendingPhotosChange(next)
  }

  if (!active) return null

  const isUploading = uploadingIndex === activeIndex
  const savedUrl = active.inspectionPhotoUrl

  return (
    <div>
      <p className="text-[9px] font-black text-muted-foreground/60 uppercase tracking-[0.2em] mb-3 flex items-center gap-1.5">
        <ScanLine className="size-3" /> Inspect Vehicles
      </p>

      {/* ── Tab strip ── */}
      <div className="flex items-center gap-1.5 flex-wrap mb-3">
        {vehicles.map((v, i) => {
          const has = Boolean(v.inspectionPhotoUrl || pendingPhotos[v.id])
          return (
            <button
              key={v.id}
              type="button"
              onClick={() => setActiveIndex(i)}
              className={cn(
                "flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium border transition-colors",
                i === activeIndex
                  ? "bg-emerald-500 text-white border-emerald-500"
                  : "bg-muted text-muted-foreground border-border hover:text-foreground",
              )}
            >
              <span>{tabLabel(v, i)}</span>
              {has && (
                <span className="size-1.5 rounded-full bg-emerald-400 shrink-0" />
              )}
            </button>
          )
        })}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />

      {savedUrl || pendingPreviewUrl ? (
        <div className="space-y-2">
          <div className="relative rounded-xl border border-emerald-500/30 bg-black/5 dark:bg-white/5 overflow-hidden aspect-video">
            <img
              src={pendingPreviewUrl || savedUrl}
              alt={`${tabLabel(active, activeIndex)} inspection`}
              className="w-full h-full object-contain"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-[10px] font-black uppercase tracking-widest"
              onClick={mode === "create" && pendingFile ? removePending : pickFile}
              disabled={isUploading}
            >
              {isUploading ? (
                <Loader2 className="size-3 animate-spin" />
              ) : mode === "create" && pendingFile ? (
                <X className="size-3" />
              ) : (
                <RotateCcw className="size-3" />
              )}
              {mode === "create" && pendingFile ? "Remove" : "Replace"}
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={pickFile}
          disabled={isUploading}
          className={cn(
            "w-full aspect-video rounded-xl border-2 border-dashed border-border/70 bg-background/40",
            "flex flex-col items-center justify-center gap-2 transition-colors",
            "hover:border-emerald-500/40 hover:bg-emerald-500/5 disabled:opacity-60",
          )}
        >
          {isUploading ? (
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          ) : (
            <div className="size-9 rounded-lg bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center">
              <Camera className="size-4 text-emerald-500" />
            </div>
          )}
          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            {isUploading ? "Uploading…" : "Upload a condition photo, or a QR/tag photo"}
          </span>
        </button>
      )}

      <p className="text-[10px] text-muted-foreground/70 mt-2">
        Optional — a photo per vehicle helps document condition at pickup.
        Not required to {mode === "edit" ? "save" : "post"} the load.
      </p>
    </div>
  )
}
