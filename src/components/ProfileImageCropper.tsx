"use client";

import React, { useState, useCallback, useEffect } from "react";
import Cropper, { Area } from "react-easy-crop";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import {
  Camera,
  Upload,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Check,
  X,
  Loader2,
  ImageIcon,
  Trash2,
} from "lucide-react";

interface ProfileImageCropperProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (croppedImageBlob: Blob) => Promise<void>;
  onRemove?: () => Promise<void>;
  currentImage?: string;
}

const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (error) => reject(error));
    image.setAttribute("crossOrigin", "anonymous");
    image.src = url;
  });

const getCroppedImg = async (
  imageSrc: string,
  pixelCrop: Area,
  rotation = 0,
): Promise<Blob> => {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No 2d context");

  const maxSize = Math.max(image.width, image.height);
  const safeArea = 2 * ((maxSize / 2) * Math.sqrt(2));

  canvas.width = safeArea;
  canvas.height = safeArea;
  ctx.translate(safeArea / 2, safeArea / 2);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.translate(-safeArea / 2, -safeArea / 2);
  ctx.drawImage(
    image,
    safeArea / 2 - image.width * 0.5,
    safeArea / 2 - image.height * 0.5,
  );

  const data = ctx.getImageData(0, 0, safeArea, safeArea);
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;
  ctx.putImageData(
    data,
    Math.round(0 - safeArea / 2 + image.width * 0.5 - pixelCrop.x),
    Math.round(0 - safeArea / 2 + image.height * 0.5 - pixelCrop.y),
  );

  const dim = 256;
  const finalCanvas = document.createElement("canvas");
  const finalCtx = finalCanvas.getContext("2d");
  if (!finalCtx) throw new Error("No 2d context");

  finalCanvas.width = dim;
  finalCanvas.height = dim;
  finalCtx.drawImage(canvas, 0, 0, dim, dim);

  return new Promise<Blob>((resolve, reject) => {
    finalCanvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error("Failed to create blob")),
      "image/jpeg",
      0.5,
    );
  });
};

export default function ProfileImageCropper({
  isOpen,
  onClose,
  onSave,
  onRemove,
  currentImage,
}: ProfileImageCropperProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [isCurrentImageError, setIsCurrentImageError] = useState(false);

  useEffect(() => {
    setIsCurrentImageError(false);
  }, [currentImage]);

  const onCropComplete = useCallback(
    (_: Area, pixels: Area) => setCroppedAreaPixels(pixels),
    [],
  );

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) return;
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      setImageSrc(reader.result as string);
      setZoom(1);
      setRotation(0);
      setCrop({ x: 0, y: 0 });
    });
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!imageSrc || !croppedAreaPixels) return;
    setIsSaving(true);
    try {
      const blob = await getCroppedImg(imageSrc, croppedAreaPixels, rotation);
      if (blob.size / 1024 > 200)
        throw new Error(
          `Image too large: ${(blob.size / 1024).toFixed(0)}KB (max 200KB)`,
        );
      await onSave(blob);
      handleClose();
    } catch (e) {
      throw e;
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemove = async () => {
    if (!onRemove) return;
    setIsRemoving(true);
    try {
      await onRemove();
      handleClose();
    } finally {
      setIsRemoving(false);
    }
  };

  const handleClose = () => {
    setImageSrc(null);
    setZoom(1);
    setRotation(0);
    setCrop({ x: 0, y: 0 });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="size-5 text-emerald-600" />
            Update Profile Picture
          </DialogTitle>
          <DialogDescription>
            Upload and crop your photo. It will be displayed as a circle.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-3">
          {!imageSrc ? (
            <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-2xl bg-gray-50 dark:bg-gray-900/50 hover:border-emerald-500 dark:hover:border-emerald-600 transition-colors">
              {currentImage && !isCurrentImageError ? (
                <div className="relative w-28 h-28 rounded-full overflow-hidden ring-4 ring-emerald-500/20 mb-5">
                  <img
                    src={currentImage}
                    alt="Current"
                    className="w-full h-full object-cover"
                    onError={() => setIsCurrentImageError(true)}
                  />
                </div>
              ) : (
                <div className="w-20 h-20 rounded-full bg-linear-to-br from-emerald-500 to-green-600 flex items-center justify-center mb-4">
                  <Upload className="size-8 text-white" />
                </div>
              )}
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 text-center">
                JPG, PNG, or WebP &middot; Auto-compressed under 200KB
              </p>
              <div className="flex items-center gap-3">
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-linear-to-r from-emerald-600 to-green-600 text-white font-semibold rounded-xl hover:from-emerald-700 hover:to-green-700 transition-all shadow-lg">
                    <ImageIcon className="size-4" />
                    {currentImage && !isCurrentImageError
                      ? "Change Photo"
                      : "Browse Files"}
                  </div>
                </label>
                {currentImage && !isCurrentImageError && onRemove && (
                  <Button
                    variant="outline"
                    onClick={handleRemove}
                    disabled={isRemoving}
                    className="text-red-600 border-red-200 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-950"
                  >
                    {isRemoving ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Trash2 className="size-4 mr-1.5" />
                    )}
                    Remove
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="relative h-72 bg-gray-900 rounded-2xl overflow-hidden">
                <Cropper
                  image={imageSrc}
                  crop={crop}
                  zoom={zoom}
                  rotation={rotation}
                  aspect={1}
                  cropShape="round"
                  showGrid={false}
                  onCropChange={setCrop}
                  onCropComplete={onCropComplete}
                  onZoomChange={setZoom}
                />
              </div>

              <div className="space-y-3 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold flex items-center gap-1.5">
                      <ZoomIn className="size-3.5 text-emerald-600" /> Zoom
                    </Label>
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                      {Math.round(zoom * 100)}%
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ZoomOut className="size-3.5 text-gray-400 dark:text-gray-500" />
                    <Slider
                      value={[zoom]}
                      min={1}
                      max={3}
                      step={0.01}
                      onValueChange={(v: number[]) => setZoom(v[0])}
                      className="flex-1"
                    />
                    <ZoomIn className="size-3.5 text-gray-400 dark:text-gray-500" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold flex items-center gap-1.5">
                      <RotateCw className="size-3.5 text-emerald-600" />{" "}
                      Rotation
                    </Label>
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                      {rotation}\u00b0
                    </span>
                  </div>
                  <Slider
                    value={[rotation]}
                    min={-180}
                    max={180}
                    step={1}
                    onValueChange={(v: number[]) => setRotation(v[0])}
                    className="flex-1"
                  />
                </div>
                <label className="inline-flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer pt-1">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <Upload className="size-3.5" /> Choose Different Image
                </label>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={handleClose} disabled={isSaving}>
            <X className="size-4 mr-1.5" /> Cancel
          </Button>
          {imageSrc && (
            <Button
              onClick={handleSave}
              disabled={isSaving || !croppedAreaPixels}
              className="bg-linear-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700"
            >
              {isSaving ? (
                <>
                  <Loader2 className="size-4 mr-1.5 animate-spin" /> Saving...
                </>
              ) : (
                <>
                  <Check className="size-4 mr-1.5" /> Save
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
