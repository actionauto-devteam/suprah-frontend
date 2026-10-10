"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import type { PreviewTone } from "@/lib/load-status-tone";
import styles from "./mobile-preview.module.css";

/** Wrapper that applies the phone redesign tokens to everything inside it. */
export function MobilePreviewScope({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div data-mobile-preview="" className={cn(styles.scope, className)} {...props}>
      {children}
    </div>
  );
}

const TONE_CLASS: Record<PreviewTone, string> = {
  mint: styles.toneMint,
  purple: styles.tonePurple,
  amber: styles.toneAmber,
  blue: styles.toneBlue,
  grey: styles.toneGrey,
};

/** Class names for a status tone; combine `tone` with one or more helpers. */
export function previewTone(tone: PreviewTone) {
  return {
    tone: TONE_CLASS[tone],
    text: styles.toneText,
    fill: styles.toneFill,
    soft: styles.toneSoft,
    line: styles.toneLine,
    pill: styles.tonePill,
  };
}

export const previewStyles = {
  /** Same as MobilePreviewScope, for an element that must stay mounted when the preview is toggled. */
  scope: styles.scope,
  mono: styles.mono,
  hideScrollbar: styles.hideScrollbar,
};
