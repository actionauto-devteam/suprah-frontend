'use client';

import * as React from 'react';

interface SupraSpaceLogoProps {
  /** Rendered badge size in px (square). Default 40. */
  size?: number;
  /** Extra classes forwarded to the badge wrapper. */
  className?: string;
  /** Ambient green glow shadow around the badge. Default true. */
  withGlow?: boolean;
  /** Accessible label. Default "Suprah Space". */
  title?: string;
}

/**
 * SupraSpaceLogo
 *
 * Bespoke wordless mark for Suprah Space: a central hub node linked to three
 * satellite nodes inside a pulse ring — "The Communication Hub That Drives
 * Every Deal". Uses the digital-cockpit green gradient so it sits natively in
 * the existing design system. Self-contained (badge + mark), so it drops in
 * wherever the old `ss4-logo-mark` + icon block was used.
 */
export function SupraSpaceLogo({
  size = 40,
  className = '',
  withGlow = true,
  title = 'Suprah Space',
}: SupraSpaceLogoProps) {
  const rawId = React.useId();
  const uid = rawId.replace(/[:]/g, '');
  const bgId = `ssl-bg-${uid}`;
  const sheenId = `ssl-sheen-${uid}`;
  const nodeId = `ssl-node-${uid}`;

  const radius = Math.max(6, Math.round(size * 0.27));

  return (
    <span
      className={className}
      role="img"
      aria-label={title}
      style={{
        display: 'inline-flex',
        width: size,
        height: size,
        borderRadius: radius,
        overflow: 'hidden',
        boxShadow: withGlow
          ? '0 0 0 1px rgba(52,201,125,0.30), 0 4px 16px rgba(52,201,125,0.28)'
          : undefined,
        flexShrink: 0,
      }}
    >
      <svg
        viewBox="0 0 48 48"
        width={size}
        height={size}
        xmlns="http://www.w3.org/2000/svg"
        style={{ display: 'block' }}
      >
        <defs>
          <linearGradient id={bgId} x1="6" y1="4" x2="42" y2="46" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#16a34a" />
            <stop offset="1" stopColor="#34c97d" />
          </linearGradient>
          <linearGradient id={sheenId} x1="24" y1="0" x2="24" y2="30" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#ffffff" stopOpacity="0.20" />
            <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>
          <radialGradient id={nodeId} cx="0.5" cy="0.42" r="0.7">
            <stop offset="0" stopColor="#ffffff" />
            <stop offset="1" stopColor="#eafff2" />
          </radialGradient>
        </defs>

        {/* Badge */}
        <rect x="0" y="0" width="48" height="48" rx="13" fill={`url(#${bgId})`} />
        <rect x="0" y="0" width="48" height="48" rx="13" fill={`url(#${sheenId})`} />

        {/* Pulse ring */}
        <circle cx="24" cy="22.5" r="6.6" fill="none" stroke="#ffffff" strokeOpacity="0.22" strokeWidth="1.4" />

        {/* Connections: hub → satellites */}
        <g stroke="#ffffff" strokeOpacity="0.55" strokeWidth="2" strokeLinecap="round">
          <line x1="24" y1="22.5" x2="24" y2="11.5" />
          <line x1="24" y1="22.5" x2="13.8" y2="29.5" />
          <line x1="24" y1="22.5" x2="34.2" y2="29.5" />
        </g>

        {/* Satellite nodes */}
        <g fill="#ffffff" fillOpacity="0.94">
          <circle cx="24" cy="11" r="2.6" />
          <circle cx="13.4" cy="30" r="2.6" />
          <circle cx="34.6" cy="30" r="2.6" />
        </g>

        {/* Central hub node */}
        <circle cx="24" cy="22.5" r="4.1" fill={`url(#${nodeId})`} />
      </svg>
    </span>
  );
}

export default SupraSpaceLogo;