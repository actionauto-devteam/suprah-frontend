"use client"

import * as React from "react"
import { Pen, RotateCcw, Check, Loader2, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { apiClient } from "@/lib/api-client"
import { cn } from "@/lib/utils"

/**
 * ─── useSavedSignature ───────────────────────────────────────────────────────
 * Loads the user's saved signature from their profile and persists updates.
 *
 * Backend contract (see PATCHES.md):
 *   GET   /api/users/me               → { ...user, signatureDataUrl?: string }
 *   PATCH /api/users/profile          ← { signatureDataUrl: string | null }
 *
 * The signature lives on the User record — the same centralized profile the
 * Driver's Account uses — so it follows the person across every module.
 */
export function useSavedSignature() {
  const [savedSignature, setSavedSignature] = React.useState<string | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [isSaving, setIsSaving] = React.useState(false)

  React.useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await apiClient.get("/api/users/me")
        const user = res.data?.data ?? res.data
        if (!cancelled) setSavedSignature(user?.signatureDataUrl ?? null)
      } catch {
        // Non-fatal: user just draws a fresh signature
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const saveSignature = React.useCallback(async (dataUrl: string | null) => {
    setIsSaving(true)
    try {
      await apiClient.patch("/api/users/profile", { signatureDataUrl: dataUrl })
      setSavedSignature(dataUrl)
      return true
    } catch {
      return false
    } finally {
      setIsSaving(false)
    }
  }, [])

  return { savedSignature, isLoading, isSaving, saveSignature }
}

/**
 * ─── SignaturePad ────────────────────────────────────────────────────────────
 * Freehand signature capture with profile persistence.
 *
 * Behavior:
 * - On mount, loads the user's saved signature and applies it automatically
 *   (calls onChange with it) — returning users never re-sign.
 * - "Draw new" opens the canvas. Pointer events cover mouse, touch, and pen;
 *   the canvas is DPR-scaled so signatures stay crisp on retina screens.
 * - "Use this signature" exports a PNG data URL, hands it to the form via
 *   onChange, and (by default) saves it to the profile for next time.
 *
 * Props:
 *   value            current signature data URL held by the form (controlled)
 *   onChange         receives the PNG data URL (or null when cleared)
 *   saveToProfile    persist new signatures to the user profile (default true)
 *   heightClassName  canvas height (default "h-40")
 */
interface SignaturePadProps {
  value?: string | null
  onChange: (dataUrl: string | null) => void
  saveToProfile?: boolean
  heightClassName?: string
}

export function SignaturePad({
  value,
  onChange,
  saveToProfile = true,
  heightClassName = "h-40",
}: SignaturePadProps) {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null)
  const drawingRef = React.useRef(false)
  const lastPointRef = React.useRef<{ x: number; y: number } | null>(null)
  const [hasStrokes, setHasStrokes] = React.useState(false)
  const [isDrawingMode, setIsDrawingMode] = React.useState(false)
  const appliedSavedRef = React.useRef(false)

  const { savedSignature, isLoading, isSaving, saveSignature } =
    useSavedSignature()

  // Auto-apply the saved signature once, if the form doesn't have one yet
  React.useEffect(() => {
    if (isLoading || appliedSavedRef.current) return
    appliedSavedRef.current = true
    if (!value && savedSignature) onChange(savedSignature)
  }, [isLoading, savedSignature, value, onChange])

  // Size the canvas to its CSS box × devicePixelRatio for crisp strokes
  const prepareCanvas = React.useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const dpr = Math.max(1, window.devicePixelRatio || 1)
    canvas.width = Math.round(rect.width * dpr)
    canvas.height = Math.round(rect.height * dpr)
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    ctx.scale(dpr, dpr)
    ctx.lineWidth = 2.25
    ctx.lineCap = "round"
    ctx.lineJoin = "round"
    // Ink color chosen for legibility on both the pad and printed PDFs
    ctx.strokeStyle = "#0f172a"
  }, [])

  React.useEffect(() => {
    if (isDrawingMode) prepareCanvas()
  }, [isDrawingMode, prepareCanvas])

  const pointFromEvent = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    drawingRef.current = true
    lastPointRef.current = pointFromEvent(e)
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return
    const ctx = e.currentTarget.getContext("2d")
    const last = lastPointRef.current
    if (!ctx || !last) return
    const point = pointFromEvent(e)
    // Quadratic midpoint smoothing — noticeably nicer than raw lineTo
    const mid = { x: (last.x + point.x) / 2, y: (last.y + point.y) / 2 }
    ctx.beginPath()
    ctx.moveTo(last.x, last.y)
    ctx.quadraticCurveTo(last.x, last.y, mid.x, mid.y)
    ctx.lineTo(point.x, point.y)
    ctx.stroke()
    lastPointRef.current = point
    if (!hasStrokes) setHasStrokes(true)
  }

  const handlePointerUp = () => {
    drawingRef.current = false
    lastPointRef.current = null
  }

  const clearCanvas = () => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height)
    setHasStrokes(false)
  }

  const confirmSignature = async () => {
    const canvas = canvasRef.current
    if (!canvas || !hasStrokes) return
    const dataUrl = canvas.toDataURL("image/png")
    onChange(dataUrl)
    setIsDrawingMode(false)
    setHasStrokes(false)
    if (saveToProfile) {
      // Fire-and-report: the form already has the signature either way
      await saveSignature(dataUrl)
    }
  }

  const removeSignature = async () => {
    onChange(null)
    if (saveToProfile) await saveSignature(null)
  }

  if (isLoading) {
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-xl border border-border/60 bg-background/40",
          heightClassName,
        )}
      >
        <Loader2 className="size-4 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // ── Preview mode: an existing signature (from profile or just drawn) ──
  if (!isDrawingMode && value) {
    return (
      <div className="space-y-2">
        <div
          className={cn(
            "relative rounded-xl border border-emerald-500/30 bg-white overflow-hidden",
            heightClassName,
          )}
        >
          <span className="absolute top-0 inset-x-0 h-px bg-linear-to-r from-transparent via-emerald-500/60 to-transparent" />
          <img
            src={value}
            alt="Saved signature"
            className="w-full h-full object-contain p-3"
          />
          <span className="absolute bottom-2 right-3 flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-emerald-600">
            <Check className="size-3" />
            {savedSignature === value ? "Saved to profile" : "Applied"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-[10px] font-black uppercase tracking-widest"
            onClick={() => setIsDrawingMode(true)}
          >
            <Pen className="size-3" /> Draw New
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-rose-500"
            onClick={removeSignature}
            disabled={isSaving}
          >
            <Trash2 className="size-3" /> Remove
          </Button>
          {isSaving && (
            <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
          )}
        </div>
      </div>
    )
  }

  // ── Drawing mode: the pad ──
  if (isDrawingMode) {
    return (
      <div className="space-y-2">
        <div
          className={cn(
            "relative rounded-xl border-2 border-dashed border-emerald-500/40 bg-white overflow-hidden",
            heightClassName,
          )}
        >
          <canvas
            ref={canvasRef}
            className="w-full h-full cursor-crosshair"
            style={{ touchAction: "none" }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
          />
          {!hasStrokes && (
            <span className="absolute inset-0 flex items-center justify-center pointer-events-none text-[11px] font-bold uppercase tracking-widest text-slate-300 select-none">
              Sign here
            </span>
          )}
          <span className="absolute bottom-5 inset-x-6 h-px bg-slate-200 pointer-events-none" />
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            className="h-8 gap-1.5 text-[10px] font-black uppercase tracking-widest bg-linear-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white"
            onClick={confirmSignature}
            disabled={!hasStrokes || isSaving}
          >
            {isSaving ? (
              <Loader2 className="size-3 animate-spin" />
            ) : (
              <Check className="size-3" />
            )}
            Use This Signature
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-[10px] font-black uppercase tracking-widest"
            onClick={clearCanvas}
            disabled={!hasStrokes}
          >
            <RotateCcw className="size-3" /> Clear
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 text-[10px] font-black uppercase tracking-widest text-muted-foreground"
            onClick={() => {
              setIsDrawingMode(false)
              setHasStrokes(false)
            }}
          >
            Cancel
          </Button>
        </div>
      </div>
    )
  }

  // ── Empty state: no signature yet ──
  return (
    <button
      type="button"
      onClick={() => setIsDrawingMode(true)}
      className={cn(
        "w-full rounded-xl border-2 border-dashed border-border/70 bg-background/40",
        "flex flex-col items-center justify-center gap-2 transition-colors",
        "hover:border-emerald-500/40 hover:bg-emerald-500/5",
        heightClassName,
      )}
    >
      <div className="size-9 rounded-lg bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center">
        <Pen className="size-4 text-emerald-500" />
      </div>
      <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
        Tap to draw your signature
      </span>
    </button>
  )
}