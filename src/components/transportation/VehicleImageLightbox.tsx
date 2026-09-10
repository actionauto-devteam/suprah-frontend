"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import {
  Car,
  ChevronLeft,
  ChevronRight,
  ImageOff,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type VehicleImageLightboxItem = {
  id: string;
  src?: string;
  label: string;
  subtitle?: string;
};

interface VehicleImageLightboxProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: VehicleImageLightboxItem[];
  initialIndex?: number;
}

function clampIndex(index: number, length: number) {
  if (length <= 0) return 0;
  return Math.min(Math.max(index, 0), length - 1);
}

export function VehicleImageLightbox({
  open,
  onOpenChange,
  items,
  initialIndex = 0,
}: VehicleImageLightboxProps) {
  const [activeIndex, setActiveIndex] = React.useState(() =>
    clampIndex(initialIndex, items.length),
  );

  React.useEffect(() => {
    if (!open) return;
    setActiveIndex(clampIndex(initialIndex, items.length));
  }, [open, initialIndex, items.length]);

  const goPrevious = React.useCallback(() => {
    if (items.length <= 1) return;
    setActiveIndex((current) =>
      current <= 0 ? items.length - 1 : current - 1,
    );
  }, [items.length]);

  const goNext = React.useCallback(() => {
    if (items.length <= 1) return;
    setActiveIndex((current) =>
      current >= items.length - 1 ? 0 : current + 1,
    );
  }, [items.length]);

  React.useEffect(() => {
    if (!open || typeof document === "undefined") return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopImmediatePropagation();
        onOpenChange(false);
        return;
      }

      if (event.key === "ArrowLeft" && items.length > 1) {
        event.preventDefault();
        event.stopImmediatePropagation();
        goPrevious();
        return;
      }

      if (event.key === "ArrowRight" && items.length > 1) {
        event.preventDefault();
        event.stopImmediatePropagation();
        goNext();
      }
    };

    // Capture phase keeps Escape from also closing the underlying inspector.
    window.addEventListener("keydown", handleKeyDown, true);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [open, items.length, goPrevious, goNext, onOpenChange]);

  if (!open || typeof document === "undefined") return null;

  const safeIndex = clampIndex(activeIndex, items.length);
  const activeItem = items[safeIndex];

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Vehicle image viewer"
      className="fixed inset-0 z-[100] flex h-[100dvh] w-screen flex-col overflow-hidden bg-black/95 text-white backdrop-blur-sm"
      onClick={() => onOpenChange(false)}
    >
      <div
        className="relative z-10 flex min-h-16 shrink-0 items-center justify-between gap-3 border-b border-white/10 bg-black/35 px-3 sm:px-5"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-black tracking-tight text-white">
            {activeItem?.label || "Vehicle"}
          </p>
          <p className="mt-0.5 truncate text-[10px] font-bold uppercase tracking-[0.12em] text-white/55">
            {items.length > 0
              ? `Vehicle ${safeIndex + 1} of ${items.length}`
              : "No vehicle image"}
            {activeItem?.subtitle ? ` · ${activeItem.subtitle}` : ""}
          </p>
        </div>

        <button
          type="button"
          onClick={() => onOpenChange(false)}
          aria-label="Close vehicle image"
          className="flex size-11 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/8 text-white transition-colors hover:bg-white/14 active:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
        >
          <X className="size-5" />
        </button>
      </div>

      {items.length > 1 ? (
        <div
          className="z-10 flex min-h-8 shrink-0 items-center justify-center overflow-x-auto px-4 py-2"
          onClick={(event) => event.stopPropagation()}
          aria-label="Vehicle image position"
        >
          <div className="flex min-w-max items-center gap-2">
            {items.map((item, index) => (
              <button
                key={`${item.id}-${index}`}
                type="button"
                onClick={() => setActiveIndex(index)}
                aria-label={`Show vehicle ${index + 1} of ${items.length}`}
                aria-current={index === safeIndex ? "true" : undefined}
                className={cn(
                  "h-2.5 rounded-full border border-white/20 transition-all",
                  index === safeIndex
                    ? "w-6 bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.65)]"
                    : "w-2.5 bg-white/30 hover:bg-white/55",
                )}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="h-3 shrink-0" />
      )}

      <div className="relative min-h-0 flex-1">
        <div className="absolute inset-0 flex items-center justify-center px-3 pb-4 pt-2 sm:px-8">
          {activeItem?.src ? (
            <img
              src={activeItem.src}
              alt={activeItem.label}
              className="max-h-full max-w-full select-none object-contain object-center"
              draggable={false}
              onClick={(event) => event.stopPropagation()}
            />
          ) : (
            <div
              className="flex max-w-sm flex-col items-center justify-center rounded-3xl border border-white/10 bg-white/5 px-8 py-12 text-center"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex size-16 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
                <ImageOff className="size-8 text-white/35" />
              </div>
              <p className="mt-4 text-sm font-black text-white/80">
                No photo on file
              </p>
              <p className="mt-1 text-xs leading-relaxed text-white/45">
                This vehicle remains in its original load order even though no
                image is available.
              </p>
            </div>
          )}
        </div>

        {items.length > 1 ? (
          <>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                goPrevious();
              }}
              aria-label="Previous vehicle"
              className="absolute left-2 top-1/2 z-20 flex size-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/55 text-white shadow-xl backdrop-blur transition-colors hover:bg-black/75 active:bg-black/90 sm:left-5 sm:size-14"
            >
              <ChevronLeft className="size-6" />
            </button>

            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                goNext();
              }}
              aria-label="Next vehicle"
              className="absolute right-2 top-1/2 z-20 flex size-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/55 text-white shadow-xl backdrop-blur transition-colors hover:bg-black/75 active:bg-black/90 sm:right-5 sm:size-14"
            >
              <ChevronRight className="size-6" />
            </button>
          </>
        ) : null}
      </div>

      <button
        type="button"
        onClick={() => onOpenChange(false)}
        className="flex min-h-11 shrink-0 items-center justify-center border-t border-white/10 bg-black/35 px-4 text-center transition-colors hover:bg-white/5 active:bg-white/10"
        aria-label="Close vehicle image viewer"
      >
        <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-white/55">
          <Car className="size-3.5" />
          Tap outside the image to close
        </span>
      </button>
    </div>,
    document.body,
  );
}