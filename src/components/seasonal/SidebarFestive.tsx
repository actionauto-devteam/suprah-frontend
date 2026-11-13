"use client";

/**
 * Sidebar holiday decorations (replaces the string lights in the sidebar).
 *
 *   <SidebarFestiveHeader />   — inside SidebarHeader (which is `relative`):
 *                                swinging glass ornaments on ribbons + a holly
 *                                sprig in the corner. The logo's center column
 *                                is left clear.
 *   <SidebarFestiveAmbient />  — a sibling of the green ambient layer: twinkling
 *                                gold stars + a little sleigh that glides across
 *                                behind the nav every ~30s.
 *
 * Both render nothing outside the season / when the user turns effects off,
 * never take pointer events, and freeze for prefers-reduced-motion.
 * Ornaments + sleigh hide when the sidebar is collapsed to icons.
 */

import * as React from "react";
import { useChristmasEffects, usePrefersReducedMotion } from "./christmas-store";
import { cn } from "@/lib/utils";

/* ────────────────────────────────────────────────────────────────────────── */

const FESTIVE_CSS = `
  @keyframes xmas-swing   { 0%,100% { transform: rotate(-7deg); } 50% { transform: rotate(7deg); } }
  @keyframes xmas-sparkle { 0%,100% { opacity: .15; transform: scale(.55) rotate(0deg); }
                            50%     { opacity: 1;   transform: scale(1)   rotate(45deg); } }
  @keyframes xmas-sleigh  { 0%   { left: -30%; opacity: 0; }
                            3%   { opacity: 1; }
                            32%  { opacity: 1; }
                            35%  { left: 115%; opacity: 0; }
                            100% { left: 115%; opacity: 0; } }
  @keyframes xmas-bob     { 0%,100% { transform: translateY(0) rotate(-2deg); }
                            50%     { transform: translateY(-5px) rotate(2deg); } }
  @keyframes xmas-trail   { 0% { opacity: .9; transform: translateX(0) scale(1); }
                            100% { opacity: 0; transform: translateX(-14px) scale(.3); } }
  .xmas-swing   { animation: xmas-swing var(--dur) ease-in-out var(--delay) infinite; transform-origin: top center; }
  .xmas-sparkle { animation: xmas-sparkle var(--dur) ease-in-out var(--delay) infinite; }
  .xmas-sleigh  { animation: xmas-sleigh 30s linear 4s infinite; }
  .xmas-bob     { animation: xmas-bob 1.6s ease-in-out infinite; }
  .xmas-trail   { animation: xmas-trail 0.9s ease-out var(--delay) infinite; }
  @media (prefers-reduced-motion: reduce) {
    .xmas-swing, .xmas-sparkle, .xmas-bob, .xmas-trail { animation: none; }
    .xmas-sleigh { display: none; }
  }
`;

function FestiveStyles() {
  return <style>{FESTIVE_CSS}</style>;
}

/* ── Ornaments ─────────────────────────────────────────────────────────── */

const ORNAMENTS = [
  // left: % across header · len: ribbon px · size: bauble px
  { left: 24, len: 12, size: 11, color: "#ef4444", dark: "#991b1b" }, // red
  { left: 33, len: 22, size: 9, color: "#f59e0b", dark: "#92400e" },  // gold
  { left: 67, len: 18, size: 10, color: "#22c55e", dark: "#166534" }, // green
  { left: 77, len: 9, size: 12, color: "#38bdf8", dark: "#075985" },  // ice
  { left: 88, len: 20, size: 9, color: "#f43f5e", dark: "#9f1239" },  // rose
];

function Ornament({
  left,
  len,
  size,
  color,
  dark,
  index,
  animate,
}: (typeof ORNAMENTS)[number] & { index: number; animate: boolean }) {
  return (
    <span
      className={cn("absolute top-0 flex flex-col items-center", animate && "xmas-swing")}
      style={
        {
          left: `${left}%`,
          "--dur": `${2.6 + (index % 3) * 0.7}s`,
          "--delay": `${-index * 0.55}s`,
        } as React.CSSProperties
      }
    >
      {/* ribbon */}
      <span className="w-px bg-foreground/25" style={{ height: len }} />
      {/* cap */}
      <span className="h-[3px] w-[5px] rounded-t-[1px] bg-amber-300/90 dark:bg-amber-200/80" />
      {/* bauble — glossy glass: highlight + body + shadowed edge */}
      <span
        className="rounded-full"
        style={{
          width: size,
          height: size,
          background: `radial-gradient(circle at 32% 28%, rgba(255,255,255,.9) 0 10%, ${color} 38%, ${dark} 100%)`,
          boxShadow: `0 0 8px ${color}66`,
        }}
      />
    </span>
  );
}

/* ── Holly ─────────────────────────────────────────────────────────────── */

function Holly({ className }: { className?: string }) {
  const leaf = "M0,0 C3,-4 6,-1 8,-4 C9,-1 12,-3 14,-1 C12,1 13,3 16,4 C12,5 10,3 8,6 C6,3 3,5 0,0 Z";
  return (
    <svg viewBox="-2 -8 34 20" className={className} aria-hidden="true">
      <path d={leaf} transform="translate(14,2) rotate(-150)" fill="#15803d" />
      <path d={leaf} transform="translate(14,2) rotate(-15)" fill="#16a34a" />
      <circle cx="12.5" cy="1" r="2.3" fill="#dc2626" />
      <circle cx="16" cy="0.3" r="2.1" fill="#ef4444" />
      <circle cx="14.4" cy="3.6" r="2.2" fill="#b91c1c" />
      <circle cx="15.6" cy="-0.4" r=".6" fill="#fff" opacity=".8" />
    </svg>
  );
}

