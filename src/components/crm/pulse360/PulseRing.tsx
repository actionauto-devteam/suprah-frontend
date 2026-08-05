"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { BAND_META, COMPONENT_ORDER, type PulseBand, type PulseComponents } from "@/lib/pulse360";

/**
 * The Pulse360 signature element.
 *
 * Not a progress ring. The circle is divided into five arcs — one per scoring
 * component, sized by that component's weight — and each arc fills to its own
 * sub-score. So the shape itself tells you *where* someone is strong or weak,
 * not just that the number is 62. A single gap at the four o'clock position
 * reads as "deadlines" at a glance once you've seen it twice, which a plain
 * donut can never do.
 */

interface PulseRingProps {
  score: number;
  band: PulseBand;
  components: PulseComponents;
  /** Relative arc sizes. Defaults match the backend's default weights. */
  weights?: Record<keyof PulseComponents, number>;
  size?: number;
  label?: string;
  className?: string;
  /** Pulse the ring while the user is actively working. */
  live?: boolean;
}

const DEFAULT_WEIGHTS: Record<keyof PulseComponents, number> = {
  attendance: 20,
  taskCompletion: 25,
  timeliness: 20,
  engagement: 20,
  responsiveness: 15,
};

const SEGMENT_COLORS: Record<keyof PulseComponents, string> = {
  attendance: "#38bdf8",
  taskCompletion: "#8b5cf6",
  timeliness: "#f43f5e",
  engagement: "#34d399",
  responsiveness: "#fbbf24",
};

export function PulseRing({
  score,
  band,
  components,
  weights = DEFAULT_WEIGHTS,
  size = 176,
  label = "Work health",
  className,
  live = false,
}: PulseRingProps) {
  const radius = 76;
  const circumference = 2 * Math.PI * radius;
  const gapDegrees = 4;

  const totalWeight = COMPONENT_ORDER.reduce((sum, c) => sum + (weights[c.key] ?? 0), 0) || 1;

  let cursor = 0;
  const segments = COMPONENT_ORDER.map(({ key, label: name }) => {
    const share = (weights[key] ?? 0) / totalWeight;
    const arcDegrees = share * 360 - gapDegrees;
    const startDegrees = cursor;
    cursor += share * 360;

    const value = Math.max(0, Math.min(1, components?.[key] ?? 0));
    const arcLength = (arcDegrees / 360) * circumference;

    return {
      key,
      name,
      value,
      startDegrees,
      arcLength,
      filledLength: arcLength * value,
      color: SEGMENT_COLORS[key],
    };
  });

  const bandMeta = BAND_META[band] ?? BAND_META.watch;

  // Score/label text was fixed at text-4xl/text-xs regardless of `size` — fine at the
  // default 176px, but callers render this as small as 112px (see PulseHealthCard), where
  // that same fixed-size text no longer fits inside the ring and the label spills past its
  // edge. Scale both proportionally to the ring's own diameter instead, floored so text
  // never becomes illegibly small at very small sizes.
  const scoreFontSize = Math.max(size * (36 / 176), 18);
  const labelFontSize = Math.max(size * (12 / 176), 8);

  return (
    <div className={cn("relative shrink-0", className)} style={{ width: size, height: size }}>
      <svg viewBox="0 0 200 200" className="h-full w-full -rotate-90" role="img" aria-label={`${label}: ${score} out of 100`}>
        {segments.map((segment) => (
          <g key={segment.key} transform={`rotate(${segment.startDegrees} 100 100)`}>
            {/* Track for this component's full weight */}
            <circle
              cx="100"
              cy="100"
              r={radius}
              fill="none"
              strokeWidth="9"
              strokeLinecap="round"
              stroke="currentColor"
              className="text-zinc-200/70 dark:text-zinc-800"
              strokeDasharray={`${segment.arcLength} ${circumference}`}
            />
            {/* Filled portion */}
            <circle
              cx="100"
              cy="100"
              r={radius}
              fill="none"
              strokeWidth="9"
              strokeLinecap="round"
              stroke={segment.color}
              strokeDasharray={`${segment.filledLength} ${circumference}`}
              className="transition-[stroke-dasharray] duration-700 motion-reduce:transition-none"
              style={live ? { filter: `drop-shadow(0 0 6px ${segment.color}66)` } : undefined}
            />
          </g>
        ))}
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
        <span
          className={cn(
            "font-mono font-black tabular-nums leading-none tracking-tighter",
            bandMeta.text
          )}
          style={{ fontSize: scoreFontSize }}
        >
          {Math.round(score)}
        </span>
        <span
          className="font-black uppercase tracking-[0.22em] text-muted-foreground/80"
          style={{ fontSize: labelFontSize }}
        >
          {bandMeta.label}
        </span>
      </div>

      {live && (
        <span className="pointer-events-none absolute inset-2 rounded-full ring-1 ring-violet-500/20 animate-pulse motion-reduce:animate-none" />
      )}
    </div>
  );
}

/** Legend + numeric breakdown that pairs with the ring. */
export function PulseComponentBreakdown({
  components,
  className,
}: {
  components: PulseComponents;
  className?: string;
}) {
  return (
    <div className={cn("grid grid-cols-1 gap-2", className)}>
      {COMPONENT_ORDER.map(({ key, label }) => {
        const value = Math.round((components?.[key] ?? 0) * 100);
        return (
          <div key={key} className="flex items-center gap-2.5">
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: SEGMENT_COLORS[key] }}
              aria-hidden
            />
            <span className="min-w-0 flex-1 truncate text-sm font-semibold text-muted-foreground/70">
              {label}
            </span>
            <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted/40" aria-hidden>
              <div
                className="h-full rounded-full transition-[width] duration-700 motion-reduce:transition-none"
                style={{ width: `${value}%`, backgroundColor: SEGMENT_COLORS[key] }}
              />
            </div>
            <span className="w-8 shrink-0 text-right font-mono text-sm font-bold tabular-nums text-foreground/70">
              {value}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/** Compact sparkline for the score trend. */
export function PulseTrendline({
  trend,
  className,
  height = 32,
}: {
  trend: Array<{ at: string; score: number }>;
  className?: string;
  height?: number;
}) {
  if (!trend?.length || trend.length < 2) {
    return (
      <div className={cn("flex items-center text-sm text-muted-foreground/75", className)} style={{ height }}>
        Not enough history yet
      </div>
    );
  }

  const points = trend.slice(-30);
  const width = 120;
  const max = Math.max(...points.map((p) => p.score), 100);
  const min = Math.min(...points.map((p) => p.score), 0);
  const range = max - min || 1;

  const path = points
    .map((p, i) => {
      const x = (i / (points.length - 1)) * width;
      const y = height - ((p.score - min) / range) * height;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  const last = points[points.length - 1].score;
  const first = points[0].score;
  const rising = last >= first;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={cn("w-full", className)}
      style={{ height }}
      preserveAspectRatio="none"
      role="img"
      aria-label={`Score trend, ${rising ? "rising" : "falling"}, currently ${Math.round(last)}`}
    >
      <path
        d={path}
        fill="none"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={rising ? "stroke-emerald-500" : "stroke-orange-500"}
      />
    </svg>
  );
}

export default PulseRing;
