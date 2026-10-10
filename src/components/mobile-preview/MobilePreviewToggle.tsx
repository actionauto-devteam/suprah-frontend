"use client";

import { Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMobilePreview } from "@/lib/mobile-preview";

/**
 * Compare switch for the phone redesign. Only rendered when the preview flag
 * is on, and only at phone width. Sits bottom-left, above the bottom nav,
 * clear of the assistant button on the right.
 */
export function MobilePreviewToggle() {
  const { available, enabled, setEnabled } = useMobilePreview();
  if (!available) return null;

  return (
    <button
      type="button"
      onClick={() => setEnabled(!enabled)}
      aria-pressed={enabled}
      aria-label={
        enabled
          ? "Showing the new phone design. Switch to the current design"
          : "Showing the current phone design. Switch to the new design"
      }
      style={{ bottom: "calc(var(--mobile-bottom-nav-offset, 6.25rem) + 0.9rem)" }}
      className={cn(
        "fixed left-3 z-40 flex min-h-11 items-center gap-2 rounded-full border px-3.5 text-xs font-semibold shadow-lg md:hidden print:hidden",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400",
        enabled
          ? "border-emerald-500/40 bg-card text-emerald-700 dark:text-emerald-400"
          : "border-border bg-card text-foreground",
      )}
    >
      <Smartphone className="size-4" aria-hidden="true" />
      {enabled ? "New design" : "Current design"}
    </button>
  );
}
