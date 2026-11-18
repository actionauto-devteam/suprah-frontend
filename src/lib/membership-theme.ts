import type { CSSProperties } from "react"

/**
 * Membership colors that follow the light and dark theme (2026-11-18).
 *
 * Each class (Ignition, Cruiser, …) keeps two shades: a bright one that reads
 * well on dark screens and a deeper one that stays readable on light screens.
 * Pages put both on the element as CSS variables and pick with `TIER_TEXT`.
 */
export type TierColors = { primary?: string; secondary?: string; gradient?: string[] }

/** Ignition's colors, used until the member's class has loaded. */
export const DEFAULT_TIER_COLORS = {
  primary: "#9ca3af",
  secondary: "#4b5563",
  gradient: ["#374151", "#9ca3af"],
} as const

/** `--tier` (bright shade) and `--tier-ink` (deeper shade) for one class. */
export function tierColorVars(colors?: TierColors | null): CSSProperties {
  return {
    "--tier": colors?.primary || DEFAULT_TIER_COLORS.primary,
    "--tier-ink": colors?.secondary || colors?.primary || DEFAULT_TIER_COLORS.secondary,
  } as CSSProperties
}

/** Class-colored text: the deeper shade on light screens, the bright one on dark. */
export const TIER_TEXT = "text-(--tier-ink) dark:text-(--tier)"

/**
 * The member card's surface: Suprah mint on light screens, the original
 * green-black card on dark screens. The solid base keeps the mint from showing
 * what's behind it (e.g. a pop-up's dark backdrop).
 */
export const MEMBER_CARD_SURFACE =
  "bg-card bg-linear-140 from-card via-primary/8 via-40% to-primary/20 text-foreground ring-1 ring-primary/20 " +
  "dark:from-[#060d10] dark:via-[#0b1a14] dark:to-[#071210] dark:text-white dark:ring-white/6"

/** The card's dot texture color (drawn with currentColor). */
export const MEMBER_CARD_DOTS = "text-emerald-900/15 dark:text-white/10"
