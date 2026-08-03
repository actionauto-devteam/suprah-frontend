"use client";

import * as React from "react";
import { X, Download, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

export interface LightboxAttachment {
  src: string;
  type: "image" | "video";
  name: string;
}

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.5;

export function AttachmentLightbox({
  attachment,
  onClose,
}: {
  attachment: LightboxAttachment | null;
  onClose: () => void;
}) {
  const [zoom, setZoom] = React.useState(1);
  const [pan, setPan] = React.useState({ x: 0, y: 0 });
  const dragRef = React.useRef<{ startX: number; startY: number; originX: number; originY: number; dragged: boolean } | null>(null);

  // Every new attachment (or closing) starts fresh — a leftover zoom/pan from
  // the last image would otherwise carry over and look like a broken view.
  React.useEffect(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, [attachment?.src]);

  const zoomTo = React.useCallback((next: number) => {
    const clamped = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, next));
    setZoom(clamped);
    if (clamped === MIN_ZOOM) setPan({ x: 0, y: 0 });
  }, []);

  React.useEffect(() => {
    if (!attachment) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "+" || e.key === "=") zoomTo(zoom + ZOOM_STEP);
      else if (e.key === "-") zoomTo(zoom - ZOOM_STEP);
      else if (e.key === "0") zoomTo(1);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [attachment, onClose, zoom, zoomTo]);

  const onWheel = (e: React.WheelEvent) => {
    if (attachment?.type !== "image") return;
    e.preventDefault();
    zoomTo(zoom + (e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP));
  };

  const onImageClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (dragRef.current?.dragged) return;
    zoomTo(zoom > 1 ? 1 : 2);
  };

  const beginPan = (e: React.PointerEvent) => {
    if (zoom <= 1) return;
    dragRef.current = { startX: e.clientX, startY: e.clientY, originX: pan.x, originY: pan.y, dragged: false };
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  };
  const onPanMove = (e: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag) return;
    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) drag.dragged = true;
    setPan({ x: drag.originX + dx, y: drag.originY + dy });
  };
  const endPan = (e: React.PointerEvent) => {
    (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
    dragRef.current = null;
  };

  if (!attachment) return null;

  return (
    <div
      className="fixed inset-0 z-100 flex flex-col bg-black/95 backdrop-blur-sm"
      onClick={onClose}
    >
      <div className="flex w-full shrink-0 items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4">
        <p className="truncate text-sm font-medium text-white/90 sm:text-base">
          {attachment.name}
        </p>
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2" onClick={(e) => e.stopPropagation()}>
          {attachment.type === "image" && (
            <div className="mr-1 hidden items-center gap-0.5 rounded-full border border-white/15 bg-white/10 p-1 sm:flex">
              <button
                onClick={() => zoomTo(zoom - ZOOM_STEP)}
                disabled={zoom <= MIN_ZOOM}
                title="Zoom out"
                className="flex h-8 w-8 items-center justify-center rounded-full text-white transition-colors hover:bg-white/15 disabled:opacity-30"
              >
                <ZoomOut className="h-4 w-4" />
              </button>
              <span className="w-11 select-none text-center text-xs font-semibold text-white/80">
                {Math.round(zoom * 100)}%
              </span>
              <button
                onClick={() => zoomTo(zoom + ZOOM_STEP)}
                disabled={zoom >= MAX_ZOOM}
                title="Zoom in"
                className="flex h-8 w-8 items-center justify-center rounded-full text-white transition-colors hover:bg-white/15 disabled:opacity-30"
              >
                <ZoomIn className="h-4 w-4" />
              </button>
              {zoom !== 1 && (
                <button
                  onClick={() => zoomTo(1)}
                  title="Reset zoom"
                  className="flex h-8 w-8 items-center justify-center rounded-full text-white transition-colors hover:bg-white/15"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          )}
          <a
            href={attachment.src}
            download={attachment.name}
            className="flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-2 text-xs font-medium text-white no-underline transition-colors hover:bg-white/20 sm:px-4 sm:text-sm"
          >
            <Download className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Download</span>
          </a>
          <button
            onClick={onClose}
            title="Close"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/25"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>
      <div
        className="flex min-h-0 flex-1 items-center justify-center overflow-hidden px-2 pb-4 sm:px-6"
        onWheel={onWheel}
      >
        {attachment.type === "image" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={attachment.src}
            alt={attachment.name}
            draggable={false}
            onClick={onImageClick}
            onPointerDown={beginPan}
            onPointerMove={onPanMove}
            onPointerUp={endPan}
            onPointerCancel={endPan}
            style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}
            className={cn(
              "h-full max-h-full w-full max-w-full touch-none object-contain transition-transform duration-150 ease-out select-none",
              zoom > 1 ? "cursor-grab active:cursor-grabbing" : "cursor-zoom-in",
            )}
          />
        ) : (
          <video
            src={attachment.src}
            controls
            autoPlay
            onClick={(e) => e.stopPropagation()}
            className="h-full max-h-full w-full max-w-full object-contain"
          />
        )}
      </div>
      {attachment.type === "image" && (
        <p className="hidden shrink-0 pb-3 text-center text-[11px] font-medium text-white/40 sm:block">
          Click or scroll to zoom · drag to pan · Esc to close
        </p>
      )}
    </div>
  );
}
