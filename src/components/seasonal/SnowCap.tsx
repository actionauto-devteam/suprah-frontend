"use client";

/**
 * A soft drift of "settled snow" that sits on the top edge of a card.
 * Put it inside a `relative` card; it overhangs the top border slightly.
 *
 *   <SnowCap className="inset-x-6 -top-2" />
 */

import { useChristmasEffects } from "./christmas-store";
import { cn } from "@/lib/utils";

export function SnowCap({ className }: { className?: string }) {
  const { enabled } = useChristmasEffects();
  if (!enabled) return null;

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 400 14"
      preserveAspectRatio="none"
      className={cn(
        "pointer-events-none absolute z-10 h-3.5 drop-shadow-[0_1px_1px_rgba(15,23,42,0.18)] print:hidden",
        className,
      )}
    >
      <path
        // Lumpy top, flat bottom, rounded drip-ends.
        d="M0,10 C6,4 14,3 22,6 C30,1 44,1 52,5 C62,2 74,3 82,6 C92,0 108,1 118,5
           C128,2 140,2 150,6 C160,1 176,1 186,5 C196,3 206,3 214,6 C226,0 244,1 254,5
           C264,2 276,2 286,6 C296,1 312,2 322,5 C332,2 344,3 352,6 C362,1 380,2 390,6
           C396,7 400,9 400,10 L400,11 C380,14 360,12 340,13 C300,14 260,12 220,13
           C180,14 140,12 100,13 C60,14 30,12 0,11 Z"
        className="fill-white dark:fill-slate-100"
      />
    </svg>
  );
}