"use client";

import * as React from "react";
import { Camera, Loader2, X, RefreshCw } from "lucide-react";
import { resolveImageUrl, cn } from "@/lib/utils";
import { toast } from "sonner";

const MAX_SIZE = 8 * 1024 * 1024;
const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];

interface PhotoSlotUploaderProps {
  label: string;
  description: string;
  required?: boolean;
  photoUrl?: string;
  isUploading?: boolean;
  disabled?: boolean;
  onSelect: (file: File) => void;
  onRemove?: () => void;
}

export function PhotoSlotUploader({
  label,
  description,
  required,
  photoUrl,
  isUploading,
  disabled,
  onSelect,
  onRemove,
}: PhotoSlotUploaderProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const resolved = resolveImageUrl(photoUrl);

  const handleFile = (file: File | undefined) => {
    if (!file) return;
    if (!ACCEPTED.includes(file.type)) {
      toast.error("Only JPG, PNG, or WebP images are allowed");
      return;
    }
    if (file.size > MAX_SIZE) {
      toast.error("Image must be 8MB or smaller");
      return;
    }
    onSelect(file);
  };

  return (
    <div className="space-y-1.5">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          handleFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />

      <div
        className={cn(
          "relative aspect-video overflow-hidden rounded-xl border transition-colors",
          resolved
            ? "border-border/50"
            : "border-dashed border-border/60 bg-muted/40 hover:border-primary/40 hover:bg-primary/5",
          disabled && "opacity-60 pointer-events-none",
        )}
      >
        {resolved ? (
          <>
            <img src={resolved} alt={label} className="h-full w-full object-cover" />
            {!disabled && (
              <div className="absolute right-1.5 top-1.5 flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-sm hover:bg-black/75 active:scale-95 transition-all"
                  aria-label={`Replace ${label} photo`}
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                </button>
                {onRemove && (
                  <button
                    type="button"
                    onClick={onRemove}
                    className="flex h-7 w-7 items-center justify-center rounded-full bg-black/55 text-red-400 backdrop-blur-sm hover:bg-black/75 active:scale-95 transition-all"
                    aria-label={`Remove ${label} photo`}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            )}
          </>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex h-full w-full flex-col items-center justify-center gap-1 text-muted-foreground/60 hover:text-muted-foreground transition-colors"
          >
            <Camera className="h-5 w-5" />
            <span className="text-[10px] font-medium px-2 text-center leading-tight">{description}</span>
          </button>
        )}

        {isUploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/70 backdrop-blur-sm">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        )}
      </div>

      <div className="flex items-center justify-between px-0.5">
        <span className="text-[11px] font-semibold text-foreground truncate">{label}</span>
        {required && (
          <span
            className={cn(
              "text-[9px] font-bold uppercase tracking-wider",
              resolved ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400",
            )}
          >
            {resolved ? "Added" : "Required"}
          </span>
        )}
      </div>
    </div>
  );
}
