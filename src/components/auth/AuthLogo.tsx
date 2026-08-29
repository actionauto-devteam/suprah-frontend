"use client";

import Image from "next/image";
import { motion } from "framer-motion";

/**
 * Full Suprah.ai lockup (mark + wordmark + "Dealership Intelligence System"
 * tagline), dedicated to the auth screens only — distinct from the compact
 * /favicon.png used in nav bars and headers elsewhere. Swaps asset by theme:
 * auth-logo-dark.png (green/chrome) reads on the dark card surface,
 * auth-logo-light.png (magenta/graphite) reads on the light one.
 */
export function AuthLogo({
  className = "h-14 w-auto sm:h-16 md:h-[4.75rem] lg:h-24",
}: {
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: -6 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
      className="relative inline-flex items-center justify-center"
    >
      <span
        aria-hidden
        className="auth-logo-glow pointer-events-none absolute inset-0 hidden rounded-full bg-emerald-400/25 blur-2xl dark:block"
      />
      <span
        aria-hidden
        className="auth-logo-glow pointer-events-none absolute inset-0 block rounded-full bg-rose-400/20 blur-2xl dark:hidden"
      />
      <Image
        src="/auth-logo-dark.png"
        alt="Suprah.ai — Dealership Intelligence System"
        width={1200}
        height={405}
        className={`relative hidden dark:block ${className}`}
        priority
      />
      <Image
        src="/auth-logo-light.png"
        alt="Suprah.ai — Dealership Intelligence System"
        width={1200}
        height={419}
        className={`relative block dark:hidden ${className}`}
        priority
      />
    </motion.div>
  );
}
