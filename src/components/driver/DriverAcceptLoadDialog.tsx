"use client";

import * as React from "react";
import { CheckCircle2, Eraser, Loader2, PenLine, ShieldCheck } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUser } from "@/providers/AuthProvider";

interface DriverAcceptLoadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  load: any | null;
  isSubmitting?: boolean;
  onAccept: (
    load: any,
    signatureDataUrl: string,
    signerName: string,
  ) => Promise<void> | void;
}

const CANVAS_WIDTH = 900;
const CANVAS_HEIGHT = 260;

export function DriverAcceptLoadDialog({
  open,
  onOpenChange,
  load,
  isSubmitting = false,
  onAccept,
}: DriverAcceptLoadDialogProps) {
  const { user } = useUser();
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const drawingRef = React.useRef(false);
  const [signerName, setSignerName] = React.useState("");
  const [hasSignature, setHasSignature] = React.useState(false);
  const [agreed, setAgreed] = React.useState(false);

  const clearCanvas = React.useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
    setHasSignature(false);
  }, []);

  const defaultSignerName = React.useMemo(() => {
    const fullName = user?.fullName?.trim();
    if (fullName) return fullName;

    const combinedName = [user?.firstName, user?.lastName]
      .filter((part): part is string => Boolean(part?.trim()))
      .map((part) => part.trim())
      .join(" ");

    return combinedName;
  }, [user?.fullName, user?.firstName, user?.lastName]);

  React.useEffect(() => {
    if (!open) return;
    setSignerName(defaultSignerName);
    setAgreed(false);
    setHasSignature(false);

    const frame = window.requestAnimationFrame(() => clearCanvas());
    return () => window.cancelAnimationFrame(frame);
  }, [open, defaultSignerName, clearCanvas]);

  const pointFromEvent = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;

    return {
      x: (event.clientX - rect.left) * (canvas.width / rect.width),
      y: (event.clientY - rect.top) * (canvas.height / rect.height),
    };
  };

  const beginSignature = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (isSubmitting) return;
    const canvas = canvasRef.current;
    const point = pointFromEvent(event);
    if (!canvas || !point) return;

    event.preventDefault();
    canvas.setPointerCapture?.(event.pointerId);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    drawingRef.current = true;
    ctx.beginPath();
    ctx.moveTo(point.x, point.y);
    ctx.lineWidth = 5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#111827";
  };

  const drawSignature = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current || isSubmitting) return;
    const canvas = canvasRef.current;
    const point = pointFromEvent(event);
    if (!canvas || !point) return;

    event.preventDefault();
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.lineTo(point.x, point.y);
    ctx.stroke();
    setHasSignature(true);
  };

  const endSignature = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    canvasRef.current?.releasePointerCapture?.(event.pointerId);
  };

  const submit = async () => {
    const canvas = canvasRef.current;
    const name = signerName.trim();
    if (!load || !canvas || !name || !hasSignature || !agreed || isSubmitting) {
      return;
    }

    await onAccept(load, canvas.toDataURL("image/png"), name);
  };

  const loadLabel =
    load?.loadNumber || load?.trackingNumber || (load?._id ? String(load._id) : "this load");

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!isSubmitting) onOpenChange(nextOpen);
      }}
    >
      <DialogContent className="sm:max-w-2xl overflow-hidden p-0">
        <DialogHeader className="border-b border-border/60 bg-muted/20 px-5 py-4 sm:px-6">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-emerald-500/25 bg-emerald-500/10">
              <PenLine className="size-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-lg font-black tracking-tight">
                Accept & Sign Load
              </DialogTitle>
              <DialogDescription className="mt-1 text-xs sm:text-sm">
                Sign the driver agreement before accepting {loadLabel}.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-5 px-5 py-5 sm:px-6">
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.06] p-3.5 text-xs leading-relaxed text-muted-foreground">
            <div className="flex items-start gap-2.5">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <p>
                Your signature is stored with the load as the driver agreement and records
                your acceptance of this assignment.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="driver-accept-signer-name" className="text-xs font-bold text-foreground">
              Signer name
            </label>
            <Input
              id="driver-accept-signer-name"
              value={signerName}
              onChange={(event) => setSignerName(event.target.value)}
              placeholder="Enter your full name"
              maxLength={160}
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-foreground">Signature</p>
                <p className="text-[11px] text-muted-foreground">
                  Draw with your mouse, trackpad, finger, or stylus.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={clearCanvas}
                disabled={isSubmitting || !hasSignature}
                className="h-8 gap-1.5 text-xs"
              >
                <Eraser className="size-3.5" />
                Clear
              </Button>
            </div>

            <div className="overflow-hidden rounded-xl border border-border bg-white shadow-inner">
              <canvas
                ref={canvasRef}
                width={CANVAS_WIDTH}
                height={CANVAS_HEIGHT}
                aria-label="Driver signature pad"
                className="block h-40 w-full touch-none cursor-crosshair sm:h-44"
                onPointerDown={beginSignature}
                onPointerMove={drawSignature}
                onPointerUp={endSignature}
                onPointerCancel={endSignature}
                onPointerLeave={(event) => {
                  if (drawingRef.current && event.buttons === 0) endSignature(event);
                }}
              />
            </div>
          </div>

          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border/60 bg-muted/20 p-3.5">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(event) => setAgreed(event.target.checked)}
              disabled={isSubmitting}
              className="mt-0.5 size-4 accent-emerald-600"
            />
            <span className="text-xs leading-relaxed text-muted-foreground">
              I confirm that the signer name and signature above are mine, and I agree to
              accept this load assignment.
            </span>
          </label>
        </div>

        <DialogFooter className="border-t border-border/60 bg-muted/10 px-5 py-4 sm:px-6">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={submit}
            disabled={
              isSubmitting || !agreed || !hasSignature || signerName.trim().length === 0
            }
            className="gap-2"
          >
            {isSubmitting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <CheckCircle2 className="size-4" />
            )}
            {isSubmitting ? "Accepting..." : "Accept Load"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}