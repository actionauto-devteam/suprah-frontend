"use client";

import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import {
  AuctionListing,
  PhotoSlot,
  NAMED_PHOTO_SLOTS,
  REQUIRED_PHOTO_SLOTS,
  PHOTO_SLOT_META,
  MAX_EXTRA_PHOTOS,
  uploadListingPhoto,
  deleteListingPhoto,
} from "@/lib/api/auctionListings";
import { PhotoSlotUploader } from "../PhotoSlotUploader";
import { resolveImageUrl, cn } from "@/lib/utils";

export function StepPhotos({ listing }: { listing: AuctionListing }) {
  const queryClient = useQueryClient();
  const [busy, setBusy] = React.useState<string | null>(null);
  const extraInputRef = React.useRef<HTMLInputElement>(null);

  const photoBySlot = React.useMemo(() => {
    const map = new Map<PhotoSlot, string>();
    for (const p of listing.photos) {
      if (p.slot !== "EXTRA" && !map.has(p.slot)) map.set(p.slot, p.url);
    }
    return map;
  }, [listing.photos]);

  const extras = listing.photos.filter((p) => p.slot === "EXTRA");
  const requiredDone = REQUIRED_PHOTO_SLOTS.filter((s) => photoBySlot.has(s)).length;

  const applyUpdate = (updated: AuctionListing) => {
    queryClient.setQueryData(["auctionListing", listing.id], updated);
  };

  const handleUpload = async (slot: PhotoSlot, file: File, key: string) => {
    setBusy(key);
    try {
      applyUpdate(await uploadListingPhoto(listing.id, slot, file));
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to upload photo. Please try again.");
    } finally {
      setBusy(null);
    }
  };

  const handleRemove = async (slot: PhotoSlot, key: string, url?: string) => {
    setBusy(key);
    try {
      applyUpdate(await deleteListingPhoto(listing.id, slot, url));
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to remove photo. Please try again.");
    } finally {
      setBusy(null);
    }
  };

  const handleExtraFile = (file: File | undefined) => {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast.error("Only JPG, PNG, or WebP images are allowed");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error("Image must be 8MB or smaller");
      return;
    }
    handleUpload("EXTRA", file, "EXTRA:new");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted-foreground">
          Clear, well-lit photos help your car get approved and sell faster.
        </p>
        <span
          className={cn(
            "inline-flex w-fit items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold tabular-nums",
            requiredDone === REQUIRED_PHOTO_SLOTS.length
              ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              : "border-amber-500/25 bg-amber-500/10 text-amber-600 dark:text-amber-400",
          )}
        >
          {requiredDone} of {REQUIRED_PHOTO_SLOTS.length} required photos added
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {NAMED_PHOTO_SLOTS.map((slot) => {
          const meta = PHOTO_SLOT_META[slot];
          const url = photoBySlot.get(slot);
          return (
            <PhotoSlotUploader
              key={slot}
              label={meta.label}
              description={meta.description}
              required={meta.required}
              photoUrl={url}
              isUploading={busy === slot}
              onSelect={(file) => handleUpload(slot, file, slot)}
              onRemove={url ? () => handleRemove(slot, slot) : undefined}
            />
          );
        })}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold text-foreground">Extra Photos</p>
          <span className="text-[10px] text-muted-foreground tabular-nums">
            {extras.length}/{MAX_EXTRA_PHOTOS}
          </span>
        </div>
        <input
          ref={extraInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => {
            handleExtraFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
          {extras.map((photo) => {
            const key = `EXTRA:${photo.url}`;
            return (
              <div key={photo.url} className="relative aspect-video overflow-hidden rounded-xl border border-border/50">
                <img src={resolveImageUrl(photo.url) || ""} alt="Extra photo" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => handleRemove("EXTRA", key, photo.url)}
                  className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
                  aria-label="Remove extra photo"
                >
                  <X className="h-3 w-3" />
                </button>
                {busy === key && (
                  <div className="absolute inset-0 flex items-center justify-center bg-background/70 backdrop-blur-sm">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  </div>
                )}
              </div>
            );
          })}
          {extras.length < MAX_EXTRA_PHOTOS && (
            <button
              type="button"
              onClick={() => extraInputRef.current?.click()}
              className="flex aspect-video flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border/60 bg-muted/40 text-muted-foreground/60 transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-muted-foreground"
            >
              {busy === "EXTRA:new" ? (
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  <span className="text-[10px] font-medium">Add photo</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
