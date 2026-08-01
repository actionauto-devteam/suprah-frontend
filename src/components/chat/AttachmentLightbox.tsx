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
      className="fixed inset-0 z-100 flex flex-col bg-black/90 backdrop-blur-sm"
      onClick={onClose}
    >
      <div className="flex w-full shrink-0 items-center justify-between gap-3 px-4 py-3">
        <p className="truncate text-sm font-medium text-white/90">
          {attachment.name}
        </p>
        <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
          <a
            href={attachment.src}
            download={attachment.name}
            className="flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-2 text-xs font-medium text-white no-underline hover:bg-white/20 transition-colors"
          >
            <Download className="h-3 w-3" /> Download
          </a>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          >
            <X className="h-4 w-4 text-white" />
          </button>
        </div>
      </div>
      <div className="flex min-h-0 flex-1 items-center justify-center px-2 pb-2">
        {attachment.type === "image" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={attachment.src}
            alt={attachment.name}
            onClick={(e) => e.stopPropagation()}
            className="h-full max-h-full w-full max-w-full object-contain"
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
    </div>
  );
}
