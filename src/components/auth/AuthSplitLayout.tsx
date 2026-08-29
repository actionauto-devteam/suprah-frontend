"use client";

import React from "react";
import { CinematicPane } from "./CinematicPane";
import { ThemeModeToggle } from "@/components/layout/ThemeModeToggle";
import { AUTH_LINK_CLASS } from "./theme";

export function AuthSplitLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-dvh w-full bg-background overflow-y-auto overscroll-contain font-sans">
      <div className="relative flex min-h-dvh w-full flex-col overflow-hidden bg-card md:h-dvh md:min-h-0 md:flex-row">
        <div
          className="absolute right-3 z-50 md:right-5"
          style={{ top: "max(0.75rem, env(safe-area-inset-top))" }}
        >
          <ThemeModeToggle
            compact
            className="h-7 w-7 border-white/25 dark:border-white/25 bg-black/35 dark:bg-black/35 text-white dark:text-white backdrop-blur-md hover:bg-black/50 dark:hover:bg-black/50 hover:text-white shadow-lg"
          />
        </div>

        <div className="relative z-10 h-[16svh] min-h-28 w-full landscape:h-[30svh] md:h-full md:w-[55%] md:landscape:h-full">
          <CinematicPane />
          <div className="absolute inset-x-0 bottom-0 h-24 bg-linear-to-t from-card via-card/75 to-transparent md:hidden" />
          <div className="absolute inset-y-0 right-0 w-32 bg-linear-to-l from-card to-transparent z-20 pointer-events-none hidden md:block" />
        </div>

        <div className="relative z-20 -mt-6 flex flex-1 flex-col items-center justify-start overflow-y-auto overscroll-contain rounded-t-[1.75rem] bg-card px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-5 shadow-[0_-12px_30px_-20px_rgba(0,0,0,0.15)] custom-scrollbar xs:px-6 sm:px-8 md:mt-0 md:h-full md:w-[45%] md:justify-center md:rounded-none md:p-12 md:shadow-none lg:p-20">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 overflow-hidden rounded-t-[1.75rem] md:rounded-none"
          >
            <span className="auth-ambient-glow absolute left-1/2 top-0 hidden h-64 w-64 -translate-x-1/2 -translate-y-1/3 rounded-full bg-emerald-400/15 blur-3xl dark:block sm:h-80 sm:w-80" />
            <span className="auth-ambient-glow absolute left-1/2 top-0 block h-64 w-64 -translate-x-1/2 -translate-y-1/3 rounded-full bg-rose-400/12 blur-3xl dark:hidden sm:h-80 sm:w-80" />
            <div className="auth-dot-grid absolute inset-0 opacity-[0.5]" />
          </div>

          <div className="relative z-10 w-full">{children}</div>
          <a
            href="https://suprah.ai/"
            className={`${AUTH_LINK_CLASS} relative z-10 mt-4 mb-2 text-xs sm:mt-6 sm:text-sm`}
          >
            Learn more about Suprah AI
          </a>
        </div>

        <div className="absolute inset-0 hidden dark:block bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.02] pointer-events-none z-40" />
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: var(--scrollbar-thumb);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: var(--scrollbar-thumb-hover);
        }
        input:-webkit-autofill,
        input:-webkit-autofill:hover,
        input:-webkit-autofill:focus {
          -webkit-text-fill-color: #18181b;
          caret-color: #18181b;
          box-shadow: 0 0 0 1000px rgba(250, 250, 250, 0.9) inset;
          border-color: rgba(16, 185, 129, 0.45);
          transition: background-color 9999s ease-out;
        }
        .dark input:-webkit-autofill,
        .dark input:-webkit-autofill:hover,
        .dark input:-webkit-autofill:focus {
          -webkit-text-fill-color: #f4f4f5;
          caret-color: #f4f4f5;
          box-shadow: 0 0 0 1000px rgba(9, 9, 11, 0.94) inset;
          border-color: rgba(52, 211, 153, 0.55);
        }
        .auth-dot-grid {
          background-image: radial-gradient(
            color-mix(in oklch, var(--foreground) 14%, transparent) 1px,
            transparent 1px
          );
          background-size: 22px 22px;
          mask-image: radial-gradient(
            ellipse 65% 55% at 50% 0%,
            black 0%,
            transparent 72%
          );
          -webkit-mask-image: radial-gradient(
            ellipse 65% 55% at 50% 0%,
            black 0%,
            transparent 72%
          );
        }
        @media (prefers-reduced-motion: no-preference) {
          .auth-ambient-glow {
            animation: auth-ambient-breathe 9s ease-in-out infinite;
          }
          .auth-logo-glow {
            animation: auth-logo-pulse 7s ease-in-out infinite;
          }
        }
        @keyframes auth-ambient-breathe {
          0%,
          100% {
            transform: translate(-50%, -33%) scale(1);
            opacity: 0.7;
          }
          50% {
            transform: translate(-50%, -33%) scale(1.12);
            opacity: 1;
          }
        }
        @keyframes auth-logo-pulse {
          0%,
          100% {
            transform: scale(2.2);
            opacity: 0.7;
          }
          50% {
            transform: scale(2.42);
            opacity: 1;
          }
        }
        .auth-logo-glow {
          transform: scale(2.2);
          transform-origin: center;
        }
      `}</style>
    </div>
  );
}