export function SidebarFestiveHeader() {
  const { enabled } = useChristmasEffects();
  const reducedMotion = usePrefersReducedMotion();
  if (!enabled) return null;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 top-[env(safe-area-inset-top)] bottom-0 select-none group-data-[collapsible=icon]:hidden print:hidden"
    >
      <FestiveStyles />
      {ORNAMENTS.map((o, i) => (
        <Ornament key={i} {...o} index={i} animate={!reducedMotion} />
      ))}
      <Holly className="absolute left-1 top-0.5 h-5 w-8 drop-shadow-sm" />
    </div>
  );
}

/* ── Ambient: sparkles + sleigh ───────────────────────────────────────── */

const SPARKLES = [
  { top: 18, left: 12, size: 10 },
  { top: 27, left: 84, size: 12 },
  { top: 39, left: 46, size: 9 },
  { top: 48, left: 8, size: 11 },
  { top: 57, left: 70, size: 10 },
  { top: 66, left: 30, size: 12 },
  { top: 74, left: 90, size: 9 },
  { top: 83, left: 55, size: 11 },
  { top: 91, left: 18, size: 9 },
];

function Sparkle({ size }: { size: number }) {
  return (
    <svg viewBox="0 0 10 10" width={size} height={size}>
      <path
        d="M5 0 L6 4 L10 5 L6 6 L5 10 L4 6 L0 5 L4 4 Z"
        className="fill-amber-400 dark:fill-amber-200"
      />
    </svg>
  );
}

/** Original silhouette: two reindeer pulling a sleigh with a gift sack. */
function Sleigh() {
  const reindeer = (
    <g className="fill-foreground/55 stroke-foreground/55" strokeWidth={0.9} strokeLinecap="round">
      <ellipse cx="52" cy="9" rx="5.5" ry="2.4" stroke="none" />
      <path d="M56 8 L58.5 5.5" fill="none" strokeWidth={1.6} />
      <circle cx="59.3" cy="5" r="1.6" stroke="none" />
      <path d="M58.8 3.8 l-1.2 -2.6 M59.6 3.8 l1.6 -2.4 M58.2 2.4 l-1.4 -.4 M60.6 2.2 l1.3 -.6" fill="none" strokeWidth={0.6} />
      <path d="M48 10.5 l-1.8 3.8 M50 11 l.4 3.8 M54.5 10.8 l1.8 3.4 M56 10 l2.6 2.6" fill="none" />
    </g>
  );
  return (
    <svg viewBox="0 0 64 18" className="h-[18px] w-16 overflow-visible">
      {/* reins */}
      <path d="M25 7 Q32 10 37 9 M41 8.5 L47 8.5" className="stroke-foreground/35" strokeWidth={0.5} fill="none" />
      {/* reindeer (lead + second) */}
      {reindeer}
      <g transform="translate(-14,0.6)">{reindeer}</g>
      {/* sleigh body + runner */}
      <path d="M7 7.5 H22 L25.5 4.5 V10 Q25.5 12.5 23 12.5 H9 Q7 12.5 7 10.5 Z" fill="#dc2626" />
      <path d="M7 7.5 H22" stroke="#fbbf24" strokeWidth={0.7} />
      <path d="M10 12.5 V15 M20 12.5 V15 M4 15 H23 Q27 15 27.5 12" className="stroke-amber-400" strokeWidth={0.9} fill="none" strokeLinecap="round" />
      {/* gift sack */}
      <circle cx="10" cy="5.5" r="3" fill="#92400e" />
      <path d="M8.6 2.8 L11.2 2.4" stroke="#78350f" strokeWidth={0.7} />
      {/* driver: red coat, white trim, pointed cap */}
      <path d="M14 7.5 Q14.5 2.6 17.5 2.6 Q20.5 2.6 21 7.5 Z" fill="#ef4444" />
      <circle cx="17.5" cy="1.4" r="1.5" fill="#fde7d6" />
      <path d="M15.9 0.9 L17.5 -2.6 L19.3 0.9 Z" fill="#ef4444" />
      <circle cx="17.6" cy="-2.6" r=".7" fill="#fff" />
      <path d="M15.9 0.9 H19.3" stroke="#fff" strokeWidth={0.7} />
    </svg>
  );
}

export function SidebarFestiveAmbient() {
  const { enabled } = useChristmasEffects();
  const reducedMotion = usePrefersReducedMotion();
  if (!enabled) return null;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-0 select-none overflow-hidden print:hidden"
    >
      <FestiveStyles />

      {SPARKLES.map((s, i) => (
        <span
          key={i}
          className={cn("absolute", !reducedMotion && "xmas-sparkle")}
          style={
            {
              top: `${s.top}%`,
              left: `${s.left}%`,
              opacity: reducedMotion ? 0.5 : undefined,
              "--dur": `${2.2 + (i % 4) * 0.8}s`,
              "--delay": `${(i * 0.9) % 3.2}s`,
            } as React.CSSProperties
          }
        >
          <Sparkle size={s.size} />
        </span>
      ))}

      {/* sleigh — crosses roughly a third of the way down, behind the nav */}
      {!reducedMotion && (
        <div className="xmas-sleigh absolute top-[34%] opacity-0 group-data-[collapsible=icon]:hidden">
          <div className="xmas-bob relative opacity-80">
            {/* glitter trail behind the sleigh */}
            {[0, 0.3, 0.6].map((d, i) => (
              <span
                key={i}
                className="xmas-trail absolute -left-1 size-1 rounded-full bg-amber-300 shadow-[0_0_4px_rgba(252,211,77,.9)]"
                style={{ top: 10 + i * 2, "--delay": `${d}s` } as React.CSSProperties}
              />
            ))}
            <Sleigh />
          </div>
        </div>
      )}
    </div>
  );
}