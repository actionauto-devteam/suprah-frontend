"use client";

import * as React from "react";
import { X, Download } from "lucide-react";

export interface LightboxAttachment {
  src: string;
  type: "image" | "video";
  name: string;
}

export function AttachmentLightbox({
  attachment,
  onClose,
}: {
  attachment: LightboxAttachment | null;
  onClose: () => void;
}) {
  React.useEffect(() => {
    if (!attachment) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [attachment, onClose]);

  if (!attachment) return null;

  return (
    <div
      className="fixed inset-0 z-100 flex flex-col items-center justify-center bg-black/85 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="relative flex w-full max-w-4xl flex-col items-center gap-3"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex w-full items-center justify-between px-1">
          <p className="truncate text-sm font-medium text-white/90">
            {attachment.name}
          </p>
          <div className="flex items-center gap-2 shrink-0">
            <a
              href={attachment.src}
              download={attachment.name}
              className="flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-medium text-white no-underline hover:bg-white/20 transition-colors"
            >
              <Download className="h-3 w-3" /> Download
            </a>
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            >
              <X className="h-4 w-4 text-white" />
            </button>
          </div>
        </div>
        {attachment.type === "image" ? (
          <img
            src={attachment.src}
            alt={attachment.name}
            className="max-h-[80vh] max-w-full rounded-xl object-contain shadow-2xl"
          />
        ) : (
          <video
            src={attachment.src}
            controls
            autoPlay
            className="max-h-[80vh] max-w-full rounded-xl shadow-2xl"
          />
        )}
      </div>
    </div>
  );
}
