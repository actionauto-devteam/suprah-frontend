"use client";

import * as React from "react";

/** Suprah Meet brand mark — camera glyph inside a signal ring. */
export function SuprahMeetLogo({ className }: { className?: string }) {
  const id = React.useId(); // unique gradient id per instance
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} aria-label="Suprah Meet">
      <defs>
        <linearGradient id={id} x1="4" y1="4" x2="44" y2="44">
          <stop offset="0%" stopColor="#34d399" />
          <stop offset="100%" stopColor="#0d9488" />
        </linearGradient>
      </defs>
      <rect x="3" y="3" width="42" height="42" rx="12" fill="#0a1410" stroke={`url(#${id})`} strokeWidth="1.5" />
      <rect x="11" y="17" width="17" height="14" rx="4" fill={`url(#${id})`} />
      <path d="M30 21.5 L37 17.8 V30.2 L30 26.5 Z" fill={`url(#${id})`} />
      <path d="M33 11 a12 12 0 0 1 6 5" stroke="#34d399" strokeWidth="2" strokeLinecap="round" opacity=".9" />
      <path d="M31 7.5 a17 17 0 0 1 9.5 8" stroke="#34d399" strokeWidth="2" strokeLinecap="round" opacity=".45" />
      <circle cx="14.5" cy="34.5" r="1.6" fill="#34d399" />
      <circle cx="19.5" cy="34.5" r="1.6" fill="#34d399" opacity=".55" />
      <circle cx="24.5" cy="34.5" r="1.6" fill="#34d399" opacity=".3" />
    </svg>
  );
}