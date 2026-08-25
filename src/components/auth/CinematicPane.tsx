"use client";

import React from "react";
import { motion } from "framer-motion";
import Image from "next/image";

const ROUTE_PATH =
  "M 74 900 C 74 760 246 772 246 632 C 246 512 116 492 116 372 C 116 252 322 268 322 148 C 322 88 300 46 258 8";

const WAYPOINTS: { cx: number; cy: number; label: string }[] = [
  { cx: 74, cy: 900, label: "PICKUP" },
  { cx: 246, cy: 632, label: "DEPOT" },
  { cx: 116, cy: 372, label: "TRANSIT" },
  { cx: 258, cy: 8, label: "DROP-OFF" },
];

const ROUTE_CODES = [
  "SLC ⇄ DEN", "PHX ⇄ LAX", "ATL ⇄ MIA", "DFW ⇄ HOU",
  "SEA ⇄ PDX", "CHI ⇄ DET", "NYC ⇄ BOS", "DEN ⇄ SLC",
];

export function CinematicPane() {
  return (
    <div className="relative h-full w-full select-none overflow-hidden bg-[#07090a]">
      <div
        className="absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            "radial-gradient(rgba(255,255,255,0.9) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />

      <div className="absolute inset-0 bg-[radial-gradient(ellipse_120%_60%_at_50%_0%,rgba(16,185,129,0.14),transparent_60%)]" />
      <div className="absolute inset-x-0 top-0 h-32 bg-linear-to-b from-black/70 to-transparent pointer-events-none" />
      <div className="absolute inset-x-0 bottom-0 hidden h-40 bg-linear-to-t from-black/85 to-transparent pointer-events-none md:block" />

      <div
        aria-hidden
        className="pointer-events-none absolute -right-6 top-1/2 hidden -translate-y-1/2 select-none text-[13rem] font-black italic leading-none tracking-tighter text-white/[0.035] [writing-mode:vertical-rl] md:block lg:text-[16rem]"
      >
        SUPRAH
      </div>

      <svg
        viewBox="0 0 400 920"
        className="absolute inset-0 h-full w-full"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <linearGradient id="routeGrad" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="55%" stopColor="#34d399" />
            <stop offset="100%" stopColor="#f59e0b" />
          </linearGradient>
          <filter id="routeGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <motion.path
          d={ROUTE_PATH}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="1"
          strokeDasharray="1 7"
          strokeLinecap="round"
        />

        <motion.path
          d={ROUTE_PATH}
          fill="none"
          stroke="url(#routeGrad)"
          strokeWidth="2"
          strokeLinecap="round"
          filter="url(#routeGlow)"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 0.9 }}
          transition={{ duration: 2.4, ease: "easeInOut", delay: 0.15 }}
        />

        {WAYPOINTS.map((point, index) => (
          <motion.g
            key={point.label}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 + index * 0.35, duration: 0.4, ease: "backOut" }}
          >
            <circle cx={point.cx} cy={point.cy} r="10" fill="none" stroke="rgba(16,185,129,0.35)" strokeWidth="1" />
            <circle cx={point.cx} cy={point.cy} r="3.5" fill={index === WAYPOINTS.length - 1 ? "#f59e0b" : "#10b981"} />
          </motion.g>
        ))}

        <circle r="4.5" fill="#ffffff">
          <animateMotion dur="7s" repeatCount="indefinite" path={ROUTE_PATH} rotate="auto" />
        </circle>
        <circle r="9" fill="rgba(16,185,129,0.35)">
          <animateMotion dur="7s" repeatCount="indefinite" path={ROUTE_PATH} rotate="auto" />
          <animate attributeName="r" values="7;11;7" dur="1.6s" repeatCount="indefinite" />
        </circle>
      </svg>

      {WAYPOINTS.map((point, index) => (
        <motion.span
          key={`label-${point.label}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 + index * 0.35, duration: 0.5 }}
          className="pointer-events-none absolute hidden font-mono text-[9px] font-semibold uppercase tracking-[0.22em] text-white/45 md:block"
          style={{
            left: `${(point.cx / 400) * 100}%`,
            top: `${(point.cy / 920) * 100}%`,
            transform: "translate(14px, -50%)",
          }}
        >
          {point.label}
        </motion.span>
      ))}

      <div
        className="absolute left-4 z-10 flex items-center gap-2 md:left-7"
        style={{ top: "max(0.875rem, env(safe-area-inset-top))" }}
      >
        <Image
          src="/favicon.png"
          alt="Suprah.ai"
          width={160}
          height={80}
          className="h-8 w-auto object-contain drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)] sm:h-9 md:h-11"
          priority
        />
      </div>

      <div className="absolute bottom-0 left-0 right-0 z-10 hidden overflow-hidden border-t border-white/[0.06] bg-black/40 py-2.5 backdrop-blur-sm md:block">
        <div className="route-ticker flex w-max items-center gap-8 font-mono text-[10px] font-medium tracking-[0.14em] text-white/40">
          {[...ROUTE_CODES, ...ROUTE_CODES].map((code, index) => (
            <span key={`${code}-${index}`} className="flex items-center gap-8">
              {code}
              <span className="h-1 w-1 rounded-full bg-emerald-500/50" />
            </span>
          ))}
        </div>
      </div>

      <style jsx>{`
        .route-ticker {
          animation: ticker-scroll 28s linear infinite;
        }
        @keyframes ticker-scroll {
          from {
            transform: translateX(0);
          }
          to {
            transform: translateX(-50%);
          }
        }
      `}</style>
    </div>
  );
}
