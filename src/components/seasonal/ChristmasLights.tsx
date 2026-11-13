"use client";

/**
 * Twinkling string of Christmas lights — a scalloped wire with a bulb hanging
 * at the bottom of every dip. Purely decorative (aria-hidden, no pointer
 * events). Every other bulb is hidden below `sm` so phones don't get crowded.
 *
 * Usage: drop it inside any `relative` container, e.g.
 *   <ChristmasLights className="absolute inset-x-0 top-0" />
 */

import * as React from "react";
import { useChristmasEffects, usePrefersReducedMotion } from "./christmas-store";
import { cn } from "@/lib/utils";

const BULB_COLORS = [
  { bg: "#ef4444", glow: "rgba(239,68,68,0.75)" },   // red
  { bg: "#22c55e", glow: "rgba(34,197,94,0.75)" },   // green
  { bg: "#f59e0b", glow: "rgba(245,158,11,0.75)" },  // gold
  { bg: "#38bdf8", glow: "rgba(56,189,248,0.75)" },  // ice blue
  { bg: "#f43f5e", glow: "rgba(244,63,94,0.75)" },   // rose
];

export function ChristmasLights({
  count = 18,
  className,
}: {
  count?: number;
  className?: string;
}) {
  const { enabled } = useChristmasEffects();
  const reducedMotion = usePrefersReducedMotion();
  if (!enabled) return null;

  const SEG = 20; // viewBox units per scallop
  const wire = Array.from({ length: count }, (_, i) => {
    const x0 = i * SEG;
    return `${i === 0 ? `M${x0},1` : ""} Q${x0 + SEG / 2},9 ${x0 + SEG},1`;
  }).join(" ");

  return (
    <div
      aria-hidden="true"
      className={cn("pointer-events-none relative h-5 select-none print:hidden", className)}
    >
      <style>{`
        @keyframes xmas-twinkle {
          0%, 100% { opacity: 1;   filter: brightness(1.1); }
          50%      { opacity: .35; filter: brightness(.7); }
        }
        .xmas-bulb { animation: xmas-twinkle var(--dur) ease-in-out var(--delay) infinite; }
      `}</style>

      <svg
        className="absolute inset-x-0 top-0 h-2.5 w-full overflow-visible"
        viewBox={`0 0 ${count * SEG} 10`}
        preserveAspectRatio="none"
      >
        <path
          d={wire}
          fill="none"
          className="stroke-foreground/25"
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      {Array.from({ length: count }, (_, i) => {
        const c = BULB_COLORS[i % BULB_COLORS.length];
        return (
          <span
            key={i}
            className={cn(
              "absolute top-[7px] flex -translate-x-1/2 flex-col items-center",
              i % 2 === 1 && "max-sm:hidden",
            )}
            style={{ left: `${((i + 0.5) / count) * 100}%` }}
          >
            {/* socket */}
            <span className="h-[3px] w-[5px] rounded-[1px] bg-foreground/40" />
            {/* bulb */}
            <span
              className={cn("h-[9px] w-[6px] rounded-full", !reducedMotion && "xmas-bulb")}
              style={
                {
                  background: c.bg,
                  boxShadow: `0 0 6px 1px ${c.glow}, 0 0 14px 2px ${c.glow.replace("0.75", "0.3")}`,
                  "--dur": `${1.4 + (i % 4) * 0.45}s`,
                  "--delay": `${(i * 0.37) % 2}s`,
                } as React.CSSProperties
              }
            />
          </span>
        );
      })}
    </div>
  );
}