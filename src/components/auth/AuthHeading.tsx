"use client";

import { motion, type Variants } from "framer-motion";
import { AUTH_KICKER_CLASS } from "./theme";

const headingVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.1 } },
};

const lineVariants: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } },
};

export function AuthHeading({
  kicker,
  title,
  subtitle,
}: {
  kicker: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <motion.div
      variants={headingVariants}
      initial="hidden"
      animate="show"
      className="space-y-1 text-center"
    >
      <motion.span
        variants={lineVariants}
        className={`${AUTH_KICKER_CLASS} justify-center`}
      >
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
        </span>
        {kicker}
      </motion.span>
      <motion.h1
        variants={lineVariants}
        className="text-xl font-black tracking-tight text-foreground sm:text-2xl"
      >
        {title}
      </motion.h1>
      {subtitle && (
        <motion.p
          variants={lineVariants}
          className="mx-auto max-w-sm text-xs font-normal leading-5 text-muted-foreground sm:text-sm sm:leading-6"
        >
          {subtitle}
        </motion.p>
      )}
    </motion.div>
  );
}
