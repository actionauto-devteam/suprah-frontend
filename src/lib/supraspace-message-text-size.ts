import type * as React from 'react';

export const SUPRASPACE_MESSAGE_TEXT_SIZES = ['small', 'default', 'medium', 'large', 'extra-large'] as const;

export type SupraSpaceMessageTextSize = typeof SUPRASPACE_MESSAGE_TEXT_SIZES[number];

export const DEFAULT_SUPRASPACE_MESSAGE_TEXT_SIZE: SupraSpaceMessageTextSize = 'default';

const MESSAGE_TEXT_SIZE_VALUES: Record<SupraSpaceMessageTextSize, { label: string; fontSize: number; scale: number }> = {
  small: { label: 'Small', fontSize: 14, scale: 0.875 },
  default: { label: 'Default', fontSize: 16, scale: 1 },
  medium: { label: 'Medium', fontSize: 18, scale: 1.125 },
  large: { label: 'Large', fontSize: 20, scale: 1.25 },
  'extra-large': { label: 'Extra Large', fontSize: 22, scale: 1.375 },
};

export function isSupraSpaceMessageTextSize(value: unknown): value is SupraSpaceMessageTextSize {
  return typeof value === 'string' && SUPRASPACE_MESSAGE_TEXT_SIZES.includes(value as SupraSpaceMessageTextSize);
}

export function getSupraSpaceMessageTextSizeOptions() {
  return SUPRASPACE_MESSAGE_TEXT_SIZES.map(value => ({ value, ...MESSAGE_TEXT_SIZE_VALUES[value] }));
}

export function getSupraSpaceMessageTextStyle(size: SupraSpaceMessageTextSize): React.CSSProperties {
  const value = MESSAGE_TEXT_SIZE_VALUES[size];
  return {
    '--ss4-message-font-size': `${value.fontSize}px`,
    '--ss4-message-font-scale': String(value.scale),
    fontSize: 'var(--ss4-message-font-size)',
  } as React.CSSProperties;
}
