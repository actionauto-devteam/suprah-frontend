"use client";

import {
  AnimatePresence,
  motion,
  type Variants,
} from "framer-motion";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

const SUPRASPACE_SUBDOMAIN = "space.suprah-app.com";
const SPLASH_SESSION_KEY = "suprah:splash-seen:v2";
const FIRST_SESSION_VISIBLE_MS = 600;

function isSupraSpacePathname(pathname: string | null): boolean {
  return (
    !!pathname &&
    (pathname.startsWith("/supraspace") ||
      pathname.startsWith("/crm/supra-space") ||
      pathname.startsWith("/crm/conversations"))
  );
}

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.035,
    },
  },
};

const letterVariants: Variants = {
  hidden: { y: 18, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      duration: 0.24,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

export const SplashScreen = () => {
  const pathname = usePathname();
  const skipForSupraSpace = isSupraSpacePathname(pathname);

  // Keep the pathname-based value SSR/hydration-safe. Client-only checks for
  // the dedicated SupraSpace subdomain and same-tab repeat visits happen in
  // useLayoutEffect before the browser paints the next frame.
  const [isVisible, setIsVisible] = useState(!skipForSupraSpace);
  const hideTimerRef = useRef<number | null>(null);

  useLayoutEffect(() => {
    if (skipForSupraSpace) {
      setIsVisible(false);
      return;
    }

    // Middleware rewrites make the SupraSpace subdomain pathname look like "/"
    // in the browser, so preserve the original hostname-specific bypass.
    if (window.location.hostname === SUPRASPACE_SUBDOMAIN) {
      setIsVisible(false);
      return;
    }

    // Do not replay a fake startup sequence on every hard refresh in the same
    // browser tab. A fresh browser/tab session still gets the short brand intro.
    try {
      if (window.sessionStorage.getItem(SPLASH_SESSION_KEY) === "1") {
        setIsVisible(false);
        return;
      }

      window.sessionStorage.setItem(SPLASH_SESSION_KEY, "1");
    } catch {
      // sessionStorage can be unavailable in hardened/private contexts.
      // In that case, keep the short first-load splash rather than blocking.
    }
  }, [skipForSupraSpace]);

  useEffect(() => {
    if (!isVisible || skipForSupraSpace) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    hideTimerRef.current = window.setTimeout(() => {
      setIsVisible(false);
    }, FIRST_SESSION_VISIBLE_MS);

    return () => {
      if (hideTimerRef.current !== null) {
        window.clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }

      // Restore exactly what the surrounding app shell had before the splash.
      document.body.style.overflow = previousOverflow;
    };
  }, [isVisible, skipForSupraSpace]);

  const letters = "SUPRAH.".split("");

  return (
    <AnimatePresence>
      {isVisible && !skipForSupraSpace && (
        <motion.div
          key="splash-screen"
          className="fixed inset-0 z-9999 flex flex-col items-center justify-center overflow-hidden bg-[#050505]"
          initial={{ opacity: 1 }}
          exit={{
            opacity: 0,
            transition: { duration: 0.2, ease: "easeOut" },
          }}
        >
          <div className="absolute inset-0 z-0" aria-hidden="true">
            <svg
              className="h-full w-full opacity-5"
              width="100%"
              height="100%"
              xmlns="http://www.w3.org/2000/svg"
            >
              <pattern
                id="suprah-splash-grid"
                width="40"
                height="40"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M 40 0 L 0 0 0 40"
                  fill="none"
                  stroke="white"
                  strokeWidth="1"
                />
              </pattern>
              <rect
                width="100%"
                height="100%"
                fill="url(#suprah-splash-grid)"
              />
            </svg>
            <div className="absolute inset-0 bg-linear-to-t from-black to-transparent" />
          </div>

          <div className="z-10 flex flex-col items-center px-6 text-center">
            <motion.div
              className="flex overflow-hidden"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              {letters.map((letter, index) => (
                <motion.span
                  key={`${letter}-${index}`}
                  className={`font-mono text-5xl font-black tracking-tighter sm:text-6xl md:text-8xl ${
                    letter === "." ? "text-green-500" : "text-white"
                  }`}
                  variants={letterVariants}
                >
                  {letter}
                </motion.span>
              ))}
            </motion.div>

            <div className="mt-6 w-72 max-w-[75vw]">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[10px] font-mono font-bold uppercase tracking-[0.18em] text-white/55">
                  Starting Suprah
                </span>
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
              </div>

              {/* Indeterminate progress is intentional: this splash is branding,
                  not a real measurement of auth/network progress. */}
              <div className="relative mt-2 h-0.5 overflow-hidden rounded-full bg-white/10">
                <motion.div
                  className="absolute inset-y-0 w-1/3 rounded-full bg-linear-to-r from-emerald-500 to-green-400"
                  initial={{ x: "-110%" }}
                  animate={{ x: "310%" }}
                  transition={{
                    duration: 0.7,
                    ease: "easeInOut",
                    repeat: Infinity,
                  }}
                />
              </div>

              <p className="mt-2 text-[10px] font-mono uppercase tracking-[0.12em] text-white/35">
                Preparing your workspace
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};