'use client';

import * as React from 'react';
import type { SSAttachment } from '@/hooks/useSupraSpaceSocket';

type ImageDimensions = { width: number; height: number };

const imageDimensionsByAttachment = new Map<string, ImageDimensions>();

function attachmentDimensionKey(attachment: SSAttachment): string {
  return attachment.fileKey || attachment.url || attachment.thumbnailUrl || attachment.originalName;
}

function validDimensions(width?: number, height?: number): ImageDimensions | null {
  if (!Number.isFinite(width) || !Number.isFinite(height) || !width || !height || width < 1 || height < 1) return null;
  return { width, height };
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
