'use client';

import * as React from 'react';
import type { SSAttachment } from '@/hooks/useSupraSpaceSocket';

type ImageDimensions = { width: number; height: number };

const imageDimensionsByAttachment = new Map<string, ImageDimensions>();
const imageDimensionsByFile = new WeakMap<File, Promise<ImageDimensions | undefined>>();

function attachmentDimensionKey(attachment: SSAttachment): string {
  return attachment.fileKey || attachment.url || attachment.thumbnailUrl || attachment.originalName;
}

function validDimensions(width?: number, height?: number): ImageDimensions | null {
  if (!Number.isFinite(width) || !Number.isFinite(height) || !width || !height || width < 1 || height < 1) return null;
  return { width, height };
}

export function getSupraSpaceImageFileDimensions(file: File): Promise<ImageDimensions | undefined> {
  if (!file.type.startsWith('image/') && !/\.(avif|bmp|gif|heic|heif|jpe?g|png|tiff?|webp)$/i.test(file.name)) return Promise.resolve(undefined);
  const cached = imageDimensionsByFile.get(file);
  if (cached) return cached;

  const pending = new Promise<ImageDimensions | undefined>((resolve) => {
    if (typeof Image === 'undefined') {
      resolve(undefined);
      return;
    }
    const url = URL.createObjectURL(file);
    const image = new Image();
    let settled = false;
    const finish = (dimensions?: ImageDimensions) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      URL.revokeObjectURL(url);
      resolve(dimensions);
    };
    const timeout = window.setTimeout(() => finish(), 5000);
    image.onload = () => finish(validDimensions(image.naturalWidth, image.naturalHeight) || undefined);
    image.onerror = () => finish();
    image.src = url;
  });
  imageDimensionsByFile.set(file, pending);
  return pending;
}

function dimensionsFor(attachment: SSAttachment): ImageDimensions | null {
  return validDimensions(attachment.width, attachment.height)
    || imageDimensionsByAttachment.get(attachmentDimensionKey(attachment))
    || null;
}

export function AdaptiveAttachmentImage({
  attachment,
  maxWidth,
  maxHeight,
  children,
}: {
  attachment: SSAttachment;
  maxWidth: string;
  maxHeight: number;
  children: (props: { style: React.CSSProperties; onImageLoad: React.ReactEventHandler<HTMLImageElement> }) => React.ReactNode;
}) {
  const [dimensions, setDimensions] = React.useState<ImageDimensions | null>(() => dimensionsFor(attachment));
  const key = attachmentDimensionKey(attachment);

  React.useEffect(() => {
    setDimensions(dimensionsFor(attachment));
  }, [attachment.height, attachment.width, key]);

  const onImageLoad = React.useCallback<React.ReactEventHandler<HTMLImageElement>>((event) => {
    const next = validDimensions(event.currentTarget.naturalWidth, event.currentTarget.naturalHeight);
    if (!next) return;
    imageDimensionsByAttachment.set(key, next);
    setDimensions(previous => previous?.width === next.width && previous.height === next.height ? previous : next);
  }, [key]);

  // New uploads arrive with server-extracted dimensions, so the browser reserves
  // their final footprint before pixels load. Older records settle once from a
  // stable 3:2 placeholder and are cached by file key for future renders.
  const width = dimensions?.width || 3;
  const height = dimensions?.height || 2;
  const ratio = width / height;
  const style: React.CSSProperties = {
    width: ratio < 1 ? `min(${maxWidth}, ${Math.round(maxHeight * ratio)}px)` : maxWidth,
    maxWidth: '100%',
    maxHeight,
    aspectRatio: `${width} / ${height}`,
  };

  return <>{children({ style, onImageLoad })}</>;
}
