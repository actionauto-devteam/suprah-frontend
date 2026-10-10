'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, Loader2, X } from 'lucide-react';

type MediaFile = File;

function mediaType(file: Pick<File, 'name' | 'type'>): 'image' | 'video' | null {
  if (file.type.startsWith('image/')) return 'image';
  if (file.type.startsWith('video/')) return 'video';
  const extension = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
  if (['.jpg', '.jpeg', '.png', '.gif', '.webp', '.heic', '.heif', '.bmp', '.tif', '.tiff', '.avif'].includes(extension)) return 'image';
  if (['.mp4', '.mov', '.webm', '.m4v', '.avi', '.mkv', '.wmv', '.flv', '.3gp', '.mpeg', '.mpg', '.ogv'].includes(extension)) return 'video';
  return null;
}

function clampIndex(index: number, length: number): number {
  return Math.max(0, Math.min(index, Math.max(0, length - 1)));
}

export function PreSendMediaPreview({ files, initialIndex, onClose }: {
  files: MediaFile[];
  initialIndex: number;
  onClose: () => void;
}) {
  const mediaFiles = React.useMemo(() => files.filter(file => mediaType(file) !== null), [files]);
  const [activeIndex, setActiveIndex] = React.useState(() => clampIndex(initialIndex, mediaFiles.length));
  const mediaKey = React.useMemo(() => mediaFiles.map(file => `${file.name}:${file.type}:${file.size}:${file.lastModified}`).join('|'), [mediaFiles]);
  const [previewState, setPreviewState] = React.useState<{ key: string; urls: string[] }>({ key: '', urls: [] });
  const touchStartRef = React.useRef<{ x: number; y: number } | null>(null);
  const thumbnailRefs = React.useRef<Array<HTMLButtonElement | null>>([]);
  const total = mediaFiles.length;
  const activeFile = mediaFiles[activeIndex];
  const previewUrls = previewState.key === mediaKey ? previewState.urls : [];
  const activeUrl = previewUrls.length === total ? previewUrls[activeIndex] : undefined;
  const isVideo = activeFile ? mediaType(activeFile) === 'video' : false;

  React.useEffect(() => {
    const urls = mediaFiles.map(file => URL.createObjectURL(file));
    setPreviewState({ key: mediaKey, urls });
    return () => urls.forEach(url => URL.revokeObjectURL(url));
  }, [mediaFiles, mediaKey]);

  React.useEffect(() => {
    setActiveIndex(current => clampIndex(current, total));
  }, [total]);

  React.useEffect(() => {
    if (total === 0) onClose();
  }, [onClose, total]);

  React.useEffect(() => {
    thumbnailRefs.current[activeIndex]?.scrollIntoView({ block: 'nearest', inline: 'center' });
  }, [activeIndex]);

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      else if (event.key === 'ArrowLeft') setActiveIndex(current => clampIndex(current - 1, total));
      else if (event.key === 'ArrowRight') setActiveIndex(current => clampIndex(current + 1, total));
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose, total]);

  if (!activeFile) return null;

  if (!activeUrl) {
    const loadingPreview = (
      <div className="fixed inset-0 z-200 flex items-center justify-center bg-black/90" role="dialog" aria-modal="true" aria-label="Attachment preview">
        <Loader2 className="h-6 w-6 animate-spin text-white/75" />
      </div>
    );
    return typeof document === 'undefined' ? loadingPreview : createPortal(loadingPreview, document.body);
  }

  const navigate = (delta: number) => setActiveIndex(current => clampIndex(current + delta, total));
  const handleTouchEnd = (event: React.TouchEvent<HTMLDivElement>) => {
    const start = touchStartRef.current;
    touchStartRef.current = null;
    if (!start || event.changedTouches.length !== 1) return;
    const touch = event.changedTouches[0];
    const horizontal = touch.clientX - start.x;
    const vertical = touch.clientY - start.y;
    if (Math.abs(horizontal) < 48 || Math.abs(horizontal) <= Math.abs(vertical)) return;
    navigate(horizontal < 0 ? 1 : -1);
  };

  const preview = (
    <div
      className="fixed inset-0 z-200 flex flex-col bg-black/92 text-white"
      role="dialog"
      aria-modal="true"
      aria-label="Attachment preview"
      onClick={onClose}
    >
      <div className="flex min-h-14 items-center justify-between gap-3 border-b border-white/10 px-4" onClick={event => event.stopPropagation()}>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-white/90">{activeFile.name}</p>
          <p className="text-xs tabular-nums text-white/55">{activeIndex + 1} / {total}</p>
        </div>
        <button type="button" onClick={onClose} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 hover:bg-white/20" aria-label="Close preview">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div
        className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden px-12 py-4"
        style={{ touchAction: 'pan-y' }}
        onClick={event => event.stopPropagation()}
        onTouchStart={event => {
          if (event.touches.length === 1) touchStartRef.current = { x: event.touches[0].clientX, y: event.touches[0].clientY };
        }}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={() => { touchStartRef.current = null; }}
      >
        {total > 1 && (
          <button type="button" onClick={() => navigate(-1)} disabled={activeIndex === 0} className="absolute left-3 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 disabled:opacity-30" aria-label="Previous attachment">
            <ChevronLeft className="h-5 w-5" />
          </button>
        )}
        {isVideo ? (
          <video key={activeUrl} src={activeUrl} controls autoPlay playsInline preload="metadata" className="max-h-full max-w-full rounded-xl shadow-2xl" />
        ) : (
          <img src={activeUrl} alt={activeFile.name} draggable={false} className="max-h-full max-w-full rounded-xl object-contain shadow-2xl" />
        )}
        {total > 1 && (
          <button type="button" onClick={() => navigate(1)} disabled={activeIndex === total - 1} className="absolute right-3 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 disabled:opacity-30" aria-label="Next attachment">
            <ChevronRight className="h-5 w-5" />
          </button>
        )}
      </div>

      {total > 1 && (
        <div className="flex shrink-0 gap-2 overflow-x-auto border-t border-white/10 px-3 py-3 [scrollbar-width:none]" onClick={event => event.stopPropagation()}>
          {mediaFiles.map((file, index) => {
            const url = previewUrls[index];
            const video = mediaType(file) === 'video';
            return (
              <button
                key={`${file.name}-${file.lastModified}-${index}`}
                ref={element => { thumbnailRefs.current[index] = element; }}
                type="button"
                onClick={() => setActiveIndex(index)}
                className={`h-14 w-14 shrink-0 overflow-hidden rounded-lg border-2 ${index === activeIndex ? 'border-white' : 'border-transparent opacity-60'}`}
                aria-label={`View attachment ${index + 1} of ${total}`}
                aria-current={index === activeIndex}
              >
                {url && video ? <video src={url} muted preload="metadata" className="h-full w-full object-cover" /> : url ? <img src={url} alt="" className="h-full w-full object-cover" /> : null}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
  return typeof document === 'undefined' ? preview : createPortal(preview, document.body);
}
